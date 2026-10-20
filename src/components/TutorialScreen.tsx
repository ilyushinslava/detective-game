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

type TutorialModule = "MENU" | "SKHVATKA" | "MANIAC" | "THIEF" | "SECRET_SERVICE";

const L4_KILLER_ID = ALL_CHARACTERS[6].id;
const L4_PLAYER_ID = ALL_CHARACTERS[24].id;

const getInitialBoard = (module: TutorialModule, lesson: number = 1) => {
  const chars = ALL_CHARACTERS.slice(0, 25).map((c) => ({
    ...c,
    isAlive: true,
    isExonerated: false,
    isRobbed: false,
  }));

  if (module === "SKHVATKA") {
    if (lesson === 4) {
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
      newBoard[2][0].isExonerated = true;
      newBoard[3][0].isExonerated = true;
      newBoard[3][1].isExonerated = true;
    }
    return newBoard;
  }

  const newBoard: Character[][] = [];
  for (let i = 0; i < 5; i++) {
    newBoard.push(chars.slice(i * 5, i * 5 + 5));
  }
  return newBoard;
};

export const TutorialScreen = ({ onExit, onFinish }: TutorialScreenProps) => {
  const [currentModule, setCurrentModule] = useState<TutorialModule>("MENU");
  const [lesson, setLesson] = useState<number>(1);
  const [step, setStep] = useState<number>(1);
  const [board, setBoard] = useState<Character[][]>(() => getInitialBoard("SKHVATKA", 1));
  const [lastShift, setLastShift] = useState<LastShift | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [killedTargetId, setKilledTargetId] = useState<string | null>(null);
  const [isEnemyTurn, setIsEnemyTurn] = useState<boolean>(false);

  // Центр и соседи для уроков Схватки
  const centerId = board[2]?.[2]?.id;
  const adjacentIds = useMemo(
    () => (centerId ? getAdjacentCharacters(board, centerId).map((c) => c.id) : []),
    [board, centerId]
  );

  const playerAdjacentIds = useMemo(
    () => getAdjacentCharacters(board, L4_PLAYER_ID).map((c) => c.id),
    [board]
  );

  const { radarTargetId, radarCellIds, radarColorClass } = useMemo(() => {
    const tacticalRadarClass = "border-cyan-400 ring-2 ring-cyan-500/70";

    if (currentModule === "SKHVATKA") {
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
    }

    if (currentModule === "SECRET_SERVICE" && step >= 2) {
      const targetId = board[2]?.[2]?.id;
      if (targetId) {
        const neighborIds = getAdjacentCharacters(board, targetId).map((c) => c.id);
        return {
          radarTargetId: targetId,
          radarCellIds: [targetId, ...neighborIds],
          radarColorClass: "border-cyan-400 ring-2 ring-cyan-500/80",
        };
      }
    }

    return {
      radarTargetId: null,
      radarCellIds: [] as string[],
      radarColorClass: null,
    };
  }, [currentModule, lesson, step, killedTargetId, board]);

  const playerCharName = useMemo(() => {
    return ALL_CHARACTERS.find((c) => c.id === L4_PLAYER_ID)?.name ?? "Детектив";
  }, []);

  const startModule = (mod: TutorialModule) => {
    setCurrentModule(mod);
    setLesson(1);
    setStep(1);
    setBoard(getInitialBoard(mod, 1));
    setLastShift(null);
    setSelectedId(null);
    setKilledTargetId(null);
    setIsEnemyTurn(false);
  };

  const handleSelectCharacter = (id: string) => {
    if (currentModule === "SKHVATKA") {
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
    } else if (currentModule === "MANIAC") {
      const targetVictimId = board[1]?.[2]?.id;
      if (step === 1 && id === targetVictimId) {
        soundManager.play("radar");
        triggerHaptic("light");
        setSelectedId(id);
        setStep(2);
      }
    } else if (currentModule === "THIEF") {
      if (step === 1 && adjacentIds.includes(id)) {
        soundManager.play("radar");
        triggerHaptic("light");
        setSelectedId(id);
        setStep(2);
      }
    } else if (currentModule === "SECRET_SERVICE") {
      if (step === 1 && adjacentIds.includes(id)) {
        soundManager.play("radar");
        triggerHaptic("light");
        setSelectedId(id);
        setStep(2);
      } else if (step === 3 && id === board[1]?.[1]?.id) {
        soundManager.play("radar");
        triggerHaptic("light");
        setSelectedId(id);
        setStep(4);
      }
    }
  };

  const handleShift = (
    type: "ROW" | "COL",
    index: number,
    direction: "FORWARD" | "BACKWARD"
  ) => {
    if (
      currentModule === "SKHVATKA" &&
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
      currentModule === "SKHVATKA" &&
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

  const handleKill = () => {
    if (currentModule === "SKHVATKA" && lesson === 2 && step === 2 && selectedId) {
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
    } else if (currentModule === "MANIAC" && step === 2 && selectedId) {
      const targetId = selectedId;
      const newBoard = board.map((row) =>
        row.map((c) => (c.id === targetId ? { ...c, isAlive: false } : c))
      );
      setBoard(newBoard);
      soundManager.play("kill");
      triggerHaptic("heavy");
      setStep(3);
      setSelectedId(null);
    }
  };

  const handleArrest = () => {
    if (
      currentModule === "SKHVATKA" &&
      ((lesson === 3 && step === 2 && selectedId) ||
       (lesson === 4 && step === 3 && selectedId))
    ) {
      const targetId = selectedId;
      const newBoard = board.map((row) =>
        row.map((c) => (c.id === targetId ? { ...c, isExonerated: true } : c))
      );
      setBoard(newBoard);
      soundManager.play("arrest");
      triggerHaptic("success");
      setStep(lesson === 3 ? 3 : 4);
      setSelectedId(null);
    }
  };

  const handleRob = () => {
    if (currentModule === "THIEF" && step === 2 && selectedId) {
      const targetId = selectedId;
      const newBoard = board.map((row) =>
        row.map((c) => (c.id === targetId ? { ...c, isRobbed: true } : c))
      );
      setBoard(newBoard);
      soundManager.play("steal");
      triggerHaptic("medium");
      setStep(3);
      setSelectedId(null);
    }
  };

  const handleFastDisguise = () => {
    if (currentModule === "THIEF" && step === 3) {
      soundManager.play("disguise");
      triggerHaptic("medium");
      setStep(4);
    }
  };

  const handleInterrogate = () => {
    if (currentModule === "SECRET_SERVICE" && step === 2 && selectedId) {
      soundManager.play("radar");
      triggerHaptic("light");
      setStep(3);
      setSelectedId(null);
    }
  };

  const handleCaptureSpy = () => {
    if (currentModule === "SECRET_SERVICE" && step === 4 && selectedId) {
      const targetId = selectedId;
      const newBoard = board.map((row) =>
        row.map((c) => (c.id === targetId ? { ...c, isExonerated: true } : c))
      );
      setBoard(newBoard);
      soundManager.play("arrest");
      triggerHaptic("success");
      setStep(5);
      setSelectedId(null);
    }
  };

  // --- ЭКРАН 1: КАТАЛОГ ДЕЛ (СТАРТОВОЕ МЕНЮ ОБУЧЕНИЯ) ---
  if (currentModule === "MENU") {
    return (
      <div className="fixed inset-0 z-[100] bg-[#050608] flex justify-center overflow-hidden font-sans select-none text-zinc-100 h-full w-full">
        <div className="w-full max-w-lg md:max-w-xl mx-auto h-full flex flex-col justify-between relative overflow-hidden bg-[#080a0f] md:border-x md:border-white/10 shadow-2xl">
          {/* Шапка */}
          <div className="flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-white/10 bg-[#080a0f]">
            <button
              onClick={onExit}
              className="text-zinc-500 hover:text-white transition cursor-pointer text-xs font-black uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/5"
            >
              ✕ В меню
            </button>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">Академия</span>
              <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">Каталог дел</h2>
            </div>
            <div className="w-16" />
          </div>

          {/* Список модулей */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar">
            {/* Модуль 1: Схватка */}
            <div
              onClick={() => startModule("SKHVATKA")}
              className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-zinc-900/60 to-zinc-900/40 border border-cyan-500/40 hover:border-cyan-400 transition cursor-pointer shadow-lg active:scale-99"
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  Основной курс • 4 урока
                </span>
                <span className="text-[10px] font-mono text-zinc-500">15 мин</span>
              </div>
              <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">
                Курс оперативника (Схватка)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Базовые механики: соседство, тактика сдвига рядов, опрос свидетелей по радару и задержание.
              </p>
            </div>

            {/* Модуль 2: Маньяк */}
            <div
              onClick={() => startModule("MANIAC")}
              className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900/60 to-zinc-900/40 border border-red-900/40 hover:border-red-500 transition cursor-pointer shadow-lg active:scale-99"
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">
                  Спецоперация • 1 урок
                </span>
                <span className="text-[10px] font-mono text-zinc-500">5 мин</span>
              </div>
              <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">
                Охота на маньяка
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Особенности открытого списка смертников: убийства строго по очереди целей и побег маньяка.
              </p>
            </div>

            {/* Модуль 3: Вор */}
            <div
              onClick={() => startModule("THIEF")}
              className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900/60 to-zinc-900/40 border border-amber-900/40 hover:border-amber-500 transition cursor-pointer shadow-lg active:scale-99"
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  План-перехват • 1 урок
                </span>
                <span className="text-[10px] font-mono text-zinc-500">5 мин</span>
              </div>
              <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">
                Охота на грабителя
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Кража сокровищ без ликвидаций, смена масок из руки и выставление патрулей оцепления.
              </p>
            </div>

            {/* Модуль 4: Секретная служба */}
            <div
              onClick={() => startModule("SECRET_SERVICE")}
              className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-zinc-900/60 to-zinc-900/40 border border-purple-900/40 hover:border-purple-500 transition cursor-pointer shadow-lg active:scale-99"
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                  Контрразведка • 1 урок
                </span>
                <span className="text-[10px] font-mono text-zinc-500">5 мин</span>
              </div>
              <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">
                Секретная служба
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Шпионские дуэли: перекрестный допрос агентов на радаре и разоблачение вражеского резидента.
              </p>
            </div>
          </div>

          {/* Нижняя кнопка */}
          <div className="p-4 border-t border-white/10 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              onClick={onFinish}
              className="w-full h-12 rounded-full bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800 text-white font-black tracking-widest uppercase text-xs shadow-lg transition active:scale-98 cursor-pointer"
            >
              Завершить курс (+250 CR)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#050608] flex justify-center overflow-hidden font-sans select-none text-zinc-100 h-full w-full">
      <div className="w-full max-w-lg md:max-w-xl mx-auto h-full flex flex-col justify-between relative overflow-hidden bg-[#080a0f] md:border-x md:border-white/10 shadow-2xl">
        <style>{`
          .tutorial-highlight-l1s2 button[title*="Сдвиг влево"]:nth-of-type(3),
          .tutorial-highlight-l4s1 button[title*="Сдвиг влево"]:nth-of-type(2) {
            position: relative; z-index: 30;
            box-shadow: 0 0 20px rgba(6,182,212,0.95) !important;
            border-color: #22d3ee !important;
            background-color: rgba(6,182,212,0.3) !important;
            color: white !important;
            animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
          }
        `}</style>

        {/* Шапка текущего модуля */}
        <div className="w-full flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-white/10 bg-[#080a0f] z-20">
          <button
            onClick={() => setCurrentModule("MENU")}
            className="text-zinc-500 hover:text-white transition cursor-pointer text-xs font-black uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/5"
          >
            ← К делам
          </button>
          <h2 className="text-sm font-black tracking-widest text-cyan-400 uppercase text-center flex-1">
            {currentModule === "SKHVATKA" ? "СХВАТКА" : currentModule === "MANIAC" ? "МАНЬЯК" : currentModule === "THIEF" ? "ОХОТА НА ВОРА" : "СЕКРЕТНАЯ СЛУЖБА"}
          </h2>
          <div className="w-16 shrink-0" />
        </div>

        <div className="flex-1 w-full flex flex-col relative min-h-0">
          {/* Информационная зона подсказок */}
          <div className="min-h-[110px] max-h-[135px] shrink-0 pt-2 pb-1 px-4 flex flex-col justify-center items-center text-center z-20">
            <AnimatePresence mode="wait">
              {/* СХВАТКА: УРОК 1 */}
              {currentModule === "SKHVATKA" && lesson === 1 && step === 1 && (
                <motion.div key="l1s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Шаг 1: Соседство</h3>
                  <p className="text-xs text-zinc-400 font-mono">Ваша тайная личность в центре. <b className="text-cyan-400">ТАПНИТЕ по любому подсвеченному соседу.</b></p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 1 && step === 2 && (
                <motion.div key="l1s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Шаг 2: Сдвиг ряда</h3>
                  <p className="text-xs text-zinc-400 font-mono">Сетка циклична. <b className="text-cyan-400">НАЖМИТЕ подсвеченную стрелку ← у 3-го ряда.</b></p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 1 && step === 3 && (
                <motion.div key="l1s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Отлично!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Карта ушла за край и появилась справа. Это основа маневра.</p>
                </motion.div>
              )}

              {/* СХВАТКА: УРОК 2 */}
              {currentModule === "SKHVATKA" && lesson === 2 && step === 1 && (
                <motion.div key="l2s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Урок 2: Ликвидация</h3>
                  <p className="text-xs text-zinc-400 font-mono">Вы — Бандит. <b className="text-red-400">ВЫБЕРИТЕ цель для ликвидации среди соседей.</b></p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 2 && step === 2 && (
                <motion.div key="l2s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Цель выбрана</h3>
                  <p className="text-xs text-zinc-400 font-mono"><b className="text-red-400">НАЖМИТЕ кнопку "Ликвидировать" внизу.</b></p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 2 && step === 3 && (
                <motion.div key="l2s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Опрос свидетелей</h3>
                  <p className="text-xs text-zinc-400 font-mono">После выстрела радар сообщает: Инспектор НЕ находился рядом с жертвой.</p>
                </motion.div>
              )}

              {/* СХВАТКА: УРОК 3 */}
              {currentModule === "SKHVATKA" && lesson === 3 && step === 1 && (
                <motion.div key="l3s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Урок 3: Задержание</h3>
                  <p className="text-xs text-zinc-400 font-mono">Радар сузил круг. <b className="text-cyan-400">НАЖМИТЕ на подозреваемого без алиби в зоне радара.</b></p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 3 && step === 2 && (
                <motion.div key="l3s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Предъявление обвинения</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Задержание» для проверки.</p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 3 && step === 3 && (
                <motion.div key="l3s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Точный арест!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Бандит задержан. Переходим к учебному делу.</p>
                </motion.div>
              )}

              {/* СХВАТКА: УРОК 4 */}
              {currentModule === "SKHVATKA" && lesson === 4 && step === 1 && (
                <motion.div key="l4s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Учебное дело: Схватка</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    {isEnemyTurn ? "Бандит маневрирует..." : "НАЖМИТЕ подсвеченную стрелку ← во 2-м ряду для сближения."}
                  </p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 4 && step === 2 && (
                <motion.div key="l4s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Бандит рядом!</h3>
                  <p className="text-xs text-zinc-400 font-mono"><b className="text-cyan-400">ТАПНИТЕ по соседу без алиби (София Романова).</b></p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 4 && step === 3 && (
                <motion.div key="l4s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Предъявление обвинения</h3>
                  <p className="text-xs text-zinc-400 font-mono">Произведите задержание кнопкой внизу.</p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 4 && step === 4 && (
                <motion.div key="l4s4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-emerald-400 uppercase tracking-wider mb-1">Дело закрыто!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Вы успешно освоили тактику маневров и дедукции.</p>
                </motion.div>
              )}

              {/* МОДУЛЬ: МАНЬЯК */}
              {currentModule === "MANIAC" && step === 1 && (
                <motion.div key="maniac1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-red-400 uppercase tracking-wider mb-1">Очередь целей</h3>
                  <p className="text-xs text-zinc-400 font-mono">У Маньяка строгий список смертников. <b className="text-red-400">ТАПНИТЕ по текущей цели (Елена Соколова).</b></p>
                </motion.div>
              )}
              {currentModule === "MANIAC" && step === 2 && (
                <motion.div key="maniac2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Ликвидация цели</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Ликвидировать» внизу.</p>
                </motion.div>
              )}
              {currentModule === "MANIAC" && step === 3 && (
                <motion.div key="maniac3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-emerald-400 uppercase tracking-wider mb-1">Цель поражена!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Очередь сдвинулась — открыта следующая жертва. При атаке невиновных убийство блокируется.</p>
                </motion.div>
              )}

              {/* МОДУЛЬ: ВОР */}
              {currentModule === "THIEF" && step === 1 && (
                <motion.div key="thief1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-amber-400 uppercase tracking-wider mb-1">Кража сокровищ</h3>
                  <p className="text-xs text-zinc-400 font-mono">Вор не убивает, а похищает сокровища. <b className="text-amber-400">ТАПНИТЕ по любому соседу.</b></p>
                </motion.div>
              )}
              {currentModule === "THIEF" && step === 2 && (
                <motion.div key="thief2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Карманная кража</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Кража» внизу.</p>
                </motion.div>
              )}
              {currentModule === "THIEF" && step === 3 && (
                <motion.div key="thief3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-amber-400 uppercase tracking-wider mb-1">Маски Вора</h3>
                  <p className="text-xs text-zinc-400 font-mono">Жертва ограблена (метка CR). Нажмите «Конспирация» для моментальной смены лица картой из руки.</p>
                </motion.div>
              )}
              {currentModule === "THIEF" && step === 4 && (
                <motion.div key="thief4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-emerald-400 uppercase tracking-wider mb-1">Лицо изменено!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Вор моментально принял новое прикрытие из руки без использования колоды.</p>
                </motion.div>
              )}

              {/* МОДУЛЬ: СЕКРЕТНАЯ СЛУЖБА */}
              {currentModule === "SECRET_SERVICE" && step === 1 && (
                <motion.div key="ss1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-purple-400 uppercase tracking-wider mb-1">Перекрестный опрос</h3>
                  <p className="text-xs text-zinc-400 font-mono">Выберите соседа для проверки зоны присутствия вражеских резидентов.</p>
                </motion.div>
              )}
              {currentModule === "SECRET_SERVICE" && step === 2 && (
                <motion.div key="ss2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Опрос свидетелей</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Опрос свидетелей» внизу.</p>
                </motion.div>
              )}
              {currentModule === "SECRET_SERVICE" && step === 3 && (
                <motion.div key="ss3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-cyan-400 uppercase tracking-wider mb-1">Контакт подтвержден!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Радар выявил агента соперника в клетке [2,2]. <b className="text-purple-400">ТАПНИТЕ по подозрительной клетке.</b></p>
                </motion.div>
              )}
              {currentModule === "SECRET_SERVICE" && step === 4 && (
                <motion.div key="ss4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Разоблачение</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Разоблачение» для ареста шпиона.</p>
                </motion.div>
              )}
              {currentModule === "SECRET_SERVICE" && step === 5 && (
                <motion.div key="ss5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-base font-black text-emerald-400 uppercase tracking-wider mb-1">Трофей получен!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Резидент раскрыт (+1 трофей). Цель режима — собрать 4 трофея.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Игровое поле */}
          <div className={`flex-1 min-h-0 w-full flex items-center justify-center ${currentModule === "SKHVATKA" && lesson === 1 && step === 2 ? 'tutorial-highlight-l1s2' : ''} ${currentModule === "SKHVATKA" && lesson === 4 && step === 1 ? 'tutorial-highlight-l4s1' : ''}`}>
            <GameBoard
              mode={currentModule === "THIEF" ? "THIEF_HUNT" : currentModule === "SECRET_SERVICE" ? "SECRET_SERVICE" : "SKHVATKA"}
              board={board}
              selectedCharacterId={selectedId}
              killerAdjacentIds={adjacentIds}
              detectiveAdjacentIds={(currentModule === "SKHVATKA" && lesson === 4 && step === 2) ? playerAdjacentIds : []}
              showKillerHints={false}
              showDetectiveHints={false}
              radarTargetId={radarTargetId}
              radarCellIds={radarCellIds}
              radarColorClass={radarColorClass}
              lastShift={lastShift}
              onShift={handleShift}
              onSelectCharacter={handleSelectCharacter}
              blockedShift={null}
            />
          </div>

          {/* Нижняя панель действий */}
          <div className="h-20 shrink-0 w-full flex items-center justify-center px-6 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#080a0f] to-transparent z-20">
            <AnimatePresence mode="wait">
              {/* СХВАТКА КНОПКИ */}
              {currentModule === "SKHVATKA" && lesson === 1 && step === 3 && (
                <motion.button
                  key="next-l2"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={() => { setLesson(2); setStep(1); setBoard(getInitialBoard("SKHVATKA", 2)); }}
                  className="w-full max-w-sm h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Урок 2: Ликвидация ➔
                </motion.button>
              )}
              {currentModule === "SKHVATKA" && lesson === 2 && step === 2 && (
                <motion.button
                  key="kill-btn"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={handleKill}
                  className="w-full max-w-sm h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Ликвидировать
                </motion.button>
              )}
              {currentModule === "SKHVATKA" && lesson === 2 && step === 3 && (
                <motion.button
                  key="next-l3"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={() => { setLesson(3); setStep(1); setBoard(getInitialBoard("SKHVATKA", 3)); }}
                  className="w-full max-w-sm h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Урок 3: Задержание ➔
                </motion.button>
              )}
              {currentModule === "SKHVATKA" && lesson === 3 && step === 2 && (
                <motion.button
                  key="arrest-btn"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={handleArrest}
                  className="w-full max-w-sm h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Задержание
                </motion.button>
              )}
              {currentModule === "SKHVATKA" && lesson === 3 && step === 3 && (
                <motion.button
                  key="next-l4"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={() => { setLesson(4); setStep(1); setBoard(getInitialBoard("SKHVATKA", 4)); }}
                  className="w-full max-w-sm h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Перейти к Учебному делу ➔
                </motion.button>
              )}
              {currentModule === "SKHVATKA" && lesson === 4 && step === 3 && (
                <motion.button
                  key="arrest-btn-2"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={handleArrest}
                  className="w-full max-w-sm h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Задержание
                </motion.button>
              )}
              {currentModule === "SKHVATKA" && lesson === 4 && step === 4 && (
                <motion.button
                  key="finish-mod"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={() => setCurrentModule("MENU")}
                  className="w-full max-w-sm h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Вернуться в Каталог дел
                </motion.button>
              )}

              {/* МАНЬЯК КНОПКИ */}
              {currentModule === "MANIAC" && step === 2 && (
                <motion.button
                  key="kill-maniac"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={handleKill}
                  className="w-full max-w-sm h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Ликвидировать по заказу
                </motion.button>
              )}
              {currentModule === "MANIAC" && step === 3 && (
                <motion.button
                  key="finish-maniac"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={() => setCurrentModule("MENU")}
                  className="w-full max-w-sm h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Вернуться в Каталог дел
                </motion.button>
              )}

              {/* ВОР КНОПКИ */}
              {currentModule === "THIEF" && step === 2 && (
                <motion.button
                  key="rob-btn"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={handleRob}
                  className="w-full max-w-sm h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Кража сокровища
                </motion.button>
              )}
              {currentModule === "THIEF" && step === 3 && (
                <motion.button
                  key="mask-btn"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={handleFastDisguise}
                  className="w-full max-w-sm h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Конспирация (Маска)
                </motion.button>
              )}
              {currentModule === "THIEF" && step === 4 && (
                <motion.button
                  key="finish-thief"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={() => setCurrentModule("MENU")}
                  className="w-full max-w-sm h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Вернуться в Каталог дел
                </motion.button>
              )}

              {/* СЕКРЕТНАЯ СЛУЖБА КНОПКИ */}
              {currentModule === "SECRET_SERVICE" && step === 2 && (
                <motion.button
                  key="interrogate-ss"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={handleInterrogate}
                  className="w-full max-w-sm h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Опрос свидетелей
                </motion.button>
              )}
              {currentModule === "SECRET_SERVICE" && step === 4 && (
                <motion.button
                  key="capture-ss"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={handleCaptureSpy}
                  className="w-full max-w-sm h-12 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Разоблачение шпиона
                </motion.button>
              )}
              {currentModule === "SECRET_SERVICE" && step === 5 && (
                <motion.button
                  key="finish-ss"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  onClick={() => setCurrentModule("MENU")}
                  className="w-full max-w-sm h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Вернуться в Каталог дел
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
