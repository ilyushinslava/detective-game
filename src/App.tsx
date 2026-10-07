import { useState, useRef, useEffect, useMemo } from "react";
import type { GameModeType, OpponentType, Role } from "./types/game";
import { GameBoard } from "./components/GameBoard";
import { DetectiveHand } from "./components/DetectiveHand";
import { ThiefHand } from "./components/ThiefHand";
import { VictimList } from "./components/VictimList";
import { RoleRevealModal } from "./components/RoleRevealModal";
import { MainMenu } from "./components/MainMenu";
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

const SPY_COLORS = [
  {
    text: "text-emerald-400",
    bg: "bg-emerald-950",
    border: "border-emerald-500",
    ring: "ring-emerald-500/80",
  },
  {
    text: "text-amber-400",
    bg: "bg-amber-950",
    border: "border-amber-500",
    ring: "ring-amber-500/80",
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

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Единая точка входа для всех действий (локальных и сетевых)
  const dispatchAction = (action: GameAction) => {
    if (action.senderId === "local" && mpService.roomCode) {
      mpService.sendAction(action);
    }
    setGameState((prev) => gameReducer(prev, action));
  };

  // Сетевой слушатель (пустой массив зависимостей защищает от stale closures)
  useEffect(() => {
    mpService.onActionReceived = (action: GameAction) => {
      if (action.type === "RESTART_GAME" || action.type === "MATCH_STARTED") {
        setGameState((prev) => {
          const newState =
            action.type === "MATCH_STARTED"
              ? action.payload.state
              : gameReducer(prev, action);

          // Инвертируем роль для гостя
          if (newState.opponent === "ONLINE" && !mpService.isHost) {
            return {
              ...newState,
              playerRole:
                newState.mode !== "SECRET_SERVICE"
                  ? newState.playerRole === "KILLER"
                    ? "DETECTIVE"
                    : "KILLER"
                  : "DETECTIVE",
            };
          }
          return newState;
        });
        setIsLobbyOpen(false);
        setHasStartedEver(true);
        setIsIntroPhase(true);
        setSecondsElapsed(0);
      } else {
        // Функциональное обновление гарантирует применение к самому свежему стейту!
        setGameState((prev) =>
          gameReducer(prev, { ...action, senderId: "remote" }),
        );
      }
    };
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
    if (gameState.winner) {
      sounds.playVictory();
      triggerHaptic("success");
    }
  }, [gameState.winner]);

  // Логика хода ИИ
  useEffect(() => {
    if (
      isIntroPhase ||
      isLobbyOpen ||
      gameState.winner ||
      gameState.opponent !== "AI"
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
    spy2Id ?? gameState.killerSecretId,
  ).map((c) => c.id);
  const detectiveAdjacentIds = getAdjacentCharacters(
    gameState.board,
    spy1Id ?? gameState.detectiveSecretId,
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
    ? SPY_COLORS[
        gameState.interrogationRadar.interrogatorIndex % SPY_COLORS.length
      ].ring
    : null;
  const currentModeTitle =
    GAME_MODES.find((m) => m.id === activeMode)?.title ?? "Схватка";

  const isKillerTurn = gameState.currentTurn === "KILLER";
  const isDetectiveTurn = gameState.currentTurn === "DETECTIVE";

  let role1Name = "БАНДИТ";
  let role2Name = "ИНСПЕКТОР";
  if (gameState.mode === "MANIAC_VS_OPERATIVE") {
    role1Name = "МАНЬЯК";
    role2Name = "ОПЕРАТИВНИК";
  } else if (gameState.mode === "SECRET_SERVICE") {
    role1Name = "АГЕНТ «ВОСТОК»";
    role2Name = "АГЕНТ «ЗАПАД»";
  } else if (gameState.mode === "THIEF_HUNT") {
    role1Name = "ВОР";
    role2Name = "СЫЩИК";
  }

  let currentRoleName = isKillerTurn ? role1Name : role2Name;
  if (gameState.mode === "SECRET_SERVICE" && gameState.spies) {
    currentRoleName = gameState.spies[gameState.activeSpyIndex ?? 0].name;
  }

  // СТРОГАЯ ЛОГИКА ОЧЕРЕДНОСТИ ХОДА
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
    // AI mode
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
  ) => {
    const newState = createInitialState(
      modeId,
      opponent,
      playerRole,
      playerCount,
      targetTrophies,
      maxTurns,
    );

    if (opponent === "ONLINE" && mpService.isHost) {
      mpService.broadcastMatchStart(newState);
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

  // ВСЕ ХЕНДЛЕРЫ ТЕПЕРЬ СТРОГО ЧЕРЕЗ dispatchAction
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
      sounds.playBuzzer();
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

    const activeSpy = gameState.spies![gameState.activeSpyIndex ?? 0];
    const isMiss = !gameState.spies!.some(
      (s) => s.id !== activeSpy.id && s.secretId === selectedId,
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

    dispatchAction({
      type: "CAPTURE_SPY",
      payload: { targetId: selectedId },
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
    handleStartNewGame(
      activeMode,
      gameState.opponent,
      gameState.playerRole,
      gameState.spies?.length ?? 3,
      gameState.spyTargetTrophies ?? 3,
      gameState.maxTurns ?? 16,
    );
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
      const currentSpy = gameState.spies?.[gameState.activeSpyIndex ?? 0];
      const currentSpyNeighbors = currentSpy
        ? getAdjacentCharacters(gameState.board, currentSpy.secretId).map(
            (c) => c.id,
          )
        : [];
      const isValidSpyTarget =
        Boolean(selectedId) &&
        Boolean(currentSpy) &&
        Boolean(selectedCharacter?.isAlive) &&
        (currentSpyNeighbors.includes(selectedId!) ||
          selectedId === currentSpy?.secretId);

      actions.push({
        id: "capture_spy",
        label: "Поймать шпиона",
        onClick: handleCaptureSpy,
        disabled: !isHumanTurn || !isValidSpyTarget || isGameOver,
        className:
          "py-2.5 bg-red-900/70 active:bg-red-800 disabled:opacity-30 text-red-100 text-[11px] font-black rounded-lg border border-red-700 transition disabled:cursor-not-allowed",
      });
      actions.push({
        id: "interrogate_spy",
        label: "Допросить",
        onClick: handleInterrogateSpy,
        disabled: !isHumanTurn || !isValidSpyTarget || isGameOver,
        className:
          "py-2.5 bg-blue-900/70 active:bg-blue-800 disabled:opacity-30 text-blue-100 text-[11px] font-black rounded-lg border border-blue-700 transition disabled:cursor-not-allowed",
      });
      actions.push({
        id: "cleanup_ss",
        label: "Обновить поле",
        onClick: handleCleanup,
        disabled: !isHumanTurn || !isCleanupAvailable,
        className:
          "py-2 bg-zinc-800 active:bg-zinc-700 disabled:opacity-30 text-zinc-300 text-[11px] font-bold rounded-lg border border-zinc-700 transition disabled:cursor-not-allowed",
      });
    } else {
      if (isKillerTurn) {
        if (gameState.mode === "THIEF_HUNT") {
          actions.push({
            id: "rob_basic",
            label: "Ограбить соседа",
            onClick: handleRob,
            disabled:
              !isHumanTurn ||
              !selectedId ||
              !killerAdjacentIds.includes(selectedId) ||
              isGameOver ||
              Boolean(selectedCharacter?.isRobbed),
            className:
              "py-2 bg-amber-900/60 active:bg-amber-800 disabled:opacity-30 text-amber-200 text-[11px] font-bold rounded-lg border border-amber-800 transition disabled:cursor-not-allowed",
          });
        } else {
          actions.push({
            id: "kill_basic",
            label:
              gameState.mode === "MANIAC_VS_OPERATIVE"
                ? "Убить цель"
                : "Убить соседа",
            onClick: handleKill,
            disabled:
              !isHumanTurn ||
              !selectedId ||
              !killerAdjacentIds.includes(selectedId) ||
              isGameOver,
            className:
              "py-2 bg-red-900/60 active:bg-red-800 disabled:opacity-30 text-red-200 text-[11px] font-bold rounded-lg border border-red-800 transition disabled:cursor-not-allowed",
          });
        }

        if (gameState.mode === "SKHVATKA") {
          actions.push({
            id: "disguise_skhvatka",
            label: "Замаскироваться",
            onClick: handleDisguise,
            disabled:
              !isHumanTurn ||
              isFirstTurnKiller ||
              gameState.evidenceDeck.length === 0 ||
              isGameOver,
            className:
              "py-2 bg-amber-950/70 active:bg-amber-900 disabled:opacity-30 text-amber-200 text-[11px] font-bold rounded-lg border border-amber-800 transition disabled:cursor-not-allowed",
          });
        }
        if (gameState.mode === "MANIAC_VS_OPERATIVE") {
          actions.push({
            id: "escape_maniac",
            label: "Сбежать (Сменить личность)",
            onClick: handleEscapeManiac,
            disabled:
              !isHumanTurn || gameState.evidenceDeck.length < 2 || isGameOver,
            className:
              "py-2 bg-amber-950/70 active:bg-amber-900 disabled:opacity-30 text-amber-200 text-[11px] font-bold rounded-lg border border-amber-800 transition disabled:cursor-not-allowed",
          });
        }
      } else {
        actions.push({
          id: "accuse_basic",
          label:
            gameState.mode === "MANIAC_VS_OPERATIVE"
              ? "Арестовать"
              : "Обвинить",
          onClick: handleAccuse,
          disabled:
            !isHumanTurn ||
            !selectedId ||
            Boolean(selectedCharacter?.isDead) ||
            isGameOver,
          className:
            "py-2.5 bg-blue-900/70 active:bg-blue-800 disabled:opacity-30 text-blue-100 text-[11px] font-black rounded-lg border border-blue-700 transition disabled:cursor-not-allowed",
        });
      }

      actions.push({
        id: "cleanup_basic",
        label: "Обновить поле",
        onClick: handleCleanup,
        disabled: !isHumanTurn || !isCleanupAvailable || isFirstTurnKiller,
        className:
          "py-2 bg-zinc-800 active:bg-zinc-700 disabled:opacity-30 text-zinc-300 text-[11px] font-bold rounded-lg border border-zinc-700 transition disabled:cursor-not-allowed",
      });
    }

    return actions;
  }, [
    gameState.mode,
    gameState.winner,
    gameState.evidenceDeck.length,
    gameState.detectiveSecretId,
    gameState.spies,
    gameState.activeSpyIndex,
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

  const canPeekKiller =
    gameState.opponent === "ONLINE"
      ? gameState.playerRole === "KILLER"
      : gameState.opponent === "AI"
        ? gameState.playerRole === "KILLER"
        : isKillerTurn;
  const canPeekDetective =
    gameState.opponent === "ONLINE"
      ? gameState.playerRole === "DETECTIVE"
      : gameState.opponent === "AI"
        ? gameState.playerRole === "DETECTIVE"
        : isDetectiveTurn;
  const canPeekSpy1 =
    gameState.mode === "SECRET_SERVICE" && gameState.activeSpyIndex === 0;
  const canPeekSpy2 =
    gameState.mode === "SECRET_SERVICE" && gameState.activeSpyIndex === 1;

  const killerNameText =
    gameState.opponent === "ONLINE"
      ? gameState.playerRole === "KILLER" && showKillerRole
        ? (killerChar?.name ?? "Неизвестно")
        : "••••••••"
      : showKillerRole ||
          (gameState.opponent === "AI" && gameState.playerRole === "KILLER")
        ? (killerChar?.name ?? "Неизвестно")
        : "••••••••";

  const detectiveNameText =
    gameState.opponent === "ONLINE"
      ? gameState.playerRole === "DETECTIVE" && showDetectiveRole
        ? (detectiveChar?.name ?? "Неизвестно")
        : "••••••••"
      : showDetectiveRole ||
          (gameState.opponent === "AI" && gameState.playerRole === "DETECTIVE")
        ? (detectiveChar?.name ?? "Неизвестно")
        : "••••••••";

  const boardMaxWidth =
    gameState.boardSize === 7
      ? "max-w-[720px]"
      : gameState.boardSize === 6
        ? "max-w-[620px]"
        : "max-w-[520px]";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center select-none font-sans pb-4 lg:pb-2">
      {isLobbyOpen && (
        <MainMenu
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
          killer={
            gameState.mode === "SECRET_SERVICE"
              ? gameState.spies && gameState.spies.length > 1
                ? allChars.find((c) => c.id === gameState.spies![1].secretId)
                : undefined
              : gameState.opponent === "AI" &&
                  gameState.playerRole === "DETECTIVE"
                ? undefined
                : killerChar
          }
          detective={
            gameState.mode === "SECRET_SERVICE"
              ? gameState.spies && gameState.spies.length > 0
                ? allChars.find((c) => c.id === gameState.spies![0].secretId)
                : undefined
              : gameState.opponent === "AI" && gameState.playerRole === "KILLER"
                ? undefined
                : detectiveChar
          }
          inspectorChoices={inspectorChoices}
          onSelectDetectiveRole={handleSelectInspectorRole}
          onComplete={() => setIsIntroPhase(false)}
        />
      )}

      {gameState.justCaughtSpyId &&
        !gameState.winner &&
        !isLobbyOpen &&
        gameState.spies?.find((s) => s.id === gameState.justCaughtSpyId)
          ?.isAI === false && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 select-none">
            {!isRevealConfirmed ? (
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
                  Убедитесь, что соперник не смотрит на экран, перед
                  подтверждением.
                </p>
                <button
                  onClick={() => setIsRevealConfirmed(true)}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg"
                >
                  Я держу телефон один ➔
                </button>
              </div>
            ) : (
              <div className="w-full max-w-sm bg-zinc-900 border border-emerald-900/60 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-700 flex items-center justify-center text-3xl mb-4">
                  🎭
                </div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                  Новое прикрытие
                </span>
                <h3 className="text-xl font-black text-zinc-100 mb-2">
                  Ваша новая личность:
                </h3>
                <div className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 my-4">
                  <div className="text-2xl font-black text-emerald-300">
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
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg"
                >
                  Запомнил, скрыть ➔
                </button>
              </div>
            )}
          </div>
        )}

      <div className="sticky top-0 z-40 w-full bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-2 sm:px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1.5 sm:py-2 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsPauseOpen(true)}
            className="text-[11px] sm:text-xs bg-zinc-900 active:bg-zinc-800 text-zinc-300 px-2 py-1 sm:py-1.5 rounded-lg border border-zinc-700 transition cursor-pointer flex items-center gap-1"
          >
            <span>☰</span>
            <span className="hidden md:inline">Меню</span>
          </button>
          <span className="text-[10px] xs:text-xs sm:text-sm font-black tracking-wider text-zinc-200 uppercase flex flex-col">
            <span>{currentModeTitle}</span>
            {gameState.opponent === "ONLINE" && (
              <span className="text-[8px] text-emerald-400 normal-case tracking-normal">
                Комната #{mpService.roomCode}
              </span>
            )}
          </span>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] sm:text-xs font-black tracking-widest uppercase transition-all shadow-lg ${isAIThinking ? "bg-amber-950/90 border-amber-500 text-amber-200 animate-pulse" : isKillerTurn ? "bg-red-950/80 border-red-600 text-red-100" : "bg-blue-950/80 border-blue-600 text-blue-100"}`}
        >
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping [animation-duration:2s] ${isKillerTurn ? "bg-red-500" : "bg-blue-500"}`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 shadow-md ${isKillerTurn ? "bg-red-500 shadow-red-500/80" : "bg-blue-500 shadow-blue-500/80"}`}
            />
          </span>
          <span>
            {gameState.opponent === "ONLINE" && !isHumanTurn
              ? "Ход соперника..."
              : currentRoleName}
          </span>
        </div>

        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-[10px] sm:text-xs text-zinc-400 font-bold">
          <span>{formatTimer(secondsElapsed)}</span>
        </div>

        <button
          onClick={handleReset}
          className="text-[11px] sm:text-xs bg-zinc-900 active:bg-zinc-800 text-zinc-300 px-2 py-1 sm:py-1.5 rounded-lg border border-zinc-700 transition cursor-pointer shrink-0 ml-1"
        >
          Заново
        </button>
      </div>

      <div className="w-full max-w-5xl p-2 sm:p-4 lg:p-6 flex flex-col items-center flex-1">
        <div className="w-full flex items-center justify-between text-[11px] text-zinc-400 mb-2 px-1">
          {gameState.mode === "SECRET_SERVICE" ? (
            <div className="flex flex-wrap items-center gap-2 pb-1 pr-2">
              {gameState.spies?.map((spy, idx) => {
                const color = SPY_COLORS[idx % SPY_COLORS.length];
                return (
                  <span key={spy.id} className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${color.bg} border ${color.border}`}
                    />
                    <span className="text-zinc-300 font-medium">
                      {spy.name}
                      {gameState.opponent === "AI" && idx === 0 ? " (Вы)" : ""}:
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
              <span className="text-amber-400 font-bold">
                {gameState.trophiesKiller ?? 0}/5
              </span>{" "}
              | Улики: {gameState.evidenceDeck.length}
            </div>
          ) : (
            <div>
              Жертвы:{" "}
              <span className="text-red-400 font-bold">
                {gameState.killCount}/
                {gameState.mode === "MANIAC_VS_OPERATIVE" ? 4 : 14}
              </span>{" "}
              | Улики: {gameState.evidenceDeck.length}
            </div>
          )}
          <div className="text-[10px] font-mono text-zinc-500 shrink-0 ml-2">
            {gameState.opponent === "AI"
              ? "⚔️ Режим: против бота"
              : gameState.opponent === "ONLINE"
                ? "🌐 Режим: по сети"
                : "👥 Режим: вдвоем"}
          </div>
        </div>

        {gameState.mode === "MANIAC_VS_OPERATIVE" && (
          <VictimList
            victimIds={gameState.victimList}
            allCharacters={allChars}
          />
        )}

        <div className="w-full flex flex-col lg:flex-row gap-3 sm:gap-6 items-start justify-center">
          <div
            className={`w-full lg:w-auto flex-1 flex flex-col items-center ${boardMaxWidth}`}
          >
            <div className="w-full flex justify-center">
              <GameBoard
                board={gameState.board}
                selectedCharacterId={selectedId}
                killerAdjacentIds={killerAdjacentIds}
                detectiveAdjacentIds={detectiveAdjacentIds}
                showKillerHints={
                  gameState.mode === "SECRET_SERVICE"
                    ? showSpyP2Role
                    : showKillerRole
                }
                showDetectiveHints={
                  gameState.mode === "SECRET_SERVICE"
                    ? showSpyP1Role
                    : showDetectiveRole
                }
                lastShift={gameState.lastShift}
                uniformedOfficerIds={gameState.uniformedOfficers}
                targetVictimId={
                  gameState.mode === "MANIAC_VS_OPERATIVE"
                    ? gameState.victimList[0]
                    : (gameState.interrogationRadar?.targetId ?? null)
                }
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

            {gameState.mode !== "SECRET_SERVICE" && (
              <RoleCards
                className="w-full max-w-[540px] flex lg:hidden gap-2 mt-2"
                role1Name={role1Name}
                role2Name={role2Name}
                killerNameText={killerNameText}
                detectiveNameText={detectiveNameText}
                canPeekKiller={canPeekKiller}
                canPeekDetective={canPeekDetective}
                isOnline={gameState.opponent === "ONLINE"}
                playerRole={gameState.playerRole}
                onPeekKillerStart={() =>
                  canPeekKiller && setShowKillerRole(true)
                }
                onPeekKillerEnd={() => setShowKillerRole(false)}
                onPeekKillerLeave={() => setShowKillerRole(false)}
                onPeekDetectiveStart={() =>
                  canPeekDetective && setShowDetectiveRole(true)
                }
                onPeekDetectiveEnd={() => setShowDetectiveRole(false)}
                onPeekDetectiveLeave={() => setShowDetectiveRole(false)}
              />
            )}

            {gameState.mode === "SECRET_SERVICE" && gameState.spies && (
              <div className="w-full max-w-[540px] mt-2 flex lg:hidden flex-col gap-2">
                <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                      Досье: {gameState.spies[0]?.name}
                    </span>
                    <span className="text-xs font-black text-emerald-400">
                      {showSpyP1Role
                        ? allChars.find(
                            (c) => c.id === gameState.spies![0]?.secretId,
                          )?.name
                        : "••••••••"}
                    </span>
                  </div>
                  <button
                    onMouseDown={() => canPeekSpy1 && setShowSpyP1Role(true)}
                    onMouseUp={() => setShowSpyP1Role(false)}
                    onMouseLeave={() => setShowSpyP1Role(false)}
                    onTouchStart={() => canPeekSpy1 && setShowSpyP1Role(true)}
                    onTouchEnd={() => setShowSpyP1Role(false)}
                    disabled={!canPeekSpy1}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border select-none transition ${!canPeekSpy1 ? "bg-zinc-900 text-zinc-600 border-zinc-800 opacity-40 cursor-not-allowed" : "bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 border-zinc-700 cursor-pointer"}`}
                  >
                    {canPeekSpy1 ? "Зажать" : "Чужой ход"}
                  </button>
                </div>

                {gameState.opponent === "PVP" && gameState.spies.length > 1 && (
                  <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                        Досье: {gameState.spies[1]?.name}
                      </span>
                      <span className="text-xs font-black text-blue-400">
                        {showSpyP2Role
                          ? allChars.find(
                              (c) => c.id === gameState.spies![1]?.secretId,
                            )?.name
                          : "••••••••"}
                      </span>
                    </div>
                    <button
                      onMouseDown={() => canPeekSpy2 && setShowSpyP2Role(true)}
                      onMouseUp={() => setShowSpyP2Role(false)}
                      onMouseLeave={() => setShowSpyP2Role(false)}
                      onTouchStart={() => canPeekSpy2 && setShowSpyP2Role(true)}
                      onTouchEnd={() => setShowSpyP2Role(false)}
                      disabled={!canPeekSpy2}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold border select-none transition ${!canPeekSpy2 ? "bg-zinc-900 text-zinc-600 border-zinc-800 opacity-40 cursor-not-allowed" : "bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 border-zinc-700 cursor-pointer"}`}
                    >
                      {canPeekSpy2 ? "Зажать" : "Чужой ход"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full lg:w-72 flex flex-col gap-3 shrink-0">
            {gameState.mode !== "SECRET_SERVICE" && (
              <RoleCards
                className="w-full hidden lg:flex flex-col gap-2"
                role1Name={role1Name}
                role2Name={role2Name}
                killerNameText={killerNameText}
                detectiveNameText={detectiveNameText}
                canPeekKiller={canPeekKiller}
                canPeekDetective={canPeekDetective}
                isOnline={gameState.opponent === "ONLINE"}
                playerRole={gameState.playerRole}
                onPeekKillerStart={() =>
                  canPeekKiller && setShowKillerRole(true)
                }
                onPeekKillerEnd={() => setShowKillerRole(false)}
                onPeekKillerLeave={() => setShowKillerRole(false)}
                onPeekDetectiveStart={() =>
                  canPeekDetective && setShowDetectiveRole(true)
                }
                onPeekDetectiveEnd={() => setShowDetectiveRole(false)}
                onPeekDetectiveLeave={() => setShowDetectiveRole(false)}
              />
            )}

            {gameState.mode === "SECRET_SERVICE" && gameState.spies && (
              <div className="w-full hidden lg:flex flex-col gap-2">
                <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                      Досье: {gameState.spies[0]?.name}
                    </span>
                    <span className="text-xs font-black text-emerald-400">
                      {showSpyP1Role
                        ? allChars.find(
                            (c) => c.id === gameState.spies![0]?.secretId,
                          )?.name
                        : "••••••••"}
                    </span>
                  </div>
                  <button
                    onMouseDown={() => canPeekSpy1 && setShowSpyP1Role(true)}
                    onMouseUp={() => setShowSpyP1Role(false)}
                    onMouseLeave={() => setShowSpyP1Role(false)}
                    onTouchStart={() => canPeekSpy1 && setShowSpyP1Role(true)}
                    onTouchEnd={() => setShowSpyP1Role(false)}
                    disabled={!canPeekSpy1}
                    className={`px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 rounded text-[10px] font-bold border border-zinc-700 select-none cursor-pointer`}
                  >
                    {canPeekSpy1 ? "Зажать" : "Чужой ход"}
                  </button>
                </div>

                {gameState.opponent === "PVP" && gameState.spies.length > 1 && (
                  <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                        Досье: {gameState.spies[1]?.name}
                      </span>
                      <span className="text-xs font-black text-blue-400">
                        {showSpyP2Role
                          ? allChars.find(
                              (c) => c.id === gameState.spies![1]?.secretId,
                            )?.name
                          : "••••••••"}
                      </span>
                    </div>
                    <button
                      onMouseDown={() => canPeekSpy2 && setShowSpyP2Role(true)}
                      onMouseUp={() => setShowSpyP2Role(false)}
                      onMouseLeave={() => setShowSpyP2Role(false)}
                      onTouchStart={() => canPeekSpy2 && setShowSpyP2Role(true)}
                      onTouchEnd={() => setShowSpyP2Role(false)}
                      disabled={!canPeekSpy2}
                      className={`px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 rounded text-[10px] font-bold border border-zinc-700 select-none cursor-pointer`}
                    >
                      {canPeekSpy2 ? "Зажать" : "Чужой ход"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {gameState.lastInterrogation && !gameState.winner && (
              <div
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between shadow-sm transition-all ${gameState.lastInterrogation.isNear ? "bg-red-950/20 border-red-900/50" : "bg-zinc-900/50 border-zinc-800"}`}
              >
                <div className="text-[10px] leading-tight flex-1 pr-2">
                  <span className="font-bold text-zinc-500 uppercase mb-0.5 block">
                    Показания ({gameState.lastInterrogation.targetName})
                  </span>
                  <span className="font-semibold text-zinc-300">
                    {gameState.lastInterrogation.interrogator === "DETECTIVE"
                      ? "Преступник рядом с алиби?"
                      : "Законник рядом с жертвой?"}
                  </span>
                </div>
                <div
                  className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black tracking-wider uppercase border ${gameState.lastInterrogation.isNear ? "bg-red-950/40 text-red-400 border-red-900/50" : "bg-blue-950/20 text-blue-400 border-blue-900/30"}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${gameState.lastInterrogation.isNear ? "bg-red-500 animate-pulse" : "bg-blue-500"}`}
                  />
                  {gameState.lastInterrogation.isNear
                    ? "Враг рядом"
                    : "Вне зоны"}
                </div>
              </div>
            )}

            {gameState.lastSpyInterrogation && !gameState.winner && (
              <div className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-900/90 shadow-md transition-all space-y-2">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Допрос окружения:{" "}
                    <span className="text-zinc-200 font-black">
                      {gameState.lastSpyInterrogation.targetName}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500">
                    Кто рядом?
                  </span>
                </div>
                <div
                  className={`grid gap-1.5 pt-0.5 ${gameState.spies && gameState.spies.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}
                >
                  {gameState.spies?.map((spy, idx) => {
                    const hasContact =
                      gameState.lastSpyInterrogation?.raisedHandsPlayerNames.includes(
                        spy.name,
                      );
                    return (
                      <div
                        key={spy.id}
                        className={`p-1.5 rounded-lg border flex flex-col items-center justify-center text-center ${hasContact ? "bg-red-950/40 border-red-700/70 text-red-300" : "bg-zinc-950 border-zinc-800 text-zinc-500"}`}
                      >
                        <span className="text-[9px] font-bold truncate w-full">
                          {gameState.opponent === "AI" && idx === 0
                            ? "Вы"
                            : spy.name.replace("Бот ", "")}
                        </span>
                        <span
                          className={`text-[8.5px] font-black uppercase mt-0.5 flex items-center gap-1 ${hasContact ? "text-red-400 font-extrabold" : "text-zinc-500"}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${hasContact ? "bg-red-500 animate-pulse" : "bg-zinc-600"}`}
                          />
                          {hasContact ? "РЯДОМ" : "НЕТ"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <ActionPanel
              actions={availableActions}
              currentRoleName={currentRoleName}
              isAIThinking={isAIThinking}
            />

            {(gameState.mode === "SKHVATKA" ||
              gameState.mode === "MANIAC_VS_OPERATIVE") && (
              <DetectiveHand
                handIds={gameState.detectiveHand}
                allCharacters={allChars}
                isDetectiveTurn={
                  isHumanTurn && isDetectiveTurn && !gameState.winner
                }
                onExonerateFromHand={handleExonerateFromHand}
              />
            )}

            {gameState.mode === "THIEF_HUNT" && (
              <ThiefHand
                handIds={gameState.killerHand ?? []}
                isThiefTurn={isHumanTurn && isKillerTurn && !gameState.winner}
                onFastDisguise={handleFastDisguise}
              />
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex-1 flex flex-col">
              <button
                type="button"
                onClick={() => setIsLogOpen(!isLogOpen)}
                className="w-full p-2.5 flex items-center justify-between text-[11px] font-semibold text-zinc-400 bg-zinc-900 hover:bg-zinc-800/80 transition cursor-pointer shrink-0"
              >
                <span>Протокол событий ({gameState.log.length})</span>
                <span className="text-xs">{isLogOpen ? "▲" : "▼"}</span>
              </button>
              <div
                ref={logContainerRef}
                className={`overflow-y-auto space-y-1 text-[10px] text-zinc-300 font-mono px-2.5 pb-2 transition-all ${isLogOpen ? "max-h-48" : "max-h-16 lg:max-h-48"}`}
              >
                {gameState.log.map((entry, idx) => (
                  <div key={idx} className="border-b border-zinc-800/60 pb-0.5">
                    • {entry}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {gameState.isHotseatCoverOpen &&
        gameState.opponent === "PVP" &&
        !gameState.winner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 p-4 select-none">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mb-4">
                📱
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                Передача хода
              </span>
              <h2 className="text-2xl font-black text-zinc-100 mb-2">
                Ход: {currentSpyName}
              </h2>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Передайте телефон следующему игроку. Убедитесь, что экран не
                виден сопернику.
              </p>
              <button
                onClick={() =>
                  setGameState((prev) => ({
                    ...prev,
                    isHotseatCoverOpen: false,
                  }))
                }
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg"
              >
                Я готов (Открыть поле) →
              </button>
            </div>
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
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col items-center">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">
                {gameState.mode === "SECRET_SERVICE"
                  ? "Всего ходов"
                  : gameState.mode === "THIEF_HUNT"
                    ? "Ходов / Краж"
                    : "Ходов / Жертв"}
              </span>
              <span className="text-lg font-mono font-black text-zinc-200">
                {gameState.mode === "SECRET_SERVICE"
                  ? Math.max(1, gameState.log.length - 1)
                  : `${Math.max(1, gameState.log.length - 1)} / ${gameState.mode === "THIEF_HUNT" ? (gameState.trophiesKiller ?? 0) : gameState.killCount}`}
              </span>
            </div>
            <div className="w-full text-left mb-6">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-2 block">
                Раскрытие личностей:
              </span>
              <div className="space-y-2">
                {gameState.mode === "SECRET_SERVICE" ? (
                  gameState.spies?.map((spy) => (
                    <div
                      key={spy.id}
                      className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-lg border border-zinc-800"
                    >
                      <span className="text-xs font-bold text-zinc-300">
                        {spy.name}
                      </span>
                      <span className="text-xs font-black text-emerald-400">
                        {allChars.find((c) => c.id === spy.secretId)?.name}
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-lg border border-red-900/30">
                      <span className="text-xs font-bold text-red-400">
                        {role1Name}
                      </span>
                      <span className="text-xs font-black text-zinc-200">
                        {killerChar?.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-lg border border-blue-900/30">
                      <span className="text-xs font-bold text-blue-400">
                        {role2Name}
                      </span>
                      <span className="text-xs font-black text-zinc-200">
                        {detectiveChar?.name}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="w-full flex gap-3">
              <button
                onClick={() => {
                  setIsLobbyOpen(true);
                  setGameState((prev) => ({
                    ...prev,
                    winner: null,
                    justCaughtSpyId: undefined,
                  }));
                  setIsRevealConfirmed(false);
                }}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                В меню ☰
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg"
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
              Продолжить операцию
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
                setSecondsElapsed(0);
                setSelectedId(null);
                setIsPauseOpen(false);
                setIsLobbyOpen(true);
              }}
              className="w-full py-3.5 bg-red-950/80 hover:bg-red-900 text-red-400 font-bold uppercase tracking-wider rounded-xl border border-red-900/50 transition cursor-pointer mt-4"
            >
              Покинуть операцию
            </button>
          </div>
        </div>
      )}

      {isRulesOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 select-none">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-xl font-black uppercase tracking-wider text-zinc-100">
                Справочник
              </h2>
              <button
                onClick={() => setIsRulesOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto space-y-3.5 text-left text-xs text-zinc-300 pr-2">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
                <span className="font-black text-amber-400 block text-xs uppercase tracking-wider">
                  1. Зона соседства
                </span>
                <p>
                  • <b>КТО ТАКОЙ СОСЕД?</b> Персонаж считается соседом, если
                  находится на расстоянии не более 1 клетки по вертикали,
                  горизонтали или <b>диагонали</b> (до 8 соседних клеток).
                </p>
                <p>
                  • <b>ГРАНИЦЫ ПОЛЯ:</b> Действия атаки, допроса и обвинения{" "}
                  <b>не распространяются</b> за пределы поля!
                </p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
                <span className="font-black text-amber-400 block text-xs uppercase tracking-wider">
                  2. Правила сдвига
                </span>
                <p>
                  • Вы можете сдвинуть <b>любой ряд или колонку</b> поля.
                </p>
                <p>
                  • Вышедшая за границу карта переносится на противоположный
                  край этого же ряда/колонки.
                </p>
                <p className="text-amber-200/90">
                  • <b>АНТИ-ОТМЕНА:</b> Запрещено отменять последний сдвиг
                  соперника обратно тем же рядом/колонкой!
                </p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
                <span className="font-black text-emerald-400 block text-xs uppercase tracking-wider">
                  3. Режим «Секретная служба»
                </span>
                <p>
                  • Масштаб поля зависит от стола: <b>3–4 игрока</b> — сетка
                  5×5; <b>5–6 игроков</b> — сетка 6×6; <b>7–9 игроков</b> —
                  сетка 7×7.
                </p>
                <p>
                  • Победа достигается набором целевых трофеев (3 или 4) через
                  раскрытие резидентов соперников.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
