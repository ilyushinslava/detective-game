// src/components/profile/AchievementsSection.tsx
// Каталог достижений игрока с фильтрами, прогрессом и наградами в CR (Neo-Noir)

import React, { useState, useMemo } from "react";
import { ACHIEVEMENTS, type Achievement, type AchievementCategory } from "../../data/achievements";
import { Icons } from "../ui/Icons";
import { soundManager } from "../../utils/audio";
import { triggerHaptic } from "../../utils/haptics";

export interface AchievementsSectionProps {
  unlockedAchievements?: string[];
  achievementProgress?: Record<string, number>;
}

type FilterCategory = "ALL" | AchievementCategory;

interface CategoryFilterOption {
  id: FilterCategory;
  label: string;
}

const CATEGORY_FILTERS: CategoryFilterOption[] = [
  { id: "ALL", label: "ВСЕ" },
  { id: "MANIAC", label: "УБИЙЦА" },
  { id: "THIEF_HUNT", label: "ОЦЕПЛЕНИЕ" },
  { id: "SECRET_SERVICE", label: "ДИРЕКТИВА «НОЛЬ»" },
  { id: "STREAK", label: "СЕРИИ" },
  { id: "MASTERY", label: "МАСТЕРСТВО" },
  { id: "SPECIAL", label: "ОСОБЫЕ" },
];

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  unlockedAchievements = [],
  achievementProgress = {},
}) => {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("ALL");

  const unlockedSet = useMemo(() => new Set(unlockedAchievements), [unlockedAchievements]);

  // Расчет суммарной статистики по ачивкам
  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = unlockedSet.size;
  const overallPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const totalCoinsEarned = useMemo(() => {
    return ACHIEVEMENTS.reduce((acc, ach) => {
      return acc + (unlockedSet.has(ach.id) ? ach.rewardCoins : 0);
    }, 0);
  }, [unlockedSet]);

  const filteredAchievements = useMemo(() => {
    if (activeCategory === "ALL") return ACHIEVEMENTS;
    return ACHIEVEMENTS.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="flex flex-col gap-3 sm:gap-4 shrink-0">
      {/* Главная карточка прогресса достижений */}
      <div className="neo-card border-t-white/20 rounded-2xl p-3.5 sm:p-4 shadow-lg flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <circle cx="12" cy="8" r="6" />
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                ДОСТИЖЕНИЯ СИНДИКАТА
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                Получено {unlockedCount} из {totalCount} ({overallPercentage}%)
              </span>
            </div>
          </div>

          {/* Заработано CR */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-black">
            <Icons.Coin className="w-3.5 h-3.5 text-amber-400" />
            <span>+{totalCoinsEarned} CR</span>
          </div>
        </div>

        {/* Прогресс-бар общий */}
        <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>

      {/* Фильтр по категориям */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                soundManager.play("tapMenu");
                triggerHaptic("light");
                setActiveCategory(cat.id);
              }}
              className={`h-9 min-h-[36px] px-3 rounded-xl text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 touch-manipulation border ${
                isActive
                  ? "bg-white/15 border-white/30 text-white shadow-sm"
                  : "bg-zinc-900/80 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Список карточек достижений */}
      <div className="flex flex-col gap-2">
        {filteredAchievements.map((ach: Achievement) => {
          const isUnlocked = unlockedSet.has(ach.id);
          const currentProgress = Math.min(
            ach.maxProgress,
            achievementProgress[ach.id] || (isUnlocked ? ach.maxProgress : 0)
          );
          const progressPercent = ach.maxProgress > 0 ? Math.round((currentProgress / ach.maxProgress) * 100) : 0;

          return (
            <div
              key={ach.id}
              className={`neo-card rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-all ${
                isUnlocked
                  ? "border-t-amber-500/40 border-amber-500/20 bg-amber-950/10 shadow-md"
                  : "border-t-white/10 opacity-80 hover:opacity-100"
              }`}
            >
              {/* Иконка статуса */}
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  isUnlocked
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                    : "bg-zinc-900 border-white/10 text-zinc-600"
                }`}
              >
                {isUnlocked ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
              </div>

              {/* Инфо и прогресс-бар */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-xs sm:text-sm font-black uppercase tracking-wide truncate ${isUnlocked ? "text-white" : "text-zinc-300"}`}>
                    {ach.title}
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                    {currentProgress} / {ach.maxProgress}
                  </span>
                </div>

                <p className="text-[11px] font-sans text-zinc-400 line-clamp-1 leading-snug">
                  {ach.description}
                </p>

                {/* Прогресс-бар карточки */}
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-white/5 mt-0.5">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isUnlocked ? "bg-amber-400" : "bg-blue-600"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Бейдж награды */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                {isUnlocked ? (
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">
                    ВЫПОЛНЕНО
                  </span>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] font-mono font-black text-amber-400/90 px-2 py-0.5 rounded bg-zinc-900 border border-white/5">
                    <Icons.Coin className="w-3 h-3 text-amber-400" />
                    <span>+{ach.rewardCoins}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
