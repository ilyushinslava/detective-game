import React from 'react';
import type { MatchHistoryEntry } from '../../types/profile';
import { ProfileIcons } from './ProfileIcons';

export interface MatchHistorySectionProps {
  recentMatches?: MatchHistoryEntry[];
  getModeLabel: (mode?: string) => string;
  formatDuration: (seconds: number) => string;
  translations: {
    recentMatches: string;
    gamesUnit: string;
    emptyHistory: string;
    rolePrefix: string;
    detective: string;
    maniac: string;
    win: string;
    loss: string;
  };
}

export const MatchHistorySection: React.FC<MatchHistorySectionProps> = ({
  recentMatches,
  getModeLabel,
  formatDuration,
  translations: p,
}) => {
  return (
    <div className="bg-gradient-to-br from-background-surface/90 to-background-main/80 border border-border-subtle border-t border-t-border-strong rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
            {p.recentMatches}
          </h3>
        </div>
        {recentMatches && recentMatches.length > 0 && (
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            {recentMatches.length} {p.gamesUnit}
          </span>
        )}
      </div>

      {recentMatches && recentMatches.length > 0 ? (
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          {recentMatches.map((match: MatchHistoryEntry, idx: number) => {
            const isWin = match.isWinner;
            return (
              <div
                key={match.id || `match_${idx}`}
                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all ${
                  isWin
                    ? 'bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/30'
                    : 'bg-rose-950/20 border-rose-500/20 hover:border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2 h-8 rounded-full shrink-0 ${isWin ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black uppercase tracking-wide text-zinc-200 truncate">
                      {getModeLabel(match.mode)}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                      <span>{p.rolePrefix} {match.role === 'DETECTIVE' ? p.detective : p.maniac}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <ProfileIcons.Clock />
                        {formatDuration(match.durationSeconds || 120)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-mono font-black ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {match.mmrDelta > 0 ? `+${match.mmrDelta}` : match.mmrDelta}
                  </span>
                  <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded border uppercase ${
                    isWin
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  }`}>
                    {isWin ? p.win : p.loss}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-zinc-500 font-mono text-xs">
          <ProfileIcons.Shield />
          <span>{p.emptyHistory}</span>
        </div>
      )}
    </div>
  );
};
