import React from 'react';
import { motion } from 'framer-motion';
import { CharacterCard } from '../CharacterCard';
import { GameOverModal } from '../GameOverModal';
import type { GameState, LastShift } from '../../types/game';
import { SPY_COLORS } from '../../types/game';

interface TvBoardViewProps {
  gameState: GameState;
  selectedLine?: LastShift | null;
  onExit?: () => void;
  onRestart?: () => void;
}

const TvBoardViewImpl: React.FC<TvBoardViewProps> = ({
  gameState,
  selectedLine = null,
  onExit,
  onRestart,
}) => {
  const isSecretService = gameState?.mode === 'SECRET_SERVICE';
  const spies = gameState?.spies || [];
  const activeSpyIndex = gameState?.activeSpyIndex ?? 0;
  const activeSpy = spies[activeSpyIndex];
  const currentTurn = gameState?.currentTurn || 'KILLER';
  const isKillerTurn = currentTurn === 'KILLER';

  let killerScore = 0;
  let killerTarget = 14;
  let detectiveScore = 0;
  let detectiveTarget = 1;

  if (isSecretService) {
    killerTarget = gameState?.spyTargetTrophies ?? 3;
    detectiveTarget = killerTarget;
  } else if (gameState?.mode === 'LINE_UP') {
    killerScore = (gameState as any)?.duelPenalties?.KILLER ?? (gameState as any)?.duelMistakesKiller ?? 0;
    detectiveScore = (gameState as any)?.duelPenalties?.DETECTIVE ?? (gameState as any)?.duelMistakesDetective ?? 0;
    killerTarget = 3;
    detectiveTarget = 3;
  } else if (gameState?.mode === 'THIEF_HUNT') {
    killerScore = gameState?.trophiesKiller ?? 0;
    killerTarget = 10;
    detectiveScore = (gameState?.winner === 'DETECTIVE' || (gameState as any)?.arrestSuccess) ? 1 : 0;
    detectiveTarget = 1;
  } else if (gameState?.mode === 'MANIAC_VS_OPERATIVE') {
    killerScore = gameState?.killCount ?? 0;
    killerTarget = 4;
    detectiveScore = (gameState?.winner === 'DETECTIVE' || (gameState as any)?.arrestSuccess) ? 1 : 0;
    detectiveTarget = 1;
  } else {
    killerScore = gameState?.killCount ?? 0;
    killerTarget = 14;
    detectiveScore = (gameState?.winner === 'DETECTIVE' || (gameState as any)?.arrestSuccess) ? 1 : 0;
    detectiveTarget = 1;
  }

  const targetScore = killerTarget;

  const activeTurnName = React.useMemo(() => {
    if (isSecretService) {
      return activeSpy?.name || 'Агент';
    }
    if (gameState?.mode === 'THIEF_HUNT') {
      return isKillerTurn ? 'Грабитель' : 'Полиция';
    }
    if (gameState?.mode === 'MANIAC_VS_OPERATIVE') {
      return isKillerTurn ? 'Маньяк' : 'Оперативник';
    }
    return isKillerTurn ? 'Бандит' : 'Инспектор';
  }, [isSecretService, activeSpy, gameState?.mode, isKillerTurn]);

  const killerTeamName = gameState?.mode === 'THIEF_HUNT' ? 'Грабитель' : gameState?.mode === 'MANIAC_VS_OPERATIVE' ? 'Маньяк' : 'Бандит';
  const detectiveTeamName = gameState?.mode === 'THIEF_HUNT' ? 'Полиция' : gameState?.mode === 'MANIAC_VS_OPERATIVE' ? 'Оперативник' : 'Инспектор';

  const activeTurnColor = isSecretService
    ? (SPY_COLORS[activeSpyIndex % SPY_COLORS.length]?.text || 'text-red-400')
    : (isKillerTurn ? 'text-red-400' : 'text-blue-400');

  const modeActions = React.useMemo(() => {
    if (isSecretService) {
      return [
        { label: 'Сдвиг линии (Anti-Undo)' },
        { label: 'Опрос свидетелей (Радар 3x3)' },
        { label: 'Разоблачение резидента' },
      ];
    }
    if (gameState?.mode === 'LINE_UP') {
      return [
        { label: 'Вопрос по признакам досье' },
        { label: 'Официальное обвинение' },
        { label: 'Метод дедукции' },
      ];
    }
    if (gameState?.mode === 'THIEF_HUNT') {
      return isKillerTurn
        ? [
            { label: 'Сдвиг линии (Anti-Undo)' },
            { label: 'Кража у соседа' },
            { label: 'Смена маски (Конспирация)' },
          ]
        : [
            { label: 'Сдвиг линии (Anti-Undo)' },
            { label: 'Задержание грабителя' },
            { label: 'Вызов патруля' },
          ];
    }
    if (gameState?.mode === 'MANIAC_VS_OPERATIVE') {
      return isKillerTurn
        ? [
            { label: 'Сдвиг линии (Anti-Undo)' },
            { label: 'Ликвидация цели из списка' },
            { label: 'Побег маньяка' },
          ]
        : [
            { label: 'Сдвиг линии (Anti-Undo)' },
            { label: 'Задержание подозреваемого' },
            { label: 'Смена личности по уликам' },
          ];
    }
    return isKillerTurn
      ? [
          { label: 'Сдвиг линии (Anti-Undo)' },
          { label: 'Ликвидация соседа' },
          { label: 'Конспирация (Смена роли)' },
        ]
      : [
          { label: 'Сдвиг линии (Anti-Undo)' },
          { label: 'Задержание подозреваемого' },
          { label: 'Проверка алиби из досье' },
        ];
  }, [isSecretService, gameState?.mode, isKillerTurn]);

  const boardSize = gameState?.board?.length || 5;
  const flatCards = (gameState?.board || []).flat();

  const radarTargetId = gameState?.interrogationRadar?.targetId || (gameState as any)?.witnessRadar?.targetId;
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

  const isLineSelected = (row: number, col: number) => {
    if (!selectedLine) return false;
    if (selectedLine.type === 'ROW' && selectedLine.index === row) return true;
    if (selectedLine.type === 'COL' && selectedLine.index === col) return true;
    return false;
  };

  const selectedLineType = selectedLine?.type || null;
  const selectedLineIdx = selectedLine ? selectedLine.index + 1 : 0;
  const selectedLineDir = selectedLine?.direction || null;

  if (gameState?.winner) {
    const winningSpy = isSecretService
      ? (spies.find((s) => s.id === gameState.winner) ||
         (gameState.winner === 'KILLER' ? spies[0] : gameState.winner === 'DETECTIVE' ? spies[1] : null) ||
         spies.reduce((max, s) => (s.trophies > (max?.trophies ?? -1) ? s : max), spies[0]))
      : null;

    const isKillerWinner = gameState.winner === 'KILLER' || Boolean(winningSpy && spies[0]?.id === winningSpy.id);
    const winRoleName = winningSpy
      ? winningSpy.name
      : (gameState.mode === 'LINE_UP'
          ? (isKillerWinner ? 'Подозреваемый' : 'Следователь')
          : (isKillerWinner ? killerTeamName : detectiveTeamName));

    const finalKillerId = isSecretService ? (winningSpy?.secretId || spies[0]?.secretId) : gameState.killerSecretId;
    const finalDetectiveId = isSecretService ? (spies.find((s) => s.id !== winningSpy?.id)?.secretId || spies[1]?.secretId) : gameState.detectiveSecretId;
    const finalKillerChar = flatCards.find((c) => c.id === finalKillerId);
    const finalDetectiveChar = flatCards.find((c) => c.id === finalDetectiveId);

          return (
        <div className="relative h-screen w-screen bg-[#06070a] overflow-hidden">
          <GameOverModal
            winner={isKillerWinner ? 'KILLER' : 'DETECTIVE'}
            mode={gameState.mode}
            killer={finalKillerChar}
            detective={finalDetectiveChar}
            elapsedTime={gameState.timer?.elapsedTime || '00:00'}
            isMultiplayer={true}
            onRestart={() => {}}
            onExitToMenu={onExit}
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-zinc-800 bg-zinc-950/90 shadow-2xl backdrop-blur-md">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-300 animate-pulse">
              Ожидание решения о реванше на контроллерах...
            </span>
          </div>
        </div>
      );
  }

  return (
    <div className="flex h-screen w-screen bg-[#06070a] text-zinc-100 select-none overflow-hidden p-6 gap-6 font-sans">
      {/* Левая часть: Игровое поле 5x5 */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md">
          <div className="flex items-center gap-6">
            {isSecretService && spies.length > 0 ? (
              spies.map((spy, idx) => {
                const color = SPY_COLORS[idx % SPY_COLORS.length];
                return (
                  <div key={spy.id || idx} className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${color.bg} border ${color.border}`} />
                    <span className="text-sm font-bold tracking-wide text-zinc-300">
                      <span>{spy.name}</span>: <span className={`${color.text} font-black`}>{spy.trophies}/{targetScore}</span>
                    </span>
                  </div>
                );
              })
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <span className="text-sm font-bold tracking-wide text-zinc-300">
                    <span>{killerTeamName}</span>: <span className="text-red-400 font-black">{killerScore}/{killerTarget}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  <span className="text-sm font-bold tracking-wide text-zinc-300">
                    <span>{detectiveTeamName}</span>: <span className="text-blue-400 font-black">{detectiveScore}/{detectiveTarget}</span>
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-center">
            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider ${
              isKillerTurn ? 'bg-red-950/80 border-red-600 text-red-100 shadow-[0_0_12px_rgba(239,68,68,0.3)]' : 'bg-blue-950/80 border-blue-600 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
            }`}>
              <span className={`h-2 w-2 rounded-full animate-pulse ${isKillerTurn ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]'}`} />
              ХОД: <strong className={activeTurnColor}>{activeTurnName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-zinc-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>ЭФИР ТРАНСЛЯЦИИ</span>
            </div>
            {(onRestart || onExit) && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                {onRestart && (
                  <button
                    onClick={onRestart}
                    className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-300 transition cursor-pointer"
                  >
                    [ПЕРЕЗАПУСК]
                  </button>
                )}
                {onExit && (
                  <button
                    onClick={onExit}
                    className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-400 hover:text-red-400 transition cursor-pointer"
                  >
                    [В МЕНЮ]
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="relative my-auto mx-auto w-full max-w-[min(800px,calc(100vh-140px))] aspect-square p-2 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 shadow-2xl flex items-center justify-center">
          <div className="grid gap-2 w-full h-full" style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))` }}>
            {flatCards.map((char, index) => {
              const row = Math.floor(index / boardSize);
              const col = index % boardSize;
              const isLineActive = isLineSelected(row, col);
              const isRadarArea = isRadarCell(row, col);

                              return (
                  <motion.div
                    key={char.id || `cell_${index}`}
                    layout
                    transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                    className={`relative w-full h-full rounded-xl transition-shadow duration-200 ${
                      isLineActive ? 'ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-[1.02] z-10' : ''
                    } ${isRadarArea && !isLineActive ? (isKillerTurn ? 'ring-2 ring-red-500/70 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.3)]' : 'ring-2 ring-blue-500/70 bg-blue-950/20 shadow-[0_0_12px_rgba(59,130,246,0.3)]') : ''}`}
                  >
                  <CharacterCard
                    mode={gameState?.mode || 'SECRET_SERVICE'}
                    character={char}
                    isSelected={isLineActive}
                    isUniformedOfficer={Boolean(gameState?.uniformedOfficers?.includes(char.id))}
                    isTargetVictim={Boolean(gameState?.mode === 'MANIAC_VS_OPERATIVE' && gameState?.victimList?.[0] === char.id)}
                    isRadarCenter={Boolean(gameState?.interrogationRadar?.targetId === char.id)}
                    isPVP={true}
                    onClick={() => {}}
                  />
                  {isLineActive && selectedLineDir && (
                    ((selectedLineType === 'ROW' && ((selectedLineDir === 'FORWARD' && col === boardSize - 1) || (selectedLineDir === 'BACKWARD' && col === 0))) ||
                     (selectedLineType === 'COL' && ((selectedLineDir === 'FORWARD' && row === boardSize - 1) || (selectedLineDir === 'BACKWARD' && row === 0)))) && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-red-950/40 rounded-xl">
                        <span className="text-3xl font-black text-red-400 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]">
                          {selectedLineType === 'ROW'
                            ? (selectedLineDir === 'FORWARD' ? '▶' : '◀')
                            : (selectedLineDir === 'FORWARD' ? '▼' : '▲')}
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

      {/* Правая инфопанель */}
      <div className="w-96 flex flex-col justify-between gap-4">
        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 shadow-lg">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">ТЕКУЩИЙ ХОД</div>
          <div className="flex items-center gap-3.5">
            <div className={`w-14 h-14 rounded-full border-2 border-zinc-700/80 bg-zinc-950 flex items-center justify-center text-2xl font-black font-mono shadow-lg shrink-0 ${activeTurnColor}`}>
              {activeTurnName ? activeTurnName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-xl font-black tracking-wider uppercase ${activeTurnColor}`}>
                {activeTurnName}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Следите за действиями на мобильном контроллере
              </div>
            </div>
          </div>
        </div>

        {selectedLine && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 shadow-inner space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-red-400">
              Выбранная линия
            </div>
            <div className="text-sm font-black text-zinc-200">
              <span>{selectedLineType === 'ROW' ? `Ряд ${selectedLineIdx}` : `Столбец ${selectedLineIdx}`}</span>
            </div>
            {selectedLineDir && (
              <div className="text-xs font-bold text-red-400">
                {selectedLineType === 'ROW'
                  ? (selectedLineDir === 'FORWARD' ? '▶ Вправо' : '◀ Влево')
                  : (selectedLineDir === 'FORWARD' ? '▼ Вниз' : '▲ Вверх')}
              </div>
            )}
          </div>
        )}

        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 shadow-lg">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">ДЕЙСТВИЯ ХОДА</div>
          <div className="space-y-3">
            {modeActions.map((act, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0" />
                <span className="text-sm font-semibold text-zinc-300">{act.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 shadow-lg flex-1">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">ПОСЛЕДНИЕ СОБЫТИЯ</div>
          <div className="space-y-1 text-xs text-zinc-300 font-mono">
            {gameState?.log && gameState.log.length > 0 ? (
              gameState.log.slice(-3).map((entry, idx) => (
                <div key={idx} className="truncate text-zinc-300">
                  • {entry}
                </div>
              ))
            ) : (
              <div className="text-zinc-500 italic">Ожидание первых действий...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TvBoardView = TvBoardViewImpl;
