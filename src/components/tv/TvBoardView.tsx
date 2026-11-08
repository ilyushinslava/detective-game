import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CharacterCard } from '../CharacterCard';
import { GameOverModal } from '../GameOverModal';
import type { GameState, LastShift } from '../../types/game';
import { SPY_COLORS } from '../../types/game';
import { getGameModeTitle } from '../../constants/gameMeta';

export interface TvBoardViewProps {
  gameState: GameState;
  selectedLine?: LastShift | { type: 'ROW' | 'COL'; index: number; direction?: 'FORWARD' | 'BACKWARD' } | null;
  secondsLeft?: number;
  onExit?: () => void;
  onRestart?: () => void;
}

const Icons = {
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Radar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  ArrowDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  ),
  ArrowUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),
  Terminal: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
};

export const TvBoardView: React.FC<TvBoardViewProps> = ({
  gameState,
  selectedLine = null,
  secondsLeft = 60,
  onExit,
  onRestart,
}) => {
  const [focusedControl, setFocusedControl] = React.useState<'NONE' | 'RESTART' | 'EXIT'>('NONE');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // D-Pad Left (KeyLeft, 37, 21)
      if (e.key === 'ArrowLeft' || e.keyCode === 37 || e.keyCode === 21) {
        e.preventDefault();
        if (onRestart) {
          setFocusedControl('RESTART');
        } else if (onExit) {
          setFocusedControl('EXIT');
        }
      }
      // D-Pad Right (KeyRight, 39, 22)
      else if (e.key === 'ArrowRight' || e.keyCode === 39 || e.keyCode === 22) {
        e.preventDefault();
        if (onExit) {
          setFocusedControl('EXIT');
        } else if (onRestart) {
          setFocusedControl('RESTART');
        }
      }
      // Enter / Select (DPAD_CENTER = 23, ENTER = 66, Space = 32, Enter = 13)
      else if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32 || e.keyCode === 23 || e.keyCode === 66) {
        e.preventDefault();
        if (focusedControl === 'RESTART' && onRestart) {
          onRestart();
        } else if (focusedControl === 'EXIT' && onExit) {
          onExit();
        } else if (gameState?.winner) {
          if (onExit) onExit();
        }
      }
      // Escape / Back (KEYCODE_BACK = 4, ESCAPE = 27)
      else if (e.key === 'Escape' || e.keyCode === 27 || e.keyCode === 4) {
        e.preventDefault();
        if (onExit) {
          onExit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedControl, onRestart, onExit, gameState?.winner]);

  const isSecretService = gameState?.mode === 'SECRET_SERVICE';
  const spies = gameState?.spies || [];
  const activeSpyIndex = gameState?.activeSpyIndex ?? 0;
  const activeSpy = spies[activeSpyIndex];
  const currentTurn = gameState?.currentTurn || 'KILLER';
  const isKillerTurn = currentTurn === 'KILLER';

  let killerScore = 0;
  let killerTarget = 4;
  let detectiveScore = 0;
  let detectiveTarget = 1;

  if (isSecretService) {
    killerTarget = gameState?.spyTargetTrophies ?? 3;
    detectiveTarget = killerTarget;
  } else if (gameState?.mode === 'LINE_UP') {
    killerScore = gameState?.duelPenalties?.KILLER ?? 0;
    detectiveScore = gameState?.duelPenalties?.DETECTIVE ?? 0;
    killerTarget = 3;
    detectiveTarget = 3;
  } else if (gameState?.mode === 'THIEF_HUNT') {
    killerScore = gameState?.trophiesKiller ?? 0;
    killerTarget = 10;
    detectiveScore = gameState?.winner === 'DETECTIVE' ? 1 : 0;
    detectiveTarget = 1;
  } else if (gameState?.mode === 'MANIAC_VS_OPERATIVE') {
    killerScore = gameState?.killCount ?? 0;
    killerTarget = 4;
    detectiveScore = gameState?.winner === 'DETECTIVE' ? 1 : 0;
    detectiveTarget = 1;
  }

  const activeTurnName = React.useMemo(() => {
    if (isSecretService) return activeSpy?.name || 'Агент';
    if (gameState?.mode === 'THIEF_HUNT') return isKillerTurn ? 'Грабитель' : 'Полиция';
    if (gameState?.mode === 'MANIAC_VS_OPERATIVE') return isKillerTurn ? 'Маньяк' : 'Оперативник';
    if (gameState?.mode === 'LINE_UP') return isKillerTurn ? 'Подозреваемый' : 'Следователь';
    return isKillerTurn ? 'Преступник' : 'Закон';
  }, [isSecretService, activeSpy, gameState?.mode, isKillerTurn]);

  const killerRoleName = gameState?.mode === 'THIEF_HUNT' ? 'Грабитель' : gameState?.mode === 'LINE_UP' ? 'Подозреваемый' : 'Маньяк';
  const detectiveRoleName = gameState?.mode === 'THIEF_HUNT' ? 'Полиция' : gameState?.mode === 'LINE_UP' ? 'Следователь' : 'Оперативник';

  const boardSize = gameState?.board?.length || 5;
  const flatCards = (gameState?.board || []).flat();

  const radarTargetId = gameState?.interrogationRadar?.targetId;
  const radarCoords = React.useMemo(() => {
    if (!radarTargetId || !gameState?.board) return null;
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (gameState.board[r]?.[c]?.id === radarTargetId) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }, [radarTargetId, gameState?.board, boardSize]);

  const isRadarCell = (row: number, col: number) => {
    if (!radarCoords) return false;
    return Math.abs(radarCoords.row - row) <= 1 && Math.abs(radarCoords.col - col) <= 1;
  };

  const isRadarCenter = (row: number, col: number) => {
    if (!radarCoords) return false;
    return radarCoords.row === row && radarCoords.col === col;
  };

  const isLineSelected = (row: number, col: number) => {
    if (!selectedLine) return false;
    if (selectedLine.type === 'ROW' && selectedLine.index === row) return true;
    if (selectedLine.type === 'COL' && selectedLine.index === col) return true;
    return false;
  };

  const selectedLineType = selectedLine?.type || null;
  const selectedLineIdx = selectedLine ? selectedLine.index + 1 : 0;
  const selectedLineDir = (selectedLine as any)?.direction || null;

  // Индикатор расследования (прогресс матча)
  const totalScore = killerScore + detectiveScore;
  const maxScore = Math.max(1, killerTarget + detectiveTarget);
  const investigationProgress = Math.min(100, Math.round((totalScore / maxScore) * 100));

  if (gameState?.winner) {
    const winningSpy = isSecretService
      ? (spies.find((s) => s.id === gameState.winner) ||
         (gameState.winner === 'KILLER' ? spies[0] : gameState.winner === 'DETECTIVE' ? spies[1] : null))
      : null;
    const isKillerWinner = gameState.winner === 'KILLER' || Boolean(winningSpy && spies[0]?.id === winningSpy.id);
    const finalKillerChar = flatCards.find((c) => c.id === (winningSpy?.secretId || gameState.killerSecretId));
    const finalDetectiveChar = flatCards.find((c) => c.id === gameState.detectiveSecretId);

    return (
      <div className="relative h-screen w-screen bg-[#080a0f] overflow-hidden select-none">
        <GameOverModal
          winner={isKillerWinner ? 'KILLER' : 'DETECTIVE'}
          mode={gameState.mode}
          killer={finalKillerChar}
          detective={finalDetectiveChar}
          elapsedTime="--:--"
          isMultiplayer={true}
          onRestart={onRestart || (() => {})}
          onExitToMenu={onExit || (() => {})}
        />
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-zinc-800/80 bg-zinc-950/80 shadow-2xl backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <span className="text-xs 2xl:text-sm font-mono uppercase tracking-widest text-zinc-300">
            Ожидание выбора реванша на контроллерах
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="tv-root flex h-screen w-screen flex-col bg-[#080a0f] text-zinc-100 select-none overflow-hidden p-4 sm:p-5 lg:p-6 gap-3 sm:gap-4 font-sans">
      {/* Верхняя статусная планка (Шапка ТВ) по макету ТВ3 */}
      <div className="flex items-center justify-between px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-zinc-950/70 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] shrink-0">
        {/* Левая группа: Статусы и счета участников */}
        <div className="flex items-center gap-5 sm:gap-6">
          {isSecretService && spies.length > 0 ? (
            spies.map((spy, idx) => {
              const color = SPY_COLORS[idx % SPY_COLORS.length];
              return (
                <div key={spy.id || idx} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${color.bg} border ${color.border}`} />
                  <span className="text-xs sm:text-sm 2xl:text-base font-bold tracking-wide text-zinc-300">
                    {spy.name}: <span className={`${color.text} font-mono font-black`}>{spy.trophies}/{killerTarget}</span>
                  </span>
                </div>
              );
            })
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
                <span className="text-xs sm:text-sm 2xl:text-base font-bold tracking-wider text-zinc-300">
                  {killerRoleName}: <span className="text-red-400 font-mono font-black">{killerScore}/{killerTarget}</span>
                </span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.7)]" />
                <span className="text-xs sm:text-sm 2xl:text-base font-bold tracking-wider text-zinc-300">
                  {detectiveRoleName}: <span className="text-cyan-400 font-mono font-black">{detectiveScore}/{detectiveTarget}</span>
                </span>
              </div>
            </>
          )}
        </div>

        {/* Центральный индикатор глобальной фазы матча */}
        <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-zinc-900/50 backdrop-blur-md shadow-inner">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-xs 2xl:text-sm font-mono uppercase tracking-widest text-zinc-300 font-bold">
            {getGameModeTitle(gameState?.mode || 'MANIAC_VS_OPERATIVE', 'ru')}
          </span>
        </div>

        {/* Правый блок: Эфир и кнопки пульта управления ТВ */}
        <div className="flex items-center gap-3">
          <span className="text-xs 2xl:text-sm font-mono uppercase tracking-widest text-zinc-300 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/50 border border-white/10 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            ТВ ЭФИР • 5×5
          </span>

          {(onRestart || onExit) && (
            <div className="flex items-center gap-2 pl-3 border-l border-zinc-800">
              {onRestart && (
                <button
                  onClick={onRestart}
                  data-testid="tv-restart-btn"
                  className={`px-3.5 py-1.5 rounded-xl border font-mono text-xs sm:text-sm 2xl:text-base uppercase tracking-wider transition cursor-pointer ${
                    focusedControl === 'RESTART'
                      ? 'border-white/90 ring-2 ring-white/90 bg-zinc-800 text-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                      : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  [Сброс]
                </button>
              )}
              {onExit && (
                <button
                  onClick={onExit}
                  data-testid="tv-exit-btn"
                  className={`px-3.5 py-1.5 rounded-xl border font-mono text-xs sm:text-sm 2xl:text-base uppercase tracking-wider transition cursor-pointer ${
                    focusedControl === 'EXIT'
                      ? 'border-red-500/90 ring-2 ring-red-500/90 bg-red-950/80 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                      : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-red-400'
                  }`}
                >
                  [Выход]
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Основная рабочая зона экрана ТВ: строго 2 зоны (~68% Игровое поле | ~32% Инфо-панель) */}
      <div className="flex-1 flex gap-4 lg:gap-6 min-h-0 overflow-hidden">
        {/* ЛЕВАЯ ЗОНА (~68%): Primary Stage (Поле 5×5 с сохранением aspect-square) */}
        <div className="w-[66%] lg:w-[68%] h-full flex items-center justify-center min-w-0">
          <div className="relative w-full h-full max-w-[min(100%,calc(100vh-120px))] aspect-square p-2.5 sm:p-3 2xl:p-4 rounded-3xl bg-zinc-950/70 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_80px_rgba(0,0,0,0.9)] backdrop-blur-xl flex items-center justify-center">
            <div
              className="grid gap-2 sm:gap-2.5 2xl:gap-3 w-full h-full"
              style={{
                gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`,
              }}
            >
              {flatCards.map((char, index) => {
                const row = Math.floor(index / boardSize);
                const col = index % boardSize;
                const isLineActive = isLineSelected(row, col);
                const inRadarArea = isRadarCell(row, col);
                const inRadarCenter = isRadarCenter(row, col);

                return (
                  <motion.div
                    key={char.id || `cell_${index}`}
                    layout="position"
                    transition={{ type: 'spring', damping: 26, stiffness: 220, mass: 0.8 }}
                    className={`relative w-full h-full rounded-xl sm:rounded-2xl transition-all duration-300 overflow-hidden bg-zinc-950/60 backdrop-blur-md border ${
                      isLineActive
                        ? 'border-white/90 ring-2 ring-white/60 shadow-[0_0_25px_rgba(255,255,255,0.45)] bg-white/5 scale-[1.01] z-20'
                        : inRadarCenter
                          ? 'border-red-500/90 ring-2 ring-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.5)] bg-red-950/30 z-10'
                          : inRadarArea
                            ? 'border-blue-500/80 ring-1 ring-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.35)] bg-blue-950/20 z-0'
                            : 'border-white/10 hover:border-zinc-500/50 shadow-[0_4px_16px_rgba(0,0,0,0.6)]'
                    } ${!char.isAlive ? 'grayscale opacity-35' : ''}`}
                  >
                    {/* Тактический номер ячейки #01–#25 */}
                    <span className="absolute top-1 left-1.5 z-20 font-mono text-xs sm:text-sm 2xl:text-base font-black text-zinc-300 bg-black/90 px-2 py-0.5 rounded border border-zinc-800/80 pointer-events-none shadow">
                      #{String(index + 1).padStart(2, '0')}
                    </span>

                    {/* Карточка персонажа */}
                    <CharacterCard
                      mode={gameState?.mode || 'MANIAC_VS_OPERATIVE'}
                      character={char}
                      isSelected={isLineActive}
                      isUniformedOfficer={Boolean(gameState?.uniformedOfficers?.includes(char.id))}
                      isTargetVictim={Boolean(gameState?.mode === 'MANIAC_VS_OPERATIVE' && gameState?.victimList?.[0] === char.id)}
                      isRadarCenter={inRadarCenter}
                      isPVP={true}
                      onClick={() => {}}
                    />

                    {/* Индикатор направления сдвига на крайних карточках выбранной линии */}
                    <AnimatePresence>
                      {isLineActive && selectedLineDir && (
                        ((selectedLineType === 'ROW' && ((selectedLineDir === 'FORWARD' && col === boardSize - 1) || (selectedLineDir === 'BACKWARD' && col === 0))) ||
                         (selectedLineType === 'COL' && ((selectedLineDir === 'FORWARD' && row === boardSize - 1) || (selectedLineDir === 'BACKWARD' && row === 0)))) && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-xs rounded-xl sm:rounded-2xl"
                          >
                            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.9)] animate-pulse">
                              {selectedLineType === 'ROW'
                                ? (selectedLineDir === 'FORWARD' ? <Icons.ArrowRight /> : <Icons.ArrowLeft />)
                                : (selectedLineDir === 'FORWARD' ? <Icons.ArrowDown /> : <Icons.ArrowUp />)}
                            </span>
                          </motion.div>
                        )
                      )}
                    </AnimatePresence>

                    {/* Состояние ликвидации: затемнение и красный глитч-маркер */}
                    <AnimatePresence>
                      {!char.isAlive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/50 backdrop-blur-xs"
                        >
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-red-500/60 bg-red-950/80 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-wider text-red-200">
                              ВЫБЫЛ
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ПРАВАЯ ЗОНА (~32%): Информационная панель (Ровно 3 модульных стеклянных виджета) */}
        <div className="w-[34%] lg:w-[32%] h-full flex flex-col gap-3 sm:gap-4 min-w-0 justify-between">
          {/* ВИДЖЕТ 1 (ВЕРХ): Статус матча и Счёт */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between font-mono text-xs 2xl:text-sm uppercase tracking-widest text-zinc-400 font-bold">
              <span className="flex items-center gap-2">
                <Icons.Target />
                СТАТУС МАТЧА
              </span>
              <span className="text-xs 2xl:text-sm font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                АКТИВЕН
              </span>
            </div>

            {/* Линейный индикатор расследования */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs 2xl:text-sm font-mono text-zinc-400">
                <span>ПРОГРЕСС РАССЛЕДОВАНИЯ</span>
                <span className="text-zinc-200 font-bold">{investigationProgress}%</span>
              </div>
              <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-cyan-400 transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                  style={{ width: `${Math.max(5, investigationProgress)}%` }}
                />
              </div>
            </div>

            {/* Счётчики очков сторон */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/10 backdrop-blur-md flex flex-col gap-1 shadow-inner">
                <div className="flex items-center gap-1.5 text-xs 2xl:text-sm text-zinc-300 font-bold truncate">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <span className="truncate">{killerRoleName}</span>
                </div>
                <div className="text-lg 2xl:text-xl font-mono font-black text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                  {killerScore} <span className="text-xs 2xl:text-sm text-zinc-500 font-normal">/ {killerTarget}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/10 backdrop-blur-md flex flex-col gap-1 shadow-inner">
                <div className="flex items-center gap-1.5 text-xs 2xl:text-sm text-zinc-300 font-bold truncate">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  <span className="truncate">{detectiveRoleName}</span>
                </div>
                <div className="text-lg 2xl:text-xl font-mono font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                  {detectiveScore} <span className="text-xs 2xl:text-sm text-zinc-500 font-normal">/ {detectiveTarget}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ВИДЖЕТ 2 (ЦЕНТР): Активный ход и Выбранная линия */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col gap-3.5 shrink-0">
            <div className="flex items-center gap-2 font-mono text-xs 2xl:text-sm uppercase tracking-widest text-zinc-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              ТЕКУЩИЙ ХОД
            </div>

            {/* Карточка активного хода по макету ТВ3 */}
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-zinc-900/50 border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md">
              <div className="w-12 h-12 2xl:w-14 2xl:h-14 rounded-xl border border-white/20 bg-black/80 flex items-center justify-center font-mono text-xl 2xl:text-2xl font-black text-white shrink-0 shadow-inner">
                {activeTurnName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs 2xl:text-sm font-mono uppercase tracking-widest text-zinc-400 font-bold">
                  АКТИВНЫЙ ИГРОК
                </div>
                <div className="text-lg sm:text-xl 2xl:text-2xl font-black tracking-wider uppercase truncate text-zinc-100">
                  ХОД: {activeTurnName.toUpperCase()}
                </div>
                <div className="text-xs 2xl:text-sm text-zinc-400 font-medium truncate">
                  Управление с мобильного контроллера
                </div>
              </div>
            </div>

            {/* Таймер хода с прогресс-баром */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs 2xl:text-sm font-mono text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Icons.Clock />
                  ТАЙМЕР ХОДА
                </span>
                <span className="text-zinc-500 font-mono">БЕЗ ЛИМИТА (DEV)</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-white/70 w-full shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
              </div>
            </div>

            {/* Блок «Выбранная линия» (предпросмотр тактического сдвига) */}
            {selectedLine ? (
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/20 shadow-[0_0_25px_rgba(255,255,255,0.06)] space-y-2 backdrop-blur-md">
                <div className="text-xs 2xl:text-sm font-mono uppercase tracking-widest text-white flex items-center gap-2 font-bold">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  ВЫБРАННАЯ ЛИНИЯ
                </div>
                <div className="text-sm md:text-base 2xl:text-lg font-black text-white tracking-wide flex items-center justify-between">
                  <span>{selectedLineType === 'ROW' ? `РЯД #${selectedLineIdx}` : `СТОЛБЕЦ #${selectedLineIdx}`}</span>
                  {selectedLineDir && (
                    <span className="text-xs md:text-sm 2xl:text-base font-mono uppercase text-white font-black px-2.5 py-0.5 rounded-lg bg-zinc-800/90 border border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.25)]">
                      {selectedLineType === 'ROW'
                        ? (selectedLineDir === 'FORWARD' ? 'ВПРАВО →' : '← ВЛЕВО')
                        : (selectedLineDir === 'FORWARD' ? 'ВНИЗ ↓' : '↑ ВВЕРХ')}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-zinc-900/30 border border-white/5 text-xs 2xl:text-sm font-mono text-zinc-500 uppercase tracking-wider text-center">
                Сдвиг линии не выбран
              </div>
            )}
          </div>

          {/* ВИДЖЕТ 3 (НИЗ): Публичный бортовой журнал (Logs) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between text-xs 2xl:text-sm font-mono uppercase tracking-widest text-zinc-400 mb-3 font-bold shrink-0">
              <span className="flex items-center gap-2">
                <Icons.Terminal />
                ПОСЛЕДНИЕ СОБЫТИЯ
              </span>
              <span className="text-xs 2xl:text-sm font-mono uppercase tracking-wider text-zinc-500">БОРТОВОЙ ЖУРНАЛ</span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto min-h-0 pr-1 text-xs md:text-sm 2xl:text-base font-mono">
              {gameState?.log && gameState.log.length > 0 ? (
                gameState.log.slice(-4).map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-zinc-900/40 border border-white/5 text-zinc-300 flex items-start gap-2 shadow-xs backdrop-blur-xs"
                  >
                    <span className="text-cyan-400 shrink-0 font-bold">›</span>
                    <span className="truncate flex-1">{entry}</span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 italic text-center my-auto">
                  Ожидание тактических действий...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
