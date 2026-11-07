import React, { useState } from 'react';
import type { UserProfile } from '../types/profile';
import { useTranslation } from '../i18n/context';
import { soundManager } from '../utils/audio';
import { Button } from './ui/Button';

const Icons = {
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  UserLarge: ({ className = "w-10 h-10 text-cyan-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Coin: ({ className = "w-4 h-4 text-amber-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-zinc-400">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Trophy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-zinc-400">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 4h12v5a6 6 0 0 1-12 0V4z" />
    </svg>
  ),
  XCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-zinc-400">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-zinc-400">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Award: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-zinc-400">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
};

interface ProfileScreenProps {
  profile: UserProfile;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onOpenSettings?: () => void;
  onBack?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  onUpdateProfile,
  onOpenSettings,
  onBack,
}) => {
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(profile.nickname || '');

  const totalGames = (profile.stats?.wins || 0) + (profile.stats?.losses || 0);
  const winRate = totalGames > 0 ? Math.round(((profile.stats?.wins || 0) / totalGames) * 100) : 0;

  const handleSaveNickname = () => {
    const trimmed = nicknameInput.trim();
    if (trimmed) {
      onUpdateProfile({ nickname: trimmed });
    }
    setIsEditing(false);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#080a0f] text-zinc-100 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8 w-full max-w-full">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="h-9 px-2.5 text-zinc-400 hover:text-white gap-1.5 text-[10px] font-black uppercase tracking-widest shrink-0"
                title="Назад в главное меню"
              >
                <Icons.ChevronLeft />
                <span className="hidden sm:inline">Назад в штаб</span>
              </Button>
            )}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-zinc-900/90 border border-white/10 flex items-center justify-center text-cyan-400 shadow-md shrink-0">
                <Icons.User />
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wider text-white truncate">
                  {t.nav.profile || 'ЛИЧНОЕ ДЕЛО'}
                </h2>
              </div>
            </div>
          </div>

          {onOpenSettings && (
            <Button
              variant="secondary"
              onClick={() => {
                soundManager.play('tapMenu');
                onOpenSettings();
              }}
              className="h-9 px-3 text-xs gap-2 shrink-0 border border-white/10 hover:border-cyan-500/40"
            >
              <Icons.Settings />
              <span>{t.menu?.settings || 'Настройки'}</span>
            </Button>
          )}
        </div>

        {/* Dossier Hero Card */}
        <div className="bg-zinc-950/60 border border-white/10 hover:border-cyan-500/30 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col sm:flex-row items-center gap-6 backdrop-blur-md transition-all">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-900/90 border border-white/10 flex items-center justify-center shadow-inner shrink-0 select-none">
            <Icons.UserLarge className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400" />
          </div>

          <div className="flex-1 flex flex-col gap-2.5 text-center sm:text-left min-w-0 w-full">
            {isEditing ? (
              <div className="flex items-center gap-2 max-w-sm justify-center sm:justify-start">
                <input
                  type="text"
                  maxLength={16}
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  className="bg-zinc-900 border border-cyan-500/50 rounded-xl px-3 py-1.5 text-sm font-black text-white uppercase tracking-wider outline-none focus:ring-2 focus:ring-cyan-400/50"
                  autoFocus
                />
                <Button variant="secondary" onClick={handleSaveNickname} className="h-8 px-3 text-xs font-bold uppercase">
                  Сохранить
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                <span className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider truncate">
                  {profile.nickname}
                </span>
                <button
                  onClick={() => { setIsEditing(true); setNicknameInput(profile.nickname); }}
                  className="text-zinc-500 hover:text-cyan-400 transition-colors p-1"
                  title="Изменить позывной"
                >
                  <Icons.Edit />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 justify-center sm:justify-start text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                В СЕТИ
              </span>
              <span>•</span>
              <span className="truncate">
                ID: #{Math.abs(profile.nickname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 1000)).toString(16).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Statistics Grid (6 cards: 2 cols on mobile, 3 cols on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 1: Партий сыграно */}
          <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Партий сыграно</span>
              <Icons.Shield />
            </div>
            <span className="text-2xl font-black font-mono text-zinc-100">{totalGames}</span>
          </div>

          {/* Card 2: Побед */}
          <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Побед</span>
              <Icons.Trophy />
            </div>
            <span className="text-2xl font-black font-mono text-zinc-100">{profile.stats?.wins || 0}</span>
          </div>

          {/* Card 3: Поражений */}
          <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Поражений</span>
              <Icons.XCircle />
            </div>
            <span className="text-2xl font-black font-mono text-zinc-100">{profile.stats?.losses || 0}</span>
          </div>

          {/* Card 4: Винрейт */}
          <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Винрейт</span>
              <Icons.Activity />
            </div>
            <span className="text-2xl font-black font-mono text-zinc-100">{winRate}%</span>
          </div>

          {/* Card 5: Капитал / Баланс (amber) */}
          <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-amber-400 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Капитал</span>
              <Icons.Coin className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-2xl font-black font-mono text-amber-400">{profile.cash.toLocaleString()}</span>
          </div>

          {/* Card 6: Текущий ранг */}
          <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Текущий ранг</span>
              <Icons.Award />
            </div>
            <span className="text-xl sm:text-2xl font-black font-mono text-zinc-100 uppercase truncate">
              {profile.rank || 'СТАЖЁР'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
