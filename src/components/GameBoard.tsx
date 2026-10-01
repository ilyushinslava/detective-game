import type { Character, LastShift } from '../types/game';
import { CharacterCard } from './CharacterCard';

interface GameBoardProps {
  board: Character[][];
  selectedCharacterId: string | null;
  killerAdjacentIds: string[];
  detectiveAdjacentIds: string[];
  showKillerHints: boolean;
  showDetectiveHints: boolean;
  lastShift: LastShift | null;
  blockedShift?: { type: 'ROW' | 'COL'; index: number } | null;
  onShift: (type: 'ROW' | 'COL', index: number, direction: 'FORWARD' | 'BACKWARD') => void;
  onSelectCharacter: (id: string) => void;
}

export const GameBoard = ({
  board,
  selectedCharacterId,
  killerAdjacentIds,
  detectiveAdjacentIds,
  showKillerHints,
  showDetectiveHints,
  blockedShift,
  onShift,
  onSelectCharacter,
}: GameBoardProps) => {
  return (
    <div className="w-full flex flex-col items-center">
      {/* Кнопки сдвига колонок ВВЕРХ */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full max-w-[480px] mb-1.5 pl-6 pr-6 sm:pl-8 sm:pr-8">
        {[0, 1, 2, 3, 4].map((colIdx) => {
          const isBlocked = blockedShift?.type === 'COL' && blockedShift.index === colIdx;
          return (
            <button
              key={`col-up-${colIdx}`}
              disabled={isBlocked}
              onClick={() => onShift('COL', colIdx, 'BACKWARD')}
              className={`h-6 sm:h-7 rounded-lg text-xs font-bold transition flex items-center justify-center border ${
                isBlocked
                  ? 'bg-blue-950/80 text-blue-300 border-blue-500 cursor-not-allowed shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                  : 'bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-800 cursor-pointer'
              }`}
              title={isBlocked ? 'Патруль полиции блокирует сдвиг' : 'Сдвиг вверх'}
            >
              {isBlocked ? '🚔' : '↑'}
            </button>
          );
        })}
      </div>

      {/* Поле 5x5 со стрелками рядов */}
      <div className="w-full max-w-[540px] flex flex-col gap-1.5 sm:gap-2">
        {board.map((row, rIdx) => {
          const isRowBlocked = blockedShift?.type === 'ROW' && blockedShift.index === rIdx;
          return (
            <div key={`row-${rIdx}`} className="flex items-center gap-1.5 sm:gap-2 w-full">
              {/* Сдвиг ряда влево */}
              <button
                disabled={isRowBlocked}
                onClick={() => onShift('ROW', rIdx, 'BACKWARD')}
                className={`w-5 sm:w-6 h-full min-h-[44px] rounded-lg text-xs font-bold transition flex items-center justify-center shrink-0 border ${
                  isRowBlocked
                    ? 'bg-blue-950/80 text-blue-300 border-blue-500 cursor-not-allowed shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                    : 'bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-800 cursor-pointer'
                }`}
                title={isRowBlocked ? 'Патруль полиции блокирует сдвиг' : 'Сдвиг влево'}
              >
                {isRowBlocked ? '🚔' : '←'}
              </button>

              {/* 5 карт в ряду */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 flex-1">
                {row.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    isSelected={selectedCharacterId === character.id}
                    isKillerAdjacent={killerAdjacentIds.includes(character.id)}
                    isDetectiveAdjacent={detectiveAdjacentIds.includes(character.id)}
                    showKillerHint={showKillerHints}
                    showDetectiveHint={showDetectiveHints}
                    onClick={() => onSelectCharacter(character.id)}
                  />
                ))}
              </div>

              {/* Сдвиг ряда вправо */}
              <button
                disabled={isRowBlocked}
                onClick={() => onShift('ROW', rIdx, 'FORWARD')}
                className={`w-5 sm:w-6 h-full min-h-[44px] rounded-lg text-xs font-bold transition flex items-center justify-center shrink-0 border ${
                  isRowBlocked
                    ? 'bg-blue-950/80 text-blue-300 border-blue-500 cursor-not-allowed shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                    : 'bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-800 cursor-pointer'
                }`}
                title={isRowBlocked ? 'Патруль полиции блокирует сдвиг' : 'Сдвиг вправо'}
              >
                {isRowBlocked ? '🚔' : '→'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Кнопки сдвига колонок ВНИЗ */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full max-w-[480px] mt-1.5 pl-6 pr-6 sm:pl-8 sm:pr-8">
        {[0, 1, 2, 3, 4].map((colIdx) => {
          const isBlocked = blockedShift?.type === 'COL' && blockedShift.index === colIdx;
          return (
            <button
              key={`col-down-${colIdx}`}
              disabled={isBlocked}
              onClick={() => onShift('COL', colIdx, 'FORWARD')}
              className={`h-6 sm:h-7 rounded-lg text-xs font-bold transition flex items-center justify-center border ${
                isBlocked
                  ? 'bg-blue-950/80 text-blue-300 border-blue-500 cursor-not-allowed shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                  : 'bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-800 cursor-pointer'
              }`}
              title={isBlocked ? 'Патруль полиции блокирует сдвиг' : 'Сдвиг вниз'}
            >
              {isBlocked ? '🚔' : '↓'}
            </button>
          );
        })}
      </div>
    </div>
  );
};
