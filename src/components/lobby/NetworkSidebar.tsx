import React from "react";
import { BiometricSlider } from "../BiometricSlider";
import { Icons } from "../ui/Icons";

export interface NetworkSidebarProps {
  hasActiveGame: boolean;
  onResumeGame?: () => void;
  isCreating: boolean;
  onQuickPlay: () => void;
  onOpenOnline: () => void;
  onlineRoomsCount?: number;
  t: {
    menu: {
      resume?: string;
      quickPlay?: string;
      searching?: string;
    };
  };
}

export const NetworkSidebar: React.FC<NetworkSidebarProps> = ({
  hasActiveGame,
  onResumeGame,
  isCreating,
  onQuickPlay,
  onOpenOnline,
  onlineRoomsCount = 0,
  t,
}) => {
  return (
    <div className="w-[42%] xl:w-[40%] flex flex-col rounded-2xl xl:rounded-3xl bg-gradient-to-br from-background-surface/90 to-background-main/80 border border-border-subtle border-t border-t-border-strong shadow-[inset_0_2px_25px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-3.5 xl:p-5 relative overflow-hidden justify-between min-h-0">
      {/* Декоративное терминальное свечение в глубине фона */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none" />

      {/* Секция: Возобновление расследования (если есть активный матч) */}
      {hasActiveGame && onResumeGame && (
        <div className="relative z-10 pb-3 border-b border-white/10 mb-3 shrink-0">
          <button
            onClick={onResumeGame}
            className="w-full bg-gradient-to-r from-emerald-950/80 via-zinc-950 to-zinc-950 border border-emerald-500/40 hover:border-emerald-400 p-2.5 rounded-2xl flex items-center justify-between shadow-[0_0_25px_rgba(16,185,129,0.2)] hover:scale-[1.01] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0">
                <Icons.Play className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  АКТИВНОЕ ДЕЛО
                </span>
                <span className="text-xs xl:text-sm font-black uppercase tracking-wider text-white group-hover:text-emerald-300 transition whitespace-normal leading-tight">
                  {t.menu.resume || "Возобновить"}
                </span>
              </div>
            </div>
            <Icons.ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      )}

      {/* Блок 1: БЫСТРАЯ ИГРА (со слайдером) */}
      <div className="relative z-10 flex flex-col shrink-0 pb-3.5 xl:pb-4 border-b border-white/15">
        <div className="flex items-center mb-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900/80 border border-white/15 text-[9px] xl:text-[10px] font-mono font-bold tracking-wider text-zinc-300 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
            <span>МГНОВЕННЫЙ ПОДБОР</span>
          </div>
        </div>

        <h2 className="text-base xl:text-lg font-display font-black text-white uppercase tracking-tight leading-tight mb-0.5">
          {t.menu.quickPlay || "Быстрая игра"}
        </h2>

        <p className="text-[11px] xl:text-xs text-zinc-400 leading-snug mb-2.5 whitespace-normal line-clamp-2">
          Автоматический подбор соперника в открытую дуэль. Городская сетка генерируется мгновенно по биометрии.
        </p>

        <div className="w-full">
          <BiometricSlider
            onTrigger={onQuickPlay}
            disabled={isCreating}
            text={isCreating ? (t.menu.searching || "Поиск соперника...") : (t.menu.quickPlay || "Быстрая игра")}
            price={250}
          />
        </div>
      </div>

      {/* Блок 2: СЕТЕВЫЕ СТОЛЫ (доступ к открытым сетевым комнатам) */}
      <div className="relative z-10 flex flex-col justify-between flex-1 min-h-0 pt-3 xl:pt-4">
        <div>
          <div className="flex items-center justify-between pb-1.5 mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-lg xl:rounded-xl bg-zinc-950/80 border border-white/10 flex items-center justify-center text-zinc-300 shadow-inner shrink-0">
                <Icons.Radar className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-zinc-300" />
              </div>
              <span className="text-xs xl:text-sm font-display font-bold uppercase tracking-wider text-white block leading-tight">
                Сетевые столы
              </span>
            </div>
            <span className="text-[9px] xl:text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-900/80 border border-white/10 text-zinc-300 shrink-0">
              {onlineRoomsCount} комнат
            </span>
          </div>

          <p className="text-[11px] xl:text-xs text-zinc-400 leading-snug whitespace-normal line-clamp-2 mb-2">
            Открытые оперативные столы по кодам комнат и приватные сессии расследований.
          </p>
        </div>

        <button
          onClick={onOpenOnline}
          className="w-full h-10 xl:h-11 px-4 rounded-xl xl:rounded-2xl neo-button-primary font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer mt-2"
        >
          <span>ОТКРЫТЬ СЕТЕВЫЕ СТОЛЫ</span>
          <Icons.ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
