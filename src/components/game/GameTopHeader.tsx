import React from "react";
import type { GameState } from "../../types/game";
import { useGameTimerDisplay } from "../../hooks/useGameTimer";

export interface GameTopHeaderProps {
  gameState: GameState;
  isHumanTurn: boolean;
  currentRoleName: string;
  pillClasses: string;
  dotClasses: string;
  secondsElapsed?: number;
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
  const liveSeconds = useGameTimerDisplay();
  const displaySeconds = secondsElapsed !== undefined ? secondsElapsed : liveSeconds;
  return (
    <header className="relative w-full px-2 sm:px-3 md:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 md:py-3 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl flex justify-between items-center z-30 shrink-0 shadow-lg gap-1.5 sm:gap-2">
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0 z-10">
        <button
          onClick={() => setIsMenuOpen(true)}
          className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 neo-card-interactive rounded-xl flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer text-zinc-300 hover:text-white border-t-white/25 active:scale-95 shadow-md touch-manipulation"
          title="Пауза и меню"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 md:w-5 md:h-5">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        </button>
        <button
          onClick={() => setIsNotebookOpen(true)}
          className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 neo-card-interactive rounded-xl flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer text-zinc-300 hover:text-white border-t-white/25 active:scale-95 shadow-md touch-manipulation"
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
          className="relative w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 neo-card-interactive rounded-xl flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer text-zinc-300 hover:text-white border-t-white/25 active:scale-95 shadow-md touch-manipulation landscape:hidden"
          title="Блокнот расследования"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 md:w-5 md:h-5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          {unreadLogCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-md animate-pulse">
              {unreadLogCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 min-w-0 flex justify-center items-center px-1 z-0 overflow-hidden">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 md:px-5 md:py-2.5 rounded-full border text-[10px] md:text-xs font-black tracking-wider uppercase transition-all shadow-lg backdrop-blur-xl max-w-full sm:max-w-[220px] truncate ${
            gameState.winner === "KILLER"
              ? "bg-rose-950/80 border-rose-500/50 border-t-rose-400/80 text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
              : gameState.winner === "DETECTIVE"
              ? gameState.mode === "THIEF_HUNT"
                ? "bg-blue-900/50 border border-blue-600/50 border-t-blue-400/80 text-blue-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                : "bg-blue-950/80 border-blue-500/50 border-t-blue-400/80 text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
              : currentRoleName === "ПОЛИЦИЯ" || currentRoleName === "Полиция"
              ? "bg-blue-900/50 border border-blue-600/50 border-t-blue-400/80 text-blue-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
              : pillClasses
          }`}
        >
          {gameState.winner === null && (
            <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5 shrink-0 items-center justify-center">
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 ${dotClasses}`} />
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

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 z-10">
        <div className="hidden md:flex items-center justify-center neo-card border-t-white/25 rounded-xl px-3.5 h-9 md:h-11 text-xs md:text-sm font-mono text-zinc-200 tracking-wider shadow-md">
          {formatTimer(displaySeconds)}
        </div>
        <button
          onClick={onReset}
          className="h-9 sm:h-10 md:h-11 px-2.5 sm:px-3 py-1 md:py-1.5 rounded-xl neo-card-interactive border-t-white/25 text-zinc-200 hover:text-white text-[11px] md:text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer shadow-md touch-manipulation"
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
