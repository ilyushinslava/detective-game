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
    <div className="w-[40%] xl:w-[37%] flex flex-col gap-4 xl:gap-5">
      {/* Блок «Быстрая игра» */}
      <div className="flex flex-col gap-2.5">
        {hasActiveGame && onResumeGame && (
          <button
            onClick={onResumeGame}
            className="w-full bg-gradient-to-r from-emerald-950/90 via-zinc-950 to-zinc-950 border border-emerald-500/50 hover:border-emerald-400 p-3.5 rounded-2xl flex items-center justify-between shadow-[0_0_25px_rgba(16,185,129,0.2)] hover:scale-[1.01] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0">
                <Icons.Play className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  АКТИВНОЕ ДЕЛО В ПРОЦЕССЕ
                </span>
                <span className="text-sm font-black uppercase tracking-wider text-white group-hover:text-emerald-300 transition whitespace-normal leading-tight">
                  {t.menu.resume || "Возобновить расследование"}
                </span>
              </div>
            </div>
            <Icons.ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>
        )}

        <div className="p-4 xl:p-6 rounded-2xl xl:rounded-3xl bg-zinc-950/75 border border-blue-500/30 hover:border-blue-500/50 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] relative overflow-hidden group transition-all duration-300">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500" />

          <div className="relative z-10 flex flex-col items-start">
            {/* Бейдж: Мгновенный оперативный подбор */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-transparent border border-white/20 text-[10px] xl:text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <span>МГНОВЕННЫЙ ОПЕРАТИВНЫЙ ПОДБОР</span>
            </div>

            <h2 className="text-lg xl:text-xl font-display font-black text-white uppercase tracking-tight leading-tight mb-1.5 drop-shadow-md">
              {t.menu.quickPlay || "Быстрая игра"}
            </h2>

            <p className="text-[11px] xl:text-xs text-zinc-400 leading-relaxed mb-4 whitespace-normal">
              Автоматический вход в открытую дуэль против случайного соперника. Городская сетка 5×5 сгенерируется мгновенно.
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
        </div>
      </div>

      {/* Виджет «Сетевые столы» */}
      <div className="rounded-2xl xl:rounded-3xl bg-zinc-950/65 border border-white/10 hover:border-white/20 backdrop-blur-xl p-4 xl:p-5 shadow-xl flex flex-col justify-between transition-all duration-300">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_12px_rgba(37,99,235,0.3)] shrink-0">
                <Icons.Radar className="w-4 h-4 xl:w-5 xl:h-5" />
              </div>
              <div>
                <span className="text-xs xl:text-sm font-display font-bold uppercase tracking-wider text-white block">
                  Сетевые столы
                </span>
                <span className="text-[9px] xl:text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE ЭФИР
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300">
              {onlineRoomsCount} комнат
            </span>
          </div>

          <p className="text-[11px] xl:text-xs text-zinc-400 mt-2.5 leading-relaxed whitespace-normal">
            Подключайтесь к существующим открытым делам или создайте собственный приватный стол по 5-значному шифру.
          </p>

          <div className="mt-3 p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[11px] font-mono text-zinc-300">Пул комнат активен</span>
            </div>
            <span className="text-[9px] font-mono uppercase text-zinc-500 tracking-wider">
              PartyKit SSOT
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 mt-3.5">
          <button
            onClick={onOpenOnline}
            className="w-full py-2.5 xl:py-3 px-4 rounded-xl xl:rounded-2xl bg-blue-600 hover:bg-blue-500 border border-blue-400/50 text-white font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
          >
            <span>ОТКРЫТЬ СЕТЕВЫЕ СТОЛЫ</span>
            <Icons.ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
