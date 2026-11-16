import React from "react";
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
  onOpenOnline?: () => void;
  onlineRoomsCount?: number;
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
  onlineRoomsCount = 0,
  onOpenRules,
  onOpenTutorial,
  t,
}) => {
  return (
    <>
      {/* ========================================================================= */}
      {/* 1. ДЕСКТОП (lg и выше) - СХЕМА «ШТАБ: ЛОКАЛЬНЫЙ ХАБ И БЫСТРЫЕ ДЕЙСТВИЯ»    */}
      {/* ========================================================================= */}
      <main className="hidden lg:flex flex-row gap-x-10 xl:gap-x-14 px-8 xl:px-10 py-5 w-full max-w-[1700px] mx-auto select-none flex-1">
        {/* Левая колонка: Обучение/Справочник + Сетка 3-х режимов (PVE, PVP, TV широкий) */}
        <LobbyGrid
          onSelectSolo={onSelectSolo}
          onSelectLocalDuel={onSelectLocalDuel}
          onOpenTvParty={onOpenTvParty}
          onOpenTutorial={onOpenTutorial}
          onOpenRules={onOpenRules}
          t={t}
        />

        {/* Правая колонка: Терминал быстрого доступа (Быстрая игра + сетевые столы) */}
        <NetworkSidebar
          hasActiveGame={hasActiveGame}
          onResumeGame={onResumeGame}
          isCreating={isCreating}
          onQuickPlay={onQuickPlay}
          onOpenOnline={onOpenOnline || (() => {})}
          onlineRoomsCount={onlineRoomsCount}
          t={t}
        />
      </main>

      {/* ========================================================================= */}
      {/* 2. МОБИЛКА (до lg) - ОРИГИНАЛЬНАЯ BOTTOM-HEAVY THUMB-ZONE (СНИЗУ ВВЕРХ)   */}
      {/* ========================================================================= */}
      <main className="lg:hidden flex-1 flex flex-col justify-between px-3.5 sm:px-5 pt-2 pb-4 overflow-y-auto w-full select-none min-h-0 gap-3">
        {/* [ВЕРХНЯЯ ПОЛОВИНА]: Премиальная кинематографичная типографика (Cinematic Typography 2.0) */}
        <div className="flex-1 flex flex-col justify-center items-center py-6 sm:py-8 px-4 text-center select-none min-h-[160px] sm:min-h-[200px] border-y border-white/5 my-1">
          {/* Терминальный надзаголовок (kicker) досье */}
          <div className="text-[10px] sm:text-[11px] font-mono text-zinc-500 tracking-[0.25em] uppercase mb-3 sm:mb-4">
            [ Уровень допуска: Секретно ]
          </div>

          {/* Заголовок с деликатным нео-нуар свечением */}
          <h2 className="text-xl sm:text-2xl font-display font-black tracking-[0.24em] sm:tracking-[0.3em] text-white uppercase leading-tight drop-shadow-[0_0_25px_rgba(56,189,248,0.3)] max-w-xs sm:max-w-sm">
            ТАКТИЧЕСКИЙ ДЕТЕКТИВ
          </h2>

          {/* Элегантный тонкий разделитель с градиентом к акцентному цвету */}
          <div className="w-24 sm:w-32 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent my-3 sm:my-3.5" />

          {/* Подзаголовок по лору игры */}
          <p className="text-xs sm:text-sm font-sans text-zinc-300 tracking-wide max-w-[280px] sm:max-w-sm leading-relaxed">
            Манипулируй. Вычисляй. Не выдавай себя.
          </p>
        </div>

        {/* [НИЖНЯЯ ЧАСТЬ / THUMB-ZONE]: Интерактивный стек (снизу вверх: Быстрая игра, Сетка режимов, Справочник/Обучение) */}
        <div className="w-full flex flex-col gap-3 shrink-0">
          {/* [ЕЩЕ ВЫШЕ] Горизонтальный ряд «Справочник» и «Обучение» */}
          <div className="w-full grid grid-cols-2 gap-2 sm:gap-2.5">
            <button
              onClick={onOpenRules}
              className="h-10 sm:h-11 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900/80 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 px-3 text-zinc-300 hover:text-white cursor-pointer active:scale-[0.99] shadow-md group focus:outline-none focus:ring-2 focus:ring-blue-500/40 backdrop-blur-xl"
            >
              <div className="text-zinc-400 group-hover:text-blue-400 transition-colors shrink-0">
                <Icons.Shield />
              </div>
              <div className="flex flex-col items-start leading-tight min-w-0">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-200 group-hover:text-white whitespace-normal">
                  {t.menu.rulebook || "Справочник"}
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono text-zinc-500 uppercase tracking-widest whitespace-normal">
                  {t.menu.rulebookDesc || "Правила игры"}
                </span>
              </div>
            </button>

            <button
              onClick={onOpenTutorial}
              onPointerEnter={() => import("../TutorialScreen")}
              className="h-10 sm:h-11 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900/80 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 px-3 text-zinc-300 hover:text-white cursor-pointer active:scale-[0.99] shadow-md group focus:outline-none focus:ring-2 focus:ring-blue-500/40 backdrop-blur-xl"
            >
              <div className="text-zinc-400 group-hover:text-blue-400 transition-colors shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 sm:w-5 sm:h-5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="flex flex-col items-start leading-tight min-w-0">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-200 group-hover:text-white whitespace-normal">
                  {t.menu.tutorial || "Академия"}
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono text-zinc-500 uppercase tracking-widest whitespace-normal">
                  {t.menu.tutorialDesc || "Обучающий курс"}
                </span>
              </div>
            </button>
          </div>

          {/* [НАД НИМ] Сетка 3-х режимов: 2 карточки сверху + 1 широкая карточка ТВ снизу */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
            {/* Режим 1 (1 колонка): Одиночная (PVE) */}
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

            {/* Режим 2 (1 колонка): На одном экране (Pass & Play PVP) */}
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

            {/* Режим 3 (2 колонки - широкий ТВ-режим): ТВ Режим (TV PARTY) */}
            <button
              onClick={onOpenTvParty}
              className="col-span-2 min-h-[85px] sm:min-h-[95px] border border-white/10 hover:border-red-500/40 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 flex items-center justify-between hover:scale-[1.01] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-red-500/40"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-950/40 text-red-400 border border-red-500/30 flex items-center justify-center group-hover:text-red-300 group-hover:border-red-500/50 transition-all shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 sm:w-5 sm:h-5">
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                    <polyline points="17 2 12 7 7 2" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs sm:text-sm whitespace-normal leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                    {t.menu.tvMode || "ТВ РЕЖИМ"}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-0.5 truncate">
                    Большой ТВ-экран и пульты в смартфонах
                  </span>
                </div>
              </div>
              <span className="bg-red-950/80 text-red-400 border border-red-500/40 text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-lg uppercase font-black tracking-wider shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.25)] ml-2">
                TV PARTY
              </span>
            </button>
          </div>

          {/* [САМЫЙ НИЗ] Блок «Быстрая игра» (100% ширины, максимальный приоритет под большим пальцем) */}
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
    </>
  );
};
