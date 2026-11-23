// src/utils/achievementEngine.ts
// Автономный движок расчёта статистики и достижений Neo-Noir

import type { UserProfile, DetailedGameStats, ModeStats, RoleStats } from "../types/profile";
import { ACHIEVEMENTS, type Achievement } from "../data/achievements";

export interface MatchOutcomeContext {
  mode: string;
  role: string;
  isWin: boolean;
  durationSeconds: number;
  isOnline?: boolean;
  isTvParty?: boolean;
  isFlawless?: boolean;
  shiftsCount?: number;
}

export function createDefaultModeStats(): ModeStats {
  return {
    matches: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}

export function createDefaultRoleStats(): RoleStats {
  return {
    matches: 0,
    wins: 0,
  };
}

export function createDefaultDetailedStats(): DetailedGameStats {
  return {
    modes: {
      MANIAC_VS_OPERATIVE: createDefaultModeStats(),
      THIEF_HUNT: createDefaultModeStats(),
      SECRET_SERVICE: createDefaultModeStats(),
    },
    roles: {
      KILLER: createDefaultRoleStats(),
      DETECTIVE: createDefaultRoleStats(),
      SPY: createDefaultRoleStats(),
    },
    totalOnlineMatches: 0,
    totalOnlineWins: 0,
    totalTvMatches: 0,
    totalTvWins: 0,
    flawlessVictories: 0,
    fastestWinSeconds: null,
    totalShifts: 0,
  };
}

/**
 * Обеспечивает обратную совместимость со старыми профилями:
 * если detailedStats, unlockedAchievements или achievementProgress отсутствуют,
 * они корректно инициализируются без потери пользовательских монет и MMR.
 */
export function migrateProfileStats(profile: UserProfile): UserProfile {
  const detailed = profile.detailedStats || createDefaultDetailedStats();

  // Если у старого профиля были базовые счетчики, переносим их в default
  if (!profile.detailedStats) {
    if (profile.winsManiac > 0) {
      detailed.modes.MANIAC_VS_OPERATIVE.wins = profile.winsManiac;
      detailed.roles.KILLER.wins = profile.winsManiac;
    }
    if (profile.winsDetective > 0) {
      detailed.modes.MANIAC_VS_OPERATIVE.wins += profile.winsDetective;
      detailed.roles.DETECTIVE.wins = profile.winsDetective;
    }
    detailed.modes.MANIAC_VS_OPERATIVE.matches = profile.matchesPlayed || (detailed.modes.MANIAC_VS_OPERATIVE.wins + (profile.stats?.losses || 0));
  }

  return {
    ...profile,
    unlockedAchievements: Array.isArray(profile.unlockedAchievements)
      ? profile.unlockedAchievements
      : [],
    achievementProgress: profile.achievementProgress || {},
    detailedStats: detailed,
  };
}

export interface EvaluationResult {
  updatedProfile: UserProfile;
  newlyUnlocked: Achievement[];
}

/**
 * Оценивает прогресс достижений по итогам матча и начисляет награды в CR.
 * Гарантирует строгую защиту от повторной выдачи наград.
 */
export function evaluateAchievements(
  rawProfile: UserProfile,
  match: MatchOutcomeContext
): EvaluationResult {
  const profile = migrateProfileStats(rawProfile);
  const stats = { ...profile.detailedStats! };
  const modes = { ...stats.modes };
  const roles = { ...stats.roles };

  // 1. Обновление статистики по режимам
  const validMode =
    match.mode === "THIEF_HUNT" || match.mode === "SECRET_SERVICE"
      ? match.mode
      : "MANIAC_VS_OPERATIVE";

  const currentModeStats: ModeStats = { ...(modes[validMode] || createDefaultModeStats()) };
  currentModeStats.matches += 1;
  if (match.isWin) {
    currentModeStats.wins += 1;
    currentModeStats.currentStreak += 1;
    if (currentModeStats.currentStreak > currentModeStats.bestStreak) {
      currentModeStats.bestStreak = currentModeStats.currentStreak;
    }
  } else {
    currentModeStats.losses += 1;
    currentModeStats.currentStreak = 0;
  }
  modes[validMode] = currentModeStats;

  // 2. Обновление статистики по ролям
  let roleKey: "KILLER" | "DETECTIVE" | "SPY" = "DETECTIVE";
  if (validMode === "SECRET_SERVICE") {
    roleKey = "SPY";
  } else if (match.role === "KILLER" || match.role === "THIEF") {
    roleKey = "KILLER";
  } else {
    roleKey = "DETECTIVE";
  }

  const currentRoleStats: RoleStats = { ...(roles[roleKey] || createDefaultRoleStats()) };
  currentRoleStats.matches += 1;
  if (match.isWin) {
    currentRoleStats.wins += 1;
  }
  roles[roleKey] = currentRoleStats;

  // 3. Общие модификаторы (онлайн, ТВ, время, безупречность)
  let totalOnlineMatches = stats.totalOnlineMatches + (match.isOnline ? 1 : 0);
  let totalOnlineWins = stats.totalOnlineWins + (match.isOnline && match.isWin ? 1 : 0);
  let totalTvMatches = stats.totalTvMatches + (match.isTvParty ? 1 : 0);
  let totalTvWins = stats.totalTvWins + (match.isTvParty && match.isWin ? 1 : 0);
  let flawlessVictories = stats.flawlessVictories + (match.isWin && match.isFlawless ? 1 : 0);

  let fastestWinSeconds = stats.fastestWinSeconds;
  if (match.isWin && match.durationSeconds > 0) {
    fastestWinSeconds =
      fastestWinSeconds === null
        ? match.durationSeconds
        : Math.min(fastestWinSeconds, match.durationSeconds);
  }
  let totalShifts = stats.totalShifts + (match.shiftsCount || 0);

  const updatedStats: DetailedGameStats = {
    modes,
    roles,
    totalOnlineMatches,
    totalOnlineWins,
    totalTvMatches,
    totalTvWins,
    flawlessVictories,
    fastestWinSeconds,
    totalShifts,
  };

  // 4. Оценка условий всех достижений
  const unlockedSet = new Set(profile.unlockedAchievements || []);
  const progressMap: Record<string, number> = { ...(profile.achievementProgress || {}) };
  const newlyUnlocked: Achievement[] = [];
  let rewardCoinsTotal = 0;

  // Рассчитываем глобальный текущий стрик побед
  const globalStreak = match.isWin
    ? (progressMap["global_streak"] || 0) + 1
    : 0;
  progressMap["global_streak"] = globalStreak;

  for (const ach of ACHIEVEMENTS) {
    let currentProgress = progressMap[ach.id] || 0;

    switch (ach.id) {
      case "maniac_first_blood":
        currentProgress = roles.KILLER.wins >= 1 && validMode === "MANIAC_VS_OPERATIVE" ? 1 : currentProgress;
        break;
      case "maniac_cold_calculation":
        currentProgress = roles.KILLER.wins;
        break;
      case "operative_case_closed":
        currentProgress = roles.DETECTIVE.wins >= 1 && validMode === "MANIAC_VS_OPERATIVE" ? 1 : currentProgress;
        break;
      case "operative_chief_inspector":
        currentProgress = roles.DETECTIVE.wins;
        break;
      case "thief_night_heist":
        currentProgress = modes.THIEF_HUNT.wins >= 1 && roleKey === "KILLER" ? 1 : currentProgress;
        break;
      case "thief_shadow_phantom":
        currentProgress = roles.KILLER.wins;
        break;
      case "police_iron_grip":
        currentProgress = modes.THIEF_HUNT.wins >= 1 && roleKey === "DETECTIVE" ? 1 : currentProgress;
        break;
      case "police_curfew":
        currentProgress = roles.DETECTIVE.wins;
        break;
      case "spy_undercover":
        currentProgress = modes.SECRET_SERVICE.wins >= 1 ? 1 : currentProgress;
        break;
      case "spy_double_agent":
        currentProgress = modes.SECRET_SERVICE.wins;
        break;
      case "spy_kompromat_master":
        if (validMode === "SECRET_SERVICE" && match.isWin && match.isFlawless) {
          currentProgress = 1;
        }
        break;
      case "streak_triple":
        currentProgress = Math.min(ach.maxProgress, Math.max(currentProgress, globalStreak));
        break;
      case "streak_untouchable":
        currentProgress = Math.min(ach.maxProgress, Math.max(currentProgress, globalStreak));
        break;
      case "mastery_blitz":
        if (match.isWin && match.durationSeconds <= 60 && match.durationSeconds > 0) {
          currentProgress = 1;
        }
        break;
      case "mastery_flawless":
        if (match.isWin && match.isFlawless) {
          currentProgress = 1;
        }
        break;
      case "mastery_veteran":
        currentProgress = (profile.matchesPlayed + 1);
        break;
      case "special_radio_silence":
        currentProgress = totalOnlineWins;
        break;
      case "special_tv_syndicate":
        if (match.isTvParty || totalTvMatches > 0) {
          currentProgress = 1;
        }
        break;
      default:
        break;
    }

    progressMap[ach.id] = Math.min(ach.maxProgress, Math.max(progressMap[ach.id] || 0, currentProgress));

    // Проверка открытия и защиты от дублей
    if (!unlockedSet.has(ach.id) && progressMap[ach.id] >= ach.maxProgress) {
      unlockedSet.add(ach.id);
      newlyUnlocked.push(ach);
      rewardCoinsTotal += ach.rewardCoins;
    }
  }

  const updatedProfile: UserProfile = {
    ...profile,
    cash: profile.cash + rewardCoinsTotal,
    unlockedAchievements: Array.from(unlockedSet),
    achievementProgress: progressMap,
    detailedStats: updatedStats,
  };

  return {
    updatedProfile,
    newlyUnlocked,
  };
}
