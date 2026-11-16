import React from "react";

export interface ActiveContractCardProps {
  className?: string;
}

export const ActiveContractCard: React.FC<ActiveContractCardProps> = ({ className = "" }) => {
  return (
    <div
      className={`rounded-2xl xl:rounded-3xl border border-amber-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-amber-950/20 backdrop-blur-xl p-4 xl:p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group select-none ${className}`}
    >
      {/* Декоративное неоновое свечение в глубине */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/15 transition-all" />

      {/* Верхний ряд: Бейдж директивы и номер контракта */}
      <div className="relative z-10 flex items-center justify-between w-full">
        <span className="text-[10px] xl:text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-wider bg-amber-950/80 border border-amber-500/40 text-amber-300 flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          АКТИВНЫЙ КОНТРАКТ
        </span>
        <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
          ЦЕЛЬ #84
        </span>
      </div>

      {/* Основной блок задания */}
      <div className="relative z-10 flex flex-col mt-2.5 xl:mt-3">
        <h3 className="font-display font-black text-sm xl:text-base text-zinc-100 uppercase tracking-tight leading-tight">
          Сыграйте 2 партии за Защиту
        </h3>
        <p className="text-[11px] xl:text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
          Завершите расследования в любом локальном режиме Штаба.
        </p>

        {/* Индикатор прогресса */}
        <div className="mt-2.5 xl:mt-3 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span>Прогресс директивы</span>
            <span className="text-amber-300 font-bold">1 / 2 (50%)</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800/80 rounded-full overflow-hidden border border-white/5">
            <div className="w-1/2 h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          </div>
        </div>
      </div>

      {/* Футер: Награда за выполнение */}
      <div className="relative z-10 pt-2.5 xl:pt-3 border-t border-white/10 mt-3 flex items-center justify-between text-[10px] xl:text-[11px] font-mono shrink-0">
        <span className="text-zinc-500 uppercase tracking-wider font-bold">НАГРАДА:</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-amber-400">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" />
            </svg>
            +250 CR
          </span>
          <span className="text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded-md border border-cyan-500/20">
            +100 XP
          </span>
        </div>
      </div>
    </div>
  );
};
