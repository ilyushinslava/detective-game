import React from 'react';
import type { UserProfile } from '../types/profile';
import { useTranslation } from '../i18n/context';
import { soundManager } from '../utils/audio';

interface ProfileScreenProps {
  profile: UserProfile;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onOpenSettings?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  onUpdateProfile,
  onOpenSettings,
}) => {
  const { t, lang, setLang } = useTranslation();

  const totalGames = (profile.stats?.wins || 0) + (profile.stats?.losses || 0);
  const winRate = totalGames > 0 ? Math.round(((profile.stats?.wins || 0) / totalGames) * 100) : 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#080a0f] text-zinc-100 overflow-y-auto p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-red-500 shadow-md">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-white">
                {t.nav.profile || 'ЛИЧНОЕ ДЕЛО'}
              </h2>
              <p className="text-[10px] md:text-xs font-mono text-zinc-500 uppercase tracking-widest">
                СЕКРЕТНЫЙ АРХИВ // ДОСЬЕ АГЕНТА
              </p>
            </div>
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                soundManager.play('tapMenu');
                onOpenSettings();
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold uppercase tracking-wider text-zinc-300 transition cursor-pointer flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>{t.menu?.settings || 'Настройки'}</span>
            </button>
          )}
        </div>

        <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-zinc-900 border-2 border-red-500/40 flex items-center justify-center text-red-500 font-mono text-3xl font-black shadow-[0_0_20px_rgba(220,38,38,0.2)] shrink-0">
            {profile.nickname ? profile.nickname.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="flex-1 flex flex-col gap-2 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <span className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">
                {profile.nickname}
              </span>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                {profile.rank || 'Стажёр'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Идентификатор дела: #{Math.abs(profile.nickname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 1000)).toString(16).toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-zinc-900/90 border border-white/10 rounded-xl px-4 py-3 shrink-0">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Баланс средств</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-emerald-400">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" />
                </svg>
                <span className="text-lg font-black font-mono text-white">
                  {profile.cash.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-950/70 border border-white/10 rounded-xl p-4 flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Всего дел</span>
            <span className="text-xl font-black font-mono text-white mt-1">{totalGames}</span>
          </div>
          <div className="bg-zinc-950/70 border border-white/10 rounded-xl p-4 flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Раскрыто</span>
            <span className="text-xl font-black font-mono text-emerald-400 mt-1">{profile.stats?.wins || 0}</span>
          </div>
          <div className="bg-zinc-950/70 border border-white/10 rounded-xl p-4 flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Провалено</span>
            <span className="text-xl font-black font-mono text-red-400 mt-1">{profile.stats?.losses || 0}</span>
          </div>
          <div className="bg-zinc-950/70 border border-white/10 rounded-xl p-4 flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Эффективность</span>
            <span className="text-xl font-black font-mono text-zinc-100 mt-1">{winRate}%</span>
          </div>
        </div>

        <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-2">
            Язык протокола
          </h3>
          <div className="flex gap-2">
            {(['ru', 'en'] as const).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  soundManager.play('tapMenu');
                  setLang(l);
                }}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-black uppercase tracking-widest transition cursor-pointer ${
                  lang === l
                    ? 'bg-zinc-800 border-zinc-500 text-white shadow-md'
                    : 'bg-zinc-900/60 border-white/5 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {l === 'ru' ? 'Русский' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
