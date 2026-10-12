import { useState, useRef, useEffect, useMemo } from "react";
import type { GameModeType, OpponentType, Role } from "./types/game";
import { GameBoard } from "./components/GameBoard";
import { DetectiveHand } from "./components/DetectiveHand";
import { ThiefHand } from "./components/ThiefHand";
import { VictimList } from "./components/VictimList";
import { RoleRevealModal } from "./components/RoleRevealModal";
import { MainMenu } from "./components/MainMenu";
import { usePlayerProfile } from "./utils/usePlayerProfile";
import { GAME_MODES } from "./components/ModeSelectModal";
import { mpService } from "./utils/multiplayerPeer";
import {
  createInitialState,
  setInspectorRole,
  getAdjacentCharacters,
  canCleanupBoard,
} from "./utils/gameLogic";
import {
  getKillerAIMove,
  getDetectiveAIMove,
  getSecretServiceAIMove,
} from "./utils/aiLogic";
import { sounds } from "./utils/audio";
import { triggerHaptic } from "./utils/haptics";
import { ActionPanel, type ActionItem } from "./components/ActionPanel";
import { RoleCards } from "./components/RoleCards";
import type { GameAction } from "./types/multiplayer";
import { gameReducer } from "./utils/gameReducer";
import { Toast } from "./components/Toast";

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
  const [activeMode, setActiveMode] = useState<GameModeType>("SKHVATKA");
  const [isLobbyOpen, setIsLobbyOpen] = useState(true);
  const [hasStartedEver, setHasStartedEver] = useState(false);
  const {
    profile,
    updateProfile,
    reserveBet,
    refundBet,
    awardPrize,
    recordMatchResult,
  } = usePlayerProfile();
  const matchResultRecordedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<
    "LOBBY" | "TABLES" | "TOP" | "SHOP"
  >("LOBBY");

  const [gameState, setGameState] = useState(() =>
    createInitialState("SKHVATKA", "AI", "DETECTIVE", 3),
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

  const prevLogLenRef = useRef(gameState.log.length);
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
    if (
      action.senderId === "local" &&
      (gameState.opponent === "ONLINE" || Boolean(mpService.roomCode))
    ) {
      mpService.sendAction(action);
    }
    setGameState((prev) => gameReducer(prev, action));
  };

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
              playerRole: mpService.isHost ? "KILLER" : "DETECTIVE",
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

      if (action.type === "SHIFT_BOARD") sounds.playShift();
      if (action.type === "KILL_CHARACTER") sounds.playKill();
      if (action.type === "ROB_NEIGHBOR") sounds.playShift();
      if (action.type === "INTERROGATE") sounds.playRadar();
      if (action.type === "CLEANUP") sounds.playShift();

      if (action.type === "ACCUSE") {
        const targetChar = currentState.board
          .flat()
          .find((c) => c.id === action.payload.targetId);
        const isMiss =
          action.payload.targetId !== currentState.killerSecretId &&
          !targetChar?.hasBomb;
        if (isMiss) {
          sounds.playBuzzer();
          setErrorCardId(action.payload.targetId);
          setTimeout(() => setErrorCardId(null), 500);
        } else {
          sounds.playAccuse();
        }
      }

      if (action.type === "CAPTURE_SPY") {
        const remoteSpyIndex = mpService.isHost ? 1 : 0;
        const remoteSpy = currentState.spies?.[remoteSpyIndex];
        const isMiss = !currentState.spies?.some(
          (s) =>
            s.id !== remoteSpy?.id && s.secretId === action.payload.targetId,
        );
        if (isMiss) {
          sounds.playExplosion();
          setErrorCardId(action.payload.targetId);
          setTimeout(() => setErrorCardId(null), 500);
        } else {
          sounds.playAccuse();
        }
      }

      setGameState((prev) =>
        gameReducer(prev, { ...action, senderId: "remote" }),
      );
    });

    mpService.onRoomClosed = () => {
      if (!mpService.isHost) {
        setOpponentDisconnectedNotice(true);
      }
    };

    return () => {
      unsubscribe();
      mpService.onRoomClosed = null;
    };
  }, []);

  useEffect(() => {
    if (!isLobbyOpen && gameState.opponent === "ONLINE") {
      const handleDisconnect = () => {
        if (
          gameStateRef.current.restartRequestedBy ===
          (mpService.isHost ? "HOST" : "GUEST")
        ) {
          refundBet(gameStateRef.current.matchBet || 250);
        }
        setOpponentDisconnectedNotice(true);
      };
      mpService.onPlayerDisconnected = handleDisconnect;
      mpService.onRoomClosed = handleDisconnect;
    }

    return () => {
      if (!isLobbyOpen && gameState.opponent === "ONLINE") {
        mpService.onPlayerDisconnected = null;
        mpService.onRoomClosed = null;
      }
    };
  }, [isLobbyOpen, gameState.opponent]);

  useEffect(() => {
    const initSound = () => sounds.initAudio();
    window.addEventListener("pointerdown", initSound, { once: true });
    return () => window.removeEventListener("pointerdown", initSound);
  }, []);

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
      sounds.playVictory();
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
  const killerChar = allChars.find((c) => c.id === gameState.killerSecretId);
  const detectiveChar = allChars.find(
    (c) => c.id === gameState.detectiveSecretId,
  );

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
  const detectiveAdjacentIds = getAdjacentCharacters(
    gameState.board,
    gameState.mode === "SECRET_SERVICE" ? (spy2Id ?? gameState.detectiveSecretId) : (spy1Id ?? gameState.detectiveSecretId),
  ).map((c) => c.id);

  const radarTargetId = gameState.interrogationRadar?.targetId;
  const radarCellIds = useMemo(() => {
    if (!radarTargetId) return [];
    const neighbors = getAdjacentCharacters(gameState.board, radarTargetId).map(
      (c) => c.id,
    );
    return [radarTargetId, ...neighbors];
  }, [gameState.board, radarTargetId]);

  const radarColorClass = gameState.interrogationRadar
    ? "ring-amber-400 border-amber-400"
    : null;

  const currentModeTitle =
    GAME_MODES.find((m) => m.id === gameState.mode)?.title ?? "Схватка";

  const isKillerTurn = gameState.currentTurn === "KILLER";
  const isDetectiveTurn = gameState.currentTurn === "DETECTIVE";

  let role1Name = "БАНДИТ";
  let role2Name = "ИНСПЕКТОР";
  if (gameState.mode === "MANIAC_VS_OPERATIVE") {
    role1Name = "МАНЬЯК";
    role2Name = "ОПЕРАТИВНИК";
  } else if (gameState.mode === "SECRET_SERVICE") {
    role1Name = gameState.spies?.[0]?.name ?? "Агент 1";
    role2Name = gameState.spies?.[1]?.name ?? "Агент 2";
  } else if (gameState.mode === "THIEF_HUNT") {
    role1Name = "ВОР";
    role2Name = "СЫЩИК";
  }

  let currentRoleName = isKillerTurn ? role1Name : role2Name;
  if (gameState.mode === "SECRET_SERVICE" && gameState.spies) {
    currentRoleName = gameState.spies[gameState.activeSpyIndex ?? 0].name;
  }

  let actionPanelRoleName = currentRoleName;
  if (gameState.mode === "SECRET_SERVICE") {
    if (gameState.opponent === "ONLINE") {
      const mySpyIndex = mpService.isHost ? 0 : 1;
      actionPanelRoleName =
        gameState.spies?.[mySpyIndex]?.name ?? currentRoleName;
    } else if (gameState.opponent === "AI") {
      actionPanelRoleName = gameState.spies?.[0]?.name ?? currentRoleName;
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
    setGameState((prev) => setInspectorRole(prev, chosenId));
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
      mpService.broadcastMatchStart(newState);
      setTimeout(() => {
        dispatchAction({
          type: "SET_MATCH_POT",
          payload: { pot: betAmount * 2, bet: betAmount },
          senderId: "local",
        });
      }, 200);
    }

    setActiveMode(modeId);
    setGameState(newState);
    setSelectedId(null);
    setIsRevealConfirmed(false);
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
    sounds.playShift();
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
    sounds.playKill();
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
    sounds.playShift();
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
    sounds.playShift();
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
    sounds.playShift();
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
    if (!targetChar || targetChar.isDead) return;

    const isMiss =
      selectedId !== gameState.killerSecretId && !targetChar.hasBomb;
    if (isMiss) {
      sounds.playExplosion();
      triggerHaptic("error");
      setErrorCardId(selectedId);
      setTimeout(() => setErrorCardId(null), 500);
    } else {
      sounds.playAccuse();
      triggerHaptic("medium");
    }

    dispatchAction({
      type: "ACCUSE",
      payload: { targetId: selectedId },
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleDisguise = () => {
    if (gameState.currentTurn !== "KILLER" || isFirstTurnKiller || !isHumanTurn)
      return;
    sounds.playShift();
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
    sounds.playShift();
    triggerHaptic("light");
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
    sounds.playShift();
    triggerHaptic("medium");
    dispatchAction({
      type: "CLEANUP",
      senderId: "local",
      timestamp: Date.now(),
    });
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
      sounds.playBuzzer();
      triggerHaptic("error");
      setErrorCardId(selectedId);
      setTimeout(() => setErrorCardId(null), 500);
    } else {
      sounds.playAccuse();
      triggerHaptic("medium");
    }

    const nextSpyIndex = (mySpyIndex + 1) % (gameState.spies?.length || 3);

    dispatchAction({
      type: "CAPTURE_SPY",
      payload: { targetId: selectedId, nextSpyIndex } as any,
      senderId: "local",
      timestamp: Date.now(),
    });
    setSelectedId(null);
  };

  const handleInterrogateSpy = () => {
    if (!selectedId || gameState.mode !== "SECRET_SERVICE" || !isHumanTurn)
      return;
    sounds.playRadar();
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
    if (gameState.opponent === "ONLINE") {
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
        gameState.spyTargetTrophies ?? 3,
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
          "py-2.5 bg-red-900/80 active:bg-red-800 disabled:opacity-40 text-red-100 text-[11px] font-black rounded-lg border border-red-700 transition cursor-pointer disabled:cursor-not-allowed",
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
          "py-2.5 bg-blue-900/80 active:bg-blue-800 disabled:opacity-40 text-blue-100 text-[11px] font-black rounded-lg border border-blue-700 transition cursor-pointer disabled:cursor-not-allowed",
      });
      actions.push({
        id: "cleanup_ss",
        label: "Зачистить",
        onClick: handleCleanup,
        disabled: !isHumanTurn || !isCleanupAvailable,
        className:
          "py-2 bg-zinc-800 active:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-[11px] font-bold rounded-lg border border-zinc-700 transition disabled:cursor-not-allowed",
      });
    } else {
      if (isKillerTurn) {
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
              "py-2 bg-amber-900/80 active:bg-amber-800 disabled:opacity-50 text-amber-200 text-[11px] font-bold rounded-lg border border-amber-800 transition disabled:cursor-not-allowed",
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
              "py-2 bg-red-900/80 active:bg-red-800 disabled:opacity-50 text-red-200 text-[11px] font-bold rounded-lg border border-red-800 transition disabled:cursor-not-allowed",
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
              "py-2 bg-amber-900/80 active:bg-amber-800 disabled:opacity-50 text-amber-200 text-[11px] font-bold rounded-lg border border-amber-800 transition disabled:cursor-not-allowed",
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
              "py-2 bg-amber-900/80 active:bg-amber-800 disabled:opacity-50 text-amber-200 text-[11px] font-bold rounded-lg border border-amber-800 transition disabled:cursor-not-allowed",
          });
        }
      } else {
        actions.push({
          id: "accuse_basic",
          label: "Задержание",
          onClick: handleAccuse,
          disabled: (() => {
            if (!isHumanTurn || !selectedId || Boolean(selectedCharacter?.isDead) || isGameOver) return true;
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
            "py-2.5 bg-blue-900/80 active:bg-blue-800 disabled:opacity-50 text-blue-100 text-[11px] font-black rounded-lg border border-blue-700 transition disabled:cursor-not-allowed",
        });
      }

      actions.push({
        id: "cleanup_basic",
        label: "Зачистить",
        onClick: handleCleanup,
        disabled: !isHumanTurn || !isCleanupAvailable || isFirstTurnKiller,
        className:
          "py-2 bg-zinc-800 active:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-[11px] font-bold rounded-lg border border-zinc-700 transition disabled:cursor-not-allowed",
      });
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
    isKillerTurn,
    isHumanTurn,
    selectedId,
    killerAdjacentIds,
    detectiveAdjacentIds,
    activeAgentAdjacentIds,
    isCleanupAvailable,
    isFirstTurnKiller,
    selectedCharacter,
  ]);

  const isPVP = gameState.opponent === "PVP";
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
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col bg-noir-city overflow-hidden select-none">
      <Toast message={toastMessage} type="info" onClose={() => setToastMessage(null)} />
      <div className="w-full max-w-7xl mx-auto h-full relative flex flex-col"> 
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
            role1Name={
              gameState.mode === "SECRET_SERVICE"
                ? gameState.spies?.[0]?.name || "Агент 1"
                : mpService.isHost
                  ? profile.nickname || "Бандит"
                  : "Бандит"
            }
            role2Name={
              gameState.mode === "SECRET_SERVICE"
                ? gameState.spies?.[1]?.name || "Агент 2"
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

        {/* 1. КОМПАКТНАЯ ШАПКА МАТЧА */}
        <header className="w-full px-4 sm:px-6 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0 relative flex items-center justify-between z-30 pt-[max(0.6rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPauseOpen(true)}
              className="w-8 h-8 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer"
              title="Пауза и меню"
            >
              <span>☰</span>
            </button>
            <button
              onClick={() => {
                setIsLogOpen(true);
                setUnreadLogCount(0);
              }}
              className="relative w-8 h-8 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer lg:hidden"
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black tracking-wider uppercase transition-all shadow ${pillClasses}`}
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
            <div className="hidden md:flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded-lg px-3 h-9 text-xs font-mono text-zinc-400">
              {formatTimer(secondsElapsed)}
            </div>
            <button
              onClick={handleReset}
              className="px-3 h-7 md:h-9 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center text-[10px] md:text-xs font-bold cursor-pointer shrink-0"
            >
              Заново
            </button>
          </div>
        </header>

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
            <div>
              Жертвы:{" "}
              <b className="text-red-400">
                {gameState.killCount}/
                {gameState.mode === "MANIAC_VS_OPERATIVE" ? 4 : 14}
              </b>{" "}
              | Улики: {gameState.evidenceDeck.length}
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

        {gameState.mode === "MANIAC_VS_OPERATIVE" && (
          <div className="px-3 pt-1 shrink-0">
            <VictimList
              victimIds={gameState.victimList}
              allCharacters={allChars}
            />
          </div>
        )}

        {/* ФИКСИРОВАННАЯ ПОЛОСА ДОПРОСА (ВСЕГДА ЗАРЕЗЕРВИРОВАНА, ПОЛЕ НЕ ДВИГАЕТСЯ) */}
        <div className="w-full px-3 h-8 md:h-10 shrink-0 flex items-center justify-center">
          {gameState.lastInterrogation && !gameState.winner ? (
            <div
              className={`w-full h-full px-2.5 rounded-lg border flex items-center justify-between text-[10px] md:text-xs shadow-sm ${gameState.lastInterrogation.isNear ? "bg-red-950/80 border-red-700 text-red-200" : "bg-zinc-900/90 border-zinc-800 text-zinc-300"}`}
            >
              <span className="font-semibold truncate mr-2">
                {gameState.lastInterrogation.interrogator === "DETECTIVE"
                  ? `Алиби (${gameState.lastInterrogation.targetName}): враг рядом?`
                  : `Жертва (${gameState.lastInterrogation.targetName}): законник рядом?`}
              </span>
              <span
                className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-black uppercase border ${gameState.lastInterrogation.isNear ? "bg-red-900 text-red-100 border-red-500 animate-pulse" : "bg-blue-950 text-blue-300 border-blue-700"}`}
              >
                {gameState.lastInterrogation.isNear ? "Враг рядом" : "Вне зоны"}
              </span>
            </div>
          ) : gameState.lastSpyInterrogation && !gameState.winner ? (
            <div className="w-full h-full px-2.5 rounded-lg border border-zinc-800 bg-zinc-900/90 flex items-center justify-between text-[10px] md:text-xs shadow-sm">
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
                      className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase border ${hasContact ? "bg-red-950 text-red-400 border-red-700 animate-pulse" : "bg-zinc-950 text-zinc-500 border-zinc-800"}`}
                    >
                      {spy.name.replace("Агент «", "").replace("»", "")}:{" "}
                      {hasContact ? "РЯДОМ" : "НЕТ"}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="w-full h-full px-2.5 rounded-lg border border-dashed border-zinc-900 flex items-center justify-center text-[10px] text-zinc-600 font-mono">
              Оперативные показания: ожидание допроса
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 w-full flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-4 lg:gap-8 px-2 sm:px-4 lg:px-6 py-2 lg:py-4 overflow-y-auto lg:overflow-hidden custom-scrollbar">
          {/* 2. ИГРОВОЕ ПОЛЕ */}
          <main className="flex-1 min-h-0 w-full flex items-center justify-center overflow-visible">
            <div className="w-full flex flex-col items-center justify-center">
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
                onShift={handleShift}
                onSelectCharacter={(id) =>
                  isHumanTurn &&
                  setSelectedId((prev) => (prev === id ? null : id))
                }
              />
            </div>
          </main>

          {/* 3. КОНТЕКСТНАЯ ПАНЕЛЬ УПРАВЛЕНИЯ */}
          <footer className="w-full max-w-md lg:w-80 xl:w-96 shrink-0 flex flex-col gap-3 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-0 px-1 lg:px-0 lg:overflow-y-auto custom-scrollbar">
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
              <div className="hidden lg:block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Действия ({actionPanelRoleName})
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5 lg:gap-2 w-full">
                {targetActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={`${action.className} py-2 lg:py-3 px-2 rounded-lg lg:rounded-xl font-black text-[10px] lg:text-xs uppercase tracking-wider transition shadow flex items-center justify-center text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      targetActions.length === 1
                        ? "col-span-2 lg:col-span-1"
                        : "col-span-1"
                    }`}
                  >
                    {selectedCharacter && !action.disabled
                      ? `${action.label}`
                      : action.label}
                  </button>
                ))}
              </div>

              {cleanupAction && (
                <button
                  onClick={cleanupAction.onClick}
                  disabled={cleanupAction.disabled}
                  className="w-full py-1 lg:py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 hover:text-zinc-200 text-[9px] lg:text-[11px] font-bold uppercase rounded-md lg:rounded-xl border border-zinc-700/80 transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5 mt-1"
                >
                  <span>↻</span>
                  <span>Зачистить</span>
                </button>
              )}
            </div>

            {/* Кнопка вызова шторки досье */}
            {((gameState.mode === "THIEF_HUNT" &&
              (isPVP ? isKillerTurn : gameState.playerRole === "KILLER")) ||
              ((gameState.mode === "SKHVATKA" ||
                gameState.mode === "MANIAC_VS_OPERATIVE") &&
                (isPVP
                  ? isDetectiveTurn
                  : gameState.playerRole === "DETECTIVE"))) && (
              <div className="lg:bg-zinc-900/50 lg:border lg:border-zinc-800 lg:p-4 lg:rounded-2xl w-full">
                <div className="hidden lg:flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                    Досье алиби (
                    {gameState.mode === "THIEF_HUNT"
                      ? (gameState.killerHand?.length ?? 0)
                      : gameState.detectiveHand.length}{" "}
                    карт)
                  </span>
                </div>
                <button
                  onClick={() => setIsHandSheetOpen(true)}
                  className="w-full py-2 lg:py-3 bg-zinc-800 hover:bg-zinc-700 text-amber-400 lg:text-zinc-300 border border-zinc-700 rounded-lg lg:rounded-xl text-[11px] lg:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>🗂</span>
                  <span className="lg:hidden">
                    Открыть досье (
                    {gameState.mode === "THIEF_HUNT"
                      ? (gameState.killerHand?.length ?? 0)
                      : gameState.detectiveHand.length}
                    )
                  </span>
                  <span className="hidden lg:inline">Показать карты</span>
                </button>
              </div>
            )}

            {/* Десктопный лог (виден только на lg и выше) */}
            <div className="hidden lg:flex flex-col flex-1 min-h-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
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

              <div className="overflow-y-auto space-y-2 pb-6">
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
                className="overflow-y-auto space-y-2 text-xs font-mono text-zinc-300 pr-1 pb-6"
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
                Ожидание ответа...
              </h2>
              <p className="text-xs text-zinc-400">
                Ждем, пока соперник примет вызов.
              </p>
            </div>
          </div>
        )}

        {opponentDisconnectedNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 select-none">
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
                  setOpponentDisconnectedNotice(false);
                  mpService.disconnect();
                  setGameState(
                    createInitialState("SKHVATKA", "AI", "DETECTIVE", 3),
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
                  <div className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 my-4">
                    <div className="text-2xl font-black text-zinc-100">
                      {
                        allChars.find(
                          (c) =>
                            c.id ===
                            gameState.spies?.find(
                              (s) => s.id === gameState.justCaughtSpyId,
                            )?.secretId,
                        )?.name
                      }
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
                    className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Принять прикрытие ➔
                  </button>
                </div>
              )}
            </div>
          )}

        {gameState.winner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
            <div className="w-full max-w-md bg-zinc-900 border border-amber-500/50 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-4xl mb-4 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                🏆
              </div>
              <span className="text-xs font-bold text-amber-500 uppercase tracking-widest block mb-1">
                Операция завершена
              </span>
              <h2 className="text-2xl font-black text-zinc-100 mb-4">
                Победил:{" "}
                {gameState.mode === "SECRET_SERVICE"
                  ? (gameState.spies?.find(
                      (s) => s.trophies >= (gameState.spyTargetTrophies ?? 3),
                    )?.name ?? "Шпион")
                  : gameState.winner === "KILLER"
                    ? role1Name
                    : role2Name}
              </h2>
              <div className="w-full flex gap-3 mt-4">
                <button
                  onClick={() => {
                    if (gameState.opponent === "ONLINE") mpService.disconnect();
                    setGameState(
                      createInitialState("SKHVATKA", "AI", "DETECTIVE", 3),
                    );
                    setHasStartedEver(false);
                    setIsLobbyOpen(true);
                  }}
                  className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  В меню ☰
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg cursor-pointer"
                >
                  Реванш ↻
                </button>
              </div>
            </div>
          </div>
        )}

        {isPauseOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col gap-3">
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
                onClick={() => {
                  if (gameState.opponent === "ONLINE") mpService.disconnect();
                  setGameState(
                    createInitialState("SKHVATKA", "AI", "DETECTIVE", 3),
                  );
                  setHasStartedEver(false);
                  setIsPauseOpen(false);
                  setIsLobbyOpen(true);
                }}
                className="w-full py-3.5 bg-red-950/80 hover:bg-red-900 text-red-400 font-bold uppercase tracking-wider rounded-xl border border-red-900/50 transition cursor-pointer mt-2"
              >
                Покинуть игру
              </button>
            </div>
          </div>
        )}

        {isRulesOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-4 select-none">
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
                <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2">
                  <span className="font-black text-amber-400 block text-xs uppercase tracking-wider">
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
                <details className="group bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                  <summary className="p-3.5 font-black text-amber-400 text-xs uppercase cursor-pointer hover:bg-zinc-900/50 transition flex justify-between items-center">
                    <span>1. Схватка (2 игрока, поле 5x5)</span>
                    <span className="text-zinc-500 group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="p-3.5 pt-1 border-t border-zinc-800/60 space-y-2.5 leading-relaxed text-[11px]">
                    <p>
                      <b className="text-red-400">Победа Преступника:</b>{" "}
                      ликвидировать Оперативника или устранить 14 персонажей на
                      поле.
                    </p>
                    <p>
                      <b className="text-blue-400">Победа Оперативника:</b>{" "}
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
                </details>

                {/* 2. МАНЬЯК ПРОТИВ ОПЕРАТИВНИКА */}
                <details className="group bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                  <summary className="p-3.5 font-black text-amber-400 text-xs uppercase cursor-pointer hover:bg-zinc-900/50 transition flex justify-between items-center">
                    <span>2. Маньяк против оперативника</span>
                    <span className="text-zinc-500 group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="p-3.5 pt-1 border-t border-zinc-800/60 space-y-2.5 leading-relaxed text-[11px]">
                    <p>
                      <b className="text-red-400">Победа Маньяка:</b>{" "}
                      ликвидировать всех жертв из списка (4 цели) или устранить
                      Оперативника.
                    </p>
                    <p>
                      <b className="text-blue-400">Победа Оперативника:</b>{" "}
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
                          <b>Задержание:</b> проверить соседа. Ошибка возвращает
                          одну закрытую карту из списка жертв под низ колоды.
                        </li>
                        <li>
                          <b>Проверка алиби:</b> сыграть карту с руки на поле с
                          опросом Маньяка на соседство.
                        </li>
                      </ul>
                    </div>
                  </div>
                </details>

                {/* 3. СЕКРЕТНАЯ СЛУЖБА */}
                <details className="group bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                  <summary className="p-3.5 font-black text-amber-400 text-xs uppercase cursor-pointer hover:bg-zinc-900/50 transition flex justify-between items-center">
                    <span>3. Секретная служба</span>
                    <span className="text-zinc-500 group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="p-3.5 pt-1 border-t border-zinc-800/60 space-y-2.5 leading-relaxed text-[11px]">
                    <p>
                      <b className="text-zinc-100">Форматы:</b> каждый сам за
                      себя (куча-мала) или дуэль разведок.
                    </p>
                    <p>
                      <b className="text-amber-400">Цель:</b> первым накопить
                      установленное количество трофеев (разоблаченных вражеских
                      агентов).
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
                          берет новое прикрытие. Союзников разоблачать нельзя.
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
                </details>

                {/* 4. ОХОТА НА ГРАБИТЕЛЯ */}
                <details className="group bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                  <summary className="p-3.5 font-black text-amber-400 text-xs uppercase cursor-pointer hover:bg-zinc-900/50 transition flex justify-between items-center">
                    <span>4. Охота на грабителя</span>
                    <span className="text-zinc-500 group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="p-3.5 pt-1 border-t border-zinc-800/60 space-y-2.5 leading-relaxed text-[11px]">
                    <p>
                      <b className="text-red-400">Победа Грабителя:</b> собрать
                      все сокровища (5 краж).
                    </p>
                    <p>
                      <b className="text-blue-400">Победа Начальника:</b>{" "}
                      провести «Задержание» текущей активной личности Грабителя.
                    </p>
                    <p className="text-zinc-400">
                      <b className="text-zinc-200">Особенности:</b> персонажи не
                      ликвидируются, «Зачистить» недоступно. У Начальника 1
                      тайная личность и 2 открытых патрульных. У Грабителя рука
                      из 3 карт масок.
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
                          патрульных картой из колоды (при этом Грабитель
                          немедленно забирает 1 сокровище).
                        </li>
                      </ul>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
