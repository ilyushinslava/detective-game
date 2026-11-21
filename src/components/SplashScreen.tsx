import React, { useState, useEffect } from 'react';
import { soundManager } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';

interface SplashScreenProps {
  onComplete: () => void;
  autoDismissDelayMs?: number;
  isTv?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  autoDismissDelayMs,
  isTv = false,
}) => {
  const [isFading, setIsFading] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);

  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const splashPcUrl = `${base}/splash-bg-PC.webp`;
  const splashMobileUrl = `${base}/splash-bg.webp`;

  const handleStart = () => {
    if (isTriggered) return;
    setIsTriggered(true);

    try {
      soundManager.play('splash', 0.85);
    } catch {
      // Audio autoplay fallback
    }

    triggerHaptic('medium');

    setIsFading(true);
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  // Автоматический кинематографичный переход для ТВ без ожидания действий пользователя
  useEffect(() => {
    const delay = autoDismissDelayMs ?? (isTv ? 2500 : 0);
    if (delay <= 0) return;
    const timer = setTimeout(() => {
      handleStart();
    }, delay);
    return () => clearTimeout(timer);
  }, [autoDismissDelayMs, isTv]);

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
      onClick={!isTv ? handleStart : undefined}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background-main transition-opacity duration-700 select-none ${
        isTv ? 'cursor-default' : 'cursor-pointer'
      } overflow-hidden ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <picture className="w-full h-full flex items-center justify-center">
          <source media="(min-width: 1024px)" srcSet={splashPcUrl} />
          <source media="(max-width: 1023px)" srcSet={splashMobileUrl} />
          <img
            src={splashPcUrl}
            alt="Под подозрением"
            className="w-full h-full object-cover object-center opacity-95 shadow-[0_0_80px_rgba(0,0,0,0.9)]"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== splashMobileUrl) target.src = splashMobileUrl;
            }}
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050608]/90 via-transparent to-[#050608]/60" />
      </div>

      {/* На ТВ надпись "Коснитесь, чтобы войти" полностью скрыта */}
      {!isTv && (
        <div className="relative z-10 w-full h-full flex flex-col justify-end items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] mb-2 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center">
            <div className="text-[11px] sm:text-xs md:text-sm font-black tracking-widest uppercase text-white/90 border border-white/15 bg-black/70 backdrop-blur-md px-8 py-3.5 rounded-full hover:bg-white/10 hover:border-white/30 transition-all shadow-[0_0_25px_rgba(0,0,0,0.8)] active:scale-95">
              <span className="block lg:hidden">Коснитесь, чтобы войти</span>
              <span className="hidden lg:block">Нажмите в любом месте</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
