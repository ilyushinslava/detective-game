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

export type TutorialModule =
  | "MENU"
  | "BASICS"
  | "MANIAC_KILLER"
  | "MANIAC_DETECTIVE"
  | "THIEF_ROBBER"
  | "THIEF_POLICE"
  | "SECRET_SERVICE"
  | "LINE_UP";

const ALL_MODULES_LIST: TutorialModule[] = [
  "BASICS",
  "MANIAC_KILLER",
  "MANIAC_DETECTIVE",
  "THIEF_ROBBER",
  "THIEF_POLICE",
  "SECRET_SERVICE",
  "LINE_UP",
];

const getInitialBoard = (module: TutorialModule) => {
  const chars = ALL_CHARACTERS.slice(0, 25).map((c) => ({
    ...c,
    isAlive: true,
    isExonerated: false,
    isRobbed: false,
  }));

  if (module === "LINE_UP") {
    const c1Index = chars.findIndex((c) => c.id === "c1");
    if (c1Index !== -1 && c1Index !== 12) {
      const temp = chars[12];
      chars[12] = chars[c1Index];
      chars[c1Index] = temp;
    }
  } else if (module === "MANIAC_KILLER") {
    const elenaIndex = chars.findIndex((c) => c.id === "c3");
    if (elenaIndex !== -1 && elenaIndex !== 2) {
      const temp = chars[2];
      chars[2] = chars[elenaIndex];
      chars[elenaIndex] = temp;
    }
  } else if (module === "MANIAC_DETECTIVE") {
    chars[7].isExonerated = true; // [1][2]
    chars[11].isExonerated = true; // [2][1]
    chars[18].isAlive = false; // [3][3] victim
  } else if (module === "THIEF_POLICE") {
    chars[7].isRobbed = true; // [1][2]
  }

  const newBoard: Character[][] = [];
  for (let i = 0; i < 5; i++) {
    newBoard.push(chars.slice(i * 5, i * 5 + 5));
  }
  return newBoard;
};

