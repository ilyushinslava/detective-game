import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "../ui/Button";

export interface PwaUpdateToastProps {
  needRefreshOverride?: boolean;
  updateServiceWorkerOverride?: (reloadPage?: boolean) => Promise<void>;
  onCloseOverride?: () => void;
}

export const PwaUpdateToast: React.FC<PwaUpdateToastProps> = ({
  needRefreshOverride,
  updateServiceWorkerOverride,
  onCloseOverride,
}) => {
  const {
    needRefresh: [swNeedRefresh, setSwNeedRefresh],
    updateServiceWorker: swUpdateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (import.meta.env.DEV) {
        console.log("[PWA] Service Worker зарегистрирован:", r);
      }
    },
    onRegisterError(error) {
      console.error("[PWA] Ошибка регистрации Service Worker:", error);
    },
  });

  const [isDismissed, setIsDismissed] = useState(false);

  const isVisible =
    !isDismissed && (needRefreshOverride !== undefined ? needRefreshOverride : swNeedRefresh);

  const handleUpdate = async () => {
    try {
      if (updateServiceWorkerOverride) {
        await updateServiceWorkerOverride(true);
      } else {
        await swUpdateServiceWorker(true);
      }
    } catch (err) {
      console.error("[PWA] Не удалось обновить Service Worker:", err);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onCloseOverride) {
      onCloseOverride();
    } else {
      setSwNeedRefresh(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="pwa-update-toast"
          role="alert"
          aria-live="polite"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[160] w-[92%] max-w-md pointer-events-auto pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="neo-card bg-[#0b0e17]/95 border border-white/15 border-t-blue-500/60 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              {/* Монохромная иконка обновления */}
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
                <svg
                  className="w-5 h-5 animate-[spin_6s_linear_infinite]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
              </div>

              {/* Текстовый блок */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="text-[11px] font-mono tracking-widest text-blue-400 uppercase font-semibold">
                  ОБНОВЛЕНИЕ СИСТЕМЫ
                </div>
                <p className="text-xs text-zinc-300 font-sans mt-0.5 leading-relaxed">
                  Доступна новая версия приложения. Обновите страницу или завершите текущую партию.
                </p>
              </div>

              {/* Кнопка закрыть (крестик) */}
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Отложить обновление"
                className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center text-zinc-400 hover:text-white transition-colors touch-manipulation focus:outline-none"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Блок действий */}
            <div className="mt-3.5 flex items-center gap-2">
              <Button
                variant="primary"
                onClick={handleUpdate}
                className="flex-1 !min-h-[44px] touch-manipulation text-xs font-semibold tracking-wide uppercase"
              >
                Обновить
              </Button>
              <Button
                variant="ghost"
                onClick={handleDismiss}
                className="!min-h-[44px] px-4 touch-manipulation text-xs text-zinc-400 hover:text-white"
              >
                Позже
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
