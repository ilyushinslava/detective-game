import React, { useState } from 'react';
import type { UserProfile, MatchHistoryEntry } from '../types/profile';
import { useTranslation } from '../i18n/context';
import { soundManager } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';
import { Button } from './ui/Button';
import { getCharacterPortraitPath } from '../constants/characterImages';
import { useAuthSafe } from '../contexts/AuthContext';
import { LoginModal } from './lobby/LoginModal';

// Список доступных аватаров (50 уникальных портретов персонажей без текстовых меток)
export const AGENT_AVATARS = Array.from({ length: 50 }, (_, i) => ({ id: `c${i + 1}` }));

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
  Shield: ({ className = "w-4 h-4 text-zinc-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Trophy: ({ className = "w-4 h-4 text-amber-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 4h12v5a6 6 0 0 1-12 0V4z" />
    </svg>
  ),
  Activity: ({ className = "w-4 h-4 text-emerald-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Award: ({ className = "w-4 h-4 text-amber-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
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
  Camera: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-zinc-500">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

export interface ProfileScreenProps {
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
  const [nicknameInput, setNicknameInput] = useState(profile.agentName || profile.nickname || '');
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  // Логика аутентификации и защиты аккаунта
  const { isAnonymous, linkAccount } = useAuthSafe();
  const [accountLogin, setAccountLogin] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isAccountLinking, setIsAccountLinking] = useState(false);
  const [isAccountProtectedSuccess, setIsAccountProtectedSuccess] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLinkAccount = async () => {
    setAccountError(null);
    setIsAccountLinking(true);
    try {
      const res = await linkAccount(accountLogin, accountPassword);
      if (res.success) {
        soundManager.play('confirm');
        triggerHaptic('success');
        setIsAccountProtectedSuccess(true);
      } else {
        soundManager.play('error');
        triggerHaptic('warning');
        setAccountError(res.error || 'Ошибка привязки аккаунта');
      }
    } catch (err: any) {
      soundManager.play('error');
      triggerHaptic('warning');
      setAccountError(err?.message || 'Ошибка сети');
    } finally {
      setIsAccountLinking(false);
    }
  };

  // Расчет статистики
  const totalGames = profile.matchesPlayed || (profile.stats?.wins || 0) + (profile.stats?.losses || 0);
  const totalWins = (profile.winsDetective || 0) + (profile.winsManiac || 0) || (profile.stats?.wins || 0);
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const currentMmr = profile.mmr ?? 1000;
  const winsDet = profile.winsDetective ?? profile.stats?.wins ?? 0;
  const winsMan = profile.winsManiac ?? 0;
  const lawVsSyndicateTotal = winsDet + winsMan;
  const lawRatio = lawVsSyndicateTotal > 0 ? Math.round((winsDet / lawVsSyndicateTotal) * 100) : 50;

  const currentAvatarId = profile.avatarId || (profile.avatar?.startsWith('c') ? profile.avatar : 'c1');
  const avatarPortraitUrl = getCharacterPortraitPath(currentAvatarId);

  const handleSaveNickname = () => {
    const trimmed = nicknameInput.trim();
    if (trimmed) {
      soundManager.play('click');
      triggerHaptic('success');
      onUpdateProfile({ nickname: trimmed, agentName: trimmed });
    }
    setIsEditing(false);
  };

  const handleSelectAvatar = (avatarId: string) => {
    soundManager.play('click');
    triggerHaptic('light');
    onUpdateProfile({ avatarId, avatar: avatarId });
    setIsAvatarPickerOpen(false);
  };

  // Форматирование времени матча
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}м ${s.toString().padStart(2, '0')}с`;
  };

  // Название режима
  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'MANIAC_VS_OPERATIVE': return 'Маньяк против Оперативника';
      case 'THIEF_HUNT': return 'Охота на грабителя';
      case 'SECRET_SERVICE': return 'Директива «Ноль»';
      case 'LINE_UP': return 'Очная ставка';
      default: return mode;
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#080a0f] text-zinc-100 overflow-y-auto custom-scrollbar p-3 sm:p-5 md:p-6 lg:p-8 w-full max-w-full pb-28 lg:pb-12 touch-manipulation select-none">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-4 sm:gap-6">
        
        {/* Верхняя панель */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="h-9 px-2 text-zinc-400 hover:text-white gap-1 text-[10px] font-black uppercase tracking-widest shrink-0"
                title="Назад"
              >
                <Icons.ChevronLeft />
                <span className="hidden sm:inline">Назад</span>
              </Button>
            )}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300 shadow-sm shrink-0">
                <Icons.User />
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wider text-white truncate">
                  {t.nav.profile || 'ПРОФИЛЬ ИГРОКА'}
                </h2>
              </div>
            </div>
          </div>

          {onOpenSettings && (
            <Button
              variant="secondary"
              onClick={() => {
                soundManager.play('tapMenu');
                triggerHaptic('light');
                onOpenSettings();
              }}
              className="h-9 px-3 text-xs gap-1.5 shrink-0 border border-white/10 hover:border-white/20 active:scale-95"
            >
              <Icons.Settings />
              <span className="hidden sm:inline">{t.menu?.settings || 'Настройки'}</span>
            </Button>
          )}
        </div>

        {/* Карточка профиля */}
        <div className="relative bg-zinc-950/80 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-[inset_0_2px_25px_rgba(0,0,0,0.9)] backdrop-blur-xl flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 overflow-hidden">
          {/* Портрет игрока */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-900 border-2 border-white/15 p-1 shadow-md overflow-hidden flex items-center justify-center relative">
              <img
                src={avatarPortraitUrl}
                alt={profile.agentName || profile.nickname}
                className="w-full h-full object-cover rounded-xl filter contrast-110"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* Кнопка смены аватара */}
            <button
              onClick={() => {
                soundManager.play('click');
                triggerHaptic('light');
                setIsAvatarPickerOpen(true);
              }}
              className="absolute -bottom-2 -right-2 bg-zinc-800 border border-white/20 hover:border-white/40 text-zinc-300 hover:text-white p-2 rounded-xl shadow-lg active:scale-90 transition cursor-pointer"
              title="Сменить аватар"
            >
              <Icons.Camera />
            </button>
          </div>

          {/* Имя и статус */}
          <div className="flex-1 flex flex-col gap-2 text-center sm:text-left min-w-0 w-full">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-zinc-300 font-bold">
                {profile.rank || 'СТАЖЁР'}
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                УРОВЕНЬ {profile.level || 1}
              </span>
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2 max-w-sm justify-center sm:justify-start">
                <input
                  type="text"
                  maxLength={18}
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                  className="bg-zinc-900 border border-blue-500/50 focus:border-blue-400 rounded-xl px-3 py-1.5 text-sm font-black text-white uppercase tracking-wider outline-none shadow-inner"
                  autoFocus
                />
                <Button variant="primary" onClick={handleSaveNickname} className="h-8 px-3 text-xs font-bold uppercase active:scale-95">
                  Сохранить
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-wider truncate">
                  {profile.agentName || profile.nickname}
                </h1>
                <button
                  onClick={() => {
                    soundManager.play('click');
                    triggerHaptic('light');
                    setIsEditing(true);
                    setNicknameInput(profile.agentName || profile.nickname);
                  }}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 active:scale-90"
                  title="Изменить позывной"
                >
                  <Icons.Edit />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 justify-center sm:justify-start text-xs font-mono text-zinc-400 flex-wrap">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                В сети
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Icons.Coin className="w-3.5 h-3.5 text-amber-400" />
                {profile.cash.toLocaleString()} $
              </span>
            </div>
          </div>
        </div>

        {/* Защита аккаунта / Сохранение прогресса */}
        {!isAnonymous || isAccountProtectedSuccess ? (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold shadow-sm">
            <Icons.Shield className="w-4 h-4 text-emerald-400" />
            <span>АККАУНТ ЗАЩИЩЕН</span>
          </div>
        ) : (
          <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <Icons.Shield className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  СОХРАНЕНИЕ ПРОГРЕССА
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="text-[10px] font-mono text-blue-400 hover:text-blue-300 uppercase cursor-pointer transition-colors"
              >
                Войти в аккаунт →
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex gap-2.5 items-start text-left">
              <span className="text-amber-400 text-sm mt-0.5">⚠</span>
              <p className="text-[11px] font-mono text-zinc-300 leading-relaxed">
                Внимание: мы не собираем вашу почту. Если вы забудете пароль, восстановить аккаунт будет невозможно. Запомните ваши данные!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
                  Уникальный Логин (только латиница и цифры)
                </label>
                <input
                  type="text"
                  value={accountLogin}
                  onChange={(e) => {
                    setAccountLogin(e.target.value);
                    setAccountError(null);
                  }}
                  placeholder="agent_77"
                  autoCapitalize="none"
                  autoCorrect="off"
                  maxLength={20}
                  className="w-full bg-zinc-900 border border-white/10 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
                  Пароль
                </label>
                <input
                  type="password"
                  value={accountPassword}
                  onChange={(e) => {
                    setAccountPassword(e.target.value);
                    setAccountError(null);
                  }}
                  placeholder="••••••••"
                  maxLength={32}
                  className="w-full bg-zinc-900 border border-white/10 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 outline-none transition-colors"
                />
              </div>
            </div>

            {accountError && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[10px] font-mono">
                {accountError}
              </div>
            )}

            <div className="flex justify-end mt-1">
              <Button
                variant="primary"
                onClick={handleLinkAccount}
                disabled={isAccountLinking}
                className="h-9 px-4 text-xs font-bold uppercase tracking-wider active:scale-95 cursor-pointer"
              >
                {isAccountLinking ? 'Сохранение...' : 'Защитить аккаунт'}
              </Button>
            </div>
          </div>
        )}

        {/* Статистика (4 карточки) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          
          {/* Рейтинг */}
          <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">РЕЙТИНГ</span>
              <Icons.Award />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100">{currentMmr}</span>
            </div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (currentMmr / 2000) * 100)}%` }}
              />
            </div>
          </div>

          {/* Винрейт */}
          <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">ВИНРЕЙТ</span>
              <Icons.Activity />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100">{winRate}%</span>
              <span className="text-[10px] font-mono text-zinc-500">({totalWins}/{totalGames})</span>
            </div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>

          {/* Всего игр */}
          <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">ВСЕГО ИГР</span>
              <Icons.Shield />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100">{totalGames}</span>
              <span className="text-[10px] font-mono text-zinc-500">ИГР</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono mt-2">
              <span className="text-emerald-400 font-bold">ПОБЕД: <span>{totalWins}</span></span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 font-bold">ПОРАЖЕНИЙ: <span>{Math.max(0, totalGames - totalWins)}</span></span>
            </div>
          </div>

          {/* Баланс сторон */}
          <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">БАЛАНС СТОРОН</span>
              <Icons.Trophy />
            </div>
            <div className="flex items-baseline justify-between font-mono text-xs">
              <span className="text-blue-400 font-bold">{winsDet} <span className="text-[9px] text-zinc-500">СЫЩИК</span></span>
              <span className="text-rose-400 font-bold">{winsMan} <span className="text-[9px] text-zinc-500">МАНЬЯК</span></span>
            </div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2 flex overflow-hidden">
              <div className="bg-blue-500 h-full" style={{ width: `${lawRatio}%` }} />
              <div className="bg-rose-500 h-full" style={{ width: `${100 - lawRatio}%` }} />
            </div>
          </div>

        </div>

        {/* Последние матчи */}
        <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                ПОСЛЕДНИЕ МАТЧИ
              </h3>
            </div>
            {profile.recentMatches && profile.recentMatches.length > 0 && (
              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                {profile.recentMatches.length} ИГР
              </span>
            )}
          </div>

          {profile.recentMatches && profile.recentMatches.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {profile.recentMatches.map((match: MatchHistoryEntry, idx: number) => {
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
                          <span>Роль: {match.role === 'DETECTIVE' ? 'Сыщик' : 'Маньяк'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Icons.Clock />
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
                        {isWin ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-zinc-500 font-mono text-xs">
              <Icons.Shield />
              <span>История игр пуста. Сыграйте матч, чтобы увидеть результаты здесь.</span>
            </div>
          )}
        </div>

      </div>

      {/* Модальное окно выбора аватара */}
      {isAvatarPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-white/20 rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black uppercase tracking-wider text-white">ВЫБЕРИТЕ АВАТАР</h3>
              <button
                onClick={() => setIsAvatarPickerOpen(false)}
                className="text-zinc-400 hover:text-white p-1 text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 overflow-y-auto max-h-[60vh] custom-scrollbar p-1">
              {AGENT_AVATARS.map((agent) => {
                const isSelected = currentAvatarId === agent.id;
                const portrait = getCharacterPortraitPath(agent.id);
                return (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAvatar(agent.id)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-lg'
                        : 'border-white/10 hover:border-white/30 bg-zinc-900'
                    }`}
                  >
                    <img src={portrait} alt="" className="w-full h-full object-cover filter contrast-110" />
                  </button>
                );
              })}
            </div>

            <Button
              variant="secondary"
              onClick={() => setIsAvatarPickerOpen(false)}
              className="w-full h-9 text-xs font-bold uppercase tracking-wider mt-1"
            >
              Закрыть
            </Button>
          </div>
        </div>
      )}

      {/* Модальное окно входа в аккаунт */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          setIsAccountProtectedSuccess(true);
        }}
      />
    </div>
  );
};