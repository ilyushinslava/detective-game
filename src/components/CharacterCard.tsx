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
      className={`relative w-full aspect-square rounded-xl p-1.5 sm:p-2 flex flex-col justify-between border select-none transition-all duration-150 cursor-pointer overflow-hidden ${
        character.isVault
          ? character.isVaultCracked
            ? 'bg-amber-950/40 border-amber-500 shadow-[inset_0_0_12px_rgba(245,158,11,0.2)]'
            : character.isVaultLocked
            ? 'bg-red-950/40 border-red-700/80'
            : 'bg-zinc-900 border-amber-600/60'
          : isDead
          ? 'bg-zinc-950/90 border-red-950/40 opacity-55'
          : isExonerated
          ? 'bg-gradient-to-b from-blue-950/40 to-zinc-900 border-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
          : 'bg-zinc-900/95 border-zinc-800 hover:border-zinc-700 shadow-sm'
      } ${
        isSelected
          ? 'ring-2 ring-amber-400 border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.35)] scale-[1.02] z-20'
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
      {/* Верхняя строка: Номер досье и иконки состояния */}
      <div className="flex items-center justify-between gap-1 z-10 w-full">
        <span
          className={`text-[9px] sm:text-[10px] font-mono font-bold ${
            isDead ? 'text-zinc-600 line-through' : isExonerated ? 'text-blue-400' : 'text-zinc-500'
          }`}
        >
          {character.isVault ? 'СЕЙФ' : `#${character.id.replace('c', '').padStart(2, '0')}`}
        </span>

        <div className="flex items-center gap-1 text-[11px] leading-none">
          {isDead && (
            <span className="text-red-500 text-[11px] font-bold" title="Ликвидирован">
              ☠
            </span>
          )}
          {character.isVault && (
            <span>{character.isVaultCracked ? '🔓' : character.isVaultLocked ? '🔒' : '🏦'}</span>
          )}
          {character.isShielded && <span title="Бронежилет">🛡️</span>}
          {character.hasBomb && <span title="Мина">💣</span>}
          {character.isRobbed && <span title="Ограблен">💰</span>}
        </div>
      </div>

      {/* Имя подозреваемого */}
      <div className="text-center my-auto px-0.5 z-10">
        <span
          className={`block text-[11px] sm:text-xs font-bold leading-snug tracking-tight ${
            isDead
              ? 'text-zinc-500 line-through decoration-red-700/60 font-medium'
              : isExonerated
              ? 'text-blue-100 font-extrabold'
              : 'text-zinc-100'
          }`}
        >
          {character.name}
        </span>
      </div>

      {/* Нижняя аккуратная плашка статуса */}
      <div className="z-10 flex items-center justify-center w-full">
        {character.isVault ? (
          <span className={`text-[8px] sm:text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.2 rounded border ${
            character.isVaultCracked
              ? 'text-amber-300 bg-amber-950/70 border-amber-700/60'
              : character.isVaultLocked
              ? 'text-red-300 bg-red-950/70 border-red-700/60'
              : 'text-zinc-400 bg-zinc-950 border-zinc-800'
          }`}>
            {character.isVaultCracked ? 'ВЗЛОМАН' : character.isVaultLocked ? 'СИГНАЛИЗАЦИЯ' : 'ХРАНИЛИЩЕ'}
          </span>
        ) : isDead ? (
          <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-wider text-red-400 bg-red-950/60 border border-red-900/60 px-1.5 py-0.2 rounded">
            ЛИКВИДИРОВАН
          </span>
        ) : isExonerated ? (
          <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-wider text-blue-300 bg-blue-950/80 border border-blue-600/70 px-1.5 py-0.2 rounded shadow-sm">
            АЛИБИ
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
