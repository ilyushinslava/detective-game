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
  const [patrolId, setPatrolId] = useState<string | null>(null);

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
    setPatrolId(null);
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
    if (
      currentStepConfig.actionType === "CARD_ACTION" ||
      currentStepConfig.actionType === "SELECT_CARD"
    ) {
      const allowed = currentStepConfig.allowedCardIds || [];
      if (allowed.includes(id)) {
        setSelectedId(id);
        soundManager.play("confirm");
        triggerHaptic("success");
        if (currentStepConfig.actionType === "SELECT_CARD") {
          advanceStep();
        }
      } else {
        soundManager.play("error");
        triggerHaptic("warning");
      }
    }
  };

  const handleActionButtonClick = () => {
    if (!currentStepConfig) return;
    const actionKey = currentStepConfig.buttonActionKey;

    switch (actionKey) {
      case "KILL": {
        // Убиваем Елену Соколову c3
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
      case "CLEANUP": {
        // Зачистка: уплотняем живых наверх, выбывших вниз
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
      case "EXONERATE": {
        // Проверка алиби Марии Климовой c13
        setBoard((prev) =>
          prev.map((row) =>
            row.map((c) => (c.id === "c13" ? { ...c, isExonerated: true } : c))
          )
        );
        soundManager.play("radar");
        triggerHaptic("medium");
        advanceStep();
        break;
      }
      case "ARREST": {
        soundManager.play("arrest");
        triggerHaptic("success");
        advanceStep();
        break;
      }
      case "ROB": {
        // Кража у Анны Мороз c5
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
      case "DISGUISE": {
        setIsDisguiseModalOpen(true);
        break;
      }
      case "PATROL_CALL": {
        // Патрульный выставляется на клетку рядом с Софией Романовой
        setPatrolId("c16");
        // Переставляем c16 на [1][3] (индекс 8)
        setBoard((prev) => {
          const flat = prev.flat();
          const pIdx = flat.findIndex((c) => c.id === "c16");
          if (pIdx !== -1 && pIdx !== 8) {
            const temp = flat[8];
            flat[8] = { ...flat[pIdx], isExonerated: true };
            flat[pIdx] = temp;
          }
          const res: Character[][] = [];
          for (let r = 0; r < 5; r++) res.push(flat.slice(r * 5, r * 5 + 5));
          return res;
        });
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

  const handleConfirmDisguise = (_chosenChar: Character) => {
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

  // Кнопка действия активна, если ACTION_BUTTON или если для CARD_ACTION выбрана целевая карта
  const isActionEnabled = useMemo(() => {
    if (!currentStepConfig) return false;
    if (currentStepConfig.actionType === "ACTION_BUTTON") return true;
    if (currentStepConfig.actionType === "CARD_ACTION") {
      return Boolean(
        selectedId &&
        currentStepConfig.allowedCardIds &&
        currentStepConfig.allowedCardIds.includes(selectedId)
      );
    }
    return false;
  }, [currentStepConfig, selectedId]);

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
      {/* Слот 1: Шапка урока (фиксированная высота h-14 + pt-safe) */}
      <div className="h-14 shrink-0 flex items-center justify-between gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md z-20 box-content">
        <button
          onClick={() => setCurrentModule("MENU")}
          aria-label="В главное меню"
          className="w-11 h-11 shrink-0 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 active:scale-95 flex items-center justify-center transition cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <div className="flex-1 min-w-0 text-center flex flex-col items-center">
          <span className="text-[10px] font-sans text-blue-400 uppercase tracking-widest font-semibold truncate max-w-full">
            {moduleTitles[currentModule]}
          </span>
          <h2 className="text-xs sm:text-sm font-black tracking-wider text-zinc-100 uppercase truncate max-w-full">
            {currentStepConfig?.title || "Обучение"}
          </h2>
        </div>

        <div className="shrink-0 flex items-center justify-end">
          <span className="text-[11px] font-sans text-zinc-400 font-bold bg-zinc-900 px-2 py-1 rounded border border-white/10 whitespace-nowrap">
            <span className="font-mono text-zinc-200">{step}</span>
            <span className="font-mono text-zinc-500">/{currentStepConfig?.totalSteps || 1}</span>
          </span>
        </div>
      </div>

      {/* Слот 2: Панель брифинга (ВСЕГДА сверху под шапкой, фиксированная высота h-[84px] shrink-0) */}
      {currentStepConfig && (
        <TutorialGuidePanel stepConfig={currentStepConfig} />
      )}

      {/* Слот 3: Контейнер доски 5×5 (flex-1 min-h-0, абсолютно неподвижный) */}
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
            currentStepConfig?.step === 2 && lastShift
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

      {/* Слот 4: Нижняя панель действий (ВСЕГДА фиксированная высота h-[64px] shrink-0 + pb-safe) */}
      {currentStepConfig && (
        <TutorialActionBar
          stepConfig={currentStepConfig}
          isActionEnabled={isActionEnabled}
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
