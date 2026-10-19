import { useState, useRef, useEffect, useMemo } from "react";
import { SplashScreen } from './components/SplashScreen';
import type { GameModeType, OpponentType, Role } from "./types/game";
import { GameBoard } from "./components/GameBoard";
import { DetectiveHand } from "./components/DetectiveHand";
import { ThiefHand } from "./components/ThiefHand";
import { VictimList } from "./components/VictimList";
import { RoleRevealModal } from "./components/RoleRevealModal";
import { GameOverModal } from "./components/GameOverModal";
import { MainMenu } from "./components/MainMenu";
import { usePlayerProfile } from "./utils/usePlayerProfile";
import { GAME_MODES } from "./components/ModeSelectModal";
import { mpService } from "./utils/multiplayerPeer";
import {
  createInitialState,
  setInspectorRole,
  getAdjacentCharacters,
  canCleanupBoard,
  CHARACTERS_DATA,
} from "./utils/gameLogic";
import {
  getKillerAIMove,
  getDetectiveAIMove,
  getSecretServiceAIMove,
  getThiefAIMove,
  getPoliceAIMove,
} from "./utils/aiLogic";
import { soundManager } from "./utils/audio";
import { triggerHaptic } from "./utils/haptics";
import type { ActionItem } from "./components/ActionPanel";
import { RoleCards } from "./components/RoleCards";
import type { GameAction } from "./types/multiplayer";
import { gameReducer } from "./utils/gameReducer";
import { Toast } from "./components/Toast";
import { I18nProvider } from "./i18n/context";

const characterImages = import.meta.glob<{ default: string }>(
  "./assets/characters/*.webp",
  { eager: true }
);

const SPY_COLORS = [
  {
    text: "text-red-400",
    bg: "bg-red-950",
    border: "border-red-500",
    ring: "ring-red-500/80",
  },
  {
    text: "text-blue-400",
    bg: "bg-blue-950",
    border: "border-blue-500",
    ring: "ring-blue-500/80",
  },
  {
    text: "text-sky-400",
    bg: "bg-sky-950",
    border: "border-sky-500",
    ring: "ring-sky-500/80",
  },
  {
    text: "text-purple-400",
    bg: "bg-purple-950",
    border: "border-purple-500",
    ring: "ring-purple-500/80",
  },
  {
    text: "text-rose-400",
    bg: "bg-rose-950",
    border: "border-rose-500",
    ring: "ring-rose-500/80",
  },
  {
    text: "text-lime-400",
    bg: "bg-lime-950",
    border: "border-lime-500",
    ring: "ring-lime-500/80",
  },
  {
    text: "text-cyan-400",
    bg: "bg-cyan-950",
    border: "border-cyan-500",
    ring: "ring-cyan-500/80",
  },
  {
    text: "text-orange-400",
    bg: "bg-orange-950",
    border: "border-orange-500",
    ring: "ring-orange-500/80",
  },
  {
    text: "text-fuchsia-400",
    bg: "bg-fuchsia-950",
    border: "border-fuchsia-500",
    ring: "ring-fuchsia-500/80",
  },
];

