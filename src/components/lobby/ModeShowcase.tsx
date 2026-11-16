import React from "react";
import { BiometricSlider } from "../BiometricSlider";
import { Icons } from "../ui/Icons";

export interface ModeShowcaseProps {
  hasActiveGame: boolean;
  onResumeGame?: () => void;
  isCreating: boolean;
  onQuickPlay: () => void;
  onSelectSolo: () => void;
  onSelectLocalDuel: () => void;
  onOpenTvParty: () => void;
  onOpenOnline: () => void;
  onOpenRules?: () => void;
  onOpenTutorial: () => void;
  t: {
    menu: {
      resume?: string;
      quickPlay?: string;
      searching?: string;
      soloCases?: string;
      localDuel?: string;
      tvMode?: string;
      onlineOps?: string;
      rulebook?: string;
      rulebookDesc?: string;
      tutorial?: string;
      tutorialDesc?: string;
    };
  };
}

export const ModeShowcase: React.FC<ModeShowcaseProps> = ({
  hasActiveGame,
  onResumeGame,
  isCreating,
  onQuickPlay,
  onSelectSolo,
  onSelectLocalDuel,
  onOpenTvParty,
  onOpenOnline,
  onOpenRules,
  onOpenTutorial,
  t,
}) => {
  return (
    <div className="w-full flex-1 flex flex-col justify-between py-1 sm:py-2 lg:py-3 gap-3 sm:gap-4 lg:gap-5 min-h-0 overflow-y-auto custom-scrollbar my-auto">
      {/* 1. Сетка 4-х режимов (PVE, PVP, TV, ONLINE) — широкие горизонтальные карточки */}
      <div className="w-full">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:gap-4">
          {/* Card 1: Solo Game (PVE) */}
          <button
            onClick={onSelectSolo}
            className="h-auto min-h-[96px] sm:min-h-[110px] lg:min-h-[125px] xl:min-h-[135px] lg:aspect-[2.3/1] xl:aspect-[2.5/1] border border-white/10 hover:border-white/25 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-4.5 xl:p-5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl bg-zinc-900/90 text-zinc-300 border border-white/10 flex items-center justify-center group-hover:text-white group-hover:border-white/25 transition-all shrink-0 shadow-inner">
                <Icons.Cards className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
              <span className="bg-zinc-900/90 text-zinc-400 border border-white/10 text-[9px] sm:text-[10px] lg:text-xs font-mono px-2.5 py-0.5 lg:py-1 rounded-lg uppercase font-bold tracking-wider shrink-0">
                PVE
              </span>
            </div>
            <div className="flex flex-col mt-2 lg:mt-3 min-w-0 flex-1 justify-end">
              <span className="font-bold text-xs sm:text-sm lg:text-base xl:text-lg break-words leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                {t.menu.soloCases || "Одиночные дела"}
              </span>
            </div>
          </button>

          {/* Card 2: One Screen (PVP) */}
          <button
            onClick={onSelectLocalDuel}
            className="h-auto min-h-[96px] sm:min-h-[110px] lg:min-h-[125px] xl:min-h-[135px] lg:aspect-[2.3/1] xl:aspect-[2.5/1] border border-white/10 hover:border-white/25 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-4.5 xl:p-5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl bg-zinc-900/90 text-zinc-300 border border-white/10 flex items-center justify-center group-hover:text-white group-hover:border-white/25 transition-all shrink-0 shadow-inner">
                <Icons.Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
              <span className="bg-zinc-900/90 text-zinc-400 border border-white/10 text-[9px] sm:text-[10px] lg:text-xs font-mono px-2.5 py-0.5 lg:py-1 rounded-lg uppercase font-bold tracking-wider shrink-0">
                PVP
              </span>
            </div>
            <div className="flex flex-col mt-2 lg:mt-3 min-w-0 flex-1 justify-end">
              <span className="font-bold text-xs sm:text-sm lg:text-base xl:text-lg break-words leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                {t.menu.localDuel || "На одном экране"}
              </span>
            </div>
          </button>

          {/* Card 3: TV Mode (TV PARTY) */}
          <button
            onClick={onOpenTvParty}
            className="h-auto min-h-[96px] sm:min-h-[110px] lg:min-h-[125px] xl:min-h-[135px] lg:aspect-[2.3/1] xl:aspect-[2.5/1] border border-white/10 hover:border-red-500/40 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-4.5 xl:p-5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-red-500/40"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl bg-red-950/40 text-red-400 border border-red-500/30 flex items-center justify-center group-hover:text-red-300 group-hover:border-red-500/50 transition-all shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
              </div>
              <span className="bg-red-950/80 text-red-400 border border-red-500/40 text-[9px] sm:text-[10px] lg:text-xs font-mono px-2.5 py-0.5 lg:py-1 rounded-lg uppercase font-black tracking-wider shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.25)]">
                TV PARTY
              </span>
            </div>
            <div className="flex flex-col mt-2 lg:mt-3 min-w-0 flex-1 justify-end">
              <span className="font-bold text-xs sm:text-sm lg:text-base xl:text-lg break-words leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                {t.menu.tvMode || "ТВ РЕЖИМ"}
              </span>
            </div>
          </button>

          {/* Card 4: Multiplayer (ONLINE) */}
          <button
            onClick={onOpenOnline}
            className="h-auto min-h-[96px] sm:min-h-[110px] lg:min-h-[125px] xl:min-h-[135px] lg:aspect-[2.3/1] xl:aspect-[2.5/1] border border-white/10 hover:border-blue-500/40 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-4.5 xl:p-5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl bg-blue-950/40 text-blue-400 border border-blue-500/30 flex items-center justify-center group-hover:text-blue-300 group-hover:border-blue-500/50 transition-all shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.15)]">
                <Icons.Radar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
              <span className="bg-blue-950/80 text-blue-400 border border-blue-500/40 text-[9px] sm:text-[10px] lg:text-xs font-mono px-2.5 py-0.5 lg:py-1 rounded-lg uppercase font-bold tracking-wider shrink-0 shadow-[0_0_8px_rgba(37,99,235,0.25)]">
                ONLINE
              </span>
            </div>
            <div className="flex flex-col mt-2 lg:mt-3 min-w-0 flex-1 justify-end">
              <span className="font-bold text-xs sm:text-sm lg:text-base xl:text-lg break-words leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                {t.menu.onlineOps || "Сетевые операции"}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Блок «Быстрая игра» (Quick Play) — на десктопе занимает 100% ширины правой колонки */}
      <div className="w-full flex flex-col gap-2.5 sm:gap-3">
        {hasActiveGame && onResumeGame && (
          <button
            onClick={onResumeGame}
            className="w-full bg-gradient-to-r from-emerald-950/80 to-zinc-950/90 border border-emerald-500/50 hover:border-emerald-400 p-3.5 sm:p-4 rounded-2xl lg:rounded-3xl flex items-center justify-between shadow-[0_0_25px_rgba(16,185,129,0.2)] hover:scale-[1.01] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl bg-emerald-950/90 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0">
                <Icons.Play className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] sm:text-[10px] lg:text-xs font-mono uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  ДЕЛО ПРИОСТАНОВЛЕНО
                </span>
                <span className="text-xs sm:text-sm lg:text-base font-black uppercase tracking-wider text-white group-hover:text-blue-300 transition">
                  {t.menu.resume || "Возобновить"}
                </span>
              </div>
            </div>
            <Icons.ArrowRight />
          </button>
        )}

        <div className="w-full flex flex-col bg-zinc-950/70 hover:bg-zinc-950/90 border border-blue-500/30 hover:border-blue-400/60 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-[0_0_35px_rgba(37,99,235,0.12)] transition-all relative overflow-hidden group">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500" />

          <div className="relative z-10 flex flex-col">
            <h2 className="text-base sm:text-lg lg:text-2xl font-black text-white uppercase tracking-tight leading-tight mb-1 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {t.menu.quickPlay || "Быстрая игра"}
            </h2>
            <p className="text-[11px] sm:text-xs lg:text-sm text-zinc-400 leading-relaxed">
              Мгновенный вход в открытую партию со случайным соперником.
            </p>
          </div>

          <div className="relative z-10 w-full mt-3 sm:mt-4 lg:mt-5">
            <BiometricSlider
              onTrigger={onQuickPlay}
              disabled={isCreating}
              text={isCreating ? (t.menu.searching || "Поиск соперника...") : (t.menu.quickPlay || "Быстрая игра")}
              price={250}
            />
          </div>
        </div>
      </div>

      {/* 3. Кнопки «Справочник» и «Академия» (СТРОГО В САМОМ НИЗУ ПОД БЫСТРОЙ ИГРОЙ) */}
      <div className="w-full grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:gap-4 mt-auto">
        <button
          onClick={onOpenRules}
          className="h-11 sm:h-12 lg:h-14 rounded-2xl lg:rounded-3xl bg-zinc-950/70 hover:bg-zinc-900/80 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2.5 sm:gap-3 px-3 sm:px-4 text-zinc-300 hover:text-white cursor-pointer active:scale-[0.99] shadow-md group focus:outline-none focus:ring-2 focus:ring-blue-500/40 backdrop-blur-xl"
        >
          <div className="text-zinc-400 group-hover:text-blue-400 transition-colors shrink-0">
            <Icons.Shield className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
          </div>
          <div className="flex flex-col items-start leading-tight min-w-0">
            <span className="text-[11px] sm:text-xs lg:text-sm font-black uppercase tracking-widest text-zinc-200 group-hover:text-white truncate">
              {t.menu.rulebook || "Справочник"}
            </span>
            <span className="text-[9px] sm:text-[10px] lg:text-xs font-mono text-zinc-500 uppercase tracking-widest truncate">
              {t.menu.rulebookDesc || "Правила игры"}
            </span>
          </div>
        </button>

        <button
          onClick={onOpenTutorial}
          onPointerEnter={() => import("../TutorialScreen")}
          className="h-11 sm:h-12 lg:h-14 rounded-2xl lg:rounded-3xl bg-zinc-950/70 hover:bg-zinc-900/80 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2.5 sm:gap-3 px-3 sm:px-4 text-zinc-300 hover:text-white cursor-pointer active:scale-[0.99] shadow-md group focus:outline-none focus:ring-2 focus:ring-blue-500/40 backdrop-blur-xl"
        >
          <div className="text-zinc-400 group-hover:text-blue-400 transition-colors shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          </div>
          <div className="flex flex-col items-start leading-tight min-w-0">
            <span className="text-[11px] sm:text-xs lg:text-sm font-black uppercase tracking-widest text-zinc-200 group-hover:text-white truncate">
              {t.menu.tutorial || "Академия"}
            </span>
            <span className="text-[9px] sm:text-[10px] lg:text-xs font-mono text-zinc-500 uppercase tracking-widest truncate">
              {t.menu.tutorialDesc || "Обучающий курс"}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
