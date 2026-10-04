import { useState, useRef, useEffect, useMemo } from "react";
import type { GameModeType, OpponentType, Role } from "./types/game";
import { GameBoard } from "./components/GameBoard";
import { DetectiveHand } from "./components/DetectiveHand";
import { VictimList } from "./components/VictimList";
import { RoleRevealModal } from "./components/RoleRevealModal";
import { MainMenu } from "./components/MainMenu";
import { GAME_MODES } from "./components/ModeSelectModal";
import {
  createInitialState,
  setInspectorRole,
  shiftBoard,
  isOppositeShift,
  killCharacter,
  accuseCharacter,
  exonerateFromHand,
  disguiseKiller,
  getAdjacentCharacters,
  cleanupDeadCharacters,
  canCleanupBoard,
  captureSpy,
  interrogateNeighbor,
  robNeighbor,
  escapeManiac,
} from "./utils/gameLogic";
import {
  getKillerAIMove,
  getDetectiveAIMove,
  getSecretServiceAIMove,
} from "./utils/aiLogic";
import { sounds } from "./utils/audio";
import { triggerHaptic } from "./utils/haptics";
import { MainMenu } from "./components/MainMenu";
import { GAME_MODES } from "./components/ModeSelectModal";
import { ActionPanel } from "./components/ActionPanel";

