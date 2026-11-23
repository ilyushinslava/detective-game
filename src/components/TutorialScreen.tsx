import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameBoard } from "./GameBoard";
import { shiftBoard, getAdjacentCharacters } from "../utils/gameLogic";
import { soundManager } from "../utils/audio";
import { triggerHaptic } from "../utils/haptics";
import type { Character, LastShift } from "../types/game";
import { ALL_CHARACTERS } from "../constants/characters";
import {
  type TutorialModule,
  type CanonicalTutorialModule,
  type TutorialStepConfig,
  getInitialBoard,
  TUTORIAL_STEPS_CONFIG,
  loadAndMigrateTutorialProgress,
  saveTutorialProgress,
  isTutorialRewardClaimed,
  markTutorialRewardClaimed,
  TutorialMenuView,
  TutorialGuidePanel,
  TutorialActionBar,
} from "./tutorial";

interface TutorialScreenProps {
  onExit: () => void;
  onFinish: () => void;
}

export const TutorialScreen: React.FC<TutorialScreenProps> = ({
  onExit,
  onFinish,
}) => {
  const [currentModule, setCurrentModule] = useState<TutorialModule>("MENU");
  const [step, setStep] = useState<number>(1);
  const [board, setBoard] = useState<Character[][]>(() => getInitialBoard("MENU"));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastShift, setLastShift] = useState<LastShift | null>(null);
  const [isModuleFinished, setIsModuleFinished] = useState<boolean>(false);
  const [isDisguiseModalOpen, setIsDisguiseModalOpen] = useState<boolean>(false);

  const [completedModules, setCompletedModules] = useState<CanonicalTutorialModule[]>(
    () => loadAndMigrateTutorialProgress()
  );

  const [rewardClaimed, setRewardClaimed] = useState<boolean>(() =>
    isTutorialRewardClaimed()
  );

  const currentStepConfig: TutorialStepConfig | null = useMemo(() => {
    if (currentModule === "MENU") return null;
    const steps = TUTORIAL_STEPS_CONFIG[currentModule];
    if (!steps) return null;
    return steps[step - 1] || steps[steps.length - 1];
  }, [currentModule, step]);

  const markModuleCompleted = (mod: CanonicalTutorialModule) => {
    soundManager.play("win");
    triggerHaptic("success");
    setCompletedModules((prev) => {
      if (prev.includes(mod)) return prev;
      const updated = [...prev, mod];
      saveTutorialProgress(updated);
      return updated;
    });
  };

  const handleClaimCourseReward = () => {
    markTutorialRewardClaimed();
    setRewardClaimed(true);
    onFinish();
  };

  const startModule = (mod: CanonicalTutorialModule) => {
    soundManager.play("click");
    triggerHaptic("light");
    setCurrentModule(mod);
    setStep(1);
    setSelectedId(null);
    setLastShift(null);
    setIsModuleFinished(false);
    setIsDisguiseModalOpen(false);
    setBoard(getInitialBoard(mod));
  };

  const advanceStep = () => {
    if (currentModule === "MENU" || !currentStepConfig) return;
    const totalSteps = currentStepConfig.totalSteps;
    if (step >= totalSteps) {
      setIsModuleFinished(true);
      markModuleCompleted(currentModule);
    } else {
      setStep((prev) => prev + 1);
      setSelectedId(null);
    }
  };

  const handleShift = (
    type: "ROW" | "COL",
    index: number,
    direction: "FORWARD" | "BACKWARD"
  ) => {
    if (!currentStepConfig) return;
    if (currentStepConfig.actionType !== "SHIFT" || !currentStepConfig.targetShift) {
      soundManager.play("error");
      triggerHaptic("error");
      return;
    }

    const target = currentStepConfig.targetShift;
    if (
      target.type === type &&
      target.index === index &&
      target.direction === direction
    ) {
      const nextBoard = shiftBoard(board, type, index, direction);
      setBoard(nextBoard);
      setLastShift({ type, index, direction });
      soundManager.play("slide");
      triggerHaptic("medium");
      advanceStep();
    } else {
      soundManager.play("error");
      triggerHaptic("warning");
    }
  };

  const handleCardClick = (id: string) => {
    if (!currentStepConfig) return;
    if (currentStepConfig.actionType !== "SELECT_CARD") return;

    const allowed = currentStepConfig.allowedCardIds || [];
    if (allowed.includes(id)) {
      setSelectedId(id);
      soundManager.play("confirm");
      triggerHaptic("success");
      advanceStep();
    } else {
      soundManager.play("error");
      triggerHaptic("warning");
    }
  };

  const handleActionButtonClick = () => {
    if (!currentStepConfig || currentStepConfig.actionType !== "ACTION_BUTTON") return;
    const actionKey = currentStepConfig.buttonActionKey;

    switch (actionKey) {
      case "KILL": {
        // Убиваем жертву c3
        setBoard((prev) =>
          prev.map((row) =>
            row.map((c) => (c.id === "c3" ? { ...c, isAlive: false } : c))
          )
        );
        soundManager.play("kill");
        triggerHaptic("heavy");
        advanceStep();
        break;
      }
      case "DISGUISE": {
        setIsDisguiseModalOpen(true);
        break;
      }
      case "ARREST": {
        soundManager.play("arrest");
        triggerHaptic("success");
        advanceStep();
        break;
      }
      case "CLEANUP": {
        // Сдвигаем погибших вниз поля
        const allChars = board.flat();
        const alive = allChars.filter((c) => c.isAlive);
        const dead = allChars.filter((c) => !c.isAlive);
        const rearranged = [...alive, ...dead];
        const newBoard: Character[][] = [];
        for (let r = 0; r < 5; r++) {
          newBoard.push(rearranged.slice(r * 5, r * 5 + 5));
        }
        setBoard(newBoard);
        soundManager.play("slide");
        triggerHaptic("medium");
        advanceStep();
        break;
      }
      case "ROB": {
        // Метим ограбленным c5
        setBoard((prev) =>
          prev.map((row) =>
            row.map((c) => (c.id === "c5" ? { ...c, isRobbed: true } : c))
          )
        );
        soundManager.play("steal");
        triggerHaptic("success");
        advanceStep();
        break;
      }
      case "PATROL": {
        // Метим патрулем c7
        setBoard((prev) =>
          prev.map((row) =>
            row.map((c) => (c.id === "c7" ? { ...c, isExonerated: true } : c))
          )
        );
        soundManager.play("patrol");
        triggerHaptic("medium");
        advanceStep();
        break;
      }
      case "INTERROGATE": {
        soundManager.play("radar");
        triggerHaptic("medium");
        advanceStep();
        break;
      }
      case "EXPOSE_SPY": {
        soundManager.play("arrest");
        triggerHaptic("success");
        advanceStep();
        break;
      }
      default:
        advanceStep();
        break;
    }
  };

  const handleConfirmDisguise = (chosenChar: Character) => {
    soundManager.play("disguise");
    triggerHaptic("success");
    setIsDisguiseModalOpen(false);
    advanceStep();
  };

  const handleFinishCurrentModule = () => {
    soundManager.play("win");
    setCurrentModule("MENU");
    setIsModuleFinished(false);
    setStep(1);
    setSelectedId(null);
  };

  // Вычисляем соседей для подсветки 3x3 зоны
  const adjacentIds = useMemo(() => {
    if (!currentStepConfig?.highlightNeighborCenterId) return [];
    return getAdjacentCharacters(board, currentStepConfig.highlightNeighborCenterId);
  }, [board, currentStepConfig]);

  if (currentModule === "MENU") {
    return (
      <TutorialMenuView
        completedModules={completedModules}
        isRewardClaimed={rewardClaimed}
        onStartModule={startModule}
        onExit={onExit}
        onFinish={handleClaimCourseReward}
      />
    );
  }

  const moduleTitles: Record<CanonicalTutorialModule, string> = {
    MANIAC: "1. Почерк убийцы",
    THIEF: "2. Оцепление",
    SECRET_SERVICE: "3. Директива «Ноль»",
  };

  return (
    <div className="fixed inset-0 z-[100] h-[100dvh] w-full bg-[#080a0f] flex flex-col justify-between overflow-hidden select-none font-sans text-zinc-100">
      {/* Шапка урока */}
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md shrink-0 z-20">
        <button
          onClick={() => setCurrentModule("MENU")}
          className="text-zinc-400 hover:text-white transition cursor-pointer text-xs font-semibold uppercase tracking-wider bg-zinc-900/80 px-3 py-1.5 min-h-[44px] rounded-lg border border-white/10 hover:border-white/20 active:scale-95 flex items-center justify-center touch-manipulation"
        >
          ← В меню
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-semibold">
            {moduleTitles[currentModule]}
          </span>
          <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">
            {currentStepConfig?.title || "Обучение"}
          </h2>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono text-zinc-400 font-bold bg-zinc-900 px-2 py-1 rounded border border-white/10">
            {step}/{currentStepConfig?.totalSteps || 1}
          </span>
        </div>
      </div>

      {/* Верхний слот подсказки (если цель внизу или в центре) */}
      {currentStepConfig && currentStepConfig.targetPosition === "top" && (
        <TutorialGuidePanel stepConfig={currentStepConfig} />
      )}

      {/* Контейнер доски 5×5 */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-1 sm:p-2 relative overflow-hidden">
        <GameBoard
          mode={
            currentModule === "MANIAC"
              ? "MANIAC_VS_OPERATIVE"
              : currentModule === "THIEF"
                ? "THIEF_HUNT"
                : "SECRET_SERVICE"
          }
          board={board}
          lastShift={lastShift}
          blockedShift={
            currentStepConfig?.actionType === "SELECT_CARD" && lastShift
              ? { type: lastShift.type, index: lastShift.index }
              : null
          }
          highlightedArrowId={currentStepConfig?.highlightedArrowId || null}
          myCharacterId={currentStepConfig?.myCharacterId || null}
          selectedCharacterId={selectedId || currentStepConfig?.targetCardId || null}
          targetVictimId={currentStepConfig?.targetCardId || undefined}
          radarTargetId={currentStepConfig?.radarTargetId || undefined}
          radarColorClass={
            currentStepConfig?.neighborRole === "red"
              ? "border-rose-500 ring-2 ring-rose-500/70"
              : "border-blue-500 ring-2 ring-blue-500/70"
          }
          myRoleColor={currentStepConfig?.neighborRole || "blue"}
          alibiIds={currentStepConfig?.alibiCardIds || []}
          onShift={handleShift}
          onSelectCharacter={handleCardClick}
          onCardClick={handleCardClick}
        />
      </div>

      {/* Нижний слот подсказки (если цель вверху) */}
      {currentStepConfig && currentStepConfig.targetPosition === "bottom" && (
        <TutorialGuidePanel stepConfig={currentStepConfig} />
      )}

      {/* Нижняя панель действий */}
      {currentStepConfig && (
        <TutorialActionBar
          stepConfig={currentStepConfig}
          isActionEnabled={currentStepConfig.actionType === "ACTION_BUTTON"}
          isModuleFinished={isModuleFinished}
          onActionButtonClick={handleActionButtonClick}
          onFinishModuleClick={handleFinishCurrentModule}
        />
      )}

      {/* Модальное окно смены маски */}
      <AnimatePresence>
        {isDisguiseModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0e17] border border-white/15 rounded-2xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1 text-center">
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-semibold">
                  Конспирация
                </span>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Новая маска: София Романова
                </h3>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  Примите новую тайную личность, чтобы полиция потеряла ваш след в городе.
                </p>
              </div>

              <div className="flex items-center justify-center py-2">
                <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-400/80 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                  <img
                    src={ALL_CHARACTERS.find((c) => c.id === "c7")?.image}
                    alt="София Романова"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <button
                onClick={() =>
                  handleConfirmDisguise(
                    ALL_CHARACTERS.find((c) => c.id === "c7") || board[0][0]
                  )
                }
                className="w-full py-3 px-4 rounded-xl min-h-[44px] font-semibold text-xs tracking-wider uppercase bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition cursor-pointer touch-manipulation active:scale-98"
              >
                Подтвердить маску
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
