import React from 'react';
import { ProfileIcons } from './ProfileIcons';

export interface ProfileStatsGridProps {
  currentMmr: number;
  winRate: number;
  totalWins: number;
  totalGames: number;
  winsDet: number;
  winsMan: number;
  lawRatio: number;
  translations: {
    rating: string;
    winrate: string;
    totalGames: string;
    gamesUnit: string;
    wins: string;
    losses: string;
    sideBalance: string;
    detective: string;
    maniac: string;
  };
}

export const ProfileStatsGrid: React.FC<ProfileStatsGridProps> = ({
  currentMmr,
  winRate,
  totalWins,
  totalGames,
  winsDet,
  winsMan,
  lawRatio,
  translations: p,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {/* Рейтинг */}
      <div className="bg-gradient-to-br from-background-surface/90 to-transparent border border-border-subtle border-t border-t-border-strong rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-t-accent-primary/70 hover:shadow-neon-blue/20 hover:scale-[1.01] transition-all duration-200">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">{p.rating}</span>
          <div className="text-accent-primary">
            <ProfileIcons.Award />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100">{currentMmr}</span>
        </div>
        <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-accent-primary h-full rounded-full transition-all duration-500 shadow-neon-blue"
            style={{ width: `${Math.min(100, (currentMmr / 2000) * 100)}%` }}
          />
        </div>
      </div>

      {/* Винрейт */}
      <div className="bg-gradient-to-br from-background-surface/90 to-transparent border border-border-subtle border-t border-t-border-strong rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-t-accent-success/70 hover:shadow-neon-emerald/20 hover:scale-[1.01] transition-all duration-200">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">{p.winrate}</span>
          <div className="text-accent-success">
            <ProfileIcons.Activity />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100">{winRate}%</span>
          <span className="text-[10px] font-mono text-zinc-500">({totalWins}/{totalGames})</span>
        </div>
        <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-accent-success h-full rounded-full transition-all duration-500 shadow-neon-emerald"
            style={{ width: `${winRate}%` }}
          />
        </div>
      </div>

      {/* Всего игр */}
      <div className="bg-gradient-to-br from-background-surface/90 to-transparent border border-border-subtle border-t border-t-border-strong rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-t-accent-neon/70 hover:shadow-neon-cyan/20 hover:scale-[1.01] transition-all duration-200">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">{p.totalGames}</span>
          <div className="text-accent-neon">
            <ProfileIcons.Shield />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100">{totalGames}</span>
          <span className="text-[10px] font-mono text-zinc-500">{p.gamesUnit}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono mt-2">
          <span className="text-accent-success font-bold">{p.wins} <span>{totalWins}</span></span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 font-bold">{p.losses} <span>{Math.max(0, totalGames - totalWins)}</span></span>
        </div>
      </div>

      {/* Баланс сторон */}
      <div className="bg-gradient-to-br from-background-surface/90 to-transparent border border-border-subtle border-t border-t-border-strong rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-t-accent-purple/70 hover:scale-[1.01] transition-all duration-200">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">{p.sideBalance}</span>
          <div className="text-accent-warning">
            <ProfileIcons.Trophy />
          </div>
        </div>
        <div className="flex items-baseline justify-between font-mono text-xs">
          <span className="text-accent-primary font-bold">{winsDet} <span className="text-[9px] text-zinc-500">{p.detective}</span></span>
          <span className="text-accent-danger font-bold">{winsMan} <span className="text-[9px] text-zinc-500">{p.maniac}</span></span>
        </div>
        <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2 flex overflow-hidden">
          <div className="bg-accent-primary h-full" style={{ width: `${lawRatio}%` }} />
          <div className="bg-accent-danger h-full" style={{ width: `${100 - lawRatio}%` }} />
        </div>
      </div>
    </div>
  );
};
