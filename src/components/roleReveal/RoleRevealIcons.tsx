import React from "react";

export const RoleRevealIcons = {
  Target: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  ),
  Shift: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M9 19l3 3 3 3M2 12h20M12 2v20" />
    </svg>
  ),
  Eye: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Shield: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Folder: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Coins: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="10" y1="10" x2="14" y2="10" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  ),
  Radar: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 20v-8" />
      <path d="M8 12a4 4 0 0 1 8 0" />
      <path d="M4 12a8 8 0 0 1 16 0" />
    </svg>
  ),
  Badge: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Lock: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  ArrowRight: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  Info: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

export const renderSilhouetteSvg = (id: string) => {
  const num = parseInt(id.replace("c", ""), 10) || 0;
  const variant = num % 8;
  const svgClass = "w-full h-full opacity-40 text-zinc-300 fill-current pointer-events-none";

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
          <path d="M35 110 C45 95, 75 95, 85 110 Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M35 30 C35 10, 75 10, 85 30 C95 50, 90 80, 75 90 C50 100, 30 80, 35 30 Z" opacity="0.6" />
          <path d="M45 45 L75 45 L70 55 L50 55 Z" />
          <path d="M25 110 L35 80 C50 95, 70 95, 85 80 L95 110 Z" />
        </svg>
      );
  }
};
