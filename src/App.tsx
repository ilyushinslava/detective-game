import { useState, useRef, useEffect } from 'react';
import type { GameModeType, OpponentType, Role } from './types/game';
import { GameBoard } from './components/GameBoard';
import { DetectiveHand } from './components/DetectiveHand';
import { VictimList } from './components/VictimList';
import { RoleRevealModal } from './components/RoleRevealModal';
import { GameOverModal } from './components/GameOverModal';
import { ModeSelectModal, GAME_MODES } from './components/ModeSelectModal';
import { triggerHaptic } from './utils/haptics';
import { sounds } from './utils/audio';
import {
  createInitialState,
  setInspectorRole,
  shiftBoard,
  killCharacter,
  accuseCharacter,
  exonerateFromHand,
  disguiseKiller,
  getAdjacentCharacters,
  getCharacterCoords,
  cleanupDeadCharacters,
  canCleanupBoard,
  captureSpy,
  interrogateNeighbor,
  robNeighbor,
  setPolicePatrol,
  plantBomb,
  applyShield,
  sniperShot,
  crackVault,
  lockVault,
} from './utils/gameLogic';
import { getKillerAIMove, getDetectiveAIMove, getSecretServiceAIMove } from './utils/aiLogic';

export default function App() {
  const [activeMode, setActiveMode] = useState<GameModeType>('SKHVATKA');
  const [isLobbyOpen, setIsLobbyOpen] = useState(true);
  const [hasStartedEver, setHasStartedEver] = useState(false);

  const [gameState, setGameState] = useState(() => createInitialState('SKHVATKA', 'AI', 'DETECTIVE'));
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

  // Ход бота
  useEffect(() => {
    if (!hasStartedEver || isIntroPhase || gameState.winner || gameState.opponent !== 'AI') {
      return;
    }

    const isAITurn = gameState.currentTurn !== gameState.playerRole;

    if (isAITurn) {
      setIsAIThinking(true);
      const timer = setTimeout(() => {
        setGameState((prev) => {
          if (prev.winner) return prev;
          let next = prev;
          if (prev.mode === 'SECRET_SERVICE') {
            next = getSecretServiceAIMove(prev);
          } else if (prev.currentTurn === 'KILLER') {
            next = getKillerAIMove(prev);
          } else {
            next = getDetectiveAIMove(prev);
          }

          sounds.playShift();
          if (next.winner) {
            triggerHaptic(next.winner === next.playerRole ? 'success' : 'error');
          }
          return next;
        });
        setIsAIThinking(false);
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [hasStartedEver, isIntroPhase, gameState.currentTurn, gameState.winner, gameState.opponent, gameState.playerRole]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const allChars = gameState.board.flat();
  const killerChar = allChars.find((c) => c.id === gameState.killerSecretId);
  const detectiveChar = allChars.find((c) => c.id === gameState.detectiveSecretId);

  const inspectorChoices = (gameState.inspectorChoices ?? [])
    .map((id) => allChars.find((c) => c.id === id))
    .filter(Boolean) as typeof allChars;

  const isCleanupAvailable = canCleanupBoard(gameState.board) && !gameState.winner;
  const isFirstTurnKiller = gameState.mode === 'SKHVATKA' && gameState.killCount === 0 && gameState.currentTurn === 'KILLER';

  const killerAdjacentIds = getAdjacentCharacters(gameState.board, gameState.killerSecretId).map((c) => c.id);
  const detectiveAdjacentIds = getAdjacentCharacters(gameState.board, gameState.detectiveSecretId).map((c) => c.id);

  const currentModeInfo = GAME_MODES.find((m) => m.id === activeMode) ?? GAME_MODES[0];
  const currentModeTitle = currentModeInfo?.title ?? 'Схватка';

  const isKillerTurn = gameState.currentTurn === 'KILLER';
  const isDetectiveTurn = gameState.currentTurn === 'DETECTIVE';

  const role1Name = (currentModeInfo?.killerRoleName ?? 'Бандит').toUpperCase();
  const role2Name = (currentModeInfo?.detectiveRoleName ?? 'Инспектор').toUpperCase();
  const currentRoleName = isKillerTurn ? role1Name : role2Name;

  const isHumanTurn = gameState.opponent === 'PVP' || gameState.currentTurn === gameState.playerRole;

  const handleSelectInspectorRole = (chosenId: string) => {
    triggerHaptic('medium');
    setGameState((prev) => setInspectorRole(prev, chosenId));
  };

  const handleStartNewGame = (modeId: GameModeType, opponent: OpponentType, playerRole: Role) => {
    triggerHaptic('light');
    setActiveMode(modeId);
    setGameState(createInitialState(modeId, opponent, playerRole));
    setSelectedId(null);
    setShowKillerRole(false);
    setShowDetectiveRole(false);
    setSecondsElapsed(0);
    setIsLobbyOpen(false);
    setHasStartedEver(true);
    setIsIntroPhase(modeId === 'SKHVATKA' || modeId === 'MANIAC_VS_OPERATIVE');
  };

  const handleResumeGame = () => {
    triggerHaptic('light');
    setIsLobbyOpen(false);
  };

  const handleShift = (
    type: 'ROW' | 'COL',
    index: number,
    direction: 'FORWARD' | 'BACKWARD'
  ) => {
    if (gameState.winner || isFirstTurnKiller || !isHumanTurn) return;
    if (gameState.blockedShift && gameState.blockedShift.type === type && gameState.blockedShift.index === index) {
      triggerHaptic('error');
      return;
    }

    triggerHaptic('light');
    sounds.playShift();
    const newBoard = shiftBoard(gameState.board, type, index, direction);
    const nextTurn = gameState.currentTurn === 'KILLER' ? 'DETECTIVE' : 'KILLER';
    const actionText = `${currentRoleName} сдвинул ${type === 'ROW' ? `ряд ${index + 1}` : `колонку ${index + 1}`}.`;

    setGameState((prev) => ({
      ...prev,
      board: newBoard,
      currentTurn: nextTurn,
      lastShift: { type, index, direction },
      blockedShift: null,
      log: [...prev.log, actionText],
    }));
    setSelectedId(null);
  };

  const handleKill = () => {
    if (!selectedId || gameState.currentTurn !== 'KILLER' || !isHumanTurn) return;
    triggerHaptic('heavy');
    sounds.playKill();
    setGameState((prev) => {
      const next = killCharacter(prev, selectedId);
      if (next.winner) triggerHaptic('success');
      return next;
    });
    setSelectedId(null);
  };

  const handleCrackVault = () => {
    if (!selectedId || gameState.currentTurn !== 'KILLER' || !isHumanTurn) return;
    triggerHaptic('heavy');
    sounds.playExplosion();
    setGameState((prev) => {
      const next = crackVault(prev, selectedId);
      if (next.winner) triggerHaptic('success');
      return next;
    });
    setSelectedId(null);
  };

  const handleLockVault = () => {
    if (!selectedId || gameState.currentTurn !== 'DETECTIVE' || !isHumanTurn) return;
    triggerHaptic('medium');
    sounds.playAccuse();
    setGameState((prev) => lockVault(prev, selectedId));
    setSelectedId(null);
  };

  const handleRob = () => {
    if (!selectedId || gameState.currentTurn !== 'KILLER' || !isHumanTurn) return;
    triggerHaptic('heavy');
    sounds.playExplosion();
    setGameState((prev) => {
      const next = robNeighbor(prev, selectedId);
      if (next.winner) triggerHaptic('success');
      return next;
    });
    setSelectedId(null);
  };

  const handlePlantBomb = () => {
    if (!selectedId || gameState.currentTurn !== 'KILLER' || !isHumanTurn) return;
    triggerHaptic('medium');
    sounds.playExplosion();
    setGameState((prev) => plantBomb(prev, selectedId));
    setSelectedId(null);
  };

  const handleApplyShield = () => {
    if (!selectedId || gameState.currentTurn !== 'DETECTIVE' || !isHumanTurn) return;
    triggerHaptic('light');
    sounds.playShift();
    setGameState((prev) => applyShield(prev, selectedId));
    setSelectedId(null);
  };

  const handleSniperShot = () => {
    if (!selectedId || gameState.currentTurn !== 'DETECTIVE' || !isHumanTurn) return;
    triggerHaptic('heavy');
    sounds.playKill();
    setGameState((prev) => {
      const next = sniperShot(prev, selectedId);
      if (next.winner) triggerHaptic('success');
      return next;
    });
    setSelectedId(null);
  };

  const handlePatrol = () => {
    if (gameState.currentTurn !== 'DETECTIVE' || !isHumanTurn) return;
    triggerHaptic('medium');
    sounds.playAccuse();
    setGameState((prev) => setPolicePatrol(prev, 'ROW', 2));
    setSelectedId(null);
  };

  const handleAccuse = () => {
    if (!selectedId || gameState.currentTurn !== 'DETECTIVE' || !isHumanTurn) return;
    triggerHaptic('medium');
    sounds.playAccuse();
    setGameState((prev) => {
      const next = accuseCharacter(prev, selectedId);
      triggerHaptic(next.winner ? 'success' : 'medium');
      return next;
    });
    setSelectedId(null);
  };

  const handleDisguise = () => {
    if (gameState.currentTurn !== 'KILLER' || isFirstTurnKiller || !isHumanTurn) return;
    triggerHaptic('medium');
    sounds.playShift();
    setGameState((prev) => disguiseKiller(prev));
    setSelectedId(null);
  };

  const handleExonerateFromHand = (id: string) => {
    if (gameState.currentTurn !== 'DETECTIVE' || !isHumanTurn) return;
    triggerHaptic('light');
    sounds.playShift();
    setGameState((prev) => exonerateFromHand(prev, id));
    setSelectedId(null);
  };

  const handleCleanup = () => {
    if (!isCleanupAvailable || isFirstTurnKiller || !isHumanTurn) return;
    triggerHaptic('medium');
    sounds.playShift();
    setGameState((prev) => cleanupDeadCharacters(prev));
    setSelectedId(null);
  };

  const handleCaptureSpy = () => {
    if (!selectedId || gameState.mode !== 'SECRET_SERVICE' || !isHumanTurn) return;
    sounds.playAccuse();
    setGameState((prev) => {
      const next = captureSpy(prev, selectedId);
      triggerHaptic(next.winner ? 'success' : 'heavy');
      return next;
    });
    setSelectedId(null);
  };

  const handleInterrogateSpy = () => {
    if (!selectedId || gameState.mode !== 'SECRET_SERVICE' || !isHumanTurn) return;
    triggerHaptic('light');
    sounds.playShift();
    setGameState((prev) => interrogateNeighbor(prev, selectedId));
    setSelectedId(null);
  };

  const handleReset = () => {
    triggerHaptic('light');
    handleStartNewGame(activeMode, gameState.opponent, gameState.playerRole);
  };

  let isSniperTargetValid = false;
  if (selectedId && gameState.mode === 'EUROPOL_VS_OPG') {
    const pDet = getCharacterCoords(gameState.board, gameState.detectiveSecretId);
    const pTarget = getCharacterCoords(gameState.board, selectedId);
    if (pDet && pTarget) {
      const dr = Math.abs(pDet.r - pTarget.r);
      const dc = Math.abs(pDet.c - pTarget.c);
      isSniperTargetValid = (dr === 2 && dc === 0) || (dr === 0 && dc === 2);
    }
  }

  const activeAgentAdjacentIds = isKillerTurn ? killerAdjacentIds : detectiveAdjacentIds;
  const canPeekKiller = gameState.opponent === 'PVP' || gameState.playerRole === 'KILLER';
  const canPeekDetective = gameState.opponent === 'PVP' || gameState.playerRole === 'DETECTIVE';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center select-none font-sans pb-10">
      {isLobbyOpen && (
        <ModeSelectModal
          currentModeId={activeMode}
          hasActiveGame={hasStartedEver}
          onSelectMode={(modeId) => setActiveMode(modeId)}
          onResumeGame={handleResumeGame}
          onStartNewGame={handleStartNewGame}
        />
      )}

      {isIntroPhase && !isLobbyOpen && (activeMode === 'SKHVATKA' || activeMode === 'MANIAC_VS_OPERATIVE') && (
        <RoleRevealModal
          killer={killerChar}
          inspectorChoices={inspectorChoices}
          onSelectDetectiveRole={handleSelectInspectorRole}
          onComplete={() => setIsIntroPhase(false)}
        />
      )}

      {gameState.winner && (
        <GameOverModal
          winner={gameState.winner}
          mode={gameState.mode}
          killer={killerChar}
          detective={detectiveChar}
          elapsedTime={formatTimer(secondsElapsed)}
          onRestart={handleReset}
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

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 rounded-full border text-[10px] sm:text-xs font-black tracking-wider sm:tracking-widest uppercase transition-all shadow-lg ${
              isAIThinking
                ? 'bg-amber-950/90 border-amber-500 text-amber-200 animate-pulse'
                : isKillerTurn
                ? 'bg-red-950/80 border-red-600 text-red-100'
                : 'bg-blue-950/80 border-blue-600 text-blue-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isAIThinking ? 'bg-amber-400 animate-ping' : isKillerTurn ? 'bg-red-500' : 'bg-blue-500'}`} />
            <span>{isAIThinking ? 'Бот думает...' : currentRoleName}</span>
          </div>

          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-[10px] sm:text-xs text-zinc-400 font-bold">
            <span>{formatTimer(secondsElapsed)}</span>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="text-[11px] sm:text-xs bg-zinc-900 active:bg-zinc-800 text-zinc-300 px-2 py-1 sm:py-1.5 rounded-lg border border-zinc-700 transition cursor-pointer shrink-0 ml-1"
        >
          Заново
        </button>
      </div>

      <div className="w-full max-w-4xl p-2 sm:p-6 flex flex-col items-center">
        <div className="w-full flex items-center justify-between text-[11px] text-zinc-400 mb-2 px-1">
          {gameState.mode === 'SECRET_SERVICE' ? (
            <div className="flex items-center gap-3">
              <span>Трофеи «Восток»: <b className="text-red-400">{gameState.trophiesKiller ?? 0}/2</b></span>
              <span>Трофеи «Запад»: <b className="text-blue-400">{gameState.trophiesDetective ?? 0}/2</b></span>
              <span>Колода: {gameState.evidenceDeck.length}</span>
            </div>
          ) : gameState.mode === 'SPANISH_HEIST' ? (
            <div className="flex items-center gap-3">
              <span>Взломано хранилищ: <b className="text-amber-400">{gameState.trophiesKiller ?? 0}/3</b></span>
              <span>Колода: {gameState.evidenceDeck.length}</span>
            </div>
          ) : gameState.mode === 'THIEF_HUNT' ? (
            <div className="flex items-center gap-3">
              <span>Украдено сокровищ: <b className="text-amber-400">{gameState.trophiesKiller ?? 0}/5</b></span>
              <span>Колода: {gameState.evidenceDeck.length}</span>
            </div>
          ) : gameState.mode === 'EUROPOL_VS_OPG' ? (
            <div className="flex items-center gap-3">
              <span>Потери Европола: <b className="text-red-400">{gameState.killCount}/6</b></span>
              <span>Колода: {gameState.evidenceDeck.length}</span>
            </div>
          ) : (
            <div>
              Жертвы: <span className="text-red-400 font-bold">{gameState.killCount}/{gameState.mode === 'MANIAC_VS_OPERATIVE' ? 4 : 14}</span> | Улики: {gameState.evidenceDeck.length}
            </div>
          )}

          <div className="text-[10px] font-mono text-zinc-500">
            {gameState.opponent === 'AI' ? '⚔️ Режим: против бота' : '👥 Режим: вдвоем'}
          </div>
        </div>

        {gameState.mode === 'MANIAC_VS_OPERATIVE' && (
          <VictimList
            victimIds={gameState.victimList}
            allCharacters={allChars}
          />
        )}

        <div className="w-full flex flex-col lg:flex-row gap-3 sm:gap-4 items-start">
          <div className="flex-1 w-full">
            <GameBoard
              board={gameState.board}
              selectedCharacterId={selectedId}
              killerAdjacentIds={killerAdjacentIds}
              detectiveAdjacentIds={detectiveAdjacentIds}
              showKillerHints={showKillerRole}
              showDetectiveHints={showDetectiveRole}
              lastShift={gameState.lastShift}
              onShift={handleShift}
              onSelectCharacter={(id) => {
                if (isHumanTurn) {
                  triggerHaptic('light');
                  setSelectedId((prev) => (prev === id ? null : id));
                }
              }}
            />
          </div>

          <div className="w-full lg:w-72 flex flex-col gap-2.5">
            <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-xs flex sm:flex-col gap-2">
              <div className="flex-1 p-2 bg-zinc-950 rounded-lg border border-red-950/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-red-400">{role1Name}</div>
                  <div className="text-[11px] font-mono font-bold text-zinc-300">
                    {showKillerRole ? killerChar?.name : '••••••••'}
                  </div>
                </div>
                <button
                  disabled={!canPeekKiller}
                  onMouseDown={(e) => { e.preventDefault(); triggerHaptic('light'); setShowKillerRole(true); }}
                  onMouseUp={() => setShowKillerRole(false)}
                  onMouseLeave={() => setShowKillerRole(false)}
                  onTouchStart={(e) => { e.preventDefault(); triggerHaptic('light'); setShowKillerRole(true); }}
                  onTouchEnd={() => setShowKillerRole(false)}
                  onTouchCancel={() => setShowKillerRole(false)}
                  className={`text-[9px] px-2.5 py-1.5 rounded border font-bold select-none touch-none ${
                    !canPeekKiller
                      ? 'bg-zinc-900 text-zinc-600 border-zinc-800 opacity-40 cursor-not-allowed'
                      : 'bg-red-950 text-red-200 border-red-800 active:bg-red-900 cursor-pointer'
                  }`}
                >
                  Зажать
                </button>
              </div>

              <div className="flex-1 p-2 bg-zinc-950 rounded-lg border border-blue-950/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-blue-400">{role2Name}</div>
                  <div className="text-[11px] font-mono font-bold text-zinc-300">
                    {showDetectiveRole ? detectiveChar?.name : '••••••••'}
                  </div>
                </div>
                <button
                  disabled={!canPeekDetective}
                  onMouseDown={(e) => { e.preventDefault(); triggerHaptic('light'); setShowDetectiveRole(true); }}
                  onMouseUp={() => setShowDetectiveRole(false)}
                  onMouseLeave={() => setShowDetectiveRole(false)}
                  onTouchStart={(e) => { e.preventDefault(); triggerHaptic('light'); setShowDetectiveRole(true); }}
                  onTouchEnd={() => setShowDetectiveRole(false)}
                  onTouchCancel={() => setShowDetectiveRole(false)}
                  className={`text-[9px] px-2.5 py-1.5 rounded border font-bold select-none touch-none ${
                    !canPeekDetective
                      ? 'bg-zinc-900 text-zinc-600 border-zinc-800 opacity-40 cursor-not-allowed'
                      : 'bg-blue-950 text-blue-200 border-blue-800 active:bg-blue-900 cursor-pointer'
                  }`}
                >
                  Зажать
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl">
              <div className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px] mb-1.5 flex items-center justify-between">
                <span>Действия ({currentRoleName})</span>
                {isAIThinking && <span className="text-amber-400 text-[9px] animate-pulse">Бот думает...</span>}
              </div>

              {gameState.mode === 'SPANISH_HEIST' ? (
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                  {isKillerTurn ? (
                    <>
                      <button
                        onClick={handleCrackVault}
                        disabled={!isHumanTurn || !selectedId || !killerAdjacentIds.includes(selectedId) || gameState.winner !== null}
                        className="py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-30 text-zinc-950 text-[11px] font-black rounded-lg transition disabled:cursor-not-allowed"
                      >
                        Взломать хранилище 🔓
                      </button>

                      <button
                        onClick={handleDisguise}
                        disabled={!isHumanTurn || gameState.evidenceDeck.length === 0 || gameState.winner !== null}
                        className="py-2.5 bg-zinc-800 active:bg-zinc-700 disabled:opacity-30 text-zinc-200 text-[11px] font-bold rounded-lg border border-zinc-700 transition disabled:cursor-not-allowed"
                      >
                        Дымовая завеса
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleLockVault}
                        disabled={!isHumanTurn || !selectedId || !detectiveAdjacentIds.includes(selectedId) || gameState.winner !== null}
                        className="py-2.5 bg-red-900/80 active:bg-red-800 disabled:opacity-30 text-red-100 text-[11px] font-black rounded-lg border border-red-700 transition disabled:cursor-not-allowed"
                      >
                        Заблокировать сейф 🔒
                      </button>

                      <button
                        onClick={handleAccuse}
                        disabled={!isHumanTurn || !selectedId || !detectiveAdjacentIds.includes(selectedId) || gameState.winner !== null}
                        className="py-2.5 bg-blue-900/80 active:bg-blue-800 disabled:opacity-30 text-blue-100 text-[11px] font-black rounded-lg border border-blue-700 transition disabled:cursor-not-allowed"
                      >
                        Захват с поличным
                      </button>
                    </>
                  )}
                </div>
              ) : gameState.mode === 'EUROPOL_VS_OPG' ? (
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                  {isKillerTurn ? (
                    <>
                      <button
                        onClick={handleKill}
                        disabled={!isHumanTurn || !selectedId || !killerAdjacentIds.includes(selectedId) || gameState.winner !== null}
                        className="py-2.5 bg-red-900/80 active:bg-red-800 disabled:opacity-30 text-red-100 text-[11px] font-black rounded-lg border border-red-700 transition disabled:cursor-not-allowed"
                      >
                        Ликвидация соседа
                      </button>

                      <button
                        onClick={handlePlantBomb}
                        disabled={!isHumanTurn || !selectedId || !killerAdjacentIds.includes(selectedId) || gameState.winner !== null}
                        className="py-2.5 bg-amber-950/80 active:bg-amber-900 disabled:opacity-30 text-amber-200 text-[11px] font-black rounded-lg border border-amber-800 transition disabled:cursor-not-allowed"
                      >
                        Минировать клетку 💣
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleAccuse}
                        disabled={!isHumanTurn || !selectedId || !detectiveAdjacentIds.includes(selectedId) || gameState.winner !== null}
                        className="py-2.5 bg-blue-900/80 active:bg-blue-800 disabled:opacity-30 text-blue-100 text-[11px] font-black rounded-lg border border-blue-700 transition disabled:cursor-not-allowed"
                      >
                        Штурм и арест
                      </button>

                      <button
                        onClick={handleSniperShot}
                        disabled={!isHumanTurn || !selectedId || !isSniperTargetValid || gameState.winner !== null}
                        className="py-2.5 bg-emerald-950/80 active:bg-emerald-900 disabled:opacity-30 text-emerald-200 text-[11px] font-black rounded-lg border border-emerald-700 transition disabled:cursor-not-allowed"
                      >
                        Выстрел снайпера 🎯
                      </button>

                      <button
                        onClick={handleApplyShield}
                        disabled={!isHumanTurn || !selectedId || (!detectiveAdjacentIds.includes(selectedId) && selectedId !== gameState.detectiveSecretId) || gameState.winner !== null}
                        className="py-2 bg-indigo-900/70 active:bg-indigo-800 disabled:opacity-30 text-indigo-200 text-[11px] font-bold rounded-lg border border-indigo-700 transition disabled:cursor-not-allowed col-span-2 lg:col-span-1"
                      >
                        Бронежилет 🛡️
                      </button>
                    </>
                  )}
                </div>
              ) : gameState.mode === 'THIEF_HUNT' ? (
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                  <button
                    onClick={handleRob}
                    disabled={!isHumanTurn || !isKillerTurn || !selectedId || !killerAdjacentIds.includes(selectedId) || gameState.winner !== null}
                    className="py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-30 text-zinc-950 text-[11px] font-black rounded-lg transition disabled:cursor-not-allowed"
                  >
                    Ограбить соседа
                  </button>

                  <button
                    onClick={handlePatrol}
                    disabled={!isHumanTurn || !isDetectiveTurn || gameState.blockedShift !== null || gameState.winner !== null}
                    className="py-2.5 bg-blue-900/80 active:bg-blue-800 disabled:opacity-30 text-blue-100 text-[11px] font-black rounded-lg border border-blue-700 transition disabled:cursor-not-allowed"
                  >
                    Выставить патруль
                  </button>

                  <button
                    onClick={handleAccuse}
                    disabled={!isHumanTurn || !isDetectiveTurn || !selectedId || !detectiveAdjacentIds.includes(selectedId) || gameState.winner !== null}
                    className="py-2.5 bg-indigo-900/70 active:bg-indigo-800 disabled:opacity-30 text-indigo-100 text-[11px] font-black rounded-lg border border-indigo-700 transition disabled:cursor-not-allowed col-span-2 lg:col-span-1"
                  >
                    Арестовать вора
                  </button>
                </div>
              ) : gameState.mode === 'SECRET_SERVICE' ? (
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                  <button
                    onClick={handleCaptureSpy}
                    disabled={!isHumanTurn || !selectedId || !activeAgentAdjacentIds.includes(selectedId) || gameState.winner !== null}
                    className="py-2.5 bg-red-900/70 active:bg-red-800 disabled:opacity-30 text-red-100 text-[11px] font-black rounded-lg border border-red-700 transition disabled:cursor-not-allowed"
                  >
                    Захватить шпиона
                  </button>

                  <button
                    onClick={handleInterrogateSpy}
                    disabled={!isHumanTurn || !selectedId || !activeAgentAdjacentIds.includes(selectedId) || gameState.winner !== null}
                    className="py-2.5 bg-blue-900/70 active:bg-blue-800 disabled:opacity-30 text-blue-100 text-[11px] font-black rounded-lg border border-blue-700 transition disabled:cursor-not-allowed"
                  >
                    Допросить свидетеля
                  </button>

                  <button
                    onClick={handleCleanup}
                    disabled={!isHumanTurn || !isCleanupAvailable}
                    className="py-2 bg-zinc-800 active:bg-zinc-700 disabled:opacity-30 text-zinc-300 text-[11px] font-bold rounded-lg border border-zinc-700 transition disabled:cursor-not-allowed col-span-2 lg:col-span-1"
                  >
                    Обновить поле
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                  <button
                    onClick={handleKill}
                    disabled={!isHumanTurn || !isKillerTurn || !selectedId || gameState.winner !== null}
                    className="py-2 bg-red-900/60 active:bg-red-800 disabled:opacity-30 text-red-200 text-[11px] font-bold rounded-lg border border-red-800 transition disabled:cursor-not-allowed"
                  >
                    {gameState.mode === 'MANIAC_VS_OPERATIVE' ? 'Убить цель' : 'Убить соседа'}
                  </button>

                  <button
                    onClick={handleDisguise}
                    disabled={!isHumanTurn || !isKillerTurn || isFirstTurnKiller || gameState.evidenceDeck.length === 0 || gameState.winner !== null}
                    className="py-2 bg-amber-950/70 active:bg-amber-900 disabled:opacity-30 text-amber-200 text-[11px] font-bold rounded-lg border border-amber-800 transition disabled:cursor-not-allowed"
                  >
                    Замаскироваться
                  </button>

                  <button
                    onClick={handleAccuse}
                    disabled={!isHumanTurn || !isDetectiveTurn || !selectedId || (!detectiveAdjacentIds.includes(selectedId) && selectedId !== gameState.detectiveSecretId) || gameState.winner !== null}
                    className="py-2 bg-blue-900/60 active:bg-blue-800 disabled:opacity-30 text-blue-200 text-[11px] font-bold rounded-lg border border-blue-800 transition disabled:cursor-not-allowed"
                  >
                    {gameState.mode === 'MANIAC_VS_OPERATIVE' ? 'Арестовать' : 'Обвинить'}
                  </button>

                  <button
                    onClick={handleCleanup}
                    disabled={!isHumanTurn || !isCleanupAvailable || isFirstTurnKiller}
                    className="py-2 bg-zinc-800 active:bg-zinc-700 disabled:opacity-30 text-zinc-300 text-[11px] font-bold rounded-lg border border-zinc-700 transition disabled:cursor-not-allowed"
                  >
                    Обновить поле
                  </button>
                </div>
              )}
            </div>

            {gameState.mode === 'SKHVATKA' && (
              <DetectiveHand
                handIds={gameState.detectiveHand}
                allCharacters={allChars}
                isDetectiveTurn={isHumanTurn && isDetectiveTurn && !gameState.winner}
                onExonerateFromHand={handleExonerateFromHand}
              />
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <button
                onClick={() => { triggerHaptic('light'); setIsLogOpen(!isLogOpen); }}
                className="w-full p-2.5 flex items-center justify-between text-[11px] font-semibold text-zinc-400 bg-zinc-900 hover:bg-zinc-800/80 transition cursor-pointer"
              >
                <span>Протокол событий ({gameState.log.length})</span>
                <span className="text-xs">{isLogOpen ? '▲' : '▼'}</span>
              </button>

              <div
                ref={logContainerRef}
                className={`overflow-y-auto space-y-1 text-[10px] text-zinc-300 font-mono px-2.5 pb-2 transition-all ${
                  isLogOpen ? 'max-h-48' : 'max-h-16 lg:max-h-44'
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
