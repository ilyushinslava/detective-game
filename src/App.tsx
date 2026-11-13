import { useState, useRef, useEffect, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from './components/SplashScreen';
import { type GameModeType, type OpponentType, type Role, type GameState } from "./types/game";
import { GameLifecycleModals } from "./components/GameLifecycleModals";
import { GameScreen } from "./components/GameScreen";
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
import { useIdleTimer } from "./hooks/useIdleTimer";
import { createInitialState } from "./utils/gameLogic";
import { soundManager } from "./utils/audio";
import { triggerHaptic } from "./utils/haptics";
import type { GameAction } from "./types/multiplayer";
import { Button } from "./components/ui/Button";
import type { ShiftPayload } from "./types/game";
import { gameReducer } from "./utils/gameReducer";
import { BannerViewerProvider } from "./contexts/BannerViewerContext";
import { useRulesModal } from "./hooks/useRulesModal";
import { characterImages } from "./constants/characterImages";
import { DEFAULT_BET } from "./constants/gameRules";
import { TvScreensaver } from "./components/tv/TvScreensaver";
import { TvNetworkDisconnectModal } from "./components/tv/TvNetworkDisconnectModal";

// Асинхронные динамические чанки второстепенных экранов (TASK-ARCH-001)
const DuelScreen = lazy(() => import("./components/duel/DuelScreen").then((m) => ({ default: m.DuelScreen })));
const TvHomeView = lazy(() => import("./components/tv/TvHomeView").then((m) => ({ default: m.TvHomeView })));
const TvBoardView = lazy(() => import("./components/tv/TvBoardView").then((m) => ({ default: m.TvBoardView })));
const TvLobbyView = lazy(() => import("./components/tv/TvLobbyView").then((m) => ({ default: m.TvLobbyView })));
const MobileControllerView = lazy(() => import("./components/controller/MobileControllerView").then((m) => ({ default: m.MobileControllerView })));
const ControllerConnectView = lazy(() => import("./components/controller/ControllerConnectView").then((m) => ({ default: m.ControllerConnectView })));

const ScreenFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07080c] text-zinc-300 select-none">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin" />
      <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
        Загрузка модуля...
      </span>
    </div>
  </div>
);




