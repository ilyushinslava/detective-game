import { useRef, useMemo, type Dispatch, type SetStateAction } from "react";
import type { GameState, Role, Character, GameModeType } from "../types/game";
import type { GameAction } from "../types/multiplayer";
import { partyService } from "../utils/partyPeer";
import { soundManager } from "../utils/audio";
import { triggerHaptic } from "../utils/haptics";
import { getAdjacentCharacters } from "../utils/gameLogic";
import { DUEL_CHARACTERS } from "../constants/duelCharacters";
import { filterCandidates } from "../utils/duelLogic";

export interface ActionItem {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export interface UseGameActionsParams {
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState>>;
  dispatchAction: (action: GameAction) => void;
  isHumanTurn: boolean;
  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  selectedCharacter: Character | null;
  killerAdjacentIds: string[];
  detectiveAdjacentIds: string[];
  activeAgentAdjacentIds: string[];
  isFirstTurnKiller: boolean;
  isCleanupAvailable: boolean;
  isKillerView: boolean;
  isKillerTurn: boolean;
  setErrorCardId: Dispatch<SetStateAction<string | null>>;
  setIsHandSheetOpen: Dispatch<SetStateAction<boolean>>;
  setIsQuestionCatalogOpen: Dispatch<SetStateAction<boolean>>;
  setIsCandidatesSheetOpen: Dispatch<SetStateAction<boolean>>;
  setIsAccuseModalOpen: Dispatch<SetStateAction<boolean>>;
  handleStartNewGame: (
    modeId: GameModeType,
    opponent: GameState["opponent"],
    playerRole: Role,
    playerCount?: number,
    targetTrophies?: number,
    maxTurns?: number,
    betAmount?: number
  ) => void;
}

export function useGameActions({
  gameState,
  setGameState,
  dispatchAction,
  isHumanTurn,
  selectedId,
  setSelectedId,
  selectedCharacter,
  killerAdjacentIds,
  detectiveAdjacentIds,
  activeAgentAdjacentIds,
  isFirstTurnKiller,
  isCleanupAvailable,
  isKillerView,
  isKillerTurn,
  setErrorCardId,
  setIsHandSheetOpen,
  setIsQuestionCatalogOpen,
  setIsCandidatesSheetOpen,
  setIsAccuseModalOpen,
  handleStartNewGame,
}: UseGameActionsParams) {
  const lastKillSoundTimeRef = useRef(0);

  const handleSelectDuelQuestion = (questionId: string) => {
    soundManager.play("radar");
    triggerHaptic("light");
    dispatchAction({
      type: "DUEL_ASK_QUESTION",
      payload: { questionId },
      senderId: "local",
      timestamp: Date.now(),
    });
  };

  const handleConfirmDuelAccusation = () => {
    if (!selectedId) return;
    dispatchAction({
      type: "DUEL_ACCUSE",
      payload: { targetId: selectedId },
      senderId: "local",
      timestamp: Date.now(),
    });
    setIsAccuseModalOpen(false);
    setSelectedId(null);
  };

  const handleShift = (
    type: "ROW" | "COL",
    index: number,
    direction: "FORWARD" | "BACKWARD"
  ) => {
    if (gameState.winner || isFirstTurnKiller || !isHumanTurn) return;
    soundManager.play("slide");
    triggerHaptic("light");
    setGameState((prev) =>
      prev.interrogationRadar ? { ...prev, interrogationRadar: null } : prev
    );
    dispatchAction({
      type: "SHIFT_BOARD",
      payload: { shiftType: type, index, direction },
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleKill = () => {
    if (!selectedId || gameState.currentTurn !== "KILLER" || !isHumanTurn)
      return;
    if (Date.now() - lastKillSoundTimeRef.current > 300) {
      soundManager.play("kill");
      lastKillSoundTimeRef.current = Date.now();
    }
    triggerHaptic("heavy");
    setGameState((prev) =>
      prev.interrogationRadar ? { ...prev, interrogationRadar: null } : prev
    );
    dispatchAction({
      type: "KILL_CHARACTER",
      payload: { targetId: selectedId },
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleRob = () => {
    if (!selectedId || gameState.currentTurn !== "KILLER" || !isHumanTurn)
      return;
    soundManager.play("steal");
    triggerHaptic("medium");
    dispatchAction({
      type: "ROB_NEIGHBOR",
      payload: { targetId: selectedId },
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleEscapeManiac = () => {
    if (gameState.currentTurn !== "KILLER" || !isHumanTurn) return;
    soundManager.play("disguise");
    triggerHaptic("medium");
    setGameState((prev) =>
      prev.interrogationRadar ? { ...prev, interrogationRadar: null } : prev
    );
    dispatchAction({
      type: "ESCAPE_MANIAC",
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleFastDisguise = (id: string) => {
    if (gameState.currentTurn !== "KILLER" || !isHumanTurn) return;
    soundManager.play("disguise");
    triggerHaptic("medium");
    dispatchAction({
      type: "FAST_DISGUISE",
      payload: { targetId: id },
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleAccuse = () => {
    if (!selectedId || gameState.currentTurn !== "DETECTIVE" || !isHumanTurn)
      return;
    const targetChar = gameState.board.flat().find((c) => c.id === selectedId);
    if (!targetChar || !targetChar.isAlive || targetChar.isExonerated) return;

    const isMiss =
      selectedId !== gameState.killerSecretId && !targetChar.hasBomb;
    if (isMiss) {
      soundManager.play("deny");
      triggerHaptic("error");
      setErrorCardId(selectedId);
      setTimeout(() => setErrorCardId(null), 500);
    } else {
      soundManager.play("arrest");
      triggerHaptic("medium");
    }

    setGameState((prev) =>
      prev.interrogationRadar ? { ...prev, interrogationRadar: null } : prev
    );
    dispatchAction({
      type: "ACCUSE",
      payload: { targetId: selectedId, isMiss, errorCardId: selectedId },
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleDisguise = () => {
    if (gameState.currentTurn !== "KILLER" || isFirstTurnKiller || !isHumanTurn)
      return;
    soundManager.play("disguise");
    triggerHaptic("medium");
    dispatchAction({
      type: "DISGUISE",
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleExonerateFromHand = (id: string) => {
    if (gameState.currentTurn !== "DETECTIVE" || !isHumanTurn) return;
    if (gameState.mode === "SKHVATKA" && gameState.inspectorChoices && gameState.inspectorChoices.length > 0) return;
    soundManager.play("radar");
    triggerHaptic("medium");
    dispatchAction({
      type: "EXONERATE",
      payload: { targetId: id },
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleCleanup = () => {
    if (!isCleanupAvailable || isFirstTurnKiller || !isHumanTurn) return;
    soundManager.play("slide");
    triggerHaptic("medium");
    dispatchAction({
      type: "CLEANUP",
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleSwearInOfficer = () => {
    if (!selectedId || gameState.currentTurn !== "DETECTIVE" || !isHumanTurn)
      return;
    soundManager.play("patrol");
    triggerHaptic("medium");
    dispatchAction({
      type: "SWEAR_IN_OFFICER",
      payload: { targetId: selectedId },
      senderId: "local",
      timestamp: Date.now(),
    } as any);
    setSelectedId(null);
  };

  const handleCaptureSpy = () => {
    if (!selectedId || gameState.mode !== "SECRET_SERVICE" || !isHumanTurn)
      return;

    const mySpyIndex = gameState.activeSpyIndex ?? 0;
    const mySpy = gameState.spies![mySpyIndex];
    const caughtSpy = gameState.spies?.find(
      (s) => s.id !== mySpy.id && s.secretId === selectedId
    );
    const isHit = Boolean(caughtSpy);
    const isMiss = !isHit;

    if (isMiss) {
      soundManager.play("deny");
      triggerHaptic("error");
      setErrorCardId(selectedId);
      setTimeout(() => setErrorCardId(null), 500);
    } else {
      soundManager.play("arrest");
      triggerHaptic("medium");
    }

    const nextSpyIndex = (mySpyIndex + 1) % (gameState.spies?.length || 3);
    const targetChar = gameState.board.flat().find((c) => c.id === selectedId);

    dispatchAction({
      type: "CAPTURE_SPY",
      payload: {
        targetId: selectedId,
        targetCardId: selectedId,
        isHit,
        isMiss,
                  revealedRole: targetChar?.name || caughtSpy?.name || null,
          caughtSpyId: caughtSpy?.id || null,
          nextSecretId: gameState.board.flat().find((c) => c.isAlive && c.id !== selectedId && c.id !== caughtSpy?.secretId && !gameState.spies?.some((s) => s.id !== caughtSpy?.id && s.secretId === c.id))?.id || null,
          attackerSpyIndex: mySpyIndex,
        nextSpyIndex,
        errorCardId: selectedId,
      } as any,
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleInterrogateSpy = () => {
    if (!selectedId || gameState.mode !== "SECRET_SERVICE" || !isHumanTurn)
      return;
    soundManager.play("radar");
    triggerHaptic("light");
    dispatchAction({
      type: "INTERROGATE",
      payload: { targetId: selectedId },
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleReset = () => {
    if (gameState.opponent === "ONLINE" && partyService.roomCode) {
      partyService.sendAction({
        type: "REQUEST_RESTART",
        payload: { requestedBy: partyService.isHost ? "HOST" : "GUEST" },
        senderId: "local",
      } as any);
    } else {
      handleStartNewGame(
        gameState.mode,
        gameState.opponent,
        gameState.playerRole,
        gameState.spies?.length ?? 3,
        gameState.spyTargetTrophies ?? 3,
        gameState.maxTurns ?? 16
      );
    }
  };

  const availableActions = useMemo<ActionItem[]>(() => {
    const actions: ActionItem[] = [];
    const isGameOver = gameState.winner !== null;

    if (gameState.mode === "LINE_UP") {
      actions.push({
        id: "duel_ask",
        label: "Каталог вопросов",
        onClick: () => setIsQuestionCatalogOpen(true),
        disabled: !isHumanTurn || isGameOver,
        className:
          "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 hover:from-blue-900 hover:via-blue-800 hover:to-blue-900 text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] border border-blue-500/70 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]",
      });
      actions.push({
        id: "duel_candidates",
        label: `Кандидаты (${
          filterCandidates(
            DUEL_CHARACTERS,
            gameState.duelHistory || [],
            gameState.currentTurn
          ).length
        })`,
        onClick: () => setIsCandidatesSheetOpen(true),
        disabled: isGameOver,
        className:
          "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 hover:from-blue-900 hover:via-blue-800 hover:to-blue-900 text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] border border-blue-500/70 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]",
      });
      actions.push({
        id: "duel_accuse",
        label: "Обвинить",
        onClick: () => setIsAccuseModalOpen(true),
        disabled: !isHumanTurn || !selectedId || isGameOver,
        className:
          "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-red-950 via-red-900 to-red-950 hover:from-red-900 hover:via-red-800 hover:to-red-900 text-white shadow-[0_8px_20px_rgba(220,38,38,0.35)] border border-red-600/70 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 col-span-2 active:scale-[0.98]",
      });
    } else if (gameState.mode === "SECRET_SERVICE") {
      const activeSpySecretId =
        gameState.spies?.[gameState.activeSpyIndex ?? 0]?.secretId;
      const validNeighbors = activeSpySecretId
        ? getAdjacentCharacters(gameState.board, activeSpySecretId).map(
            (c) => c.id
          )
        : [];
      const isNeighbor = Boolean(
        selectedId && validNeighbors.includes(selectedId)
      );
      const isSelfOrNeighbor = Boolean(
        selectedId &&
          (validNeighbors.includes(selectedId) ||
            selectedId === activeSpySecretId)
      );

      actions.push({
        id: "capture_spy",
        label: "Разоблачение",
        onClick: handleCaptureSpy,
        disabled:
          !isHumanTurn ||
          !selectedId ||
          !isNeighbor ||
          isGameOver ||
          !selectedCharacter?.isAlive,
        className:
          "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-red-950 via-red-900 to-red-950 hover:from-red-900 hover:via-red-800 hover:to-red-900 text-white shadow-[0_8px_20px_rgba(220,38,38,0.35)] border border-red-600/70 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]",
      });
      actions.push({
        id: "interrogate_spy",
        label: "Опрос свидетелей",
        onClick: handleInterrogateSpy,
        disabled:
          !isHumanTurn ||
          !selectedId ||
          !isSelfOrNeighbor ||
          isGameOver ||
          !selectedCharacter?.isAlive,
        className:
          "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 hover:from-blue-900 hover:via-blue-800 hover:to-blue-900 text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] border border-blue-500/70 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]",
      });
      actions.push({
        id: "cleanup_ss",
        label: "Зачистить",
        onClick: handleCleanup,
        disabled: !isHumanTurn || !isCleanupAvailable,
        className:
          "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-red-950 via-zinc-900 to-red-950 hover:from-red-900 hover:via-zinc-800 hover:to-red-900 text-red-200 hover:text-white border border-red-600/70 shadow-[0_8px_20px_rgba(220,38,38,0.35)] disabled:opacity-40 text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]",
      });
    } else {
      if (isKillerView) {
        if (gameState.mode === "THIEF_HUNT") {
          actions.push({
            id: "rob_basic",
            label: "Кража",
            onClick: handleRob,
            disabled:
              !isHumanTurn ||
              !selectedId ||
              (!killerAdjacentIds.includes(selectedId) &&
                selectedId !== gameState.killerSecretId) ||
              isGameOver ||
              Boolean(selectedCharacter?.isRobbed),
            className:
              "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-950 hover:from-zinc-800 hover:via-zinc-700 hover:to-zinc-900 text-zinc-100 shadow-[0_8px_20px_rgba(0,0,0,0.5)] border border-zinc-600/70 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]",
          });
          actions.push({
            id: "disguise_thief",
            label: "Конспирация",
            onClick: () => setIsHandSheetOpen(true),
            disabled: !isHumanTurn || isGameOver,
            className:
              "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-950 hover:from-zinc-800 hover:via-zinc-700 hover:to-zinc-900 text-zinc-100 shadow-[0_8px_20px_rgba(0,0,0,0.5)] border border-zinc-600/70 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]",
          });
        } else {
          actions.push({
            id: "kill_basic",
            label: "Ликвидация",
            onClick: handleKill,
            disabled:
              !isHumanTurn ||
              !selectedId ||
              !killerAdjacentIds.includes(selectedId) ||
              isGameOver,
            className:
              "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-red-950 via-red-900 to-red-950 hover:from-red-900 hover:via-red-800 hover:to-red-900 text-white shadow-[0_8px_20px_rgba(220,38,38,0.35)] border border-red-600/70 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]",
          });
        }

        if (gameState.mode === "SKHVATKA") {
          actions.push({
            id: "disguise_skhvatka",
            label: "Конспирация",
                          onClick: handleDisguise,
              disabled:
                !isHumanTurn ||
                isFirstTurnKiller ||
                gameState.evidenceDeck.length === 0 ||
                isGameOver,
              className:
                "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-950 hover:from-zinc-800 hover:via-zinc-700 hover:to-zinc-900 text-zinc-100 shadow-[0_8px_20px_rgba(0,0,0,0.5)] border border-zinc-600/70 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]",
          });
        }
        if (gameState.mode === "MANIAC_VS_OPERATIVE") {
          actions.push({
            id: "escape_maniac",
            label: "Конспирация",
                          onClick: handleEscapeManiac,
              disabled:
                !isHumanTurn ||
                gameState.evidenceDeck.length < 2 ||
                isGameOver,
              className:
                "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-950 hover:from-zinc-800 hover:via-zinc-700 hover:to-zinc-900 text-zinc-100 shadow-[0_8px_20px_rgba(0,0,0,0.5)] border border-zinc-600/70 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]",
          });
        }
      } else {
        actions.push({
          id: "accuse_basic",
          label: "Задержание",
          onClick: handleAccuse,
          disabled: (() => {
            if (
              !isHumanTurn ||
              !selectedId ||
              !selectedCharacter?.isAlive ||
              selectedCharacter?.isExonerated ||
              isGameOver
            )
              return true;
            if (
              gameState.mode === "THIEF_HUNT" &&
              gameState.uniformedOfficers?.includes(selectedId)
            ) {
              return true;
            }
            let isAdjacent = detectiveAdjacentIds.includes(selectedId);
            let isSelf = selectedId === gameState.detectiveSecretId;
            if (
              gameState.mode === "THIEF_HUNT" &&
              gameState.uniformedOfficers
            ) {
              const isNearOfficer = gameState.uniformedOfficers.some((offId) =>
                getAdjacentCharacters(gameState.board, offId)
                  .map((c) => c.id)
                  .includes(selectedId)
              );
              const isOfficerSelf =
                gameState.uniformedOfficers.includes(selectedId);
              isAdjacent = isAdjacent || isNearOfficer;
              isSelf = isSelf || isOfficerSelf;
            }
            return !isAdjacent && !isSelf;
          })(),
          className:
            "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 hover:from-blue-900 hover:via-blue-800 hover:to-blue-900 text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] border border-blue-500/70 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]",
        });

        if (gameState.mode === "THIEF_HUNT") {
          actions.push({
            id: "patrol_call",
            label: "Вызов патруля",
            onClick: handleSwearInOfficer,
            disabled:
              !isHumanTurn ||
              !selectedId ||
              !gameState.uniformedOfficers?.includes(selectedId) ||
              isGameOver ||
              gameState.evidenceDeck.length === 0,
            className:
              "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 hover:from-blue-900 hover:via-blue-800 hover:to-blue-900 text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] border border-blue-500/70 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]",
          });
        }
      }

      if (gameState.mode !== "THIEF_HUNT") {
        actions.push({
          id: "cleanup_basic",
          label: "Зачистить",
          onClick: handleCleanup,
          disabled: !isHumanTurn || !isCleanupAvailable,
          className:
            "py-1.5 sm:py-2 md:py-3.5 bg-zinc-900 border border-zinc-700 text-zinc-300 disabled:opacity-50 text-[9px] sm:text-[10px] md:text-xs font-bold rounded-xl transition disabled:cursor-not-allowed flex items-center justify-center gap-2",
        });
      }
    }

    return actions;
  }, [
    gameState.mode,
    gameState.winner,
    gameState.evidenceDeck.length,
    gameState.detectiveSecretId,
    gameState.killerSecretId,
    gameState.spies,
    gameState.activeSpyIndex,
    gameState.uniformedOfficers,
    gameState.board,
    gameState.duelHistory,
    gameState.currentTurn,
    isKillerView,
    isHumanTurn,
    selectedId,
    killerAdjacentIds,
    detectiveAdjacentIds,
    activeAgentAdjacentIds,
    isCleanupAvailable,
    isFirstTurnKiller,
    selectedCharacter,
    handleSelectDuelQuestion,
    handleConfirmDuelAccusation,
    handleCaptureSpy,
    handleInterrogateSpy,
    handleCleanup,
    handleRob,
    handleKill,
    handleDisguise,
    handleEscapeManiac,
    handleAccuse,
    handleSwearInOfficer,
    setIsCandidatesSheetOpen,
    setIsAccuseModalOpen,
    setIsHandSheetOpen,
    setIsQuestionCatalogOpen,
  ]);

  const targetActions = useMemo(
    () => availableActions.filter((a) => a.id !== "cleanup_ss" && a.id !== "cleanup_basic"),
    [availableActions]
  );

  const cleanupAction = useMemo(
    () => availableActions.find((a) => a.id === "cleanup_ss" || a.id === "cleanup_basic"),
    [availableActions]
  );

  return {
    handleSelectDuelQuestion,
    handleConfirmDuelAccusation,
    handleShift,
    handleKill,
    handleRob,
    handleEscapeManiac,
    handleFastDisguise,
    handleAccuse,
    handleDisguise,
    handleExonerateFromHand,
    handleCleanup,
    handleSwearInOfficer,
    handleCaptureSpy,
    handleInterrogateSpy,
    handleReset,
    availableActions,
    targetActions,
    cleanupAction,
  };
}
