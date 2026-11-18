import React, { useState } from 'react';
import type { UserProfile } from '../types/profile';
import { useTranslation } from '../i18n/context';
import { soundManager } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';
import { Button } from './ui/Button';
import { getCharacterPortraitPath } from '../constants/characterImages';
import { validatePlayerName } from '../utils/nameFilter';
import { useAuthSafe } from '../contexts/AuthContext';
import { AuthModal } from './auth';
import {
  ProfileIcons,
  AvatarPickerModal,
  AccountSecurityCard,
  ProfileStatsGrid,
  MatchHistorySection,
  AGENT_AVATARS,
} from './profile';

export { AGENT_AVATARS };

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
  const p = t.profile || {
    title: 'ПРОФИЛЬ ИГРОКА',
    back: 'Назад',
    level: 'УРОВЕНЬ',
    online: 'В сети',
    save: 'Сохранить',
    editCallsign: 'Изменить позывной',
    changeAvatar: 'Сменить аватар',
    rating: 'РЕЙТИНГ',
    winrate: 'ВИНРЕЙТ',
    totalGames: 'ВСЕГО ИГР',
    gamesUnit: 'ИГР',
    wins: 'ПОБЕД:',
    losses: 'ПОРАЖЕНИЙ:',
    sideBalance: 'БАЛАНС СТОРОН',
    detective: 'СЫЩИК',
    maniac: 'МАНЬЯК',
    recentMatches: 'ПОСЛЕДНИЕ МАТЧИ',
    emptyHistory: 'История игр пуста. Сыграйте матч, чтобы увидеть результаты здесь.',
    win: 'ПОБЕДА',
    loss: 'ПОРАЖЕНИЕ',
    rolePrefix: 'Роль:',
    selectAvatar: 'ВЫБЕРИТЕ АВАТАР',
    close: 'Закрыть',
    accountSecured: 'АККАУНТ ЗАЩИЩЕН',
    saveProgress: 'СОХРАНЕНИЕ ПРОГРЕССА',
    loginLink: 'Войти в аккаунт →',
    saveWarning: 'Внимание: мы не собираем вашу почту. Если вы забудете пароль, восстановить аккаунт будет невозможно. Запомните ваши данные!',
    uniqueLogin: 'Уникальный Логин (только латиница и цифры)',
    password: 'Пароль',
    protectAccount: 'Защитить аккаунт',
    saving: 'Сохранение...',
    modes: {
      MANIAC_VS_OPERATIVE: 'Маньяк против Оперативника',
      THIEF_HUNT: 'Охота на грабителя',
      SECRET_SERVICE: 'Директива «Ноль»',
      LINE_UP: 'Очная ставка',
    },
  };

  const [isEditing, setIsEditing] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(profile.agentName || profile.nickname || '');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  // Логика аутентификации и защиты аккаунта
  const { isAnonymous } = useAuthSafe();
  const [isAccountProtectedSuccess, setIsAccountProtectedSuccess] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"CREATE_PROFILE" | "SIGN_IN">("CREATE_PROFILE");

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
    // Защита от XSS и инъекций разметки: санитизация спецсимволов и ограничение длины
    const sanitized = nicknameInput.replace(/[<>'"&]/g, '').trim().slice(0, 20);
    const validation = validatePlayerName(sanitized);
    if (!validation.isValid) {
      soundManager.play('deny');
      triggerHaptic('warning');
      setNicknameError(validation.error || 'Недопустимый позывной');
      return;
    }
    setNicknameError(null);
    soundManager.play('click');
    triggerHaptic('success');
    onUpdateProfile({ nickname: sanitized, agentName: sanitized });
    setIsEditing(false);
  };

  const handleSelectAvatar = (avatarId: string) => {
    soundManager.play('click');
    triggerHaptic('light');
    onUpdateProfile({ avatarId, avatar: avatarId });
    setIsAvatarPickerOpen(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeLabel = (mode?: string) => {
    if (!mode) return p.modes?.MANIAC_VS_OPERATIVE || 'Матч';
    const modeKey = mode as keyof typeof p.modes;
    return p.modes?.[modeKey] || mode;
  };

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col font-sans select-none overflow-x-hidden relative">
      {/* Шапка экрана */}
      <header className="sticky top-0 z-20 bg-background-main/90 backdrop-blur-md border-b border-border-subtle px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {onBack && (
            <button
              onClick={() => {
                soundManager.play('click');
                triggerHaptic('light');
                onBack();
              }}
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-white/20 active:scale-95 text-zinc-300 hover:text-white transition-all cursor-pointer"
              title={p.back}
            >
              <ProfileIcons.ChevronLeft />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ProfileIcons.User />
            </span>
            <h1 className="text-sm sm:text-base font-black tracking-widest uppercase text-white">
              {p.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <button
              onClick={() => {
                soundManager.play('click');
                triggerHaptic('light');
                onOpenSettings();
              }}
              aria-label="Settings"
              title="Settings"
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ProfileIcons.Settings />
            </button>
          )}
        </div>
      </header>

      {/* Основной контент */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5 sm:gap-6">
        
        {/* Карточка агента (Удостоверение) */}
        <div className="bg-gradient-to-br from-background-surface/90 to-background-main/80 border border-border-subtle border-t border-t-border-strong rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative z-10">
            {/* Аватар */}
            <div className="relative group shrink-0">
              {/* Мягкое неоновое свечение (glow) за аватаром */}
              <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-accent-primary/40 via-accent-neon/30 to-accent-purple/40 blur-lg opacity-75 group-hover:opacity-100 transition duration-500" />
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-white/20 bg-zinc-900 shadow-xl relative z-10">
                <img
                  src={avatarPortraitUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover filter contrast-110"
                />
                <button
                  type="button"
                  onClick={() => {
                    soundManager.play('click');
                    triggerHaptic('light');
                    setIsAvatarPickerOpen(true);
                  }}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-white transition-opacity cursor-pointer"
                  title={p.changeAvatar}
                >
                  <ProfileIcons.Camera />
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
                    {p.changeAvatar}
                  </span>
                </button>
              </div>
            </div>

            {/* Инфо и имя */}
            <div className="flex-1 flex flex-col items-center sm:items-start gap-2 min-w-0 w-full text-center sm:text-left">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {p.level} {profile.level || 1}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {p.online}
                </span>
              </div>

              {isEditing ? (
                <div className="flex flex-col gap-1 mt-1 w-full max-w-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nicknameInput}
                      onChange={(e) => {
                        setNicknameInput(e.target.value);
                        setNicknameError(null);
                      }}
                      maxLength={20}
                      className={`flex-1 bg-zinc-900 border ${nicknameError ? 'border-accent-danger' : 'border-blue-500/50'} rounded-lg px-2.5 py-1 text-sm font-black font-mono text-white focus:outline-none`}
                      autoFocus
                    />
                    <Button
                      variant="primary"
                      onClick={handleSaveNickname}
                      className="h-8 px-3 text-xs font-bold uppercase tracking-wider"
                    >
                      {p.save}
                    </Button>
                  </div>
                  {nicknameError && (
                    <span className="text-[10px] font-mono text-accent-danger leading-tight">
                      {nicknameError}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white truncate max-w-xs sm:max-w-md">
                    {profile.agentName || profile.nickname || 'Агент'}
                  </h2>
                  <button
                    onClick={() => {
                      soundManager.play('click');
                      triggerHaptic('light');
                      setIsEditing(true);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title={p.editCallsign}
                  >
                    <ProfileIcons.Edit />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 mt-1">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <ProfileIcons.Coin className="w-3.5 h-3.5" />
                  <span>{profile.cash?.toLocaleString() || 0}</span>
                </span>
                {profile.rank && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-300 font-bold">{profile.rank}</span>
                  </>
                )}
                <span>•</span>
                <span className="text-zinc-500 text-[11px]">
                  ID: {profile.id?.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Защита аккаунта / Сохранение прогресса */}
        <AccountSecurityCard
          isAnonymous={isAnonymous}
          isAccountProtectedSuccess={isAccountProtectedSuccess}
          onOpenAuthModal={() => {
            setAuthModalTab("CREATE_PROFILE");
            setIsLoginModalOpen(true);
          }}
          onOpenLoginModal={() => {
            setAuthModalTab("SIGN_IN");
            setIsLoginModalOpen(true);
          }}
          translations={p}
        />

        {/* Статистика (4 карточки) */}
        <ProfileStatsGrid
          currentMmr={currentMmr}
          winRate={winRate}
          totalWins={totalWins}
          totalGames={totalGames}
          winsDet={winsDet}
          winsMan={winsMan}
          lawRatio={lawRatio}
          translations={p}
        />

        {/* Последние матчи */}
        <MatchHistorySection
          recentMatches={profile.recentMatches}
          getModeLabel={getModeLabel}
          formatDuration={formatDuration}
          translations={p}
        />

      </div>

      {/* Модальное окно выбора аватара */}
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        currentAvatarId={currentAvatarId}
        onSelectAvatar={handleSelectAvatar}
        onClose={() => setIsAvatarPickerOpen(false)}
        title={p.selectAvatar}
        closeLabel={p.close}
      />

      {/* Модальное окно авторизации и привязки профиля */}
      <AuthModal
        isOpen={isLoginModalOpen}
        initialTab={authModalTab}
        currentCallsign={profile.agentName || profile.nickname}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          setIsAccountProtectedSuccess(true);
        }}
      />
    </div>
  );
};
