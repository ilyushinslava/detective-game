import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TvPauseModalProps {
  isOpen: boolean;
  focusedControl: "NONE" | "CONTINUE" | "RESTART" | "EXIT";
  onClose: () => void;
  onRestart?: () => void;
  onExit?: () => void;
  hideExit?: boolean;
  activeDisconnected: any;
  tvGraceLeft: number;
}

export const TvPauseModal: React.FC<TvPauseModalProps> = ({
  isOpen,
  focusedControl,
  onClose,
  onRestart,
  onExit,
  hideExit,
  activeDisconnected,
  tvGraceLeft,
}) => {
  return (
    <>
      {/* МОДАЛЬНОЕ МЕНЮ ПАУЗЫ (SYSTEM PAUSE MODAL) */}
      <div
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-6 select-none transition-all duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="neo-card w-full max-w-md p-6 sm:p-8 rounded-3xl border-t-2 border-t-rose-500/60 shadow-[0_30px_90px_rgba(0,0,0,0.95)] space-y-6 text-center">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-rose-400 text-xl">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              <span className="text-xl sm:text-2xl font-display font-black uppercase text-white tracking-wider">
                МЕНЮ ПАУЗЫ МАТЧА
              </span>
            </div>
            <button
              tabIndex={0}
              onClick={onClose}
              className="text-xs sm:text-sm font-mono text-zinc-400 hover:text-white transition cursor-pointer px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 focus:outline-none focus:scale-105"
            >
              [ESC] ЗАКРЫТЬ
            </button>
          </div>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed text-left font-sans">
            Игра приостановлена на телевизоре. Выберите действие с помощью ТВ-пульта:
          </p>

          <div className="space-y-3.5">
            <button
              data-tv-focus-primary="true"
              tabIndex={0}
              onClick={onClose}
              className={`w-full p-4 sm:p-5 rounded-2xl font-display font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-between cursor-pointer transition-all active:scale-95 focus:outline-none focus:scale-105 focus:border-white focus:shadow-[0_0_40px_rgba(59,130,246,0.7)] ${
                focusedControl === "CONTINUE"
                  ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 border-2 border-white ring-2 ring-white text-white scale-105 shadow-[0_0_35px_rgba(59,130,246,0.65)]"
                  : "bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 border border-blue-400/50 text-white"
              }`}
            >
              <span className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">ПРОДОЛЖИТЬ МАТЧ</span>
              <span className="font-mono text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-black/40 border border-white/20 text-white/90 shadow-inner">
                OK / ENTER ➔
              </span>
            </button>

            {onRestart && (
              <button
                tabIndex={0}
                onClick={onRestart}
                data-testid="tv-restart-btn"
                className={`w-full p-4 sm:p-5 rounded-2xl border font-display font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer focus:outline-none focus:scale-105 focus:border-white focus:bg-white/20 focus:shadow-[0_0_35px_rgba(255,255,255,0.35)] ${
                  focusedControl === "RESTART"
                    ? "border-2 border-white ring-2 ring-white bg-white/20 text-white scale-105 shadow-[0_0_30px_rgba(255,255,255,0.45)]"
                    : "border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white/80"
                }`}
              >
                <span>НАЧАТЬ ЗАНОВО (РЕВАНШ)</span>
                <span className="text-[10px] sm:text-xs font-mono text-zinc-400 px-2.5 py-1 rounded-md bg-black/40 border border-white/10">
                  ТРЕБУЕТ СОГЛАСИЯ
                </span>
              </button>
            )}

            {!hideExit && onExit && (
              <button
                tabIndex={0}
                onClick={onExit}
                data-testid="tv-exit-btn"
                className={`w-full p-4 sm:p-5 rounded-2xl border font-display font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer focus:outline-none focus:scale-105 focus:border-rose-300 focus:shadow-[0_0_40px_rgba(244,63,94,0.7)] ${
                  focusedControl === "EXIT"
                    ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 border-2 border-white ring-2 ring-red-500 text-white scale-105 shadow-[0_0_35px_rgba(244,63,94,0.7)]"
                    : "bg-gradient-to-r from-red-800 via-rose-800 to-red-900 border border-rose-500/50 hover:from-red-700 hover:to-rose-700 text-white"
                }`}
              >
                <span className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">ВЫЙТИ В ГЛАВНОЕ МЕНЮ</span>
                <span className="text-[10px] sm:text-xs font-mono text-rose-200 px-2.5 py-1 rounded-md bg-black/40 border border-white/20">
                  ЗАВЕРШИТЬ СЕССИЮ
                </span>
              </button>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 text-xs sm:text-sm font-mono text-zinc-300 text-left">
            Защита от случайного нажатия: выход в меню подтверждается через паузу.
          </div>
        </div>
      </div>

      {/* Оверлей грейс-периода и временной паузы связи */}
      <AnimatePresence>
        {activeDisconnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-8 bg-black/85 backdrop-blur-2xl select-none font-sans"
            data-testid="tv-player-disconnected-banner"
          >
            <div className="neo-card w-full max-w-2xl rounded-3xl border-t-2 border-t-blue-500/60 p-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.95)] flex flex-col items-center">
              <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-blue-950/90 border border-blue-500/50 text-sm font-mono uppercase tracking-wider text-blue-300 font-bold mb-6">
                <span>ВРЕМЕННАЯ ПАУЗА СВЯЗИ • ТАЙМЕР ХОДА ЗАМОРОЖЕН</span>
              </div>

              <div className="text-7xl font-mono font-black text-white tracking-widest mb-4">
                00:{tvGraceLeft.toString().padStart(2, "0")}
              </div>

              <h2 className="text-3xl font-black uppercase tracking-wider text-zinc-100 mb-3">
                ОЖИДАНИЕ ВОЗВРАЩЕНИЯ ИГРОКА В СЕТЬ
              </h2>

              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden my-5 max-w-lg">
                <div
                  className="h-full bg-blue-500 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, (tvGraceLeft / 60) * 100))}%` }}
                />
              </div>

              <p className="text-base text-zinc-300 max-w-lg leading-relaxed mb-3">
                Один из игроков временно оффлайн. Ход матча приостановлен на время грейс-периода (60 сек).
              </p>
              <p className="text-sm text-zinc-400 font-mono">
                При невозврате по истечении таймера будет зафиксировано техническое поражение.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
