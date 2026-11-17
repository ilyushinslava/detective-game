import React from "react";

export const renderSilhouette = (id: string) => {
  const num = parseInt(id.replace("c", ""), 10) || 0;
  const variant = num % 8;
  const svgClass = "w-full h-full opacity-25 text-zinc-400 fill-current pointer-events-none";

  switch (variant) {
    case 0:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M35 45 C40 20, 80 20, 85 45 Z" />
          <path d="M15 45 C45 35, 75 35, 105 45 C105 50, 15 50, 15 45 Z" />
          <path d="M45 50 L75 50 L70 75 C60 85, 50 80, 45 50 Z" opacity="0.6" />
          <path d="M25 110 L40 75 L50 90 L60 80 L70 90 L80 75 L95 110 Z" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M30 30 C10 50, 20 90, 35 100 C35 70, 25 50, 45 35 C65 20, 90 30, 95 60 C100 90, 85 100, 85 100 C105 80, 105 40, 80 25 C55 10, 35 15, 30 30 Z" />
          <path d="M45 40 C75 40, 85 60, 75 80 C60 90, 45 80, 45 40 Z" opacity="0.5" />
          <path d="M55 85 C60 82, 65 82, 70 85 C65 88, 60 88, 55 85 Z" opacity="0.8" />
          <path d="M35 110 C45 95, 75 95, 85 110 Z" />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M30 40 C40 15, 75 20, 85 45 Z" />
          <path d="M10 45 C40 30, 80 40, 110 55 C100 60, 20 55, 10 45 Z" />
          <path d="M40 50 L75 55 L70 80 C60 90, 45 85, 40 50 Z" opacity="0.6" />
          <path d="M65 80 L95 88 L93 92 L63 84 Z" />
          <circle cx="96" cy="90" r="3" opacity="0.8" />
          <path d="M20 110 L45 85 L60 100 L75 85 L100 110 Z" />
        </svg>
      );
    case 3:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M35 45 C35 15, 85 15, 85 45 C85 75, 75 90, 60 90 C45 90, 35 75, 35 45 Z" opacity="0.4" />
          <circle cx="48" cy="55" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="72" cy="55" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M56 55 L64 55" stroke="currentColor" strokeWidth="3" />
          <path d="M30 110 L45 90 L60 105 L75 90 L90 110 Z" />
          <path d="M55 105 L65 105 L60 120 Z" opacity="0.7" />
        </svg>
      );
    case 4:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M25 35 C40 10, 80 10, 95 35 L85 45 L35 45 Z" />
          <path d="M55 25 L65 25 L60 35 Z" opacity="0.8" />
          <path d="M20 45 C50 40, 70 40, 100 45 C90 55, 30 55, 20 45 Z" />
          <path d="M40 50 L80 50 L75 80 C60 90, 45 80, 40 50 Z" opacity="0.5" />
          <path d="M20 110 L40 85 L80 85 L100 110 Z" />
        </svg>
      );
    case 5:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M25 40 C40 25, 80 25, 95 45 C70 40, 40 45, 20 50 Z" />
          <path d="M35 48 C60 45, 80 48, 80 75 C60 85, 40 75, 35 48 Z" opacity="0.6" />
          <path d="M15 110 C25 80, 45 75, 60 75 C75 75, 95 80, 105 110 Z" />
          <path d="M30 110 L40 75 L50 95 L60 85 L70 95 L80 75 L90 110 Z" opacity="0.8" />
        </svg>
      );
    case 6:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M5 45 C40 15, 80 15, 115 45 C80 35, 40 35, 5 45 Z" />
          <path d="M40 35 C50 15, 70 15, 80 35 Z" />
          <path d="M45 45 C75 45, 80 65, 70 85 C60 95, 50 85, 45 45 Z" opacity="0.5" />
          <circle cx="50" cy="90" r="2" />
          <circle cx="56" cy="93" r="2" />
          <circle cx="64" cy="93" r="2" />
          <circle cx="70" cy="90" r="2" />
          <path d="M30 110 C45 95, 75 95, 90 110 Z" />
        </svg>
      );
    case 7:
    default:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M35 30 C35 10, 75 10, 85 30 C95 50, 90 80, 75 90 C50 100, 30 80, 35 30 Z" opacity="0.6" />
          <path d="M45 45 L75 45 L70 55 L50 55 Z" />
          <path d="M65 55 L60 70 L65 75" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M25 110 L35 80 C50 95, 70 95, 85 80 L95 110 Z" />
        </svg>
      );
  }
};