export default function App() {
  const isAndroidTv = useMemo(() => Capacitor.getPlatform() === "android", []);
  const urlParams = useMemo(() => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""), []);
  const clientTypeParam = (urlParams.get("clientType") || urlParams.get("role"))?.toUpperCase();
  const targetRoomParam = urlParams.get("targetRoom");
  const roomParam = urlParams.get("room");

  if (clientTypeParam === "TV_DISPLAY" && !roomParam && typeof window !== "undefined" && typeof window.location?.replace === "function") {
    const code = sessionStorage.getItem("tv_party_room") || Math.floor(10000 + Math.random() * 90000).toString();
    sessionStorage.setItem("tv_party_room", code);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("room", code);
    newUrl.searchParams.set("clientType", "TV_DISPLAY");
    window.location.replace(newUrl.toString());
    return null;
  }

  const [showSplash, setShowSplash] = useState(true);
  const [, setActiveMode] = useState<GameModeType>("MANIAC_VS_OPERATIVE");
  const [isLobbyOpen, setIsLobbyOpen] = useState(() => !isAndroidTv);
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
    createInitialState("MANIAC_VS_OPERATIVE", "AI", "DETECTIVE", 3, 3, 16, profile.nickname)
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
  const [tvRoomCode, setTvRoomCode] = useState<string>(() => {
    if (roomParam || targetRoomParam) return roomParam || targetRoomParam || "";
    if (typeof window !== "undefined") {
      try {
        const savedRoom = localStorage.getItem("tv_session_room_code");
        if (savedRoom) return savedRoom;
      } catch {}
    }
    return "";
  });
  const [tvMorseCode, setTvMorseCode] = useState<string>("");
  const [pinInput, setPinInput] = useState<string>("");
  const [tvPartyState, setTvPartyState] = useState<"NONE" | "TV_HOME" | "TV_LOBBY" | "TV_BOARD" | "CONTROLLER">(() => {
    if (clientTypeParam === "CONTROLLER" || targetRoomParam) return "CONTROLLER";
    if (clientTypeParam === "TV_DISPLAY") return "TV_LOBBY";
    if (typeof window !== "undefined") {
      try {
        const savedState = localStorage.getItem("tv_session_party_state") as any;
        const savedRoom = localStorage.getItem("tv_session_room_code") || roomParam || targetRoomParam;
        if (savedState && savedRoom && ["TV_LOBBY", "TV_BOARD", "CONTROLLER"].includes(savedState)) {
          return savedState;
        }
      } catch {}
    }
    if (isAndroidTv) return "TV_HOME";
    return "NONE";
  });
  const [tvLinePreview, setTvLinePreview] = useState<ShiftPayload | null>(null);
  const [tvPlayers, setTvPlayers] = useState<Record<string, { nickname: string; isHost?: boolean }>>({});
  const [controllerRoomStatus, setControllerRoomStatus] = useState<string>("WAITING");
  const [controllerRole, setControllerRole] = useState<Role>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("tv_controller_role") as Role;
      if (saved === "KILLER" || saved === "DETECTIVE") return saved;
    }
    return "KILLER";
  });
  const [isTvPassAndPlay, setIsTvPassAndPlay] = useState<boolean>(false);
  const [isPassAndPlayOpen, setIsPassAndPlayOpen] = useState(false);
  const [errorCardId, setErrorCardId] = useState<string | null>(null);

  // Авто-восстановление сессии (Auto-Recovery): синхронизация tvRoomCode и tvPartyState с localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (tvPartyState === "NONE") {
        localStorage.removeItem("tv_session_party_state");
        localStorage.removeItem("tv_session_room_code");
      } else {
        localStorage.setItem("tv_session_party_state", tvPartyState);
        if (tvRoomCode) {
          localStorage.setItem("tv_session_room_code", tvRoomCode);
        }
      }
    } catch {}
  }, [tvPartyState, tvRoomCode]);

  // Защита OLED-экранов от выгорания (таймер простоя 5 минут)
  const { isIdle: isOledIdle, resetTimer: resetOledTimer } = useIdleTimer({
    timeoutMs: 300000,
    enabled: isAndroidTv || tvPartyState !== "NONE",
  });

  // Отслеживание разрыва сетевого соединения (PartyKit)
  const [isTvDisconnected, setIsTvDisconnected] = useState(false);
  const [tvReconnectAttempt, setTvReconnectAttempt] = useState(1);

  useEffect(() => {
        sessionStorage.removeItem("mp_session");
  }, []);

  useEffect(() => {
    if ((clientTypeParam === "CONTROLLER" || tvPartyState === "CONTROLLER") && tvRoomCode) {
      let controllerClientId = typeof window !== "undefined" ? localStorage.getItem("tv_controller_client_id") : null;
      if (!controllerClientId && typeof window !== "undefined") {
        controllerClientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        localStorage.setItem("tv_controller_client_id", controllerClientId);
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem("tv_controller_room", tvRoomCode);
      }
      partyService.connect(tvRoomCode, profile.nickname || 'Агент', false, 'MANIAC_VS_OPERATIVE', controllerClientId || undefined, 'CONTROLLER');

      const prevOnRoomStatus = partyService.onRoomStatus;
      const prevOnSyncState = partyService.onSyncState;

              partyService.onRoomStatus = (data: any) => {
          prevOnRoomStatus?.(data);
          if (data?.status) {
            setControllerRoomStatus(data.status);
            if (data.status === "PLAYING") {
              setIsIntroPhase(true);
            }
          }
        };

      partyService.onSyncState = (state: any, role?: Role, status?: string) => {
        prevOnSyncState?.(state, role, status);
        if (role && (role as any) !== "SPECTATOR") {
          (partyService as any).role = role;
          setControllerRole(role);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("tv_controller_role", role);
          }
        }
        if (state) {
          setGameState(state);
          if (!role || role === "KILLER") {
            if (state.detectiveSecretId && !state.killerSecretId) {
              setControllerRole("DETECTIVE");
              if (typeof window !== "undefined") {
                sessionStorage.setItem("tv_controller_role", "DETECTIVE");
              }
            } else if (state.killerSecretId && !state.detectiveSecretId) {
              setControllerRole("KILLER");
              if (typeof window !== "undefined") {
                sessionStorage.setItem("tv_controller_role", "KILLER");
              }
            }
          }
        }
                  if (status) {
            setControllerRoomStatus(status);
            if (status === "PLAYING") {
              setIsIntroPhase(true);
            }
          }
        };

      return () => {
        partyService.onRoomStatus = prevOnRoomStatus;
        partyService.onSyncState = prevOnSyncState;
      };
    }
  }, [clientTypeParam, tvRoomCode]);

  useEffect(() => {
    if (tvPartyState !== "TV_LOBBY" && tvPartyState !== "TV_BOARD" && tvPartyState !== "CONTROLLER") return;

    if (tvPartyState === "TV_LOBBY" || tvPartyState === "TV_BOARD") {
      partyService.connect(tvRoomCode, 'TV_HOST', true, 'MANIAC_VS_OPERATIVE', undefined, 'TV_DISPLAY');
    }

    const prevOnRoomStatus = partyService.onRoomStatus;
    const prevOnSyncState = partyService.onSyncState;
    const prevOnAction = partyService.onAction;
    const prevOnConnState = partyService.onConnectionStateChange;

    partyService.onConnectionStateChange = (st) => {
      prevOnConnState?.(st);
      if (st.isConnected) {
        setIsTvDisconnected(false);
        setTvReconnectAttempt(1);
      } else if (st.isReconnecting) {
        setIsTvDisconnected(true);
        setTvReconnectAttempt(st.attempt || 1);
      }
    };

    partyService.onRoomStatus = (data: any) => {
      prevOnRoomStatus?.(data);
      if (data?.players) {
        setTvPlayers(data.players);
      }
      if (data?.morseCode) {
        setTvMorseCode(data.morseCode);
      }
      if (data?.status === "PLAYING" || data?.status === "FINISHED") {
        setTvPartyState((prev) => (prev === "TV_LOBBY" ? "TV_BOARD" : prev));
        setControllerRoomStatus(data.status);
      }
    };

    partyService.onSyncState = (state: any, role?: Role, status?: string) => {
      prevOnSyncState?.(state, role, status);
      // При получении синхронизации соединение гарантированно активно
      setIsTvDisconnected(false);
      if (state) {
        setGameState(state);
        if (status === "PLAYING" || status === "FINISHED" || (state?.board && state.board.length > 0)) {
          setTvPartyState((prev) => (prev === "TV_LOBBY" ? "TV_BOARD" : prev));
          setControllerRoomStatus("PLAYING");
        }
      }
      if (role && (role as any) !== "SPECTATOR") {
        setControllerRole(role);
      }
    };

    partyService.onAction = (action: any) => {
      prevOnAction?.(action);
      if (action?.type === "LINE_PREVIEW") {
        setTvLinePreview(action.payload?.line ?? null);
      } else if (action?.type === "PREVIEW_SHIFT") {
        setTvLinePreview(action.payload ?? null);
      }
    };

    return () => {
      partyService.onRoomStatus = prevOnRoomStatus;
      partyService.onSyncState = prevOnSyncState;
      partyService.onAction = prevOnAction;
      partyService.onConnectionStateChange = prevOnConnState;
    };
  }, [tvPartyState, tvRoomCode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Backquote" || e.key === "`") {
        setIsDevPanelOpen((prev) => !prev);
      }

      // Отладочный шорткат для дизайна/тестирования TV_BOARD по нажатию 'B' на клавиатуре
      if (e.key === "b" || e.key === "B" || e.code === "KeyB") {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        const mockTvState = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER", 5, 5, 25, "Сыщик");
        mockTvState.currentTurn = "KILLER";
        mockTvState.killCount = 1;
        if (mockTvState.board?.[1]?.[1]) {
          mockTvState.victimList = [mockTvState.board[1][1].id];
        }
        if (mockTvState.board?.[2]?.[2]) {
          mockTvState.uniformedOfficers = [mockTvState.board[2][2].id];
        }
        mockTvState.log = [
          "Партия TV Party инициализирована [DEBUG]",
          "Служба безопасности патрулирует улицы",
          "Обнаружен след подозреваемого в секторе B-3",
        ];
        setGameState(mockTvState);
        setTvPartyState("TV_BOARD");
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
  const { isRulesOpen, openRules, closeRules } = useRulesModal();
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
    if ((tvPartyState === "TV_LOBBY" || tvPartyState === "TV_BOARD") && action.type !== "START_MATCH") {
      return;
    }
    if (gameStateRef.current.opponent === "ONLINE" || tvPartyState === "CONTROLLER" || clientTypeParam === "CONTROLLER") {
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
    requestRematch,
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
    soundManager.play("confirm");

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
    setIsPauseOpen(false);
    setHasStartedEver(true);
    setIsIntroPhase(true);
    setIsLobbyOpen(false);
    setSecondsElapsed(0);
  };

  const handleResumeGame = () => {
    setIsPauseOpen(false);
    setIsLobbyOpen(false);
  };

  const handleExitToMenu = () => {
    setIsPauseOpen(false);
    partyService.disconnect();
    sessionStorage.removeItem("mp_session");
    setOpponentDisconnectedNotice(false);
    if (isAndroidTv) {
      setTvPartyState("TV_HOME");
      setIsLobbyOpen(false);
      return;
    }
    setIsLobbyOpen(true);
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

  const myRoleColor: "red" | "blue" =
    gameState.playerRole === "KILLER" ||
    (gameState.mode === "SECRET_SERVICE" && gameState.activeSpyIndex === 0)
      ? "red"
      : "blue";

  return (
    <BannerViewerProvider>
      <div className="fixed inset-0 w-full h-full flex flex-col bg-[#07080c] overflow-hidden select-none">
        {showSplash && (
          <SplashScreen
            isTv={isAndroidTv}
            autoDismissDelayMs={isAndroidTv ? 2500 : undefined}
            onComplete={() => setShowSplash(false)}
          />
        )}

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
          pendingRematchMode={gameState.pendingRematchMode}
        matchBet={gameState.matchBet || DEFAULT_BET}
        rematchTimer={rematchTimer}
        onAcceptRestart={acceptRestart}
        onRejectRestart={rejectRestart}
        onCancelWaitingRestart={() => {
          dispatchAction({ type: "REJECT_RESTART", senderId: "local" });
          setGameState((prev) => ({ ...prev, restartRequestedBy: undefined }));
        }}
        isOpponentDisconnectedNotice={Boolean(opponentDisconnectedNotice && gameState.opponent === "ONLINE")}
        onExitToMenu={handleExitToMenu}
        isPauseOpen={isPauseOpen}
        onClosePause={() => setIsPauseOpen(false)}
        onResumeGame={() => setIsPauseOpen(false)}
        onOpenRules={() => openRules()}
        onOpenDevPanel={() => setIsDevPanelOpen(true)}
        isRulesOpen={isRulesOpen}
        onCloseRules={closeRules}
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
        isDevPanelOpen={isDevPanelOpen}
        onCloseDevPanel={() => setIsDevPanelOpen(false)}
        onTogglePlayerRole={() => {
          setGameState((prev) => ({
            ...prev,
            playerRole: prev.playerRole === "KILLER" ? "DETECTIVE" : "KILLER",
            log: [...prev.log, `[DEV] Смена роли игрока на: ${prev.playerRole === "KILLER" ? "DETECTIVE" : "KILLER"}`],
          }));
        }}
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
              mode: "MANIAC_VS_OPERATIVE",
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

      <div 
        className="w-full max-w-7xl mx-auto h-full relative flex flex-col overflow-hidden"
      >
        {isLobbyOpen && !isAndroidTv ? (
          <div
            key="main-menu"
            className="w-full h-full flex flex-col min-h-0"
          >
            <MainMenu
              onStartTvParty={(role = "TV_DISPLAY") => {
                if (role === "CONTROLLER") {
                  setTvPartyState("CONTROLLER");
                  setIsLobbyOpen(false);
                  return;
                }
                const code = sessionStorage.getItem("tv_party_room") || Math.floor(10000 + Math.random() * 90000).toString();
                sessionStorage.setItem("tv_party_room", code);
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set("room", code);
                newUrl.searchParams.set("clientType", "TV_DISPLAY");
                window.location.replace(newUrl.toString());
              }}
              profile={profile}
              onUpdateProfile={updateProfile}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onStartGame={handleStartNewGame}
              hasActiveGame={Boolean(!gameState.winner && hasStartedEver && gameState.board?.length >= 5 && gameState.log?.length > 2)}
              onResumeGame={handleResumeGame}
              onOpenRules={() => openRules()}
              onOpenDevPanel={() => setIsDevPanelOpen(true)}
            />
          </div>
        ) : !isIntroPhase && hasStartedEver && gameState.opponent !== undefined ? (
          <div
            key={`game-${gameState.mode}`}
            className="w-full h-full flex flex-col min-h-0 overflow-hidden"
          >
              {gameState.mode === "LINE_UP" ? (
                <Suspense fallback={<ScreenFallback />}>
                  <DuelScreen
                    onBackToMenu={handleExitToMenu}
                    playerRole={gameState.playerRole}
                    gameState={gameState}
                    isOnline={gameState.opponent === "ONLINE"}
                    onDispatchAction={dispatchAction}
                  />
                </Suspense>
              ) : (
                <GameScreen
                  gameState={gameState}
                  isHumanTurn={isHumanTurn}
                  currentRoleName={currentRoleName}
                  actionPanelRoleName={actionPanelRoleName}
                  pillClasses={pillClasses}
                  dotClasses={dotClasses}
                  secondsElapsed={secondsElapsed}
                  formatTimer={formatTimer}
                  selectedId={selectedId}
                  setSelectedId={setSelectedId}
                  killerAdjacentIds={killerAdjacentIds}
                  detectiveAdjacentIds={detectiveAdjacentIds}
                  activeAgentAdjacentIds={activeAgentAdjacentIds}
                  showKillerRole={showKillerRole}
                  setShowKillerRole={setShowKillerRole}
                  showDetectiveRole={showDetectiveRole}
                  setShowDetectiveRole={setShowDetectiveRole}
                  showSpyP1Role={showSpyP1Role}
                  setShowSpyP1Role={setShowSpyP1Role}
                  showSpyP2Role={showSpyP2Role}
                  setShowSpyP2Role={setShowSpyP2Role}
                  role1Name={role1Name}
                  role2Name={role2Name}
                  killerNameText={killerNameText}
                  detectiveNameText={detectiveNameText}
                  canPeekKiller={canPeekKiller}
                  canPeekDetective={canPeekDetective}
                  isPVP={isPVP}
                  myRoleColor={myRoleColor}
                  myCharacterId={myCharacterId}
                  effectiveRadarTargetId={effectiveRadarTargetId}
                  effectiveRadarCellIds={effectiveRadarCellIds}
                  effectiveRadarColorClass={effectiveRadarColorClass}
                  errorCardId={errorCardId}
                  targetActions={targetActions}
                  cleanupAction={cleanupAction}
                  isCleanupAvailable={isCleanupAvailable}
                  isDetectiveView={isDetectiveView}
                  isDetectiveTurn={isDetectiveTurn}
                  isKillerTurn={isKillerTurn}
                  isHandSheetOpen={isHandSheetOpen}
                  setIsHandSheetOpen={setIsHandSheetOpen}
                  isLogOpen={isLogOpen}
                  setIsLogOpen={setIsLogOpen}
                  unreadLogCount={unreadLogCount}
                  setUnreadLogCount={setUnreadLogCount}
                  logContainerRef={logContainerRef}
                  allChars={allChars}
                  characterImages={characterImages}
                  selectedCharacter={selectedCharacter}
                  handleReset={handleReset}
                  handleShift={handleShift}
                  handleExonerateFromHand={handleExonerateFromHand}
                  handleFastDisguise={handleFastDisguise}
                  setIsPauseOpen={setIsPauseOpen}
                  setIsNotebookOpen={setIsNotebookOpen}
                  isOpponentConnected={isOpponentConnected}
                  opponentDisconnectedNotice={opponentDisconnectedNotice}
                  isInspectorPending={isInspectorPending}
                />
              )}
            </div>
          ) : null}

        {tvPartyState === "NONE" && (
          <GameLifecycleModals
            gameState={gameState}
            setGameState={setGameState}
            isIntroPhase={isIntroPhase}
            setIsIntroPhase={setIsIntroPhase}
            isLobbyOpen={isLobbyOpen}
            hasStartedEver={hasStartedEver}
            isOpponentConnected={isOpponentConnected}
            isDetectiveView={isDetectiveView}
            isDetectiveTurn={isDetectiveTurn}
            profileNickname={profile.nickname}
            killerChar={killerChar}
            detectiveChar={detectiveChar}
            allChars={allChars}
            inspectorChoices={inspectorChoices}
            selectedInspectorChoiceId={selectedInspectorChoiceId}
            setSelectedInspectorChoiceId={setSelectedInspectorChoiceId}
            isRevealConfirmed={isRevealConfirmed}
            setIsRevealConfirmed={setIsRevealConfirmed}
            characterImages={characterImages}
            secondsElapsed={secondsElapsed}
            formatTimer={formatTimer}
            handleExitToMenu={handleExitToMenu}
            handleReset={handleReset}
            handleSelectInspectorRole={handleSelectInspectorRole}
            requestRematch={requestRematch}
            setFullscreenImage={setFullscreenImage}
          />
        )}
      </div>

      {/* РЕЖИМ TV PARTY: Мобильный пульт управления */}
      {tvPartyState === "CONTROLLER" && (() => {
        const isControllerInGame = controllerRoomStatus === "PLAYING";
        return (
          <div className="fixed inset-0 z-50 bg-[#07080c]">
            <Suspense fallback={<ScreenFallback />}>
              {!tvRoomCode ? (
                <ControllerConnectView
                  initialNickname={profile.nickname}
                  onUpdateNickname={(name) => updateProfile({ nickname: name })}
                  targetRoomCode={targetRoomParam || undefined}
                  targetHostName={targetRoomParam ? "ТВ-Экран" : undefined}
                  onConnect={(code) => {
                    setTvRoomCode(code);
                    setTvPartyState("CONTROLLER");
                    try {
                      const newUrl = new URL(window.location.href);
                      newUrl.searchParams.delete("targetRoom");
                      newUrl.searchParams.set("room", code);
                      newUrl.searchParams.set("clientType", "CONTROLLER");
                      window.history.replaceState({}, "", newUrl.toString());
                    } catch (_) {}
                  }}
                  onBackToMenu={() => {
                    try {
                      localStorage.removeItem("tv_session_party_state");
                      localStorage.removeItem("tv_session_room_code");
                    } catch {}
                    sessionStorage.removeItem("tv_controller_client_id");
                    sessionStorage.removeItem("tv_controller_role");
                    window.location.search = "";
                    setTvRoomCode("");
                    setTvPartyState("NONE");
                    setIsLobbyOpen(true);
                  }}
                />
              ) : !isControllerInGame ? (
                <div className="flex h-screen w-screen flex-col justify-between p-6 text-zinc-100 select-none font-sans bg-[#07080c]">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-xs font-mono uppercase tracking-widest text-zinc-300">ПОДКЛЮЧЕНО</span>
                    </div>
                    <div className="text-xs font-mono text-zinc-500">КОМНАТА #{tvRoomCode}</div>
                  </div>

                  <div className="flex flex-col items-center text-center max-w-sm mx-auto my-auto space-y-4">
                    <div className="w-20 h-20 rounded-3xl border border-white/10 bg-zinc-950/60 backdrop-blur-md flex items-center justify-center shadow-2xl text-zinc-300">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-10 h-10">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-wider text-zinc-100">
                        ВЫ В ЛОББИ
                      </h2>
                      <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                        Ожидайте запуска игры на телевизоре.
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/10 backdrop-blur-md shadow-lg w-full text-left">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">ИГРОК</div>
                      <div className="text-base font-black text-zinc-100 truncate">
                        {profile.nickname || 'Агент'}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      try {
                        localStorage.removeItem("tv_session_party_state");
                        localStorage.removeItem("tv_session_room_code");
                      } catch {}
                      sessionStorage.removeItem("tv_controller_client_id");
                      sessionStorage.removeItem("tv_controller_role");
                      partyService.disconnect();
                      window.location.search = "";
                      setTvRoomCode("");
                      setTvPartyState("NONE");
                      setIsLobbyOpen(true);
                    }}
                    className="h-12 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white"
                  >
                    Выйти в меню
                  </Button>
                </div>
              ) : (
                <MobileControllerView
                  gameState={gameState}
                  playerRole={
                    isTvPassAndPlay
                      ? (gameState.mode === "SECRET_SERVICE"
                          ? ((gameState.activeSpyIndex ?? 0) === 1 ? "DETECTIVE" : "KILLER")
                          : (gameState.currentTurn || "KILLER"))
                      : controllerRole
                  }
                  isPassAndPlay={isTvPassAndPlay}
                  onDispatchAction={dispatchAction}
                  onSelectLinePreview={setTvLinePreview}
                  onExit={() => {
                    try {
                      localStorage.removeItem("tv_session_party_state");
                      localStorage.removeItem("tv_session_room_code");
                    } catch {}
                    sessionStorage.removeItem("tv_controller_client_id");
                    sessionStorage.removeItem("tv_controller_role");
                    partyService.disconnect();
                    window.location.search = "";
                    setTvRoomCode("");
                    setTvPartyState("NONE");
                    setIsLobbyOpen(true);
                  }}
                />
              )}
            </Suspense>
          </div>
        );
      })()}

      {/* РЕЖИМ TV PARTY: Кинематографичный роутинг с переходом через черный (Fade-Through-Black) */}
      <AnimatePresence mode="wait">
        {tvPartyState === "TV_HOME" && (
          <motion.div
            key="tv-home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="fixed inset-0 z-50 bg-[#07080c]"
          >
            <Suspense fallback={<ScreenFallback />}>
              <TvHomeView
                onCreateRoom={() => {
                  const code = Math.floor(10000 + Math.random() * 90000).toString();
                  setTvRoomCode(code);
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem("tv_party_room", code);
                  }
                  setTvPartyState("TV_LOBBY");
                }}
              />
            </Suspense>
          </motion.div>
        )}

        {tvPartyState === "TV_LOBBY" && (
          <motion.div
            key="tv-lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="fixed inset-0 z-50 bg-[#07080c]"
          >
            <Suspense fallback={<ScreenFallback />}>
              <TvLobbyView
                roomCode={tvRoomCode}
                morseCode={tvMorseCode}
                players={tvPlayers}
                connectedPlayers={tvPlayers}
                hideExit={isAndroidTv}
                onStartGame={(mode, passAndPlay) => {
                  setIsTvPassAndPlay(passAndPlay);
                  partyService.sendAction({
                    type: "START_MATCH",
                    senderId: "TV_HOST",
                    payload: { mode, isPassAndPlay: passAndPlay },
                  } as any);

                  const playerKeys = Object.keys(tvPlayers);
                  const p2Name = playerKeys[1] ? tvPlayers[playerKeys[1]].nickname : "Player 2";
                  setGameState(createInitialState(
                    mode,
                    "ONLINE",
                    "KILLER",
                    Math.max(2, playerKeys.length),
                    mode === "SECRET_SERVICE" ? 2 : 3,
                    16,
                    p2Name
                  ));
                  setTvPartyState("TV_BOARD");
                }}
                onExit={() => {
                  partyService.disconnect();
                  try {
                    localStorage.removeItem("tv_session_party_state");
                    localStorage.removeItem("tv_session_room_code");
                  } catch {}
                  setTvRoomCode("");
                  if (isAndroidTv) {
                    setTvPartyState("TV_HOME");
                    return;
                  }
                  setTvPartyState("NONE");
                  setIsLobbyOpen(true);
                }}
              />
            </Suspense>
          </motion.div>
        )}

        {tvPartyState === "TV_BOARD" && (
          <motion.div
            key="tv-board"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="fixed inset-0 z-50 bg-[#07080c]"
          >
            <Suspense fallback={<ScreenFallback />}>
              <TvBoardView
                gameState={gameState}
                secondsLeft={60}
                selectedLine={tvLinePreview}
                hideExit={false}
                onExit={() => {
                  partyService.disconnect();
                  try {
                    localStorage.removeItem("tv_session_party_state");
                    localStorage.removeItem("tv_session_room_code");
                  } catch {}
                  setTvRoomCode("");
                  if (isAndroidTv) {
                    setTvPartyState("TV_HOME");
                    return;
                  }
                  setTvPartyState("NONE");
                  setIsLobbyOpen(true);
                }}
                onRestart={() => {
                  partyService.sendAction({ type: "RESTART_GAME" });
                }}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Защита OLED-экранов от выгорания */}
      <TvScreensaver isIdle={isOledIdle} onDismiss={resetOledTimer} />

      {/* Оверлей разрыва сетевого соединения (PartyKit) */}
      <TvNetworkDisconnectModal
        isOpen={isTvDisconnected}
        attempt={tvReconnectAttempt}
        maxAttempts={10}
      />
    </div>
  </BannerViewerProvider>
  );
}