export default function App() {
  const [activeMode, setActiveMode] = useState<GameModeType>("SKHVATKA");
  const [isLobbyOpen, setIsLobbyOpen] = useState(true);
  const [hasStartedEver, setHasStartedEver] = useState(false);

  const [gameState, setGameState] = useState(() =>
    createInitialState("SKHVATKA", "AI", "DETECTIVE"),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [isIntroPhase, setIsIntroPhase] = useState(false);
  const [showKillerRole, setShowKillerRole] = useState(false);
  const [showDetectiveRole, setShowDetectiveRole] = useState(false);

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);

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
      sounds.playExplosion();
      triggerHaptic("success");
    }
  }, [gameState.winner]);

  // src/App.tsx

  useEffect(() => {
    if (
      !hasStartedEver ||
      isIntroPhase ||
      gameState.winner ||
      gameState.opponent !== "AI"
    ) {
      return;
    }

    const isAITurn = gameState.currentTurn !== gameState.playerRole;

    if (isAITurn) {
      setIsAIThinking(true);
      const timer = setTimeout(() => {
        setGameState((prev) => {
          if (prev.winner) return prev;
          if (prev.mode === "SECRET_SERVICE") {
            return getSecretServiceAIMove(prev);
          }
          if (prev.currentTurn === "KILLER") {
            return getKillerAIMove(prev);
          }
          return getDetectiveAIMove(prev);
        });
        setIsAIThinking(false);
        setSelectedId(null); // НОВОЕ: Сбрасываем выделение игрока после хода бота
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [
    hasStartedEver,
    isIntroPhase,
    gameState.currentTurn,
    gameState.winner,
    gameState.opponent,
    gameState.playerRole,
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

  const inspectorChoices = (gameState.inspectorChoices ?? [])
    .map((id) => allChars.find((c) => c.id === id))
    .filter(Boolean) as typeof allChars;

  const isCleanupAvailable =
    canCleanupBoard(gameState.board) && !gameState.winner;
  const isFirstTurnKiller =
    gameState.mode === "SKHVATKA" &&
    gameState.killCount === 0 &&
    gameState.currentTurn === "KILLER";

  const killerAdjacentIds = getAdjacentCharacters(
    gameState.board,
    gameState.killerSecretId,
  ).map((c) => c.id);
  const detectiveAdjacentIds = getAdjacentCharacters(
    gameState.board,
    gameState.detectiveSecretId,
  ).map((c) => c.id);

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

  const currentRoleName = isKillerTurn ? role1Name : role2Name;
  const isHumanTurn =
    gameState.opponent === "PVP" ||
    gameState.currentTurn === gameState.playerRole;

  const handleSelectInspectorRole = (chosenId: string) => {
    setGameState((prev) => setInspectorRole(prev, chosenId));
  };

  const handleStartNewGame = (
    modeId: GameModeType,
    opponent: OpponentType,
    playerRole: Role,
  ) => {
    setActiveMode(modeId);
    setGameState(createInitialState(modeId, opponent, playerRole));
    setSelectedId(null);
    setShowKillerRole(false);
    setShowDetectiveRole(false);
    setSecondsElapsed(0);
    setIsLobbyOpen(false);
    setHasStartedEver(true);
    setIsIntroPhase(modeId !== "SECRET_SERVICE");
  };

  const handleResumeGame = () => {
    setIsLobbyOpen(false);
  };

  const handleShift = (
    type: "ROW" | "COL",
    index: number,
    direction: "FORWARD" | "BACKWARD",
  ) => {
    if (
      gameState.winner ||
      isFirstTurnKiller ||
      !isHumanTurn ||
      isOppositeShift(gameState.lastShift, type, index, direction)
    ) {
      return;
    }

    sounds.playShift();
    triggerHaptic("light");

    const newBoard = shiftBoard(gameState.board, type, index, direction);
    const nextTurn =
      gameState.currentTurn === "KILLER" ? "DETECTIVE" : "KILLER";
    const actionText = `${currentRoleName} сдвинул ${
      type === "ROW" ? `ряд ${index + 1}` : `колонку ${index + 1}`
    }.`;

    setGameState((prev) => ({
      ...prev,
      board: newBoard,
      currentTurn: nextTurn,
      lastShift: { type, index, direction },
      lastInterrogation: null, // <-- ДОБАВИТЬ ЭТУ СТРОКУ
      log: [...prev.log, actionText],
    }));
    setSelectedId(null);
  };

  const handleKill = () => {
    if (!selectedId || gameState.currentTurn !== "KILLER" || !isHumanTurn)
      return;
    sounds.playKill();
    triggerHaptic("heavy");
    setGameState((prev) => killCharacter(prev, selectedId));
    setSelectedId(null);
  };

  const handleRob = () => {
    if (!selectedId || gameState.currentTurn !== "KILLER" || !isHumanTurn)
      return;
    sounds.playShift();
    triggerHaptic("medium");
    setGameState((prev) => robNeighbor(prev, selectedId));
    setSelectedId(null);
  };

  const handleEscapeManiac = () => {
    if (gameState.currentTurn !== "KILLER" || !isHumanTurn) return;
    sounds.playShift();
    triggerHaptic("medium");
    setGameState((prev) => escapeManiac(prev));
    setSelectedId(null);
  };
  const handleAccuse = () => {
    if (!selectedId || gameState.currentTurn !== "DETECTIVE" || !isHumanTurn)
      return;
    const targetChar = gameState.board.flat().find((c) => c.id === selectedId);
    if (!targetChar || targetChar.isDead) return;

    sounds.playAccuse();
    triggerHaptic("medium");
    setGameState((prev) => accuseCharacter(prev, selectedId));
    setSelectedId(null);
  };

  const handleDisguise = () => {
    if (gameState.currentTurn !== "KILLER" || isFirstTurnKiller || !isHumanTurn)
      return;
    sounds.playShift();
    triggerHaptic("medium");
    setGameState((prev) => disguiseKiller(prev));
    setSelectedId(null);
  };

  const handleExonerateFromHand = (id: string) => {
    if (gameState.currentTurn !== "DETECTIVE" || !isHumanTurn) return;
    sounds.playShift();
    triggerHaptic("light");
    setGameState((prev) => exonerateFromHand(prev, id));
    setSelectedId(null);
  };

  const handleCleanup = () => {
    if (!isCleanupAvailable || isFirstTurnKiller || !isHumanTurn) return;
    sounds.playShift();
    triggerHaptic("medium");
    setGameState((prev) => cleanupDeadCharacters(prev));
    setSelectedId(null);
  };

  const handleCaptureSpy = () => {
    if (!selectedId || gameState.mode !== "SECRET_SERVICE" || !isHumanTurn)
      return;
    sounds.playAccuse();
    triggerHaptic("medium");
    setGameState((prev) => captureSpy(prev, selectedId));
    setSelectedId(null);
  };

  const handleInterrogateSpy = () => {
    if (!selectedId || gameState.mode !== "SECRET_SERVICE" || !isHumanTurn)
      return;
    sounds.playShift();
    triggerHaptic("light");
    setGameState((prev) => interrogateNeighbor(prev, selectedId));
    setSelectedId(null);
  };

  const handleReset = () => {
    handleStartNewGame(activeMode, gameState.opponent, gameState.playerRole);
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
      actions.push({
        id: "capture_spy",
        label: "Захватить шпиона",
        onClick: handleCaptureSpy,
        disabled:
          !isHumanTurn ||
          !selectedId ||
          !activeAgentAdjacentIds.includes(selectedId) ||
          isGameOver,
        className:
          "py-2.5 bg-red-900/70 active:bg-red-800 disabled:opacity-30 text-red-100 text-[11px] font-black rounded-lg border border-red-700 transition disabled:cursor-not-allowed",
      });
      actions.push({
        id: "interrogate_spy",
        label: "Допросить свидетеля",
        onClick: handleInterrogateSpy,
        disabled:
          !isHumanTurn ||
          !selectedId ||
          !activeAgentAdjacentIds.includes(selectedId) ||
          isGameOver,
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
    gameState.opponent === "AI"
      ? gameState.playerRole === "KILLER"
      : isKillerTurn;

  const canPeekDetective =
    gameState.opponent === "AI"
      ? gameState.playerRole === "DETECTIVE"
      : isDetectiveTurn;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center select-none font-sans pb-4 lg:pb-2">
      {isLobbyOpen && (
        <MainMenu
          onStartGame={handleStartNewGame}
          hasActiveGame={hasStartedEver}
          onResumeGame={handleResumeGame}
        />
      )}

      {isIntroPhase && !isLobbyOpen && activeMode !== "SECRET_SERVICE" && (
        <RoleRevealModal
          mode={gameState.mode}
          opponent={gameState.opponent}
          playerRole={gameState.playerRole}
          killer={
            gameState.opponent === "AI" && gameState.playerRole === "DETECTIVE"
              ? undefined
              : killerChar
          }
          detective={
            gameState.opponent === "AI" && gameState.playerRole === "KILLER"
              ? undefined
              : detectiveChar
          }
          inspectorChoices={inspectorChoices}
          onSelectDetectiveRole={handleSelectInspectorRole}
          onComplete={() => setIsIntroPhase(false)}
        />
      )}

      <div className="sticky top-0 z-40 w-full bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-2 sm:px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1.5 sm:py-2 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsLobbyOpen(true)}
            className="text-[11px] sm:text-xs bg-zinc-900 active:bg-zinc-800 text-zinc-300 px-2 py-1 sm:py-1.5 rounded-lg border border-zinc-700 transition cursor-pointer flex items-center gap-1"
          >
            <span>☰</span>
            <span className="hidden md:inline">Операции</span>
          </button>

          <span className="text-[10px] xs:text-xs sm:text-sm font-black tracking-wider text-zinc-200 uppercase">
            {currentModeTitle}
          </span>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] sm:text-xs font-black tracking-widest uppercase transition-all shadow-lg ${
            isAIThinking
              ? "bg-amber-950/90 border-amber-500 text-amber-200 animate-pulse"
              : isKillerTurn
                ? "bg-red-950/80 border-red-600 text-red-100"
                : "bg-blue-950/80 border-blue-600 text-blue-100"
          }`}
        >
          {/* Радарная метка: статичная точка + расходящаяся импульсная волна */}
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping [animation-duration:2s] ${
                isKillerTurn ? "bg-red-500" : "bg-blue-500"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 shadow-md ${
                isKillerTurn
                  ? "bg-red-500 shadow-red-500/80"
                  : "bg-blue-500 shadow-blue-500/80"
              }`}
            />
          </span>
          <span>{currentRoleName}</span>
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
            <div className="flex items-center gap-3">
              <span>
                Трофеи «Восток»:{" "}
                <b className="text-red-400">
                  {gameState.trophiesKiller ?? 0}/2
                </b>
              </span>
              <span>
                Трофеи «Запад»:{" "}
                <b className="text-blue-400">
                  {gameState.trophiesDetective ?? 0}/2
                </b>
              </span>
              <span>Колода: {gameState.evidenceDeck.length}</span>
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

          <div className="text-[10px] font-mono text-zinc-500">
            {gameState.opponent === "AI"
              ? "⚔️ Режим: против бота"
              : "👥 Режим: вдвоем"}
          </div>
        </div>

        {gameState.winner && (
          <div className="w-full mb-3 p-3 rounded-xl text-center font-bold text-sm sm:text-lg border bg-zinc-900 shadow-xl border-amber-500 text-amber-300">
            Игра окончена! Победил{" "}
            {gameState.winner === "KILLER" ? role1Name : role2Name}!
            <div className="text-xs text-zinc-400 font-normal font-mono mt-1">
              Время операции: {formatTimer(secondsElapsed)}
            </div>
          </div>
        )}

        {gameState.mode === "MANIAC_VS_OPERATIVE" && (
          <VictimList
            victimIds={gameState.victimList}
            allCharacters={allChars}
          />
        )}

        {gameState.lastInterrogation && !gameState.winner && (
          <div
            className={`w-full mb-2 p-3 rounded-xl border flex items-center justify-between shadow transition-all ${
              gameState.lastInterrogation.isNear
                ? "bg-red-950/40 border-red-800/80 text-red-200"
                : "bg-zinc-900 border-zinc-700 text-zinc-300"
            }`}
          >
            <div className="text-xs">
              <span className="font-bold text-zinc-400 block text-[10px] uppercase mb-0.5">
                Свидетельские показания (
                {gameState.lastInterrogation.targetName})
              </span>
              <span className="font-semibold text-zinc-200">
                {gameState.mode === "SECRET_SERVICE"
                  ? "Вражеский шпион находится рядом со свидетелем?"
                  : gameState.lastInterrogation.interrogator === "DETECTIVE"
                    ? "Преступник рядом с алиби?"
                    : "Законник рядом с жертвой?"}
              </span>
            </div>

            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase border select-none ${
                gameState.lastInterrogation.isNear
                  ? "bg-red-950 text-red-300 border-red-700"
                  : "bg-zinc-950 text-zinc-300 border-zinc-800"
              }`}
            >
              {gameState.lastInterrogation.isNear ? "● ДА, РЯДОМ" : "○ НЕТ"}
            </div>
          </div>
        )}

        <div className="w-full flex flex-col lg:flex-row gap-3 sm:gap-6 items-start justify-center">
          {/* Левая колонка: Игровое поле и мобильный блок ролей */}
          <div className="w-full lg:w-auto flex-1 flex flex-col items-center">
            <div className="w-full flex justify-center">
              <GameBoard
                board={gameState.board}
                selectedCharacterId={selectedId}
                killerAdjacentIds={killerAdjacentIds}
                detectiveAdjacentIds={detectiveAdjacentIds}
                showKillerHints={showKillerRole}
                showDetectiveHints={showDetectiveRole}
                lastShift={gameState.lastShift}
                onShift={handleShift}
                onSelectCharacter={(id) =>
                  isHumanTurn &&
                  setSelectedId((prev) => (prev === id ? null : id))
                }
              />
            </div>

            {/* Карточки ролей: видны только на мобилках под полем */}
            <div className="w-full max-w-[540px] flex lg:hidden gap-2 mt-2">
              <div className="flex-1 p-2 bg-zinc-950 rounded-lg border border-red-950/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-red-400">
                    {role1Name}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-zinc-300">
                    {showKillerRole ||
                    (gameState.opponent === "AI" &&
                      gameState.playerRole === "KILLER")
                      ? killerChar?.name
                      : "••••••••"}
                  </div>
                </div>
                <button
                  type="button"
                  onMouseDown={() => canPeekKiller && setShowKillerRole(true)}
                  onMouseUp={() => setShowKillerRole(false)}
                  onTouchStart={() => canPeekKiller && setShowKillerRole(true)}
                  onTouchEnd={() => setShowKillerRole(false)}
                  disabled={!canPeekKiller}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    !canPeekKiller
                      ? "bg-zinc-900 text-zinc-600 border-zinc-800 opacity-40 cursor-not-allowed"
                      : "bg-red-950/80 hover:bg-red-900 active:bg-red-800 text-red-300 border-red-700 cursor-pointer"
                  }`}
                >
                  Зажать
                </button>
              </div>

              <div className="flex-1 p-2 bg-zinc-950 rounded-lg border border-blue-950/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-blue-400">
                    {role2Name}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-zinc-300">
                    {showDetectiveRole ||
                    (gameState.opponent === "AI" &&
                      gameState.playerRole === "DETECTIVE")
                      ? detectiveChar?.name
                      : "••••••••"}
                  </div>
                </div>
                <button
                  type="button"
                  onMouseDown={() =>
                    canPeekDetective && setShowDetectiveRole(true)
                  }
                  onMouseUp={() => setShowDetectiveRole(false)}
                  onTouchStart={() =>
                    canPeekDetective && setShowDetectiveRole(true)
                  }
                  onTouchEnd={() => setShowDetectiveRole(false)}
                  disabled={!canPeekDetective}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    !canPeekDetective
                      ? "bg-zinc-900 text-zinc-600 border-zinc-800 opacity-40 cursor-not-allowed"
                      : "bg-blue-950/80 hover:bg-blue-900 active:bg-blue-800 text-blue-300 border-blue-700 cursor-pointer"
                  }`}
                >
                  Зажать
                </button>
              </div>
            </div>
          </div>

          {/* Правая колонка: Сайдбар (Десктопные роли, Действия, Карты, Протокол) */}
          <div className="w-full lg:w-72 flex flex-col gap-3 shrink-0">
            {/* Карточки ролей: видны только на десктопе в сайдбаре */}
            <div className="w-full hidden lg:flex flex-col gap-2">
              <div className="p-2 bg-zinc-950 rounded-lg border border-red-950/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-red-400">
                    {role1Name}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-zinc-300">
                    {showKillerRole ||
                    (gameState.opponent === "AI" &&
                      gameState.playerRole === "KILLER")
                      ? killerChar?.name
                      : "••••••••"}
                  </div>
                </div>
                <button
                  type="button"
                  onMouseDown={() => canPeekKiller && setShowKillerRole(true)}
                  onMouseUp={() => setShowKillerRole(false)}
                  onTouchStart={() => canPeekKiller && setShowKillerRole(true)}
                  onTouchEnd={() => setShowKillerRole(false)}
                  disabled={!canPeekKiller}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    !canPeekKiller
                      ? "bg-zinc-900 text-zinc-600 border-zinc-800 opacity-40 cursor-not-allowed"
                      : "bg-red-950/80 hover:bg-red-900 active:bg-red-800 text-red-300 border-red-700 cursor-pointer"
                  }`}
                >
                  Зажать
                </button>
              </div>

              <div className="p-2 bg-zinc-950 rounded-lg border border-blue-950/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-blue-400">
                    {role2Name}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-zinc-300">
                    {showDetectiveRole ||
                    (gameState.opponent === "AI" &&
                      gameState.playerRole === "DETECTIVE")
                      ? detectiveChar?.name
                      : "••••••••"}
                  </div>
                </div>
                <button
                  type="button"
                  onMouseDown={() =>
                    canPeekDetective && setShowDetectiveRole(true)
                  }
                  onMouseUp={() => setShowDetectiveRole(false)}
                  onTouchStart={() =>
                    canPeekDetective && setShowDetectiveRole(true)
                  }
                  onTouchEnd={() => setShowDetectiveRole(false)}
                  disabled={!canPeekDetective}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    !canPeekDetective
                      ? "bg-zinc-900 text-zinc-600 border-zinc-800 opacity-40 cursor-not-allowed"
                      : "bg-blue-950/80 hover:bg-blue-900 active:bg-blue-800 text-blue-300 border-blue-700 cursor-pointer"
                  }`}
                >
                  Зажать
                </button>
              </div>
            </div>

            {/* Блок действий */}
            <ActionPanel
              actions={availableActions}
              currentRoleName={currentRoleName}
              isAIThinking={isAIThinking}
            />

            {/* Рука следователя */}
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

            {/* Протокол событий */}
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
                className={`overflow-y-auto space-y-1 text-[10px] text-zinc-300 font-mono px-2.5 pb-2 transition-all ${
                  isLogOpen ? "max-h-48" : "max-h-16 lg:max-h-48"
                }`}
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
    </div>
  );
}
