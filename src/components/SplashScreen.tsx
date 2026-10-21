import React, { useState, useEffect } from 'react';
import { soundManager } from '../utils/audio';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isFading, setIsFading] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);

  const handleStart = () => {
    if (isTriggered) return;
    setIsTriggered(true);

    try {
      soundManager.play('splash', 0.85);
    } catch {
      // Audio autoplay fallback
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch {}
    }

    setIsFading(true);
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTriggered]);

  return (
    <div
      onClick={handleStart}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#050608] transition-opacity duration-500 select-none cursor-pointer overflow-hidden ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <picture className="w-full h-full flex items-center justify-center">
          <source media="(min-width: 1024px)" srcSet="./splash-bg-PC.png" />
          <img
            src="./splash-bg.png"
            alt="Astoria City Noir"
            className="w-full h-full max-w-xl md:max-w-2xl lg:max-w-none object-cover object-center opacity-90 shadow-[0_0_80px_rgba(0,0,0,0.9)]"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.endsWith('/splash-bg.png')) target.src = '/splash-bg.png';
            }}
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent to-[#050608]/70" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col justify-end items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] mb-2 pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-center">
          <div className="text-[11px] sm:text-xs md:text-sm font-black tracking-widest uppercase text-white/90 border border-white/15 bg-black/60 backdrop-blur-md px-8 py-3.5 rounded-full hover:bg-white/10 hover:border-white/30 transition-all shadow-[0_0_25px_rgba(0,0,0,0.8)] active:scale-95">
            <span className="block lg:hidden">Коснитесь, чтобы войти</span>
            <span className="hidden lg:block">Нажмите в любом месте</span>
          </div>
        </div>
      </div>
    </div>
  );
};
