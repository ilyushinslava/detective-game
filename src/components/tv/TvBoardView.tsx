import React from 'react';
import { motion } from 'framer-motion';
import { CharacterCard } from '../CharacterCard';
import { GameOverModal } from '../GameOverModal';
import type { GameState, LastShift } from '../../types/game';
import { SPY_COLORS } from '../../types/game';

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

  const activeNeonColor = isSecretService
    ? (SPY_COLORS[activeSpyIndex % SPY_COLORS.length]?.text || 'text-red-400')
    : isKillerTurn ? 'text-red-400' : 'text-blue-400';

  const activeBgGlow = isKillerTurn ? 'bg-red-950/40 border-red-500/40' : 'bg-blue-950/40 border-blue-500/40';

  const tvAvailableActions = React.useMemo(() => {
    const list: string[] = [];
    if (gameState?.mode !== 'LINE_UP') {
      list.push('Переместить ряд или столбец');
    }
    if (isSecretService) {
      list.push('Разоблачение резидента', 'Опрос очевидцев в секторе');
    } else if (gameState?.mode === 'MANIAC_VS_OPERATIVE') {
      if (isKillerTurn) {
        list.push('Ликвидация цели из списка');
      } else {
        list.push('Задержание маньяка', 'Опрос свидетелей (алиби)');
      }
    } else if (gameState?.mode === 'THIEF_HUNT') {
      if (isKillerTurn) {
        list.push('Кража сокровищ', 'Смена маски (конспирация)');
      } else {
        list.push('Задержание грабителя');
      }
    } else if (gameState?.mode === 'LINE_UP') {
      list.push('Вопрос подозреваемому', 'Предъявление обвинения');
    }
    return list;
  }, [gameState?.mode, isSecretService, isKillerTurn]);

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

  if (gameState?.winner) {
    const winningSpy = isSecretService
      ? (spies.find((s) => s.id === gameState.winner) ||
         (gameState.winner === 'KILLER' ? spies[0] : gameState.winner === 'DETECTIVE' ? spies[1] : null))
      : null;
    const isKillerWinner = gameState.winner === 'KILLER' || Boolean(winningSpy && spies[0]?.id === winningSpy.id);
    const finalKillerChar = flatCards.find((c) => c.id === (winningSpy?.secretId || gameState.killerSecretId));
    const finalDetectiveChar = flatCards.find((c) => c.id === gameState.detectiveSecretId);

    return (
      <div className="relative h-screen w-screen bg-[#06070a] overflow-hidden select-none">
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
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-white/10 bg-zinc-950/80 shadow-2xl backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-300">
            Ожидание выбора реванша на контроллерах
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#06070a] text-zinc-100 select-none overflow-hidden p-5 sm:p-6 gap-4 font-sans">
      {/* Верхняя статусная планка (Шапка ТВ) */}
      <div className="flex items-center justify-between px-6 py-3 rounded-2xl bg-zinc-950/70 border border-white/10 backdrop-blur-xl shadow-lg shrink-0">
        {/* Счета участников */}
        <div className="flex items-center gap-6">
          {isSecretService && spies.length > 0 ? (
            spies.map((spy, idx) => {
              const color = SPY_COLORS[idx % SPY_COLORS.length];
              return (
                <div key={spy.id || idx} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${color.bg} border ${color.border}`} />
                  <span className="text-xs font-bold tracking-wide text-zinc-300">
                    {spy.name}: <span className={`${color.text} font-mono font-black`}>{spy.trophies}/{killerTarget}</span>
                  </span>
                </div>
              );
            })
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                <span className="text-sm font-bold tracking-wider text-zinc-300">
                  {killerRoleName}: <span className="text-red-400 font-mono font-black">{killerScore}/{killerTarget}</span>
                </span>
              </div>
              <div className="h-4 w-px bg-zinc-800" />
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                <span className="text-sm font-bold tracking-wider text-zinc-300">
                  {detectiveRoleName}: <span className="text-blue-400 font-mono font-black">{detectiveScore}/{detectiveTarget}</span>
                </span>
              </div>
            </>
          )}
        </div>

        {/* Центральная плашка активного хода */}
        <div className={`px-5 py-1.5 rounded-xl border flex items-center gap-2.5 shadow-md ${activeBgGlow}`}>
          <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${isKillerTurn ? 'bg-red-400' : 'bg-blue-400'}`} />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-semibold">Ход:</span>
          <span className={`text-sm font-black uppercase tracking-wider ${activeNeonColor}`}>
            {activeTurnName}
          </span>
        </div>

        {/* Правый блок статуса и кнопок пульта */}
        <div className="flex items-center gap-3">
          {/* Таймер отключен для разработки (по запросу) */}
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-white/5">
            ТАЙМЕР: БЕЗ ЛИМИТА (DEV)
          </span>

          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            ТВ ЭФИР • 5×5
          </span>

          {(onRestart || onExit) && (
            <div className="flex items-center gap-2 pl-3 border-l border-zinc-800">
              {onRestart && (
                <button
                  onClick={onRestart}
                  data-testid="tv-restart-btn"
                  className={`px-3 py-1 rounded-xl border font-mono text-[10px] uppercase tracking-wider transition cursor-pointer ${
                    focusedControl === 'RESTART'
                      ? 'border-white/90 ring-2 ring-white/90 bg-zinc-800 text-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                      : 'border-white/10 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  [Сброс]
                </button>
              )}
              {onExit && (
                <button
                  onClick={onExit}
                  data-testid="tv-exit-btn"
                  className={`px-3 py-1 rounded-xl border font-mono text-[10px] uppercase tracking-wider transition cursor-pointer ${
                    focusedControl === 'EXIT'
                      ? 'border-red-500/90 ring-2 ring-red-500/90 bg-red-950/80 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                      : 'border-white/10 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-red-400'
                  }`}
                >
                  [Выход]
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Основная рабочая зона экрана ТВ: 3 колонки (Левая колонка | Доска 5x5 | Правая колонка) */}
      <div className="flex-1 flex gap-5 min-h-0 overflow-hidden">
        {/* ЛЕВАЯ КОЛОНКА: Статус игрока и доступные действия */}
        <div className="w-72 lg:w-80 flex flex-col justify-between gap-4 shrink-0">
          {/* Карточка активного хода */}
          <div className={`p-5 rounded-3xl backdrop-blur-xl border shadow-xl ${activeBgGlow}`}>
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
              АКТИВНАЯ СТОРОНА
            </div>
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl border bg-black/60 flex items-center justify-center font-mono text-xl font-black shadow-inner shrink-0 ${activeNeonColor} border-white/10`}>
                {activeTurnName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-xl font-black tracking-wider uppercase truncate ${activeNeonColor}`}>
                  {activeTurnName}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  Управление с мобильного контроллера
                </div>
              </div>
            </div>
          </div>

          {/* Блок «ДОСТУПНЫЕ ДЕЙСТВИЯ» по макету */}
          <div className="p-5 rounded-3xl bg-zinc-950/70 border border-white/10 backdrop-blur-xl shadow-xl flex-1 flex flex-col">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              ДОСТУПНЫЕ ДЕЙСТВИЯ
            </div>
            <div className="space-y-2 flex-1">
              {tvAvailableActions.map((act, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-900/60 border border-white/5 text-xs text-zinc-200 font-medium tracking-wide shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" />
                  <span className="truncate">{act}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-white/5 text-[10px] font-mono text-zinc-500 text-center">
              Выбор действий выполняется на телефоне
            </div>
          </div>
        </div>

        {/* ЦЕНТРАЛЬНАЯ КОЛОНКА: Сетка игрового поля 5x5 */}
        <div className="flex-1 flex items-center justify-center min-w-0 h-full">
          <div className="relative w-full max-w-[min(820px,calc(100vh-140px))] aspect-square p-3 rounded-3xl bg-zinc-950/50 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-md flex items-center justify-center">
            <div
              className="grid gap-2.5 w-full h-full"
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
                    layout
                    transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                    className={`relative w-full h-full rounded-2xl transition-all duration-300 overflow-hidden bg-zinc-900/60 backdrop-blur-md border ${
                      isLineActive
                        ? isKillerTurn
                          ? 'border-red-400 ring-2 ring-red-400/80 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-[1.02] z-20'
                          : 'border-blue-400 ring-2 ring-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-[1.02] z-20'
                        : inRadarCenter
                          ? 'border-red-500 ring-2 ring-red-500 shadow-[0_0_18px_rgba(239,68,68,0.7)] z-10'
                          : inRadarArea
                            ? 'border-blue-400/60 ring-1 ring-blue-400/40 bg-blue-950/20 z-0'
                            : 'border-white/10 hover:border-white/20'
                    } ${!char.isAlive ? 'grayscale opacity-40' : ''}`}
                  >
                    {/* Тактический номер ячейки */}
                    <span className="absolute top-1.5 left-2 z-20 font-mono text-[9px] font-bold text-zinc-400 bg-black/70 px-1.5 py-0.5 rounded border border-white/5 pointer-events-none">
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
                    {isLineActive && selectedLineDir && (
                      ((selectedLineType === 'ROW' && ((selectedLineDir === 'FORWARD' && col === boardSize - 1) || (selectedLineDir === 'BACKWARD' && col === 0))) ||
                       (selectedLineType === 'COL' && ((selectedLineDir === 'FORWARD' && row === boardSize - 1) || (selectedLineDir === 'BACKWARD' && row === 0)))) && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-black/50 backdrop-blur-xs rounded-2xl">
                          <span className="text-red-400 animate-pulse drop-shadow-[0_0_12px_rgba(239,68,68,1)]">
                            {selectedLineType === 'ROW'
                              ? (selectedLineDir === 'FORWARD' ? <Icons.ArrowRight /> : <Icons.ArrowLeft />)
                              : (selectedLineDir === 'FORWARD' ? <Icons.ArrowDown /> : <Icons.ArrowUp />)}
                          </span>
                        </div>
                      )
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Выбранная линия и Тактический журнал */}
        <div className="w-72 lg:w-80 flex flex-col justify-between gap-4 shrink-0">
          {/* Блок: Выбранная линия (предпросмотр тактического маневра) */}
          {selectedLine ? (
            <div className="p-5 rounded-3xl bg-zinc-950/70 border border-white/10 backdrop-blur-xl shadow-lg space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                ВЫБРАННАЯ ЛИНИЯ
              </div>
              <div className="text-base font-black text-white tracking-wide flex items-center justify-between">
                <span>{selectedLineType === 'ROW' ? `РЯД #${selectedLineIdx}` : `СТОЛБЕЦ #${selectedLineIdx}`}</span>
                {selectedLineDir && (
                  <span className="text-xs font-mono uppercase text-blue-400 font-bold px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/40">
                    {selectedLineType === 'ROW'
                      ? (selectedLineDir === 'FORWARD' ? 'ВПРАВО →' : '← ВЛЕВО')
                      : (selectedLineDir === 'FORWARD' ? 'ВНИЗ ↓' : '↑ ВВЕРХ')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-zinc-950/40 border border-white/5 backdrop-blur-md text-[11px] font-mono text-zinc-500 uppercase tracking-wider text-center">
              Сдвиг линии не выбран
            </div>
          )}

          {/* Блок: Тактический журнал событий */}
          <div className="p-5 rounded-3xl bg-zinc-950/70 border border-white/10 backdrop-blur-xl shadow-xl flex-1 flex flex-col min-h-[180px]">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-3">
              <Icons.Terminal />
              ПОСЛЕДНИЕ СОБЫТИЯ
            </div>
            <div className="space-y-2 text-xs font-mono text-zinc-300 flex-1 overflow-hidden">
              {gameState?.log && gameState.log.length > 0 ? (
                gameState.log.slice(-5).map((entry, idx) => (
                  <div key={idx} className="truncate text-zinc-300 flex items-start gap-2">
                    <span className="text-zinc-600 shrink-0">›</span>
                    <span className="truncate">{entry}</span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 italic text-center my-auto">
                  Ожидание первых тактических действий...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
