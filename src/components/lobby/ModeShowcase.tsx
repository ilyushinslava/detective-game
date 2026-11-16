import React, { useState } from "react";
import { LobbyGrid } from "./LobbyGrid";
import { NetworkSidebar } from "./NetworkSidebar";
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
  onlineRoomsCount?: number;
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
  onlineRoomsCount = 0,
  t,
}) => {
  const [isMobileAcademyOpen, setIsMobileAcademyOpen] = useState(false);

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. ДЕСКТОП (lg и выше) - СХЕМА «КЛАССИЧЕСКИЙ ХАБ»                         */}
      {/* ========================================================================= */}
      <main className="hidden lg:flex flex-row gap-x-12 xl:gap-x-16 px-10 py-6 w-full max-w-[1700px] mx-auto select-none flex-1">
        {/* Левая колонка: Ссылка на обучение/справочник + 4 главные карточки (PVE, PVP, TV PARTY, ONLINE) */}
        <LobbyGrid
          onSelectSolo={onSelectSolo}
          onSelectLocalDuel={onSelectLocalDuel}
          onOpenTvParty={onOpenTvParty}
          onOpenOnline={onOpenOnline}
          onOpenTutorial={onOpenTutorial}
          onOpenRules={onOpenRules}
          t={t}
        />

        {/* Правая колонка: Сетевой терминал (Быстрая игра + Сетевые столы) */}
        <NetworkSidebar
          hasActiveGame={hasActiveGame}
          onResumeGame={onResumeGame}
          isCreating={isCreating}
          onQuickPlay={onQuickPlay}
          onOpenOnline={onOpenOnline}
          onlineRoomsCount={onlineRoomsCount}
          t={t}
        />
      </main>

      {/* ========================================================================= */}
      {/* 2. МОБИЛКА (до lg) - ЧИСТЫЙ UX БЕЗ ДУБЛИРОВАНИЯ И МУСОРА                  */}
      {/* ========================================================================= */}
      <main className="lg:hidden flex-1 flex flex-col justify-between px-3.5 sm:px-5 pt-2 pb-4 overflow-y-auto w-full select-none min-h-0 gap-3">
        {/* [ВЕРХНЯЯ ЧАСТЬ]: Кинематографичный Hero (Cinematic Typography 2.0) */}
        <div className="flex-1 flex flex-col justify-center items-center py-5 sm:py-7 px-4 text-center select-none min-h-[140px] sm:min-h-[180px] border-y border-white/5 my-1">
          {/* Терминальный надзаголовок досье */}
          <div className="text-[10px] sm:text-[11px] font-mono text-zinc-500 tracking-[0.25em] uppercase mb-2.5 sm:mb-3">
            [ Уровень допуска: Секретно ]
          </div>

          {/* Заголовок */}
          <h2 className="text-xl sm:text-2xl font-display font-black tracking-[0.24em] sm:tracking-[0.3em] text-white uppercase leading-tight drop-shadow-[0_0_25px_rgba(56,189,248,0.3)] max-w-xs sm:max-w-sm">
            ТАКТИЧЕСКИЙ ДЕТЕКТИВ
          </h2>

          <div className="w-24 sm:w-32 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent my-2.5 sm:my-3" />

          {/* Подзаголовок по лору */}
          <p className="text-xs sm:text-sm font-sans text-zinc-300 tracking-wide max-w-[280px] sm:max-w-sm leading-relaxed">
            Манипулируй. Вычисляй. Не выдавай себя.
          </p>
        </div>

        {/* [НИЖНЯЯ ЧАСТЬ / THUMB-ZONE]: Интерактивный стек (Сетка 2×2 и Быстрая игра) */}
        <div className="w-full flex flex-col gap-3 shrink-0">
          {/* Сетка 4-х режимов (2x2) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
            {/* Режим 1: Одиночная (PVE) */}
            <button
              onClick={onSelectSolo}
              className="min-h-[92px] sm:min-h-[105px] border border-white/10 hover:border-white/25 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-900/90 text-zinc-300 border border-white/10 flex items-center justify-center group-hover:text-white group-hover:border-white/25 transition-all shrink-0 shadow-inner">
                  <Icons.Cards className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="bg-zinc-900/90 text-zinc-400 border border-white/10 text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-lg uppercase font-bold tracking-wider shrink-0">
                  PVE
                </span>
              </div>
              <div className="flex flex-col mt-1.5 min-w-0 flex-1 justify-center">
                <span className="font-bold text-xs sm:text-sm whitespace-normal leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                  {t.menu.soloCases || "Одиночные дела"}
                </span>
              </div>
            </button>

            {/* Режим 2: На одном экране (Pass & Play PVP) */}
            <button
              onClick={onSelectLocalDuel}
              className="min-h-[92px] sm:min-h-[105px] border border-white/10 hover:border-white/25 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-900/90 text-zinc-300 border border-white/10 flex items-center justify-center group-hover:text-white group-hover:border-white/25 transition-all shrink-0 shadow-inner">
                  <Icons.Users className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="bg-zinc-900/90 text-zinc-400 border border-white/10 text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-lg uppercase font-bold tracking-wider shrink-0">
                  PVP
                </span>
              </div>
              <div className="flex flex-col mt-1.5 min-w-0 flex-1 justify-center">
                <span className="font-bold text-xs sm:text-sm whitespace-normal leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                  {t.menu.localDuel || "На одном экране"}
                </span>
              </div>
            </button>

            {/* Режим 3: ТВ Режим (TV PARTY) */}
            <button
              onClick={onOpenTvParty}
              className="min-h-[92px] sm:min-h-[105px] border border-white/10 hover:border-red-500/40 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-red-500/40"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-950/40 text-red-400 border border-red-500/30 flex items-center justify-center group-hover:text-red-300 group-hover:border-red-500/50 transition-all shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 sm:w-5 sm:h-5">
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                    <polyline points="17 2 12 7 7 2" />
                  </svg>
                </div>
                <span className="bg-red-950/80 text-red-400 border border-red-500/40 text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-lg uppercase font-black tracking-wider shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.25)]">
                  TV PARTY
                </span>
              </div>
              <div className="flex flex-col mt-1.5 min-w-0 flex-1 justify-center">
                <span className="font-bold text-xs sm:text-sm whitespace-normal leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                  {t.menu.tvMode || "ТВ РЕЖИМ"}
                </span>
              </div>
            </button>

            {/* Режим 4: Академия (HQ) вместо дублированного онлайна */}
            <button
              onClick={() => setIsMobileAcademyOpen(true)}
              className="min-h-[92px] sm:min-h-[105px] border border-white/10 hover:border-amber-500/40 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-950/40 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:text-amber-300 group-hover:border-amber-500/50 transition-all shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 sm:w-5 sm:h-5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
                <span className="bg-amber-950/80 text-amber-400 border border-amber-500/40 text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-lg uppercase font-bold tracking-wider shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                  HQ
                </span>
              </div>
              <div className="flex flex-col mt-1.5 min-w-0 flex-1 justify-center">
                <span className="font-bold text-xs sm:text-sm whitespace-normal leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                  {t.menu.tutorial || "Академия"}
                </span>
              </div>
            </button>
          </div>

          {/* [САМЫЙ НИЗ] Блок «Быстрая игра» (100% ширины) */}
          <div className="w-full flex flex-col gap-2">
            {hasActiveGame && onResumeGame && (
              <button
                onClick={onResumeGame}
                className="w-full bg-gradient-to-r from-emerald-950/80 to-zinc-950/90 border border-emerald-500/50 hover:border-emerald-400 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between shadow-[0_0_25px_rgba(16,185,129,0.2)] hover:scale-[1.01] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-950/90 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0">
                    <Icons.Play />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      ДЕЛО ПРИОСТАНОВЛЕНО
                    </span>
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white group-hover:text-blue-300 transition whitespace-normal leading-tight">
                      {t.menu.resume || "Возобновить"}
                    </span>
                  </div>
                </div>
                <Icons.ArrowRight />
              </button>
            )}

            <div className="w-full flex flex-col bg-zinc-950/70 hover:bg-zinc-950/90 border border-blue-500/30 hover:border-blue-400/60 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 shadow-[0_0_35px_rgba(37,99,235,0.12)] transition-all relative overflow-hidden group">
              <div className="absolute -top-16 -right-16 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500" />

              <div className="relative z-10 flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                    {t.menu.quickPlay || "Быстрая игра"}
                  </h2>
                  <p className="text-[9px] sm:text-[10px] text-zinc-400 leading-tight">
                    Мгновенный вход в дуэль 5×5
                  </p>
                </div>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300">
                  FAST MATCH
                </span>
              </div>

              <div className="relative z-10 w-full mt-1">
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
      </main>

      {/* Мобильная модалка Академии */}
      {isMobileAcademyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-950/95 border border-amber-500/30 p-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
                <span className="font-display font-black text-base text-white uppercase tracking-tight">
                  {t.menu.tutorial || "Академия"}
                </span>
              </div>
              <button
                onClick={() => setIsMobileAcademyOpen(false)}
                className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <Icons.Close className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setIsMobileAcademyOpen(false);
                  onOpenTutorial();
                }}
                className="p-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 flex items-center justify-between text-left"
              >
                <div>
                  <span className="text-xs font-bold text-white uppercase block">
                    {t.menu.tutorial || "Обучающий курс"}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {t.menu.tutorialDesc || "Обучение базовым тактикам"}
                  </span>
                </div>
                <Icons.ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
              </button>

              {onOpenRules && (
                <button
                  onClick={() => {
                    setIsMobileAcademyOpen(false);
                    onOpenRules();
                  }}
                  className="p-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 flex items-center justify-between text-left"
                >
                  <div>
                    <span className="text-xs font-bold text-white uppercase block">
                      {t.menu.rulebook || "Справочник регламента"}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {t.menu.rulebookDesc || "Полный свод правил 4-х дел"}
                    </span>
                  </div>
                  <Icons.ArrowRight className="w-4 h-4 text-blue-400 shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
