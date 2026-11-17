import React, { useState } from 'react';
import type { UserProfile, MatchHistoryEntry } from '../types/profile';
import { useTranslation } from '../i18n/context';
import { soundManager } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';
import { Button } from './ui/Button';
import { getCharacterPortraitPath } from '../constants/characterImages';

export const AGENT_AVATARS = [
  { id: 'c1', name: 'Агент «Вульф»', role: 'Спецоперации' },
  { id: 'c3', name: 'Инспектор «Вайс»', role: 'Отдел убийств' },
  { id: 'c5', name: 'Майор «Стоун»', role: 'Штаб контрразведки' },
  { id: 'c8', name: 'Оперативник «Фокс»', role: 'Наружное наблюдение' },
  { id: 'c12', name: 'Агент «Рейвен»', role: 'Криптография' },
  { id: 'c15', name: 'Шериф «Кросс»', role: 'Патрульный округ' },
  { id: 'c20', name: 'Капитан «Блэк»', role: 'Тактическая группа' },
  { id: 'c25', name: 'Следователь «Нова»', role: 'Особый отдел' },
  { id: 'c30', name: 'Детектив «Грей»', role: 'Судебная экспертиза' },
  { id: 'c42', name: 'Агент «Призрак»', role: 'Глубокое прикрытие' },
];

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
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-cyan-400">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Trophy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-amber-400">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 4h12v5a6 6 0 0 1-12 0V4z" />
    </svg>
  ),
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-cyan-400">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Award: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-cyan-400">
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
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
      <polyline points="20 6 9 17 4 12" />
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

  // Расчет тактических KPI
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

  // Режим игры для бейджа
  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'MANIAC_VS_OPERATIVE': return 'МАНЬЯК ПРОТИВ ОПЕРАТИВНИКА';
      case 'THIEF_HUNT': return 'ОХОТА НА ГРАБИТЕЛЯ';
      case 'SECRET_SERVICE': return 'ДИРЕКТИВА «НОЛЬ»';
      case 'LINE_UP': return 'ОЧНАЯ СТАВКА (ДУЭЛЬ)';
      default: return mode;
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#080a0f] text-zinc-100 overflow-y-auto custom-scrollbar p-3 sm:p-5 md:p-6 lg:p-8 w-full max-w-full pb-28 lg:pb-12 touch-manipulation select-none">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-4 sm:gap-6">
        
        {/* Верхняя статусная панель */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="h-9 px-2 text-zinc-400 hover:text-white gap-1 text-[10px] font-black uppercase tracking-widest shrink-0"
                title="Назад в главное меню"
              >
                <Icons.ChevronLeft />
                <span className="hidden sm:inline">Штаб</span>
              </Button>
            )}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900/90 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)] shrink-0">
                <Icons.User />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">ОСОБЫЙ ОТДЕЛ КОНТРРАЗВЕДКИ</span>
                <h2 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wider text-white truncate">
                  {t.nav.profile || 'ЛИЧНОЕ ДЕЛО АГЕНТА'}
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

        {/* Удостоверение агента (Блок идентификации) */}
        <div className="relative bg-zinc-950/80 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-[inset_0_2px_25px_rgba(0,0,0,0.9)] backdrop-blur-xl flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 overflow-hidden">
          {/* Водяной знак Нуар */}
          <div className="absolute right-4 top-2 text-[60px] sm:text-[80px] font-black text-white/[0.02] font-mono pointer-events-none select-none tracking-widest">
            DOSSIER
          </div>

          {/* Портрет агента */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-900 border-2 border-cyan-500/40 p-1 shadow-[0_0_20px_rgba(6,182,212,0.2)] overflow-hidden flex items-center justify-center relative">
              <img
                src={avatarPortraitUrl}
                alt={profile.agentName || profile.nickname}
                className="w-full h-full object-cover rounded-xl filter contrast-125 brightness-95"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute bottom-1 right-1 bg-black/80 border border-white/20 rounded px-1 text-[8px] font-mono text-zinc-400">
                {currentAvatarId.toUpperCase()}
              </div>
            </div>

            {/* Кнопка смены аватара */}
            <button
              onClick={() => {
                soundManager.play('click');
                triggerHaptic('light');
                setIsAvatarPickerOpen(true);
              }}
              className="absolute -bottom-2 -right-2 bg-zinc-900 border border-cyan-400/50 hover:border-cyan-300 text-cyan-300 hover:text-white p-2 rounded-xl shadow-lg active:scale-90 transition-all cursor-pointer"
              title="Выбрать тактический портрет"
            >
              <Icons.Camera />
            </button>
          </div>

          {/* Данные позывного и статус */}
          <div className="flex-1 flex flex-col gap-2 text-center sm:text-left min-w-0 w-full">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 font-bold">
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
                  className="bg-zinc-900 border border-cyan-500/50 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-sm font-black text-white uppercase tracking-wider outline-none shadow-inner"
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
                  className="text-zinc-500 hover:text-cyan-400 transition-colors p-1 active:scale-90"
                  title="Изменить позывной"
                >
                  <Icons.Edit />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 justify-center sm:justify-start text-xs font-mono text-zinc-400 flex-wrap">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                НА СВЯЗИ
              </span>
              <span>•</span>
              <span className="text-zinc-400">
                ID: #{Math.abs((profile.agentName || profile.nickname).split('').reduce((acc, char) => acc + char.charCodeAt(0), 1000)).toString(16).toUpperCase()}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Icons.Coin className="w-3.5 h-3.5 text-amber-400" />
                {profile.cash.toLocaleString()} $
              </span>
            </div>
          </div>
        </div>

        {/* Сетка тактических KPI (4 карточки) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          
          {/* KPI 1: Рейтинг MMR */}
          <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">РЕЙТИНГ MMR</span>
              <Icons.Award />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">{currentMmr}</span>
              <span className="text-[10px] font-mono text-zinc-500">PTS</span>
            </div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (currentMmr / 2000) * 100)}%` }}
              />
            </div>
          </div>

          {/* KPI 2: Эффективность (Винрейт) */}
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

          {/* KPI 3: Раскрыто дел (Матчей) */}
          <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg hover:border-white/20 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">ВСЕГО ОПЕРАЦИЙ</span>
              <Icons.Shield />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100">{totalGames}</span>
              <span className="text-[10px] font-mono text-zinc-500">ДЕЛ</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono mt-2">
              <span className="text-emerald-400 font-bold">ПОБЕД: <span>{totalWins}</span></span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 font-bold">ПОРАЖЕНИЙ: <span>{Math.max(0, totalGames - totalWins)}</span></span>
            </div>
          </div>

          {/* KPI 4: Баланс сторон (Закон vs Синдикат) */}
          <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg hover:border-amber-500/20 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">ЗАКОН / СИНДИКАТ</span>
              <Icons.Trophy />
            </div>
            <div className="flex items-baseline justify-between font-mono text-xs">
              <span className="text-cyan-400 font-bold">{winsDet} <span className="text-[9px] text-zinc-500">СЫЩИК</span></span>
              <span className="text-rose-400 font-bold">{winsMan} <span className="text-[9px] text-zinc-500">МАНЬЯК</span></span>
            </div>
            {/* Двухцветная полоса баланса */}
            <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2 flex overflow-hidden">
              <div className="bg-cyan-500 h-full" style={{ width: `${lawRatio}%` }} />
              <div className="bg-rose-500 h-full" style={{ width: `${100 - lawRatio}%` }} />
            </div>
          </div>

        </div>

        {/* Журнал операций (История расследований) */}
        <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                ЖУРНАЛ ПОСЛЕДНИХ ОПЕРАЦИЙ
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">
              АРХИВ ДЕЛ ({profile.recentMatches?.length || 0})
            </span>
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
                        ? 'bg-cyan-950/20 border-cyan-500/20 hover:border-cyan-500/40'
                        : 'bg-rose-950/15 border-rose-500/20 hover:border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-8 rounded-full shrink-0 ${isWin ? 'bg-cyan-400' : 'bg-rose-500'}`} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black uppercase tracking-wide text-zinc-200 truncate">
                          {getModeLabel(match.mode)}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                          <span>РОЛЬ: {match.role === 'DETECTIVE' ? 'СЫЩИК' : 'МАНЬЯК'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Icons.Clock />
                            {formatDuration(match.durationSeconds || 120)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-mono font-black ${isWin ? 'text-cyan-400' : 'text-rose-400'}`}>
                        {match.mmrDelta > 0 ? `+${match.mmrDelta}` : match.mmrDelta} MMR
                      </span>
                      <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded border uppercase ${
                        isWin
                          ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                          : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                      }`}>
                        {isWin ? 'УСПЕХ' : 'ПРОВАЛ'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-zinc-500 font-mono text-xs">
              <Icons.Shield />
              <span>Архив чист. Завершите первый сетевой или одиночный матч, чтобы внести дело в протокол.</span>
            </div>
          )}
        </div>

      </div>

      {/* Модальное окно выбора тактического аватара агента */}
      {isAvatarPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-white/20 rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">КАРТОТЕКА АГЕНТУРЫ</span>
                <h3 className="text-base font-black uppercase tracking-wider text-white">ВЫБЕРИТЕ ПОРТРЕТ АГЕНТА</h3>
              </div>
              <button
                onClick={() => setIsAvatarPickerOpen(false)}
                className="text-zinc-400 hover:text-white p-1 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto custom-scrollbar p-1">
              {AGENT_AVATARS.map((agent) => {
                const isSelected = currentAvatarId === agent.id;
                const portrait = getCharacterPortraitPath(agent.id);
                return (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAvatar(agent.id)}
                    className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'bg-zinc-900/60 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/15 mb-2 bg-black">
                      <img src={portrait} alt={agent.name} className="w-full h-full object-cover filter contrast-125" />
                    </div>
                    <span className="text-xs font-bold text-zinc-100 truncate w-full">{agent.name}</span>
                    <span className="text-[9px] font-mono text-zinc-500 truncate w-full">{agent.role}</span>
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
    </div>
  );
};
