import React from "react";
import type { GameModeType } from "../../types/game";
import type { GameModeCardData } from "../../constants/gameMeta";
import { Button } from "../ui/Button";
import { Icons } from "../ui/Icons";

export interface ModesListProps {
  modes: Array<GameModeCardData & { icon?: React.ComponentType<{ className?: string }> }>;
  modeBanners: Record<GameModeType, string>;
  onBack: () => void;
  onSelectMode: (modeId: GameModeType) => void;
}

export const ModesList: React.FC<ModesListProps> = ({
  modes,
  modeBanners,
  onBack,
  onSelectMode,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-background-main overflow-hidden w-full h-full">
      <div className="flex items-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-border-subtle bg-background-main relative">
        <Button variant="ghost" onClick={onBack} className="h-9 px-2 text-zinc-400 hover:text-white gap-1">
          <Icons.ChevronLeft />
          <span className="text-[10px] font-black uppercase tracking-widest">Назад</span>
        </Button>
        <h2 className="absolute left-1/2 -translate-x-1/2 text-sm md:text-base font-black tracking-widest text-zinc-100 uppercase">
          Выбор игры
        </h2>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-2.5 max-w-xl mx-auto w-full px-4 py-2 min-h-0 overflow-y-auto custom-scrollbar">
        {modes.map((mode) => {
          const ModeIcon = mode.icon || Icons.Crosshair;
          const bannerPath = modeBanners[mode.id];
          const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
          const bannerSrc = bannerPath ? `${base}${bannerPath.startsWith("/") ? bannerPath : "/" + bannerPath}` : null;

          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className="w-full relative overflow-hidden bg-zinc-950/70 hover:bg-zinc-900/90 border border-white/10 hover:border-white/25 rounded-2xl p-3.5 transition-all duration-200 cursor-pointer active:scale-[0.99] group text-left shadow-lg"
            >
              {bannerSrc && (
                <div className="absolute right-0 top-0 bottom-0 w-1/3 overflow-hidden pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity">
                  <img src={bannerSrc} alt="" className="w-full h-full object-cover object-center" />
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent" />
                </div>
              )}
              <div className="relative z-10 flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-200 group-hover:text-white group-hover:border-white/30 transition-all shrink-0 shadow-inner">
                  <ModeIcon className="w-5 h-5" />
                </div>
                <span className="px-3 py-1 rounded-full bg-zinc-900/90 border border-white/10 text-[11px] font-bold text-zinc-300 group-hover:text-white group-hover:border-white/30 transition-all flex items-center gap-1">
                  ВЫБРАТЬ ➔
                </span>
              </div>

              <div className="relative z-10 mt-2.5">
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 uppercase tracking-wide group-hover:text-white transition-colors">
                  {mode.title}
                </h3>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
