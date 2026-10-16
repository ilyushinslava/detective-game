import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameBoard } from "./GameBoard";
import { ALL_CHARACTERS } from "../constants/characters";
import { shiftBoard, getAdjacentCharacters } from "../utils/gameLogic";
import { soundManager } from "../utils/audio";
import { triggerHaptic } from "../utils/haptics";
import type { Character, LastShift } from "../types/game";

interface TutorialScreenProps {
  onExit: () => void;
  onFinish: () => void;
}

const L4_KILLER_ID = ALL_CHARACTERS[6].id; // [1][1]
const L4_PLAYER_ID = ALL_CHARACTERS[24].id; // [4][4]

const getInitialBoard = (lesson: number) => {
  const chars = ALL_CHARACTERS.slice(0, 25).map((c) => ({
    ...c,
    isAlive: true,
    isExonerated: false,
  }));

  if (lesson === 4) {
    // Размещаем Ксению Белову (L4_PLAYER_ID) на [2][4], вне зоны выстрела жертвы [1][2]
    const temp = chars[14];
    chars[14] = chars[24];
    chars[24] = temp;
  }

  const newBoard: Character[][] = [];
  for (let i = 0; i < 5; i++) {
    newBoard.push(chars.slice(i * 5, i * 5 + 5));
  }

  if (lesson === 3) {
    newBoard[1][2].isExonerated = true;
    newBoard[2][1].isExonerated = true;
  } else if (lesson === 4) {
    newBoard[1][2].isAlive = false;
    // Помечаем остальных будущих соседей Ксении алиби, чтобы София Романова была однозначной целью
    newBoard[2][0].isExonerated = true;
    newBoard[3][0].isExonerated = true;
    newBoard[3][1].isExonerated = true;
  }

  return newBoard;
};

