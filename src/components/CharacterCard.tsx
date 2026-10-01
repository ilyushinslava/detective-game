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
      className={`relative w-full aspect-square rounded-xl p-1.5 sm:p-2 flex flex-col justify-between border select-none transition-all duration-200 cursor-pointer overflow-hidden ${
        character.isVault
          ? character.isVaultCracked
            ? 'bg-amber-950/40 border-amber-500 shadow-[inset_0_0_15px_rgba(245,158,11,0.25)]'
            : character.isVaultLocked
            ? 'bg-red-950/40 border-red-600/80'
            : 'bg-zinc-900 border-amber-500/60'
          : isDead
          ? 'bg-zinc-950 border-zinc-900 opacity-60 shadow-inner'
          : isExonerated
          ? 'bg-gradient-to-b from-blue-950/50 to-zinc-900/90 border-blue-500/80 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
          : 'bg-zinc-900/95 border-zinc-800 hover:border-zinc-600 shadow-sm'
      } ${
        isSelected
          ? 'ring-2 ring-amber-400 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.4)] scale-[1.02] z-20'
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
      {/* Фоновый нуарный штамп для мертвых */}
      {isDead && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-red-950/90 text-red-500 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rotate-[-15deg] border border-red-800/80 rounded uppercase tracking-widest shadow-lg">
            ЛИКВИДИРОВАН
          </div>
        </div>
      )}

      {/* Верхняя строка: ID досье и индивидуальные жетоны механик */}
      <div className="flex items-center justify-between gap-1 z-0">
        <span
          className={`text-[9px] sm:text-[10px] font-mono tracking-wider font-bold ${
            isDead ? 'text-zinc-600 line-through' : isExonerated ? 'text-blue-400' : 'text-zinc-500'
          }`}
        >
          {character.isVault ? 'СЕЙФ' : `#${character.id.replace('c', '').padStart(2, '0')}`}
        </span>

        <div className="flex items-center gap-1 text-[11px] leading-none">
          {isDead && <span className="text-red-500/80 text-[10px]" title="Погиб">☠</span>}
          {character.isVault && (
            <span>{character.isVaultCracked ? '🔓' : character.isVaultLocked ? '🔒' : '🏦'}</span>
          )}
          {character.isShielded && <span title="Бронежилет">🛡️</span>}
          {character.hasBomb && <span title="Бомба ОПГ">💣</span>}
          {character.isRobbed && <span title="Ограблен">💰</span>}
        </div>
      </div>

      {/* Имя подозреваемого */}
      <div className="text-center my-auto px-0.5 z-0">
        <span
          className={`block text-[11px] sm:text-xs leading-tight tracking-tight ${
            isDead
              ? 'text-zinc-600 line-through decoration-red-900/70 font-medium'
              : isExonerated
              ? 'text-blue-100 font-extrabold'
              : 'text-zinc-100 font-bold'
          }`}
        >
          {character.name}
        </span>
      </div>

      {/* Нижняя бирка статуса с учетом индивидуализма игры */}
      <div className="z-0 flex items-center justify-center">
        {character.isVault ? (
          <span className={`text-[8px] sm:text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded border ${
            character.isVaultCracked
              ? 'text-amber-300 bg-amber-950/60 border-amber-700/60'
              : character.isVaultLocked
              ? 'text-red-300 bg-red-950/60 border-red-700/60'
              : 'text-zinc-400 bg-zinc-950 border-zinc-800'
          }`}>
            {character.isVaultCracked ? 'ВЗЛОМАН' : character.isVaultLocked ? 'СИГНАЛИЗАЦИЯ' : 'ХРАНИЛИЩЕ'}
          </span>
        ) : isDead ? (
          <span className="text-[8px] sm:text-[9px] font-mono text-zinc-600">
            В МОРГЕ
          </span>
        ) : isExonerated ? (
          <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-wider text-blue-300 bg-blue-950/80 border border-blue-600/60 px-1.5 py-0.5 rounded shadow-sm">
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
