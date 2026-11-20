import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../ui/Icons';

export interface TvNetworkDisconnectModalProps {
  isOpen: boolean;
  attempt?: number;
  maxAttempts?: number;
  onCancel?: () => void;
}

/**
 * Кинематографичный оверлей разрыва сетевого соединения для ТВ-экранов.
 * Полностью блокирует игровой ввод с пульта во время дисконнекта, но предоставляет
 * гарантированную кнопку аварийного выхода в главное меню.
 */
export const TvNetworkDisconnectModal: React.FC<TvNetworkDisconnectModalProps> = ({
  isOpen,
  attempt = 1,
  maxAttempts = 10,
  onCancel,
}) => {
  // Блокировка игрового ввода с пульта (D-Pad, клавиатура, указатели), кроме кнопки аварийного выхода
  useEffect(() => {
    if (!isOpen) return;

    const blockAllInput = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === 'function' && target.closest('[data-emergency-exit="true"]')) {
        return; // Разрешаем клик и фокус по кнопке аварийного выхода
      }

      if (e.type === 'keydown' && (e as KeyboardEvent).key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel?.();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      if (typeof (e as any).stopImmediatePropagation === 'function') {
        (e as any).stopImmediatePropagation();
      }
    };

    window.addEventListener('keydown', blockAllInput, true);
    window.addEventListener('keyup', blockAllInput, true);
    window.addEventListener('pointerdown', blockAllInput, true);
    window.addEventListener('click', blockAllInput, true);

    return () => {
      window.removeEventListener('keydown', blockAllInput, true);
      window.removeEventListener('keyup', blockAllInput, true);
      window.removeEventListener('pointerdown', blockAllInput, true);
      window.removeEventListener('click', blockAllInput, true);
    };
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="tv-network-disconnect"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 select-none"
        >
          {/* Пульсирующий красный индикатор с неоновым glow */}
          <div className="relative flex items-center justify-center mb-8">
            <div className="w-24 h-24 rounded-full bg-red-950/60 border border-red-500/60 flex items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.7)] animate-pulse">
              <span className="w-8 h-8 rounded-full bg-red-500 shadow-[0_0_25px_rgba(239,68,68,1)] animate-ping opacity-75" />
              <span className="absolute w-5 h-5 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]" />
            </div>
          </div>

          {/* Акцидентный заголовок */}
          <h2 className="font-display text-2xl sm:text-4xl 2xl:text-5xl font-black uppercase tracking-wider text-red-500 drop-shadow-[0_0_35px_rgba(239,68,68,0.85)] text-center px-6 leading-tight mb-4">
            ПОТЕРЯ СВЯЗИ С СЕРВЕРОМ. ПЕРЕПОДКЛЮЧЕНИЕ...
          </h2>

          {/* Диагностическая информация */}
          <p className="font-mono text-xs sm:text-sm uppercase tracking-widest text-zinc-400 text-center mb-2">
            Восстановление канала PartyKit • Попытка {attempt} из {maxAttempts}
          </p>

          <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest text-center mb-6">
            Управление пультом временно заблокировано до восстановления связи
          </p>

          {/* Аварийный выход: разрыв переподключения и возврат в главное меню */}
          <button
            type="button"
            data-emergency-exit="true"
            data-testid="connection-loss-cancel-btn"
            onClick={() => {
              if (onCancel) {
                onCancel();
              }
            }}
            className="px-6 py-3.5 rounded-2xl border border-rose-500/40 hover:border-rose-500/80 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 hover:text-white font-display text-xs sm:text-sm font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)] active:scale-95 flex items-center gap-2"
          >
            <Icons.Close className="w-4 h-4 text-rose-300" />
            <span>В ГЛАВНОЕ МЕНЮ (ОТМЕНА)</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
