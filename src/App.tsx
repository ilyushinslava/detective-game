import { useState, useRef, useEffect, useMemo } from "react";
import { SplashScreen } from './components/SplashScreen';
import { type GameModeType, type OpponentType, type Role, type GameState, SPY_COLORS } from "./types/game";
import { GameBoard } from "./components/GameBoard";
import { DetectiveHand } from "./components/DetectiveHand";
import { ThiefHand } from "./components/ThiefHand";
import { RoleRevealModal } from "./components/RoleRevealModal";
import { GameOverModal } from "./components/GameOverModal";
import { MainMenu } from "./components/MainMenu";
import { GameModalsContainer } from "./components/GameModalsContainer";
import { usePlayerProfile } from "./utils/usePlayerProfile";
import { partyService } from "./utils/partyPeer";
import { useMultiplayer } from "./utils/useMultiplayer";
import { useGameLog } from "./hooks/useGameLog";
import { useGameTimer } from "./hooks/useGameTimer";
import { useMatchEndHandler } from "./hooks/useMatchEndHandler";
import { useAiTurn } from "./hooks/useAiTurn";
import { useGameActions } from "./hooks/useGameActions";
import { useBoardVisuals } from "./hooks/useBoardVisuals";
import { createInitialState } from "./utils/gameLogic";
import { soundManager } from "./utils/audio";
import { triggerHaptic } from "./utils/haptics";
import { RoleCards } from "./components/RoleCards";
import type { GameAction } from "./types/multiplayer";
import { gameReducer } from "./utils/gameReducer";
import { IdentityRevealModal } from "./components/IdentityRevealModal";

