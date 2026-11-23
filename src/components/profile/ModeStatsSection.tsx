// src/components/profile/ModeStatsSection.tsx
// Детальная статистика по игровым режимам и ролям (Neo-Noir)

import React from "react";
import type { DetailedGameStats, ModeStats } from "../../types/profile";
import { createDefaultDetailedStats } from "../../utils/achievementEngine";

export interface ModeStatsSectionProps {
  stats?: DetailedGameStats;
}

interface ModeCardData {
  id: string;
  title: string;
  subtitle: string;
  modeStats: ModeStats;
  themeColor: "sapphire" | "ruby" | "slate";
}

export const ModeStatsSection: React.FC<ModeStatsSectionProps> = ({ stats }) => {
  const safeStats = stats || createDefaultDetailedStats();
  const { modes, totalOnlineMatches, totalOnlineWins, totalTvMatches, totalTvWins, flawlessVictories, fastestWinSeconds, totalShifts } = safeStats;

  const modeCards: ModeCardData[] = [
    {
      id: "MANIAC_VS_OPERATIVE",
      title: "МАНЬЯК ПРОТИВ ОПЕРАТИВНИКА",
      subtitle: "Классическая дуэль на вычисление и блеф",
      modeStats: modes.MANIAC_VS_OPERATIVE,
      themeColor: "ruby",
    },
    {
      id: "THIEF_HUNT",
      title: "ОХОТА НА ВОРА",
      subtitle: "Ограбление сейфа и облава полиции",
      modeStats: modes.THIEF_HUNT,
      themeColor: "sapphire",
    },
    {
      id: "SECRET_SERVICE",
      title: "СПЕЦСЛУЖБЫ: ДИРЕКТИВА «НОЛЬ»",
      subtitle: "Перехват компромата и шпионская охота",
      modeStats: modes.SECRET_SERVICE,
      themeColor: "slate",
    },
  ];

  const onlineWinRate = totalOnlineMatches > 0 ? Math.round((totalOnlineWins / totalOnlineMatches) * 100) : 0;
  const tvWinRate = totalTvMatches > 0 ? Math.round((totalTvWins / totalTvMatches) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 sm:gap-4 shrink-0">
      {/* 3 карточки режимов */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-4">
        {modeCards.map((card) => {
          const total = card.modeStats.matches;
          const wins = card.modeStats.wins;
          const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

          const isRuby = card.themeColor === "ruby";
          const isSapphire = card.themeColor === "sapphire";

          const accentBadgeClass = isRuby
            ? "border-rose-500/30 text-rose-400 bg-rose-950/20"
            : isSapphire
            ? "border-blue-500/30 text-blue-400 bg-blue-950/20"
            : "border-slate-500/30 text-slate-300 bg-slate-900/40";

          const barColorClass = isRuby ? "bg-rose-600" : isSapphire ? "bg-blue-600" : "bg-slate-400";

          return (
            <div
              key={card.id}
              className="neo-card border-t-white/20 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-t-white/40 transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${accentBadgeClass}`}>
                    {total} МАТЧЕЙ
                  </span>
                  <span className="text-[10px] font-mono font-black text-zinc-300">
                    {winRate}% ПОБЕД
                  </span>
                </div>

                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-white mb-1">
                  {card.title}
                </h3>
                <p className="text-[11px] font-sans text-zinc-400 mb-3 leading-tight">
                  {card.subtitle}
                </p>
              </div>

              <div>
                {/* Индикатор побед */}
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-white/5 mb-2.5">
                  <div
                    className={`h-full ${barColorClass} transition-all duration-500`}
                    style={{ width: `${winRate}%` }}
                  />
                </div>

                {/* Серии побед и счетчики */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10px] font-mono">
                  <div className="flex flex-col">
                    <span className="text-zinc-500 uppercase">Побед / Поражений</span>
                    <span className="text-zinc-200 font-bold">
                      {wins} <span className="text-zinc-500">/</span> {card.modeStats.losses}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-zinc-500 uppercase">Серия (тек / лучш)</span>
                    <span className="text-zinc-200 font-bold">
                      {card.modeStats.currentStreak} <span className="text-zinc-500">/</span> {card.modeStats.bestStreak}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Сетка дополнительных тактических показателей (2x2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Онлайн мультиплеер */}
        <div className="neo-card border-t-white/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">ОНЛАЙН СЕТЬ</span>
            <span className="text-[10px] font-mono text-blue-400 font-bold">{onlineWinRate}%</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-zinc-100">
            {totalOnlineWins}{" "}
            <span className="text-[10px] font-mono text-zinc-500 font-normal">/ {totalOnlineMatches} игр</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            Дуэли телефон ↔ телефон
          </div>
        </div>

        {/* TV Party */}
        <div className="neo-card border-t-white/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">ТВ ВЕЧЕРИНКА</span>
            <span className="text-[10px] font-mono text-zinc-400 font-bold">{tvWinRate}%</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-zinc-100">
            {totalTvWins}{" "}
            <span className="text-[10px] font-mono text-zinc-500 font-normal">/ {totalTvMatches} игр</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            Синдикат на большом ТВ
          </div>
        </div>

        {/* Чистая работа (без ошибок) */}
        <div className="neo-card border-t-white/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">ЧИСТАЯ РАБОТА</span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">100%</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-zinc-100">
            {flawlessVictories}{" "}
            <span className="text-[10px] font-mono text-zinc-500 font-normal">побед</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            Без потери улик и ошибок
          </div>
        </div>

        {/* Блиц и сдвиги */}
        <div className="neo-card border-t-white/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">БЛИЦ-РЕКОРД</span>
            <span className="text-[10px] font-mono text-amber-400 font-bold">СКОРОСТЬ</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-zinc-100">
            {fastestWinSeconds !== null ? `${fastestWinSeconds} сек` : "—"}{" "}
            <span className="text-[10px] font-mono text-zinc-500 font-normal">({totalShifts} сдвигов)</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            Быстрейшая победа на поле
          </div>
        </div>
      </div>
    </div>
  );
};
