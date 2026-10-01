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
      className={`relative w-full aspect-square rounded-xl p-1.5 sm:p-2.5 flex flex-col justify-between border select-none transition-all cursor-pointer ${
        character.isVault
          ? character.isVaultCracked
            ? 'bg-amber-950/40 border-amber-600/80 shadow-[inset_0_0_15px_rgba(245,158,11,0.2)]'
            : character.isVaultLocked
            ? 'bg-red-950/40 border-red-600/80'
            : 'bg-zinc-900 border-amber-500/60'
          : isDead
          ? 'bg-zinc-950/90 border-red-950/50 opacity-50 shadow-inner'
          : isExonerated
          ? 'bg-blue-950/40 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
          : 'bg-zinc-900 border-zinc-700/80 hover:border-zinc-500'
      } ${
        isSelected
          ? 'ring-2 ring-amber-400 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
          : ''
      } ${
        showKillerHint && isKillerAdjacent
          ? 'ring-1 ring-red-500/80 border-red-500/80'
          : ''
      } ${
        showDetectiveHint && isDetectiveAdjacent
          ? 'ring-1 ring-blue-500/80 border-blue-500/80'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[9px] sm:text-[11px] font-mono font-bold ${
          isDead ? 'text-zinc-600' : isExonerated ? 'text-blue-400' : 'text-zinc-500'
        }`}>
          {character.isVault ? 'СЕЙФ' : `#${character.id.replace('c', '')}`}
        </span>

        <div className="flex items-center gap-1 text-[11px] leading-none">
          {isDead && <span className="text-red-500 font-bold" title="Мертв">☠</span>}
          {character.isVault && (
            <span>{character.isVaultCracked ? '🔓' : character.isVaultLocked ? '🔒' : '🏦'}</span>
          )}
          {character.isShielded && <span>🛡️</span>}
          {character.hasBomb && <span>💣</span>}
          {character.isRobbed && <span>💰</span>}
        </div>
      </div>

      <div className="text-center my-auto px-0.5">
        <span
          className={`block text-[11px] sm:text-xs font-bold leading-tight ${
            isDead
              ? 'line-through text-zinc-500 font-normal'
              : isExonerated
              ? 'text-blue-100 font-extrabold'
              : 'text-zinc-100'
          }`}
        >
          {character.name}
        </span>
      </div>

      <div className="text-[8px] sm:text-[9px] font-mono font-bold text-center">
        {character.isVault ? (
          <span className={character.isVaultCracked ? 'text-amber-400' : character.isVaultLocked ? 'text-red-400' : 'text-amber-200/70'}>
            {character.isVaultCracked ? 'ВЗЛОМАН' : character.isVaultLocked ? 'ТРЕВОГА' : 'ХРАНИЛИЩЕ'}
          </span>
        ) : isDead ? (
          <span className="text-red-500/90 tracking-wider">ЛИКВИДИРОВАН</span>
        ) : isExonerated ? (
          <span className="text-blue-400 tracking-wider">ОПРАВДАН</span>
        ) : (
          <span className="text-zinc-500 font-normal">ПОДОЗРЕВАЕМЫЙ</span>
        )}
      </div>
    </div>
  );
});
