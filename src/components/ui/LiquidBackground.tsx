import React from 'react';

/**
 * LiquidBackground — Анимированный нео-нуарный фон (Neo-Noir Ambient Flow)
 *
 * Создает живую атмосферу ночного города: глубокий кобальт, стальной циан и полуночный индиго.
 * Без паразитных розово-зеленых оттенков и без резких контрастов "полицейской сирены".
 * Аппаратное ускорение через GPU (background-position + bg-[length:200%_200%]).
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
      {/* Базовая глубина ночного фона */}
      <div className="absolute inset-0 bg-background-main" />

      {/* Первичный анимированный слой: кобальт, стальной циан и глубокий индиго */}
      <div
        className="absolute inset-0 opacity-70 animate-liquid bg-[length:200%_200%] bg-[radial-gradient(circle_at_20%_25%,_rgba(30,58,138,0.35),_transparent_55%),radial-gradient(circle_at_80%_75%,_rgba(8,145,178,0.22),_transparent_50%),radial-gradient(circle_at_50%_50%,_rgba(49,46,129,0.25),_transparent_60%)] will-change-[background-position]"
      />

      {/* Вторичный световой слой с плавным противоходом: холодный дымчатый циан и сапфир */}
      <div
        className="absolute inset-0 opacity-40 animate-liquid bg-[length:200%_200%] bg-[radial-gradient(circle_at_75%_20%,_rgba(14,116,144,0.20),_transparent_45%),radial-gradient(circle_at_25%_80%,_rgba(37,99,235,0.22),_transparent_50%)] [animation-direction:reverse] [animation-duration:22s] will-change-[background-position]"
      />

      {/* Мягкая виньетка по периметру для концентрации взгляда на элементах интерфейса */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_35%,_rgba(8,10,15,0.85)_100%)]" />
    </div>
  );
};
