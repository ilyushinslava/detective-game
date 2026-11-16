import React from "react";
import type { UserProfile } from "../../types/profile";
import { Icons } from "../ui/Icons";

export interface LobbyHeaderProps {
  title: string;
  profile: UserProfile;
  onOpenProfile: () => void;
  onOpenDevPanel?: () => void;
  onOpenSettings: () => void;
}

export const LobbyHeader: React.FC<LobbyHeaderProps> = ({
  title,
  profile,
  onOpenProfile,
  onOpenDevPanel,
  onOpenSettings,
}) => {
  return (
    <header className="flex items-center justify-between lg:justify-end shrink-0 py-2 sm:py-3 mb-2 border-b border-white/5 w-full max-w-full gap-2">
      {/* Название игры (скрыто на десктопе в сплит-экране, отображается на мобильных) */}
      <div className="flex lg:hidden items-center gap-2 sm:gap-3.5 select-none min-w-0 flex-1 overflow-hidden pr-1 sm:pr-2">
        <span className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.85)] shrink-0" />
        <h1 className="text-base sm:text-2xl md:text-3xl font-black tracking-tight text-white uppercase leading-none drop-shadow-[0_2px_15px_rgba(0,0,0,0.9)] truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto lg:ml-0">
        {/* Agent Callsign / Dossier Pill (Hidden on mobile < sm) */}
        <button
          onClick={onOpenProfile}
          className="hidden sm:flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-white/10 hover:border-blue-500/40 hover:bg-zinc-800/80 transition cursor-pointer shadow-lg active:scale-95 group text-left shrink-0"
          title="Досье агента"
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center text-xs sm:text-sm shrink-0">
            {profile.avatar ? (
              profile.avatar
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-zinc-400">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] sm:text-xs font-black tracking-wider text-zinc-200 uppercase group-hover:text-white transition truncate max-w-[85px] sm:max-w-[120px]">
              {profile.nickname}
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 tracking-widest uppercase mt-0.5">
              {profile.rank || "Стажёр"}
            </span>
          </div>
        </button>

        {/* Dev Panel Cash Pill */}
        <div
          onClick={onOpenDevPanel}
          className="rounded-full bg-zinc-900/80 border border-white/10 hover:border-amber-500/40 hover:bg-zinc-800/80 px-2.5 sm:px-3.5 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 shadow-lg cursor-pointer transition active:scale-95 shrink-0"
          title="Открыть Dev-панель"
        >
          <Icons.Coin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
          <span className="text-zinc-100 font-mono text-[11px] sm:text-xs font-bold">{profile.cash.toLocaleString()}</span>
        </div>

        {/* Settings Cog Button */}
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 rounded-full bg-zinc-900/80 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:border-white/20 transition cursor-pointer shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shrink-0"
          title="Настройки"
        >
          <Icons.Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
