import React from 'react';
import type { GameModeType } from '../../types/game';
import { GAME_MODES_META } from '../../constants/gameMeta';
import { Button } from '../ui/Button';
import { Icons } from '../ui/Icons';
import { triggerHaptic } from '../../utils/haptics';

export interface ControllerLobbyViewProps {
  roomCode: string;
  isHost: boolean;
  myNickname: string;
  isReady: boolean;
  onToggleReady: () => void;
  players: Record<string, { nickname: string; isHost?: boolean }>;
  readyClients: Set<string>;
  selectedMode: GameModeType;
  onSelectMode?: (mode: GameModeType) => void;
  roleDistribution: 'RANDOM' | 'HOST_KILLER' | 'HOST_DETECTIVE';
  onSelectRoleDistribution?: (dist: 'RANDOM' | 'HOST_KILLER' | 'HOST_DETECTIVE') => void;
  canStartMatch: boolean;
  onStartMatch?: () => void;
  onLeaveRoom?: () => void;
}

export const ControllerLobbyView: React.FC<ControllerLobbyViewProps> = ({
  roomCode,
  isHost,
  myNickname,
  isReady,
  onToggleReady,
  players,
  readyClients,
  selectedMode,
  onSelectMode,
  roleDistribution,
  onSelectRoleDistribution,
  canStartMatch,
  onStartMatch,
  onLeaveRoom,
}) => {
  const playerEntries = Object.entries(players || {});
  const opponentEntry = playerEntries.find(([_, p]) => (isHost ? !p.isHost : p.isHost));
  const opponent = opponentEntry ? opponentEntry[1] : null;
  const opponentId = opponentEntry ? opponentEntry[0] : null;
  const opponentReady = opponentId ? readyClients.has(opponentId) : false;

  const MODES: Array<{ id: GameModeType; label: string; badge: string }> = [
    { id: 'MANIAC_VS_OPERATIVE', label: GAME_MODES_META.MANIAC_VS_OPERATIVE.title.ru, badge: 'МАНЬЯК' },
    { id: 'THIEF_HUNT', label: GAME_MODES_META.THIEF_HUNT.title.ru, badge: 'ВОР' },
    { id: 'SECRET_SERVICE', label: GAME_MODES_META.SECRET_SERVICE.title.ru, badge: 'ШПИОНЫ' },
  ];

  return (
    <div
      className="flex h-[100dvh] w-full max-w-full flex-col justify-between bg-[#07090e] p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] text-zinc-100 select-none font-sans overflow-hidden relative overscroll-none touch-manipulation"
      style={{ overscrollBehavior: 'none', touchAction: 'manipulation' }}
    >
      {/* Мягкий нео-нуар градиент */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/25 via-transparent to-black/95 pointer-events-none" />

      {/* Верхняя статусная панель */}
      <div className="w-full flex justify-between items-center border-b border-white/10 pb-2.5 gap-2 relative z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full shrink-0 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
          <span className="text-[11px] sm:text-xs font-display uppercase tracking-wider text-zinc-200 font-bold truncate">
            ВЫ В ЛОББИ
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono font-bold text-zinc-400">КОМНАТА #{roomCode}</span>
          {onLeaveRoom && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                triggerHaptic('light');
                onLeaveRoom();
              }}
              className="text-[11px] h-8 px-2.5 font-sans font-bold uppercase tracking-wider text-zinc-400 hover:text-white"
            >
              ПОКИНУТЬ ЛОББИ
            </Button>
          )}
        </div>
      </div>

      {/* Центральный блок контента */}
      <div className="flex-1 flex flex-col justify-between gap-2.5 py-2 min-h-0 relative z-10 w-full max-w-md mx-auto">
        {/* Карточка готовности текущего игрока */}
        <div className="neo-card p-3 sm:p-3.5 rounded-2xl border-white/10 bg-zinc-950/70 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-display uppercase tracking-widest text-zinc-400 font-bold">
                {isHost ? 'ХОСТ КОМНАТЫ' : 'ИГРОК'}
              </div>
              <div className="text-sm sm:text-base font-display font-black text-white truncate">{myNickname}</div>
            </div>
            <span
              className={`text-[10px] font-display font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isReady
                  ? 'bg-blue-950/80 border border-blue-500/50 text-blue-300 shadow-[0_0_8px_rgba(37,99,235,0.3)]'
                  : 'bg-zinc-900 border border-white/10 text-zinc-500'
              }`}
            >
              {isReady ? 'ГОТОВ К ИГРЕ' : 'НЕ ГОТОВ'}
            </span>
          </div>

          <Button
            variant={isReady ? 'primary' : 'secondary'}
            onClick={() => {
              triggerHaptic('medium');
              onToggleReady();
            }}
            className="w-full h-11 min-h-[44px] rounded-xl font-sans font-bold uppercase tracking-wider text-xs sm:text-sm transition-all"
          >
            <div className="flex items-center justify-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-white' : 'bg-zinc-500 animate-pulse'}`} />
              <span>{isReady ? 'ОТМЕНИТЬ ГОТОВНОСТЬ' : 'ПОДТВЕРДИТЬ ГОТОВНОСТЬ'}</span>
            </div>
          </Button>
        </div>

        {/* Карточка статуса второго игрока (оппонента) */}
        <div className="neo-card p-2.5 sm:p-3 rounded-2xl border-white/10 bg-zinc-950/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 font-mono text-xs font-bold shrink-0">
              {opponent ? '2' : '?'}
            </div>
            <div className="min-w-0 truncate">
              <div className="text-[10px] font-display uppercase text-zinc-400 font-bold tracking-wider">ОППОНЕНТ</div>
              <div className="text-xs sm:text-sm font-display font-bold text-zinc-200 truncate">
                {opponent ? opponent.nickname : 'Ожидание подключения...'}
              </div>
            </div>
          </div>
          <div className="shrink-0">
            {opponent ? (
              <span
                className={`text-[10px] font-display font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  opponentReady
                    ? 'bg-blue-950/60 border border-blue-500/40 text-blue-300'
                    : 'bg-zinc-900 border border-white/10 text-zinc-500'
                }`}
              >
                {opponentReady ? 'ГОТОВ' : 'ОЖИДАНИЕ'}
              </span>
            ) : (
              <span className="text-[10px] font-display font-bold text-zinc-500 animate-pulse tracking-wider">ПОИСК...</span>
            )}
          </div>
        </div>

        {/* Настройки партии (Хост управляет, Гость видит выбранное) */}
        {isHost ? (
          <div className="neo-card p-3 rounded-2xl border-white/10 bg-zinc-950/70 flex flex-col gap-2 shrink-0">
            <div className="text-[10px] font-display uppercase tracking-widest text-zinc-400 font-bold">
              РЕЖИМ ИГРЫ (ВЫБОР ХОСТА)
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MODES.map((m) => {
                const isSelected = selectedMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      onSelectMode?.(m.id);
                    }}
                    className={`py-2 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-950/80 border-blue-500 text-white font-black shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                        : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="text-[11px] font-display font-bold uppercase tracking-wider truncate">{m.badge}</div>
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] font-display uppercase tracking-widest text-zinc-400 font-bold mt-1">
              РАСПРЕДЕЛЕНИЕ РОЛЕЙ
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'RANDOM', label: 'СЛУЧАЙНО' },
                { id: 'HOST_KILLER', label: 'Я — ПРЕСТУПНИК' },
                { id: 'HOST_DETECTIVE', label: 'Я — ДЕТЕКТИВ' },
              ].map((r) => {
                const isSelected = roleDistribution === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      onSelectRoleDistribution?.(r.id as any);
                    }}
                    className={`py-1.5 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-950/80 border-rose-500 text-rose-200 font-bold shadow-[0_0_12px_rgba(225,29,72,0.3)]'
                        : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="text-[10px] font-display font-bold uppercase tracking-wider truncate">{r.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="neo-card p-3 rounded-2xl border-white/10 bg-zinc-950/70 flex flex-col gap-1.5 shrink-0 text-left">
            <div className="text-[10px] font-display uppercase tracking-widest text-zinc-400 font-bold">
              РЕЖИМ ПАРТИИ
            </div>
            <div className="text-sm font-display font-black text-white">
              {MODES.find((m) => m.id === selectedMode)?.label || 'Маньяк против Сыщика'}
            </div>
            <div className="text-[11px] text-zinc-400 font-sans">
              Настройки режима и правила определяются хостом партии на телевизоре.
            </div>
          </div>
        )}
      </div>

      {/* Нижняя панель действий */}
      <div className="w-full shrink-0 pt-2 relative z-10 max-w-md mx-auto">
        {isHost ? (
          <Button
            data-testid="controller-start-btn"
            variant={canStartMatch ? 'primary' : 'secondary'}
            onClick={() => {
              if (canStartMatch && onStartMatch) {
                triggerHaptic('heavy');
                onStartMatch();
              }
            }}
            disabled={!canStartMatch}
            className="w-full h-12 min-h-[48px] rounded-2xl font-sans font-bold uppercase tracking-wider text-sm sm:text-base transition-all"
          >
            <div className="flex items-center justify-center gap-2">
              <Icons.Play className="w-4 h-4" />
              <span>{canStartMatch ? 'НАЧАТЬ МАТЧ' : 'ОЖИДАНИЕ ГОТОВНОСТИ (2/2)'}</span>
            </div>
          </Button>
        ) : (
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-white/10 text-center text-xs text-zinc-400 font-sans flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Ожидайте запуска игры хостом после подтверждения готовности</span>
          </div>
        )}
      </div>
    </div>
  );
};
