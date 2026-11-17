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
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-background-main text-white select-none p-10 lg:p-16 overflow-hidden font-sans">
      {/* Кинематографичный многослойный градиент: от темно-бордового/винного к глубокому угольному */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,#2d0814_0%,#120c16_45%,theme(colors.background.main)_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(225,29,72,0.12),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.06),transparent_50%)] pointer-events-none" />

      {/* Верхний лаконичный статус-бар с эффектом матового стекла */}
      <div className="relative z-10 flex items-center justify-between border-b border-border-subtle pb-6">
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-border-subtle backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-danger shadow-neon-rose animate-pulse" />
          <span className="text-xs lg:text-sm font-display font-bold uppercase tracking-[0.3em] text-white/80">
            TV PARTY EDITION
          </span>
        </div>
      </div>

      {/* Центральный блок: Монументальный консольный логотип и сочный рубиновый CTA */}
      <div className="relative z-10 my-auto flex flex-col items-center text-center max-w-4xl mx-auto space-y-12">
        <div className="space-y-4">
          <div className="text-rose-200/60 tracking-[0.45em] font-light text-xs lg:text-sm uppercase">
            КИБЕРПАНК ДЕТЕКТИВ ДЛЯ КОМПАНИИ
          </div>
          <h1 className="text-7xl lg:text-9xl font-display font-black uppercase tracking-tight text-white drop-shadow-[0_15px_40px_rgba(0,0,0,0.95)]">
            {GAME_TITLE.ru}
          </h1>
          <p className="text-lg lg:text-xl font-sans font-light text-white/60 max-w-2xl mx-auto leading-relaxed">
            Интерактивная битва детективов, шпионов и маньяка на экране телевизора
          </p>
        </div>

        {/* Сочный рубиновый CTA-элемент с градиентом, внутренней тенью и объемным свечением */}
        <div className="w-full max-w-md">
          <button
            type="button"
            data-tv-home-btn="true"
            tabIndex={0}
            onClick={handleCreate}
            className="w-full py-5 px-8 rounded-2xl bg-gradient-to-r from-red-700 via-rose-700 to-red-800 hover:from-red-600 hover:via-rose-600 hover:to-red-700 border border-rose-400/40 text-white font-display font-black text-xl lg:text-2xl uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-[0_12px_35px_rgba(225,29,72,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] active:scale-95 focus:outline-none focus:scale-105 focus:border-white focus:bg-gradient-to-r focus:from-red-600 focus:via-rose-500 focus:to-red-600 focus:shadow-[0_0_50px_rgba(244,63,94,0.65),inset_0_0_25px_rgba(255,255,255,0.35)]"
          >
            <span className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">СОЗДАТЬ КОМНАТУ</span>
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