export default function App() {
  const hasSavedSession = Boolean(sessionStorage.getItem('mp_session'));
  const [showSplash, setShowSplash] = useState(!hasSavedSession);
  const [activeMode, setActiveMode] = useState<GameModeType>("SKHVATKA");
  const [isLobbyOpen, setIsLobbyOpen] = useState(!hasSavedSession);
  const [hasStartedEver, setHasStartedEver] = useState(false);
  const {
    profile,
    updateProfile,
    refundBet,
    awardPrize,
    recordMatchResult,
  } = usePlayerProfile();
  const matchResultRecordedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<
    "LOBBY" | "TABLES" | "TOP" | "SHOP"
  >("LOBBY");

  const [gameState, setGameState] = useState(() =>
    createInitialState("SKHVATKA", "AI", "DETECTIVE", 3, 3, 16, profile.nickname),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRevealConfirmed, setIsRevealConfirmed] = useState(false);
  const [isIntroPhase, setIsIntroPhase] = useState(false);
  const [showKillerRole, setShowKillerRole] = useState(false);
  const [showDetectiveRole, setShowDetectiveRole] = useState(false);
  const [showSpyP1Role, setShowSpyP1Role] = useState(false);
  const [showSpyP2Role, setShowSpyP2Role] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [errorCardId, setErrorCardId] = useState<string | null>(null);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [opponentDisconnectedNotice, setOpponentDisconnectedNotice] =
    useState(false);
  const [isHandSheetOpen, setIsHandSheetOpen] = useState(false);
  const [unreadLogCount, setUnreadLogCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isChoiceSheetMinimized, setIsChoiceSheetMinimized] = useState(false);
  const [isInspectorPassConfirmed, setIsInspectorPassConfirmed] = useState(false);
  const [rematchTimer, setRematchTimer] = useState(15);
  const [isOpponentConnected, setIsOpponentConnected] = useState(true);
  const [activeAccordionIndex, setActiveAccordionIndex] = useState<number | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; name: string; id: string } | null>(null);

  const [isSfxEnabled, setIsSfxEnabled] = useState(soundManager.getSfxEnabled());
  const [isAmbientEnabled, setIsAmbientEnabled] = useState(soundManager.getAmbientEnabled());
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(() => localStorage.getItem("crime_city_haptics") !== "false");

  const prevLogLenRef = useRef(gameState.log.length);
  const rulesTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const saved = sessionStorage.getItem('mp_session');
      if (saved) {
        try {
          const { roomCode, myClientId, isHost, playerRole } = JSON.parse(saved);
          const restoredState = await mpService.restoreSession(roomCode, myClientId, isHost);
          if (restoredState) {
            setGameState(restoredState);
            setActiveMode(restoredState.mode);
            setIsLobbyOpen(false);
            setHasStartedEver(true);
            setIsIntroPhase(false);
            setToastMessage("Сессия восстановлена");
          } else {
            sessionStorage.removeItem('mp_session');
          }
        } catch (e) {
          sessionStorage.removeItem('mp_session');
        }
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (gameState.opponent === "ONLINE" && !isLobbyOpen && mpService.roomCode) {
      sessionStorage.setItem('mp_session', JSON.stringify({
        roomCode: mpService.roomCode,
        myClientId: mpService.myClientId,
        isHost: mpService.isHost,
        playerRole: gameState.playerRole
      }));
      if (mpService.isHost) {
        mpService.saveGameState(gameState);
      }
    }
  }, [gameState, isLobbyOpen]);
  useEffect(() => {
    if (gameState.log.length > prevLogLenRef.current) {
      if (!isLogOpen) {
        setUnreadLogCount(
          (prev) => prev + (gameState.log.length - prevLogLenRef.current),
        );
      }
    }
    prevLogLenRef.current = gameState.log.length;
  }, [gameState.log.length, isLogOpen]);

  const logContainerRef = useRef<HTMLDivElement>(null);

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const dispatchAction = (action: GameAction) => {
    setGameState((prev) => {
      const nextState = gameReducer(prev, action);
      if (
        action.senderId === "local" &&
        (prev.opponent === "ONLINE" || Boolean(mpService.roomCode))
      ) {
        mpService.sendAction({ 
          ...action, 
          nextTurn: nextState.currentTurn,
          nextSpyIndex: nextState.activeSpyIndex
        });
      }
      return nextState;
    });
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (gameState.restartRequestedBy === (mpService.isHost ? "HOST" : "GUEST")) {
      setRematchTimer(15);
      timer = setInterval(() => {
        setRematchTimer((prev) => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            dispatchAction({ type: "REJECT_RESTART", senderId: "local" });
            setGameState((s) => ({ ...s, restartRequestedBy: undefined }));
            refundBet(gameStateRef.current.matchBet || 250);
            setToastMessage("Время ожидания реванша истекло");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState.restartRequestedBy]);

  useEffect(() => {
    const unsubscribe = mpService.subscribeToActions((action: GameAction) => {
      const currentState = gameStateRef.current;

      if (action.type === "REJECT_RESTART") {
        setGameState((prev) => ({ ...prev, restartRequestedBy: undefined }));
        if (
          gameStateRef.current.restartRequestedBy ===
          (mpService.isHost ? "HOST" : "GUEST")
        ) {
          refundBet(gameStateRef.current.matchBet || 250);
          setToastMessage("Соперник отклонил предложение о реванше.");
        }
        return;
      }

      if (action.type === "CONFIRM_RESTART") {
        matchResultRecordedRef.current = false;
        setGameState((prev) =>
          gameReducer(prev, { ...action, senderId: "remote" }),
        );

        if (mpService.isHost) {
          const newState = createInitialState(
            gameStateRef.current.mode,
            gameStateRef.current.opponent,
            gameStateRef.current.playerRole,
            gameStateRef.current.spies?.length ?? 3,
            gameStateRef.current.spyTargetTrophies ?? 3,
            gameStateRef.current.maxTurns ?? 16,
            profile.nickname
          );
          newState.matchBet = gameStateRef.current.matchBet;
          newState.matchPot = gameStateRef.current.matchPot;
          if (newState.spies && gameStateRef.current.spies) {
            newState.spies[0].name = gameStateRef.current.spies[0].name;
            newState.spies[1].name = gameStateRef.current.spies[1].name;
          }
          mpService.broadcastMatchStart(newState);

          setGameState(newState);
          setActiveMode(newState.mode);
          setIsLobbyOpen(false);
          setHasStartedEver(true);
          setIsIntroPhase(true);
          setSecondsElapsed(0);
        }
        return;
      }

      if (action.type === "RESTART_GAME" || action.type === "MATCH_STARTED") {
        matchResultRecordedRef.current = false;
        setGameState((prev) => {
          const newState =
            action.type === "MATCH_STARTED"
              ? action.payload.state
              : gameReducer(prev, action);

          setActiveMode(newState.mode);

          if (newState.opponent === "ONLINE") {
                    return {
                      ...newState,
                      playerRole: mpService.isHost ? "KILLER" : "DETECTIVE", // Строгая синхронизация ролей
                    };
                  }
          return newState;
        });
        setIsLobbyOpen(false);
        setHasStartedEver(true);
        setIsIntroPhase(true);
        setSecondsElapsed(0);
        return;
      }

      if (action.senderId === "remote") {
        if (
          action.type !== "SET_MATCH_POT" &&
          action.type !== "MATCH_STARTED" &&
          action.type !== "RESTART_GAME" &&
          action.type !== "PLAYER_READY"
        ) {
          setIsIntroPhase(false); // Сбрасываем интро, если уже пошли игровые ходы от соперника
        }

        if (action.type === "SHIFT_BOARD") soundManager.play('slide');
        if (action.type === "KILL_CHARACTER") soundManager.play('kill');
        if (action.type === "ROB_NEIGHBOR") soundManager.play('slide');
        if (action.type === "INTERROGATE") soundManager.play('radar');
        if (action.type === "CLEANUP") soundManager.play('slide');
        if (action.type === "DISGUISE" || action.type === "FAST_DISGUISE" || action.type === "ESCAPE_MANIAC") soundManager.play('disguise');
        if (action.type === "EXONERATE") soundManager.play('radar');

        if (action.type === "ACCUSE") {
          if (action.payload?.isMiss) {
            soundManager.play('error');
            setErrorCardId(action.payload.errorCardId || action.payload.targetId);
            setTimeout(() => setErrorCardId(null), 500);
          } else {
            soundManager.play('arrest');
          }
        }

        if (action.type === "CAPTURE_SPY") {
          if (action.payload?.isMiss) {
            soundManager.play('error');
            setErrorCardId(action.payload.errorCardId || action.payload.targetId);
            setTimeout(() => setErrorCardId(null), 500);
          } else {
            soundManager.play('arrest');
          }
        }
      }

      setGameState((prev) => {
        const nextState = gameReducer(prev, { ...action, senderId: "remote" });
        if (!mpService.isHost && action.nextTurn) {
          nextState.currentTurn = action.nextTurn;
        }
        return nextState;
      });
    });

    mpService.onRoomClosed = () => {
      setIsIntroPhase(false);
      setOpponentDisconnectedNotice(true);
    };

    return () => {
      unsubscribe();
      mpService.onRoomClosed = null;
    };
  }, []);

  useEffect(() => {
    if (!isLobbyOpen && gameState.opponent === "ONLINE") {
      let disconnectTimer: NodeJS.Timeout | null = null;

      mpService.onPresenceChanged = (connected) => {
        setIsOpponentConnected(connected);
        if (!connected) {
          disconnectTimer = setTimeout(() => {
            if (gameStateRef.current.restartRequestedBy === (mpService.isHost ? "HOST" : "GUEST") || !gameStateRef.current.winner) {
              refundBet(gameStateRef.current.matchBet || 250);
            }
            setOpponentDisconnectedNotice(true);
          }, 60000);
        } else {
          if (disconnectTimer) clearTimeout(disconnectTimer);
          setOpponentDisconnectedNotice(false);
        }
      };

      mpService.onRoomClosed = () => {
        if (gameStateRef.current.restartRequestedBy === (mpService.isHost ? "HOST" : "GUEST") || !gameStateRef.current.winner) {
          refundBet(gameStateRef.current.matchBet || 250);
        }
        setIsIntroPhase(false);
        setOpponentDisconnectedNotice(true);
      };

      return () => {
        if (disconnectTimer) clearTimeout(disconnectTimer);
        mpService.onPresenceChanged = null;
        mpService.onPlayerDisconnected = null;
        mpService.onRoomClosed = null;
      };
    }
  }, [isLobbyOpen, gameState.opponent]);

  // Инициализация звука теперь обрабатывается внутри SplashScreen

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [gameState.log, isLogOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const isGameRunning = hasStartedEver && !isIntroPhase && !gameState.winner;

    if (isGameRunning) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [hasStartedEver, isIntroPhase, gameState.winner]);

  useEffect(() => {
    if (gameState.winner && !matchResultRecordedRef.current) {
      soundManager.play(gameState.winner === gameState.playerRole ? 'win' : 'lose');
      triggerHaptic("success");

      let isLocalWin = false;
      if (gameState.mode === "SECRET_SERVICE") {
        const mySpyIndex =
          gameState.opponent === "ONLINE"
            ? mpService.isHost
              ? 0
              : 1
            : (gameState.activeSpyIndex ?? 0);
        const mySpy = gameState.spies?.[mySpyIndex];
        isLocalWin =
          (mySpy?.trophies ?? 0) >= (gameState.spyTargetTrophies ?? 3);
      } else {
        isLocalWin = gameState.winner === gameState.playerRole;
      }

      if (gameState.opponent === "ONLINE") {
        if (isLocalWin) {
          awardPrize(gameState.matchPot || 0);
        }
        recordMatchResult(isLocalWin);
      } else {
        recordMatchResult(isLocalWin);
      }
      matchResultRecordedRef.current = true;
    }
  }, [
    gameState.winner,
    gameState.opponent,
    gameState.mode,
    gameState.playerRole,
    gameState.spies,
    gameState.spyTargetTrophies,
  ]);

  useEffect(() => {
    if (
      isIntroPhase ||
      isLobbyOpen ||
      gameState.winner ||
      gameState.opponent === "ONLINE" ||
      gameState.opponent === "PVP"
    ) {
      return;
    }

    const isAITurn =
      gameState.mode === "SECRET_SERVICE"
        ? gameState.spies
          ? gameState.spies[gameState.activeSpyIndex ?? 0]?.isAI === true
          : false
        : gameState.currentTurn !== gameState.playerRole;

    if (isAITurn) {
      setIsAIThinking(true);
      const timer = setTimeout(() => {
        setGameState((prev) => {
          if (prev.winner) return prev;
          if (prev.mode === "SECRET_SERVICE")
            return getSecretServiceAIMove(prev);
          if (prev.mode === "THIEF_HUNT") {
            if (prev.currentTurn === "KILLER") return getThiefAIMove(prev);
            return getPoliceAIMove(prev);
          }
          if (prev.currentTurn === "KILLER") return getKillerAIMove(prev);
          return getDetectiveAIMove(prev);
        });
        setIsAIThinking(false);
        setSelectedId(null);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [
    isIntroPhase,
    isLobbyOpen,
    gameState.currentTurn,
    gameState.winner,
    gameState.opponent,
    gameState.playerRole,
    gameState.mode,
    gameState.activeSpyIndex,
    gameState.spies,
  ]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const allChars = gameState.board.flat();
  const killerChar = allChars.find((c) => c.id === gameState.killerSecretId) 
    ?? CHARACTERS_DATA.find((c) => c.id === gameState.killerSecretId);
  const detectiveChar = allChars.find((c) => c.id === gameState.detectiveSecretId)
    ?? CHARACTERS_DATA.find((c) => c.id === gameState.detectiveSecretId);

  const activeSpy =
    gameState.mode === "SECRET_SERVICE" && gameState.spies
      ? gameState.spies[gameState.activeSpyIndex ?? 0]
      : null;
  const currentSpyName = activeSpy?.name ?? "Шпион";

  const inspectorChoices = (gameState.inspectorChoices ?? [])
    .map((id) => allChars.find((c) => c.id === id))
    .filter(Boolean) as typeof allChars;

  const isCleanupAvailable =
    canCleanupBoard(gameState.board) && !gameState.winner;
  const isFirstTurnKiller =
    gameState.mode === "SKHVATKA" &&
    gameState.killCount === 0 &&
    gameState.currentTurn === "KILLER";

  const spy1Id =
    gameState.mode === "SECRET_SERVICE" && gameState.spies
      ? gameState.spies[0]?.secretId
      : null;
  const spy2Id =
    gameState.mode === "SECRET_SERVICE" &&
    gameState.spies &&
    gameState.spies.length > 1
      ? gameState.spies[1]?.secretId
      : null;

  const killerAdjacentIds = getAdjacentCharacters(
    gameState.board,
    gameState.mode === "SECRET_SERVICE" ? (spy1Id ?? gameState.killerSecretId) : (spy2Id ?? gameState.killerSecretId),
  ).map((c) => c.id);

  const detectiveAdjacentIds = useMemo(() => {
    const targetId = gameState.mode === "SECRET_SERVICE" 
      ? (spy2Id ?? gameState.detectiveSecretId) 
      : (spy1Id ?? gameState.detectiveSecretId);
      
    const baseNeighbors = getAdjacentCharacters(gameState.board, targetId).map((c) => c.id);
    
    if (gameState.mode === "THIEF_HUNT" && gameState.uniformedOfficers) {
      const combined = new Set(baseNeighbors);
      gameState.uniformedOfficers.forEach((officerId) => {
        getAdjacentCharacters(gameState.board, officerId).forEach((c) => combined.add(c.id));
      });
      return Array.from(combined);
    }
    
    return baseNeighbors;
  }, [gameState.board, gameState.detectiveSecretId, gameState.uniformedOfficers, gameState.mode, spy1Id, spy2Id]);

  const radarTargetId = gameState.interrogationRadar?.targetId;
  const radarCellIds = useMemo(() => {
    if (!radarTargetId) return [];
    const neighbors = getAdjacentCharacters(gameState.board, radarTargetId).map(
      (c) => c.id,
    );
    return [radarTargetId, ...neighbors];
  }, [gameState.board, radarTargetId]);

  const radarColorClass = gameState.interrogationRadar
    ? (gameState.mode === "SECRET_SERVICE" ? `${SPY_COLORS[gameState.interrogationRadar.interrogatorIndex % SPY_COLORS.length].ring} ${SPY_COLORS[gameState.interrogationRadar.interrogatorIndex % SPY_COLORS.length].border}` : "ring-cyan-500/80 border-cyan-500")
    : null;

  const currentModeTitle =
    GAME_MODES.find((m) => m.id === gameState.mode)?.title ?? "Схватка";

  const isPVP = gameState.opponent === "PVP";
  const isKillerTurn = gameState.currentTurn === "KILLER";
  const isDetectiveTurn = gameState.currentTurn === "DETECTIVE";
  const isKillerView = isPVP ? isKillerTurn : gameState.playerRole === "KILLER";
  const isDetectiveView = isPVP ? isDetectiveTurn : gameState.playerRole === "DETECTIVE";

  let myCharacterId: string | null = null;
  // В локальном PVP бейдж "ВЫ" строго отключен, так как оба игрока смотрят в один экран
  if (!isPVP) {
    if (gameState.mode === "SECRET_SERVICE" && gameState.spies) {
      if (gameState.opponent === "ONLINE") {
        myCharacterId = mpService.isHost ? gameState.spies[0].secretId : gameState.spies[1].secretId;
      } else if (gameState.opponent === "AI") {
        myCharacterId = gameState.spies[0].secretId;
      }
    } else {
      const isSelectingInspector = gameState.mode === "SKHVATKA" && Boolean(gameState.inspectorChoices && gameState.inspectorChoices.length > 0) && gameState.playerRole === "DETECTIVE";
      if (!isSelectingInspector) {
        myCharacterId = gameState.playerRole === "KILLER" ? gameState.killerSecretId : gameState.detectiveSecretId;
      }
    }
  }

  let role1Name = "БАНДИТ";
  let role2Name = "ИНСПЕКТОР";
  if (gameState.mode === "MANIAC_VS_OPERATIVE") {
    role1Name = "МАНЬЯК";
    role2Name = "ОПЕРАТИВНИК";
  } else if (gameState.mode === "SECRET_SERVICE") {
    role1Name = gameState.spies?.[0]?.name ?? "Агент 1";
    role2Name = gameState.spies?.[1]?.name ?? "Агент 2";
  } else if (gameState.mode === "THIEF_HUNT") {
    role1Name = "ГРАБИТЕЛЬ";
    role2Name = "ПОЛИЦИЯ";
  }

  let currentRoleName = isKillerTurn ? role1Name : role2Name;
  if (gameState.mode === "SECRET_SERVICE" && gameState.spies) {
    currentRoleName = gameState.spies[gameState.activeSpyIndex ?? 0].name;
  }

  let actionPanelRoleName = isKillerView ? role1Name : role2Name;
  if (gameState.mode === "SECRET_SERVICE") {
    if (gameState.opponent === "ONLINE") {
      const mySpyIndex = mpService.isHost ? 0 : 1;
      actionPanelRoleName =
        gameState.spies?.[mySpyIndex]?.name ?? currentRoleName;
    } else if (gameState.opponent === "AI") {
      actionPanelRoleName = gameState.spies?.[0]?.name ?? currentRoleName;
    } else {
      actionPanelRoleName = currentRoleName;
    }
  }

  let isHumanTurn = false;
  if (gameState.opponent === "ONLINE") {
    if (gameState.mode === "SECRET_SERVICE") {
      isHumanTurn = mpService.isHost
        ? gameState.activeSpyIndex === 0
        : gameState.activeSpyIndex === 1;
    } else {
      isHumanTurn = gameState.currentTurn === gameState.playerRole;
    }
  } else if (gameState.opponent === "PVP") {
    isHumanTurn = true;
  } else {
    if (gameState.mode === "SECRET_SERVICE") {
      isHumanTurn = gameState.spies
        ? gameState.spies[gameState.activeSpyIndex ?? 0]?.isAI === false
        : true;
    } else {
      isHumanTurn = gameState.currentTurn === gameState.playerRole;
    }
  }

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
    betAmount: number = 250,
  ) => {
    matchResultRecordedRef.current = false;

    const actualPlayerRole =
      opponent === "ONLINE"
        ? mpService.isHost
          ? "KILLER"
          : "DETECTIVE"
        : playerRole;

    const newState = createInitialState(
      modeId,
      opponent,
      actualPlayerRole,
      playerCount,
      targetTrophies,
      maxTurns,
      opponent === "PVP" ? undefined : profile.nickname
    );

    if (
      opponent === "ONLINE" &&
      modeId === "SECRET_SERVICE" &&
      newState.spies
    ) {
      newState.spies[0].name = `Агент «${mpService.hostName || "Восток"}»`;
      newState.spies[1].name = `Агент «${mpService.guestName || "Запад"}»`;
    }

    if (opponent === "ONLINE" && mpService.isHost) {
      newState.matchPot = betAmount * 2;
      newState.matchBet = betAmount;
      mpService.broadcastMatchStart(newState);
    }

    setActiveMode(modeId);
    setGameState(newState);
    setSelectedId(null);
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

  const handleShift = (
    type: "ROW" | "COL",
    index: number,
    direction: "FORWARD" | "BACKWARD",
  ) => {
    if (gameState.winner || isFirstTurnKiller || !isHumanTurn) return;
    soundManager.play('slide');
    triggerHaptic("light");
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
    soundManager.play('kill');
    triggerHaptic("heavy");
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
    soundManager.play('slide');
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
    soundManager.play('disguise');
    triggerHaptic("medium");
    dispatchAction({
      type: "ESCAPE_MANIAC",
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleFastDisguise = (id: string) => {
    if (gameState.currentTurn !== "KILLER" || !isHumanTurn) return;
    soundManager.play('disguise');
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
    if (!targetChar || !targetChar.isAlive) return;

    const isMiss =
      selectedId !== gameState.killerSecretId && !targetChar.hasBomb;
    if (isMiss) {
      soundManager.play('error');
      triggerHaptic("error");
      setErrorCardId(selectedId);
      setTimeout(() => setErrorCardId(null), 500);
    } else {
      soundManager.play('arrest');
      triggerHaptic("medium");
    }

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
    soundManager.play('disguise');
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
    soundManager.play('radar');
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
    soundManager.play('slide');
    triggerHaptic("medium");
    dispatchAction({
      type: "CLEANUP",
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleSwearInOfficer = () => {
    if (!selectedId || gameState.currentTurn !== "DETECTIVE" || !isHumanTurn) return;
    soundManager.play('slide');
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
    const isMiss = !gameState.spies!.some(
      (s) => s.id !== mySpy.id && s.secretId === selectedId,
    );

    if (isMiss) {
      soundManager.play('error');
      triggerHaptic("error");
      setErrorCardId(selectedId);
      setTimeout(() => setErrorCardId(null), 500);
    } else {
      soundManager.play('arrest');
      triggerHaptic("medium");
    }

    const nextSpyIndex = (mySpyIndex + 1) % (gameState.spies?.length || 3);

    dispatchAction({
      type: "CAPTURE_SPY",
      payload: { targetId: selectedId, nextSpyIndex, isMiss, errorCardId: selectedId } as any,
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleInterrogateSpy = () => {
    if (!selectedId || gameState.mode !== "SECRET_SERVICE" || !isHumanTurn)
      return;
    soundManager.play('radar');
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
    if (gameState.opponent === "ONLINE" && mpService.roomCode) {
      dispatchAction({
        type: "REQUEST_RESTART",
        payload: { requestedBy: mpService.isHost ? "HOST" : "GUEST" },
        senderId: "local",
      });
    } else {
      handleStartNewGame(
        gameState.mode,
        gameState.opponent,
        gameState.playerRole,
        gameState.spies?.length ?? 3,
        4,
        gameState.maxTurns ?? 16,
      );
    }
  };

  const acceptRestart = () => {
    dispatchAction({ type: "CONFIRM_RESTART", senderId: "local" });

    if (mpService.isHost) {
      const newState = createInitialState(
        gameStateRef.current.mode,
        gameStateRef.current.opponent,
        gameStateRef.current.playerRole,
        gameStateRef.current.spies?.length ?? 3,
        gameStateRef.current.spyTargetTrophies ?? 3,
        gameStateRef.current.maxTurns ?? 16,
      );
      newState.matchBet = gameStateRef.current.matchBet;
      newState.matchPot = gameStateRef.current.matchPot;
      if (newState.spies && gameStateRef.current.spies) {
        newState.spies[0].name = gameStateRef.current.spies[0].name;
        newState.spies[1].name = gameStateRef.current.spies[1].name;
      }
      mpService.broadcastMatchStart(newState);

      setGameState(newState);
      setActiveMode(newState.mode);
      setIsLobbyOpen(false);
      setHasStartedEver(true);
      setIsIntroPhase(true);
      setSecondsElapsed(0);
      setIsInspectorPassConfirmed(false);
    }
  };

  const rejectRestart = () => {
    dispatchAction({ type: "REJECT_RESTART", senderId: "local" });
    setGameState((prev) => ({ ...prev, restartRequestedBy: undefined }));
  };

  const activeAgentAdjacentIds = isKillerTurn
    ? killerAdjacentIds
    : detectiveAdjacentIds;

  const selectedCharacter = useMemo(() => {
    if (!selectedId) return null;
    return gameState.board.flat().find((c) => c.id === selectedId) ?? null;
  }, [gameState.board, selectedId]);

  const availableActions = useMemo<ActionItem[]>(() => {
        const actions: ActionItem[] = [];
        const isGameOver = gameState.winner !== null;

        if (gameState.mode === "SECRET_SERVICE") {
          const activeSpySecretId = gameState.spies?.[gameState.activeSpyIndex ?? 0]?.secretId;
          const validNeighbors = activeSpySecretId
            ? getAdjacentCharacters(gameState.board, activeSpySecretId).map((c) => c.id)
            : [];
          const isNeighbor = Boolean(selectedId && validNeighbors.includes(selectedId));
          const isSelfOrNeighbor = Boolean(selectedId && (validNeighbors.includes(selectedId) || selectedId === activeSpySecretId));

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
          "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white shadow-[0_10px_25px_rgba(220,38,38,0.5)] border-t border-red-400/50 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2",
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
          "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white shadow-[0_10px_25px_rgba(37,99,235,0.5)] border-t border-blue-400/50 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2",
      });
      actions.push({
        id: "cleanup_ss",
        label: "Зачистить",
        onClick: handleCleanup,
        disabled: !isHumanTurn || !isCleanupAvailable,
        className:
          "py-1.5 sm:py-2 md:py-3.5 bg-zinc-900 border border-zinc-700 text-zinc-300 disabled:opacity-50 text-[9px] sm:text-[10px] md:text-xs font-bold rounded-xl transition disabled:cursor-not-allowed flex items-center justify-center gap-2",
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
              (!killerAdjacentIds.includes(selectedId) && selectedId !== gameState.killerSecretId) ||
              isGameOver ||
              Boolean(selectedCharacter?.isRobbed),
            className:
              "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white shadow-[0_10px_25px_rgba(217,119,6,0.5)] border-t border-amber-400/50 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2",
          });
          actions.push({
            id: "disguise_thief",
            label: "Конспирация",
            onClick: () => setIsHandSheetOpen(true),
            disabled: !isHumanTurn || isGameOver,
            className:
              "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white shadow-[0_10px_25px_rgba(217,119,6,0.5)] border-t border-amber-400/50 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2",
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
              isGameOver ||
              (gameState.mode === "MANIAC_VS_OPERATIVE" && selectedId !== gameState.victimList[0]),
            className:
              "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white shadow-[0_10px_25px_rgba(220,38,38,0.5)] border-t border-red-400/50 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2",
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
              "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white shadow-[0_10px_25px_rgba(217,119,6,0.5)] border-t border-amber-400/50 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2",
          });
        }
        if (gameState.mode === "MANIAC_VS_OPERATIVE") {
          actions.push({
            id: "escape_maniac",
            label: "Конспирация",
            onClick: handleEscapeManiac,
            disabled:
              !isHumanTurn || gameState.evidenceDeck.length < 2 || isGameOver,
            className:
              "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white shadow-[0_10px_25px_rgba(217,119,6,0.5)] border-t border-amber-400/50 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2",
          });
        }
      } else {
        actions.push({
          id: "accuse_basic",
          label: "Задержание",
          onClick: handleAccuse,
          disabled: (() => {
            if (!isHumanTurn || !selectedId || !selectedCharacter?.isAlive || isGameOver) return true;
            let isAdjacent = detectiveAdjacentIds.includes(selectedId);
            let isSelf = selectedId === gameState.detectiveSecretId;
            if (gameState.mode === "THIEF_HUNT" && gameState.uniformedOfficers) {
              const isNearOfficer = gameState.uniformedOfficers.some((offId) =>
                getAdjacentCharacters(gameState.board, offId).map(c => c.id).includes(selectedId)
              );
              const isOfficerSelf = gameState.uniformedOfficers.includes(selectedId);
              isAdjacent = isAdjacent || isNearOfficer;
              isSelf = isSelf || isOfficerSelf;
            }
            return !isAdjacent && !isSelf;
          })(),
          className:
            "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white shadow-[0_10px_25px_rgba(37,99,235,0.5)] border-t border-blue-400/50 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2",
        });

        if (gameState.mode === "THIEF_HUNT") {
          actions.push({
            id: "patrol_call",
            label: "Вызов патруля",
            onClick: handleSwearInOfficer,
            disabled: !isHumanTurn || !selectedId || !gameState.uniformedOfficers?.includes(selectedId) || isGameOver || gameState.evidenceDeck.length === 0,
            className: "py-2 sm:py-2.5 md:py-3.5 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white shadow-[0_10px_25px_rgba(37,99,235,0.5)] border-t border-blue-400/50 disabled:opacity-40 disabled:shadow-none text-[10px] sm:text-[11px] md:text-sm font-black rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2",
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
    isKillerView,
    isHumanTurn,
    selectedId,
    killerAdjacentIds,
    detectiveAdjacentIds,
    activeAgentAdjacentIds,
    isCleanupAvailable,
    isFirstTurnKiller,
    selectedCharacter,
  ]);

  let canPeekKiller = false;
  let canPeekDetective = false;

  if (gameState.mode === "SECRET_SERVICE") {
    if (gameState.opponent === "ONLINE") {
      canPeekKiller = mpService.isHost;
      canPeekDetective = !mpService.isHost;
    } else if (isPVP) {
      canPeekKiller = gameState.activeSpyIndex === 0;
      canPeekDetective = gameState.activeSpyIndex === 1;
    } else {
      canPeekKiller = true;
      canPeekDetective = false;
    }
  } else {
    // В онлайне и с ботом игрок всегда видит СВОЮ роль в ЛЮБОЙ момент матча:
    if (gameState.opponent === "ONLINE" || gameState.opponent === "AI") {
      canPeekKiller = gameState.playerRole === "KILLER";
      canPeekDetective = gameState.playerRole === "DETECTIVE";
    } else {
      // На одном устройстве (PVP) — строго в свой ход:
      canPeekKiller = isKillerTurn;
      canPeekDetective = isDetectiveTurn;
    }
  }

  const killerNameText =
    showKillerRole || showSpyP1Role
      ? gameState.mode === "SECRET_SERVICE"
        ? (allChars.find((c) => c.id === gameState.spies?.[0]?.secretId)
            ?.name ?? "Неизвестно")
        : (killerChar?.name ?? "Неизвестно")
      : "••••••••";

  const detectiveNameText =
    showDetectiveRole || showSpyP2Role
      ? gameState.mode === "SECRET_SERVICE"
        ? (allChars.find((c) => c.id === gameState.spies?.[1]?.secretId)
            ?.name ?? "Неизвестно")
        : (detectiveChar?.name ?? "Неизвестно")
      : "••••••••";

  let pillClasses = "";
  let dotClasses = "";
  if (isAIThinking) {
    pillClasses =
      "bg-amber-950/90 border-amber-500 text-amber-200 animate-pulse";
    dotClasses = "bg-amber-500 shadow-amber-500/80";
  } else if (gameState.mode === "SECRET_SERVICE") {
    const isP1Turn = gameState.activeSpyIndex === 0;
    if (isP1Turn) {
      pillClasses = "bg-red-950/80 border-red-600 text-red-100";
      dotClasses = "bg-red-500 shadow-red-500/80";
    } else {
      pillClasses = "bg-blue-950/80 border-blue-600 text-blue-100";
      dotClasses = "bg-blue-500 shadow-blue-500/80";
    }
  } else {
    if (isKillerTurn) {
      pillClasses = "bg-red-950/80 border-red-600 text-red-100";
      dotClasses = "bg-red-500 shadow-red-500/80";
    } else {
      pillClasses = "bg-blue-950/80 border-blue-600 text-blue-100";
      dotClasses = "bg-blue-500 shadow-blue-500/80";
    }
  }

  const targetActions = availableActions.filter(
    (a) => a.id !== "cleanup_ss" && a.id !== "cleanup_basic",
  );
  const cleanupAction = availableActions.find(
    (a) => a.id === "cleanup_ss" || a.id === "cleanup_basic",
  );

  const handlePeekStart = () => {
    if (!isHumanTurn) return;
    if (gameState.mode === "SECRET_SERVICE") {
      if (gameState.activeSpyIndex === 0) setShowSpyP1Role(true);
      else setShowSpyP2Role(true);
    } else {
      if (isKillerTurn) setShowKillerRole(true);
      else setShowDetectiveRole(true);
    }
  };

  const handlePeekEnd = () => {
    setShowKillerRole(false);
    setShowDetectiveRole(false);
    setShowSpyP1Role(false);
    setShowSpyP2Role(false);
  };

  const isPeeking =
    showKillerRole || showDetectiveRole || showSpyP1Role || showSpyP2Role;
  let peekName = "••••••••";
  if (isPeeking) {
    if (gameState.mode === "SECRET_SERVICE") {
      const spyIdx = gameState.activeSpyIndex === 0 ? 0 : 1;
      peekName =
        allChars.find((c) => c.id === gameState.spies?.[spyIdx]?.secretId)
          ?.name || "";
    } else {
      peekName = isKillerTurn
        ? killerChar?.name || ""
        : detectiveChar?.name || "";
    }
  }

  return (
    <I18nProvider>
      <div className="fixed inset-0 w-full h-full flex flex-col bg-[#080a0f] overflow-hidden select-none">
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <Toast message={toastMessage} type="info" onClose={() => setToastMessage(null)} />
      <div className="w-full max-w-7xl mx-auto h-full relative flex flex-col overflow-hidden"> 
        {isLobbyOpen && (
          <MainMenu
            profile={profile}
            onUpdateProfile={updateProfile}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onStartGame={handleStartNewGame}
            hasActiveGame={!gameState.winner && gameState.log.length > 2}
            onResumeGame={handleResumeGame}
            onOpenRules={() => setIsRulesOpen(true)}
          />
        )}

        {isIntroPhase && !isLobbyOpen && (
          <RoleRevealModal
            mode={gameState.mode}
            opponent={gameState.opponent}
            playerRole={gameState.playerRole}
            isOpponentConnected={isOpponentConnected}
            onCancelMatch={async () => {
              sessionStorage.removeItem('mp_session');
              await mpService.leaveRoom();
              setGameState(createInitialState("SKHVATKA", "AI", "DETECTIVE", 3, 3, 16, profile.nickname));
              setHasStartedEver(false);
              setIsIntroPhase(false);
              setIsLobbyOpen(true);
            }}
            role1Name={
              gameState.mode === "SECRET_SERVICE"
                ? (gameState.opponent === "PVP" ? "Фантом" : (gameState.spies?.[0]?.name || "Агент 1"))
                : mpService.isHost
                  ? profile.nickname || "Бандит"
                  : "Бандит"
            }
            role2Name={
              gameState.mode === "SECRET_SERVICE"
                ? (gameState.opponent === "PVP" ? "Призрак" : (gameState.spies?.[1]?.name || "Агент 2"))
                : !mpService.isHost
                  ? profile.nickname || "Инспектор"
                  : "Инспектор"
            }
            killer={
              gameState.mode === "SECRET_SERVICE"
                ? gameState.spies && gameState.spies.length > 1
                  ? gameState.opponent === "ONLINE"
                    ? mpService.isHost
                      ? allChars.find(
                          (c) => c.id === gameState.spies![0].secretId,
                        )
                      : allChars.find(
                          (c) => c.id === gameState.spies![1].secretId,
                        )
                    : allChars.find(
                        (c) => c.id === gameState.spies![1].secretId,
                      )
                  : undefined
                : (gameState.opponent === "AI" ||
                      gameState.opponent === "ONLINE") &&
                    gameState.playerRole === "DETECTIVE"
                  ? undefined
                  : killerChar
            }
            detective={
              gameState.mode === "SECRET_SERVICE"
                ? gameState.spies && gameState.spies.length > 0
                  ? gameState.opponent === "ONLINE"
                    ? mpService.isHost
                      ? allChars.find(
                          (c) => c.id === gameState.spies![0].secretId,
                        )
                      : allChars.find(
                          (c) => c.id === gameState.spies![1].secretId,
                        )
                    : allChars.find(
                        (c) => c.id === gameState.spies![0].secretId,
                      )
                  : undefined
                : (gameState.opponent === "AI" ||
                      gameState.opponent === "ONLINE") &&
                    gameState.playerRole === "KILLER"
                  ? undefined
                  : detectiveChar
            }
            inspectorChoices={inspectorChoices}
            onSelectDetectiveRole={handleSelectInspectorRole}
            onComplete={() => setIsIntroPhase(false)}
          />
        )}

        {/* ВЫБОР РОЛИ ИНСПЕКТОРА В СХВАТКЕ (СТРОГО В СВОЙ ХОД ПОСЛЕ ВЫСТРЕЛА БАНДИТА) */}
        {gameState.mode === "SKHVATKA" && Boolean(gameState.inspectorChoices && gameState.inspectorChoices.length > 0) && isDetectiveView && isDetectiveTurn && !gameState.winner && !isIntroPhase && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end sm:justify-center p-4 select-none pointer-events-none overflow-hidden">
            {gameState.opponent === "PVP" && !isInspectorPassConfirmed ? (
              <div className="absolute inset-0 bg-[#080a0f]/95 backdrop-blur-xl flex items-center justify-center p-4 pointer-events-auto">
                <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-cyan-950/50 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-black text-2xl mb-6 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">
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
                    className="w-full h-14 bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-800 hover:from-cyan-600 hover:to-cyan-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.45)] flex items-center justify-center gap-2 shrink-0"
                  >
                    <span>Я держу телефон один</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Затемнение фона */}
                <div 
                  className={`absolute inset-0 bg-black/60 transition-opacity duration-500 ease-out pointer-events-auto ${isChoiceSheetMinimized ? "opacity-0 pointer-events-none" : "opacity-100"}`} 
                  onClick={() => setIsChoiceSheetMinimized(true)} 
                />
                
                {/* Компактная плашка (свернутое состояние) */}
                <div className={`absolute bottom-8 transition-all duration-500 ease-out transform pointer-events-auto ${isChoiceSheetMinimized ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"}`}>
                  <button
                    onClick={() => setIsChoiceSheetMinimized(false)}
                    className="h-12 px-6 bg-zinc-950 border border-cyan-500/30 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2 text-cyan-400 font-black uppercase tracking-widest text-[10px] hover:bg-zinc-900 transition"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    <span>Вернуться к выбору личности</span>
                  </button>
                </div>

                {/* Развернутая панель */}
                <div className={`relative w-full max-w-md bg-zinc-950 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col text-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform pointer-events-auto ${isChoiceSheetMinimized ? "translate-y-[110%] opacity-0" : "translate-y-0 opacity-100"}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
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
                      const isSelected = selectedId === char.id;
                      return (
                        <div
                          key={char.id}
                          onClick={() => setSelectedId(char.id)}
                          className={`relative flex flex-col justify-between p-4 rounded-2xl border text-left cursor-pointer transition select-none min-h-[105px] overflow-hidden ${
                            isSelected
                              ? "bg-cyan-950/40 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.35)] scale-[1.02]"
                              : "bg-zinc-900/50 border-white/5 hover:border-white/20 text-zinc-400"
                          }`}
                        >
                          <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                            <span>#{char.id.replace("c", "").padStart(2, "0")}</span>
                            {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.9)]" />}
                          </div>
                          <div className={`relative z-10 text-xs font-black uppercase tracking-wider mt-3 ${isSelected ? "text-cyan-100" : "text-zinc-200"}`}>
                            {char.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      if (selectedId) {
                        handleSelectInspectorRole(selectedId);
                        setSelectedId(null);
                        setIsChoiceSheetMinimized(false);
                        setIsInspectorPassConfirmed(false);
                      }
                    }}
                    disabled={!selectedId || !inspectorChoices.some(c => c.id === selectedId)}
                    className="w-full h-14 bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-800 hover:from-cyan-600 hover:to-cyan-500 disabled:from-zinc-800 disabled:to-zinc-900 disabled:text-zinc-600 disabled:shadow-none text-white text-[10px] font-black uppercase tracking-widest rounded-full transition cursor-pointer disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.45)] flex items-center justify-center gap-2 shrink-0"
                  >
                    <span>Подтвердить личность</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 1. КОМПАКТНАЯ ШАПКА МАТЧА */}
        <header className="w-full px-4 sm:px-6 pb-2.5 bg-zinc-950 border-b border-zinc-800 shrink-0 relative flex items-center justify-between z-30 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPauseOpen(true)}
              className="w-8 h-8 md:w-11 md:h-11 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer"
              title="Пауза и меню"
            >
              <span>☰</span>
            </button>
            <button
              onClick={() => {
                setIsLogOpen(true);
                setUnreadLogCount(0);
              }}
              className="relative w-8 h-8 md:w-11 md:h-11 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer lg:hidden"
              title="Блокнот расследования"
            >
              <span>📝</span>
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

        {!isOpponentConnected && !opponentDisconnectedNotice && gameState.opponent === "ONLINE" && (
          <div className="w-full bg-amber-950/80 border-b border-amber-700/80 text-amber-200 text-[10px] font-black uppercase tracking-widest py-2 flex justify-center items-center gap-2 shadow-inner z-20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Соперник переподключается... (ожидание)
          </div>
        )}

        {/* СТАТУС БАНКА / ТРОФЕЕВ */}
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
          ) : gameState.mode === "THIEF_HUNT" ? (
            <div>
              Добыча:{" "}
              <b className="text-amber-400">
                {gameState.trophiesKiller ?? 0}/5
              </b>{" "}
              | Улики: {gameState.evidenceDeck.length}
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
            <span className="hidden md:inline">⚔️ Режим:</span>
            <span>
              {gameState.opponent === "ONLINE"
                ? "онлайн"
                : gameState.opponent === "AI"
                  ? "против бота"
                  : "вдвоем"}
            </span>
          </div>
        </div>

        {/* ФИКСИРОВАННАЯ ПОЛОСА ДОПРОСА / ЦЕЛИ МАНЬЯКА */}
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
                {gameState.spies?.slice(0, 2).map((spy) => {
                  const hasContact =
                    gameState.lastSpyInterrogation?.raisedHandsPlayerNames.includes(
                      spy.name,
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

        <div className="flex-1 min-h-0 w-full flex flex-col landscape:flex-row items-center justify-start landscape:justify-between gap-2 md:gap-6 lg:gap-8 px-2 sm:px-4 md:px-6 py-1 md:py-4 overflow-y-auto landscape:overflow-hidden custom-scrollbar">
          {/* 2. ИГРОВОЕ ПОЛЕ */}
          <main className="flex-1 min-h-0 w-full max-w-xl md:max-w-3xl landscape:max-w-none flex flex-col items-center justify-center">
            {/* ТИКЕР СОБЫТИЙ */}
            {gameState.log.length > 0 && (
              <div className="w-full max-w-md md:max-w-xl mb-1 px-3 py-1 md:py-2 bg-zinc-900/90 border border-zinc-800 rounded-lg text-[10px] sm:text-xs md:text-xs font-mono text-amber-400/90 truncate text-center shadow-sm shrink-0">
                {gameState.log[gameState.log.length - 1]}
              </div>
            )}
            <div className="w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden">
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
                radarTargetId={gameState.interrogationRadar?.targetId ?? null}
                radarCellIds={radarCellIds}
                radarColorClass={radarColorClass}
                errorCardId={errorCardId}
                myCharacterId={myCharacterId}
                onShift={handleShift}
                onSelectCharacter={(id) =>
                  isHumanTurn &&
                  setSelectedId((prev) => (prev === id ? null : id))
                }
              />
            </div>
          </main>

          {/* 3. КОНТЕКСТНАЯ ПАНЕЛЬ УПРАВЛЕНИЯ */}
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

            {/* Кнопки действий */}
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
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>
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

              {/* Нижний ряд служебных кнопок: Зачистить и Досье делят ряд пополам на мобилке */}
              <div className="grid grid-cols-2 gap-1.5 w-full mt-1">
                {cleanupAction && (
                  <button
                    onClick={cleanupAction.onClick}
                    disabled={cleanupAction.disabled}
                    className={`${
                      ((gameState.mode === "SKHVATKA" || gameState.mode === "MANIAC_VS_OPERATIVE") && isDetectiveView)
                        ? "col-span-1"
                        : "col-span-2"
                    } py-1.5 sm:py-2 md:py-3.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 hover:text-zinc-200 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase rounded-xl border border-zinc-700/80 transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5`}
                  >
                    <span>↻</span>
                    <span>Зачистить</span>
                  </button>
                )}

                {((gameState.mode === "SKHVATKA" || gameState.mode === "MANIAC_VS_OPERATIVE") && isDetectiveView) && (
                  <button
                    onClick={() => setIsHandSheetOpen(true)}
                    className={`${cleanupAction ? "col-span-1" : "col-span-2"} py-1.5 sm:py-2 md:py-3.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 rounded-xl text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer`}
                  >
                    <span>🗂</span>
                    <span>Досье ({gameState.detectiveHand.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Десктопный лог (виден только на lg и выше) */}
            <div className="hidden landscape:lg:flex flex-col flex-1 min-h-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Протокол событий ({gameState.log.length})
                </span>
                <span className="text-xs">▼</span>
              </div>
              <div
                ref={logContainerRef}
                className="flex-1 overflow-y-auto space-y-2 text-[10px] font-mono text-zinc-300 pr-2 custom-scrollbar"
              >
                {gameState.log.map((entry, idx) => (
                  <div key={idx} className="leading-relaxed">
                    • {entry}
                  </div>
                ))}
              </div>
            </div>
          </footer>
        </div>

        {/* 4. BOTTOM SHEET: ДОСЬЕ АЛИБИ / МАСОК */}
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

        {/* 5. BOTTOM SHEET: БЛОКНОТ СЫЩИКА */}
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
                  <span className="text-base">📝</span>
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
                className="overflow-y-auto space-y-2 text-xs font-mono text-zinc-300 pr-1 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
              >
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

        {/* ДИАЛОГИ И МОДАЛКИ */}
        {gameState.restartRequestedBy &&
          gameState.restartRequestedBy !==
            (mpService.isHost ? "HOST" : "GUEST") && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-4 select-none">
              <div className="w-full max-w-sm bg-zinc-900 border border-amber-500/50 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-3xl mb-4">
                  🤝
                </div>
                <h2 className="text-xl font-black text-zinc-100 mb-2">
                  Реванш?
                </h2>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                  Соперник предлагает сыграть еще раз. Ставка:{" "}
                  {gameState.matchBet || 250} $.
                </p>
                <div className="w-full flex gap-3">
                  <button
                    onClick={rejectRestart}
                    className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Отклонить
                  </button>
                  <button
                    onClick={acceptRestart}
                    className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Принять
                  </button>
                </div>
              </div>
            </div>
          )}

        {gameState.restartRequestedBy ===
          (mpService.isHost ? "HOST" : "GUEST") && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-4 select-none">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-zinc-800 border-t-amber-500 rounded-full animate-spin mb-4"></div>
              <h2 className="text-lg font-black text-zinc-100 mb-2">
                Ожидание ответа... {rematchTimer} сек
              </h2>
              <p className="text-xs text-zinc-400 mb-6">
                Ждем, пока соперник примет вызов.
              </p>
              <button
                onClick={() => {
                  dispatchAction({ type: "REJECT_RESTART", senderId: "local" });
                  setGameState((prev) => ({ ...prev, restartRequestedBy: undefined }));
                  refundBet(gameState.matchBet || 250);
                }}
                className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Отменить вызов
              </button>
            </div>
          </div>
        )}

        {opponentDisconnectedNotice && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 p-4 select-none">
            <div className="w-full max-w-sm bg-zinc-900 border border-red-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-red-950 border border-red-700 flex items-center justify-center text-3xl mb-4">
                ⚠️
              </div>
              <h2 className="text-xl font-black text-zinc-100 mb-2">
                Соперник покинул игру
              </h2>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Связь потеряна. Партия завершена.
              </p>
              <button
                onClick={() => {
                  sessionStorage.removeItem('mp_session');
                  setOpponentDisconnectedNotice(false);
                  mpService.disconnect();
                  setGameState(
                    createInitialState("SKHVATKA", "AI", "DETECTIVE", 3, 3, 16, profile.nickname),
                  );
                  setHasStartedEver(false);
                  setIsLobbyOpen(true);
                }}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                В главное меню ➔
              </button>
            </div>
          </div>
        )}

        {gameState.justCaughtSpyId &&
          !gameState.winner &&
          !isLobbyOpen &&
          gameState.spies?.find((s) => s.id === gameState.justCaughtSpyId)
            ?.isAI === false &&
          (gameState.opponent !== "ONLINE" ||
            (mpService.isHost
              ? gameState.justCaughtSpyId === gameState.spies?.[0]?.id
              : gameState.justCaughtSpyId === gameState.spies?.[1]?.id)) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 select-none">
              {!isRevealConfirmed && gameState.opponent === "PVP" ? (
                <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-700 flex items-center justify-center text-3xl mb-4">
                    🔒
                  </div>
                  <span className="text-xs font-bold text-red-400 uppercase tracking-widest block mb-1">
                    Агент разоблачен!
                  </span>
                  <h2 className="text-xl font-black text-zinc-100 mb-2">
                    Передайте экран:{" "}
                    {
                      gameState.spies.find(
                        (s) => s.id === gameState.justCaughtSpyId,
                      )?.name
                    }
                  </h2>
                  <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                    Убедитесь, что соперник не смотрит на экран.
                  </p>
                  <button
                    onClick={() => setIsRevealConfirmed(true)}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Я держу телефон один ➔
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-3xl mb-4">
                    🎭
                  </div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                    Вас раскрыли!
                  </span>
                  <h3 className="text-xl font-black text-zinc-100 mb-2">
                    Шпионская маскировка провалена. Ваша новая личность:
                  </h3>
                  {(() => {
                    const newSpyChar = allChars.find(c => c.id === gameState.spies?.find(s => s.id === gameState.justCaughtSpyId)?.secretId);
                    const newSpyImg = newSpyChar ? characterImages[`./assets/characters/${newSpyChar.id}.webp`]?.default : null;
                    return (
                      <>
                        <div 
                          className="relative w-full h-48 rounded-2xl overflow-hidden border border-zinc-700 my-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] cursor-pointer group"
                          onClick={() => newSpyImg && newSpyChar && setFullscreenImage({ url: newSpyImg, name: newSpyChar.name, id: newSpyChar.id })}
                        >
                          {newSpyImg ? (
                            <img src={newSpyImg} alt={newSpyChar?.name} className="absolute inset-0 w-full h-full object-cover opacity-75 grayscale contrast-125 group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-zinc-500">Нет фото</div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-3 pt-12 flex flex-col items-center">
                            <span className="text-[10px] font-mono text-zinc-400 mb-1">#{newSpyChar?.id.replace("c", "").padStart(2, "0")}</span>
                            <span className="text-xl font-black text-zinc-100 uppercase tracking-wider leading-tight text-center mb-1">{newSpyChar?.name}</span>
                            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-zinc-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                              <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">Тапните для полного фото</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setIsRevealConfirmed(false);
                            setGameState((prev) => ({
                              ...prev,
                              justCaughtSpyId: undefined,
                            }));
                          }}
                          className="w-full py-3.5 bg-gradient-to-r from-zinc-700 to-zinc-600 hover:from-zinc-600 hover:to-zinc-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-[0_10px_25px_rgba(0,0,0,0.5)] border-t border-white/25"
                        >
                          Принять личность ➔
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

        {gameState.disguisedNotification &&
          !gameState.winner &&
          !isLobbyOpen &&
          (gameState.opponent !== "ONLINE" || gameState.playerRole === "KILLER") && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 select-none">
              {!isRevealConfirmed && gameState.opponent === "PVP" ? (
                <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-amber-950/80 border border-amber-700 flex items-center justify-center text-3xl mb-4">
                    🎭
                  </div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
                    Смена личности!
                  </span>
                  <h2 className="text-xl font-black text-zinc-100 mb-2">
                    Передайте экран: {gameState.disguisedNotification.roleName}
                  </h2>
                  <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                    Убедитесь, что соперник не смотрит на экран.
                  </p>
                  <button
                    onClick={() => setIsRevealConfirmed(true)}
                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Я держу телефон один ➔
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-3xl mb-4">
                    🕵️
                  </div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                    Конспирация успешна
                  </span>
                  <h3 className="text-xl font-black text-zinc-100 mb-2">
                    Ваша новая личность:
                  </h3>
                  {(() => {
                    const newChar = allChars.find(c => c.id === gameState.disguisedNotification?.newSecretId);
                    const newImg = newChar ? characterImages[`./assets/characters/${newChar.id}.webp`]?.default : null;
                    return (
                      <>
                        <div 
                          className="relative w-full h-48 rounded-2xl overflow-hidden border border-zinc-700 my-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] cursor-pointer group"
                          onClick={() => newImg && newChar && setFullscreenImage({ url: newImg, name: newChar.name, id: newChar.id })}
                        >
                          {newImg ? (
                            <img src={newImg} alt={newChar?.name} className="absolute inset-0 w-full h-full object-cover opacity-75 grayscale contrast-125 group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-zinc-500">Нет фото</div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-3 pt-12 flex flex-col items-center">
                            <span className="text-[10px] font-mono text-zinc-400 mb-1">#{newChar?.id.replace("c", "").padStart(2, "0")}</span>
                            <span className="text-xl font-black text-zinc-100 uppercase tracking-wider leading-tight text-center mb-1">{newChar?.name}</span>
                            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-zinc-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                              <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">Тапните для полного фото</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setIsRevealConfirmed(false);
                            setGameState((prev) => ({
                              ...prev,
                              disguisedNotification: null,
                            }));
                          }}
                          className="w-full py-3.5 bg-gradient-to-r from-zinc-700 to-zinc-600 hover:from-zinc-600 hover:to-zinc-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-[0_10px_25px_rgba(0,0,0,0.5)] border-t border-white/25"
                        >
                          Принять личность ➔
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

        {gameState.winner && !gameState.restartRequestedBy && (
          <GameOverModal
            winner={gameState.winner}
            mode={gameState.mode}
            killer={killerChar}
            detective={detectiveChar}
            elapsedTime={formatTimer(secondsElapsed)}
            onRestart={handleReset}
          />
        )}

        {isPauseOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none" onClick={() => setIsPauseOpen(false)}>
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black uppercase tracking-wider text-zinc-100 mb-4">
                Пауза
              </h2>
              
              <button
                onClick={() => setIsPauseOpen(false)}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Продолжить
              </button>
              <button
                onClick={() => setIsRulesOpen(true)}
                className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Справочник правил
              </button>
              <button
                onClick={async () => {
                  sessionStorage.removeItem('mp_session');
                  if (gameState.opponent === "ONLINE") {
                    if (!gameState.winner) refundBet(gameState.matchBet || 250);
                    await mpService.leaveRoom();
                  }
                  setGameState(
                    createInitialState("SKHVATKA", "AI", "DETECTIVE", 3, 3, 16, profile.nickname),
                  );
                  setHasStartedEver(false);
                  setIsPauseOpen(false);
                  setIsLobbyOpen(true);
                }}
                className="w-full py-3.5 bg-red-950/80 hover:bg-red-900 text-red-400 font-bold uppercase tracking-wider rounded-xl border border-red-900/50 transition cursor-pointer"
              >
                Покинуть игру
              </button>

              <div className="w-full flex items-center gap-3 my-2 opacity-50">
                <div className="h-px bg-white/20 flex-1" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Параметры связи</span>
                <div className="h-px bg-white/20 flex-1" />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Звуки (SFX)</span>
                  <button onClick={() => setIsSfxEnabled(soundManager.toggleSfx())} className={`w-10 h-5 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${isSfxEnabled ? 'bg-red-600' : 'bg-zinc-700'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isSfxEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Эмбиент</span>
                  <button onClick={() => setIsAmbientEnabled(soundManager.toggleAmbient())} className={`w-10 h-5 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${isAmbientEnabled ? 'bg-red-600' : 'bg-zinc-700'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isAmbientEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Вибрация</span>
                  <button onClick={() => { const newVal = !isHapticsEnabled; setIsHapticsEnabled(newVal); setHapticsEnabled(newVal); if (newVal) triggerHaptic("medium"); }} className={`w-10 h-5 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${isHapticsEnabled ? 'bg-red-600' : 'bg-zinc-700'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isHapticsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isRulesOpen && (
          <div 
            onTouchStart={(e) => {
              const touch = e.touches[0];
              if (touch.clientX <= 32) {
                rulesTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
              } else {
                rulesTouchStartRef.current = null;
              }
            }}
            onTouchEnd={(e) => {
              if (!rulesTouchStartRef.current) return;
              const touch = e.changedTouches[0];
              const deltaX = touch.clientX - rulesTouchStartRef.current.x;
              const deltaY = touch.clientY - rulesTouchStartRef.current.y;
              if (deltaX > 60 && Math.abs(deltaY) < 40) {
                triggerHaptic("light");
                setIsRulesOpen(false);
              }
              rulesTouchStartRef.current = null;
            }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-4 select-none"
          >
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4 shrink-0 border-b border-zinc-800 pb-3">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-zinc-100">
                  Справочник правил
                </h2>
                <button
                  onClick={() => setIsRulesOpen(false)}
                  className="text-zinc-500 hover:text-zinc-300 font-bold text-lg cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto space-y-3 text-left text-xs text-zinc-300 pr-1 pb-4 custom-scrollbar">
                {/* БАЗОВЫЕ МЕХАНИКИ */}
                <div className="p-3.5 bg-cyan-950/20 rounded-2xl border border-cyan-900/40 space-y-2">
                  <span className="font-black text-cyan-400 block text-xs uppercase tracking-wider">
                    Базовые механики
                  </span>
                  <ul className="space-y-2 leading-relaxed">
                    <li>
                      <b className="text-zinc-100">• Соседство:</b> клетки,
                      прилегающие по горизонтали, вертикали и диагонали (до 8
                      соседних клеток). Сквозь края поля механики не действуют.
                    </li>
                    <li>
                      <b className="text-zinc-100">• Смещение ряда (рядов):</b>{" "}
                      сдвиг строки или столбца на 1 клетку. Вышедшая за пределы
                      поля карта перемещается в освободившийся противоположный
                      конец. Запрещено отменять предыдущий сдвиг противника.
                    </li>
                    <li>
                      <b className="text-zinc-100">• Зачистить:</b> специальная
                      перестройка поля при накоплении ликвидированных
                      персонажей. Ликвидированные карты смещаются к краю, а
                      заполненные ими линии выводятся из активной зоны для
                      сжатия игрового пространства.
                    </li>
                  </ul>
                </div>

                {/* 1. СХВАТКА */}
                <div className="group bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                  <div onClick={() => setActiveAccordionIndex(prev => prev === 1 ? null : 1)} className="p-3.5 font-black text-zinc-200 group-hover:text-cyan-400 text-xs uppercase cursor-pointer hover:bg-zinc-900/50 transition flex justify-between items-center">
                    <span>1. Схватка (2 игрока, поле 5x5)</span>
                    <span className={`text-zinc-500 transition-transform duration-300 ${activeAccordionIndex === 1 ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${activeAccordionIndex === 1 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden min-h-0">
                      <div className="p-3.5 pt-1 border-t border-zinc-800/60 space-y-2.5 leading-relaxed text-[11px]">
                        <p>
                          <b className="text-red-400">Победа Преступника:</b>{" "}
                          ликвидировать Оперативника или устранить 14 персонажей на
                          поле.
                        </p>
                        <p>
                          <b className="text-cyan-400">Победа Оперативника:</b>{" "}
                          успешно применить «Задержание» к тайной личности
                          Преступника.
                        </p>
                        <p className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-400">
                          <b className="text-zinc-200">Первый раунд:</b> Преступник
                          обязан выполнить «Ликвидацию» рядом с собой. Затем
                          Оперативник выбирает тайную личность из 4 карт в руке.
                        </p>
                        <div>
                          <b className="text-zinc-200 block mb-1">
                            Действия Преступника:
                          </b>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>
                              <b>Смещение ряда / Зачистить.</b>
                            </li>
                            <li>
                              <b>Ликвидация:</b> устранить соседнего персонажа. При
                              ликвидации невиновного проводится «Опрос свидетелей»
                              (Оперативник отвечает, находится ли он рядом с
                              жертвой: «Да» или «Нет»).
                            </li>
                            <li>
                              <b>Конспирация:</b> взять карту из колоды. Если
                              персонаж жив — принять его личность, а прошлую карту
                              выложить на поле как невиновную. Если ликвидирован —
                              сброс.
                            </li>
                          </ul>
                        </div>
                        <div>
                          <b className="text-zinc-200 block mb-1">
                            Действия Оперативника:
                          </b>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>
                              <b>Смещение ряда / Зачистить.</b>
                            </li>
                            <li>
                              <b>Задержание:</b> указать на соседнего персонажа (или
                              на себя для блефа). Совпало — победа; нет — игра
                              продолжается.
                            </li>
                            <li>
                              <b>Проверка алиби:</b> взять карту из колоды, выложить
                              карту с руки на живого подозреваемого на поле и
                              провести «Опрос свидетелей» (Преступник отвечает,
                              соседствует ли он с ним).
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. МАНЬЯК ПРОТИВ ОПЕРАТИВНИКА */}
                <div className="group bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                  <div onClick={() => setActiveAccordionIndex(prev => prev === 2 ? null : 2)} className="p-3.5 font-black text-zinc-200 group-hover:text-cyan-400 text-xs uppercase cursor-pointer hover:bg-zinc-900/50 transition flex justify-between items-center">
                    <span>2. Маньяк против оперативника</span>
                    <span className={`text-zinc-500 transition-transform duration-300 ${activeAccordionIndex === 2 ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${activeAccordionIndex === 2 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden min-h-0">
                      <div className="p-3.5 pt-1 border-t border-zinc-800/60 space-y-2.5 leading-relaxed text-[11px]">
                        <p>
                          <b className="text-red-400">Победа Маньяка:</b>{" "}
                          ликвидировать всех жертв из списка (4 цели) или устранить
                          Оперативника.
                        </p>
                        <p>
                          <b className="text-cyan-400">Победа Оперативника:</b>{" "}
                          раскрыть личность Маньяка действием «Задержание».
                        </p>
                        <p className="text-zinc-400">
                          <b className="text-zinc-200">Особенности:</b> у Маньяка
                          открытый заказ из 4 целей. У Оперативника рука из 3 карт
                          (его жизни).
                        </p>
                        <div>
                          <b className="text-zinc-200 block mb-1">
                            Действия Маньяка:
                          </b>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>
                              <b>Смещение ряда / Зачистить.</b>
                            </li>
                            <li>
                              <b>Ликвидация:</b> устранить соседнюю цель. Если цель
                              из списка — открывается следующая. Если убит персонаж
                              из руки Оперативника — карта сбрасывается. Если убит
                              сам Оперативник — тот обязан сменить карту; если карт
                              нет — проигрыш. Опрос свидетелей при убийстве
                              невиновного не проводится.
                            </li>
                            <li>
                              <b>Конспирация:</b> сменить личность по правилам
                              колоды (требуется от 2 карт в колоде); в список жертв
                              добавляется +1 цель.
                            </li>
                          </ul>
                        </div>
                        <div>
                          <b className="text-zinc-200 block mb-1">
                            Действия Оперативника:
                          </b>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>
                              <b>Смещение ряда / Зачистить.</b>
                            </li>
                            <li>
                            <b>Задержание:</b> проверить соседа. Ошибка следствия возвращает
                            одну скрытую цель маньяка под низ колоды.
                          </li>
                            <li>
                              <b>Проверка алиби:</b> сыграть карту с руки на поле с
                              опросом Маньяка на соседство.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. СЕКРЕТНАЯ СЛУЖБА */}
                <div className="group bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                  <div onClick={() => setActiveAccordionIndex(prev => prev === 3 ? null : 3)} className="p-3.5 font-black text-zinc-200 group-hover:text-indigo-400 text-xs uppercase cursor-pointer hover:bg-zinc-900/50 transition flex justify-between items-center">
                    <span>3. Секретная служба</span>
                    <span className={`text-zinc-500 transition-transform duration-300 ${activeAccordionIndex === 3 ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${activeAccordionIndex === 3 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden min-h-0">
                      <div className="p-3.5 pt-1 border-t border-zinc-800/60 space-y-2.5 leading-relaxed text-[11px]">
                        <p>
                          <b className="text-zinc-100">Форматы:</b> каждый сам за
                          себя («Война разведок») или дуэль разведок.
                        </p>
                        <p>
                          <b className="text-indigo-400">Цель:</b> первым накопить
                          4 трофея (разоблаченных вражеских агентов).
                        </p>
                        <div>
                          <b className="text-zinc-200 block mb-1">
                            Действия агента:
                          </b>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>
                              <b>Смещение ряда / Зачистить.</b>
                            </li>
                            <li>
                              <b>Разоблачение:</b> объявить соседнего подозреваемого. Если
                              это тайная личность соперника — тот вскрывается,
                              считается ликвидированным, отдает карту в трофеи и
                              берет новую личность. Союзников разоблачать нельзя.
                            </li>
                            <li>
                              <b>Опрос свидетелей:</b> выбрать соседнего персонажа.
                              Все игроки, чьи личности находятся по соседству с
                              выбранной целью (включая активного игрока), обязаны
                              подтвердить статус соседства.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. ОХОТА НА ГРАБИТЕЛЯ */}
                <div className="group bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                  <div onClick={() => setActiveAccordionIndex(prev => prev === 4 ? null : 4)} className="p-3.5 font-black text-zinc-200 group-hover:text-cyan-400 text-xs uppercase cursor-pointer hover:bg-zinc-900/50 transition flex justify-between items-center">
                    <span>4. Охота на грабителя</span>
                    <span className={`text-zinc-500 transition-transform duration-300 ${activeAccordionIndex === 4 ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${activeAccordionIndex === 4 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden min-h-0">
                      <div className="p-3.5 pt-1 border-t border-zinc-800/60 space-y-2.5 leading-relaxed text-[11px]">
                        <p>
                          <b className="text-red-400">Победа Грабителя:</b> собрать
                          все сокровища (5 краж).
                        </p>
                        <p>
                          <b className="text-cyan-400">Победа Начальника:</b>{" "}
                          провести «Задержание» текущей активной личности Грабителя.
                        </p>
                        <p className="text-zinc-400">
                        <b className="text-zinc-200">Особенности:</b> персонажи не
                        ликвидируются, «Зачистить» недоступно. У Начальника 1
                        тайная личность и 2 открытых патрульных. У Грабителя рука
                        из 3 карт масок. Зона задержания и подсветка при просмотре роли действуют вокруг Начальника и обоих патрульных.
                      </p>
                        <div>
                          <b className="text-zinc-200 block mb-1">
                            Действия Грабителя:
                          </b>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>
                              <b>Смещение ряда.</b>
                            </li>
                            <li>
                              <b>Кража:</b> забрать сокровище у себя или соседней
                              клетки.
                            </li>
                            <li>
                              <b>Конспирация:</b> вернуть активную личность в руку и
                              выложить новую взамен.
                            </li>
                          </ul>
                        </div>
                        <div>
                          <b className="text-zinc-200 block mb-1">
                            Действия Начальника:
                          </b>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>
                              <b>Смещение ряда.</b>
                            </li>
                            <li>
                              <b>Задержание:</b> обвинить клетку рядом со своей
                              тайной личностью или любым патрульным.
                            </li>
                            <li>
                            <b>Вызов патруля:</b> заменить одного из открытых
                            патрульных картой из колоды (при этом Вор
                            немедленно получает 1 сокровище в зачет победы).
                          </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ПОЛНОЭКРАННЫЙ ПРОСМОТР ФОТО */}
        {fullscreenImage && (
          <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 select-none" onClick={() => setFullscreenImage(null)}>
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

        {/* ОВЕРЛЕЙ ПРЕДУПРЕЖДЕНИЯ О ЛАНДШАФТНОМ РЕЖИМЕ НА МОБИЛКАХ */}
        <div className="mobile-landscape-overlay fixed inset-0 z-[200] bg-zinc-950 flex-col items-center justify-center text-center px-6 select-none">
          <div className="w-20 h-20 mb-6 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)] animate-pulse">
            <span className="text-4xl transform -rotate-90">📱</span>
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider text-zinc-100 mb-3">
            Поверните устройство
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
            Пожалуйста, верните устройство в вертикальное положение для продолжения операции.
          </p>
        </div>
      </div>
    </div>
    </I18nProvider>
  );
}
