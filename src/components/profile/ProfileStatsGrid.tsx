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
      <div className="neo-card border-t-white/20 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-t-white/40 transition-all duration-200">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">{p.rating}</span>
          <div className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
            <ProfileIcons.Award />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100">{currentMmr}</span>
        </div>
        <div className="w-full bg-zinc-900/90 h-1.5 rounded-full mt-2 overflow-hidden border border-white/5">
          <div
            className="bg-slate-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (currentMmr / 2000) * 100)}%` }}
          />
        </div>
      </div>

      {/* Винрейт */}
      <div className="neo-card border-t-white/20 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-t-white/40 transition-all duration-200">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">{p.winrate}</span>
          <div className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
            <ProfileIcons.Activity />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100">{winRate}%</span>
          <span className="text-[10px] font-mono text-zinc-500">({totalWins}/{totalGames})</span>
        </div>
        <div className="w-full bg-zinc-900/90 h-1.5 rounded-full mt-2 overflow-hidden border border-white/5">
          <div
            className="bg-slate-300 h-full rounded-full transition-all duration-500"
            style={{ width: `${winRate}%` }}
          />
        </div>
      </div>

      {/* Всего игр */}
      <div className="neo-card border-t-white/20 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-t-white/40 transition-all duration-200">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">{p.totalGames}</span>
          <div className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
            <ProfileIcons.Shield />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100">{totalGames}</span>
          <span className="text-[10px] font-mono text-zinc-500">{p.gamesUnit}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono mt-2">
          <span className="text-zinc-300 font-bold">{p.wins} <span>{totalWins}</span></span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 font-bold">{p.losses} <span>{Math.max(0, totalGames - totalWins)}</span></span>
        </div>
      </div>

      {/* Баланс сторон */}
      <div className="neo-card border-t-white/20 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-t-white/40 transition-all duration-200">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">{p.sideBalance}</span>
          <div className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
            <ProfileIcons.Trophy />
          </div>
        </div>
        <div className="flex items-baseline justify-between font-mono text-xs">
          <span className="text-slate-300 font-bold">{winsDet} <span className="text-[9px] text-zinc-500">{p.detective}</span></span>
          <span className="text-zinc-400 font-bold">{winsMan} <span className="text-[9px] text-zinc-500">{p.maniac}</span></span>
        </div>
        <div className="w-full bg-zinc-900/90 h-1.5 rounded-full mt-2 flex overflow-hidden border border-white/5">
          <div className="bg-slate-400 h-full" style={{ width: `${lawRatio}%` }} />
          <div className="bg-zinc-600 h-full" style={{ width: `${100 - lawRatio}%` }} />
        </div>
      </div>
    </div>
  );
};
