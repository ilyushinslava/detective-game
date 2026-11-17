import React from 'react';
import type { Character } from '../../types/game';

export interface GameOverRoleCardProps {
  char?: Character;
  roleName?: string;
  isKillerSide?: boolean;
  isKillerWinner: boolean;
  imgUrl?: string;
  winnerLabel: string;
  defeatLabel: string;
  unrevealedLabel: string;
  onSelectPhoto: (char: Character) => void;
}

export const GameOverRoleCard: React.FC<GameOverRoleCardProps> = ({
  char,
  roleName,
  isKillerSide,
  isKillerWinner,
  imgUrl,
  winnerLabel,
  defeatLabel,
  unrevealedLabel,
  onSelectPhoto,
}) => {
  const isCharWinner = isKillerSide ? isKillerWinner : !isKillerWinner;
  const charNumber = char ? `#${char.id.replace('c', '').padStart(2, '0')}` : '??';

  const roleBadgeClass = isKillerSide
    ? 'text-red-400 bg-red-950/30 border border-red-500/30'
    : 'text-blue-400 bg-blue-950/30 border border-blue-500/30';

  const winnerCardClass = isCharWinner
    ? isKillerSide
      ? 'border-2 border-rose-500/80 shadow-[0_0_25px_rgba(225,29,72,0.45)] ring-1 ring-rose-400/50 bg-zinc-950'
      : 'border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.45)] ring-1 ring-cyan-400/50 bg-zinc-950'
    : 'border border-white/5 bg-zinc-950/60 opacity-40 hover:opacity-75';

  return (
    <div
      onClick={() => {
        if (char && imgUrl) {
          onSelectPhoto(char);
        }
      }}
      className={`group relative h-44 sm:h-48 overflow-hidden rounded-2xl flex flex-col justify-between p-3 select-none transition-all duration-200 ${winnerCardClass} ${
        char && imgUrl ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
    >
      {imgUrl ? (
        <>
          <img
            src={imgUrl}
            alt={char?.name || roleName}
            className={`absolute inset-0 w-full h-full object-cover contrast-125 transition-transform duration-300 group-hover:scale-105 ${
              isCharWinner ? 'grayscale opacity-100' : 'grayscale opacity-60'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-zinc-950/70" />
        </>
      ) : (
        <div className="absolute inset-0 bg-zinc-900/60 flex items-center justify-center">
          <span className="font-mono font-bold text-2xl text-zinc-700">{charNumber}</span>
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between w-full">
        {isCharWinner ? (
          <span className="bg-white text-zinc-950 font-black font-mono text-[9px] uppercase px-2 py-0.5 rounded shadow-sm">
            {winnerLabel}
          </span>
        ) : (
          <span className="bg-zinc-900 text-zinc-500 border border-white/5 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded">
            {defeatLabel}
          </span>
        )}
        <span className="font-mono font-bold text-[10px] text-zinc-300 drop-shadow-sm">
          {charNumber}
        </span>
      </div>

      <div className="relative z-10 mt-auto pr-5">
        <span
          className={`inline-block text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md mb-1.5 drop-shadow-sm ${roleBadgeClass}`}
        >
          {roleName}
        </span>
        <span className="text-xs sm:text-sm font-bold uppercase leading-tight drop-shadow-md text-white block break-words">
          {char ? char.name : unrevealedLabel}
        </span>
      </div>

      {char && imgUrl && (
        <div className="absolute bottom-2.5 right-2.5 z-10 w-5 h-5 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      )}
    </div>
  );
};
