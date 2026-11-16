import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { partyService } from "../utils/partyPeer";
import { Icons } from "./ui/Icons";

export interface ConnectionLossOverlayProps {
  isOpen: boolean;
  attempt?: number;
  maxAttempts?: number;
  title?: string;
  subtitle?: string;
  onForceReconnect?: () => void;
  onCancel?: () => void;
  zIndexClass?: string;
}

/**
 * Аварийный оверлей потери сетевого соединения (PartyKit Reconnect Overlay).
 * Предоставляет игроку статус переподключения и гарантированный аварийный выход
 * на экран Штаба без захвата в бесконечный цикл.
 */
export const ConnectionLossOverlay: React.FC<ConnectionLossOverlayProps> = ({
  isOpen,
  attempt = 1,
  maxAttempts = 3,
  title = "ПОТЕРЯ РАДИОСВЯЗИ",
  subtitle = "Резервный канал удерживается 60 секунд. Ваша позиция на поле и текущий статус маневра сохранены.",
  onForceReconnect,
  onCancel,
  zIndexClass = "z-[10000]",
}) => {
  const handleEmergencyCancel = () => {
    partyService.disconnect();

    if (typeof window !== "undefined") {
      localStorage.removeItem("tv_session_party_state");
      sessionStorage.removeItem("tv_party_room");
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.pathname);
    }

    if (onCancel) {
      onCancel();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 ${zIndexClass} flex flex-col items-center justify-between bg-[#07090e]/95 p-6 backdrop-blur-xl select-none font-sans`}
          data-testid="connection-loss-overlay"
        >
          {/* Верхняя статусная строка */}
          <div className="w-full flex justify-between items-center border-b border-white/10 pb-3">
            <span className="text-xs font-mono font-bold tracking-widest text-zinc-400">ПОД ПОДОЗРЕНИЕМ</span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 font-bold">
              РАДИОКАНАЛ: ОФФЛАЙН
            </span>
          </div>

          {/* Центральный терминальный блок с индикаторами и действиями */}
          <div className="my-auto flex flex-col items-center max-w-sm w-full text-center px-4">
            <div className="w-24 h-24 rounded-full border border-white/10 bg-zinc-950 flex items-center justify-center text-blue-400 mb-6 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
              <Icons.Radar className="w-10 h-10 text-blue-400 animate-pulse" />
            </div>

            <h2 className="font-display text-2xl font-black uppercase tracking-wider text-white mb-2">
              {title}
            </h2>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-300 mb-4">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>
                {attempt > 0
                  ? `ВОССТАНОВЛЕНИЕ СИГНАЛА (${attempt}/${maxAttempts})...`
                  : "ПОИСК РАДИОЧАСТОТЫ..."}
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              {subtitle}
            </p>

            <button
              type="button"
              onClick={() => {
                if (onForceReconnect) {
                  onForceReconnect();
                } else {
                  partyService.ensureConnection();
                }
              }}
              className="w-full min-h-[44px] py-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/20 text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 hover:text-white transition cursor-pointer active:scale-95 shadow-md font-display"
            >
              Повторить подключение сейчас
            </button>

            {/* Аварийный выход: разрыв переподключения и возвращение в Штаб */}
            <button
              type="button"
              data-testid="connection-loss-cancel-btn"
              onClick={handleEmergencyCancel}
              className="w-full min-h-[44px] mt-2.5 py-3 rounded-2xl border border-rose-500/40 hover:border-rose-500/80 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 hover:text-rose-100 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-sm font-display flex items-center justify-center gap-2"
            >
              <span>✕</span>
              <span>ВЕРНУТЬСЯ В ШТАБ (ОТМЕНА)</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-zinc-600 uppercase tracking-widest">
            СЕССИЯ ЗАЩИЩЕНА • ПРИНУДИТЕЛЬНЫЙ РАЗРЫВ ДОСТУПЕН
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
