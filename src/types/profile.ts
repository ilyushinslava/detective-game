// src/types/profile.ts
// Интерфейс личного дела агента (UserProfile), статистики и достижений

export interface MatchHistoryEntry {
  id: string;
  matchId: string;
  mode: string;
  winnerRole: string;
  role: string;
  isWinner: boolean;
  mmrDelta: number;
  durationSeconds: number;
  createdAt: string;
}

export interface ModeStats {
  matches: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
}

export interface RoleStats {
  matches: number;
  wins: number;
}

export interface DetailedGameStats {
  modes: {
    MANIAC_VS_OPERATIVE: ModeStats;
    THIEF_HUNT: ModeStats;
    SECRET_SERVICE: ModeStats;
  };
  roles: {
    KILLER: RoleStats;       // Маньяк / Грабитель
    DETECTIVE: RoleStats;    // Оперативник / Полиция
    SPY: RoleStats;          // Агент спецслужбы
  };
  totalOnlineMatches: number;
  totalOnlineWins: number;
  totalTvMatches: number;
  totalTvWins: number;
  flawlessVictories: number;
  fastestWinSeconds: number | null;
  totalShifts: number;
}

export interface UserProfile {
  id: string;
  nickname: string;
  agentName?: string;
  avatar: string;
  avatarId?: string;
  level: number;
  xp: number;
  cash: number;
  chips: number;
  rank: string;
  mmr: number;
  matchesPlayed: number;
  winsDetective: number;
  winsManiac: number;
  stats: {
    wins: number;
    losses: number;
  };
  recentMatches?: MatchHistoryEntry[];
  unlockedAchievements?: string[];
  achievementProgress?: Record<string, number>;
  detailedStats?: DetailedGameStats;
}
