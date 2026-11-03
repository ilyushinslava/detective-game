import React from 'react';
import { CharacterCard } from '../CharacterCard';
import type { GameState, LastShift } from '../../types/game';
import { SPY_COLORS } from '../../types/game';

interface TvBoardViewProps {
  gameState: GameState;
  secondsLeft?: number;
  selectedLine?: LastShift | null;
}

export const TvBoardView: React.FC<TvBoardViewProps> = ({
  gameState,
  secondsLeft = 60,
  selectedLine = null,
}) => {
  const isSecretService = gameState?.mode === 'SECRET_SERVICE';
  const spies = gameState?.spies || [];
  const activeSpyIndex = gameState?.activeSpyIndex ?? 0;
  const activeSpy = spies[activeSpyIndex];
  const targetScore = isSecretService
    ? (gameState?.spyTargetTrophies ?? 3)
    : (gameState?.mode === 'THIEF_HUNT' ? 10 : 14);

  const killerScore = gameState?.trophiesKiller ?? 0;
  const detectiveScore = gameState?.trophiesDetective ?? 0;
  const currentTurn = gameState?.currentTurn || 'KILLER';
  const isKillerTurn = currentTurn === 'KILLER';

  const activeTurnName = isSecretService
    ? (activeSpy?.name || 'Агент')
    : (isKillerTurn ? 'Бандит' : 'Инспектор');

  const activeTurnColor = isSecretService
    ? (SPY_COLORS[activeSpyIndex % SPY_COLORS.length]?.text || 'text-red-400')
    : (isKillerTurn ? 'text-red-400' : 'text-blue-400');

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const flatCards = (gameState?.board || []).flat();

  const isLineSelected = (row: number, col: number) => {
    if (!selectedLine) return false;
    if (selectedLine.type === 'ROW' && selectedLine.index === row) return true;
    if (selectedLine.type === 'COL' && selectedLine.index === col) return true;
    return false;
  };

  const selectedLineType = selectedLine?.type || null;
  const selectedLineIdx = selectedLine ? selectedLine.index + 1 : 0;
  const selectedLineDir = selectedLine?.direction || null;

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
                    <span>Бандит</span>: <span className="text-red-400 font-black">{killerScore}/{targetScore}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  <span className="text-sm font-bold tracking-wide text-zinc-300">
                    <span>Инспектор</span>: <span className="text-blue-400 font-black">{detectiveScore}/{targetScore}</span>
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest text-zinc-400">
            <span>ХОД: <strong className={activeTurnColor}>{activeTurnName}</strong></span>
          </div>
        </div>

        <div className="relative my-auto mx-auto w-full max-w-[800px] aspect-square p-2 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 shadow-2xl flex items-center justify-center">
          <div className="grid grid-cols-5 grid-rows-5 gap-2 w-full h-full">
            {flatCards.map((char, index) => {
              const row = Math.floor(index / 5);
              const col = index % 5;
              const isLineActive = isLineSelected(row, col);

              return (
                <div
                  key={char.id || index}
                  className={`relative w-full h-full rounded-xl transition-all duration-300 ${
                    isLineActive ? 'ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-[1.02] z-10' : ''
                  }`}
                >
                  <CharacterCard
                    mode={gameState?.mode || 'SECRET_SERVICE'}
                    character={char}
                    isSelected={isLineActive}
                    isPVP={true}
                    onClick={() => {}}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Правая инфопанель */}
      <div className="w-96 flex flex-col justify-between gap-4">
        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 shadow-lg">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">ТЕКУЩИЙ ХОД</div>
          <div className={`text-2xl font-black tracking-wider uppercase ${activeTurnColor}`}>
            <span>{activeTurnName}</span>
          </div>
          <div className="text-xs text-zinc-400 mt-1">Следите за действиями на мобильном контроллере</div>
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

        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 shadow-lg flex-1">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">ДЕЙСТВИЯ ХОДА</div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
              <span className="text-base">🎯</span>
              <span className="text-sm font-semibold text-zinc-300">Ликвидация / Задержание</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
              <span className="text-base">🔍</span>
              <span className="text-sm font-semibold text-zinc-300">Опрос свидетелей</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
              <span className="text-base">⇄</span>
              <span className="text-sm font-semibold text-zinc-300">Сдвиг линии (Anti-Undo)</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 shadow-lg">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">ПОСЛЕДНИЕ СОБЫТИЯ</div>
          <div className="text-xs text-zinc-400 italic font-mono">
            {gameState?.log && gameState.log.length > 0
              ? gameState.log[gameState.log.length - 1]
              : 'Ожидание первых действий...'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">ДО КОНЦА ХОДА</div>
            <div className="text-3xl font-black font-mono tracking-wider text-zinc-100">{formatTime(secondsLeft)}</div>
          </div>
          <div className="text-2xl opacity-60">⏱️</div>
        </div>
      </div>
    </div>
  );
};
