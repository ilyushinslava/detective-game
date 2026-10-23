import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameBoard } from "./GameBoard";
import { ALL_CHARACTERS } from "../constants/characters";
import { shiftBoard, getAdjacentCharacters } from "../utils/gameLogic";
import { soundManager } from "../utils/audio";
import { triggerHaptic } from "../utils/haptics";
import type { Character, LastShift } from "../types/game";

const characterImages = import.meta.glob<{ default: string }>(
  "../assets/characters/*.webp",
  { eager: true }
);

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
      newBoard[2][0].isAlive = false;
      newBoard[3][0].isAlive = false;
      newBoard[3][1].isAlive = false;
    }
    return newBoard;
  }

  if (module === "MANIAC") {
    const elenaIndex = chars.findIndex(c => c.id === 'c3');
    if (elenaIndex !== -1 && elenaIndex !== 2) {
      const temp = chars[2];
      chars[2] = chars[elenaIndex];
      chars[elenaIndex] = temp;
    }
    const newBoard: Character[][] = [];
    for (let i = 0; i < 5; i++) {
      newBoard.push(chars.slice(i * 5, i * 5 + 5));
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

  const [thiefSecretId, setThiefSecretId] = useState<string | null>(null);
  const [maniacSecretId, setManiacSecretId] = useState<string | null>(null);
  const [isDisguiseModalOpen, setIsDisguiseModalOpen] = useState(false);
  const [newDisguiseChar, setNewDisguiseChar] = useState<Character | null>(null);

  const [interrogatedTargetId, setInterrogatedTargetId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<"NEAR" | "FAR" | null>(null);

  const isRewardClaimed = typeof window !== 'undefined' && localStorage.getItem("crime_city_tutorial") === "true";

  const [completedModules, setCompletedModules] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem("crime_city_tutorial") === "true") {
        return ["SKHVATKA", "MANIAC", "THIEF", "SECRET_SERVICE"];
      }
      const saved = localStorage.getItem("crime_city_completed_modules");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markModuleCompleted = (mod: TutorialModule) => {
    if (mod === "MENU") return;
    setCompletedModules((prev) => {
      if (prev.includes(mod)) return prev;
      const next = [...prev, mod];
      try {
        localStorage.setItem("crime_city_completed_modules", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const allModulesCompleted = ["SKHVATKA", "MANIAC", "THIEF", "SECRET_SERVICE"].every(m => completedModules.includes(m));

  const skhvatkaBanditId = useMemo(() => {
    return ALL_CHARACTERS[12].id;
  }, []);

  const spyEnemyId = board[1]?.[1]?.id;

  const currentMyCharacterId = useMemo(() => {
    if (currentModule === "SKHVATKA") {
      if (lesson === 3) return board[2]?.[2]?.id || null;
      if (lesson === 4) return L4_PLAYER_ID;
      return skhvatkaBanditId;
    }
    if (currentModule === "THIEF") {
      return thiefSecretId || board[2]?.[2]?.id;
    }
    if (currentModule === "MANIAC") {
      return maniacSecretId || board[2]?.[1]?.id;
    }
    if (currentModule === "SECRET_SERVICE") {
      return board[2]?.[2]?.id;
    }
    return null;
  }, [currentModule, lesson, skhvatkaBanditId, thiefSecretId, maniacSecretId, board]);

  const adjacentIds = useMemo(() => {
    if (!currentMyCharacterId) return [];
    return getAdjacentCharacters(board, currentMyCharacterId).map((c) => c.id);
  }, [board, currentMyCharacterId]);

  const targetVictimId = "c3";
  const targetVictimChar = useMemo(
    () => board.flat().find((c) => c.id === targetVictimId),
    [board]
  );
  const targetVictimName = targetVictimChar?.name ?? "Елена Соколова";

  const { radarTargetId, radarCellIds, radarColorClass } = useMemo(() => {
    const tacticalRadarClass = "border-blue-500 ring-2 ring-blue-500/70";

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
        const witnessId = board[1]?.[2]?.id;
        if (witnessId) {
          const neighborIds = getAdjacentCharacters(board, witnessId).map((c) => c.id);
          return {
            radarTargetId: witnessId,
            radarCellIds: [witnessId, ...neighborIds],
            radarColorClass: tacticalRadarClass,
          };
        }
      }
    }

    if (currentModule === "SECRET_SERVICE" && lesson === 1 && interrogatedTargetId) {
      const neighborIds = getAdjacentCharacters(board, interrogatedTargetId).map((c) => c.id);
      return {
        radarTargetId: interrogatedTargetId,
        radarCellIds: [interrogatedTargetId, ...neighborIds],
        radarColorClass: scanResult === "NEAR" ? "border-red-400 ring-2 ring-red-500/80" : "border-amber-400 ring-2 ring-amber-500/80",
      };
    }

    return {
      radarTargetId: null,
      radarCellIds: [] as string[],
      radarColorClass: null,
    };
  }, [currentModule, lesson, step, killedTargetId, interrogatedTargetId, scanResult, board]);

  const getHudStatus = () => {
    if (currentModule === "SECRET_SERVICE") {
      if (lesson === 1) {
        if (scanResult === "NEAR") return <span className="text-red-400 font-bold animate-pulse">Показания: ВРАГ РЯДОМ (ДА)</span>;
        if (scanResult === "FAR") return <span className="text-amber-400 font-bold">Показания: ВНЕ ЗОНЫ (НЕТ) — резидента рядом нет. Опросите другого очевидца</span>;
        return <span className="text-zinc-300 font-bold">Оперативные показания: выберите очевидца для опроса</span>;
      }
      if (lesson === 2) {
        return <span className="text-purple-400 font-bold">Разоблачение: укажите на вражеского резидента (София Романова)</span>;
      }
    }
    if (currentModule === "SKHVATKA") {
      if (lesson === 2 && step >= 3) return <span className="text-amber-400 font-bold">Показания очевидцев: ИНСПЕКТОР ВНЕ ЗОНЫ</span>;
      if (lesson === 3) return <span className="text-amber-400 font-bold">Зона очевидца: СЕКТОР 3×3 (сужение круга поиска)</span>;
      if (lesson === 4) return <span className="text-zinc-400 font-bold">Зачистка: устраните скопление тел для маневра</span>;
    }
    if (currentModule === "MANIAC") {
      if (lesson === 1) return <span className="text-red-400 font-bold">Текущая цель заказа: {targetVictimName}</span>;
      if (lesson === 2) return <span className="text-amber-400 font-bold">Уход от погони: смените личность</span>;
    }
    if (currentModule === "THIEF") {
      if (step === 4) return <span className="text-emerald-400 font-bold">Маскировка успешна: принято новое прикрытие</span>;
      return <span className="text-amber-400 font-bold">Операция Вора: Похищение сокровищ без ликвидаций</span>;
    }
    return <span className="text-zinc-500 font-bold">Ожидание...</span>;
  };

  const startModule = (mod: TutorialModule) => {
    setCurrentModule(mod);
    setLesson(1);
    setStep(1);
    const initialB = getInitialBoard(mod, 1);
    setBoard(initialB);
    setLastShift(null);
    setSelectedId(null);
    setKilledTargetId(null);
    setInterrogatedTargetId(null);
    setScanResult(null);
    setIsDisguiseModalOpen(false);
    setNewDisguiseChar(null);
    if (mod === "THIEF") {
      setThiefSecretId(initialB[2][2].id);
    } else {
      setThiefSecretId(null);
    }
    if (mod === "MANIAC") {
      setManiacSecretId(initialB[2][1].id);
    } else {
      setManiacSecretId(null);
    }
  };

  const handleSelectCharacter = (id: string) => {
    if (currentModule === "SKHVATKA") {
      if (lesson === 1 && (step === 1 || step === 2)) {
        triggerHaptic("light");
        setSelectedId(id);
      } else if (lesson === 2 && step === 1 && adjacentIds.includes(id)) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(2);
      } else if (lesson === 3 && step === 1) {
        const char = board.flat().find((c) => c.id === id);
        if (
          char?.isAlive &&
          !char?.isExonerated &&
          (adjacentIds.includes(id) || radarCellIds.includes(id))
        ) {
          setSelectedId(id);
          setStep(2);
          triggerHaptic("light");
        }
      } else if (lesson === 4 && step === 2 && id === L4_KILLER_ID) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(3);
      }
    } else if (currentModule === "MANIAC") {
      if (lesson === 1 && step === 2 && id === targetVictimId && adjacentIds.includes(id)) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(3);
      }
    } else if (currentModule === "THIEF") {
      if (lesson === 1 && step === 1 && adjacentIds.includes(id)) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(2);
      }
    } else if (currentModule === "SECRET_SERVICE") {
      if (lesson === 1 && (step === 1 || step === 2) && adjacentIds.includes(id)) {
        triggerHaptic("light");
        setSelectedId(id);
        setScanResult(null);
        setStep(2);
      } else if (lesson === 2 && step === 1 && id === spyEnemyId) {
        triggerHaptic("light");
        setSelectedId(id);
        setScanResult(null);
        setStep(2);
      }
    }
  };

  const handleShift = (
    type: "ROW" | "COL",
    index: number,
    direction: "FORWARD" | "BACKWARD"
  ) => {
    setSelectedId(null);
    if (
      currentModule === "SKHVATKA" &&
      lesson === 1 &&
      (step === 1 || step === 2) &&
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
      currentModule === "MANIAC" &&
      lesson === 1 &&
      step === 1 &&
      type === "COL" &&
      index === 2 &&
      direction === "FORWARD"
    ) {
      const newBoard = shiftBoard(board, type, index, direction);
      setBoard(newBoard);
      setLastShift({ type, index, direction });
      soundManager.play("slide");
      triggerHaptic("medium");
      setStep(2);
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
    } else if (currentModule === "MANIAC" && lesson === 1 && step === 3 && selectedId && adjacentIds.includes(selectedId)) {
      const targetId = selectedId;
      const newBoard = board.map((row) =>
        row.map((c) => (c.id === targetId ? { ...c, isAlive: false } : c))
      );
      setBoard(newBoard);
      soundManager.play("kill");
      triggerHaptic("heavy");
      setStep(4);
      setSelectedId(null);
    }
  };

  const handleEscape = () => {
    if (currentModule === "MANIAC" && lesson === 2 && step === 1) {
      triggerHaptic("medium");
      soundManager.play("disguise");
      const targetMaskChar = board[3][3];
      setNewDisguiseChar(targetMaskChar);
      setIsDisguiseModalOpen(true);
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
        row.map((c) => (c.id === targetId ? ({ ...c, isAlive: false, isArrested: true } as any) : c))
      );
      setBoard(newBoard);
      soundManager.play("arrest");
      triggerHaptic("success");
      setStep(lesson === 3 ? 3 : 4);
      setSelectedId(null);
    }
  };

  const handleCleanup = () => {
    if (currentModule === "SKHVATKA" && lesson === 4 && step === 1) {
      triggerHaptic("medium");
      soundManager.play("slide");
      const living = board.flat().filter(c => c.isAlive);
      const dead = board.flat().filter(c => !c.isAlive);
      const reordered = [...living, ...dead];
      const newBoard: Character[][] = [];
      for (let i = 0; i < 5; i++) {
        newBoard.push(reordered.slice(i * 5, i * 5 + 5));
      }
      setBoard(newBoard);
      setStep(2);
    }
  };

  const handleRob = () => {
    if (currentModule === "THIEF" && lesson === 1 && step === 2 && selectedId) {
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
    if (currentModule === "THIEF" && lesson === 2 && step === 1) {
      soundManager.play("disguise");
      triggerHaptic("medium");
      const targetMaskChar = board[1][1];
      setNewDisguiseChar(targetMaskChar);
      setIsDisguiseModalOpen(true);
    }
  };

  const handleConfirmDisguise = () => {
    if (newDisguiseChar) {
      if (currentModule === "THIEF") {
        setThiefSecretId(newDisguiseChar.id);
      } else if (currentModule === "MANIAC") {
        setManiacSecretId(newDisguiseChar.id);
      }
    }
    setIsDisguiseModalOpen(false);
    setStep(2);
  };

  const handleInterrogate = () => {
    if (currentModule === "SECRET_SERVICE" && lesson === 1 && step === 2 && selectedId) {
      soundManager.play("radar");
      triggerHaptic("light");
      setInterrogatedTargetId(selectedId);

      const spyNeighbors = getAdjacentCharacters(board, spyEnemyId!).map((c) => c.id);
      const isNearSpy = spyNeighbors.includes(selectedId) || selectedId === spyEnemyId;

      if (isNearSpy) {
        setScanResult("NEAR");
        setStep(3);
        setSelectedId(null);
      } else {
        setScanResult("FAR");
        setSelectedId(null);
      }
    }
  };

  const handleCaptureSpy = () => {
    if (currentModule === "SECRET_SERVICE" && lesson === 2 && step === 2 && selectedId) {
      const targetId = selectedId;
      const newBoard = board.map((row) =>
        row.map((c) => (c.id === targetId ? { ...c, isAlive: false, unmaskedSpyIndex: 0 } : c))
      );
      setBoard(newBoard);
      soundManager.play("arrest");
      triggerHaptic("success");
      setStep(3);
      setSelectedId(null);
    }
  };

  if (currentModule === "MENU") {
    return (
      <div className="fixed inset-0 z-[100] bg-[#050608] flex justify-center overflow-hidden font-sans select-none text-zinc-100 h-full w-full">
        <div className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto h-full flex flex-col justify-between relative overflow-hidden bg-[#080a0f] md:border-x md:border-white/10 shadow-2xl">
          <div className="flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-white/10 bg-[#080a0f]">
            <button
              onClick={onExit}
              className="text-zinc-500 hover:text-white transition cursor-pointer text-xs font-black uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/5"
            >
              ✕ В меню
            </button>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest">Академия</span>
              <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">Каталог дел</h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-zinc-400">
                Пройдено: <b className="text-amber-400">{completedModules.length}</b>/4
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar">
            <div
              onClick={() => startModule("SKHVATKA")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("SKHVATKA")
                  ? "bg-gradient-to-r from-amber-950/20 via-zinc-900/60 to-zinc-900/40 border-emerald-500/40"
                  : "bg-gradient-to-r from-amber-950/40 via-zinc-900/60 to-zinc-900/40 border-amber-500/40 hover:border-amber-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Курс оперативника (Схватка)</h3>
                {completedModules.includes("SKHVATKA") && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Базовые механики: соседство, тактика сдвига рядов, опрос свидетелей в секторе 3х3 и задержание.</p>
            </div>

            <div
              onClick={() => startModule("MANIAC")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("MANIAC")
                  ? "bg-gradient-to-r from-red-950/20 via-zinc-900/60 to-zinc-900/40 border-emerald-500/40"
                  : "bg-gradient-to-r from-red-950/40 via-zinc-900/60 to-zinc-900/40 border-red-900/40 hover:border-red-500"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Контракт ликвидатора (Охота на маньяка)</h3>
                {completedModules.includes("MANIAC") && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Особенности открытого списка смертников: убийства строго по очереди целей и побег маньяка.</p>
            </div>

            <div
              onClick={() => startModule("THIEF")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("THIEF")
                  ? "bg-gradient-to-r from-amber-950/20 via-zinc-900/60 to-zinc-900/40 border-emerald-500/40"
                  : "bg-gradient-to-r from-amber-950/40 via-zinc-900/60 to-zinc-900/40 border-amber-900/40 hover:border-amber-500"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Охота на грабителя</h3>
                {completedModules.includes("THIEF") && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Кража сокровищ без ликвидаций, смена масок из руки и выставление патрулей оцепления.</p>
            </div>

            <div
              onClick={() => startModule("SECRET_SERVICE")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("SECRET_SERVICE")
                  ? "bg-gradient-to-r from-purple-950/20 via-zinc-900/60 to-zinc-900/40 border-emerald-500/40"
                  : "bg-gradient-to-r from-purple-950/40 via-zinc-900/60 to-zinc-900/40 border-purple-900/40 hover:border-purple-500"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Секретная служба</h3>
                {completedModules.includes("SECRET_SERVICE") && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Шпионские дуэли: перекрестный опрос очевидцев в секторе 3x3 и разоблачение вражеского резидента.</p>
            </div>
          </div>

          <div className="p-4 border-t border-white/10 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {isRewardClaimed ? (
              <button
                onClick={onExit}
                className="w-full h-12 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-black tracking-widest uppercase text-xs shadow-lg transition active:scale-98 cursor-pointer"
              >
                Завершить курс: пройдено (В меню)
              </button>
            ) : (
              <button
                onClick={allModulesCompleted ? onFinish : onExit}
                className="w-full h-12 rounded-full bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800 text-white font-black tracking-widest uppercase text-xs shadow-lg transition active:scale-98 cursor-pointer"
              >
                {allModulesCompleted ? "Завершить курс (+250 CR)" : "В главное меню"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#050608] flex justify-center overflow-hidden font-sans select-none text-zinc-100 h-full w-full">
      <style>{`
        .tutorial-highlight-l1s2 button[title*="Сдвиг влево"]:nth-of-type(3),
        .tutorial-highlight-maniac button[title*="Сдвиг вниз"]:nth-of-type(3) {
          position: relative; z-index: 30;
          box-shadow: 0 0 20px rgba(245,158,11,0.95) !important;
          border-color: #fbbf24 !important;
          background-color: rgba(245,158,11,0.3) !important;
          color: white !important;
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
        }
      `}</style>
      <div className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto h-full flex flex-col justify-between relative overflow-hidden bg-[#080a0f] md:border-x md:border-white/10 shadow-2xl">
        <div className="w-full flex items-center justify-between px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 shrink-0 border-b border-white/10 bg-[#080a0f] z-20">
          <button onClick={() => setCurrentModule("MENU")} className="text-zinc-500 hover:text-white transition cursor-pointer text-xs font-black uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/5">
            ← К делам
          </button>
          <h2 className="text-sm font-black tracking-widest text-amber-400 uppercase text-center flex-1">
            {currentModule === "SKHVATKA" ? "СХВАТКА" : currentModule === "MANIAC" ? "МАНЬЯК" : currentModule === "THIEF" ? "ОХОТА НА ВОРА" : "СЕКРЕТНАЯ СЛУЖБА"}
          </h2>
          <div className="w-16 shrink-0" />
        </div>

        <div className="flex-1 w-full flex flex-col relative min-h-0">
          <div className="min-h-[85px] max-h-[125px] shrink-0 pt-2 pb-1 px-4 flex flex-col justify-center items-center text-center z-20">
            <AnimatePresence mode="wait">
              {currentModule === "SKHVATKA" && lesson === 1 && (step === 1 || step === 2) && (
                <motion.div key="l1s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Урок 1: Основы маневра</h3>
                  <p className="text-xs text-zinc-400 font-mono">Бандит в центре (ВЫ). Подсвечена зона 8 соседей. Цель вне досягаемости. <b className="text-amber-400">НАЖМИТЕ стрелку ← у 3-го ряда</b> для смещения.</p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 1 && step === 3 && (
                <motion.div key="l1s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Отлично!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Карта уходит за край и появляется справа, меняя окружение. Зона соседей переместилась вместе с вами.</p>
                </motion.div>
              )}

              {currentModule === "SKHVATKA" && lesson === 2 && step === 1 && (
                <motion.div key="l2s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Урок 2: Ликвидация</h3>
                  <p className="text-xs text-zinc-400 font-mono">Вы — Бандит. <b className="text-red-400">ВЫБЕРИТЕ цель для ликвидации среди 8 соседей.</b></p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 2 && step === 2 && (
                <motion.div key="l2s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Цель выбрана</h3>
                  <p className="text-xs text-zinc-400 font-mono"><b className="text-red-400">НАЖМИТЕ кнопку "Ликвидировать" внизу.</b></p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 2 && step === 3 && (
                <motion.div key="l2s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Показания очевидцев</h3>
                  <p className="text-xs text-zinc-400 font-mono">Свидетель сверху дает показания: в секторе 3×3 Инспектора не было.</p>
                </motion.div>
              )}

              {currentModule === "SKHVATKA" && lesson === 3 && step === 1 && (
                <motion.div key="l3s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Урок 3: Задержание</h3>
                  <p className="text-xs text-zinc-400 font-mono">Инспектор (ВЫ) в центре квартала. Свидетель подтвердил, что Бандит в секторе 3×3. Выберите любого соседа Инспектора без алиби в секторе.</p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 3 && step === 2 && (
                <motion.div key="l3s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Предъявление обвинения</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Задержание» для ареста подозреваемого.</p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 3 && step === 3 && (
                <motion.div key="l3s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Точный арест!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Бандит задержан (штамп «АРЕСТОВАН»). Переходим к учебному делу.</p>
                </motion.div>
              )}

              {currentModule === "SKHVATKA" && lesson === 4 && step === 1 && (
                <motion.div key="l4s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Урок 4: Загромождение и Зачистка</h3>
                  <p className="text-xs text-zinc-400 font-mono">На поле скопились тела, мешающие маневрам. Нажмите «Зачистить» — выбывшие жители сместятся в крайние линии сетки.</p>
                </motion.div>
              )}
              {currentModule === "SKHVATKA" && lesson === 4 && step === 2 && (
                <motion.div key="l4s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Курс пройден!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Вы успешно освоили тактику маневров и дедукции.</p>
                </motion.div>
              )}

              {currentModule === "MANIAC" && lesson === 1 && step === 1 && (
                <motion.div key="maniac1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider mb-0.5">Очередь целей: список смертников и сближение</h3>
                  <p className="text-xs text-zinc-400 font-mono">Маньяк (ВЫ) в клетке ряда 3. Открыта цель — {targetVictimName} (дистанция 2 шага). <b className="text-amber-400">Сдвиньте 3-ю колонку вниз (↓)</b>, чтобы подвести её в зону удара.</p>
                </motion.div>
              )}
              {currentModule === "MANIAC" && lesson === 1 && step === 2 && (
                <motion.div key="maniac1s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Цель в зоне удара</h3>
                  <p className="text-xs text-zinc-400 font-mono">Елена Соколова теперь сосед Маньяка. ВЫБЕРИТЕ её для ликвидации.</p>
                </motion.div>
              )}
              {currentModule === "MANIAC" && lesson === 1 && step === 3 && (
                <motion.div key="maniac2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Ликвидация цели</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Ликвидировать по заказу» внизу.</p>
                </motion.div>
              )}
              {currentModule === "MANIAC" && lesson === 1 && step === 4 && (
                <motion.div key="maniac3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Цель поражена!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Жертва ликвидирована строго по контракту.</p>
                </motion.div>
              )}
              {currentModule === "MANIAC" && lesson === 2 && step === 1 && (
                <motion.div key="maniacL2s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">План перехвата и побег</h3>
                  <p className="text-xs text-zinc-400 font-mono">Оперативник выходит на след. Нажмите «Конспирация (Побег)» для сброса тела и перехода в новую тайную личность.</p>
                </motion.div>
              )}
              {currentModule === "MANIAC" && lesson === 2 && step === 2 && (
                <motion.div key="maniacL2s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Побег успешен!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Маньяк принял новое обличье ({newDisguiseChar?.name ?? "Житель"}). Метка «ВЫ» переместилась.</p>
                </motion.div>
              )}

              {currentModule === "THIEF" && lesson === 1 && step === 1 && (
                <motion.div key="thief1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Карманная кража</h3>
                  <p className="text-xs text-zinc-400 font-mono">Вор (ВЫ) обчищает соседа без убийства. <b className="text-amber-400">ТАПНИТЕ по любому подсвеченному соседу.</b></p>
                </motion.div>
              )}
              {currentModule === "THIEF" && lesson === 1 && step === 2 && (
                <motion.div key="thief2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Кража сокровища</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Кража сокровища» внизу.</p>
                </motion.div>
              )}
              {currentModule === "THIEF" && lesson === 1 && step === 3 && (
                <motion.div key="thief3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Успешная кража!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Похищен жетон Синдиката (добыча 1/5).</p>
                </motion.div>
              )}
              {currentModule === "THIEF" && lesson === 2 && step === 1 && (
                <motion.div key="thiefL2s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Маскировка из руки и патрули</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Конспирация (Маска)» для смены лица картой из руки.</p>
                </motion.div>
              )}
              {currentModule === "THIEF" && lesson === 2 && step === 2 && (
                <motion.div key="thiefL2s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Лицо изменено!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Вор принял новое прикрытие ({newDisguiseChar?.name ?? "Марк Вайс"}). Метка «ВЫ» переместилась на новую клетку. Демонстрация оцепления линии патрулем завершена.</p>
                </motion.div>
              )}

              {currentModule === "SECRET_SERVICE" && lesson === 1 && (step === 1 || (step === 2 && scanResult === "FAR")) && (
                <motion.div key="ss1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-purple-400 uppercase tracking-wider mb-0.5">Перекрестный опрос</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    {scanResult === "FAR"
                      ? "Вне зоны (НЕТ). Опросите другого очевидца ближе к резиденту."
                      : "Агент в центре (ВЫ). Вражеский резидент прячется в квартале. ВЫБЕРИТЕ очевидца для опроса. Помните: свидетель сам внутри сектора 3×3 и тоже может оказаться скрывающимся резидентом!"}
                  </p>
                </motion.div>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 1 && step === 2 && scanResult !== "FAR" && (
                <motion.div key="ss2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Опрос очевидцев</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Опрос свидетелей» внизу.</p>
                </motion.div>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 1 && step === 3 && (
                <motion.div key="ss3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Враг рядом (ДА)!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Опрос свидетеля рядом с резидентом дает статус «Враг рядом (ДА)». Очевидец и его окружение охвачены сектором.</p>
                </motion.div>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 2 && step === 1 && (
                <motion.div key="ssL2s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Разоблачение резидента</h3>
                  <p className="text-xs text-zinc-400 font-mono">Выберите Софию Романову в выявленном секторе.</p>
                </motion.div>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 2 && step === 2 && (
                <motion.div key="ssL2s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Разоблачение</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Разоблачение шпиона» для задержания.</p>
                </motion.div>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 2 && step === 3 && (
                <motion.div key="ss5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Трофей получен!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Резидент разоблачен (штамп «РАСКРЫТ»). Фиксация трофея 1/4. Операция завершена успешно.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="min-h-[2.25rem] py-1 px-4 w-full shrink-0 flex items-center justify-center bg-zinc-950/80 border-y border-white/5 shadow-sm z-20">
            <div className="text-[10px] md:text-xs tracking-widest uppercase font-mono text-center leading-tight flex flex-wrap justify-center items-center">
              {getHudStatus()}
            </div>
          </div>

          <div className={`flex-1 min-h-0 w-full flex items-center justify-center py-2 overflow-visible py-3 overflow-visible ${
            currentModule === "SKHVATKA" && lesson === 1 && (step === 1 || step === 2) ? "tutorial-highlight-l1s2" : ""
          } ${currentModule === "MANIAC" && lesson === 1 && step === 1 ? "tutorial-highlight-maniac" : ""}`}>
            <GameBoard
              mode={currentModule === "THIEF" ? "THIEF_HUNT" : currentModule === "SECRET_SERVICE" ? "SECRET_SERVICE" : "SKHVATKA"}
              board={board}
              selectedCharacterId={selectedId}
              killerAdjacentIds={adjacentIds}
              detectiveAdjacentIds={adjacentIds}
              showKillerHints={
                (currentModule === "SKHVATKA" && lesson === 1) ||
                (currentModule === "SKHVATKA" && lesson === 2 && step === 1) ||
                (currentModule === "MANIAC" && lesson === 1 && step === 2) ||
                (currentModule === "THIEF" && lesson === 1 && step === 1) ||
                (currentModule === "SECRET_SERVICE" && lesson === 1 && (step === 1 || (step === 2 && scanResult === "FAR"))) ||
                (currentModule === "SECRET_SERVICE" && lesson === 2 && step === 1)
              }
              showDetectiveHints={currentModule === "SKHVATKA" && lesson === 3 && step === 1}
              targetVictimId={
                currentModule === "MANIAC" ? targetVictimId : null
              }
              radarTargetId={radarTargetId}
              radarCellIds={radarCellIds}
              radarColorClass={radarColorClass}
              lastShift={lastShift}
              myCharacterId={currentMyCharacterId}
              onShift={handleShift}
              onSelectCharacter={handleSelectCharacter}
              blockedShift={null}
            />
          </div>

          <div className="h-16 md:h-20 shrink-0 w-full flex items-center justify-center px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#080a0f] to-transparent z-20">
            <AnimatePresence mode="wait">
              {currentModule === "SKHVATKA" && lesson === 1 && step === 3 && (
                <motion.button onClick={() => { setLesson(2); setStep(1); setBoard(getInitialBoard("SKHVATKA", 2)); }} className="w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Урок 2: Ликвидация ➔</motion.button>
              )}
              {currentModule === "SKHVATKA" && lesson === 2 && step === 2 && (
                <motion.button onClick={handleKill} className="w-full max-w-sm h-11 md:h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Ликвидировать</motion.button>
              )}
              {currentModule === "SKHVATKA" && lesson === 2 && step === 3 && (
                <motion.button onClick={() => { setLesson(3); setStep(1); setBoard(getInitialBoard("SKHVATKA", 3)); }} className="w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Урок 3: Задержание ➔</motion.button>
              )}
              {currentModule === "SKHVATKA" && lesson === 3 && step === 2 && (
                <motion.button onClick={handleArrest} className="w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Задержание</motion.button>
              )}
              {currentModule === "SKHVATKA" && lesson === 3 && step === 3 && (
                <motion.button onClick={() => { setLesson(4); setStep(1); setBoard(getInitialBoard("SKHVATKA", 4)); }} className="w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Урок 4: Зачистка ➔</motion.button>
              )}
              {currentModule === "SKHVATKA" && lesson === 4 && step === 1 && (
                <motion.button onClick={handleCleanup} className="w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Зачистить</motion.button>
              )}
              {currentModule === "SKHVATKA" && lesson === 4 && step === 2 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("SKHVATKA");
                    setCurrentModule("MENU");
                  }}
                  className="w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {currentModule === "MANIAC" && lesson === 1 && step === 3 && (
                <motion.button onClick={handleKill} className="w-full max-w-sm h-11 md:h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Ликвидировать по заказу</motion.button>
              )}
              {currentModule === "MANIAC" && lesson === 1 && step === 4 && (
                <motion.button onClick={() => { setLesson(2); setStep(1); setBoard(getInitialBoard("MANIAC", 2)); }} className="w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Урок 2: Побег ➔</motion.button>
              )}
              {currentModule === "MANIAC" && lesson === 2 && step === 1 && (
                <motion.button onClick={handleEscape} className="w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Конспирация (Побег)</motion.button>
              )}
              {currentModule === "MANIAC" && lesson === 2 && step === 2 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("MANIAC");
                    setCurrentModule("MENU");
                  }}
                  className="w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {currentModule === "THIEF" && lesson === 1 && step === 2 && (
                <motion.button onClick={handleRob} className="w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Кража сокровища</motion.button>
              )}
              {currentModule === "THIEF" && lesson === 1 && step === 3 && (
                <motion.button onClick={() => { setLesson(2); setStep(1); setBoard(getInitialBoard("THIEF", 2)); }} className="w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Урок 2: Маскировка ➔</motion.button>
              )}
              {currentModule === "THIEF" && lesson === 2 && step === 1 && (
                <motion.button onClick={handleFastDisguise} className="w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Конспирация (Маска)</motion.button>
              )}
              {currentModule === "THIEF" && lesson === 2 && step === 2 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("THIEF");
                    setCurrentModule("MENU");
                  }}
                  className="w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {currentModule === "SECRET_SERVICE" && lesson === 1 && step === 2 && Boolean(selectedId) && (
                <motion.button onClick={handleInterrogate} className="w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Опрос свидетелей</motion.button>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 1 && step === 3 && (
                <motion.button onClick={() => { setLesson(2); setStep(1); setBoard(getInitialBoard("SECRET_SERVICE", 2)); setInterrogatedTargetId(null); setScanResult(null); }} className="w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Урок 2: Разоблачение ➔</motion.button>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 2 && step === 2 && (
                <motion.button onClick={handleCaptureSpy} className="w-full max-w-sm h-11 md:h-12 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer">Разоблачение шпиона</motion.button>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 2 && step === 3 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("SECRET_SERVICE");
                    setCurrentModule("MENU");
                  }}
                  className="w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {isDisguiseModalOpen && newDisguiseChar && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
            <div className="w-full max-w-sm bg-zinc-950 border border-amber-500/50 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col items-center">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">
                Конспирация успешна
              </span>
              <h3 className="text-xl font-black text-zinc-100 mb-2">
                Ваша новая личность:
              </h3>
              {(() => {
                const img = characterImages[`../assets/characters/${newDisguiseChar.id}.webp`]?.default;
                return (
                  <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-zinc-700 my-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    {img ? (
                      <img src={img} alt={newDisguiseChar.name} className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 pointer-events-none" />
                    ) : (
                      <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-zinc-500">Нет фото</div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-3 pt-12 flex flex-col items-center">
                      <span className="text-xl font-black text-zinc-100 uppercase tracking-wider leading-tight text-center">
                        {newDisguiseChar.name}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <button onClick={handleConfirmDisguise} className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-zinc-950 font-black uppercase tracking-wider text-xs rounded-xl transition cursor-pointer shadow-lg active:scale-95">
                Принять личность ➔
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

