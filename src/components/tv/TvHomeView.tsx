import React, { useEffect } from 'react';
import { GAME_TITLE } from '../../constants/gameMeta';
import { soundManager } from '../../utils/audio';
import { useSpatialNavigation } from '../../hooks/useSpatialNavigation';

export interface TvHomeViewProps {
  onCreateRoom: () => void;
}

export const TvHomeView: React.FC<TvHomeViewProps> = ({ onCreateRoom }) => {
  useSpatialNavigation({ initialFocusSelector: '[data-tv-home-btn="true"]' });

  useEffect(() => {
    soundManager.startTvAmbient();
    return () => {
      soundManager.stopTvAmbient();
    };
  }, []);

  const handleCreate = () => {
    soundManager.play('confirm');
    onCreateRoom();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#07080c] text-white select-none p-8 lg:p-14 overflow-hidden font-sans">
      {/* Атмосферная контровая подсветка нео-нуара */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-blue-950/10 to-[#050609] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />

      {/* Верхний статус-бар */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <span className="h-3.5 w-3.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.9)]" />
          <span className="text-sm lg:text-base font-bold uppercase tracking-[0.25em] text-zinc-300">
            TV PARTY COMMAND CENTER
          </span>
        </div>
        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full border border-white/10 bg-zinc-900/60 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-zinc-300">
            КИОСК АКТИВЕН • ПУЛЬТ D-PAD
          </span>
        </div>
      </div>

      {/* Центральный блок: Монументальный логотип и призыв к действию */}
      <div className="relative z-10 my-auto flex flex-col items-center text-center max-w-4xl mx-auto space-y-10">
        <div className="space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-red-950/80 border border-red-500/40 text-red-400 font-bold text-xs lg:text-sm uppercase tracking-[0.3em] mb-2 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            КИБЕРПАНК ДЕТЕКТИВ ДЛЯ КОМПАНИИ
          </div>
          <h1 className="text-6xl lg:text-8xl font-display font-black uppercase tracking-wider text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.9)]">
            {GAME_TITLE.ru}
          </h1>
          <p className="text-xl lg:text-2xl font-sans font-medium text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Интерактивная битва детективов, шпионов и маньяка на экране вашего телевизора
          </p>
        </div>

        {/* Главная фокусная кнопка создания комнаты */}
        <div className="w-full max-w-xl">
          <button
            type="button"
            data-tv-home-btn="true"
            tabIndex={0}
            onClick={handleCreate}
            className="w-full py-6 px-10 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 border-2 border-red-400/80 text-white font-display font-black text-2xl lg:text-3xl uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.7)] transition-all cursor-pointer transform hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-[6px] focus:ring-red-600 focus:bg-red-950/40 focus:scale-[1.03]"
          >
            <div className="flex items-center justify-center gap-4">
              <span>СОЗДАТЬ КОМНАТУ</span>
              <span className="px-3.5 py-1 rounded-xl bg-black/50 border border-white/20 text-base lg:text-lg font-sans font-bold">
                [ENTER]
              </span>
            </div>
          </button>
          <div className="mt-4 text-sm lg:text-base text-zinc-400 font-sans font-medium">
            Нажмите кнопку <strong className="text-white">OK / ENTER</strong> на пульте телевизора для запуска штаба
          </div>
        </div>
      </div>

      {/* Нижняя панель подсказок */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-sm text-zinc-400 font-medium">
        <div className="flex items-center gap-6">
          <span>• 1 ТВ-Экран (Хост)</span>
          <span>• 2-6 игроков со смартфонами</span>
          <span>• Без установки приложений (Web/PWA)</span>
        </div>
        <div className="text-zinc-500">
          Версия 2.0-RC2 • Neo-Noir Engine
        </div>
      </div>
    </div>
  );
};
