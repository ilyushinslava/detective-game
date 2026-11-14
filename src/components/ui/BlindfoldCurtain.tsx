import React from "react";
import type { Role } from "../../types/game";
import { triggerHaptic } from "../../utils/haptics";
import { playClickSound } from "../../utils/tvAudio";

export interface BlindfoldCurtainProps {
  isOpen: boolean;
  nextRole?: Role;
  nextPlayerName?: string;
  nextPlayerColor?: string;
  onDismiss: () => void;
}

export const BlindfoldCurtain: React.FC<BlindfoldCurtainProps> = ({
  isOpen,
  nextRole = "DETECTIVE",
  nextPlayerName,
  nextPlayerColor,
  onDismiss,
}) => {
  if (!isOpen) return null;

  const defaultRoleName = nextRole === "KILLER" ? "Бандит" : "Инспектор";
  const defaultRoleColor = nextRole === "KILLER" ? "text-red-400" : "text-blue-400";
  const defaultBorderColor = nextRole === "KILLER" ? "border-red-500/40" : "border-blue-500/40";
  const defaultBgGlow = nextRole === "KILLER" ? "bg-red-950/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]" : "bg-blue-950/30 shadow-[0_0_50px_rgba(59,130,246,0.2)]";

  const displayName = nextPlayerName || defaultRoleName;
  const displayColor = nextPlayerColor || defaultRoleColor;

  const handleDismiss = () => {
    try {
      triggerHaptic("medium");
    } catch {}
    try {
      playClickSound();
    } catch {}
    onDismiss();
  };

  return (
    <div
      role="dialog"
      aria-label="Смена игрока"
      onClick={handleDismiss}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-black text-white p-6 select-none cursor-pointer font-sans animate-fadeIn"
      style={{ touchAction: "manipulation" }}
    >
      {/* Верхний гриф конфиденциальности */}
      <div className="w-full flex items-center justify-between border-b border-zinc-900 pb-4 pt-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-zinc-500">
            ОФФЛАЙН РЕЖИМ • PASS & PLAY
          </span>
        </div>
        <span className="text-[10px] sm:text-xs font-mono text-zinc-600">
          СЕКРЕТНОСТЬ ДАННЫХ
        </span>
      </div>

      {/* Центральный кинематографичный блок передачи устройства */}
      <div className="flex flex-col items-center text-center max-w-sm my-auto px-4">
        {/* Анимированная пиктограмма передачи телефона */}
        <div className={`mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border ${defaultBorderColor} ${defaultBgGlow} text-zinc-300 transition-all duration-300`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12">
            <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
            <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M9 7h6" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>

        {/* Главный заголовок требования передачи устройства */}
        <div className="font-display text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
          ПРОТОКОЛ СМЕНЫ ХОДА
        </div>

        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-3">
          ПЕРЕДАЙТЕ УСТРОЙСТВО [{displayName}]...
        </h2>

        <div className="mt-1 text-xs font-mono uppercase tracking-widest text-zinc-400">
          Следующий ход:
        </div>

        <div className={`mt-1 text-2xl sm:text-3xl font-black uppercase tracking-wider ${displayColor} drop-shadow-md`}>
          {displayName}
        </div>

        <p className="mt-5 text-xs sm:text-sm text-zinc-500 leading-relaxed max-w-xs">
          Секретные данные предыдущего хода скрыты шторкой. Убедитесь, что соперник не видит экран, и передайте телефон.
        </p>

        {/* Пульсирующая подсказка тапа */}
        <div className="mt-8 py-3 px-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 animate-pulse flex items-center gap-2 shadow-inner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-zinc-400">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
          <span className="text-xs sm:text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase">
            НАЖМИТЕ НА ЭКРАН ДЛЯ ПРОДОЛЖЕНИЯ
          </span>
        </div>
      </div>

      {/* Нижняя информационная плашка */}
      <div className="w-full text-center pb-2">
        <span className="text-[10px] font-mono text-zinc-700 tracking-wider">
          КОСНИТЕСЬ В ЛЮБОМ МЕСТЕ ЭКРАНА
        </span>
      </div>
    </div>
  );
};
