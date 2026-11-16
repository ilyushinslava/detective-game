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
  return (
    <>
      {/* ========================================================================= */}
      {/* 1. ДЕСКТОП (lg и выше) - СХЕМА «КЛАССИЧЕСКИЙ ХАБ»                         */}
      {/* flex flex-row gap-8 px-10 py-6 h-full                                     */}
      {/* ========================================================================= */}
      <main className="hidden lg:flex flex-row gap-8 px-10 py-6 h-full w-full max-w-[1700px] mx-auto select-none min-h-0 flex-1">
        {/* Левая колонка (60-65% ширины): Сетка главных игровых режимов */}
        <div className="w-[62%] xl:w-[65%] flex flex-col justify-between h-full min-h-0">
          {/* Сетка главных игровых режимов (2x2) */}
          <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
            {/* Карточка 1: Одиночные дела (PVE) */}
            <button
              onClick={onSelectSolo}
              className="rounded-3xl border border-white/10 hover:border-blue-500/50 bg-zinc-950/75 hover:bg-zinc-900/90 backdrop-blur-xl p-6 xl:p-8 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl active:scale-[0.99] group text-left relative overflow-hidden hover:shadow-[0_0_35px_rgba(37,99,235,0.25)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-14 h-14 xl:w-16 xl:h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-blue-400 group-hover:border-blue-500/40 transition-all shrink-0 shadow-lg">
                  <Icons.Cards className="w-7 h-7 xl:w-8 xl:h-8" />
                </div>
                <span className="bg-blue-950/70 text-blue-300 border border-blue-500/30 text-xs font-mono px-3 py-1 rounded-xl uppercase font-bold tracking-wider shrink-0 shadow-[0_0_12px_rgba(37,99,235,0.2)]">
                  ДЕЛО №1 • PVE
                </span>
              </div>

              <div className="flex flex-col mt-4">
                <h3 className="font-display font-black text-2xl xl:text-3xl text-white uppercase tracking-tight whitespace-normal leading-tight group-hover:text-blue-300 transition">
                  {t.menu.soloCases || "Одиночные дела"}
                </h3>
                <p className="text-xs xl:text-sm text-zinc-400 mt-2 leading-relaxed whitespace-normal">
                  Смертельное противостояние один на один против расчетливого ИИ-соперника в неоновом нуаре.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 group-hover:text-blue-300 transition">
                <span>НАЧАТЬ РАССЛЕДОВАНИЕ</span>
                <Icons.ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>

            {/* Карточка 2: На одном экране (PVP) */}
            <button
              onClick={onSelectLocalDuel}
              className="rounded-3xl border border-white/10 hover:border-purple-500/50 bg-zinc-950/75 hover:bg-zinc-900/90 backdrop-blur-xl p-6 xl:p-8 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl active:scale-[0.99] group text-left relative overflow-hidden hover:shadow-[0_0_35px_rgba(168,85,247,0.25)] focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-14 h-14 xl:w-16 xl:h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-purple-400 group-hover:border-purple-500/40 transition-all shrink-0 shadow-lg">
                  <Icons.Users className="w-7 h-7 xl:w-8 xl:h-8" />
                </div>
                <span className="bg-purple-950/70 text-purple-300 border border-purple-500/30 text-xs font-mono px-3 py-1 rounded-xl uppercase font-bold tracking-wider shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                  ДЕЛО №2 • PVP
                </span>
              </div>

              <div className="flex flex-col mt-4">
                <h3 className="font-display font-black text-2xl xl:text-3xl text-white uppercase tracking-tight whitespace-normal leading-tight group-hover:text-purple-300 transition">
                  {t.menu.localDuel || "На одном экране"}
                </h3>
                <p className="text-xs xl:text-sm text-zinc-400 mt-2 leading-relaxed whitespace-normal">
                  Локальная дуэль двух игроков на одном мониторе с закрытием шторки тайны личности.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 group-hover:text-purple-300 transition">
                <span>ОТКРЫТЬ ДУЭЛЬ</span>
                <Icons.ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>

            {/* Карточка 3: ТВ Режим (TV PARTY) */}
            <button
              onClick={onOpenTvParty}
              className="rounded-3xl border border-white/10 hover:border-red-500/50 bg-zinc-950/75 hover:bg-zinc-900/90 backdrop-blur-xl p-6 xl:p-8 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl active:scale-[0.99] group text-left relative overflow-hidden hover:shadow-[0_0_35px_rgba(239,68,68,0.25)] focus:outline-none focus:ring-2 focus:ring-red-500/40"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-14 h-14 xl:w-16 xl:h-16 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:text-red-300 group-hover:border-red-500/50 transition-all shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.25)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 xl:w-8 xl:h-8"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
                </div>
                <span className="bg-red-950/80 text-red-400 border border-red-500/40 text-xs font-mono px-3 py-1 rounded-xl uppercase font-bold tracking-wider shrink-0 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
                  ДЕЛО №3 • TV PARTY
                </span>
              </div>

              <div className="flex flex-col mt-4">
                <h3 className="font-display font-black text-2xl xl:text-3xl text-white uppercase tracking-tight whitespace-normal leading-tight group-hover:text-red-300 transition">
                  {t.menu.tvMode || "ТВ РЕЖИМ"}
                </h3>
                <p className="text-xs xl:text-sm text-zinc-400 mt-2 leading-relaxed whitespace-normal">
                  Большой дисплей ТВ как общее поле расследования и персональные пульты в смартфонах для компании.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 group-hover:text-red-300 transition">
                <span>ПОДКЛЮЧИТЬ ТВ ПАРТИЮ</span>
                <Icons.ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>

            {/* Карточка 4: Сетевые операции (ONLINE) */}
            <button
              onClick={onOpenOnline}
              className="rounded-3xl border border-white/10 hover:border-emerald-500/50 bg-zinc-950/75 hover:bg-zinc-900/90 backdrop-blur-xl p-6 xl:p-8 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl active:scale-[0.99] group text-left relative overflow-hidden hover:shadow-[0_0_35px_rgba(16,185,129,0.25)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-14 h-14 xl:w-16 xl:h-16 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:text-emerald-300 group-hover:border-emerald-500/50 transition-all shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <Icons.Radar className="w-7 h-7 xl:w-8 xl:h-8" />
                </div>
                <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-xs font-mono px-3 py-1 rounded-xl uppercase font-bold tracking-wider shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  ДЕЛО №4 • ONLINE
                </span>
              </div>

              <div className="flex flex-col mt-4">
                <h3 className="font-display font-black text-2xl xl:text-3xl text-white uppercase tracking-tight whitespace-normal leading-tight group-hover:text-emerald-300 transition">
                  {t.menu.onlineOps || "Сетевые операции"}
                </h3>
                <p className="text-xs xl:text-sm text-zinc-400 mt-2 leading-relaxed whitespace-normal">
                  Оперативные столы по шифрам комнат и глобальный подбор соперников в реальном времени.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 group-hover:text-emerald-300 transition">
                <span>ВОЙТИ В ОНЛАЙН СЕТЬ</span>
                <Icons.ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>
          </div>

          {/* Футер: Кнопки "Справочник" и "Обучение" аккуратно прижаты к левому нижнему углу */}
          <div className="flex items-center gap-4 mt-6 pt-5 border-t border-white/10 shrink-0">
            <button
              onClick={onOpenRules}
              className="h-12 px-5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900/90 border border-white/10 hover:border-white/25 transition-all flex items-center gap-3 text-zinc-300 hover:text-white cursor-pointer active:scale-[0.98] shadow-lg group backdrop-blur-xl hover:scale-[1.02]"
              title="Правила игры"
            >
              <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-blue-400 transition-colors shrink-0">
                <Icons.Shield className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-200 group-hover:text-white whitespace-normal">
                  {t.menu.rulebook || "Справочник"}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest whitespace-normal">
                  {t.menu.rulebookDesc || "Правила игры"}
                </span>
              </div>
            </button>

            <button
              onClick={onOpenTutorial}
              onPointerEnter={() => import("../TutorialScreen")}
              className="h-12 px-5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900/90 border border-white/10 hover:border-white/25 transition-all flex items-center gap-3 text-zinc-300 hover:text-white cursor-pointer active:scale-[0.98] shadow-lg group backdrop-blur-xl hover:scale-[1.02]"
              title="Обучающий курс"
            >
              <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-blue-400 transition-colors shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-200 group-hover:text-white whitespace-normal">
                  {t.menu.tutorial || "Академия"}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest whitespace-normal">
                  {t.menu.tutorialDesc || "Обучающий курс"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Правая колонка (35-40% ширины): Мультиплеерный блок */}
        <div className="w-[38%] xl:w-[35%] flex flex-col gap-6 h-full min-h-0 overflow-y-auto custom-scrollbar">
          {/* Блок «Быстрая игра» */}
          <div className="flex flex-col gap-3">
            {hasActiveGame && onResumeGame && (
              <button
                onClick={onResumeGame}
                className="w-full bg-gradient-to-r from-emerald-950/90 via-zinc-950 to-zinc-950 border border-emerald-500/50 hover:border-emerald-400 p-4 rounded-3xl flex items-center justify-between shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:scale-[1.02] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] shrink-0">
                    <Icons.Play className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      АКТИВНОЕ ДЕЛО В ПРОЦЕССЕ
                    </span>
                    <span className="text-base font-black uppercase tracking-wider text-white group-hover:text-emerald-300 transition whitespace-normal leading-tight">
                      {t.menu.resume || "Возобновить расследование"}
                    </span>
                  </div>
                </div>
                <Icons.ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            )}

            <div className="p-6 xl:p-8 rounded-3xl bg-zinc-950/75 border border-blue-500/30 hover:border-blue-500/50 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden group transition-all duration-300">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-[10px] xl:text-[11px] font-mono font-bold tracking-widest text-blue-300 uppercase mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span>МГНОВЕННЫЙ ОПЕРАТИВНЫЙ ПОДБОР</span>
                </div>

                <h2 className="text-3xl xl:text-4xl font-display font-black text-white uppercase tracking-tight leading-none mb-2 drop-shadow-md">
                  {t.menu.quickPlay || "Быстрая игра"}
                </h2>

                <p className="text-xs xl:text-sm text-zinc-400 leading-relaxed mb-6 whitespace-normal">
                  Автоматический вход в открытую дуэль против случайного соперника. Городская сетка 5×5 сгенерируется мгновенно после подтверждения отпечатка.
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
          <div className="rounded-3xl bg-zinc-950/65 border border-white/10 hover:border-white/20 backdrop-blur-xl p-6 shadow-2xl flex flex-col justify-between transition-all duration-300">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_12px_rgba(37,99,235,0.3)] shrink-0">
                    <Icons.Radar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-display font-bold uppercase tracking-wider text-white block">
                      Сетевые столы
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE ЭФИР
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300">
                  {onlineRoomsCount} комнат
                </span>
              </div>

              <p className="text-xs text-zinc-400 mt-4 leading-relaxed whitespace-normal">
                Подключайтесь к существующим открытым делам или создайте собственный приватный стол по 5-значному шифру.
              </p>

              <div className="mt-4 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-xs font-mono text-zinc-300">Пул комнат активен</span>
                </div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
                  PartyKit SSOT
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 mt-5">
              <button
                onClick={onOpenOnline}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 border border-blue-400/50 text-white font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>ОТКРЫТЬ СЕТЕВЫЕ СТОЛЫ</span>
                <Icons.ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 2. МОБИЛКА (до lg) - BOTTOM-HEAVY ЭРГОНОМИКА С CINEMATIC HERO ZONE       */}
      {/* ========================================================================= */}
      <main className="lg:hidden flex-1 flex flex-col justify-between px-3.5 sm:px-5 pt-2 pb-4 overflow-y-auto w-full select-none min-h-0 gap-3">
        {/* [ВЕРХНЯЯ ПОЛОВИНА]: Cinematic Hero Zone — Wicked City Neon Noir Cityscape */}
        <div className="flex-1 flex flex-col justify-center items-center py-2 px-3 text-center relative overflow-hidden select-none min-h-[140px] sm:min-h-[175px]">
          {/* Фоновый атмосферный туман и объемное свечение */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-32 rounded-full bg-blue-950/20 blur-3xl" />
            <div className="w-40 h-28 rounded-full bg-slate-900/30 blur-2xl translate-x-8 -translate-y-4" />
          </div>

          {/* Мрачный 3D/Изометрический Нуар-Город (Wicked City Skyline) с бесшовным растворением */}
          <div
            className="relative w-full max-w-[290px] sm:max-w-[330px] h-20 sm:h-24 flex items-end justify-center pointer-events-none"
            style={{
              maskImage: 'radial-gradient(ellipse 85% 75% at 50% 35%, black 35%, transparent 95%)',
              WebkitMaskImage: 'radial-gradient(ellipse 85% 75% at 50% 35%, black 35%, transparent 95%)',
            }}
          >
            {/* Перспективная кибер-сетка у основания */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_8px] [transform:perspective(150px)_rotateX(60deg)] opacity-50 pointer-events-none" />

            {/* Векторный силуэт мегаполиса со статичными приглушенными огнями */}
            <svg
              viewBox="0 0 320 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full object-contain relative z-10"
            >
              <defs>
                <linearGradient id="bgBuildingGrad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#090d16" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="midBuildingGrad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>
                <linearGradient id="facetBuildingGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="skylineGlow" x1="160" y1="0" x2="160" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#080a0f" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Фоновые башни (Дальний план) */}
              <rect x="25" y="32" width="28" height="68" fill="url(#bgBuildingGrad)" />
              <rect x="65" y="18" width="36" height="82" fill="url(#bgBuildingGrad)" />
              <rect x="145" y="10" width="42" height="90" fill="url(#bgBuildingGrad)" />
              <rect x="220" y="24" width="32" height="76" fill="url(#bgBuildingGrad)" />
              <rect x="268" y="38" width="26" height="62" fill="url(#bgBuildingGrad)" />

              {/* Лучи прожекторов в небе */}
              <polygon points="75,0 95,0 120,100 60,100" fill="url(#skylineGlow)" opacity="0.5" />
              <polygon points="230,0 245,0 270,100 210,100" fill="url(#skylineGlow)" opacity="0.35" />

              {/* Башня 1 (Слева) */}
              <rect x="10" y="46" width="32" height="54" fill="url(#midBuildingGrad)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
              <polygon points="10,46 22,38 42,38 42,46" fill="url(#facetBuildingGrad)" />
              <line x1="16" y1="52" x2="16" y2="85" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 6" opacity="0.3" />
              <line x1="24" y1="56" x2="24" y2="80" stroke="#64748b" strokeWidth="1" strokeDasharray="1 8" opacity="0.35" />

              {/* Башня 2 (Левый центр) */}
              <rect x="52" y="30" width="44" height="70" fill="url(#midBuildingGrad)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
              <polygon points="52,30 68,20 96,20 96,30" fill="url(#facetBuildingGrad)" />
              <line x1="74" y1="8" x2="74" y2="20" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <circle cx="74" cy="8" r="1.5" fill="#38bdf8" opacity="0.6" />
              <rect x="58" y="38" width="3" height="4" fill="#38bdf8" opacity="0.6" />
              <rect x="64" y="48" width="3" height="4" fill="#64748b" opacity="0.4" />
              <rect x="76" y="38" width="3" height="4" fill="#38bdf8" opacity="0.5" />
              <rect x="82" y="60" width="3" height="4" fill="#0284c7" opacity="0.5" />
              <rect x="58" y="72" width="3" height="4" fill="#64748b" opacity="0.35" />

              {/* Главная цитадель / Монолит Wicked City (Центр) */}
              <rect x="112" y="16" width="60" height="84" fill="#020617" stroke="rgba(255,255,255,0.1)" strokeWidth="0.75" />
              <polygon points="112,16 142,4 172,16" fill="url(#facetBuildingGrad)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
              <line x1="142" y1="0" x2="142" y2="4" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
              <circle cx="142" cy="0" r="1.5" fill="#38bdf8" opacity="0.7" />
              <line x1="142" y1="18" x2="142" y2="90" stroke="rgba(56,189,248,0.2)" strokeWidth="1" />
              <rect x="122" y="26" width="4" height="2" fill="#38bdf8" opacity="0.7" />
              <rect x="130" y="34" width="4" height="2" fill="#64748b" opacity="0.5" />
              <rect x="150" y="26" width="4" height="2" fill="#38bdf8" opacity="0.7" />
              <rect x="158" y="44" width="4" height="2" fill="#0284c7" opacity="0.5" />
              <rect x="122" y="52" width="4" height="2" fill="#64748b" opacity="0.4" />
              <rect x="150" y="60" width="4" height="2" fill="#38bdf8" opacity="0.5" />

              {/* Башня 4 (Правый центр) */}
              <rect x="188" y="28" width="46" height="72" fill="url(#midBuildingGrad)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
              <polygon points="188,28 210,18 234,28" fill="url(#facetBuildingGrad)" />
              <line x1="210" y1="10" x2="210" y2="18" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <circle cx="210" cy="10" r="1.5" fill="#64748b" opacity="0.6" />
              <line x1="196" y1="36" x2="196" y2="82" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 7" opacity="0.4" />
              <line x1="218" y1="40" x2="218" y2="76" stroke="#64748b" strokeWidth="1" strokeDasharray="2 9" opacity="0.35" />

              {/* Башня 5 (Справа) */}
              <rect x="250" y="44" width="36" height="56" fill="url(#midBuildingGrad)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
              <polygon points="250,44 268,36 286,44" fill="url(#facetBuildingGrad)" />
              <circle cx="268" cy="34" r="1.5" fill="#38bdf8" opacity="0.5" />
              <rect x="260" y="52" width="3" height="4" fill="#38bdf8" opacity="0.5" />
              <rect x="272" y="62" width="3" height="4" fill="#64748b" opacity="0.4" />
            </svg>

            {/* Мягкие градиентные переходы: низ и боковые стороны растворяются в фоне */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent z-20 pointer-events-none" />
            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-zinc-950 to-transparent z-20 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-zinc-950 to-transparent z-20 pointer-events-none" />
          </div>

          {/* Интеграция с типографикой: монолитная связка с растворяющимся основанием зданий */}
          <div className="flex flex-col items-center -mt-4 sm:-mt-5 z-20 relative">
            {/* Строгий микро-бейдж мегаполиса */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-px w-5 sm:w-8 bg-gradient-to-r from-transparent via-zinc-600 to-zinc-500" />
              <span className="text-[9px] font-mono font-semibold tracking-[0.25em] text-zinc-400 uppercase">
                WICKED CITY • СЕКТОР 01
              </span>
              <span className="h-px w-5 sm:w-8 bg-gradient-to-l from-transparent via-zinc-600 to-zinc-500" />
            </div>

            {/* Строгая, выверенная типографика */}
            <h2 className="text-sm sm:text-base font-display font-bold tracking-[0.22em] sm:tracking-[0.28em] text-zinc-200 uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] max-w-xs leading-snug">
              ТАКТИЧЕСКАЯ СТРАТЕГИЯ РАЗУМА
            </h2>

            <p className="text-[10px] sm:text-[11px] font-mono text-zinc-500 tracking-wide mt-1 max-w-[260px] sm:max-w-xs">
              Разоблачите цель или станьте призраком мегаполиса
            </p>
          </div>
        </div>

        {/* [НИЖНЯЯ ЧАСТЬ / THUMB-ZONE]: Интерактивный стек (снизу вверх: Быстрая игра, Сетка режимов, Справочник/Обучение) */}
        <div className="w-full flex flex-col gap-3 shrink-0">
          {/* [ЕЩЕ ВЫШЕ] Горизонтальный ряд «Справочник» и «Обучение» (наименее приоритетные кнопки) */}
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 sm:w-5 sm:h-5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
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

          {/* [НАД НИМ] Сетка 4-х режимов (2x2) */}
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 sm:w-5 sm:h-5"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
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

            {/* Режим 4: Сетевые операции (ONLINE) */}
            <button
              onClick={onOpenOnline}
              className="min-h-[92px] sm:min-h-[105px] border border-white/10 hover:border-blue-500/40 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-950/40 text-blue-400 border border-blue-500/30 flex items-center justify-center group-hover:text-blue-300 group-hover:border-blue-500/50 transition-all shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.15)]">
                  <Icons.Radar className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="bg-blue-950/80 text-blue-400 border border-blue-500/40 text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-lg uppercase font-bold tracking-wider shrink-0 shadow-[0_0_8px_rgba(37,99,235,0.25)]">
                  ONLINE
                </span>
              </div>
              <div className="flex flex-col mt-1.5 min-w-0 flex-1 justify-center">
                <span className="font-bold text-xs sm:text-sm whitespace-normal leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                  {t.menu.onlineOps || "Сетевые операции"}
                </span>
              </div>
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
