import React from "react";
import type { UserProfile } from "../../types/profile";
import { Icons } from "../ui/Icons";
import { getCharacterPortraitPath } from "../../constants/characterImages";
import { useAuthSafe } from "../../contexts/AuthContext";
import { useTranslation } from "../../i18n/context";

export interface LobbyHeaderProps {
  title?: string;
  profile: UserProfile;
  onOpenProfile: () => void;
  onOpenDevPanel?: () => void;
  onOpenSettings: () => void;
  onOpenLogin?: () => void;
}

export const LobbyHeader: React.FC<LobbyHeaderProps> = ({
  profile,
  onOpenProfile,
  onOpenDevPanel,
  onOpenSettings,
  onOpenLogin,
}) => {
  const { isAnonymous } = useAuthSafe();
  const { t } = useTranslation();
  const h = t?.lobbyHeader || {
    profileTitle: "Профиль игрока",
    openDevPanel: "Открыть Dev-панель",
    settings: "Настройки",
    signIn: "Войти",
    defaultRank: "Стажёр",
  };

  return (
    <header className="flex items-center justify-end shrink-0 py-2 sm:py-3 px-3 sm:px-6 lg:px-10 border-b border-white/[0.06] w-full max-w-full gap-2 sm:gap-3 bg-zinc-950/40 backdrop-blur-md z-30">
      {/* Правая группа: Профиль, баланс, настройки */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
        {/* Profile Pill */}
        {(() => {
          const avatarKey = profile.avatarId || profile.avatar;
          const isPortrait = avatarKey && avatarKey.startsWith('c');
          const portraitUrl = isPortrait ? getCharacterPortraitPath(avatarKey) : null;

          return (
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-background-surface/80 border border-border-strong hover:border-accent-primary/50 hover:bg-zinc-800/80 transition cursor-pointer shadow-lg active:scale-95 group text-left shrink-0"
              title={h.profileTitle}
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center text-xs sm:text-sm shrink-0 overflow-hidden">
                {portraitUrl ? (
                  <img src={portraitUrl} alt={h.profileTitle} className="w-full h-full object-cover" />
                ) : profile.avatar ? (
                  profile.avatar
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-zinc-400">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] sm:text-xs font-black tracking-wider text-zinc-200 uppercase group-hover:text-white transition truncate max-w-[65px] sm:max-w-[120px]">
                  {profile.agentName || profile.nickname}
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono text-zinc-500 tracking-widest uppercase mt-0.5">
                  {profile.rank || h.defaultRank}
                </span>
              </div>
            </button>
          );
        })()}

        {/* Dev Panel Cash Pill (кликабелен только в DEV-режиме) */}
        <div
          onClick={import.meta.env.DEV ? onOpenDevPanel : undefined}
          className={`rounded-full bg-zinc-900/80 border border-white/10 px-2.5 sm:px-3.5 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 shadow-lg shrink-0 ${
            import.meta.env.DEV
              ? "hover:border-amber-500/40 hover:bg-zinc-800/80 cursor-pointer transition active:scale-95"
              : ""
          }`}
          title={import.meta.env.DEV ? h.openDevPanel : undefined}
        >
          <Icons.Coin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
          <span className="text-zinc-100 font-mono text-[11px] sm:text-xs font-bold">{profile.cash.toLocaleString()}</span>
        </div>

        {/* Login Pill (if anonymous) */}
        {isAnonymous && onOpenLogin && (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-950/40 border border-blue-500/30 hover:border-blue-400 text-blue-300 hover:text-white text-[10px] sm:text-xs font-mono font-bold uppercase transition cursor-pointer shadow-md active:scale-95 shrink-0"
            title={h.signIn}
          >
            {h.signIn}
          </button>
        )}

        {/* Settings Cog Button */}
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 rounded-full bg-zinc-900/80 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:border-white/20 transition cursor-pointer shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shrink-0"
          title={h.settings}
        >
          <Icons.Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