export const TutorialScreen = ({ onExit, onFinish }: TutorialScreenProps) => {
  const [lesson, setLesson] = useState<1 | 2 | 3 | 4>(1);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [board, setBoard] = useState<Character[][]>(() => getInitialBoard(1));
  const [lastShift, setLastShift] = useState<LastShift | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [killedTargetId, setKilledTargetId] = useState<string | null>(null);
  const [isEnemyTurn, setIsEnemyTurn] = useState<boolean>(false);

  const centerId = board[2][2]?.id;
  const adjacentIds = useMemo(
    () => (centerId ? getAdjacentCharacters(board, centerId).map((c) => c.id) : []),
    [board, centerId]
  );

  const playerAdjacentIds = useMemo(
    () => getAdjacentCharacters(board, L4_PLAYER_ID).map((c) => c.id),
    [board]
  );

  const { radarTargetId, radarCellIds, radarColorClass } = useMemo(() => {
    const tacticalRadarClass = "!ring-0 outline outline-2 outline-dashed outline-cyan-400/80 outline-offset-1 animate-pulse";
    
    if (lesson === 2 && step === 3 && killedTargetId) {
      const neighborIds = getAdjacentCharacters(board, killedTargetId).map((c) => c.id);
      return {
        radarTargetId: killedTargetId,
        radarCellIds: [killedTargetId, ...neighborIds],
        radarColorClass: tacticalRadarClass,
      };
    }

    if (lesson === 3 && (step === 1 || step === 2)) {
      const exoneratedWitnessId = board[1]?.[2]?.id;
      if (exoneratedWitnessId) {
        const neighborIds = getAdjacentCharacters(board, exoneratedWitnessId).map((c) => c.id);
        return {
          radarTargetId: exoneratedWitnessId,
          radarCellIds: [exoneratedWitnessId, ...neighborIds],
          radarColorClass: tacticalRadarClass,
        };
      }
    }

    if (lesson === 4 && step === 1) {
      const victimId = board[1]?.[2]?.id;
      if (victimId) {
        const neighborIds = getAdjacentCharacters(board, victimId).map((c) => c.id);
        return {
          radarTargetId: victimId,
          radarCellIds: [victimId, ...neighborIds],
          radarColorClass: tacticalRadarClass,
        };
      }
    }

    return {
      radarTargetId: null,
      radarCellIds: [] as string[],
      radarColorClass: null,
    };
  }, [lesson, step, killedTargetId, board]);

  const playerCharName = useMemo(() => {
    return ALL_CHARACTERS.find((c) => c.id === L4_PLAYER_ID)?.name ?? "Детектив";
  }, []);

  const handleSelectCharacter = (id: string) => {
    if (lesson === 1 && step === 1 && adjacentIds.includes(id)) {
      soundManager.play("radar");
      triggerHaptic("light");
      setStep(2);
    } else if (lesson === 2 && step === 1 && adjacentIds.includes(id)) {
      soundManager.play("radar");
      triggerHaptic("light");
      setSelectedId(id);
      setStep(2);
    } else if (lesson === 3 && step === 1 && id === L4_KILLER_ID) {
      soundManager.play("radar");
      triggerHaptic("light");
      setSelectedId(id);
      setStep(2);
    } else if (lesson === 4 && step === 2 && id === L4_KILLER_ID) {
      soundManager.play("radar");
      triggerHaptic("light");
      setSelectedId(id);
      setStep(3);
    }
  };

  const handleShift = (
    type: "ROW" | "COL",
    index: number,
    direction: "FORWARD" | "BACKWARD"
  ) => {
    if (
      lesson === 1 &&
      step === 2 &&
      type === "ROW" &&
      index === 2 &&
      direction === "BACKWARD"
    ) {
      const newBoard = shiftBoard(board, type, index, direction);
      setBoard(newBoard);
      setLastShift({ type, index, direction });
      soundManager.play("slide");
      triggerHaptic("medium");
      setStep(3);
    } else if (
      lesson === 4 &&
      step === 1 &&
      !isEnemyTurn &&
      type === "ROW" &&
      index === 1 &&
      direction === "BACKWARD"
    ) {
      const newBoard = shiftBoard(board, type, index, direction);
      soundManager.play("slide");
      triggerHaptic("medium");
      setLastShift({ type, index, direction });
      setBoard(newBoard);
      setIsEnemyTurn(true);

      setTimeout(() => {
        setBoard((prevBoard) => shiftBoard(prevBoard, "ROW", 2, "FORWARD"));
        soundManager.play("slide");
        triggerHaptic("light");
        setLastShift({ type: "ROW", index: 2, direction: "FORWARD" });
        setIsEnemyTurn(false);
        setStep(2);
      }, 1200);
    }
  };

  const handleNextLesson = (nextLesson: 2 | 3 | 4) => {
    setLesson(nextLesson);
    setStep(1);
    setBoard(getInitialBoard(nextLesson));
    setLastShift(null);
    setSelectedId(null);
    setKilledTargetId(null);
    setIsEnemyTurn(false);

    if (nextLesson === 4) {
      setTimeout(() => {
        soundManager.play("kill");
        triggerHaptic("heavy");
      }, 50);
    }
  };

  const handleKill = () => {
    if (lesson === 2 && step === 2 && selectedId) {
      const targetId = selectedId;
      const newBoard = board.map((row) =>
        row.map((c) => (c.id === targetId ? { ...c, isAlive: false } : c))
      );
      setBoard(newBoard);
      setKilledTargetId(targetId);
      soundManager.play("kill");
      triggerHaptic("heavy");
      setStep(3);
      setSelectedId(null);
    }
  };

  const handleArrest = () => {
    if (
      (lesson === 3 && step === 2 && selectedId) ||
      (lesson === 4 && step === 3 && selectedId)
    ) {
      soundManager.play("arrest");
      triggerHaptic("success");
      setStep(lesson === 3 ? 3 : 4);
      setSelectedId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#080a0f] flex flex-col overflow-hidden font-sans select-none text-zinc-100 h-full w-full">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            ${
              lesson === 1 && step === 2
                ? `
                button[title="Сдвиг влево"]:nth-of-type(3) {
                  position: relative; z-index: 30;
                  box-shadow: 0 0 15px rgba(37,99,235,0.9) !important;
                  border-color: #60a5fa !important;
                  background-color: rgba(37,99,235,0.2) !important;
                  color: white !important;
                  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
                }
              `
                : ""
            }
            ${
              lesson === 4 && step === 1
                ? `
                button[title="Сдвиг влево"]:nth-of-type(2) {
                  position: relative; z-index: 30;
                  box-shadow: 0 0 15px rgba(37,99,235,0.9) !important;
                  border-color: #60a5fa !important;
                  background-color: rgba(37,99,235,0.2) !important;
                  color: white !important;
                  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
                }
              `
                : ""
            }
          `,
        }}
      />

      {/* Шапка */}
      <div className="w-full flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-white/10 bg-[#080a0f] z-20">
        <div className="w-16 shrink-0 flex items-center justify-start">
          <button
            onClick={onExit}
            className="text-zinc-500 hover:text-white transition cursor-pointer text-xs font-black uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/5 whitespace-nowrap"
          >
            ✕ Выход
          </button>
        </div>
        <h2 className="text-sm font-black tracking-widest text-blue-400 uppercase text-center flex-1">
          ОБУЧЕНИЕ
        </h2>
        <div className="w-16 shrink-0 pointer-events-none" />
      </div>

      <div className="flex-1 w-full flex flex-col relative min-h-0">
        {/* Верхняя информационная зона */}
        <div className="min-h-[120px] max-h-[140px] shrink-0 pt-2 pb-1 px-4 flex flex-col justify-center items-center text-center z-20">
          <AnimatePresence mode="wait">
            {lesson === 1 && step === 1 && (
              <motion.div
                key="l1s1"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1.5">
                  Шаг 1: Соседство
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-mono">
                  Ваша тайная личность в центре. Все действия возможны только с соседями.
                  <br />
                  <strong className="text-blue-400">ШАГ 1. ТАПНИТЕ по любому подсвеченному соседу.</strong>
                </p>
              </motion.div>
            )}
            {lesson === 1 && step === 2 && (
              <motion.div
                key="l1s2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1.5">
                  Шаг 2: Сдвиг ряда
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-mono">
                  Один раз за ход можно двигать сетку.
                  <br />
                  <strong className="text-blue-400">ШАГ 2. НАЖМИТЕ подсвеченную стрелку ← у 3-го ряда.</strong>
                </p>
              </motion.div>
            )}
            {lesson === 1 && step === 3 && (
              <motion.div
                key="l1s3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1.5">
                  Отлично!
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-mono">
                  Карта ушла за край и появилась справа. Это основа тактики уклонения и сближения.
                </p>
              </motion.div>
            )}

            {lesson === 2 && step === 1 && (
              <motion.div
                key="l2s1"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1.5">
                  Урок 2: Ликвидация
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-mono">
                  Вы — Бандит. Для победы вам нужно устранять свидетелей и запутать следы.
                  <br />
                  <strong className="text-red-400">ШАГ 1. ВЫБЕРИТЕ цель для ликвидации среди соседей.</strong>
                </p>
              </motion.div>
            )}
            {lesson === 2 && step === 2 && (
              <motion.div
                key="l2s2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1.5">
                  Цель захвачена
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-mono">
                  Подтвердите устранение выбранного свидетеля.
                  <br />
                  <strong className="text-red-400">ШАГ 2. НАЖМИТЕ кнопку "Ликвидировать" внизу.</strong>
                </p>
              </motion.div>
            )}
            {lesson === 2 && step === 3 && (
              <motion.div
                key="l2s3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1.5">
                  Опрос свидетелей
                </h3>
                <div className="w-full max-w-sm mx-auto px-3 py-1.5 mt-1 mb-1.5 rounded-lg border border-blue-900 bg-blue-950/40 flex items-center justify-between text-[10px] sm:text-xs shadow-sm">
                  <span className="font-semibold text-blue-200">Радар:</span>
                  <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-black uppercase border bg-blue-950 text-blue-300 border-blue-700">
                    Инспектор НЕ находился рядом с жертвой
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-mono">
                  После ликвидации радар на поле подсвечивает зону 3×3 вокруг жертвы и сообщает, был ли там Инспектор.
                </p>
              </motion.div>
            )}

            {lesson === 3 && step === 1 && (
              <motion.div
                key="l3s1"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1.5">
                  Урок 3: Опрос и Задержание
                </h3>
                <div className="w-full max-w-sm mx-auto px-3 py-1 mt-0.5 mb-1 rounded-lg border border-red-900/80 bg-red-950/40 flex items-center justify-between text-[10px] shadow-sm">
                  <span className="font-semibold text-red-200">Опрос (Елена Соколова):</span>
                  <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-black uppercase border bg-red-900 text-red-100 border-red-500">
                    Бандит РЯДОМ
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-mono">
                  Радар вокруг свидетеля с алиби сузил круг поиска.
                  <br />
                  <strong className="text-blue-400">ШАГ 1. НАЖМИТЕ на соседа без алиби в зоне радара.</strong>
                </p>
              </motion.div>
            )}
            {lesson === 3 && step === 2 && (
              <motion.div
                key="l3s2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1.5">
                  Предъявление обвинения
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-mono">
                  Подтвердите задержание выбранного подозреваемого.
                </p>
              </motion.div>
            )}
            {lesson === 3 && step === 3 && (
              <motion.div
                key="l3s3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1.5">
                  Отличная дедукция
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-mono">
                  Бандит взят с поличным! Теперь вы готовы к учебному делу.
                </p>
              </motion.div>
            )}

            {lesson === 4 && step === 1 && (
              <motion.div
                key="l4s1"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1.5">
                  {isEnemyTurn ? "Ход противника" : "Учебное дело: Схватка"}
                </h3>
                <div className="w-full max-w-sm mx-auto px-3 py-1.5 mt-0.5 mb-1.5 rounded-lg border border-blue-900 bg-blue-950/40 flex items-center justify-between text-[10px] sm:text-xs shadow-sm">
                  <span className="font-semibold text-blue-200">Радар выстрела:</span>
                  <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-black uppercase border bg-blue-950 text-blue-300 border-blue-700">
                    Инспектор ВНЕ зоны
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-mono">
                  {isEnemyTurn ? (
                    <strong className="text-amber-400">Бандит маневрирует...</strong>
                  ) : (
                    <>
                      Ваша личность — <b className="text-zinc-200">{playerCharName}</b> (справа в 3-м ряду).
                      <br />
                      <strong className="text-blue-400">
                        ШАГ 1. НАЖМИТЕ подсвеченную стрелку ← во 2-м ряду.
                      </strong>
                    </>
                  )}
                </p>
              </motion.div>
            )}
            {lesson === 4 && step === 2 && (
              <motion.div
                key="l4s2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1.5">
                  Бандит приблизился! Ваш ход
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-mono">
                  После сдвига 3-го ряда <b className="text-zinc-200">{playerCharName}</b> оказалась прямо под подозреваемой!
                  <br />
                  <strong className="text-blue-400">ШАГ 2. ТАПНИТЕ по соседу без алиби (София Романова).</strong>
                </p>
              </motion.div>
            )}
            {lesson === 4 && step === 3 && (
              <motion.div
                key="l4s3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1.5">
                  Предъявление обвинения
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-mono">
                  Выследив противника, вы готовы произвести задержание.
                </p>
              </motion.div>
            )}
            {lesson === 4 && step === 4 && (
              <motion.div
                key="l4s4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1.5">
                  Дело закрыто!
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed font-mono">
                  Вы успешно применили тактику сдвига и задержали преступника в городе Реквием.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Доска */}
        <div className="flex-1 min-h-0 w-full flex items-center justify-center pointer-events-auto">
          <GameBoard
            mode="SKHVATKA"
            board={board}
            selectedCharacterId={selectedId}
            killerAdjacentIds={lesson === 1 || lesson === 2 ? adjacentIds : []}
            detectiveAdjacentIds={
              lesson === 3 ? [L4_KILLER_ID] : lesson === 4 ? [L4_KILLER_ID] : []
            }
            showKillerHints={
              (lesson === 1 && step === 1) || (lesson === 2 && step === 1)
            }
            showDetectiveHints={
              (lesson === 3 && step === 1) || (lesson === 4 && !isEnemyTurn && (step === 1 || step === 2))
            }
            radarTargetId={radarTargetId}
            radarCellIds={radarCellIds}
            radarColorClass={radarColorClass}
            lastShift={lastShift}
            onShift={handleShift}
            onSelectCharacter={handleSelectCharacter}
            blockedShift={null}
          />
        </div>

        {/* Нижний док кнопок */}
        <div className="h-24 shrink-0 w-full flex items-center justify-center px-4 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#080a0f] to-transparent z-20">
          <AnimatePresence mode="wait">
            {lesson === 1 && step === 3 && (
              <motion.button
                key="next-lesson-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => handleNextLesson(2)}
                className="w-full max-w-sm h-14 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 text-white font-black tracking-widest uppercase flex items-center justify-center gap-2 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:brightness-110 cursor-pointer"
              >
                <span>Перейти к Уроку 2: Ликвидация</span>
              </motion.button>
            )}
            {lesson === 2 && step === 2 && (
              <motion.button
                key="kill-btn"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleKill}
                className="w-full max-w-sm h-14 bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:brightness-110 text-white font-black tracking-widest uppercase flex items-center justify-center gap-2 rounded-full shadow-[0_10px_25px_rgba(220,38,38,0.5)] border-t border-red-400/50 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="22" y1="12" x2="18" y2="12"></line>
                  <line x1="6" y1="12" x2="2" y2="12"></line>
                  <line x1="12" y1="6" x2="12" y2="2"></line>
                  <line x1="12" y1="22" x2="12" y2="18"></line>
                </svg>
                <span>Ликвидировать</span>
              </motion.button>
            )}
            {lesson === 2 && step === 3 && (
              <motion.button
                key="next-lesson-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => handleNextLesson(3)}
                className="w-full max-w-sm h-14 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 text-white font-black tracking-widest uppercase flex items-center justify-center gap-2 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:brightness-110 cursor-pointer"
              >
                <span>Перейти к Уроку 3: Задержание</span>
              </motion.button>
            )}
            {lesson === 3 && step === 2 && (
              <motion.button
                key="arrest-btn"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleArrest}
                className="w-full max-w-sm h-14 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 hover:brightness-110 text-white font-black tracking-widest uppercase flex items-center justify-center gap-2 rounded-full shadow-[0_10px_25px_rgba(37,99,235,0.5)] border-t border-blue-400/50 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>Задержание</span>
              </motion.button>
            )}
            {lesson === 3 && step === 3 && (
              <motion.button
                key="next-lesson-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => handleNextLesson(4)}
                className="w-full max-w-sm h-14 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 text-white font-black tracking-widest uppercase flex items-center justify-center gap-2 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:brightness-110 cursor-pointer"
              >
                <span>Перейти к Учебному делу</span>
              </motion.button>
            )}
            {lesson === 4 && step === 3 && (
              <motion.button
                key="arrest-btn-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleArrest}
                className="w-full max-w-sm h-14 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 hover:brightness-110 text-white font-black tracking-widest uppercase flex items-center justify-center gap-2 rounded-full shadow-[0_10px_25px_rgba(37,99,235,0.5)] border-t border-blue-400/50 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>Задержание</span>
              </motion.button>
            )}
            {lesson === 4 && step === 4 && (
              <motion.button
                key="finish-btn"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={onFinish}
                className="w-full max-w-sm h-14 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800 text-white font-black tracking-widest uppercase flex items-center justify-center gap-2 rounded-full shadow-[0_10px_25px_rgba(16,185,129,0.4)] cursor-pointer"
              >
                <span>Завершить обучение (+250 CR)</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};