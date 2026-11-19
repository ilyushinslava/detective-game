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
    title: 'ПРОФИЛЬ',
    back: 'Назад',
    level: 'УРОВЕНЬ',
    online: 'В сети',
    statsTab: 'Статистика',
    historyTab: 'История матчей',
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
  const [activeTab, setActiveTab] = useState<'STATS' | 'HISTORY'>('STATS');

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
    <div className="h-full w-full max-h-[100dvh] bg-transparent text-zinc-100 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Шапка экрана */}
      <header className="sticky top-0 z-20 shrink-0 bg-background-main/80 backdrop-blur-xl border-b border-border-subtle px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 sm:pb-3 flex items-center justify-between shadow-md">
        <div className="flex items-center min-w-0">
          <h1 className="text-base sm:text-lg font-display font-black tracking-widest uppercase text-white truncate">
            {p.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <button
              onClick={() => {
                soundManager.play('tapMenu');
                triggerHaptic('light');
                onOpenSettings();
              }}
              aria-label="Settings"
              title="Settings"
              className="w-10 h-10 min-w-[40px] min-h-[40px] sm:w-11 sm:h-11 sm:min-w-[44px] sm:min-h-[44px] rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] active:scale-95 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer touch-manipulation"
            >
              <ProfileIcons.Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Основной контент */}
      <div className="flex-1 min-h-0 max-w-4xl w-full mx-auto p-3 sm:p-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2.5 sm:gap-3.5 overflow-hidden">
        
        {/* Компактная карточка агента (Удостоверение) */}
        <div className="neo-card border-t-white/20 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-xl relative overflow-hidden shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 relative z-10">
            {/* Аватар 56x56 */}
            <div className="relative group shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-white/20 bg-zinc-900 shadow-md relative z-10">
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
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-0.5 text-white transition-opacity cursor-pointer"
                  title={p.changeAvatar}
                >
                  <ProfileIcons.Camera className="w-4 h-4" />
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider">
                    {p.changeAvatar}
                  </span>
                </button>
              </div>
            </div>

            {/* Правый инфо-блок в 2 строки */}
            <div className="flex-1 flex flex-col justify-center min-w-0">
              {/* Строка 1: Позывной + кнопка редактирования + бейдж уровня */}
              <div className="flex items-center gap-2 flex-wrap">
                {isEditing ? (
                  <div className="flex flex-col gap-1 w-full max-w-xs">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nicknameInput}
                        onChange={(e) => {
                          setNicknameInput(e.target.value);
                          setNicknameError(null);
                        }}
                        maxLength={20}
                        className={`flex-1 bg-zinc-900 border ${nicknameError ? 'border-accent-danger' : 'border-white/20'} rounded-lg px-2 py-0.5 text-sm font-black font-mono text-white focus:outline-none`}
                        autoFocus
                      />
                      <Button
                        variant="primary"
                        onClick={handleSaveNickname}
                        className="h-7 px-2.5 text-xs font-bold uppercase tracking-wider !rounded-lg"
                      >
                        {p.save}
                      </Button>
                    </div>
                    {nicknameError && (
                      <span className="text-[10px] font-mono text-rose-400 leading-tight">
                        {nicknameError}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white truncate max-w-[150px] xs:max-w-[200px] sm:max-w-xs">
                      {profile.agentName || profile.nickname || 'Агент'}
                    </h2>
                    <button
                      onClick={() => {
                        soundManager.play('click');
                        triggerHaptic('light');
                        setIsEditing(true);
                      }}
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                      title={p.editCallsign}
                    >
                      <ProfileIcons.Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {!isEditing && (
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 rounded-md shrink-0">
                    {p.level} {profile.level || 1}
                  </span>
                )}
              </div>

              {/* Строка 2: Монеты • Ранг • Короткий ID */}
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-amber-400 font-bold text-[11px] sm:text-xs">
                  <ProfileIcons.Coin className="w-3.5 h-3.5" />
                  <span>{profile.cash?.toLocaleString() || 0}</span>
                </span>
                {profile.rank && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-300 font-bold text-[11px] sm:text-xs truncate max-w-[120px]">
                      {profile.rank}
                    </span>
                  </>
                )}
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-500 text-[10px] truncate">
                  ID: {profile.id?.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Защита аккаунта / Сохранение прогресса (тонкая плашка гостя) */}
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

        {/* Сегментный переключатель вкладок: Статистика / История матчей */}
        <div className="bg-background-surface/30 p-1 rounded-xl border border-white/5 backdrop-blur-sm shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              soundManager.play('tapMenu');
              triggerHaptic('light');
              setActiveTab('STATS');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'STATS'
                ? 'bg-background-panel shadow-md border border-white/10 text-white'
                : 'bg-transparent text-zinc-500 hover:text-zinc-300 border border-transparent'
            }`}
          >
            <ProfileIcons.Award className="w-3.5 h-3.5" />
            <span>{p.statsTab || 'Статистика'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.play('tapMenu');
              triggerHaptic('light');
              setActiveTab('HISTORY');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'HISTORY'
                ? 'bg-background-panel shadow-md border border-white/10 text-white'
                : 'bg-transparent text-zinc-500 hover:text-zinc-300 border border-transparent'
            }`}
          >
            <ProfileIcons.Activity className="w-3.5 h-3.5" />
            <span>{p.historyTab || 'История матчей'}</span>
            {profile.recentMatches && profile.recentMatches.length > 0 && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                activeTab === 'HISTORY' ? 'bg-white/10 text-white border-white/20' : 'bg-white/5 text-zinc-500 border-white/5'
              }`}>
                {profile.recentMatches.length}
              </span>
            )}
          </button>
        </div>

        {/* Контент активной вкладки */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeTab === 'STATS' ? (
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
          ) : (
            <MatchHistorySection
              recentMatches={profile.recentMatches}
              getModeLabel={getModeLabel}
              formatDuration={formatDuration}
              translations={p}
            />
          )}
        </div>

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
