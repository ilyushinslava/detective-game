import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { GameBoard } from "./GameBoard";
import { shiftBoard, getAdjacentCharacters } from "../utils/gameLogic";
import { soundManager } from "../utils/audio";
import { triggerHaptic } from "../utils/haptics";
import type { Character, LastShift } from "../types/game";
import {
  type TutorialModule,
  getInitialBoard,
  TutorialMenuView,
  TutorialGuidePanel,
  TutorialActionBar,
} from "./tutorial";

interface TutorialScreenProps {
  onExit: () => void;
  onFinish: () => void;
}

export type { TutorialModule };

export const TutorialScreen = ({ onExit, onFinish }: TutorialScreenProps) => {
  const [currentModule, setCurrentModule] = useState<TutorialModule>("MENU");
  const [step, setStep] = useState<number>(1);
  const [board, setBoard] = useState<Character[][]>(() => getInitialBoard("MENU"));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastShift, setLastShift] = useState<LastShift | null>(null);
  const [targetVictimId, setTargetVictimId] = useState<string>("c3"); // Елена Соколова
  const [maniacSecretId, setManiacSecretId] = useState<string>("c4"); // Артем Воронов
  const [thiefSecretId, setThiefSecretId] = useState<string>("c4");
  const [spyEnemyId, setSpyEnemyId] = useState<string>("c2"); // Даниил Белов
  const [interrogatedTargetId, setInterrogatedTargetId] = useState<string | null>(null);
  const [isDisguiseModalOpen, setIsDisguiseModalOpen] = useState(false);
  const [newDisguiseChar, setNewDisguiseChar] = useState<Character | null>(null);

  const [completedModules, setCompletedModules] = useState<TutorialModule[]>(() => {
    try {
      const saved =
        localStorage.getItem("crime_city_completed_modules") ||
        localStorage.getItem("prime_suspect_completed_tutorial_modules");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isRewardClaimed, setIsRewardClaimed] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem("crime_city_tutorial_reward_claimed") === "true" ||
        localStorage.getItem("prime_suspect_tutorial_reward_claimed") === "true"
      );
    } catch {
      return false;
    }
  });

  const markModuleCompleted = (mod: TutorialModule) => {
    soundManager.play("victory");
    triggerHaptic("success");
    setCompletedModules((prev) => {
      if (prev.includes(mod)) return prev;
      const updated = [...prev, mod];
      try {
        localStorage.setItem("crime_city_completed_modules", JSON.stringify(updated));
        localStorage.setItem("prime_suspect_completed_tutorial_modules", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const startModule = (mod: TutorialModule) => {
    soundManager.play("click");
    triggerHaptic("light");
    setCurrentModule(mod);
    setStep(1);
    setSelectedId(null);
    setLastShift(null);
    setInterrogatedTargetId(null);
    setBoard(getInitialBoard(mod));
    if (mod === "MANIAC_KILLER") {
      setTargetVictimId("c3");
      setManiacSecretId("c4");
    } else if (mod === "THIEF_ROBBER") {
      setThiefSecretId("c4");
    } else if (mod === "SECRET_SERVICE") {
      setSpyEnemyId("c2");
    }
  };

  // Вычисляем активного персонажа игрока для подсветки сектора 3x3
  const activeAgentId = useMemo(() => {
    if (currentModule === "MANIAC_KILLER" || currentModule === "THIEF_ROBBER") {
      return maniacSecretId;
    }
    if (currentModule === "BASICS") return board[2]?.[2]?.id || null;
    if (currentModule === "MANIAC_KILLER") return maniacSecretId || board[2]?.[1]?.id;
    if (currentModule === "MANIAC_DETECTIVE") return board[2]?.[2]?.id;
    if (currentModule === "THIEF_ROBBER") return thiefSecretId || board[2]?.[2]?.id;
    if (currentModule === "THIEF_POLICE") return board[2]?.[2]?.id;
    if (currentModule === "SECRET_SERVICE") return board[2]?.[2]?.id;
    if (currentModule === "LINE_UP") return null;
    return null;
  }, [currentModule, board, maniacSecretId, thiefSecretId]);

  // Вычисляем соседей активного персонажа (радиус 3x3)
  const adjacentIds = useMemo(() => {
    if (!activeAgentId) return [];
    return getAdjacentCharacters(board, activeAgentId).map((c) => c.id);
  }, [board, activeAgentId]);

  // Вычисляем соседей Елены Соколовой для допроса свидетелей в MANIAC_DETECTIVE
  const victimAdjacentIds = useMemo(() => {
    if (currentModule === "MANIAC_DETECTIVE" && step === 1) {
      const victim = board.flat().find((c) => c.id === "c3");
      if (victim) {
        return getAdjacentCharacters(board, "c3").map((c) => c.id);
      }
    }
    return [];
  }, [board, currentModule, step]);

  // Вычисляем соседей цели для радара в SECRET_SERVICE
  const radarAdjacentIds = useMemo(() => {
    if (currentModule === "SECRET_SERVICE" && step >= 2 && interrogatedTargetId) {
      return getAdjacentCharacters(board, interrogatedTargetId).map((c) => c.id);
    }
    return [];
  }, [board, currentModule, step, interrogatedTargetId]);

  const handleCardClick = (id: string) => {
    soundManager.play("click");
    triggerHaptic("light");

    if (currentModule === "BASICS") {
      if (step === 2 && adjacentIds.includes(id)) {
        setSelectedId(id);
        soundManager.play("confirm");
        triggerHaptic("success");
        setStep(3);
      }
      return;
    }

    if (currentModule === "MANIAC_KILLER") {
      if (step === 2 && id === targetVictimId && adjacentIds.includes(id)) {
        setSelectedId(id);
        soundManager.play("confirm");
        triggerHaptic("success");
        setStep(3);
      }
      return;
    }

    if (currentModule === "MANIAC_DETECTIVE") {
      const suspectId = board[1]?.[1]?.id;
      if (step === 1 && (id === suspectId || id === "c4" || id === "c7")) {
        setSelectedId(id);
        soundManager.play("confirm");
        triggerHaptic("success");
        setStep(2);
      }
      return;
    }

    if (currentModule === "THIEF_ROBBER") {
      if (step === 1 && adjacentIds.includes(id)) {
        setSelectedId(id);
        soundManager.play("confirm");
        triggerHaptic("success");
        setStep(2);
      }
      return;
    }

    if (currentModule === "THIEF_POLICE") {
      if (step === 1) {
        setSelectedId(id);
        soundManager.play("confirm");
        triggerHaptic("success");
        setStep(2);
      }
      return;
    }

    if (currentModule === "SECRET_SERVICE") {
      if (step === 1) {
        setSelectedId(id);
        soundManager.play("confirm");
        triggerHaptic("success");
        setStep(2);
      } else if (step === 3 && id === spyEnemyId) {
        setSelectedId(id);
        soundManager.play("confirm");
        triggerHaptic("success");
        setStep(4);
      }
      return;
    }

    if (currentModule === "LINE_UP") {
      if (step === 3 && id === "c1") {
        setSelectedId(id);
        soundManager.play("confirm");
        triggerHaptic("success");
        setStep(4);
      }
      return;
    }

    setSelectedId(id);
  };

  const handleShift = (type: "ROW" | "COL", index: number, direction: "FORWARD" | "BACKWARD") => {
    // 1. BASICS: шаг 1 — сдвиг 3-го ряда влево (index 2, BACKWARD)
    if (
      currentModule === "BASICS" &&
      step === 1 &&
      type === "ROW" &&
      index === 2 &&
      direction === "BACKWARD"
    ) {
      const nextBoard = shiftBoard(board, type, index, direction);
      setBoard(nextBoard);
      setLastShift({ type, index, direction });
      soundManager.play("shift");
      triggerHaptic("medium");
      setStep(2);
      return;
    }

    // 2. MANIAC_KILLER: шаг 1 — сдвиг 3-й колонки вниз (index 2, FORWARD)
    if (
      currentModule === "MANIAC_KILLER" &&
      step === 1 &&
      type === "COL" &&
      index === 2 &&
      direction === "FORWARD"
    ) {
      const nextBoard = shiftBoard(board, type, index, direction);
      setBoard(nextBoard);
      setLastShift({ type, index, direction });
      soundManager.play("shift");
      triggerHaptic("medium");
      setStep(2);
      return;
    }
  };

  const handleKill = () => {
    if (currentModule === "MANIAC_KILLER" && step === 3 && selectedId === targetVictimId) {
      soundManager.play("eliminate");
      triggerHaptic("heavy");
      setBoard((prev) =>
        prev.map((row) =>
          row.map((c) => (c.id === targetVictimId ? { ...c, isAlive: false } : c))
        )
      );
      setSelectedId(null);
      setStep(4);
    }
  };

  const handleEscape = () => {
    if (currentModule === "MANIAC_KILLER" && step === 4) {
      soundManager.play("disguise");
      triggerHaptic("success");
      const targetMaskChar = board[3]?.[3] || { id: "c7", name: "Виктор Смирнов" };
      setNewDisguiseChar(targetMaskChar as any);
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

  const handleArrest = () => {
    if (currentModule === "MANIAC_DETECTIVE" && step === 2 && selectedId) {
      soundManager.play("arrest");
      triggerHaptic("heavy");
      setBoard((prev) =>
        prev.map((row) =>
          row.map((c) => (c.id === selectedId ? { ...c, isAlive: false } : c))
        )
      );
      setSelectedId(null);
      setStep(3);
    }
  };

  const handleCleanup = () => {
    if (currentModule === "MANIAC_DETECTIVE" && step === 3) {
      soundManager.play("shift");
      triggerHaptic("medium");
      const flat = board.flat();
      const alive = flat.filter((c) => c.isAlive);
      const dead = flat.filter((c) => !c.isAlive);
      const reordered = [...alive, ...dead];
      const next: Character[][] = [];
      for (let r = 0; r < 5; r++) {
        next.push(reordered.slice(r * 5, r * 5 + 5));
      }
      setBoard(next);
      setStep(4);
    }
  };

  const handleRob = () => {
    if (currentModule === "THIEF_ROBBER" && step === 2 && selectedId) {
      soundManager.play("confirm");
      triggerHaptic("heavy");
      setBoard((prev) =>
        prev.map((row) =>
          row.map((c) => (c.id === selectedId ? { ...c, isRobbed: true } : c))
        )
      );
      setSelectedId(null);
      setStep(3);
    }
  };

  const handleThiefDisguise = () => {
    if (currentModule === "THIEF_ROBBER" && step === 3) {
      soundManager.play("confirm");
      triggerHaptic("success");
      setThiefSecretId("c9");
      setStep(4);
    }
  };

  const handlePoliceBlock = () => {
    if (currentModule === "THIEF_POLICE" && step === 2) {
      soundManager.play("confirm");
      triggerHaptic("medium");
      setStep(3);
    }
  };

  const handlePoliceArrest = () => {
    if (currentModule === "THIEF_POLICE" && step === 3 && selectedId) {
      soundManager.play("arrest");
      triggerHaptic("heavy");
      markModuleCompleted("THIEF_POLICE");
      setCurrentModule("MENU");
    }
  };

  const handleInterrogate = () => {
    if (currentModule === "SECRET_SERVICE" && step === 2 && selectedId) {
      soundManager.play("radar");
      triggerHaptic("medium");
      setInterrogatedTargetId(selectedId);
      setSelectedId(null);
      setStep(3);
    }
  };

  const handleCaptureSpy = () => {
    if (currentModule === "SECRET_SERVICE" && step === 4 && selectedId === spyEnemyId) {
      soundManager.play("arrest");
      triggerHaptic("heavy");
      markModuleCompleted("SECRET_SERVICE");
      setCurrentModule("MENU");
    }
  };

  const handleAskQuestionDuel = () => {
    if (currentModule === "LINE_UP" && step === 1) {
      soundManager.play("confirm");
      triggerHaptic("light");
      setStep(2);
    }
  };

  const handleEliminateDuel = () => {
    if (currentModule === "LINE_UP" && step === 2) {
      soundManager.play("shift");
      triggerHaptic("medium");
      setBoard((prev) =>
        prev.map((row) =>
          row.map((c) => (c.id !== "c1" ? { ...c, isExonerated: true } : c))
        )
      );
      setStep(3);
    }
  };

  const handleAccuseDuel = () => {
    if (currentModule === "LINE_UP" && step === 4 && selectedId === "c1") {
      soundManager.play("arrest");
      triggerHaptic("heavy");
      setStep(5);
    }
  };

  const handleCompleteModule = (mod: TutorialModule) => {
    markModuleCompleted(mod);
    setCurrentModule("MENU");
  };

  const getModuleTitle = () => {
    switch (currentModule) {
      case "BASICS":
        return "УРОК 1: ОСНОВЫ ИГРЫ";
      case "MANIAC_KILLER":
        return "УРОК 2: ИГРА ЗА МАНЬЯКА";
      case "MANIAC_DETECTIVE":
        return "УРОК 3: ИГРА ЗА СЫЩИКА";
      case "THIEF_ROBBER":
        return "УРОК 4: ИГРА ЗА ГРАБИТЕЛЯ";
      case "THIEF_POLICE":
        return "УРОК 5: ПЛАН «ПЕРЕХВАТ»";
      case "SECRET_SERVICE":
        return "УРОК 6: ДИРЕКТИВА «НОЛЬ»";
      case "LINE_UP":
        return "УРОК 7: ОЧНАЯ СТАВКА";
      default:
        return "";
    }
  };

  if (currentModule === "MENU") {
    return (
      <TutorialMenuView
        completedModules={completedModules}
        isRewardClaimed={isRewardClaimed}
        onStartModule={startModule}
        onExit={onExit}
        onFinish={onFinish}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-background-main flex justify-center overflow-hidden font-sans select-none text-zinc-100 h-full w-full"
    >
      <style>{`
        .tutorial-highlight-l1s2 button[title*="Маневр влево"]:nth-of-type(3),
        .tutorial-highlight-maniac button[title*="Маневр вниз"]:nth-of-type(3) {
          position: relative; z-index: 30;
          box-shadow: 0 0 20px rgba(245,158,11,0.9) !important;
          border-color: #f59e0b !important;
          background-color: rgba(245,158,11,0.3) !important;
          color: white !important;
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
        }
      `}</style>
      <div className="w-full max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto h-full flex flex-col justify-between relative overflow-hidden bg-background-main md:border-x md:border-border-subtle shadow-2xl">
        <div className="w-full flex items-center justify-between px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 shrink-0 border-b border-border-subtle bg-background-main z-20">
          <button
            onClick={() => setCurrentModule("MENU")}
            className="text-zinc-400 hover:text-white transition cursor-pointer text-xs font-black uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/10"
          >
            ← В архив
          </button>
          <h2 className="text-sm font-black tracking-widest text-emerald-400 uppercase text-center flex-1 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
            {getModuleTitle()}
          </h2>
          <div className="w-16 shrink-0" />
        </div>

        <div className="flex-1 w-full flex flex-col relative min-h-0 overflow-hidden">
          {/* Инструктивный блок */}
          <TutorialGuidePanel currentModule={currentModule} step={step} />

          {/* Игровое поле */}
          <div
            className={`flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden relative p-1 md:p-3 select-none ${
              currentModule === "BASICS" && step === 1 ? "tutorial-highlight-l1s2" : ""
            } ${currentModule === "MANIAC_KILLER" && step === 1 ? "tutorial-highlight-maniac" : ""}`}
          >
            <GameBoard
              board={board}
              currentRole={
                currentModule === "MANIAC_KILLER"
                  ? "KILLER"
                  : currentModule === "THIEF_ROBBER" || currentModule === "THIEF_POLICE"
                  ? "ROBBER"
                  : currentModule === "SECRET_SERVICE"
                  ? "SPY_P1"
                  : currentModule === "LINE_UP"
                  ? "DETECTIVE"
                  : "DETECTIVE"
              }
              onShift={handleShift}
              onCardClick={handleCardClick}
              selectedId={selectedId}
              lastShift={lastShift}
              activeAgentId={activeAgentId}
              adjacentIds={
                (currentModule === "BASICS" && step === 2) ||
                (currentModule === "MANIAC_KILLER" && step === 2) ||
                (currentModule === "THIEF_ROBBER" && step === 1) ||
                (currentModule === "SECRET_SERVICE" && step === 1) ||
                (currentModule === "LINE_UP" && step === 3)
                  ? adjacentIds
                  : []
              }
              targetVictimId={currentModule === "MANIAC_KILLER" ? targetVictimId : null}
              alibiIds={
                currentModule === "MANIAC_DETECTIVE" && step === 1
                  ? victimAdjacentIds.filter((id) => id !== "c4")
                  : []
              }
              radarPingIds={
                currentModule === "SECRET_SERVICE" && step === 3 ? radarAdjacentIds : []
              }
            />
          </div>

          {/* Нижняя панель действий */}
          <TutorialActionBar
            currentModule={currentModule}
            step={step}
            selectedId={selectedId}
            onKill={handleKill}
            onEscape={handleEscape}
            onArrest={handleArrest}
            onCleanup={handleCleanup}
            onRob={handleRob}
            onThiefDisguise={handleThiefDisguise}
            onPoliceBlock={handlePoliceBlock}
            onPoliceArrest={handlePoliceArrest}
            onInterrogate={handleInterrogate}
            onCaptureSpy={handleCaptureSpy}
            onAskQuestionDuel={handleAskQuestionDuel}
            onEliminateDuel={handleEliminateDuel}
            onAccuseDuel={handleAccuseDuel}
            onCompleteModule={handleCompleteModule}
          />

          {/* Модальное окно смены маски/прикрытия */}
          {isDisguiseModalOpen && newDisguiseChar && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
              <div className="w-full max-w-sm bg-zinc-950/85 backdrop-blur-xl border border-amber-500/50 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col items-center">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">
                  Смена маски
                </span>
                <h3 className="text-xl font-black text-zinc-100 mb-2">
                  Ваша новая тайная личность:
                </h3>
                <div className="text-base font-bold text-zinc-200 mb-4">{newDisguiseChar.name}</div>
                <button
                  onClick={handleConfirmDisguise}
                  className="w-full h-11 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Подтвердить маску
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
