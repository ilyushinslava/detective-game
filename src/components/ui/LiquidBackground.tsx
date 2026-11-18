import React from 'react';

/**
 * LiquidBackground — Анимированный нео-нуарный фон (Neo-Noir Ambient Flow)
 *
 * Создает живую атмосферу ночного детективного мегаполиса:
 * - Глубокий сапфирово-синий (сторона Закона)
 * - Приглушенный темный бордо / винный (сторона Угрозы, аналогично TV-экрану #2d0814)
 * - Ночной сланцевый полумрак (slate / background-main #080a0f)
 *
 * Строгие правила:
 * - Никаких кислотных оттенков (cyan, lime, ядовитый фиолетовый).
 * - Никакого открытого розового или кричащей красно-синей полицейской мигалки.
 * - Плавный медитативный дрейф через аппаратное ускорение GPU (background-position + bg-[length:200%_200%]).
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
      {/* 1. Базовый глубокий угольно-черный фон Neo-Noir */}
      <div className="absolute inset-0 bg-[#080a0f]" />

      {/* 2. Первый медленный слой: благородный глубокий сапфир и приглушенный темный бордо */}
      <div
        className="absolute inset-0 opacity-55 animate-liquid bg-[length:200%_200%] bg-[radial-gradient(circle_at_25%_30%,_rgba(30,58,138,0.28),_transparent_60%),radial-gradient(circle_at_75%_70%,_rgba(76,5,25,0.26),_transparent_60%),radial-gradient(circle_at_50%_50%,_rgba(15,23,42,0.40),_transparent_70%)] will-change-[background-position]"
      />

      {/* 3. Второй медленный слой (противоход): глубокий полуночный индиго и сдержанный винный оттенок */}
      <div
        className="absolute inset-0 opacity-35 animate-liquid bg-[length:200%_200%] bg-[radial-gradient(circle_at_70%_25%,_rgba(37,99,235,0.16),_transparent_55%),radial-gradient(circle_at_30%_75%,_rgba(120,15,45,0.15),_transparent_55%)] [animation-direction:reverse] [animation-duration:28s] will-change-[background-position]"
      />

      {/* 4. Мягкая виньетка по периметру: концентрирует контраст в центре и гасит пересветы */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(8,10,15,0.9)_100%)]" />
    </div>
  );
};
