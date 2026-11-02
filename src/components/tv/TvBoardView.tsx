import React from 'react';
import { CharacterCard } from '../CharacterCard';
import type { GameState, ShiftPayload } from '../../types/game';

interface TvBoardViewProps {
  gameState: GameState;
  secondsLeft?: number;
  selectedLine?: ShiftPayload | null;
}

export const TvBoardView: React.FC<TvBoardViewProps> = ({
  gameState,
  secondsLeft = 60,
  selectedLine = null,
}) => {
  const killerScore = gameState?.killerScore ?? 0;
  const detectiveScore = gameState?.detectiveScore ?? 0;
  const targetScore = gameState?.targetTrophies ?? 4;
  const currentTurn = gameState?.currentTurn || 'KILLER';
  const isKillerTurn = currentTurn === 'KILLER';

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const flatCards = (gameState?.grid && gameState.grid.length > 0)
    ? gameState.grid
    : (gameState?.board ? gameState.board.flat() : []);

  const isLineSelected = (row: number, col: number) => {
    if (!selectedLine) return false;
    const lineType = (selectedLine as any).type || selectedLine.axis;
    if (lineType === 'ROW' && selectedLine.index === row) return true;
    if (lineType === 'COL' && selectedLine.index === col) return true;
    return false;
  };

  const selectedLineType = selectedLine ? ((selectedLine as any).type || selectedLine.axis) : null;
  const selectedLineIdx = selectedLine ? selectedLine.index + 1 : 0;
  const selectedLineDir = selectedLine ? selectedLine.direction : null;

  return (
    <div className="flex h-screen w-screen bg-[#06070a] text-zinc-100 select-none overflow-hidden p-6 gap-6 font-sans">
      {/* Левая часть: Игровое поле 5x5 */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-sm font-bold tracking-wide text-zinc-300">
                <span>Агент Фантом</span>: <span className="text-red-400 font-black">{killerScore}/{targetScore}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <span className="text-sm font-bold tracking-wide text-zinc-300">
                <span>Агент Призрак</span>: <span className="text-cyan-400 font-black">{detectiveScore}/{targetScore}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest text-zinc-400">
            <span>ХОД: <strong className={isKillerTurn ? 'text-red-400' : 'text-cyan-400'}>{isKillerTurn ? 'Агент Фантом' : 'Агент Призрак'}</strong></span>
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
                    mode={gameState?.gameMode || 'SKHVATKA'}
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
          <div className={`text-2xl font-black tracking-wider uppercase ${isKillerTurn ? 'text-red-500' : 'text-cyan-400'}`}>
            <span>{isKillerTurn ? 'Агент Фантом' : 'Агент Призрак'}</span>
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
                {selectedLineDir === 'LEFT' && '◀ Влево'}
                {selectedLineDir === 'RIGHT' && '▶ Вправо'}
                {selectedLineDir === 'UP' && '▲ Вверх'}
                {selectedLineDir === 'DOWN' && '▼ Вниз'}
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
            {gameState?.history && gameState.history.length > 0
              ? gameState.history[gameState.history.length - 1]
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
