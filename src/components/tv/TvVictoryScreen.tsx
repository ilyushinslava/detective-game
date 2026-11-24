import React, { useState, useEffect } from 'react';
import type { Character, GameModeType, Role } from '../../types/game';
import { getKillerRoleName, getDetectiveRoleName, getGameModeTitle } from '../../constants/gameMeta';
import { getCharacterPortraitPath } from '../../constants/characterImages';
import { Button } from '../ui/Button';
import { Icons } from '../ui/Icons';
import { soundManager } from '../../utils/audio';

export interface TvVictoryScreenProps {
  winner: Role;
  mode: GameModeType;
  killer?: Character;
  detective?: Character;
  killerNickname?: string;
  detectiveNickname?: string;
  elapsedTime?: string;
  turnCount?: number;
  eliminatedCount?: number;
  onRestart: () => void;
  onExitToLobby: () => void;
}

export const TvVictoryScreen: React.FC<TvVictoryScreenProps> = ({
  winner,
  mode,
  killer,
  detective,
  killerNickname,
  detectiveNickname,
  elapsedTime = '--:--',
  turnCount = 0,
  eliminatedCount = 0,
  onRestart,
  onExitToLobby,
}) => {
  const isKillerWinner = winner === 'KILLER';
  const [focusedControl, setFocusedControl] = useState<'RESTART' | 'LOBBY'>('RESTART');

  const killerRoleName = getKillerRoleName(mode);
  const detectiveRoleName = getDetectiveRoleName(mode);
  const modeTitle = getGameModeTitle(mode);

  // Клавиатурная навигация D-Pad для пульта ТВ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.keyCode === 37 || e.keyCode === 21) {
        e.preventDefault();
        soundManager.play('click');
        setFocusedControl('RESTART');
      } else if (e.key === 'ArrowRight' || e.keyCode === 39 || e.keyCode === 22) {
        e.preventDefault();
        soundManager.play('click');
        setFocusedControl('LOBBY');
      } else if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32 || e.keyCode === 23 || e.keyCode === 66) {
        e.preventDefault();
        soundManager.play('confirm');
        if (focusedControl === 'RESTART') {
          onRestart();
        } else {
          onExitToLobby();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedControl, onRestart, onExitToLobby]);

  const killerPortraitUrl = killer?.id ? getCharacterPortraitPath(killer.id) : '';
  const detectivePortraitUrl = detective?.id ? getCharacterPortraitPath(detective.id) : '';

  return (
    <div className="relative h-[100dvh] w-full bg-[#07080c] text-white select-none overflow-hidden font-sans flex flex-col justify-between p-4 sm:p-6 lg:p-8 box-border">
      {/* Драматический нео-нуар градиент победы */}
      <div
        className={`absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,${
          isKillerWinner ? '#3b0816_0%,#150910_45%' : '#0b1e42_0%,#091124_45%'
        },#07080c_100%)] pointer-events-none`}
      />
      <div
        className={`absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,${
          isKillerWinner ? 'rgba(225,29,72,0.12)' : 'rgba(37,99,235,0.12)'
        },transparent_60%)] pointer-events-none`}
      />

      {/* Верхняя строка статуса */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
              isKillerWinner
                ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-pulse'
                : 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)] animate-pulse'
            }`}
          />
          <span className="text-xs lg:text-sm font-display uppercase tracking-[0.2em] text-zinc-300 font-bold">
            ПРОТОКОЛ ЗАКРЫТИЯ ДЕЛА • {modeTitle}
          </span>
        </div>
        <div className="text-xs font-display uppercase tracking-wider text-zinc-400 font-bold">
          РЕЗУЛЬТАТ ПАРТИИ
        </div>
      </div>

      {/* Центральная триумфальная зона (16:9 без скролла) */}
      <div className="flex-1 flex flex-col justify-center items-center py-2 relative z-10 w-full max-w-6xl mx-auto min-h-0">
        {/* Главный заголовок триумфа */}
        <div className="text-center mb-4 lg:mb-6 shrink-0">
          <div
            className={`text-xs sm:text-sm font-display uppercase tracking-[0.25em] font-bold mb-1.5 ${
              isKillerWinner ? 'text-rose-400' : 'text-blue-400'
            }`}
          >
            {isKillerWinner ? 'ПРЕСТУПЛЕНИЕ СОВЕРШЕНО' : 'ДЕЛО УСПЕШНО РАСКРЫТО'}
          </div>
          <h1
            className={`text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-wider font-display drop-shadow-lg ${
              isKillerWinner
                ? 'text-rose-500 drop-shadow-[0_0_35px_rgba(244,63,94,0.45)]'
                : 'text-blue-500 drop-shadow-[0_0_35px_rgba(59,130,246,0.45)]'
            }`}
          >
            {isKillerWinner ? `ПОБЕДА: ${killerRoleName}` : `ПОБЕДА: ${detectiveRoleName}`}
          </h1>
        </div>

        {/* Сетка досье и разоблачения тайной личности */}
        <div className="grid grid-cols-2 gap-6 lg:gap-8 w-full items-stretch max-h-[58vh]">
          {/* Левая колонка: Сорванная маска преступника */}
          <div className="neo-card p-4 lg:p-6 rounded-3xl border-t-2 border-t-rose-500/60 bg-zinc-950/70 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col items-center justify-between text-center min-h-0">
            <div className="text-[11px] lg:text-xs font-display uppercase tracking-widest text-rose-300/90 font-bold mb-2">
              ТАЙНАЯ ЛИЧНОСТЬ ПРЕСТУПНИКА
            </div>

            <div className="relative aspect-[3/4] h-44 sm:h-52 lg:h-60 rounded-2xl overflow-hidden border border-rose-500/40 shadow-2xl bg-black my-auto shrink-0">
              {killerPortraitUrl ? (
                <img
                  src={killerPortraitUrl}
                  alt={killer?.name || 'Преступник'}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 font-sans text-xs">
                  НЕТ ФОТО
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-2 left-2 right-2 text-left">
                <div className="text-sm lg:text-base font-black text-white font-display truncate">
                  {killer?.name || 'Неизвестный'}
                </div>
                <div className="text-[10px] lg:text-xs font-sans text-rose-300 font-bold truncate">
                  {killerRoleName}
                </div>
              </div>
            </div>

            <div className="mt-2 w-full pt-2 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
              <span className="font-sans font-bold uppercase text-[10px]">ИГРОК:</span>
              <span className="font-bold text-white truncate max-w-[200px]">
                {killerNickname || 'Агент Преступника'}
              </span>
            </div>
          </div>

          {/* Правая колонка: Досье партии и детектив */}
          <div className="neo-card p-4 lg:p-6 rounded-3xl border-t-2 border-t-blue-500/60 bg-zinc-950/70 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col justify-between min-h-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] lg:text-xs font-display uppercase tracking-widest text-blue-300/90 font-bold">
                МАТЕРИАЛЫ СЛЕДСТВИЯ
              </span>
              <span className="text-xs font-mono text-zinc-400 font-bold">{elapsedTime}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-auto">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                <div className="text-2xl lg:text-3xl font-black text-white font-display">{turnCount}</div>
                <div className="text-[10px] lg:text-xs font-sans font-semibold text-zinc-300 uppercase mt-0.5">Всего ходов</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                <div className="text-2xl lg:text-3xl font-black text-rose-400 font-display">{eliminatedCount}</div>
                <div className="text-[10px] lg:text-xs font-sans font-semibold text-zinc-300 uppercase mt-0.5">Устранено</div>
              </div>
            </div>

            {/* Блок детектива */}
            <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-blue-500/40">
                {detectivePortraitUrl ? (
                  <img
                    src={detectivePortraitUrl}
                    alt={detective?.name || 'Сыщик'}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500 font-sans text-[9px]">
                    СЫЩИК
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-display uppercase text-blue-400 font-bold tracking-wider">
                  {detectiveRoleName}
                </div>
                <div className="text-sm font-bold text-white truncate font-display">
                  {detective?.name || 'Следственная группа'}
                </div>
                <div className="text-[11px] text-zinc-400 truncate font-sans">
                  Игрок: {detectiveNickname || 'Агент Следствия'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Нижняя панель действий (D-Pad TV навигация) */}
      <div className="w-full relative z-10 shrink-0 pt-2 border-t border-white/10 flex flex-col items-center gap-2">
        <div className="flex items-center justify-center gap-4 w-full max-w-2xl">
          <Button
            variant={focusedControl === 'RESTART' ? 'primary-danger' : 'secondary'}
            data-tv-victory-btn="restart"
            tabIndex={0}
            onClick={() => {
              soundManager.play('confirm');
              onRestart();
            }}
            className={`flex-1 h-12 lg:h-14 rounded-2xl font-display font-black uppercase tracking-wider text-sm lg:text-base transition-all duration-300 cursor-pointer ${
              focusedControl === 'RESTART'
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.55)] scale-102 border-rose-400'
                : 'bg-zinc-900/80 border-white/15 text-zinc-300 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2.5">
              <Icons.Undo className="w-4 h-4" />
              <span>СЫГРАТЬ ЕЩЁ (РЕВАНШ)</span>
            </div>
          </Button>

          <Button
            variant={focusedControl === 'LOBBY' ? 'primary' : 'secondary'}
            data-tv-victory-btn="lobby"
            tabIndex={0}
            onClick={() => {
              soundManager.play('confirm');
              onExitToLobby();
            }}
            className={`flex-1 h-12 lg:h-14 rounded-2xl font-display font-black uppercase tracking-wider text-sm lg:text-base transition-all duration-300 cursor-pointer ${
              focusedControl === 'LOBBY'
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.55)] scale-102 border-blue-400'
                : 'bg-zinc-900/80 border-white/15 text-zinc-300 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2.5">
              <Icons.Home className="w-4 h-4" />
              <span>В ТВ-ЛОББИ</span>
            </div>
          </Button>
        </div>

        <div className="text-[11px] font-sans uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-2">
          <span>D-PAD: ВЛЕВО/ВПРАВО • ВЫБОР: [ENTER] • ХОСТ МОЖЕТ ВЫБРАТЬ РЕВАНШ НА ТЕЛЕФОНЕ</span>
        </div>
      </div>
    </div>
  );
};
