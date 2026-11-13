import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TvScreensaverProps {
  isIdle: boolean;
  onDismiss: () => void;
}

/**
 * Компонент защиты OLED-матриц от выгорания (OLED Protection).
 * Активируется при 5 минутах бездействия. Физически выключает пиксели на черном фоне (bg-black),
 * плавно перемещая минималистичный логотип для предотвращения статического выгорания.
 * При первом нажатии любой кнопки на пульте скринсейвер скрывается, полностью блокируя
 * проброс события в интерактивный интерфейс под ним.
 */
export const TvScreensaver: React.FC<TvScreensaverProps> = ({ isIdle, onDismiss }) => {
  useEffect(() => {
    if (!isIdle) return;

    const handleWakeUp = (e: Event) => {
      // Предотвращаем случайное срабатывание интерактивных кнопок под скринсейвером
      e.preventDefault();
      e.stopPropagation();
      if (typeof (e as any).stopImmediatePropagation === 'function') {
        (e as any).stopImmediatePropagation();
      }
      onDismiss();
    };

    // Перехватываем на фазе захвата (capture: true) до любых других обработчиков
    window.addEventListener('keydown', handleWakeUp, true);
    window.addEventListener('pointerdown', handleWakeUp, true);
    window.addEventListener('click', handleWakeUp, true);
    window.addEventListener('touchstart', handleWakeUp, true);

    return () => {
      window.removeEventListener('keydown', handleWakeUp, true);
      window.removeEventListener('pointerdown', handleWakeUp, true);
      window.removeEventListener('click', handleWakeUp, true);
      window.removeEventListener('touchstart', handleWakeUp, true);
    };
  }, [isIdle, onDismiss]);

  return (
    <AnimatePresence>
      {isIdle && (
        <motion.div
          key="tv-screensaver"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden cursor-none select-none"
        >
          {/* Медленно плавающий логотип для предотвращения статического выгорания люминофоров OLED */}
          <motion.div
            animate={{
              x: ['-22vw', '20vw', '-10vw', '18vw', '-22vw'],
              y: ['-18vh', '15vh', '-12vh', '16vh', '-18vh'],
            }}
            transition={{
              duration: 40,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="flex flex-col items-center justify-center p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(225,29,72,0.8)]" />
              <span className="font-display text-2xl sm:text-3xl font-black uppercase tracking-[0.35em] text-white/60">
                PRIME SUSPECT
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.45em] text-white/30">
              ПОД ПОДОЗРЕНИЕМ • OLED PROTECTION
            </span>
          </motion.div>

          {/* Индикатор возврата */}
          <div className="absolute bottom-10 inset-x-0 text-center">
            <span className="text-[11px] font-mono tracking-widest uppercase text-white/20">
              Нажмите любую кнопку на пульте для возврата
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
