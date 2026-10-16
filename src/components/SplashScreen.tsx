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
      className={`fixed inset-0 z-[100] flex justify-center bg-[#050608] transition-opacity duration-700 select-none cursor-pointer overflow-hidden ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ограничивающий фрейм: 100% на смартфонах, аккуратный max-w-md на ПК */}
      <div className="relative w-full max-w-md h-full flex flex-col justify-end pb-[max(4rem,env(safe-area-inset-bottom))] md:border-x md:border-white/10 md:shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Арт-фон постера */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-black">
          <img 
            src="./splash-bg.png" 
            alt="Astoria City Noir" 
            className="w-full h-full object-cover object-top opacity-95"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.endsWith("/splash-bg.png")) target.src = "/splash-bg.png";
            }}
          />
          {/* Градиент снизу для читаемости кнопки */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#080a0f] via-[#080a0f]/60 to-transparent" />
        </div>

        <div className="relative z-10 w-full px-6 flex justify-center mb-6">
          {!hasStarted && (
            <div className="text-[10px] sm:text-xs font-black tracking-widest uppercase text-white/90 border border-white/20 bg-black/50 backdrop-blur-md px-8 py-3.5 rounded-full hover:bg-white/10 transition-all animate-bounce shadow-[0_0_25px_rgba(0,0,0,0.8)]">
              Коснитесь, чтобы войти
            </div>
          )}
        </div>
      </div>
    </div>
  );
};