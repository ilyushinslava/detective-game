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

      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full px-4 py-4 sm:py-6 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 w-full">
          {modes.map((mode) => {
            const ModeIcon = mode.icon || Icons.Crosshair;
            const bannerPath = modeBanners[mode.id];
            const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
            const bannerSrc = bannerPath ? `${base}${bannerPath.startsWith("/") ? bannerPath : "/" + bannerPath}` : null;

            return (
              <button
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                className="w-full relative overflow-hidden neo-card-interactive rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer active:scale-[0.99] group text-left flex flex-col justify-between min-h-[110px] sm:min-h-[120px]"
              >
                {bannerSrc && (
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden pointer-events-none opacity-25 group-hover:opacity-40 transition-opacity"
                    style={{
                      maskImage: "linear-gradient(to right, transparent 0%, black 45%)",
                      WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 45%)",
                    }}
                  >
                    <img src={bannerSrc} alt="" className="w-full h-full object-cover object-center" />
                  </div>
                )}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900/90 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-white group-hover:border-white/25 transition-all shrink-0 shadow-inner">
                    <ModeIcon className="w-5 h-5" />
                  </div>
                  <span className="px-3.5 py-1.5 rounded-xl neo-button-primary text-[11px] font-mono font-bold tracking-wider transition-all flex items-center gap-1.5">
                    <span>ВЫБРАТЬ</span>
                    <span className="text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform">➔</span>
                  </span>
                </div>

                <div className="relative z-10 mt-3">
                  <h3 className="font-display font-black text-base sm:text-lg text-zinc-100 uppercase tracking-wide group-hover:text-white transition-colors">
                    {mode.title}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
