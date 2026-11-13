import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseIdleTimerOptions {
  timeoutMs?: number;
  enabled?: boolean;
  onIdle?: () => void;
  onActive?: () => void;
}

/**
 * Глобальный хук для отслеживания простоя (OLED Screen Protection).
 * Отслеживает события клавиатуры/пульта (keydown), мыши (mousemove, wheel), тач-устройств (touchstart).
 * Порог перехода в режим энергосбережения по умолчанию: 5 минут (300 000 мс).
 */
export function useIdleTimer({
  timeoutMs = 300000,
  enabled = true,
  onIdle,
  onActive,
}: UseIdleTimerOptions = {}) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setIsIdle((prev) => {
      if (prev) {
        onActive?.();
        return false;
      }
      return false;
    });

    timerRef.current = setTimeout(() => {
      setIsIdle(true);
      onIdle?.();
    }, timeoutMs);
  }, [enabled, timeoutMs, onIdle, onActive]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsIdle(false);
      return;
    }

    const events = ['keydown', 'mousemove', 'touchstart', 'wheel', 'pointerdown'];

    const handleUserActivity = () => {
      resetTimer();
    };

    resetTimer();

    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [enabled, resetTimer]);

  return { isIdle, setIsIdle, resetTimer };
}
