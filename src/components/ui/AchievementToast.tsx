// src/components/ui/AchievementToast.tsx
// Neo-Noir всплывающее уведомление о получении достижения

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Achievement } from "../../data/achievements";
import { Icons } from "./Icons";
import { soundManager } from "../../utils/audio";
import { triggerHaptic } from "../../utils/haptics";

export interface AchievementToastProps {
  achievement: Achievement | null;
  onClose: () => void;
  autoDismissMs?: number;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  onClose,
  autoDismissMs = 4000,
}) => {
  useEffect(() => {
    if (achievement) {
      soundManager.play("victory");
      triggerHaptic("success");

      const timer = setTimeout(() => {
        onClose();
      }, autoDismissMs);

      return () => clearTimeout(timer);
    }
  }, [achievement, onClose, autoDismissMs]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[150] w-[92%] max-w-md pointer-events-auto select-none"
          role="alert"
          aria-live="polite"
        >
          <div className="neo-card bg-[#0b0e17]/95 border-t-amber-500/40 border border-white/15 rounded-2xl p-3.5 sm:p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl flex items-center justify-between gap-3">
            {/* Иконка награды */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 sm:w-6 sm:h-6">
                <circle cx="12" cy="8" r="6" />
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
              </svg>
            </div>

            {/* Текстовая информация */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                  ДОСТИЖЕНИЕ РАЗБЛОКИРОВАНО
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide text-white truncate">
                {achievement.title}
              </h4>
              <p className="text-[11px] font-sans text-zinc-400 truncate">
                {achievement.description}
              </p>
            </div>

            {/* Награда в CR и кнопка закрытия */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-black flex items-center gap-1">
                <Icons.Coin className="w-3.5 h-3.5 text-amber-400" />
                <span>+{achievement.rewardCoins}</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-11 h-11 -mr-2 flex items-center justify-center text-zinc-500 hover:text-white transition-colors cursor-pointer touch-manipulation"
                aria-label="Закрыть уведомление"
              >
                <span className="text-lg font-mono">✕</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
