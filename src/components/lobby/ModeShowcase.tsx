import React from "react";
import { LobbyGrid } from "./LobbyGrid";
import { NetworkSidebar } from "./NetworkSidebar";
import { BiometricSlider } from "../BiometricSlider";
import { Icons } from "../ui/Icons";

export interface ModeShowcaseProps {
  title?: string;
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
  title,
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
      <main className="hidden lg:flex flex-col px-8 xl:px-10 py-4 w-full max-w-[1700px] mx-auto select-none flex-1 gap-4">
        {/* Десктопный Hero-блок с глубиной и тактическими слоями */}
        <div className="relative flex flex-col justify-center items-center py-5 px-6 text-center select-none overflow-hidden rounded-3xl border border-white/[0.04] bg-background-surface/20 backdrop-blur-sm">
          {/* Фоновая тактическая сетка */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] pointer-events-none -z-10" />
          {/* Мягкая рассеянная неоновая сфера (flare) */}
          <div className="absolute w-96 h-36 rounded-full bg-accent-primary/20 blur-3xl pointer-events-none -z-10" />
          {/* Полупрозрачный тактический прицел */}
          <div className="absolute pointer-events-none -z-10 text-white/[0.03]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-64 h-64">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="2 2" />
              <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2 2" />
            </svg>
          </div>

          <h1 className="text-4xl xl:text-5xl font-display font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-zinc-400 drop-shadow-[0_4px_25px_rgba(255,255,255,0.15)] leading-tight">
            {title || "ПОД ПОДОЗРЕНИЕМ"}
          </h1>
          <div className="text-xs sm:text-sm font-mono tracking-[0.3em] uppercase text-accent-primary font-bold mt-2">
            ТАКТИЧЕСКИЙ ДЕТЕКТИВ
          </div>
          <div className="w-36 h-px bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent my-2.5" />
          <p className="text-xs sm:text-sm font-sans text-zinc-300 tracking-wide leading-relaxed">
            Манипулируй. Вычисляй. Не выдавай себя.
          </p>
        </div>

        <div className="flex flex-row gap-x-10 xl:gap-x-14 w-full flex-1">
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
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 2. МОБИЛКА (до lg) - ОРИГИНАЛЬНАЯ BOTTOM-HEAVY THUMB-ZONE (СНИЗУ ВВЕРХ)   */}
      {/* ========================================================================= */}
      <main className="lg:hidden flex-1 flex flex-col justify-between px-3.5 sm:px-5 pt-2 pb-4 overflow-y-auto w-full select-none min-h-0 gap-3">
        {/* [ВЕРХНЯЯ ПОЛОВИНА]: Премиальная кинематографичная типографика (Cinematic Typography 2.0) */}
        <div className="relative flex-1 flex flex-col justify-center items-center py-7 sm:py-9 px-4 text-center select-none min-h-[180px] sm:min-h-[220px] my-1 overflow-hidden rounded-3xl border border-white/[0.04]">
          {/* Фоновая тактическая сетка */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] pointer-events-none -z-10" />
          {/* Мягкая рассеянная неоновая сфера (flare) прямо за названием игры */}
          <div className="absolute w-72 h-36 sm:w-96 sm:h-44 rounded-full bg-accent-primary/20 blur-3xl pointer-events-none -z-10" />
          {/* Очень бледный тактический водяной знак прицела */}
          <div className="absolute pointer-events-none -z-10 text-white/[0.03]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-56 h-56 sm:w-72 sm:h-72">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="2 2" />
              <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2 2" />
            </svg>
          </div>

          {/* Заголовок с градиентным металлическим блеском */}
          <h1 className="text-3xl xs:text-4xl sm:text-5xl font-display font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-zinc-400 drop-shadow-[0_4px_25px_rgba(255,255,255,0.15)] leading-tight max-w-[340px] xs:max-w-md sm:max-w-xl">
            {title || "ПОД ПОДОЗРЕНИЕМ"}
          </h1>

          {/* Подзаголовок прямо под названием */}
          <div className="text-xs sm:text-sm font-mono tracking-[0.25em] sm:tracking-[0.3em] uppercase text-accent-primary font-bold mt-2 sm:mt-2.5">
            ТАКТИЧЕСКИЙ ДЕТЕКТИВ
          </div>

          {/* Тонкий неоновый разделитель */}
          <div className="w-24 sm:w-36 h-px bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent my-3 sm:my-3.5" />

          {/* Лозунг игры */}
          <p className="text-xs sm:text-sm font-sans text-zinc-300 tracking-wide max-w-[280px] sm:max-w-sm leading-relaxed">
            Манипулируй. Вычисляй. Не выдавай себя.
          </p>
        </div>

        {/* [НИЖНЯЯ ЧАСТЬ / THUMB-ZONE]: Интерактивный стек (снизу вверх: Быстрая игра, Сетка режимов, Справочник/Обучение) */}
        <div className="w-full flex flex-col gap-3 shrink-0">
          {/* [ЕЩЕ ВЫШЕ] Горизонтальный ряд «Справочник» и «Обучение» */}
          {/* Верхняя панель: Справочник и Обучение */}
          <div className="w-full grid grid-cols-2 gap-2 sm:gap-2.5">
            <button
              onClick={onOpenRules}
              className="h-10 sm:h-11 rounded-2xl neo-card-interactive transition-all flex items-center justify-center gap-2 px-3 text-zinc-300 hover:text-white cursor-pointer active:scale-[0.99] group focus:outline-none"
            >
              <div className="text-zinc-400 group-hover:text-white transition-colors shrink-0">
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
              className="h-10 sm:h-11 rounded-2xl neo-card-interactive transition-all flex items-center justify-center gap-2 px-3 text-zinc-300 hover:text-white cursor-pointer active:scale-[0.99] group focus:outline-none"
            >
              <div className="text-zinc-400 group-hover:text-white transition-colors shrink-0">
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
              className="min-h-[92px] sm:min-h-[105px] neo-card-interactive rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-950/80 text-zinc-300 border border-white/10 flex items-center justify-center group-hover:text-white transition-all shrink-0 shadow-inner">
                <Icons.Cards className="w-4 h-4 sm:w-5 sm:h-5" />
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
              className="min-h-[92px] sm:min-h-[105px] neo-card-interactive rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-950/80 text-zinc-300 border border-white/10 flex items-center justify-center group-hover:text-white transition-all shrink-0 shadow-inner">
                <Icons.Users className="w-4 h-4 sm:w-5 sm:h-5" />
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
              className="col-span-2 min-h-[85px] sm:min-h-[95px] neo-card-interactive rounded-2xl p-3 sm:p-3.5 flex items-center justify-between hover:scale-[1.01] transition-all duration-200 cursor-pointer active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-950/80 text-rose-400 border border-rose-500/30 flex items-center justify-center group-hover:text-rose-300 transition-all shrink-0 shadow-inner">
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
              <Icons.ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 mr-1" />
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

              <div className="relative z-10 flex flex-col mb-2">
                <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  {t.menu.quickPlay || "Быстрая игра"}
                </h2>
                <p className="text-[9px] sm:text-[10px] text-zinc-400 leading-tight mt-0.5">
                  Мгновенный вход в дуэль 5×5
                </p>
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
