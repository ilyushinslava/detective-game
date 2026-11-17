// src/types/profile.ts
// Интерфейс личного дела агента (UserProfile) и истории матчей

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
}
