export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  level: number;
  xp: number;
  cash: number;
  chips: number;
  rank: string;
  stats: {
    wins: number;
    losses: number;
  };
}
