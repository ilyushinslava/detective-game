import React from "react";
import type { ModeInfo } from "./rulesData";

export interface RuleModeDetailProps {
  currentMode: ModeInfo;
  bannerSrc?: string;
  onOpenBanner: (e: React.MouseEvent, src: string, title: string) => void;
  onBannerError: () => void;
}

export const RuleModeDetail: React.FC<RuleModeDetailProps> = ({
  currentMode,
  bannerSrc,
  onOpenBanner,
  onBannerError,
}) => {
  return (
    <>
      <div
        onClick={(e) => {
          if (bannerSrc) {
            onOpenBanner(e, bannerSrc, currentMode.title);
          }
        }}
        className={`relative w-full h-[100px] sm:h-[120px] rounded-2xl overflow-hidden mb-3.5 shrink-0 border ${
          currentMode.borderColor
        } shadow-lg cursor-pointer group select-none ${
          bannerSrc
            ? "bg-zinc-950"
            : "bg-gradient-to-r from-blue-950/40 via-zinc-900/60 to-zinc-950 border-white/10"
        }`}
        title="Нажмите для просмотра полного фото"
      >
        {bannerSrc && (
          <img
            src={bannerSrc}
            alt={currentMode.title}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-80 pointer-events-none"
            onError={onBannerError}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent pointer-events-none" />

        {bannerSrc && (
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 opacity-85 group-hover:opacity-100 transition-opacity pointer-events-none">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-3.5 h-3.5 text-zinc-300"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </div>
        )}

        <div className="absolute bottom-2.5 left-3.5 right-3.5 z-10 flex items-end pointer-events-none">
          <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {currentMode.title}
          </h3>
        </div>
      </div>

      <div className="overflow-y-auto space-y-3 text-left text-xs text-zinc-300 pr-1 pb-2 custom-scrollbar flex-1 min-h-0">
        <p className="text-[11px] text-zinc-400 leading-relaxed font-medium tracking-normal">
          {currentMode.desc}
        </p>

        <div className="space-y-1.5">
          <span className="font-black text-zinc-400 block text-[9px] uppercase tracking-widest">
            ЦЕЛИ И ЗАДАЧИ СТОРОН
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/5 space-y-1">
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded inline-block ${currentMode.role1.badgeColor}`}
              >
                {currentMode.role1.name}
              </span>
              <p className="text-[11px] text-zinc-300 leading-snug">
                {currentMode.role1.goal}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/5 space-y-1">
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded inline-block ${currentMode.role2.badgeColor}`}
              >
                {currentMode.role2.name}
              </span>
              <p className="text-[11px] text-zinc-300 leading-snug">
                {currentMode.role2.goal}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <span className="font-black text-zinc-400 block text-[9px] uppercase tracking-widest">
            РЕГЛАМЕНТ И МЕХАНИКИ ХОДА
          </span>
          <div className="space-y-2">
            {currentMode.mechanics.map((m, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-zinc-100 tracking-wider">
                    {m.name}
                  </span>
                  {m.tag && (
                    <span className="text-[8px] font-semibold tracking-wider text-zinc-400 uppercase bg-zinc-950 px-1.5 py-0.5 rounded border border-white/5">
                      {m.tag}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