export const TutorialScreen = ({ onExit, onFinish }: TutorialScreenProps) => {
  const [currentModule, setCurrentModule] = useState<TutorialModule>("MENU");
  const [step, setStep] = useState<number>(1);
  const [board, setBoard] = useState<Character[][]>(() => getInitialBoard("BASICS"));
  const [lastShift, setLastShift] = useState<LastShift | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [thiefSecretId, setThiefSecretId] = useState<string | null>(null);
  const [maniacSecretId, setManiacSecretId] = useState<string | null>(null);
  const [isDisguiseModalOpen, setIsDisguiseModalOpen] = useState(false);
  const [newDisguiseChar, setNewDisguiseChar] = useState<Character | null>(null);

  const [interrogatedTargetId, setInterrogatedTargetId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<"NEAR" | "FAR" | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; name: string; id: string } | null>(null);

  const isRewardClaimed = typeof window !== "undefined" && localStorage.getItem("crime_city_tutorial") === "true";

  const [completedModules, setCompletedModules] = useState<string[]>(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem("crime_city_tutorial") === "true") {
        return ALL_MODULES_LIST;
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

  const allModulesCompleted = ALL_MODULES_LIST.every((m) => completedModules.includes(m));

  const spyEnemyId = board[1]?.[1]?.id;
  const detectiveSuspectId = board[1]?.[1]?.id;
  const policeSuspectId = board[0]?.[2]?.id;

  const tutorialMyRoleColor = useMemo<"red" | "blue">((): "red" | "blue" => {
    if (currentModule === "MANIAC_KILLER" || currentModule === "THIEF_ROBBER") {
      return "red";
    }
    return "blue";
  }, [currentModule]);

  const currentMyCharacterId = useMemo(() => {
    if (currentModule === "BASICS") {
      return board[2]?.[2]?.id || null;
    }
    if (currentModule === "MANIAC_KILLER") {
      return maniacSecretId || board[2]?.[1]?.id;
    }
    if (currentModule === "MANIAC_DETECTIVE") {
      return board[2]?.[2]?.id;
    }
    if (currentModule === "THIEF_ROBBER") {
      return thiefSecretId || board[2]?.[2]?.id;
    }
    if (currentModule === "THIEF_POLICE") {
      return board[2]?.[2]?.id;
    }
    if (currentModule === "SECRET_SERVICE") {
      return board[2]?.[2]?.id;
    }
    if (currentModule === "LINE_UP") {
      return null;
    }
    return null;
  }, [currentModule, board, maniacSecretId, thiefSecretId]);

  const adjacentIds = useMemo(() => {
    if (!currentMyCharacterId) return [];
    return getAdjacentCharacters(board, currentMyCharacterId).map((c) => c.id);
  }, [board, currentMyCharacterId]);

  const targetVictimId = "c3";

  const { radarTargetId, radarCellIds, radarColorClass } = useMemo(() => {
    const tacticalRadarClass = "border-blue-500 ring-2 ring-blue-500/70";

    if (currentModule === "MANIAC_DETECTIVE" && step === 1) {
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

    if (currentModule === "SECRET_SERVICE" && step >= 2 && interrogatedTargetId) {
      const neighborIds = getAdjacentCharacters(board, interrogatedTargetId).map((c) => c.id);
      return {
        radarTargetId: interrogatedTargetId,
        radarCellIds: [interrogatedTargetId, ...neighborIds],
        radarColorClass:
          scanResult === "NEAR"
            ? "border-red-500 ring-2 ring-red-500/80"
            : "border-blue-500 ring-2 ring-blue-500/80",
      };
    }

    return {
      radarTargetId: null,
      radarCellIds: [] as string[],
      radarColorClass: null,
    };
  }, [currentModule, step, interrogatedTargetId, scanResult, board]);

  const getHudStatus = () => {
    switch (currentModule) {
      case "BASICS":
        if (step === 1) return <span className="text-cyan-400 font-bold">ОСНОВЫ: СДВИГ 3-ГО РЯДА ВЛЕВО (←)</span>;
        if (step === 2) return <span className="text-cyan-400 font-bold">РАДИУС 3×3: ВЫБЕРИТЕ СОСЕДНЕГО ЖИТЕЛЯ</span>;
        if (step === 3) return <span className="text-emerald-400 font-bold">ПРАВИЛО ANTI-UNDO: ОБРАТНЫЙ ХОД ЗАБЛОКИРОВАН</span>;
        break;
      case "MANIAC_KILLER":
        if (step === 1) return <span className="text-red-400 font-bold">ОХОТА: СДВИНЬТЕ 3-Ю КОЛОНКУ ВНИЗ (↓)</span>;
        if (step === 2) return <span className="text-red-400 font-bold">ЦЕЛЬ ЗАКАЗА: ВЫБЕРИТЕ ЕЛЕНУ СОКОЛОВУ</span>;
        if (step === 3) return <span className="text-red-400 font-bold">ЛИКВИДАЦИЯ: ПОДТВЕРДИТЕ ВЫСТРЕЛ ПО ЗАКАЗУ</span>;
        if (step === 4) return <span className="text-amber-400 font-bold">ОБЛАВА: СМЕНИТЕ МАСКУ ДЛЯ ПОБЕГА</span>;
        if (step === 5) return <span className="text-emerald-400 font-bold">ПОБЕГ УСПЕШЕН: НОВАЯ ЛИЧНОСТЬ ПРИНЯТА</span>;
        break;
      case "MANIAC_DETECTIVE":
        if (step === 1) return <span className="text-blue-400 font-bold">ДЕРАДАРИЗАЦИЯ: ВЫБЕРИТЕ ПОДОЗРЕВАЕМОГО БЕЗ АЛИБИ</span>;
        if (step === 2) return <span className="text-blue-400 font-bold">ЗАДЕРЖАНИЕ: ПОДТВЕРДИТЕ АРЕСТ УБИЙЦЫ</span>;
        if (step === 3) return <span className="text-cyan-400 font-bold">ЭВАКУАЦИЯ: ЗАЧИСТИТЕ МОСТОВУЮ ОТ ТЕЛ</span>;
        if (step === 4) return <span className="text-emerald-400 font-bold">СЕКТОР ЗАЧИЩЕН: ДЕТЕКТИВ ВЫПОЛНИЛ ДОЛГ</span>;
        break;
      case "THIEF_ROBBER":
        if (step === 1) return <span className="text-red-400 font-bold">РАЗВЕДКА: ВЫБЕРИТЕ СОСЕДА ДЛЯ КРАЖИ</span>;
        if (step === 2) return <span className="text-red-400 font-bold">ОГРАБЛЕНИЕ: ПОХИТЬТЕ СОКРОВИЩЕ БЕЗ ШУМА</span>;
        if (step === 3) return <span className="text-amber-400 font-bold">МАСКИРОВКА: СМЕНИТЕ ЛИЧНОСТЬ ИЗ РУКИ</span>;
        if (step === 4) return <span className="text-emerald-400 font-bold">ОПЕРАЦИЯ ЗАВЕРШЕНА: ПРИКРЫТИЕ СМЕНЕНО</span>;
        break;
      case "THIEF_POLICE":
        if (step === 1) return <span className="text-blue-400 font-bold">МЕСТО ПРЕСТУПЛЕНИЯ: ВЫБЕРИТЕ СОСЕДА ОГРАБЛЕННОГО</span>;
        if (step === 2) return <span className="text-blue-400 font-bold">КОРДОН: ВЫЗОВИТЕ ПАТРУЛЬНУЮ ГРУППУ</span>;
        if (step === 3) return <span className="text-emerald-400 font-bold">ЗАДЕРЖАНИЕ: АРЕСТУЙТЕ ГРАБИТЕЛЯ</span>;
        break;
      case "SECRET_SERVICE":
        if (step === 1) return <span className="text-blue-400 font-bold">РАДИОСВЯЗЬ: ВЫБЕРИТЕ ОЧЕВИДЦА В СЕКТОРЕ</span>;
        if (step === 2) return <span className="text-cyan-400 font-bold">СКАНИРОВАНИЕ: ПРОВЕДИТЕ ОПРОС РАДАРОМ</span>;
        if (step === 3) return <span className="text-red-400 font-bold">КОНТАКТ: ВЫБЕРИТЕ ВРАЖЕСКОГО РЕЗИДЕНТА</span>;
        if (step === 4) return <span className="text-emerald-400 font-bold">ТРОФЕЙ: РАЗОБЛАЧИТЕ ШПИОНА (1/3)</span>;
        break;
      case "LINE_UP":
        if (step === 1) return <span className="text-cyan-400 font-bold">ОПРОС: ЗАДАЙТЕ ВОПРОС О ПРИМЕТАХ</span>;
        if (step === 2) return <span className="text-emerald-400 font-bold">ОТВЕТ: «ДА, ЕСТЬ ГОЛОВНОЙ УБОР»</span>;
        if (step === 3) return <span className="text-blue-400 font-bold">ИСКЛЮЧЕНИЕ: ВЫБЕРИТЕ ФИГУРАНТА БЕЗ АЛИБИ</span>;
        if (step === 4) return <span className="text-red-400 font-bold">ВЕРДИКТ: ПОДТВЕРДИТЕ ФИНАЛЬНОЕ ОБВИНЕНИЕ</span>;
        if (step === 5) return <span className="text-emerald-400 font-bold">ДЕЛО ЗАКРЫТО: ПОДОЗРЕВАЕМЫЙ ИЗОБЛИЧЕН</span>;
        break;
    }
    return <span className="text-zinc-500 font-bold">ОЖИДАНИЕ...</span>;
  };

  const startModule = (mod: TutorialModule) => {
    setCurrentModule(mod);
    setStep(1);
    const initialB = getInitialBoard(mod);
    setBoard(initialB);
    setLastShift(null);
    setSelectedId(null);
    setInterrogatedTargetId(null);
    setScanResult(null);
    setIsDisguiseModalOpen(false);
    setNewDisguiseChar(null);
    if (mod === "THIEF_ROBBER") {
      setThiefSecretId(initialB[2][2].id);
    } else {
      setThiefSecretId(null);
    }
    if (mod === "MANIAC_KILLER") {
      setManiacSecretId(initialB[2][1].id);
    } else {
      setManiacSecretId(null);
    }
  };

  // Жесткая блокировка нецелевых кликов (Input Guarding)
  const handleSelectCharacter = (id: string) => {
    if (currentModule === "BASICS") {
      if (step === 2 && adjacentIds.includes(id)) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(3);
      }
    } else if (currentModule === "MANIAC_KILLER") {
      if (step === 2 && id === targetVictimId && adjacentIds.includes(id)) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(3);
      }
    } else if (currentModule === "MANIAC_DETECTIVE") {
      if (step === 1 && id === detectiveSuspectId) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(2);
      }
    } else if (currentModule === "THIEF_ROBBER") {
      if (step === 1 && adjacentIds.includes(id)) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(2);
      }
    } else if (currentModule === "THIEF_POLICE") {
      if (step === 1 && id === policeSuspectId) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(2);
      }
    } else if (currentModule === "SECRET_SERVICE") {
      if (step === 1 && adjacentIds.includes(id)) {
        triggerHaptic("light");
        setSelectedId(id);
        setScanResult(null);
        setStep(2);
      } else if (step === 3 && id === spyEnemyId) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(4);
      }
    } else if (currentModule === "LINE_UP") {
      if (step === 3 && id === "c1") {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(4);
      }
    }
  };

  // Жесткая блокировка нецелевых сдвигов (Input Guarding)
  const handleShift = (
    type: "ROW" | "COL",
    index: number,
    direction: "FORWARD" | "BACKWARD"
  ) => {
    if (
      currentModule === "BASICS" &&
      step === 1 &&
      type === "ROW" &&
      index === 2 &&
      direction === "BACKWARD"
    ) {
      const newBoard = shiftBoard(board, type, index, direction);
      setBoard(newBoard);
      setLastShift({ type, index, direction });
      soundManager.play("slide");
      triggerHaptic("medium");
      setStep(2);
      setSelectedId(null);
    } else if (
      currentModule === "MANIAC_KILLER" &&
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
      setSelectedId(null);
    }
  };

  const handleKill = () => {
    if (currentModule === "MANIAC_KILLER" && step === 3 && selectedId === targetVictimId) {
      const newBoard = board.map((row) =>
        row.map((c) => (c.id === targetVictimId ? { ...c, isAlive: false } : c))
      );
      setBoard(newBoard);
      soundManager.play("kill");
      triggerHaptic("heavy");
      setStep(4);
      setSelectedId(null);
    }
  };

  const handleEscape = () => {
    if (currentModule === "MANIAC_KILLER" && step === 4) {
      triggerHaptic("medium");
      soundManager.play("disguise");
      const targetMaskChar = board[3][3];
      setNewDisguiseChar(targetMaskChar);
      setIsDisguiseModalOpen(true);
    }
  };

  const handleArrest = () => {
    if (currentModule === "MANIAC_DETECTIVE" && step === 2 && selectedId) {
      const targetId = selectedId;
      const newBoard = board.map((row) =>
        row.map((c) => (c.id === targetId ? ({ ...c, isAlive: false, isArrested: true } as any) : c))
      );
      setBoard(newBoard);
      soundManager.play("arrest");
      triggerHaptic("success");
      setStep(3);
      setSelectedId(null);
    }
  };

  const handleCleanup = () => {
    if (currentModule === "MANIAC_DETECTIVE" && step === 3) {
      triggerHaptic("medium");
      soundManager.play("slide");
      const living = board.flat().filter((c) => c.isAlive);
      const dead = board.flat().filter((c) => !c.isAlive);
      const reordered = [...living, ...dead];
      const newBoard: Character[][] = [];
      for (let i = 0; i < 5; i++) {
        newBoard.push(reordered.slice(i * 5, i * 5 + 5));
      }
      setBoard(newBoard);
      setStep(4);
    }
  };

  const handleRob = () => {
    if (currentModule === "THIEF_ROBBER" && step === 2 && selectedId) {
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
    if (currentModule === "THIEF_ROBBER" && step === 3) {
      soundManager.play("disguise");
      triggerHaptic("medium");
      const targetMaskChar = board[1][1];
      setNewDisguiseChar(targetMaskChar);
      setIsDisguiseModalOpen(true);
    }
  };

  const handleConfirmDisguise = () => {
    if (newDisguiseChar) {
      if (currentModule === "THIEF_ROBBER") {
        setThiefSecretId(newDisguiseChar.id);
      } else if (currentModule === "MANIAC_KILLER") {
        setManiacSecretId(newDisguiseChar.id);
      }
    }
    setIsDisguiseModalOpen(false);
    if (currentModule === "MANIAC_KILLER") setStep(5);
    if (currentModule === "THIEF_ROBBER") setStep(4);
  };

  const handlePoliceBlock = () => {
    if (currentModule === "THIEF_POLICE" && step === 2) {
      soundManager.play("radar");
      triggerHaptic("medium");
      setStep(3);
    }
  };

  const handlePoliceArrest = () => {
    if (currentModule === "THIEF_POLICE" && step === 3 && selectedId) {
      const targetId = selectedId;
      const newBoard = board.map((row) =>
        row.map((c) => (c.id === targetId ? ({ ...c, isAlive: false, isArrested: true } as any) : c))
      );
      setBoard(newBoard);
      soundManager.play("arrest");
      triggerHaptic("success");
      markModuleCompleted("THIEF_POLICE");
      setCurrentModule("MENU");
    }
  };

  const handleInterrogate = () => {
    if (currentModule === "SECRET_SERVICE" && step === 2 && selectedId) {
      soundManager.play("radar");
      triggerHaptic("light");
      setInterrogatedTargetId(selectedId);
      setScanResult("NEAR");
      setStep(3);
      setSelectedId(null);
    }
  };

  const handleCaptureSpy = () => {
    if (currentModule === "SECRET_SERVICE" && step === 4 && selectedId === spyEnemyId) {
      const newBoard = board.map((row) =>
        row.map((c) => (c.id === spyEnemyId ? { ...c, isAlive: false, unmaskedSpyIndex: 0 } : c))
      );
      setBoard(newBoard);
      soundManager.play("arrest");
      triggerHaptic("success");
      markModuleCompleted("SECRET_SERVICE");
      setCurrentModule("MENU");
    }
  };

  const handleAskQuestionDuel = () => {
    if (currentModule === "LINE_UP" && step === 1) {
      soundManager.play("radar");
      triggerHaptic("medium");
      setStep(2);
    }
  };

  const handleEliminateDuel = () => {
    if (currentModule === "LINE_UP" && step === 2) {
      soundManager.play("slide");
      triggerHaptic("medium");
      const newBoard = board.map((row) =>
        row.map((c) => (c.id !== "c1" ? { ...c, isExonerated: true } : c))
      );
      setBoard(newBoard);
      setStep(3);
    }
  };

  const handleAccuseDuel = () => {
    if (currentModule === "LINE_UP" && step === 4 && selectedId === "c1") {
      const newBoard = board.map((row) =>
        row.map((c) => (c.id === "c1" ? ({ ...c, isAlive: false, isArrested: true } as any) : c))
      );
      setBoard(newBoard);
      soundManager.play("arrest");
      triggerHaptic("success");
      setStep(5);
      setSelectedId(null);
    }
  };

  if (currentModule === "MENU") {
    return (
      <div className="fixed inset-0 z-[100] bg-[#080a0f] flex justify-center overflow-hidden font-sans select-none text-zinc-100 h-full w-full">
        <div className="w-full max-w-lg md:max-w-2xl mx-auto h-full flex flex-col justify-between relative overflow-hidden bg-[#080a0f] md:border-x md:border-white/10 shadow-2xl">
          <div className="flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-white/10 bg-[#080a0f]">
            <button
              onClick={onExit}
              className="text-zinc-400 hover:text-white transition cursor-pointer text-xs font-black uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/10"
            >
              ✕ В меню
            </button>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest">Академия</span>
              <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">Каталог дел</h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-zinc-400">
                Пройдено: <b className="text-blue-400">{completedModules.length}</b>/7
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar">
            {/* 1. BASICS */}
            <div
              onClick={() => startModule("BASICS")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("BASICS")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-blue-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Основы Син-Сити: Механика кварталов</h3>
                {completedModules.includes("BASICS") && (
                  <span className="text-[9px] font-mono font-bold text-zinc-200 uppercase bg-zinc-900/80 px-2 py-0.5 rounded border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Базовые механики: циклический сдвиг рядов, радиус контакта 3×3 и правило Anti-Undo.</p>
            </div>

            {/* 2. MANIAC_KILLER */}
            <div
              onClick={() => startModule("MANIAC_KILLER")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("MANIAC_KILLER")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-red-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Почерк убийцы: Контракт синдиката (Убийца)</h3>
                {completedModules.includes("MANIAC_KILLER") && (
                  <span className="text-[9px] font-mono font-bold text-zinc-200 uppercase bg-zinc-900/80 px-2 py-0.5 rounded border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Тактика охоты: подвод жертвы, ликвидация строго по очереди целей и конспиративный побег.</p>
            </div>

            {/* 3. MANIAC_DETECTIVE */}
            <div
              onClick={() => startModule("MANIAC_DETECTIVE")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("MANIAC_DETECTIVE")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-blue-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Почерк убийцы: Логика алиби (Детектив)</h3>
                {completedModules.includes("MANIAC_DETECTIVE") && (
                  <span className="text-[9px] font-mono font-bold text-zinc-200 uppercase bg-zinc-900/80 px-2 py-0.5 rounded border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Методика расследования: анализ слышимости выстрела 3×3, отсечение невиновных, задержание и зачистка.</p>
            </div>

            {/* 4. THIEF_ROBBER */}
            <div
              onClick={() => startModule("THIEF_ROBBER")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("THIEF_ROBBER")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-red-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Оцепление: Карманная кража (Вор)</h3>
                {completedModules.includes("THIEF_ROBBER") && (
                  <span className="text-[9px] font-mono font-bold text-zinc-200 uppercase bg-zinc-900/80 px-2 py-0.5 rounded border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Бесшумные кражи сокровищ без ликвидаций и оперативная смена маски из руки.</p>
            </div>

            {/* 5. THIEF_POLICE */}
            <div
              onClick={() => startModule("THIEF_POLICE")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("THIEF_POLICE")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-blue-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Оцепление: Патрульный кордон (Полиция)</h3>
                {completedModules.includes("THIEF_POLICE") && (
                  <span className="text-[9px] font-mono font-bold text-zinc-200 uppercase bg-zinc-900/80 px-2 py-0.5 rounded border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Патрулирование: локализация ограбленного жителя, блокировка сектора и арест с поличным.</p>
            </div>

            {/* 6. SECRET_SERVICE */}
            <div
              onClick={() => startModule("SECRET_SERVICE")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("SECRET_SERVICE")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-blue-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Директива Ноль: Радиоперехват (Агент)</h3>
                {completedModules.includes("SECRET_SERVICE") && (
                  <span className="text-[9px] font-mono font-bold text-zinc-200 uppercase bg-zinc-900/80 px-2 py-0.5 rounded border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Контрразведка: радиоопрос очевидцев радаром, разоблачение резидента и сбор компромата.</p>
            </div>

            {/* 7. LINE_UP */}
            <div
              onClick={() => startModule("LINE_UP")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("LINE_UP")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-cyan-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Очная ставка: Дуэль дедукции (Детектив)</h3>
                {completedModules.includes("LINE_UP") && (
                  <span className="text-[9px] font-mono font-bold text-zinc-200 uppercase bg-zinc-900/80 px-2 py-0.5 rounded border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Дедуктивная дуэль: опрос свидетелей по каталогу улик, отсечение непричастных и вынесение обвинения.</p>
            </div>
          </div>

          <div className="p-4 border-t border-white/10 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {isRewardClaimed ? (
              <button
                onClick={onExit}
                className="w-full h-12 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-300 font-black tracking-widest uppercase text-xs shadow-lg transition active:scale-98 cursor-pointer"
              >
                Завершить курс: пройдено (В меню)
              </button>
            ) : (
              <button
                data-testid="tutorial-main-action-btn"
                onClick={allModulesCompleted ? onFinish : onExit}
                className="w-full h-12 rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white font-black tracking-widest uppercase text-xs shadow-[0_0_20px_rgba(59,130,246,0.4)] transition active:scale-98 cursor-pointer"
              >
                {allModulesCompleted ? "Завершить курс (+250 CR)" : "В главное меню"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const getModuleTitle = () => {
    switch (currentModule) {
      case "BASICS": return "ОСНОВЫ СИН-СИТИ";
      case "MANIAC_KILLER": return "ПОЧЕРК УБИЙЦЫ: УБИЙЦА";
      case "MANIAC_DETECTIVE": return "ПОЧЕРК УБИЙЦЫ: ДЕТЕКТИВ";
      case "THIEF_ROBBER": return "ОЦЕПЛЕНИЕ: ВОР";
      case "THIEF_POLICE": return "ОЦЕПЛЕНИЕ: ПОЛИЦИЯ";
      case "SECRET_SERVICE": return "ДИРЕКТИВА НОЛЬ";
      case "LINE_UP": return "ОЧНАЯ СТАВКА";
      default: return "АКАДЕМИЯ";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#080a0f] flex justify-center overflow-hidden font-sans select-none text-zinc-100 h-full w-full">
      <style>{`
        .tutorial-highlight-l1s2 button[title*="Сдвиг влево"]:nth-of-type(3),
        .tutorial-highlight-maniac button[title*="Сдвиг вниз"]:nth-of-type(3) {
          position: relative; z-index: 30;
          box-shadow: 0 0 20px rgba(59,130,246,0.9) !important;
          border-color: #3b82f6 !important;
          background-color: rgba(59,130,246,0.3) !important;
          color: white !important;
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
        }
      `}</style>
      <div className="w-full max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto h-full flex flex-col justify-between relative overflow-hidden bg-[#080a0f] md:border-x md:border-white/10 shadow-2xl">
        <div className="w-full flex items-center justify-between px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 shrink-0 border-b border-white/10 bg-[#080a0f] z-20">
          <button onClick={() => setCurrentModule("MENU")} className="text-zinc-400 hover:text-white transition cursor-pointer text-xs font-black uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/10">
            ← К делам
          </button>
          <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase text-center flex-1">
            {getModuleTitle()}
          </h2>
          <div className="w-16 shrink-0" />
        </div>

        <div className="flex-1 w-full flex flex-col relative min-h-0 overflow-hidden">
          {/* Инструктивный блок: ЦЕЛЬ -> ДЕЙСТВИЕ -> РЕЗУЛЬТАТ */}
          <div className="min-h-[70px] md:min-h-[60px] max-h-[110px] shrink-0 py-1.5 px-4 flex flex-col justify-center items-center text-center z-10">
            <div>
              {/* 1. BASICS */}
              {currentModule === "BASICS" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-cyan-400 uppercase tracking-wider mb-0.5">Тороидальный сдвиг</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Освоить круговой сдвиг рядов по сетке 5×5.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите стрелку <b className="text-cyan-300">←</b> слева от 3-го ряда.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Ряд сдвинется влево, крайняя карта перейдет на противоположный край.</div>
                  </div>
                </div>
              )}
              {currentModule === "BASICS" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-cyan-400 uppercase tracking-wider mb-0.5">Сектор контакта 3×3</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Определить зону взаимодействия персонажа.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Выберите любого из 8 соседних жителей вокруг вашего агента.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Карта зафиксируется в прицеле. Взаимодействие доступно только в секторе 3×3.</div>
                  </div>
                </div>
              )}
              {currentModule === "BASICS" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Защита от отката (Anti-Undo)</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Запомнить правило блокировки обратного хода.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Обратный сдвиг того же ряда заблокирован. Нажмите кнопку завершения.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Базовые принципы сетки Син-Сити усвоены.</div>
                  </div>
                </div>
              )}

              {/* 2. MANIAC_KILLER */}
              {currentModule === "MANIAC_KILLER" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider mb-0.5">Охота: Подвод жертвы</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Подвести первую жертву контракта (Елену Соколову) в зону удара.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите стрелку <b className="text-cyan-300">↓</b> у 3-й колонки.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Жертва окажется в секторе 3×3 вокруг Убийцы.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_KILLER" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider mb-0.5">Охота: Захват цели</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Зафиксировать контрактную цель.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите на карточку Елены Соколовой (#03).</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Цель захвачена прицелом. В режиме Убийцы жертвы устраняются строго по очереди.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_KILLER" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider mb-0.5">Охота: Ликвидация цели</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Выполнить заказ синдиката.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Ликвидировать по заказу» внизу.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Жертва выбывает. Свидетели в секторе 3×3 слышат выстрел.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_KILLER" && step === 4 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Охота: Сброс хвоста (Побег)</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Уйти от облавы детектива.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Конспирация (Побег)» и примите новую маску.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Убийца меняет карту личности на новую из колоды.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_KILLER" && step === 5 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Охота: Побег успешен</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Завершить курс Убийцы.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Завершить модуль ➔».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Навык ликвидации по списку и побега освоен.</div>
                  </div>
                </div>
              )}

              {/* 3. MANIAC_DETECTIVE */}
              {currentModule === "MANIAC_DETECTIVE" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-blue-400 uppercase tracking-wider mb-0.5">Детектив: Анализ алиби</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Вычислить убийцу среди жителей в зоне выстрела.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Карты с синим щитом имеют алиби. Нажмите на фигуранта без алиби (#07).</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Единственный подозреваемый взят в разработку.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_DETECTIVE" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-blue-400 uppercase tracking-wider mb-0.5">Детектив: Задержание</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Обезвредить убийцу.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите кнопку «Задержание» внизу.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Преступник арестован по неопровержимым уликам.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_DETECTIVE" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-cyan-400 uppercase tracking-wider mb-0.5">Детектив: Зачистка улиц</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Освободить мостовую для патрулей.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Зачистить» для эвакуации тел.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Тела смещены к границам сетки, центр свободен.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_DETECTIVE" && step === 4 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Детектив: Дело закрыто</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Закрепить дедуктивный курс.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Завершить модуль ➔».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Вы освоили сужение круга по алиби и арест убийцы.</div>
                  </div>
                </div>
              )}

              {/* 4. THIEF_ROBBER */}
              {currentModule === "THIEF_ROBBER" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider mb-0.5">Вор: Выбор цели</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Найти жертву для кражи в радиусе 3×3.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Выберите любого соседнего жителя.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Цель выбрана для бесшумного ограбления без оружия.</div>
                  </div>
                </div>
              )}
              {currentModule === "THIEF_ROBBER" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider mb-0.5">Вор: Кража сокровища</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Похитить сокровище без ликвидации.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Кража сокровища» внизу.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Добыча получена (1/8). На карте появляется метка ограбления.</div>
                  </div>
                </div>
              )}
              {currentModule === "THIEF_ROBBER" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Вор: Смена маски</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Сбросить ориентировку патрулей.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Конспирация (Маска)» и подтвердите смену.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Личность изменена картой из руки. Вор снова в тени.</div>
                  </div>
                </div>
              )}
              {currentModule === "THIEF_ROBBER" && step === 4 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Вор: Операция завершена</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Зафиксировать курс Вора.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Завершить модуль ➔».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Механика кражи и маскировки усвоена.</div>
                  </div>
                </div>
              )}

              {/* 5. THIEF_POLICE */}
              {currentModule === "THIEF_POLICE" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-blue-400 uppercase tracking-wider mb-0.5">Полиция: Анализ места преступления</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Локализовать грабителя по оставленным следам.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Найдите ограбленную карту (с желтой меткой) и выберите соседа (#03).</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Подозрительный житель взят в разработку патрулем.</div>
                  </div>
                </div>
              )}
              {currentModule === "THIEF_POLICE" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-blue-400 uppercase tracking-wider mb-0.5">Полиция: Оцепление</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Перекрыть грабителю пути отхода.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Вызов патруля» внизу.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Сектор заблокирован кордоном.</div>
                  </div>
                </div>
              )}
              {currentModule === "THIEF_POLICE" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Полиция: Арест с поличным</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Задержать грабителя и вернуть ценности.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Арестовать вора».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Грабитель обезврежен, сокровища возвращены. Модуль сдан.</div>
                  </div>
                </div>
              )}

              {/* 6. SECRET_SERVICE */}
              {currentModule === "SECRET_SERVICE" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-blue-400 uppercase tracking-wider mb-0.5">Агент: Радиоперехват</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Выбрать очевидца в радиусе действия агента.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Выберите соседнего жителя для радиоопроса.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Очевидец готов дать показания по закрытому каналу.</div>
                  </div>
                </div>
              )}
              {currentModule === "SECRET_SERVICE" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-cyan-400 uppercase tracking-wider mb-0.5">Агент: Опрос радаром</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Просканировать сектор 3×3 на наличие резидента.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Опрос свидетелей» внизу.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Радар выдал: «ВРАГ РЯДОМ (ДА)».</div>
                  </div>
                </div>
              )}
              {currentModule === "SECRET_SERVICE" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider mb-0.5">Агент: Захват цели</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Локализовать вражеского резидента.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Выберите карточку выявленного шпиона (София Романова).</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Шпион захвачен в прицел контрразведки.</div>
                  </div>
                </div>
              )}
              {currentModule === "SECRET_SERVICE" && step === 4 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Агент: Разоблачение резидента</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Ликвидировать шпионскую ячейку.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Разоблачение шпиона».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Шпион арестован, получен трофей компромата (1/3). Модуль сдан.</div>
                  </div>
                </div>
              )}

              {/* 7. LINE_UP */}
              {currentModule === "LINE_UP" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-cyan-400 uppercase tracking-wider mb-0.5">Очная ставка: Каталог улик</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Запросить приметы подозреваемого у свидетеля.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите кнопку «Задать вопрос: Головной убор?».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Свидетель подтверждает: «ДА, ЕСТЬ ГОЛОВНОЙ УБОР».</div>
                  </div>
                </div>
              )}
              {currentModule === "LINE_UP" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Очная ставка: Исключение непричастных</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Отсечь фигурантов без головного убора.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите кнопку «Исключить непричастных ➔».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Все лица без шляп и кепок получают алиби.</div>
                  </div>
                </div>
              )}
              {currentModule === "LINE_UP" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Очная ставка: Оставшийся фигурант</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Выбрать единственного подозреваемого без алиби.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите на карточку Руслана Громова (#01).</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Фигурант выбран для оглашения вердикта.</div>
                  </div>
                </div>
              )}
              {currentModule === "LINE_UP" && step === 4 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider mb-0.5">Очная ставка: Финальное обвинение</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Предъявить обвинение подозреваемому.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Вынести обвинение (Арест)».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Алиби сломано, подозреваемый арестован. Победа в дуэли.</div>
                  </div>
                </div>
              )}
              {currentModule === "LINE_UP" && step === 5 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Очная ставка: Победа в дуэли</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-blue-400">ЦЕЛЬ:</b> Зафиксировать сдачу дедуктивного курса.</div>
                    <div><b className="text-amber-400">ДЕЙСТВИЕ:</b> Нажмите «Завершить модуль ➔».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Модуль сдан. Полный курс Академии завершен!</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Статусная строка HUD */}
          <div className="h-7 md:h-8 px-4 w-full shrink-0 flex items-center justify-center bg-zinc-950/80 border-y border-white/5 shadow-sm z-10">
            <div className="text-[10px] md:text-xs tracking-widest uppercase font-mono text-center leading-tight flex flex-wrap justify-center items-center">
              {getHudStatus()}
            </div>
          </div>

          {/* Игровое поле GameBoard */}
          <div className={`relative z-10 w-full h-full flex-1 min-h-0 max-h-full flex items-center justify-center my-auto py-1 md:py-3 px-2 overflow-hidden ${
            currentModule === "BASICS" && step === 1 ? "tutorial-highlight-l1s2" : ""
          } ${currentModule === "MANIAC_KILLER" && step === 1 ? "tutorial-highlight-maniac" : ""}`}>
            <GameBoard
              mode={
                currentModule === "THIEF_ROBBER" || currentModule === "THIEF_POLICE"
                  ? "THIEF_HUNT"
                  : currentModule === "SECRET_SERVICE"
                  ? "SECRET_SERVICE"
                  : currentModule === "LINE_UP"
                  ? "LINE_UP"
                  : "MANIAC_VS_OPERATIVE"
              }
              board={board}
              selectedCharacterId={selectedId}
              killerAdjacentIds={adjacentIds}
              detectiveAdjacentIds={adjacentIds}
              showKillerHints={
                (currentModule === "BASICS" && step === 2) ||
                (currentModule === "MANIAC_KILLER" && step === 2) ||
                (currentModule === "THIEF_ROBBER" && step === 1) ||
                (currentModule === "SECRET_SERVICE" && step === 1) ||
                (currentModule === "LINE_UP" && step === 3)
              }
              showDetectiveHints={false}
              targetVictimId={currentModule === "MANIAC_KILLER" ? targetVictimId : null}
              radarTargetId={radarTargetId}
              radarCellIds={radarCellIds}
              radarColorClass={radarColorClass}
              lastShift={lastShift}
              myCharacterId={currentMyCharacterId}
              myRoleColor={tutorialMyRoleColor}
              onShift={handleShift}
              onSelectCharacter={handleSelectCharacter}
              blockedShift={null}
            />
          </div>

          {/* Нижняя панель действий */}
          <div className="h-14 md:h-16 shrink-0 w-full flex items-center justify-center px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#080a0f] border-t border-white/5 z-20">
            <AnimatePresence mode="wait">
              {/* 1. BASICS */}
              {currentModule === "BASICS" && step === 3 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("BASICS");
                    setCurrentModule("MENU");
                  }}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {/* 2. MANIAC_KILLER */}
              {currentModule === "MANIAC_KILLER" && step === 3 && (
                <motion.button onClick={handleKill} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">Ликвидировать по заказу</motion.button>
              )}
              {currentModule === "MANIAC_KILLER" && step === 4 && (
                <motion.button onClick={handleEscape} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">Конспирация (Побег)</motion.button>
              )}
              {currentModule === "MANIAC_KILLER" && step === 5 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("MANIAC_KILLER");
                    setCurrentModule("MENU");
                  }}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {/* 3. MANIAC_DETECTIVE */}
              {currentModule === "MANIAC_DETECTIVE" && step === 2 && (
                <motion.button onClick={handleArrest} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Задержание</motion.button>
              )}
              {currentModule === "MANIAC_DETECTIVE" && step === 3 && (
                <motion.button onClick={handleCleanup} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Зачистить</motion.button>
              )}
              {currentModule === "MANIAC_DETECTIVE" && step === 4 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("MANIAC_DETECTIVE");
                    setCurrentModule("MENU");
                  }}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {/* 4. THIEF_ROBBER */}
              {currentModule === "THIEF_ROBBER" && step === 2 && (
                <motion.button onClick={handleRob} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">Кража сокровища</motion.button>
              )}
              {currentModule === "THIEF_ROBBER" && step === 3 && (
                <motion.button onClick={handleFastDisguise} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">Конспирация (Маска)</motion.button>
              )}
              {currentModule === "THIEF_ROBBER" && step === 4 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("THIEF_ROBBER");
                    setCurrentModule("MENU");
                  }}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {/* 5. THIEF_POLICE */}
              {currentModule === "THIEF_POLICE" && step === 2 && (
                <motion.button onClick={handlePoliceBlock} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Вызов патруля</motion.button>
              )}
              {currentModule === "THIEF_POLICE" && step === 3 && (
                <motion.button onClick={handlePoliceArrest} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Арестовать вора</motion.button>
              )}

              {/* 6. SECRET_SERVICE */}
              {currentModule === "SECRET_SERVICE" && step === 2 && Boolean(selectedId) && (
                <motion.button onClick={handleInterrogate} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Опрос свидетелей</motion.button>
              )}
              {currentModule === "SECRET_SERVICE" && step === 4 && (
                <motion.button onClick={handleCaptureSpy} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Разоблачение шпиона</motion.button>
              )}

              {/* 7. LINE_UP */}
              {currentModule === "LINE_UP" && step === 1 && (
                <motion.button onClick={handleAskQuestionDuel} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer">Задать вопрос: Головной убор?</motion.button>
              )}
              {currentModule === "LINE_UP" && step === 2 && (
                <motion.button onClick={handleEliminateDuel} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Исключить непричастных ➔</motion.button>
              )}
              {currentModule === "LINE_UP" && step === 4 && (
                <motion.button onClick={handleAccuseDuel} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">Вынести обвинение (Арест)</motion.button>
              )}
              {currentModule === "LINE_UP" && step === 5 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("LINE_UP");
                    setCurrentModule("MENU");
                  }}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Модальное окно смены маски/прикрытия */}
        {isDisguiseModalOpen && newDisguiseChar && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
            <div className="w-full max-w-sm bg-zinc-950/85 backdrop-blur-xl border border-red-500/50 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(220,38,38,0.3)] flex flex-col items-center">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-1">
                Конспирация успешна
              </span>
              <h3 className="text-xl font-black text-zinc-100 mb-2">
                Ваша новая личность:
              </h3>
              {(() => {
                const img = characterImages[`../assets/characters/${newDisguiseChar.id}.webp`]?.default;
                return (
                  <div
                    className="relative w-full h-44 rounded-2xl overflow-hidden border border-zinc-700 my-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] cursor-pointer group"
                    onClick={() => img && setFullscreenImage({ url: img, name: newDisguiseChar.name, id: newDisguiseChar.id })}
                  >
                    {img ? (
                      <img src={img} alt={newDisguiseChar.name} className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-zinc-500">Нет фото</div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-3 pt-12 flex flex-col items-center">
                      <span className="text-[10px] font-mono text-zinc-400 mb-0.5">#{newDisguiseChar.id.replace("c", "").padStart(2, "0")}</span>
                      <span className="text-xl font-black text-zinc-100 uppercase tracking-wider leading-tight text-center mb-1">
                        {newDisguiseChar.name}
                      </span>
                      <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded-full border border-white/10">
                        Тапните для полного фото
                      </span>
                    </div>
                  </div>
                );
              })()}
              <button onClick={handleConfirmDisguise} className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black uppercase tracking-wider text-xs rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.4)] active:scale-95">
                Принять личность ➔
              </button>
            </div>
          </div>
        )}

        {/* Полноэкранный просмотр досье */}
        {fullscreenImage && (
          <div className="fixed inset-0 z-[130] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 select-none" onClick={() => setFullscreenImage(null)}>
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-6 right-6 w-10 h-10 bg-zinc-900/80 border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer z-10"
            >
              ✕
            </button>
            <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]" onClick={(e) => e.stopPropagation()}>
              <img src={fullscreenImage.url} alt={fullscreenImage.name} className="w-full h-full object-cover grayscale contrast-125" />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-6 pt-20 flex flex-col items-center text-center">
                <span className="text-xs font-mono text-zinc-400 mb-2">#{fullscreenImage.id.replace("c", "").padStart(2, "0")}</span>
                <h2 className="text-3xl font-black text-zinc-100 uppercase tracking-wider leading-tight">{fullscreenImage.name}</h2>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
