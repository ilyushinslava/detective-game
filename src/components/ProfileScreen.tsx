import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../types/profile';
import { useTranslation } from '../i18n/context';
import { soundManager } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';
import { Button } from './ui/Button';
import { getCharacterPortraitPath } from '../constants/characterImages';
import { validatePlayerName } from '../utils/nameFilter';
import { useAuthSafe } from '../contexts/AuthContext';
import { AuthModal } from './auth';
import { Modal } from './ui/Modal';
import { Toast } from './Toast';
import {
  ProfileIcons,
  AvatarPickerModal,
  AccountSecurityCard,
  ProfileStatsGrid,
  MatchHistorySection,
  ModeStatsSection,
  AchievementsSection,
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
  const [isMatchHistoryOpen, setIsMatchHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'modes' | 'achievements'>('overview');

  // Логика аутентификации и защиты аккаунта
  const { isAnonymous } = useAuthSafe();
  const [isAccountProtectedSuccess, setIsAccountProtectedSuccess] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"CREATE_PROFILE" | "SIGN_IN">("CREATE_PROFILE");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCopyUserId = async (userId?: string) => {
    if (!userId) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(userId);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = userId;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      soundManager.play("click");
      triggerHaptic("success");
      setToastMessage("ID скопирован в буфер обмена");
    } catch (err) {
      console.error("Ошибка при копировании ID:", err);
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
    // Защита от XSS и инъекций разметки: санитизация спецсимволов и ограничение длины
    const sanitized = nicknameInput.replace(/[<>'"&]/g, '').trim().slice(0, 20);
    const validation = validatePlayerName(sanitized);
    if (!validation.isValid) {
      soundManager.play('deny');
      triggerHaptic('error');
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

  // Горячая клавиша Escape для удобного возврата в главное меню на десктопе
  useEffect(() => {
    if (!onBack) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !isAvatarPickerOpen &&
        !isLoginModalOpen &&
        !isMatchHistoryOpen &&
        !isEditing
      ) {
        soundManager.play('tapMenu');
        triggerHaptic('light');
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, isAvatarPickerOpen, isLoginModalOpen, isMatchHistoryOpen, isEditing]);

  return (
    <div className="h-full w-full max-h-[100dvh] bg-transparent text-zinc-100 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Шапка экрана */}
      <header className="sticky top-0 z-20 shrink-0 bg-background-main/80 backdrop-blur-xl border-b border-border-subtle px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 sm:pb-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {onBack && (
            <button
              onClick={() => {
                soundManager.play('tapMenu');
                triggerHaptic('light');
                onBack();
              }}
              aria-label={p.back || "Назад"}
              title={p.back || "Назад"}
              className="hidden md:inline-flex w-10 h-10 sm:w-11 sm:h-11 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] active:scale-95 items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer touch-manipulation"
            >
              <ProfileIcons.ChevronLeft />
            </button>
          )}
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
      <div className="flex-1 min-h-0 max-w-4xl w-full mx-auto p-3 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3 sm:gap-4 overflow-y-auto custom-scrollbar">
        
        {/* Карточка агента (Удостоверение) */}
        <div className="neo-card border-t-white/20 rounded-2xl py-3.5 px-4 sm:p-5 shadow-2xl relative overflow-hidden shrink-0">
          <div className="flex flex-col items-center gap-3 relative z-10 text-center">
            {/* Аватар */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-white/20 border-t-white/40 bg-zinc-900 shadow-xl relative z-10">
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
                  <ProfileIcons.Camera className="w-4 h-4" />
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
                    {p.changeAvatar}
                  </span>
                </button>
              </div>
            </div>

            {/* Инфо и имя */}
            <div className="flex flex-col items-center gap-1.5 min-w-0 w-full">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-300 font-bold bg-zinc-900/80 px-2 py-0.5 rounded border border-white/10">
                  {p.level} {profile.level || 1}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 font-bold bg-zinc-900/80 px-2 py-0.5 rounded border border-white/10">
                  {p.online}
                </span>
              </div>

              {isEditing ? (
                <div className="flex flex-col gap-1 mt-1 w-full max-w-xs items-center">
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={nicknameInput}
                      onChange={(e) => {
                        setNicknameInput(e.target.value);
                        setNicknameError(null);
                      }}
                      maxLength={20}
                      className={`flex-1 bg-zinc-900 border ${nicknameError ? 'border-accent-danger' : 'border-white/20'} rounded-lg px-2.5 py-1 text-sm font-black font-mono text-white focus:outline-none`}
                      autoFocus
                    />
                    <Button
                      variant="primary"
                      onClick={handleSaveNickname}
                      className="h-8 px-3 text-xs font-bold uppercase tracking-wider !rounded-lg"
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
                <div className="flex items-center gap-2 group justify-center">
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
                    <ProfileIcons.Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 text-xs font-mono text-zinc-400 mt-0.5 flex-wrap">
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
                <button
                  type="button"
                  onClick={() => handleCopyUserId(profile.id)}
                  title="Скопировать ID в буфер обмена"
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all cursor-pointer touch-manipulation group select-none"
                >
                  <span className="text-zinc-500 text-[11px] font-mono">ID:</span>
                  <span className="text-zinc-300 group-hover:text-zinc-100 text-[11px] font-mono font-medium">
                    {profile.id ? `${profile.id.slice(0, 8)}...` : "—"}
                  </span>
                  <ProfileIcons.Copy className="w-3 h-3 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Переключатель разделов профиля (Neo-Noir Segmented Control) */}
        <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-1 grid grid-cols-3 gap-1 shrink-0 h-11 min-h-[44px]">
          <button
            type="button"
            onClick={() => {
              soundManager.play('tapMenu');
              triggerHaptic('light');
              setActiveTab('overview');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer touch-manipulation ${
              activeTab === 'overview'
                ? 'bg-white/15 border border-white/20 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ProfileIcons.User className="w-3.5 h-3.5" />
            <span>Сводка</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.play('tapMenu');
              triggerHaptic('light');
              setActiveTab('modes');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer touch-manipulation ${
              activeTab === 'modes'
                ? 'bg-white/15 border border-white/20 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ProfileIcons.Activity className="w-3.5 h-3.5" />
            <span>Режимы</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.play('tapMenu');
              triggerHaptic('light');
              setActiveTab('achievements');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer touch-manipulation ${
              activeTab === 'achievements'
                ? 'bg-white/15 border border-white/20 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ProfileIcons.Award className="w-3.5 h-3.5" />
            <span>Награды</span>
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
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

            {/* Статистика (4 карточки 2x2) */}
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

            {/* Кнопка-строка «Последние матчи» для открытия модального окна */}
            <button
              type="button"
              onClick={() => {
                soundManager.play('tapMenu');
                triggerHaptic('light');
                setIsMatchHistoryOpen(true);
              }}
              className="neo-card border-t-white/20 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-lg hover:border-t-white/40 active:scale-[0.99] transition-all cursor-pointer group shrink-0"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 group-hover:text-white transition-colors">
                  <ProfileIcons.Activity className="w-4 h-4" />
                </span>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  {p.recentMatches} {profile.recentMatches && profile.recentMatches.length > 0 ? `(${profile.recentMatches.length})` : ''}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-white transition-colors">
                <span className="text-[10px] font-mono uppercase tracking-wider hidden xs:inline">Смотреть</span>
                <ProfileIcons.ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </>
        )}

        {activeTab === 'modes' && (
          <ModeStatsSection stats={profile.detailedStats} />
        )}

        {activeTab === 'achievements' && (
          <AchievementsSection
            unlockedAchievements={profile.unlockedAchievements}
            achievementProgress={profile.achievementProgress}
          />
        )}

      </div>

      {/* Модальное окно истории матчей */}
      <Modal
        isOpen={isMatchHistoryOpen}
        onClose={() => setIsMatchHistoryOpen(false)}
        title={p.recentMatches || "ПОСЛЕДНИЕ МАТЧИ"}
        maxWidth="max-w-2xl"
      >
        <div className="max-h-[68vh] flex flex-col min-h-0">
          <MatchHistorySection
            recentMatches={profile.recentMatches}
            getModeLabel={getModeLabel}
            formatDuration={formatDuration}
            translations={p}
          />
        </div>
      </Modal>

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
      {/* Всплывающее уведомление о копировании */}
      <Toast
        message={toastMessage}
        type="info"
        onClose={() => setToastMessage(null)}
        duration={1500}
      />
    </div>
  );
};