const characterImages = import.meta.glob<{ default: string }>(
  "./assets/characters/*.webp",
  { eager: true }
);

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [, setActiveMode] = useState<GameModeType>("SKHVATKA");
  const [isLobbyOpen, setIsLobbyOpen] = useState(true);
  const [hasStartedEver, setHasStartedEver] = useState(false);
  const {
    profile,
    updateProfile,
    awardPrize,
    recordMatchResult,
  } = usePlayerProfile();
  const matchResultRecordedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<
    "LOBBY" | "TABLES" | "TOP" | "SHOP"
  >("LOBBY");

  const [gameState, setGameState] = useState(() =>
    createInitialState("SKHVATKA", "AI", "DETECTIVE", 3, 3, 16, profile.nickname)
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedInspectorChoiceId, setSelectedInspectorChoiceId] = useState<string | null>(null);
  const [isRevealConfirmed, setIsRevealConfirmed] = useState(false);
  const [isIntroPhase, setIsIntroPhase] = useState(false);
  const [showKillerRole, setShowKillerRole] = useState(false);
  const [showDetectiveRole, setShowDetectiveRole] = useState(false);
  const [showSpyP1Role, setShowSpyP1Role] = useState(false);
  const [showSpyP2Role, setShowSpyP2Role] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [errorCardId, setErrorCardId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (import.meta.env.DEV && (e.code === "Backquote" || e.key === "`")) {
        setIsDevPanelOpen((prev) => !prev);
      }
    };
    const handleUserInteraction = () => {
      soundManager.unlockAudioContext();
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handleUserInteraction, { once: true, passive: true });
    window.addEventListener("keydown", handleUserInteraction, { once: true, passive: true });
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isHandSheetOpen, setIsHandSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isChoiceSheetMinimized, setIsChoiceSheetMinimized] = useState(false);
  const [isInspectorPassConfirmed, setIsInspectorPassConfirmed] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; name: string; id: string } | null>(null);

  const [isQuestionCatalogOpen, setIsQuestionCatalogOpen] = useState(false);
  const [isCandidatesSheetOpen, setIsCandidatesSheetOpen] = useState(false);
  const [isAccuseModalOpen, setIsAccuseModalOpen] = useState(false);

  const [isSfxEnabled, setIsSfxEnabled] = useState(soundManager.getSfxEnabled());
  const [isAmbientEnabled, setIsAmbientEnabled] = useState(soundManager.getAmbientEnabled());
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(() => localStorage.getItem("crime_city_haptics") !== "false");

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const dispatchAction = (action: GameAction) => {
    if (gameStateRef.current.opponent === "ONLINE") {
      partyService.sendAction(action);
      return;
    }
    setGameState((prev) => {
      const nextState = gameReducer(prev, action);
      return nextState;
    });
  };

  const { secondsElapsed, setSecondsElapsed } = useGameTimer({
    hasStartedEver,
    isIntroPhase,
    winner: gameState.winner,
  });

  const {
    isOpponentConnected,
    opponentDisconnectedNotice,
    setOpponentDisconnectedNotice,
    rematchTimer,
    acceptRestart,
    rejectRestart,
    handleExitToMenu: exitToMenuMultiplayer,
  } = useMultiplayer({
    gameState,
    setGameState,
    profile,
    setActiveMode,
    setIsLobbyOpen,
    setHasStartedEver,
    setIsIntroPhase,
    setToastMessage,
    dispatchAction,
    matchResultRecordedRef,
    setSelectedId,
    setSelectedInspectorChoiceId,
    setSecondsElapsed,
    setIsPauseOpen,
  });

  const {
    unreadLogCount,
    setUnreadLogCount,
    logContainerRef,
  } = useGameLog({
    log: gameState.log,
    isLogOpen,
  });

  useMatchEndHandler({
    gameState,
    matchResultRecordedRef,
    awardPrize,
    recordMatchResult,
  });

  const { isAIThinking } = useAiTurn({
    gameState,
    setGameState,
    isIntroPhase,
    isLobbyOpen,
    setSelectedId,
    setToastMessage,
  });

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const {
    allChars,
    killerChar,
    detectiveChar,
    inspectorChoices,
    isCleanupAvailable,
    isFirstTurnKiller,
    killerAdjacentIds,
    detectiveAdjacentIds,
    effectiveRadarTargetId,
    effectiveRadarCellIds,
    effectiveRadarColorClass,
    isPVP,
    isKillerTurn,
    isDetectiveTurn,
    isKillerView,
    isDetectiveView,
    myCharacterId,
    role1Name,
    role2Name,
    currentRoleName,
    actionPanelRoleName,
    isHumanTurn,
    activeAgentAdjacentIds,
    canPeekKiller,
    canPeekDetective,
    killerNameText,
    isInspectorPending,
    detectiveNameText,
    pillClasses,
    dotClasses,
  } = useBoardVisuals({
    gameState,
    selectedInspectorChoiceId,
    showKillerRole,
    showDetectiveRole,
    showSpyP1Role,
    showSpyP2Role,
    isAIThinking,
  });

  const handleSelectInspectorRole = (chosenId: string) => {
    dispatchAction({
      type: "SET_INSPECTOR_ROLE",
      payload: { chosenId },
      senderId: "local",
      timestamp: Date.now(),
    } as any);
  };

  const handleStartNewGame = (
    modeId: GameModeType,
    opponent: OpponentType,
    playerRole: Role,
    playerCount: number = 3,
    targetTrophies: number = 3,
    maxTurns: number = 0,
    betAmount: number = 250
  ) => {
    matchResultRecordedRef.current = false;

    const actualPlayerRole =
      opponent === "ONLINE"
        ? (partyService as any).role || (partyService.isHost ? "KILLER" : "DETECTIVE")
        : playerRole;

    let newState: GameState;
    if (opponent === "ONLINE" && partyService.lastSyncedState) {
      newState = {
        ...partyService.lastSyncedState,
        opponent: "ONLINE",
        playerRole: actualPlayerRole,
      };
    } else {
      newState = createInitialState(
        modeId,
        opponent,
        actualPlayerRole,
        playerCount,
        targetTrophies,
        maxTurns,
        opponent === "PVP" ? undefined : profile.nickname
      );
    }

    if (opponent === "ONLINE") {
      newState.matchPot = betAmount * 2;
      newState.matchBet = betAmount;
    }

    setActiveMode(modeId);
    setGameState(newState);
    setSelectedId(null);
    setSelectedInspectorChoiceId(null);
    setIsRevealConfirmed(false);
    setIsInspectorPassConfirmed(false);
    setShowKillerRole(false);
    setShowDetectiveRole(false);
    setShowSpyP1Role(false);
    setShowSpyP2Role(false);
    setHasStartedEver(true);
    setIsIntroPhase(true);
    setIsLobbyOpen(false);
    setSecondsElapsed(0);
  };

  const handleResumeGame = () => {
    setIsLobbyOpen(false);
  };

  const handleExitToMenu = () => {
    if (gameState.winner) {
      setHasStartedEver(false);
    }
    exitToMenuMultiplayer();
  };

  const selectedCharacter = useMemo(() => {
    if (!selectedId) return null;
    return gameState.board.flat().find((c) => c.id === selectedId) ?? null;
  }, [gameState.board, selectedId]);

  const {
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
    targetActions,
    cleanupAction,
  } = useGameActions({
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
  });

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col bg-[#080a0f] overflow-hidden select-none">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      <GameModalsContainer
        isQuestionCatalogOpen={isQuestionCatalogOpen}
        onCloseQuestionCatalog={() => setIsQuestionCatalogOpen(false)}
        onSelectDuelQuestion={handleSelectDuelQuestion}
        isCandidatesSheetOpen={isCandidatesSheetOpen}
        onCloseCandidatesSheet={() => setIsCandidatesSheetOpen(false)}
        duelHistory={gameState.duelHistory || []}
        playerRole={gameState.playerRole}
        onSelectCandidate={(id) => {
          setSelectedId(id);
          setIsAccuseModalOpen(true);
        }}
        isAccuseModalOpen={isAccuseModalOpen}
        selectedId={selectedId}
        accusedTargets={gameState.accusedTargets}
        currentTurn={gameState.currentTurn}
        onCloseAccuseModal={() => setIsAccuseModalOpen(false)}
        onConfirmDuelAccusation={handleConfirmDuelAccusation}
        isNotebookOpen={isNotebookOpen}
        onCloseNotebook={() => setIsNotebookOpen(false)}
        allCharacters={allChars}
        characterImages={characterImages}
        toastMessage={toastMessage}
        onCloseToast={() => setToastMessage(null)}
        restartRequestedBy={gameState.restartRequestedBy}
        matchBet={gameState.matchBet || 250}
        rematchTimer={rematchTimer}
        onAcceptRestart={acceptRestart}
        onRejectRestart={rejectRestart}
        onCancelWaitingRestart={() => {
          dispatchAction({ type: "REJECT_RESTART", senderId: "local" });
          setGameState((prev) => ({ ...prev, restartRequestedBy: undefined }));
        }}
        isOpponentDisconnectedNotice={Boolean(opponentDisconnectedNotice)}
        onExitToMenu={handleExitToMenu}
        isPauseOpen={isPauseOpen}
        onClosePause={() => setIsPauseOpen(false)}
        onResumeGame={() => setIsPauseOpen(false)}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenDevPanel={import.meta.env.DEV ? () => setIsDevPanelOpen(true) : undefined}
        isRulesOpen={isRulesOpen}
        onCloseRules={() => setIsRulesOpen(false)}
        isSfxEnabled={isSfxEnabled}
        isAmbientEnabled={isAmbientEnabled}
        isHapticsEnabled={isHapticsEnabled}
        onToggleSfx={() => setIsSfxEnabled(soundManager.toggleSfx())}
        onToggleAmbient={() => setIsAmbientEnabled(soundManager.toggleAmbient())}
        onToggleHaptics={() => {
          const newVal = !isHapticsEnabled;
          setIsHapticsEnabled(newVal);
          localStorage.setItem("crime_city_haptics", newVal ? "true" : "false");
          if (newVal) triggerHaptic("medium");
        }}
        fullscreenCard={fullscreenImage}
        onCloseFullscreenCard={() => setFullscreenImage(null)}
        isDevPanelOpen={import.meta.env.DEV ? isDevPanelOpen : false}
        onCloseDevPanel={() => setIsDevPanelOpen(false)}
        cash={profile.cash}
        onForceWin={(winner, forcedMode) => {
          setIsIntroPhase(false);
          setIsPauseOpen(false);
          setIsChoiceSheetMinimized(false);
          setGameState((prev) => ({
            ...prev,
            mode: forcedMode || prev.mode,
            winner,
            log: [...prev.log, `[DEV] Принудительная победа: ${winner} (${forcedMode || prev.mode})`],
          }));
        }}
        onTriggerInspectorChoice={() => {
          setGameState((prev) => {
            const all = prev.board.flat();
            const choices = all.slice(0, 4).map((c) => c.id);
            return {
              ...prev,
              mode: "SKHVATKA",
              currentTurn: "DETECTIVE",
              playerRole: "DETECTIVE",
              killCount: Math.max(prev.killCount, 1),
              inspectorChoices: choices,
              log: [...prev.log, "[DEV] Принудительный выбор личности Инспектора"],
            };
          });
          setIsChoiceSheetMinimized(false);
          setIsIntroPhase(false);
        }}
        onResetToMenu={handleExitToMenu}
        onAddCash={(amount) => {
          awardPrize(amount);
        }}
        onResetCash={() => {
          updateProfile({ cash: 0 });
        }}
        onToggleTurn={() => {
          setGameState((prev) => ({
            ...prev,
            currentTurn: prev.currentTurn === "KILLER" ? "DETECTIVE" : "KILLER",
            log: [...prev.log, "[DEV] Переключение очередности хода"],
          }));
        }}
        onAddKill={() => {
          setGameState((prev) => ({
            ...prev,
            killCount: prev.killCount + 1,
            log: [...prev.log, `[DEV] +1 Убийство (всего: ${prev.killCount + 1})`],
          }));
        }}
        onTriggerIntro={() => {
          setIsIntroPhase(true);
        }}
        onTriggerRestartRequest={() => {
          setGameState((prev) => ({
            ...prev,
            restartRequestedBy: prev.playerRole === "KILLER" ? "GUEST" : "HOST",
          }));
        }}
        onTriggerOpponentLeft={() => {
          setOpponentDisconnectedNotice(true);
        }}
        onTriggerDisguiseModal={() => {
          setGameState((prev) => ({ ...prev, disguisedNotification: { roleName: "Бандит", newSecretId: prev.board[0][0].id } }));
        }}
        onTriggerCaughtSpyModal={() => {
          setGameState((prev) => ({ ...prev, justCaughtSpyId: prev.spies?.[0]?.id || "p1" }));
        }}
        onTriggerGameOver={() => {
          setGameState((prev) => ({ ...prev, winner: prev.winner || "KILLER" }));
        }}
        onClearSession={() => {
          sessionStorage.clear();
          localStorage.clear();
          window.location.reload();
        }}
      />

      <div className="w-full max-w-7xl mx-auto h-full relative flex flex-col overflow-hidden"> 
        {isLobbyOpen && (
          <MainMenu
            profile={profile}
            onUpdateProfile={updateProfile}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onStartGame={handleStartNewGame}
            hasActiveGame={Boolean(!gameState.winner && hasStartedEver && gameState.board?.length >= 5 && gameState.log?.length > 2)}
            onResumeGame={handleResumeGame}
            onOpenRules={() => setIsRulesOpen(true)}
            onOpenDevPanel={import.meta.env.DEV ? () => setIsDevPanelOpen(true) : undefined}
          />
        )}

        {isIntroPhase && !isLobbyOpen && (
          <RoleRevealModal
            mode={gameState.mode}
            opponent={gameState.opponent}
            playerRole={gameState.playerRole}
            isOpponentConnected={isOpponentConnected}
            onCancelMatch={handleExitToMenu}
            role1Name={
              gameState.mode === "SECRET_SERVICE"
                ? (gameState.opponent === "PVP" ? "Фантом" : (gameState.spies?.[0]?.name || "Агент 1"))
                : partyService.isHost
                  ? profile.nickname || "Бандит"
                  : "Бандит"
            }
            role2Name={
              gameState.mode === "SECRET_SERVICE"
                ? (gameState.opponent === "PVP" ? "Призрак" : (gameState.spies?.[1]?.name || "Агент 2"))
                : !partyService.isHost
                  ? profile.nickname || "Инспектор"
                  : "Инспектор"
            }
            killer={
              gameState.mode === "SECRET_SERVICE"
                ? gameState.spies && gameState.spies.length > 1
                  ? gameState.opponent === "ONLINE"
                    ? partyService.isHost
                      ? allChars.find((c) => c.id === gameState.spies![0].secretId)
                      : allChars.find((c) => c.id === gameState.spies![1].secretId)
                    : allChars.find((c) => c.id === gameState.spies![1].secretId)
                  : undefined
                : (gameState.opponent === "AI" || gameState.opponent === "ONLINE") &&
                    gameState.playerRole === "DETECTIVE"
                  ? undefined
                  : killerChar
            }
            detective={
              gameState.mode === "SECRET_SERVICE"
                ? gameState.spies && gameState.spies.length > 0
                  ? gameState.opponent === "ONLINE"
                    ? partyService.isHost
                      ? allChars.find((c) => c.id === gameState.spies![0].secretId)
                      : allChars.find((c) => c.id === gameState.spies![1].secretId)
                    : allChars.find((c) => c.id === gameState.spies![0].secretId)
                  : undefined
                : (gameState.opponent === "AI" || gameState.opponent === "ONLINE") &&
                    gameState.playerRole === "KILLER"
                  ? undefined
                  : detectiveChar
            }
            inspectorChoices={inspectorChoices}
            onSelectDetectiveRole={handleSelectInspectorRole}
            onComplete={() => setIsIntroPhase(false)}
            onReady={() => {
              if (gameState.opponent === "ONLINE") {
                partyService.sendAction({ type: "PLAYER_READY", senderId: "local" });
              }
            }}
          />
        )}

        {!isLobbyOpen && hasStartedEver && gameState.mode === "SKHVATKA" && Boolean(gameState.inspectorChoices && gameState.inspectorChoices.length > 0) && isDetectiveView && isDetectiveTurn && !gameState.winner && !isIntroPhase && (
          <div className="fixed inset-0 z-40 flex flex-col items-center justify-end sm:justify-center p-4 select-none pointer-events-none overflow-hidden pt-16">
            {gameState.opponent === "PVP" && !isInspectorPassConfirmed ? (
              <div className="absolute inset-0 bg-[#080a0f]/95 backdrop-blur-xl flex items-center justify-center p-4 pointer-events-auto">
                <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-blue-950/50 border border-blue-500/50 flex items-center justify-center text-blue-400 font-black text-2xl mb-6 shadow-[0_0_20px_rgba(59,130,246,0.25)]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
                    Секретные данные
                  </span>
                  <h2 className="text-xl font-black text-zinc-100 uppercase tracking-wider mb-2">
                    Передайте экран Инспектору
                  </h2>
                  <p className="text-[10px] font-mono text-zinc-500 mb-6 uppercase tracking-widest leading-relaxed">
                    Убедитесь, что Бандит не смотрит на экран перед выбором личности.
                  </p>
                  <button
                    onClick={() => setIsInspectorPassConfirmed(true)}
                    className="w-full h-14 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 hover:from-blue-600 hover:to-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition cursor-pointer shadow-[0_0_20px_rgba(59,130,246,0.45)] flex items-center justify-center gap-2 shrink-0"
                  >
                    <span>Я держу телефон один</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div 
                  className={`absolute inset-0 bg-black/35 transition-opacity duration-500 ease-out pointer-events-auto ${isChoiceSheetMinimized ? "opacity-0 pointer-events-none" : "opacity-100"}`} 
                  onClick={() => setIsChoiceSheetMinimized(true)} 
                />
                
                <div className={`absolute bottom-8 transition-all duration-500 ease-out transform pointer-events-auto flex items-center gap-2 ${isChoiceSheetMinimized ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"}`}>
                  <button
                    onClick={() => setIsChoiceSheetMinimized(false)}
                    className="h-12 px-5 bg-zinc-950/90 backdrop-blur-md border border-blue-500/30 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2 text-blue-400 font-black uppercase tracking-widest text-[10px] hover:bg-zinc-900 transition"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    <span>Выбор личности</span>
                  </button>
                  {selectedInspectorChoiceId && (
                    <button
                      onClick={() => {
                        handleSelectInspectorRole(selectedInspectorChoiceId);
                        setSelectedInspectorChoiceId(null);
                        setIsChoiceSheetMinimized(false);
                        setIsInspectorPassConfirmed(false);
                      }}
                      className="h-12 px-5 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white font-black uppercase tracking-widest text-[10px] rounded-full shadow-[0_0_20px_rgba(59,130,246,0.45)] border-t border-white/25 flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <span>Подтвердить</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                  )}
                </div>

                <div className={`relative w-full max-w-md bg-zinc-950/60 backdrop-blur-md border border-blue-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col text-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform pointer-events-auto ${isChoiceSheetMinimized ? "translate-y-[110%] opacity-0" : "translate-y-0 opacity-100"}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                      Оперативное назначение
                    </span>
                    <button
                      onClick={() => setIsChoiceSheetMinimized(true)}
                      className="text-[9px] font-black text-zinc-400 hover:text-white uppercase tracking-widest flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-white/5 transition"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Осмотреть поле
                    </button>
                  </div>
                  <h2 className="text-xl font-black text-zinc-100 uppercase tracking-wider mb-2">
                    Выберите тайную личность (1 из 4)
                  </h2>
                  <p className="text-[10px] font-mono text-zinc-500 mb-6 uppercase tracking-widest">
                    Остальные 3 карты составят ваше досье алиби.
                  </p>
                  <div className="grid grid-cols-2 gap-3 w-full mb-6">
                    {inspectorChoices.map((char) => {
                      const isSelected = selectedInspectorChoiceId === char.id;
                      return (
                        <div
                          key={char.id}
                          onClick={() => setSelectedInspectorChoiceId(char.id)}
                          className={`relative flex flex-col justify-between p-4 rounded-2xl border text-left cursor-pointer transition select-none min-h-[105px] overflow-hidden ${
                            isSelected
                              ? "bg-blue-950/40 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.35)] scale-[1.02]"
                              : "bg-zinc-900/50 border-white/5 hover:border-white/20 text-zinc-400"
                          }`}
                        >
                          <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                            <span>#{char.id.replace("c", "").padStart(2, "0")}</span>
                            {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.9)]" />}
                          </div>
                          <div className={`relative z-10 text-xs font-black uppercase tracking-wider mt-3 ${isSelected ? "text-blue-100" : "text-zinc-200"}`}>
                            {char.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      if (selectedInspectorChoiceId) {
                        handleSelectInspectorRole(selectedInspectorChoiceId);
                        setSelectedInspectorChoiceId(null);
                        setIsChoiceSheetMinimized(false);
                        setIsInspectorPassConfirmed(false);
                      }
                    }}
                    disabled={!selectedInspectorChoiceId || !inspectorChoices.some((c) => c.id === selectedInspectorChoiceId)}
                    className="w-full h-14 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 hover:from-blue-600 hover:to-blue-500 disabled:from-zinc-800 disabled:to-zinc-900 disabled:text-zinc-600 disabled:shadow-none text-white text-[10px] font-black uppercase tracking-widest rounded-full transition cursor-pointer disabled:cursor-not-allowed shadow-[0_0_20px_rgba(59,130,246,0.45)] flex items-center justify-center gap-2 shrink-0"
                  >
                    <span>Подтвердить личность</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {!isLobbyOpen && !isIntroPhase && hasStartedEver && gameState.opponent !== undefined && (
        <>
        <header className="w-full px-4 sm:px-6 pb-2.5 bg-zinc-950 border-b border-zinc-800 shrink-0 relative flex items-center justify-between z-50 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPauseOpen(true)}
              className="w-8 h-8 md:w-11 md:h-11 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer"
              title="Пауза и меню"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 md:w-5 md:h-5">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
            <button
              onClick={() => setIsNotebookOpen(true)}
              className="w-8 h-8 md:w-11 md:h-11 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer"
              title="Блокнот подозреваемых"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 md:w-5 md:h-5">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </button>
            <button
              onClick={() => {
                setIsLogOpen(true);
                setUnreadLogCount(0);
              }}
              className="relative w-8 h-8 md:w-11 md:h-11 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer lg:hidden"
              title="Блокнот расследования"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 md:w-5 md:h-5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              {unreadLogCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                  {unreadLogCount}
                </span>
              )}
            </button>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 flex justify-center shrink-0">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5 rounded-full border text-[10px] md:text-xs font-black tracking-wider uppercase transition-all shadow ${pillClasses}`}
            >
              <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${dotClasses.split(" ")[0]}`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${dotClasses}`}
                />
              </span>
              <span className="whitespace-nowrap">
                {gameState.opponent === "ONLINE"
                  ? isHumanTurn
                    ? "Ваш ход"
                    : "Ход врага"
                  : currentRoleName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded-lg px-3 h-9 md:h-11 text-xs md:text-sm font-mono text-zinc-400">
              {formatTimer(secondsElapsed)}
            </div>
            <button
              onClick={handleReset}
              className="px-3 h-7 md:h-11 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center text-[10px] md:text-sm font-bold cursor-pointer shrink-0"
            >
              Заново
            </button>
          </div>
        </header>
        </>
      )}

        {!isOpponentConnected && !opponentDisconnectedNotice && gameState.opponent === "ONLINE" && (
          <div className="w-full bg-zinc-900 border-b border-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest py-2 flex justify-center items-center gap-2 shadow-inner z-20">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-ping" />
            Соперник переподключается... (ожидание)
          </div>
        )}

        <div className="w-full px-3 md:px-6 py-1.5 md:py-2 bg-zinc-950/90 border-b border-zinc-900 flex items-center justify-between text-[10px] md:text-xs text-zinc-400 shrink-0">
          {gameState.mode === "SECRET_SERVICE" ? (
            <div className="flex items-center gap-3 truncate">
              {gameState.spies?.map((spy, idx) => {
                const color = SPY_COLORS[idx % SPY_COLORS.length];
                return (
                  <span
                    key={spy.id}
                    className="flex items-center gap-1.5 shrink-0"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${color.bg} border ${color.border}`}
                    />
                    <span className="text-zinc-300 font-medium">
                      {spy.name}:
                    </span>
                    <b className={`${color.text} font-black`}>
                      {spy.trophies}/{gameState.spyTargetTrophies}
                    </b>
                  </span>
                );
              })}
            </div>
          ) : gameState.mode === "LINE_UP" ? (
            <div className="flex items-center gap-3">
              <span className="text-red-400 font-bold">Штрафы:</span>
              <span>Следствие: <b className="text-zinc-200">{gameState.duelPenalties?.DETECTIVE ?? 0}</b></span>
              <span>Подозреваемый: <b className="text-zinc-200">{gameState.duelPenalties?.KILLER ?? 0}</b></span>
              <span className="ml-2">| Вопросов: {(gameState.duelHistory || []).length}</span>
            </div>
          ) : gameState.mode === "THIEF_HUNT" ? (
            <div className="flex items-center gap-1.5">
              <span>Добыча:</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-zinc-300 shrink-0">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" />
              </svg>
              <b className="text-zinc-200 font-bold">
                {gameState.trophiesKiller ?? 0}/5
              </b>
              <span className="ml-1">| Улики: {gameState.evidenceDeck.length}</span>
            </div>
          ) : (
            <div className="flex items-center flex-wrap gap-x-1">
              <span>Жертвы:</span>
              <b className="text-red-400">
                {gameState.killCount}/{gameState.mode === "MANIAC_VS_OPERATIVE" ? 4 : 14}
              </b>
              <span className="ml-1">| Улики: {gameState.evidenceDeck.length}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
            <span className="hidden md:inline">Режим:</span>
            <span>
              {gameState.opponent === "ONLINE"
                ? "онлайн"
                : gameState.opponent === "AI"
                  ? "против бота"
                  : "вдвоем"}
            </span>
          </div>
        </div>

        <div className="w-full px-3 h-8 md:h-12 shrink-0 flex items-center justify-center">
          {gameState.lastInterrogation && !gameState.winner ? (
            <div
              className={`w-full h-full px-2.5 rounded-lg border flex items-center justify-between text-[10px] md:text-sm shadow-sm ${gameState.lastInterrogation.isNear ? "bg-red-950/80 border-red-700 text-red-200" : "bg-zinc-900/90 border-zinc-800 text-zinc-300"}`}
            >
              <span className="font-semibold truncate mr-2">
                {gameState.lastInterrogation.interrogator === "DETECTIVE"
                  ? `Алиби (${gameState.lastInterrogation.targetName}): враг рядом?`
                  : `Жертва (${gameState.lastInterrogation.targetName}): законник рядом?`}
              </span>
              <span
                className={`shrink-0 px-2 py-0.5 rounded text-[9px] md:text-xs font-black uppercase border ${gameState.lastInterrogation.isNear ? "bg-red-900 text-red-100 border-red-500 animate-pulse" : "bg-blue-950 text-blue-300 border-blue-700"}`}
              >
                {gameState.lastInterrogation.isNear ? "Враг рядом" : "Вне зоны"}
              </span>
            </div>
          ) : gameState.lastSpyInterrogation && !gameState.winner ? (
            <div className="w-full h-full px-2.5 rounded-lg border border-zinc-800 bg-zinc-900/90 flex items-center justify-between text-[10px] md:text-sm shadow-sm">
              <span className="font-bold text-zinc-300 truncate mr-2">
                Допрос:{" "}
                <b className="text-zinc-100">
                  {gameState.lastSpyInterrogation.targetName}
                </b>
              </span>
              <div className="flex gap-1.5 shrink-0">
                {gameState.spies?.map((spy) => {
                  const hasContact =
                    gameState.lastSpyInterrogation?.raisedHandsPlayerNames.includes(
                      spy.name
                    );
                  return (
                    <span
                      key={spy.id}
                      className={`px-1.5 py-0.5 rounded text-[8.5px] md:text-[10px] font-black uppercase border ${hasContact ? "bg-red-950 text-red-400 border-red-700 animate-pulse" : "bg-zinc-950 text-zinc-500 border-zinc-800"}`}
                    >
                      {spy.name.replace("Агент «", "").replace("»", "")}:{" "}
                      {hasContact ? "РЯДОМ" : "НЕТ"}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : gameState.mode === "MANIAC_VS_OPERATIVE" && gameState.victimList.length > 0 && !gameState.winner ? (
            <div className="w-full h-full px-2.5 rounded-lg border border-red-900/60 bg-red-950/40 flex items-center justify-between text-[10px] md:text-sm shadow-sm">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-red-400 font-bold uppercase tracking-wider shrink-0 text-[9px] md:text-xs">Цель:</span>
                <span className="text-zinc-100 font-black truncate">
                  {allChars.find((c) => c.id === gameState.victimList[0])?.name ?? gameState.victimList[0]}
                </span>
                <span className="text-[9px] md:text-xs font-mono text-red-400/80 shrink-0">
                  (#{gameState.victimList[0].replace("c", "").padStart(2, "0")})
                </span>
              </div>
              <div className="shrink-0 font-mono text-[9px] sm:text-[10px] md:text-xs text-zinc-400 uppercase ml-2 flex items-center gap-1">
                <span>В очереди:</span> <b className="text-red-400">{gameState.victimList.length}</b>
              </div>
            </div>
          ) : (
            <div className="w-full h-full px-2.5 rounded-lg border border-dashed border-zinc-900 flex items-center justify-center text-[10px] md:text-sm text-zinc-600 font-mono">
              Оперативные показания: ожидание допроса
            </div>
          )}
        </div>

        {!isLobbyOpen && hasStartedEver && (
        <div className="flex-1 min-h-0 w-full flex flex-col landscape:flex-row items-center justify-start landscape:justify-between gap-2 md:gap-6 lg:gap-8 px-2 sm:px-4 md:px-6 py-1 md:py-4 overflow-hidden custom-scrollbar">
          <main className="flex-1 min-h-0 w-full max-w-xl md:max-w-3xl landscape:max-w-none flex flex-col items-center justify-center py-1 sm:py-2 landscape:py-0">
            <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center overflow-hidden relative antialiased">
              <GameBoard
                mode={gameState.mode}
                board={gameState.board}
                selectedCharacterId={selectedId}
                killerAdjacentIds={killerAdjacentIds}
                detectiveAdjacentIds={detectiveAdjacentIds}
                showKillerHints={
                  gameState.mode === "SECRET_SERVICE"
                    ? showSpyP1Role
                    : showKillerRole
                }
                showDetectiveHints={
                  gameState.mode === "SECRET_SERVICE"
                    ? showSpyP2Role
                    : showDetectiveRole
                }
                lastShift={gameState.lastShift}
                uniformedOfficerIds={gameState.uniformedOfficers}
                targetVictimId={
                  gameState.mode === "MANIAC_VS_OPERATIVE"
                    ? gameState.victimList[0]
                    : null
                }
                radarTargetId={effectiveRadarTargetId}
                radarCellIds={effectiveRadarCellIds}
                radarColorClass={effectiveRadarColorClass}
                errorCardId={errorCardId}
                myCharacterId={myCharacterId}
                isPVP={isPVP}
                myRoleColor={isKillerView ? "red" : "blue"}
                onShift={handleShift}
                onSelectCharacter={(id) => {
                  soundManager.play('click');
                  setSelectedId((prev) => (prev === id ? null : id));
                }}
              />
            </div>
          </main>

          <footer className="w-full max-w-md md:max-w-2xl landscape:w-80 landscape:xl:w-96 shrink-0 flex flex-col justify-center gap-3 md:gap-4 z-20 pb-[max(0.5rem,env(safe-area-inset-bottom))] landscape:pb-0 px-1 md:px-4 landscape:px-0 landscape:my-auto">
            <RoleCards
              mode={gameState.mode}
              role1Name={role1Name}
              role2Name={role2Name}
              killerNameText={killerNameText}
              detectiveNameText={detectiveNameText}
              canPeekKiller={canPeekKiller}
              canPeekDetective={canPeekDetective}
              onPeekKillerStart={() => {
                if (canPeekKiller) {
                  if (gameState.mode === "SECRET_SERVICE")
                    setShowSpyP1Role(true);
                  else setShowKillerRole(true);
                }
              }}
              onPeekKillerEnd={() => {
                setShowSpyP1Role(false);
                setShowKillerRole(false);
              }}
              onPeekDetectiveStart={() => {
                if (canPeekDetective) {
                  if (gameState.mode === "SECRET_SERVICE")
                    setShowSpyP2Role(true);
                  else setShowDetectiveRole(true);
                }
              }}
              onPeekDetectiveEnd={() => {
                setShowSpyP2Role(false);
                setShowDetectiveRole(false);
              }}
              isPVP={gameState.opponent === "PVP"}
            />

            <div className="w-full max-w-md md:max-w-xl h-8 sm:h-9 my-1 px-3 bg-zinc-900/90 border border-zinc-800 rounded-lg text-[10px] sm:text-xs font-mono text-zinc-300 text-center shadow-sm shrink-0 flex items-center justify-center overflow-hidden">
              <span className="truncate w-full">
                {gameState.log.length > 0 ? gameState.log[gameState.log.length - 1] : "Операция в процессе..."}
              </span>
            </div>

            <div className="flex flex-col gap-2 w-full lg:bg-zinc-900/50 lg:border lg:border-zinc-800 lg:p-4 lg:rounded-2xl">
              <div className="hidden md:block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Действия ({actionPanelRoleName})
              </div>
              <div className="grid grid-cols-2 landscape:grid-cols-1 gap-2 w-full">
                {targetActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={`${action.className} ${
                      targetActions.length === 1
                        ? "col-span-2 md:col-span-1"
                        : "col-span-1"
                    }`}
                  >
                    {(action.id === 'kill_basic' || action.id === 'capture_spy') && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="12"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>
                    )}
                    {(action.id === 'accuse_basic' || action.id === 'patrol_call') && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    )}
                    {action.id === 'interrogate_spy' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 shrink-0"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                    )}
                    {(action.id === 'disguise_skhvatka' || action.id === 'escape_maniac' || action.id === 'disguise_thief') && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 shrink-0"><path d="M2 18h20M4 18c0-2 2-3 4-4l2-6h4l2 6c2 1 4 2 4 4M9 13h6"></path></svg>
                    )}
                    {action.id === 'rob_basic' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 shrink-0"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                    )}
                    <span>{selectedCharacter && !action.disabled ? `${action.label}` : action.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5 w-full mt-1">
                {cleanupAction && (
                  <button
                    onClick={cleanupAction.onClick}
                    disabled={cleanupAction.disabled}
                    className="col-span-2 py-1.5 sm:py-2 md:py-3.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 hover:text-zinc-200 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase rounded-xl border border-zinc-700/80 transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <span>Зачистить</span>
                  </button>
                )}

                {((gameState.mode === "SKHVATKA" || gameState.mode === "MANIAC_VS_OPERATIVE") && isDetectiveView) && (
                  <button
                    onClick={() => setIsHandSheetOpen(true)}
                    className="col-span-2 py-1.5 sm:py-2 md:py-3.5 bg-zinc-800 hover:bg-zinc-700 text-blue-400 border border-zinc-700 rounded-xl text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Досье ({gameState.detectiveHand.length})</span>
                  </button>
                )}
              </div>
            </div>

            <div className="hidden landscape:lg:flex flex-col flex-1 min-h-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Протокол событий ({gameState.log.length})
                </span>
                <span className="text-xs">📋</span>
              </div>
              <div
                ref={logContainerRef}
                className="flex-1 overflow-y-auto space-y-2 text-[10px] font-mono text-zinc-300 pr-2 custom-scrollbar"
              >
                {gameState.log.map((entry, idx) => (
                  <div key={idx} className="leading-relaxed break-words">
                    • {entry}
                  </div>
                ))}
              </div>
            </div>
          </footer>
        </div>
        )}

        {isHandSheetOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
            <div
              className="absolute inset-0"
              onClick={() => setIsHandSheetOpen(false)}
            />
            <div className="relative bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-4 max-h-[70vh] flex flex-col z-10 shadow-2xl">
              <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wider">
                  {gameState.mode === "THIEF_HUNT"
                    ? "Маски вора"
                    : "Досье доказательств (Алиби)"}
                </h3>
                <button
                  onClick={() => setIsHandSheetOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 font-bold flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                {(gameState.mode === "SKHVATKA" ||
                  gameState.mode === "MANIAC_VS_OPERATIVE") && (
                  <DetectiveHand
                    handIds={gameState.detectiveHand}
                    allCharacters={allChars}
                    isDetectiveTurn={
                      isHumanTurn && isDetectiveTurn && !gameState.winner
                    }
                    characterImages={characterImages}
                    onExonerateFromHand={(id) => {
                      handleExonerateFromHand(id);
                      setIsHandSheetOpen(false);
                    }}
                  />
                )}

                {gameState.mode === "THIEF_HUNT" && (
                  <ThiefHand
                    handIds={gameState.killerHand ?? []}
                    isThiefTurn={
                      isHumanTurn && isKillerTurn && !gameState.winner
                    }
                    characterImages={characterImages}
                    onFastDisguise={(id) => {
                      handleFastDisguise(id);
                      setIsHandSheetOpen(false);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {isLogOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
            <div
              className="absolute inset-0"
              onClick={() => setIsLogOpen(false)}
            />
            <div className="relative bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-4 max-h-[75vh] flex flex-col z-10 shadow-2xl">
              <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wider">
                    Блокнот расследования ({gameState.log.length})
                  </h3>
                </div>
                <button
                  onClick={() => setIsLogOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 font-bold flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <div
                ref={logContainerRef}
                className="overflow-y-auto space-y-2 text-xs font-mono text-zinc-300 pr-1 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                {gameState.log.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 leading-relaxed"
                  >
                    • {entry}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState.justCaughtSpyId &&
          !gameState.winner &&
          !isLobbyOpen &&
          gameState.spies?.find((s) => s.id === gameState.justCaughtSpyId)?.isAI === false &&
          (gameState.opponent !== "ONLINE" ||
            (partyService.isHost
              ? gameState.justCaughtSpyId === gameState.spies?.[0]?.id
              : gameState.justCaughtSpyId === gameState.spies?.[1]?.id)) && (
            <IdentityRevealModal
              isOpen={true}
              badge="Агент разоблачен!"
              badgeColor="red"
              title="Шпионская маскировка провалена. Ваша новая личность:"
              character={allChars.find(c => c.id === gameState.spies?.find(s => s.id === gameState.justCaughtSpyId)?.secretId) ?? null}
              characterImage={(() => { const character = allChars.find(c => c.id === gameState.spies?.find(s => s.id === gameState.justCaughtSpyId)?.secretId); return character ? characterImages[`./assets/characters/${character.id}.webp`]?.default ?? null : null; })()}
              isPvpPassPhase={!isRevealConfirmed && gameState.opponent === "PVP"}
              targetPlayerName={gameState.spies.find(s => s.id === gameState.justCaughtSpyId)?.name}
              onConfirmPvpPass={() => setIsRevealConfirmed(true)}
              onAcceptIdentity={() => { setIsRevealConfirmed(false); setGameState((prev) => ({ ...prev, justCaughtSpyId: undefined })); }}
              onPreviewCard={(character) => { const image = characterImages[`./assets/characters/${character.id}.webp`]?.default; if (image) setFullscreenImage({ url: image, name: character.name, id: character.id }); }}
            />
          )}

        {gameState.disguisedNotification &&
          !gameState.winner &&
          !isLobbyOpen &&
          (gameState.opponent !== "ONLINE" || gameState.playerRole === "KILLER") && (
            <IdentityRevealModal
              isOpen={true}
              badge="Смена личности!"
              badgeColor={gameState.mode === "THIEF_HUNT" ? "amber" : "red"}
              title="Ваша новая личность:"
              character={allChars.find(c => c.id === gameState.disguisedNotification?.newSecretId) ?? null}
              characterImage={(() => { const character = allChars.find(c => c.id === gameState.disguisedNotification?.newSecretId); return character ? characterImages[`./assets/characters/${character.id}.webp`]?.default ?? null : null; })()}
              isPvpPassPhase={!isRevealConfirmed && gameState.opponent === "PVP"}
              targetPlayerName={gameState.disguisedNotification.roleName}
              onConfirmPvpPass={() => setIsRevealConfirmed(true)}
              onAcceptIdentity={() => { setIsRevealConfirmed(false); setGameState((prev) => ({ ...prev, disguisedNotification: null })); }}
              onPreviewCard={(character) => { const image = characterImages[`./assets/characters/${character.id}.webp`]?.default; if (image) setFullscreenImage({ url: image, name: character.name, id: character.id }); }}
            />
          )}

        {gameState.winner && !gameState.restartRequestedBy && (
          <GameOverModal
            winner={gameState.winner}
            mode={gameState.mode}
            killer={killerChar}
            detective={detectiveChar}
            elapsedTime={formatTimer(secondsElapsed)}
            onRestart={handleReset}
            onExitToMenu={handleExitToMenu}
            playerRole={gameState.opponent === "PVP" ? undefined : gameState.playerRole}
          />
        )}
      </div>
    </div>
  );
}
