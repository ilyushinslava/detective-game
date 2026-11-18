import React from 'react';

/**
 * LiquidBackground — Анимированный фон "Полицейские огни" (Neo-Noir Liquid Glow)
 *
 * Использует аппаратное ускорение GPU (background-position + bg-[length:200%_200%]),
 * плавное смешивание глубоких сапфирово-синих и приглушенных пурпурно-красных радиальных градиентов.
 * Без прямого манипулирования DOM (чистый декларативный React + Tailwind).
 */
export interface LiquidBackgroundProps {
  className?: string;
}

export const LiquidBackground: React.FC<LiquidBackgroundProps> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none ${className}`}
    >
      {/* Базовый глубокий фон */}
      <div className="absolute inset-0 bg-background-main" />

      {/* Анимированный слой перетекающих радиальных градиентов "Полицейские огни" */}
      <div
        className="absolute inset-0 opacity-80 mix-blend-screen animate-liquid bg-[length:200%_200%] bg-[radial-gradient(circle_at_20%_20%,_rgba(30,58,138,0.45),_transparent_50%),radial-gradient(circle_at_80%_80%,_rgba(159,18,57,0.35),_transparent_50%),radial-gradient(circle_at_50%_40%,_rgba(88,28,135,0.25),_transparent_60%)] will-change-[background-position]"
      />

      {/* Вторичный световой слой для объема и глубины цвета */}
      <div
        className="absolute inset-0 opacity-40 animate-liquid bg-[length:200%_200%] bg-[radial-gradient(circle_at_75%_25%,_rgba(59,130,246,0.3),_transparent_45%),radial-gradient(circle_at_25%_75%,_rgba(225,29,72,0.25),_transparent_45%)] [animation-direction:reverse] [animation-duration:18s] will-change-[background-position]"
      />

      {/* Мягкая виньетка по периметру для концентрации взгляда на контенте */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(8,10,15,0.8)_100%)]" />
    </div>
  );
};
