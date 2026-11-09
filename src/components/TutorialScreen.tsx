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

const getInitialBoard = (module: TutorialModule): Character[][] => {
  const chars = ALL_CHARACTERS.slice(0, 25).map((c) => ({
    ...c,
    isAlive: true,
    isExonerated: false,
    isRobbed: false,
  }));

  if (module === "LINE_UP") {
    // Гарантируем, что Руслан Громов (c1) находится в центре [2][2] (индекс 12)
    const c1Index = chars.findIndex((c) => c.id === "c1");
    if (c1Index !== -1 && c1Index !== 12) {
      const temp = chars[12];
      chars[12] = chars[c1Index];
      chars[c1Index] = temp;
    }
  } else if (module === "MANIAC_KILLER") {
    // Елена Соколова (c3) ставится в верхний ряд [0][2] (индекс 2), чтобы при сдвиге колонки 2 вниз войти в сектор убийцы
    const elenaIndex = chars.findIndex((c) => c.id === "c3");
    if (elenaIndex !== -1 && elenaIndex !== 2) {
      const temp = chars[2];
      chars[2] = chars[elenaIndex];
      chars[elenaIndex] = temp;
    }
  } else if (module === "MANIAC_DETECTIVE") {
    // В [3][3] жертва, соседи со щитом (алиби), подозреваемый без щита в [1][1] (индекс 6)
    chars[7].isExonerated = true;
    chars[11].isExonerated = true;
    chars[18].isAlive = false;
  } else if (module === "THIEF_POLICE") {
    chars[7].isRobbed = true;
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

  // Идентификаторы ключевых NPC для каждого сценария
  const targetVictimId = "c3"; // Елена Соколова
  const detectiveSuspectId = board[1]?.[1]?.id;
  const policeSuspectId = board[0]?.[2]?.id;
  const spyEnemyId = board[1]?.[1]?.id;

  const tutorialMyRoleColor = useMemo<"red" | "blue">(() => {
    if (currentModule === "MANIAC_KILLER" || currentModule === "THIEF_ROBBER") {
      return "red";
    }
    return "blue";
  }, [currentModule]);

  const currentMyCharacterId = useMemo(() => {
    if (currentModule === "BASICS") return board[2]?.[2]?.id || null;
    if (currentModule === "MANIAC_KILLER") return maniacSecretId || board[2]?.[1]?.id;
    if (currentModule === "MANIAC_DETECTIVE") return board[2]?.[2]?.id;
    if (currentModule === "THIEF_ROBBER") return thiefSecretId || board[2]?.[2]?.id;
    if (currentModule === "THIEF_POLICE") return board[2]?.[2]?.id;
    if (currentModule === "SECRET_SERVICE") return board[2]?.[2]?.id;
    if (currentModule === "LINE_UP") return null;
    return null;
  }, [currentModule, board, maniacSecretId, thiefSecretId]);

  const adjacentIds = useMemo(() => {
    if (!currentMyCharacterId) return [];
    return getAdjacentCharacters(board, currentMyCharacterId).map((c) => c.id);
  }, [board, currentMyCharacterId]);

  const { radarTargetId, radarCellIds, radarColorClass } = useMemo(() => {
    const tacticalRadarClass = "border-amber-500 ring-2 ring-amber-500/70";
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
            : "border-amber-500 ring-2 ring-amber-500/80",
      };
    }
    return {
      radarTargetId: null,
      radarCellIds: [] as string[],
      radarColorClass: null,
    };
  }, [currentModule, step, interrogatedTargetId, scanResult, board]);

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

  // Аппаратная защита ввода: клик по карточке разрешен ТОЛЬКО на шагах, где требуется выбор цели
  const handleSelectCharacter = (id: string) => {
    // BASICS: клик разрешен только на шаге 2 для выбора соседа в радиусе 3x3
    if (currentModule === "BASICS") {
      if (step === 2 && adjacentIds.includes(id)) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(3);
      }
      return;
    }

    // MANIAC_KILLER: выбор цели только на шаге 2 (строго Елена Соколова в радиусе 3x3)
    if (currentModule === "MANIAC_KILLER") {
      if (step === 2 && id === targetVictimId && adjacentIds.includes(id)) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(3);
      }
      return;
    }

    // MANIAC_DETECTIVE: выбор подозреваемого без щита только на шаге 1
    if (currentModule === "MANIAC_DETECTIVE") {
      if (step === 1 && id === detectiveSuspectId) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(2);
      }
      return;
    }

    // THIEF_ROBBER: выбор соседа для кражи только на шаге 1
    if (currentModule === "THIEF_ROBBER") {
      if (step === 1 && adjacentIds.includes(id)) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(2);
      }
      return;
    }

    // THIEF_POLICE: выбор подозреваемого рядом с жертвой только на шаге 1
    if (currentModule === "THIEF_POLICE") {
      if (step === 1 && id === policeSuspectId) {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(2);
      }
      return;
    }

    // SECRET_SERVICE: выбор очевидца на шаге 1; выбор шпиона на шаге 3
    if (currentModule === "SECRET_SERVICE") {
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
      return;
    }

    // LINE_UP: выбор единственного фигуранта без алиби (Руслан Громов) на шаге 3
    if (currentModule === "LINE_UP") {
      if (step === 3 && id === "c1") {
        triggerHaptic("light");
        setSelectedId(id);
        setStep(4);
      }
      return;
    }
  };

  // Аппаратная защита ввода: сдвиг разрешен ТОЛЬКО на шагах, обучающих сдвигу
  const handleShift = (
    type: "ROW" | "COL",
    index: number,
    direction: "FORWARD" | "BACKWARD"
  ) => {
    // BASICS: шаг 1 требует сдвига 3-го ряда влево (row index 2, direction BACKWARD)
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
      return;
    }

    // MANIAC_KILLER: шаг 1 требует сдвига 3-й колонки вниз (col index 2, direction FORWARD)
    if (
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
      return;
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

  // Механика зачистки: уплотнение поля со смещением выбывших персонажей строго ВНИЗ сетки
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

  const getHudStatus = () => {
    switch (currentModule) {
      case "BASICS":
        if (step === 1) return <span className="text-amber-400 font-bold">ОСНОВЫ: СДВИГ 3-ГО РЯДА ВЛЕВО (←)</span>;
        if (step === 2) return <span className="text-amber-400 font-bold">РАДИУС 3×3: ВЫБЕРИТЕ СОСЕДА</span>;
        if (step === 3) return <span className="text-emerald-400 font-bold">ANTI-UNDO: ОБРАТНЫЙ ХОД ЗАБЛОКИРОВАН</span>;
        break;
      case "MANIAC_KILLER":
        if (step === 1) return <span className="text-amber-400 font-bold">ОХОТА: СДВИНЬТЕ 3-Ю КОЛОНКУ ВНИЗ (↓)</span>;
        if (step === 2) return <span className="text-amber-400 font-bold">ЗАХВАТ ЦЕЛИ: ВЫБЕРИТЕ ЕЛЕНУ СОКОЛОВУ</span>;
        if (step === 3) return <span className="text-amber-400 font-bold">ЛИКВИДАЦИЯ: ПРОИЗВЕДИТЕ ВЫСТРЕЛ</span>;
        if (step === 4) return <span className="text-amber-400 font-bold">ПОБЕГ: СМЕНИТЕ ЛИЧНОСТЬ</span>;
        if (step === 5) return <span className="text-emerald-400 font-bold">КОНСПИРАЦИЯ УСПЕШНА</span>;
        break;
      case "MANIAC_DETECTIVE":
        if (step === 1) return <span className="text-amber-400 font-bold">АНАЛИЗ АЛИБИ: ВЫБЕРИТЕ ПОДОЗРЕВАЕМОГО БЕЗ ЩИТА</span>;
        if (step === 2) return <span className="text-amber-400 font-bold">ЗАДЕРЖАНИЕ: ПОДТВЕРДИТЕ АРЕСТ</span>;
        if (step === 3) return <span className="text-amber-400 font-bold">ЭВАКУАЦИЯ: ЗАЧИСТИТЕ МОСТОВУЮ ВНИЗ</span>;
        if (step === 4) return <span className="text-emerald-400 font-bold">ДЕЛО ЗАКРЫТО: СЕКТОР ЗАЧИЩЕН</span>;
        break;
      case "THIEF_ROBBER":
        if (step === 1) return <span className="text-amber-400 font-bold">ТЕНИ: ВЫБЕРИТЕ СОСЕДА ДЛЯ КРАЖИ</span>;
        if (step === 2) return <span className="text-amber-400 font-bold">ОГРАБЛЕНИЕ: СРЕЖЬТЕ КОШЕЛЕК БЕЗ ШУМА</span>;
        if (step === 3) return <span className="text-amber-400 font-bold">МАСКИРОВКА: СМЕНИТЕ ЛИЧНОСТЬ</span>;
        if (step === 4) return <span className="text-emerald-400 font-bold">СЛЕДЫ ЗАКРЫТЫ: ОПЕРАЦИЯ УСПЕШНА</span>;
        break;
      case "THIEF_POLICE":
        if (step === 1) return <span className="text-amber-400 font-bold">УЛИКИ: ВЫБЕРИТЕ СОСЕДА ОГРАБЛЕННОГО</span>;
        if (step === 2) return <span className="text-amber-400 font-bold">КОРДОН: ВЫЗОВИТЕ ПАТРУЛЬНУЮ ГРУППУ</span>;
        if (step === 3) return <span className="text-emerald-400 font-bold">ПЕРЕХВАТ: АРЕСТУЙТЕ ГРАБИТЕЛЯ</span>;
        break;
      case "SECRET_SERVICE":
        if (step === 1) return <span className="text-amber-400 font-bold">ЭФИР: ВЫБЕРИТЕ ОЧЕВИДЦА РЯДОМ</span>;
        if (step === 2) return <span className="text-amber-400 font-bold">СКАНИРОВАНИЕ: ПРОВЕДИТЕ РАДИООПРОС</span>;
        if (step === 3) return <span className="text-amber-400 font-bold">КОНТАКТ: ЗАХВАТИТЕ ВРАЖЕСКОГО АГЕНТА</span>;
        if (step === 4) return <span className="text-emerald-400 font-bold">ТРОФЕЙ: РАЗОБЛАЧИТЕ ШПИОНА</span>;
        break;
      case "LINE_UP":
        if (step === 1) return <span className="text-amber-400 font-bold">ДОПРОСНАЯ: УТОЧНИТЕ ПРИМЕТЫ У СВИДЕТЕЛЯ</span>;
        if (step === 2) return <span className="text-amber-400 font-bold">ОТВЕТ: «ДА, ЕСТЬ ГОЛОВНОЙ УБОР»</span>;
        if (step === 3) return <span className="text-amber-400 font-bold">ИСКЛЮЧЕНИЕ: ВЫБЕРИТЕ ЕДИНСТВЕННОГО БЕЗ АЛИБИ</span>;
        if (step === 4) return <span className="text-amber-400 font-bold">ВЕРДИКТ: ВЫНЕСИТЕ РЕШАЮЩЕЕ ОБВИНЕНИЕ</span>;
        if (step === 5) return <span className="text-emerald-400 font-bold">СУД: ПОДОЗРЕВАЕМЫЙ ИЗОБЛИЧЕН</span>;
        break;
    }
    return <span className="text-zinc-500 font-bold">ОЖИДАНИЕ...</span>;
  };

  const getModuleTitle = () => {
    switch (currentModule) {
      case "BASICS": return "ОСНОВЫ THE WICKED CITY";
      case "MANIAC_KILLER": return "КОНТРАКТ: УБИЙЦА";
      case "MANIAC_DETECTIVE": return "ЗАЧИСТКА: ДЕТЕКТИВ";
      case "THIEF_ROBBER": return "ТЕНИ: ВОР";
      case "THIEF_POLICE": return "КОРДОН: ПОЛИЦИЯ";
      case "SECRET_SERVICE": return "ПЕРЕХВАТ: АГЕНТ";
      case "LINE_UP": return "ОЧНАЯ СТАВКА";
      default: return "АКАДЕМИЯ";
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
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Академия</span>
              <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">Архив The Wicked City</h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-zinc-400">
                Пройдено: <b className="text-emerald-400">{completedModules.length}</b>/7
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
                  : "bg-zinc-900/60 border-white/10 hover:border-emerald-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Основы The Wicked City</h3>
                {completedModules.includes("BASICS") && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Первые шаги: тороидальный сдвиг улиц, работа в радиусе 3×3 и жесткое правило Anti-Undo.</p>
            </div>

            {/* 2. MANIAC_KILLER */}
            <div
              onClick={() => startModule("MANIAC_KILLER")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("MANIAC_KILLER")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-amber-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Синдикат (Охота: Убийца)</h3>
                {completedModules.includes("MANIAC_KILLER") && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Работа по контракту. Подведите жертву, нажмите на курок и растворитесь в толпе с новой личностью.</p>
            </div>

            {/* 3. MANIAC_DETECTIVE */}
            <div
              onClick={() => startModule("MANIAC_DETECTIVE")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("MANIAC_DETECTIVE")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-emerald-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Зачистка (Охота: Детектив)</h3>
                {completedModules.includes("MANIAC_DETECTIVE") && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Вычисление убийцы по алиби, жесткое задержание и зачистка сетки (мертвые уходят вниз).</p>
            </div>

            {/* 4. THIEF_ROBBER */}
            <div
              onClick={() => startModule("THIEF_ROBBER")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("THIEF_ROBBER")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-amber-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Тени (Ограбление: Вор)</h3>
                {completedModules.includes("THIEF_ROBBER") && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Тихая работа. Изъятие сокровищ у соседей и мгновенная смена маски из резерва.</p>
            </div>

            {/* 5. THIEF_POLICE */}
            <div
              onClick={() => startModule("THIEF_POLICE")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("THIEF_POLICE")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-emerald-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Кордон (Ограбление: Полиция)</h3>
                {completedModules.includes("THIEF_POLICE") && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Поиск подозреваемого рядом с жертвой, блокировка района патрулями и задержание.</p>
            </div>

            {/* 6. SECRET_SERVICE */}
            <div
              onClick={() => startModule("SECRET_SERVICE")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("SECRET_SERVICE")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-emerald-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Перехват (Контрразведка)</h3>
                {completedModules.includes("SECRET_SERVICE") && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Опрос очевидцев в секторе, сканирование радаром и разоблачение вражеского резидента.</p>
            </div>

            {/* 7. LINE_UP */}
            <div
              onClick={() => startModule("LINE_UP")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("LINE_UP")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-emerald-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Допросная (Очная ставка)</h3>
                {completedModules.includes("LINE_UP") && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Дедуктивная дуэль на истощение. Выявление улик, отсечение ложных следов и финальный вердикт.</p>
            </div>
          </div>

          <div className="p-4 border-t border-white/10 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {isRewardClaimed ? (
              <button
                onClick={onExit}
                className="w-full h-12 rounded-full bg-zinc-900/80 border border-emerald-500/30 text-emerald-400 font-black tracking-widest uppercase text-xs shadow-[0_0_15px_rgba(16,185,129,0.2)] transition active:scale-98 cursor-pointer"
              >
                Курс пройден (В меню)
              </button>
            ) : (
              <button
                data-testid="tutorial-main-action-btn"
                onClick={allModulesCompleted ? onFinish : onExit}
                className={`w-full h-12 rounded-full font-black tracking-widest uppercase text-xs transition active:scale-98 cursor-pointer ${
                  allModulesCompleted 
                    ? "bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-500"
                    : "bg-zinc-800 text-zinc-300 border border-white/10 hover:bg-zinc-700"
                }`}
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
    <div className="fixed inset-0 z-[100] bg-[#080a0f] flex justify-center overflow-hidden font-sans select-none text-zinc-100 h-full w-full">
      <style>{`
        .tutorial-highlight-l1s2 button[title*="Сдвиг влево"]:nth-of-type(3),
        .tutorial-highlight-maniac button[title*="Сдвиг вниз"]:nth-of-type(3) {
          position: relative; z-index: 30;
          box-shadow: 0 0 20px rgba(245,158,11,0.9) !important;
          border-color: #f59e0b !important;
          background-color: rgba(245,158,11,0.3) !important;
          color: white !important;
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
        }
      `}</style>
      <div className="w-full max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto h-full flex flex-col justify-between relative overflow-hidden bg-[#080a0f] md:border-x md:border-white/10 shadow-2xl">
        <div className="w-full flex items-center justify-between px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 shrink-0 border-b border-white/10 bg-[#080a0f] z-20">
          <button onClick={() => setCurrentModule("MENU")} className="text-zinc-400 hover:text-white transition cursor-pointer text-xs font-black uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/10">
            ← В архив
          </button>
          <h2 className="text-sm font-black tracking-widest text-emerald-400 uppercase text-center flex-1 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
            {getModuleTitle()}
          </h2>
          <div className="w-16 shrink-0" />
        </div>

        <div className="flex-1 w-full flex flex-col relative min-h-0 overflow-hidden">
          {/* Инструктивный блок с нео-нуарным лором The Wicked City */}
          <div className="min-h-[70px] md:min-h-[60px] max-h-[110px] shrink-0 py-1.5 px-4 flex flex-col justify-center items-center text-center z-10 bg-zinc-900/30">
            <div>
              {/* 1. BASICS */}
              {currentModule === "BASICS" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Механика кварталов</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Добро пожаловать в The Wicked City. Улицы здесь постоянно меняются.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите стрелку <b className="text-emerald-400">←</b> слева от 3-го ряда.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Ряд смещен. Крайний житель вернулся с противоположной стороны.</div>
                  </div>
                </div>
              )}
              {currentModule === "BASICS" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Зона контроля 3×3</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> В этом городе доверять можно лишь тем, кто на расстоянии вытянутой руки.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Выберите любого соседа в радиусе 3×3 вокруг вашей карты.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Цель в прицеле. Взаимодействия за пределами 3×3 невозможны.</div>
                  </div>
                </div>
              )}
              {currentModule === "BASICS" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Правило Anti-Undo</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Улицы не прощают сомнений. Отменить ход оппонента нельзя.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Обратный сдвиг заблокирован. Завершите первый модуль.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Базовые законы The Wicked City усвоены.</div>
                  </div>
                </div>
              )}

              {/* 2. MANIAC_KILLER */}
              {currentModule === "MANIAC_KILLER" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Охота: Подвод жертвы</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Синдикат ждет смерти Елены Соколовой. Она должна войти в ваш сектор 3×3.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Сдвиньте 3-ю колонку <b className="text-emerald-400">↓</b> вниз.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Жертва загнана в ловушку.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_KILLER" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Охота: Захват цели</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Не делайте резких движений. Убедитесь, что это она.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите на карточку Елены Соколовой (#03).</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Жертва в прицеле. Выстрел готов.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_KILLER" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Охота: Ликвидация</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Пора отрабатывать гонорар синдиката.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Ликвидировать по заказу».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Выстрел эхом разнесся по кварталу. Детектив идет по следу.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_KILLER" && step === 4 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Охота: Побег</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Полиция The Wicked City уже здесь. Растворитесь в тенях.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Активируйте «Конспирация (Побег)».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Вы сбрасываете старую маску.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_KILLER" && step === 5 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Конспирация успешна</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Новое лицо, чистая совесть.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Завершите модуль убийцы.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Навык ликвидации и маскировки отточен.</div>
                  </div>
                </div>
              )}

              {/* 3. MANIAC_DETECTIVE */}
              {currentModule === "MANIAC_DETECTIVE" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Детектив: Анализ алиби</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Выстрел в центре. Свидетели в зоне 3×3 с алиби отмечены синим щитом.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Найдите подозреваемого без щита (#07).</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Круг сузился. Убийца у вас на крючке.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_DETECTIVE" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Детектив: Арест</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Улики неопровержимы. Пора брать его жестко.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Задержание».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Преступник в наручниках. Вы спасли чью-то жизнь.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_DETECTIVE" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Детектив: Зачистка сетки</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Улицы завалены трупами. Нужно уплотнить зону.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Выполните действие «Зачистка».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Ликвидированные ушли на дно (вниз сетки), живые сместились вверх.</div>
                  </div>
                </div>
              )}
              {currentModule === "MANIAC_DETECTIVE" && step === 4 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Сектор чист</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Город стал чуточку безопаснее.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Завершите дедуктивный модуль.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Работа с алиби и зачисткой освоена.</div>
                  </div>
                </div>
              )}

              {/* 4. THIEF_ROBBER */}
              {currentModule === "THIEF_ROBBER" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Вор: Выбор цели</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Ночь в The Wicked City скрывает ваши шаги. Присмотрите жертву.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Выберите любого соседа в радиусе 3×3.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Идеальная мишень для карманной кражи.</div>
                  </div>
                </div>
              )}
              {currentModule === "THIEF_ROBBER" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Вор: Кража</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Никаких выстрелов. Срежьте кошелек элегантно и без шума.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Кража сокровища».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Сокровище ваше. На жертве осталась желтая метка.</div>
                  </div>
                </div>
              )}
              {currentModule === "THIEF_ROBBER" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Вор: Сброс хвоста</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Патрули ищут вас по ориентировке. Используйте резерв в руке.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Активируйте «Конспирация (Маска)» и подтвердите новую личность.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Новое лицо. Старое возвращается в руку.</div>
                  </div>
                </div>
              )}
              {currentModule === "THIEF_ROBBER" && step === 4 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Операция успешна</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Вы растворились в тенях мегаполиса.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Завершите модуль.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Кража и смена масок отработаны.</div>
                  </div>
                </div>
              )}

              {/* 5. THIEF_POLICE */}
              {currentModule === "THIEF_POLICE" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Полиция: Место преступления</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Ограбление в элитном районе. Жертва (желтая метка) в панике. Грабитель где-то рядом.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Выберите подозрительного соседа жертвы (#03).</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Объект взят в оперативную разработку.</div>
                  </div>
                </div>
              )}
              {currentModule === "THIEF_POLICE" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Полиция: Кордон</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Нужно перекрыть пути отхода.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Вызов патруля».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Сектор полностью оцеплен.</div>
                  </div>
                </div>
              )}
              {currentModule === "THIEF_POLICE" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Полиция: Перехват</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Мы зажали его в угол.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Задержание».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Воришка в камере. Ценности возвращены.</div>
                  </div>
                </div>
              )}

              {/* 6. SECRET_SERVICE */}
              {currentModule === "SECRET_SERVICE" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Агент: Радиоперехват</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> В эфире The Wicked City — вражеская частота. Найдите очевидца.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Выберите соседа в радиусе 3×3 для контакта.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Очевидец готов дать наводку по закрытому каналу.</div>
                  </div>
                </div>
              )}
              {currentModule === "SECRET_SERVICE" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Агент: Радиоопрос</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Используйте технику, чтобы проверить окружение очевидца (сектор 3×3).</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Активируйте «Опрос свидетелей».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Радар горит красным: враг в этой зоне.</div>
                  </div>
                </div>
              )}
              {currentModule === "SECRET_SERVICE" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Агент: Захват резидента</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Сигнал ведет к Софии Романовой.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Выделите вражеского шпиона.</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Цель в контуре захвата.</div>
                  </div>
                </div>
              )}
              {currentModule === "SECRET_SERVICE" && step === 4 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Агент: Разоблачение</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Сорвите с нее маску.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Разоблачение шпиона».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Компромат добыт. Модуль радиоперехвата сдан.</div>
                  </div>
                </div>
              )}

              {/* 7. LINE_UP */}
              {currentModule === "LINE_UP" && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Очная ставка: Каталог</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> В допросной душно. У вас только обрывки показаний свидетелей.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Проверьте деталь. Нажмите «Задать вопрос: Головной убор?».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Свидетель подтверждает: «ДА, ОН БЫЛ В ШЛЯПЕ».</div>
                  </div>
                </div>
              )}
              {currentModule === "LINE_UP" && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Очная ставка: Отсечение</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Дедукция — орудие хирургическое.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Исключить непричастных».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Все лица без шляп получают железное алиби.</div>
                  </div>
                </div>
              )}
              {currentModule === "LINE_UP" && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Очная ставка: Мишень</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> В списке остался лишь один подозреваемый.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Выберите Руслана Громова (#01).</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Фигурант готов к оглашению вердикта.</div>
                  </div>
                </div>
              )}
              {currentModule === "LINE_UP" && step === 4 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Очная ставка: Приговор</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Прижмите его к стенке.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Вынести обвинение (Арест)».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Алиби сломано. Вы выиграли дуэль дедукции.</div>
                  </div>
                </div>
              )}
              {currentModule === "LINE_UP" && step === 5 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Архив закрыт</h3>
                  <div className="text-xs text-zinc-300 font-mono space-y-0.5">
                    <div><b className="text-amber-500">КОНТЕКСТ:</b> Очередное дело отправлено в архив The Wicked City.</div>
                    <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Завершить модуль ➔».</div>
                    <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Полный курс Академии блестяще завершен!</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Статусная строка HUD */}
          <div className="h-7 md:h-8 px-4 w-full shrink-0 flex items-center justify-center bg-zinc-950/80 border-y border-white/5 shadow-sm z-10">
            <div className="text-[10px] md:text-xs tracking-widest uppercase font-mono text-center leading-tight flex flex-wrap justify-center items-center drop-shadow-md">
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
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {/* 2. MANIAC_KILLER */}
              {currentModule === "MANIAC_KILLER" && step === 3 && (
                <motion.button
                  onClick={handleKill}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Ликвидировать по заказу
                </motion.button>
              )}
              {currentModule === "MANIAC_KILLER" && step === 4 && (
                <motion.button
                  onClick={handleEscape}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Конспирация (Побег)
                </motion.button>
              )}
              {currentModule === "MANIAC_KILLER" && step === 5 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("MANIAC_KILLER");
                    setCurrentModule("MENU");
                  }}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {/* 3. MANIAC_DETECTIVE */}
              {currentModule === "MANIAC_DETECTIVE" && step === 2 && (
                <motion.button
                  onClick={handleArrest}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Задержание
                </motion.button>
              )}
              {currentModule === "MANIAC_DETECTIVE" && step === 3 && (
                <motion.button
                  onClick={handleCleanup}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Зачистка
                </motion.button>
              )}
              {currentModule === "MANIAC_DETECTIVE" && step === 4 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("MANIAC_DETECTIVE");
                    setCurrentModule("MENU");
                  }}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {/* 4. THIEF_ROBBER */}
              {currentModule === "THIEF_ROBBER" && step === 2 && (
                <motion.button
                  onClick={handleRob}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Кража
                </motion.button>
              )}
              {currentModule === "THIEF_ROBBER" && step === 3 && (
                <motion.button
                  onClick={handleFastDisguise}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Конспирация
                </motion.button>
              )}
              {currentModule === "THIEF_ROBBER" && step === 4 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("THIEF_ROBBER");
                    setCurrentModule("MENU");
                  }}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {/* 5. THIEF_POLICE */}
              {currentModule === "THIEF_POLICE" && step === 2 && (
                <motion.button
                  onClick={handlePoliceBlock}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Вызов патруля
                </motion.button>
              )}
              {currentModule === "THIEF_POLICE" && step === 3 && (
                <motion.button
                  onClick={handlePoliceArrest}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
                >
                  Задержание
                </motion.button>
              )}

              {/* 6. SECRET_SERVICE */}
              {currentModule === "SECRET_SERVICE" && step === 2 && Boolean(selectedId) && (
                <motion.button
                  onClick={handleInterrogate}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Опрос свидетелей
                </motion.button>
              )}
              {currentModule === "SECRET_SERVICE" && step === 4 && (
                <motion.button
                  onClick={handleCaptureSpy}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
                >
                  Разоблачение шпиона
                </motion.button>
              )}

              {/* 7. LINE_UP */}
              {currentModule === "LINE_UP" && step === 1 && (
                <motion.button
                  onClick={handleAskQuestionDuel}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Задать вопрос: Головной убор?
                </motion.button>
              )}
              {currentModule === "LINE_UP" && step === 2 && (
                <motion.button
                  onClick={handleEliminateDuel}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Исключить непричастных ➔
                </motion.button>
              )}
              {currentModule === "LINE_UP" && step === 4 && (
                <motion.button
                  onClick={handleAccuseDuel}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
                >
                  Вынести обвинение (Арест)
                </motion.button>
              )}
              {currentModule === "LINE_UP" && step === 5 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("LINE_UP");
                    setCurrentModule("MENU");
                  }}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
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
            <div className="w-full max-w-sm bg-zinc-950/85 backdrop-blur-xl border border-amber-500/50 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col items-center">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">
                Конспирация успешна
              </span>
              <h3 className="text-xl font-black text-zinc-100 mb-2">
                Ваша новая маска:
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
              <button onClick={handleConfirmDisguise} className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black uppercase tracking-wider text-xs rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-95">
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
