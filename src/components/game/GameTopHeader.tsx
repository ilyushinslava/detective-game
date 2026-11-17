import React from "react";
import type { GameState } from "../../types/game";

export interface GameTopHeaderProps {
  gameState: GameState;
  isHumanTurn: boolean;
  currentRoleName: string;
  pillClasses: string;
  dotClasses: string;
  secondsElapsed: number;
  formatTimer: (totalSeconds: number) => string;
  unreadLogCount: number;
  setIsLogOpen: (open: boolean) => void;
  setUnreadLogCount: (count: number) => void;
  setIsNotebookOpen: (open: boolean) => void;
  setIsMenuOpen: (open: boolean) => void;
  onReset: () => void;
}

export const GameTopHeader: React.FC<GameTopHeaderProps> = ({
  gameState,
  isHumanTurn,
  currentRoleName,
  pillClasses,
  dotClasses,
  secondsElapsed,
  formatTimer,
  unreadLogCount,
  setIsLogOpen,
  setUnreadLogCount,
  setIsNotebookOpen,
  setIsMenuOpen,
  onReset,
}) => {
  return (
    <header className="relative w-full px-3 py-2 md:px-6 md:py-3 border-b border-zinc-800 bg-[#080a0f] flex justify-between items-center z-30 shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsMenuOpen(true)}
          className="w-8 h-8 md:w-11 md:h-11 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer"
          title="Пауза и меню"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 md:w-5 md:h-5">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        </button>
        <button
          onClick={() => setIsNotebookOpen(true)}
          className="w-8 h-8 md:w-11 md:h-11 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer"
          title="Блокнот подозреваемых"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 md:w-5 md:h-5">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </button>
        <button
          onClick={() => {
            setIsLogOpen(true);
            setUnreadLogCount(0);
          }}
          className="relative w-8 h-8 md:w-11 md:h-11 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer lg:hidden"
          title="Блокнот расследования"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 md:w-5 md:h-5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          {unreadLogCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
              {unreadLogCount}
            </span>
          )}
        </button>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex justify-center shrink-0">
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5 rounded-full border text-[10px] md:text-xs font-black tracking-wider uppercase transition-all shadow max-w-[140px] sm:max-w-[200px] truncate ${
            gameState.winner === "KILLER"
              ? "bg-red-950/90 border-red-600 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
              : gameState.winner === "DETECTIVE"
              ? gameState.mode === "THIEF_HUNT"
                ? "bg-blue-900/40 border border-blue-800/50 text-blue-400"
                : "bg-blue-950/90 border-blue-600 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              : currentRoleName === "ПОЛИЦИЯ" || currentRoleName === "Полиция"
              ? "bg-blue-900/40 border border-blue-800/50 text-blue-400"
              : pillClasses
          }`}
        >
          {gameState.winner === null && (
            <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
              <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClasses}`} />
            </span>
          )}
          <span className="whitespace-nowrap truncate">
            {gameState.winner !== null
              ? gameState.winner === "KILLER"
                ? "ПОБЕДА КРИМИНАЛА"
                : "ПОБЕДА ЗАКОНА"
              : gameState.opponent === "ONLINE"
              ? isHumanTurn
                ? "Ваш ход"
                : "Ход врага"
              : currentRoleName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden md:flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded-lg px-3 h-9 md:h-11 text-xs md:text-sm font-mono text-zinc-400">
          {formatTimer(secondsElapsed)}
        </div>
        <button
          onClick={onReset}
          className="px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
          title="Перезапустить партию"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Заново</span>
        </button>
      </div>
    </header>
  );
};
