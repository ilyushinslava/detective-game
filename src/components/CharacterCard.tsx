import { memo } from 'react';
import type { Character } from '../types/game';

interface CharacterCardProps {
  character: Character;
  isSelected: boolean;
  isKillerAdjacent: boolean;
  isDetectiveAdjacent: boolean;
  showKillerHint: boolean;
  showDetectiveHint: boolean;
  onClick: () => void;
}

export const CharacterCard = memo(({
  character,
  isSelected,
  isKillerAdjacent,
  isDetectiveAdjacent,
  showKillerHint,
  showDetectiveHint,
  onClick,
}: CharacterCardProps) => {
  const isDead = !character.isAlive;
  const isExonerated = character.isExonerated && !isDead;

  return (
    <div
      onClick={onClick}
      className={`relative w-full aspect-square rounded-xl p-1.5 sm:p-2.5 flex flex-col justify-between border select-none transition-all duration-200 cursor-pointer overflow-hidden ${
        isDead
          ? 'bg-zinc-950/80 border-zinc-900 shadow-inner'
          : isExonerated
          ? 'bg-gradient-to-b from-blue-950/50 to-zinc-900/90 border-blue-500/70 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
          : 'bg-zinc-900/95 border-zinc-800 hover:border-zinc-600 shadow-sm'
      } ${
        isSelected
          ? 'ring-2 ring-amber-400 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.35)] scale-[1.02] z-10'
          : ''
      } ${
        showKillerHint && isKillerAdjacent
          ? 'ring-1 ring-red-500/80 border-red-500'
          : ''
      } ${
        showDetectiveHint && isDetectiveAdjacent
          ? 'ring-1 ring-blue-500/80 border-blue-500'
          : ''
      }`}
    >
      {/* Декоративная подложка для мертвых */}
      {isDead && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent pointer-events-none" />
      )}

      {/* Верхняя плашка: номер досье и иконка */}
      <div className="flex items-center justify-between gap-1 z-10">
        <span
          className={`text-[9px] sm:text-[10px] font-mono tracking-wider font-bold ${
            isDead ? 'text-zinc-600 line-through' : isExonerated ? 'text-blue-400' : 'text-zinc-500'
          }`}
        >
          #{character.id.replace('c', '').padStart(2, '0')}
        </span>

        <div className="flex items-center gap-1 text-[11px] leading-none">
          {isDead && (
            <span className="text-zinc-500 text-[10px] tracking-tighter" title="Ликвидирован">
              ☠
            </span>
          )}
          {character.isShielded && <span>🛡️</span>}
          {character.hasBomb && <span>💣</span>}
          {character.isRobbed && <span>💰</span>}
        </div>
      </div>

      {/* Имя персонажа */}
      <div className="text-center my-auto px-0.5 z-10">
        <span
          className={`block text-[11px] sm:text-xs font-bold leading-tight tracking-tight ${
            isDead
              ? 'text-zinc-600 line-through decoration-zinc-700 decoration-1'
              : isExonerated
              ? 'text-blue-100 font-extrabold'
              : 'text-zinc-100'
          }`}
        >
          {character.name}
        </span>
      </div>

      {/* Нижняя полоска статуса в виде аккуратного штампа */}
      <div className="z-10 flex items-center justify-center">
        {isDead ? (
          <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-wider text-red-500/80 bg-red-950/40 border border-red-900/40 px-1.5 py-0.5 rounded">
            ЛИКВИДИРОВАН
          </span>
        ) : isExonerated ? (
          <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-wider text-blue-300 bg-blue-950/70 border border-blue-700/50 px-1.5 py-0.5 rounded shadow-sm">
            АЛИБИ ПОДТВЕРЖДЕНО
          </span>
        ) : (
          <span className="text-[8px] sm:text-[9px] font-mono tracking-wider text-zinc-500">
            ПОДОЗРЕВАЕМЫЙ
          </span>
        )}
      </div>
    </div>
  );
});