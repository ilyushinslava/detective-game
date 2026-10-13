import React, { useState } from 'react';
import { soundManager } from '../utils/audio';

interface SplashScreenProps {
  onComplete: () => void;
}

import { useEffect, useRef } from 'react';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isFading, setIsFading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const handleStart = () => {
    if (hasStarted) return;
    setHasStarted(true);

    // Воспроизведение звука сплэша
    soundManager.play('splash', 0.85);

    // Тактильный виброотклик на смартфонах
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch {
        // Игнорируем в браузерах без поддержки API вибрации
      }
    }

    // Фаза показа (1.4 сек) -> начало плавного исчезновения
    const t1 = setTimeout(() => {
      setIsFading(true);
      // Фаза Fade-out (0.6 сек) -> демонтирование компонента
      const t2 = setTimeout(() => {
        onComplete();
      }, 600);
      timersRef.current.push(t2);
    }, 1400);
    timersRef.current.push(t1);
  };

  return (
    <div
      onClick={handleStart}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-700 select-none cursor-pointer ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Нуарный силуэтный логотип */}
        <div className="w-24 h-24 mb-6 rounded-full border border-zinc-800 bg-zinc-950/80 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.06)] animate-pulse">
          <svg
            className="w-14 h-14 text-zinc-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
            />
          </svg>
        </div>

        {/* Заголовок игры */}
        <h1 className="text-3xl font-extrabold tracking-widest text-zinc-100 uppercase mb-2">
          СХВАТКА
        </h1>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-12">
          Город греха и тайн
        </p>

        {/* Призыв к взаимодействию для разблокировки звука */}
        {!hasStarted && (
          <div className="text-xs tracking-wider uppercase text-zinc-400 border border-zinc-800 bg-zinc-900/50 px-5 py-2.5 rounded-full hover:bg-zinc-800 transition-colors animate-bounce">
            Коснитесь, чтобы войти
          </div>
        )}
      </div>
    </div>
  );
};