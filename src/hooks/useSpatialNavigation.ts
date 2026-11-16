import { useEffect, useCallback } from 'react';
import { playHoverSound, playClickSound } from '../utils/tvAudio';

export interface SpatialNavigationOptions {
  containerRef?: React.RefObject<HTMLElement | null>;
  initialFocusSelector?: string;
  enabled?: boolean;
}

/**
 * Хук для навигации пультом Android TV (D-Pad: Стрелки + Enter).
 * Находит интерактивные элементы и переключает фокус по геометрическим координатам (Spatial Navigation).
 * При нажатии Enter эмулирует click() на текущем activeElement.
 */
export function useSpatialNavigation({
  containerRef,
  initialFocusSelector,
  enabled = true,
}: SpatialNavigationOptions = {}) {
  const getFocusableElements = useCallback((): HTMLElement[] => {
    const root = containerRef?.current || document;
    const selector = 'button:not([disabled]), [tabindex="0"]:not([disabled]), input:not([disabled]), [role="button"]:not([disabled])';
    const elements = Array.from(root.querySelectorAll<HTMLElement>(selector));
    return elements.filter((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        el.offsetParent !== null &&
        !el.hasAttribute('disabled')
      );
    });
  }, [containerRef]);

  // Установка первоначального фокуса при монтировании
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      if (typeof document === 'undefined') return;
      const root = containerRef?.current || document;
      if (initialFocusSelector) {
        const initialEl = root.querySelector<HTMLElement>(initialFocusSelector);
        if (initialEl) {
          initialEl.focus();
          return;
        }
      }
      const focusables = getFocusableElements();
      if (focusables.length > 0 && (!document.activeElement || document.activeElement === document.body)) {
        focusables[0].focus();
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [enabled, initialFocusSelector, containerRef, getFocusableElements]);

  // Обработка аппаратных кнопок пульта Android TV
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const isUp = e.key === 'ArrowUp' || e.keyCode === 38 || e.keyCode === 19;
      const isDown = e.key === 'ArrowDown' || e.keyCode === 40 || e.keyCode === 20;
      const isLeft = e.key === 'ArrowLeft' || e.keyCode === 37 || e.keyCode === 21;
      const isRight = e.key === 'ArrowRight' || e.keyCode === 39 || e.keyCode === 22;
      const isEnter = e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23 || e.keyCode === 66 || e.key === ' ';

      if (!isUp && !isDown && !isLeft && !isRight && !isEnter) {
        return;
      }

      if (isEnter) {
        const active = document.activeElement as HTMLElement | null;
        if (active && typeof active.click === 'function' && active !== document.body) {
          e.preventDefault();
          playClickSound();
          active.click();
        }
        return;
      }

      if (isInput && (isLeft || isRight)) {
        return;
      }

      const focusables = getFocusableElements();
      if (focusables.length === 0) return;

      const currentActive = (document.activeElement as HTMLElement) || focusables[0];
      const currentRect = currentActive.getBoundingClientRect();
      const currentCenterX = currentRect.left + currentRect.width / 2;
      const currentCenterY = currentRect.top + currentRect.height / 2;

      let bestElement: HTMLElement | null = null;
      let minDistance = Infinity;

      for (const el of focusables) {
        if (el === currentActive) continue;
        const rect = el.getBoundingClientRect();
        const targetCenterX = rect.left + rect.width / 2;
        const targetCenterY = rect.top + rect.height / 2;

        const dx = targetCenterX - currentCenterX;
        const dy = targetCenterY - currentCenterY;

        let isInDirection = false;
        if (isRight && dx > 15) isInDirection = true;
        if (isLeft && dx < -15) isInDirection = true;
        if (isDown && dy > 15) isInDirection = true;
        if (isUp && dy < -15) isInDirection = true;

        if (isInDirection) {
          const primaryDist = isLeft || isRight ? Math.abs(dx) : Math.abs(dy);
          const secondaryDist = isLeft || isRight ? Math.abs(dy) : Math.abs(dx);
          // Штрафуем отклонение от прямой траектории
          const distance = primaryDist + secondaryDist * 2.5;

          if (distance < minDistance) {
            minDistance = distance;
            bestElement = el;
          }
        }
      }

      if (bestElement) {
        e.preventDefault();
        bestElement.focus();
        playHoverSound();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, getFocusableElements]);
}
