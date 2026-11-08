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

type TutorialModule = "MENU" | "BASICS" | "MANIAC" | "THIEF" | "SECRET_SERVICE" | "LINE_UP";

const L4_KILLER_ID = ALL_CHARACTERS[6].id;
const L4_PLAYER_ID = ALL_CHARACTERS[24].id;

const getInitialBoard = (module: TutorialModule, lesson: number = 1) => {
  const chars = ALL_CHARACTERS.slice(0, 25).map((c) => ({
    ...c,
    isAlive: true,
    isExonerated: false,
    isRobbed: false,
  }));

  if (module === "LINE_UP") {
    const c1Index = chars.findIndex(c => c.id === 'c1');
    if (c1Index !== -1 && c1Index !== 12) {
      const temp = chars[12];
      chars[12] = chars[c1Index];
      chars[c1Index] = temp;
    }
    const newBoard: Character[][] = [];
    for (let i = 0; i < 5; i++) {
      newBoard.push(chars.slice(i * 5, i * 5 + 5));
    }
    return newBoard;
  }

  if (module === "BASICS") {
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
  const [board, setBoard] = useState<Character[][]>(() => getInitialBoard("BASICS", 1));
  const [lastShift, setLastShift] = useState<LastShift | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [killedTargetId, setKilledTargetId] = useState<string | null>(null);

  const [thiefSecretId, setThiefSecretId] = useState<string | null>(null);
  const [maniacSecretId, setManiacSecretId] = useState<string | null>(null);
  const [isDisguiseModalOpen, setIsDisguiseModalOpen] = useState(false);
  const [newDisguiseChar, setNewDisguiseChar] = useState<Character | null>(null);

  const [interrogatedTargetId, setInterrogatedTargetId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<"NEAR" | "FAR" | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; name: string; id: string } | null>(null);

  const isRewardClaimed = typeof window !== 'undefined' && localStorage.getItem("crime_city_tutorial") === "true";

  const [completedModules, setCompletedModules] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem("crime_city_tutorial") === "true") {
        return ["BASICS", "MANIAC", "THIEF", "SECRET_SERVICE", "LINE_UP"];
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

  const allModulesCompleted = ["BASICS", "MANIAC", "THIEF", "SECRET_SERVICE", "LINE_UP"].every(m =>
    completedModules.includes(m)
  );

  const basicsPlayerId = useMemo(() => {
    return ALL_CHARACTERS[12].id;
  }, []);

  const spyEnemyId = board[1]?.[1]?.id;

  const tutorialMyRoleColor = useMemo<"red" | "blue">((): "red" | "blue" => {
    if (currentModule === "BASICS") {
      return lesson === 3 || lesson === 4 ? "blue" : "red";
    }
    if (currentModule === "MANIAC" || currentModule === "THIEF") {
      return "red";
    }
    return "blue";
  }, [currentModule, lesson]);

  const currentMyCharacterId = useMemo(() => {
    if (currentModule === "BASICS") {
      if (lesson === 3) return board[2]?.[2]?.id || null;
      if (lesson === 4) return L4_PLAYER_ID;
      return basicsPlayerId;
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
  }, [currentModule, lesson, basicsPlayerId, thiefSecretId, maniacSecretId, board]);

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

    if (currentModule === "BASICS") {
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
        radarColorClass: scanResult === "NEAR" ? "border-red-500 ring-2 ring-red-500/80" : "border-blue-500 ring-2 ring-blue-500/80",
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
        if (scanResult === "FAR") return <span className="text-blue-400 font-bold">Показания: ВНЕ ЗОНЫ (НЕТ) — резидента рядом нет. Опросите другого очевидца</span>;
        return <span className="text-zinc-300 font-bold">Оперативные показания: выберите очевидца для опроса</span>;
      }
      if (lesson === 2) {
        return <span className="text-blue-400 font-bold">Разоблачение: укажите на вражеского резидента (София Романова)</span>;
      }
    }
    if (currentModule === "BASICS") {
      if (lesson === 2 && step >= 3) return <span className="text-blue-400 font-bold">Показания очевидцев: ИНСПЕКТОР ВНЕ ЗОНЫ</span>;
      if (lesson === 3) return <span className="text-blue-400 font-bold">Зона очевидца: СЕКТОР 3×3 (сужение круга поиска)</span>;
      if (lesson === 4) return <span className="text-zinc-400 font-bold">Зачистка: устраните скопление тел для маневра</span>;
    }
    if (currentModule === "MANIAC") {
      if (lesson === 1) return <span className="text-red-400 font-bold">Текущая цель заказа: {targetVictimName}</span>;
      if (lesson === 2) return <span className="text-red-400 font-bold">Уход от погони: смените личность</span>;
    }
    if (currentModule === "LINE_UP") {
      if (step === 1) return <span className="text-cyan-400 font-bold">Опрос: задайте вопрос о приметах подозреваемого</span>;
      if (step === 2) return <span className="text-emerald-400 font-bold">Ответ свидетеля: «ДА, ЕСТЬ ГОЛОВНОЙ УБОР»</span>;
      if (step === 3) return <span className="text-blue-400 font-bold">Исключение: выберите фигуранта без алиби (Руслан Громов)</span>;
      if (step === 4) return <span className="text-red-400 font-bold">Финальный вердикт: подтвердите обвинение фигуранта</span>;
      if (step === 5) return <span className="text-emerald-400 font-bold animate-pulse">Очная ставка выиграна: фигурант изобличен!</span>;
    }
    if (currentModule === "THIEF") {
      if (step === 4) return <span className="text-blue-400 font-bold">Маскировка успешна: принято новое прикрытие</span>;
      return <span className="text-red-400 font-bold">Операция Вора: Похищение сокровищ без ликвидаций</span>;
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
    if (currentModule === "BASICS") {
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
    } else if (currentModule === "LINE_UP") {
      if (lesson === 1 && step === 3 && id === "c1") {
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
    setSelectedId(null);
    if (
      currentModule === "BASICS" &&
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
    if (currentModule === "BASICS" && lesson === 2 && step === 2 && selectedId) {
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
      currentModule === "BASICS" &&
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
    if (currentModule === "BASICS" && lesson === 4 && step === 1) {
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
      if (currentModule === "LINE_UP") {
      if (step === 1) return <span className="text-cyan-400 font-bold">Опрос: задайте вопрос о приметах подозреваемого</span>;
      if (step === 2) return <span className="text-emerald-400 font-bold">Ответ свидетеля: «ДА, ЕСТЬ ГОЛОВНОЙ УБОР»</span>;
      if (step === 3) return <span className="text-blue-400 font-bold">Исключение: выберите фигуранта без алиби (Руслан Громов)</span>;
      if (step === 4) return <span className="text-red-400 font-bold">Финальный вердикт: подтвердите обвинение фигуранта</span>;
      if (step === 5) return <span className="text-emerald-400 font-bold animate-pulse">Очная ставка выиграна: фигурант изобличен!</span>;
    }
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

  const handleAskQuestionDuel = () => {
    if (currentModule === "LINE_UP" && lesson === 1 && step === 1) {
      soundManager.play("radar");
      triggerHaptic("medium");
      setStep(2);
    }
  };

  const handleEliminateDuel = () => {
    if (currentModule === "LINE_UP" && lesson === 1 && step === 2) {
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
    if (currentModule === "LINE_UP" && lesson === 1 && step === 4 && selectedId === "c1") {
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
                Пройдено: <b className="text-blue-400">{completedModules.length}</b>/5
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar">
            <div
              onClick={() => startModule("BASICS")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("BASICS")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-blue-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Основы Син-Сити: Закон и Улицы</h3>
                {completedModules.includes("BASICS") && (
                  <span className="text-[9px] font-mono font-bold text-zinc-200 uppercase bg-zinc-900/80 px-2 py-0.5 rounded border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Базовые механики: смещение кварталов по краю, радиус слышимости 3×3, отсечение невиновных по алиби и арест.</p>
            </div>

            <div
              onClick={() => startModule("MANIAC")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("MANIAC")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-red-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Почерк убийцы (Охота на маньяка)</h3>
                {completedModules.includes("MANIAC") && (
                  <span className="text-[9px] font-mono font-bold text-zinc-200 uppercase bg-zinc-900/80 px-2 py-0.5 rounded border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Особенности открытого списка смертников: убийства строго по очереди целей и побег маньяка.</p>
            </div>

            <div
              onClick={() => startModule("THIEF")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("THIEF")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-red-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Оцепление (Охота на грабителя)</h3>
                {completedModules.includes("THIEF") && (
                  <span className="text-[9px] font-mono font-bold text-zinc-200 uppercase bg-zinc-900/80 px-2 py-0.5 rounded border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Кража сокровищ без ликвидаций, смена масок из руки и уход от облавы.</p>
            </div>

            <div
              onClick={() => startModule("SECRET_SERVICE")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("SECRET_SERVICE")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-blue-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Директива Ноль (Секретная служба)</h3>
                {completedModules.includes("SECRET_SERVICE") && (
                  <span className="text-[9px] font-mono font-bold text-zinc-200 uppercase bg-zinc-900/80 px-2 py-0.5 rounded border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">✓ Сдано</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Шпионские дуэли: перекрестный опрос очевидцев в секторе 3x3 и разоблачение вражеского резидента.</p>
            </div>

            <div
              onClick={() => startModule("LINE_UP")}
              className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
                completedModules.includes("LINE_UP")
                  ? "bg-zinc-900/40 border-white/10"
                  : "bg-zinc-900/60 border-white/10 hover:border-cyan-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Очная ставка (Дуэль дедукции)</h3>
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
            {currentModule === "BASICS" ? "ОСНОВЫ СИН-СИТИ" : currentModule === "MANIAC" ? "ПОЧЕРК УБИЙЦЫ" : currentModule === "THIEF" ? "ОЦЕПЛЕНИЕ" : currentModule === "SECRET_SERVICE" ? "ДИРЕКТИВА НОЛЬ" : "ОЧНАЯ СТАВКА"}
          </h2>
          <div className="w-16 shrink-0" />
        </div>

        <div className="flex-1 w-full flex flex-col relative min-h-0 overflow-hidden">
          <div className="min-h-[60px] md:min-h-[50px] max-h-[90px] shrink-0 py-1 px-4 flex flex-col justify-center items-center text-center z-10">
            <div>
              {currentModule === "BASICS" && lesson === 1 && (step === 1 || step === 2) && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Улицы в движении (Сдвиг квартала)</h3>
                  <p className="text-xs text-zinc-400 font-mono">Ночной дождь скрывает следы. Цель вне зоны контакта. <b className="text-blue-400">Нажмите стрелку ← у 3-го ряда:</b> карта выйдет за край поля и появится справа, подтянув окружение к вам.</p>
                </div>
              )}
              {currentModule === "BASICS" && lesson === 1 && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Отличный маневр!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Отличный маневр. Сдвиг меняет соседей и выводит вас на новую позицию.</p>
                </div>
              )}

              {currentModule === "BASICS" && lesson === 2 && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Выстрел в упор (Радиус 3×3)</h3>
                  <p className="text-xs text-zinc-400 font-mono"><b className="text-red-400">Контракт открыт.</b> Выберите любую цель среди 8 соседей в пределах одного квартала.</p>
                </div>
              )}
              {currentModule === "BASICS" && lesson === 2 && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Цель выбрана</h3>
                  <p className="text-xs text-zinc-400 font-mono"><b className="text-red-400">НАЖМИТЕ кнопку "Ликвидировать" внизу.</b></p>
                </div>
              )}
              {currentModule === "BASICS" && lesson === 2 && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Показания очевидцев</h3>
                  <p className="text-xs text-zinc-400 font-mono">Показания свидетеля: шум выстрела слышен строго в секторе 3×3. Если инспектора нет в этом квадрате — следствие заходит в тупик.</p>
                </div>
              )}

              {currentModule === "BASICS" && lesson === 3 && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Точечный арест (Дедукция алиби)</h3>
                  <p className="text-xs text-zinc-400 font-mono">Инспектор на месте. Свидетель подтвердил: преступник в квадрате 3×3. Карты с синей отметкой имеют алиби. <b className="text-blue-400">Выберите единственного подозреваемого без алиби.</b></p>
                </div>
              )}
              {currentModule === "BASICS" && lesson === 3 && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Предъявление обвинения</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Задержание» для ареста подозреваемого.</p>
                </div>
              )}
              {currentModule === "BASICS" && lesson === 3 && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Точный арест!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Точный арест! Круг сужен дедукцией, подозреваемый обезврежен.</p>
                </div>
              )}

              {currentModule === "BASICS" && lesson === 4 && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Загромождение улиц (Эвакуация тел)</h3>
                  <p className="text-xs text-zinc-400 font-mono">Тела на мостовой блокируют маневры. Нажмите «Зачистить»: полиция смещает выбывших жителей к обочинам сетки, освобождая центр квартала.</p>
                </div>
              )}
              {currentModule === "BASICS" && lesson === 4 && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-blue-400 uppercase tracking-wider mb-0.5">Курс пройден!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Вы успешно освоили тактику маневров и дедукции.</p>
                </div>
              )}

              {currentModule === "MANIAC" && lesson === 1 && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider mb-0.5">Черный блокнот (Очередь целей)</h3>
                  <p className="text-xs text-zinc-400 font-mono">Синдикат требует устранять цели строго по очереди контракта. Первая жертва — {targetVictimName}. <b className="text-blue-400">Сдвиньте 3-ю колонку вниз (↓)</b>, чтобы подвести её в зону прямого удара.</p>
                </div>
              )}
              {currentModule === "MANIAC" && lesson === 1 && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Цель в зоне удара</h3>
                  <p className="text-xs text-zinc-400 font-mono">Соколова в зоне поражения. <b className="text-red-400">Выберите её карточку</b> для ликвидации по заказу.</p>
                </div>
              )}
              {currentModule === "MANIAC" && lesson === 1 && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Ликвидация цели</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Ликвидировать по заказу» внизу.</p>
                </div>
              )}
              {currentModule === "MANIAC" && lesson === 1 && step === 4 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-blue-400 uppercase tracking-wider mb-0.5">Цель поражена!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Жертва ликвидирована строго по контракту.</p>
                </div>
              )}
              {currentModule === "MANIAC" && lesson === 2 && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider mb-0.5">Сброс хвоста (Побег и новая маска)</h3>
                  <p className="text-xs text-zinc-400 font-mono">Оперативники сели на хвост. Нажмите «Конспирация (Побег)», чтобы сбросить раскрытую личность и взять новое прикрытие из колоды.</p>
                </div>
              )}
              {currentModule === "MANIAC" && lesson === 2 && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-blue-400 uppercase tracking-wider mb-0.5">Побег успешен!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Новое прикрытие принято. Метка «ВЫ» переместилась, а полиция потеряла след.</p>
                </div>
              )}

              {currentModule === "THIEF" && lesson === 1 && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider mb-0.5">Карманная кража</h3>
                  <p className="text-xs text-zinc-400 font-mono">Настоящий вор работает без стрельбы. <b className="text-red-400">Выберите любого соседа</b>, чтобы обчистить карманы.</p>
                </div>
              )}
              {currentModule === "THIEF" && lesson === 1 && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Кража сокровища</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Кража сокровища» внизу.</p>
                </div>
              )}
              {currentModule === "THIEF" && lesson === 1 && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-blue-400 uppercase tracking-wider mb-0.5">Успешная кража!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Добыча получена (1/8 сокровищ). Каждая кража оставляет след, но приближает побег из города.</p>
                </div>
              )}
              {currentModule === "THIEF" && lesson === 2 && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider mb-0.5">Смена прикрытия (Маскировка из руки)</h3>
                  <p className="text-xs text-zinc-400 font-mono">Патрули стягиваются к точке кражи. Нажмите «Конспирация (Маска)», чтобы раствориться в толпе под новым лицом из руки.</p>
                </div>
              )}
              {currentModule === "THIEF" && lesson === 2 && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-blue-400 uppercase tracking-wider mb-0.5">Лицо изменено!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Прикрытие изменено. Вы ускользнули из сектора облавы.</p>
                </div>
              )}

              {currentModule === "SECRET_SERVICE" && lesson === 1 && (step === 1 || (step === 2 && scanResult === "FAR")) && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-blue-400 uppercase tracking-wider mb-0.5">Перекрестный опрос</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    {scanResult === "FAR"
                      ? "Вне зоны (НЕТ). Опросите другого очевидца ближе к резиденту."
                      : "Вражеский резидент перехватил радиоканал. Выберите очевидца для опроса. Помните: свидетель сканирует сектор 3×3 вокруг себя."}
                  </p>
                </div>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 1 && step === 2 && scanResult !== "FAR" && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Опрос очевидцев</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Опрос свидетелей» внизу.</p>
                </div>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 1 && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-blue-400 uppercase tracking-wider mb-0.5">Враг рядом (ДА)!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Связной вышел на связь: «ВРАГ РЯДОМ (ДА)». Сектор 3×3 взят на контроль контрразведки.</p>
                </div>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 2 && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Разоблачение резидента</h3>
                  <p className="text-xs text-zinc-400 font-mono">Квадрат сужен. Выберите выявленного резидента Софию Романову.</p>
                </div>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 2 && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Разоблачение</h3>
                  <p className="text-xs text-zinc-400 font-mono">Нажмите «Разоблачение шпиона» для задержания.</p>
                </div>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 2 && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-blue-400 uppercase tracking-wider mb-0.5">Трофей получен!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Резидент вскрыт! Получен первый компромат (1/3 трофея). Соберите 3 трофея в дуэли для полной ликвидации резидентуры.</p>
                </div>
              )}

              {currentModule === "LINE_UP" && lesson === 1 && step === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-cyan-400 uppercase tracking-wider mb-0.5">Очная ставка (Каталог улик)</h3>
                  <p className="text-xs text-zinc-400 font-mono">Тайный свидетель готов отвечать «ДА» или «НЕТ». Задайте вопрос из картотеки примет: <b className="text-cyan-300">«Есть ли головной убор?»</b> Нажмите кнопку внизу.</p>
                </div>
              )}
              {currentModule === "LINE_UP" && lesson === 1 && step === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Ответ получен: ДА</h3>
                  <p className="text-xs text-zinc-400 font-mono">Свидетель подтвердил: подозреваемый был в шляпе. Все лица без головного убора получают алиби. <b className="text-blue-400">Нажмите «Исключить непричастных».</b></p>
                </div>
              )}
              {currentModule === "LINE_UP" && lesson === 1 && step === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-0.5">Круг сужен!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Непричастные отсечены синей меткой алиби. <b className="text-cyan-300">Выберите карточку оставшегося фигуранта — Руслана Громова (#01).</b></p>
                </div>
              )}
              {currentModule === "LINE_UP" && lesson === 1 && step === 4 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider mb-0.5">Финальное обвинение</h3>
                  <p className="text-xs text-zinc-400 font-mono">Фигурант заблокирован доказательствами. <b className="text-red-400">Нажмите «Вынести обвинение (Арест)» внизу.</b></p>
                </div>
              )}
              {currentModule === "LINE_UP" && lesson === 1 && step === 5 && (
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Победа в ставке!</h3>
                  <p className="text-xs text-zinc-400 font-mono">Точное обвинение сломало защиту противника. Курс «Очная ставка» успешно сдан.</p>
                </div>
              )}
            </div>
          </div>

          <div className="h-7 md:h-8 px-4 w-full shrink-0 flex items-center justify-center bg-zinc-950/80 border-y border-white/5 shadow-sm z-10">
            <div className="text-[10px] md:text-xs tracking-widest uppercase font-mono text-center leading-tight flex flex-wrap justify-center items-center">
              {getHudStatus()}
            </div>
          </div>

                      <div className={`relative z-10 w-full h-full flex-1 min-h-0 max-h-full flex items-center justify-center my-auto py-1 md:py-3 px-2 overflow-hidden ${
            currentModule === "BASICS" && lesson === 1 && (step === 1 || step === 2) ? "tutorial-highlight-l1s2" : ""
          } ${currentModule === "MANIAC" && lesson === 1 && step === 1 ? "tutorial-highlight-maniac" : ""}`}>
            <GameBoard
              mode={currentModule === "THIEF" ? "THIEF_HUNT" : currentModule === "SECRET_SERVICE" ? "SECRET_SERVICE" : currentModule === "LINE_UP" ? "LINE_UP" : "MANIAC_VS_OPERATIVE"}
              board={board}
              selectedCharacterId={selectedId}
              killerAdjacentIds={adjacentIds}
              detectiveAdjacentIds={adjacentIds}
              showKillerHints={
                (currentModule === "BASICS" && lesson === 1) ||
                (currentModule === "BASICS" && lesson === 2 && step === 1) ||
                (currentModule === "MANIAC" && lesson === 1 && step === 2) ||
                (currentModule === "THIEF" && lesson === 1 && step === 1) ||
                (currentModule === "SECRET_SERVICE" && lesson === 1 && (step === 1 || (step === 2 && scanResult === "FAR"))) ||
                (currentModule === "SECRET_SERVICE" && lesson === 2 && step === 1) ||
                (currentModule === "LINE_UP" && lesson === 1 && step === 3)
              }
              showDetectiveHints={false}
              targetVictimId={
                currentModule === "MANIAC" ? targetVictimId : null
              }
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

          <div className="h-14 md:h-16 shrink-0 w-full flex items-center justify-center px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#080a0f] border-t border-white/5 z-20">
            <AnimatePresence mode="wait">
              {currentModule === "BASICS" && lesson === 1 && step === 3 && (
                <motion.button onClick={() => { setLesson(2); setStep(1); setBoard(getInitialBoard("BASICS", 2)); }} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Урок 2: Ликвидация ➔</motion.button>
              )}
              {currentModule === "BASICS" && lesson === 2 && step === 2 && (
                <motion.button onClick={handleKill} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">Ликвидировать</motion.button>
              )}
              {currentModule === "BASICS" && lesson === 2 && step === 3 && (
                <motion.button onClick={() => { setLesson(3); setStep(1); setBoard(getInitialBoard("BASICS", 3)); }} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Урок 3: Задержание ➔</motion.button>
              )}
              {currentModule === "BASICS" && lesson === 3 && step === 2 && (
                <motion.button onClick={handleArrest} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Задержание</motion.button>
              )}
              {currentModule === "BASICS" && lesson === 3 && step === 3 && (
                <motion.button onClick={() => { setLesson(4); setStep(1); setBoard(getInitialBoard("BASICS", 4)); }} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Урок 4: Зачистка ➔</motion.button>
              )}
              {currentModule === "BASICS" && lesson === 4 && step === 1 && (
                <motion.button onClick={handleCleanup} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Зачистить</motion.button>
              )}
              {currentModule === "BASICS" && lesson === 4 && step === 2 && (
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

              {currentModule === "MANIAC" && lesson === 1 && step === 3 && (
                <motion.button onClick={handleKill} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">Ликвидировать по заказу</motion.button>
              )}
              {currentModule === "MANIAC" && lesson === 1 && step === 4 && (
                <motion.button onClick={() => { setLesson(2); setStep(1); setBoard(getInitialBoard("MANIAC", 2)); }} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Урок 2: Побег ➔</motion.button>
              )}
              {currentModule === "MANIAC" && lesson === 2 && step === 1 && (
                <motion.button onClick={handleEscape} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">Конспирация (Побег)</motion.button>
              )}
              {currentModule === "MANIAC" && lesson === 2 && step === 2 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("MANIAC");
                    setCurrentModule("MENU");
                  }}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {currentModule === "THIEF" && lesson === 1 && step === 2 && (
                <motion.button onClick={handleRob} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">Кража сокровища</motion.button>
              )}
              {currentModule === "THIEF" && lesson === 1 && step === 3 && (
                <motion.button onClick={() => { setLesson(2); setStep(1); setBoard(getInitialBoard("THIEF", 2)); }} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Урок 2: Маскировка ➔</motion.button>
              )}
              {currentModule === "THIEF" && lesson === 2 && step === 1 && (
                <motion.button onClick={handleFastDisguise} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">Конспирация (Маска)</motion.button>
              )}
              {currentModule === "THIEF" && lesson === 2 && step === 2 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("THIEF");
                    setCurrentModule("MENU");
                  }}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {currentModule === "SECRET_SERVICE" && lesson === 1 && step === 2 && Boolean(selectedId) && (
                <motion.button onClick={handleInterrogate} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Опрос свидетелей</motion.button>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 1 && step === 3 && (
                <motion.button onClick={() => { setLesson(2); setStep(1); setBoard(getInitialBoard("SECRET_SERVICE", 2)); setInterrogatedTargetId(null); setScanResult(null); }} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Урок 2: Разоблачение ➔</motion.button>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 2 && step === 2 && (
                <motion.button onClick={handleCaptureSpy} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Разоблачение шпиона</motion.button>
              )}
              {currentModule === "SECRET_SERVICE" && lesson === 2 && step === 3 && (
                <motion.button
                  onClick={() => {
                    markModuleCompleted("SECRET_SERVICE");
                    setCurrentModule("MENU");
                  }}
                  className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 font-black uppercase tracking-wider rounded-full shadow-lg cursor-pointer"
                >
                  Завершить модуль ➔
                </motion.button>
              )}

              {currentModule === "LINE_UP" && lesson === 1 && step === 1 && (
                <motion.button onClick={handleAskQuestionDuel} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer">Задать вопрос: Головной убор?</motion.button>
              )}
              {currentModule === "LINE_UP" && lesson === 1 && step === 2 && (
                <motion.button onClick={handleEliminateDuel} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer">Исключить непричастных ➔</motion.button>
              )}
              {currentModule === "LINE_UP" && lesson === 1 && step === 4 && (
                <motion.button onClick={handleAccuseDuel} className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">Вынести обвинение (Арест)</motion.button>
              )}
              {currentModule === "LINE_UP" && lesson === 1 && step === 5 && (
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
