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
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#07080c] text-white select-none p-10 lg:p-16 overflow-hidden font-sans">
      {/* Кинематографичный фон: глубокая контрастная глубина */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/15 via-[#07080c] to-[#040507] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.85)_100%)] pointer-events-none" />

      {/* Верхний лаконичный статус-бар без технического мусора */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          <span className="text-xs lg:text-sm font-display font-bold uppercase tracking-[0.3em] text-white/60">
            TV PARTY EDITION
          </span>
        </div>
      </div>

      {/* Центральный блок: Монументальный консольный логотип и минималистичный CTA */}
      <div className="relative z-10 my-auto flex flex-col items-center text-center max-w-4xl mx-auto space-y-12">
        <div className="space-y-4">
          <div className="text-white/40 tracking-[0.45em] font-light text-xs lg:text-sm uppercase">
            КИБЕРПАНК ДЕТЕКТИВ ДЛЯ КОМПАНИИ
          </div>
          <h1 className="text-7xl lg:text-9xl font-display font-black uppercase tracking-tight text-white drop-shadow-[0_15px_40px_rgba(0,0,0,0.95)]">
            {GAME_TITLE.ru}
          </h1>
          <p className="text-lg lg:text-xl font-sans font-light text-white/50 max-w-2xl mx-auto leading-relaxed">
            Интерактивная битва детективов, шпионов и маньяка на экране телевизора
          </p>
        </div>

        {/* Минималистичная премиум-кнопка в стилистике AAA-консолей */}
        <div className="w-full max-w-md">
          <button
            type="button"
            data-tv-home-btn="true"
            tabIndex={0}
            onClick={handleCreate}
            className="w-full py-5 px-8 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-display font-black text-xl lg:text-2xl uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 focus:outline-none focus:ring-4 focus:ring-white focus:bg-white/20 focus:scale-[1.03] shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:shadow-[0_0_35px_rgba(255,255,255,0.35)]"
          >
            <div className="flex items-center justify-center gap-3">
              <span>СОЗДАТЬ КОМНАТУ</span>
              <span className="px-3 py-0.5 rounded-lg bg-black/40 border border-white/20 text-sm font-sans font-medium text-white/80">
                [ENTER]
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Нижняя лаконичная полоса */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/5 pt-6 text-xs text-white/30 font-light">
        <div>PRIME SUSPECT • CONSOLE CLIENT</div>
        <div>PRESS [ENTER] TO START</div>
      </div>
    </div>
  );
};
