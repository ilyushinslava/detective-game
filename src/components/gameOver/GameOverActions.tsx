import React from 'react';
import { Button } from '../ui/Button';

export interface GameOverActionsProps {
  isMultiplayer: boolean;
  onRestart?: () => void;
  onExitToMenu?: () => void;
  onRematchSwap?: () => void;
  onRematchRandom?: () => void;
  onRematchSame?: () => void;
  translations: {
    rematchSwap: string;
    rematchRandom: string;
    rematchSame: string;
    restart: string;
    exitToMenu: string;
  };
}

export const GameOverActions: React.FC<GameOverActionsProps> = ({
  isMultiplayer,
  onRestart,
  onExitToMenu,
  onRematchSwap,
  onRematchRandom,
  onRematchSame,
  translations: go,
}) => {
  return (
    <>
      {isMultiplayer ? (
        <div className="flex flex-col gap-2.5 w-full">
          <Button
            variant="primary-danger"
            fullWidth
            tabIndex={0}
            data-dpad-primary="true"
            onClick={onRematchSwap}
            className="from-red-950 text-xs sm:text-sm font-bold uppercase tracking-wider gap-2 !h-12 transition-all focus:outline-none focus:scale-105 focus:border-white focus:bg-white/20 focus:shadow-[0_0_20px_rgba(255,255,255,0.35)] cursor-pointer"
          >
            <span>⇄</span> {go.rematchSwap}
          </Button>

          <Button
            variant="primary-info"
            fullWidth
            tabIndex={0}
            onClick={onRematchRandom}
            className="from-blue-950 text-xs sm:text-sm font-bold uppercase tracking-wider gap-2 !h-12 transition-all focus:outline-none focus:scale-105 focus:border-white focus:bg-white/20 focus:shadow-[0_0_20px_rgba(255,255,255,0.35)] cursor-pointer"
          >
            <span className="font-mono font-bold text-[10px] text-blue-400">[RND]</span> {go.rematchRandom}
          </Button>

          <Button
            variant="secondary"
            fullWidth
            tabIndex={0}
            onClick={onRematchSame}
            className="text-xs sm:text-sm font-bold uppercase tracking-wider gap-2 !h-12 transition-all focus:outline-none focus:scale-105 focus:border-white focus:bg-white/20 focus:shadow-[0_0_20px_rgba(255,255,255,0.35)] cursor-pointer"
          >
            <span>↻</span> {go.rematchSame}
          </Button>
        </div>
      ) : (
        <Button
          variant="primary-danger"
          fullWidth
          tabIndex={0}
          data-dpad-primary="true"
          onClick={onRestart}
          className="rounded-full !h-14 text-xs sm:text-sm font-black uppercase tracking-wider gap-2 shadow-lg transition-all focus:outline-none focus:scale-105 focus:border-white focus:bg-white/20 focus:shadow-[0_0_25px_rgba(255,255,255,0.45)] cursor-pointer"
        >
          <span>{go.restart}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Button>
      )}

      <Button
        variant="ghost"
        fullWidth
        tabIndex={0}
        onClick={onExitToMenu}
        className="text-zinc-400 hover:text-zinc-100 text-xs sm:text-sm font-bold uppercase tracking-wider py-3 mt-2.5 transition-all rounded-xl focus:outline-none focus:scale-105 focus:border-white focus:bg-white/20 focus:text-white focus:shadow-[0_0_20px_rgba(255,255,255,0.35)] cursor-pointer"
      >
        <span>{go.exitToMenu}</span>
      </Button>
    </>
  );
};
