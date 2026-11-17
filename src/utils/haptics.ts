import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'turn';

export const setHapticsEnabled = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('crime_city_haptics', enabled ? 'true' : 'false');
  }
};

export const getHapticsEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('crime_city_haptics');
    if (saved !== null) return saved === 'true';
  }
  return true;
};

const safeVibrate = (pattern: number | number[]): boolean => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      return Boolean(navigator.vibrate(pattern));
    }
  } catch {
    // Safari iOS / WebKit may throw NotAllowedError if not directly in user gesture
  }
  return false;
};

/**
 * Универсальный диспетчер тактильной отдачи с каскадными фоллбэками:
 * 1. Нативный Capacitor Haptics (Android / iOS app)
 * 2. Telegram WebApp HapticFeedback
 * 3. Native WebKit iOS WebView message handler
 * 4. W3C Vibration API (Android Chrome / Web)
 * 5. iOS Safari WebKit Switch Click fallback (Taptic Engine)
 */
export const triggerHaptic = (type: HapticFeedbackType) => {
  if (!getHapticsEnabled() || typeof window === 'undefined') return;

  // 1. Нативный плагин Capacitor Haptics (Android / iOS)
  let capacitorHandled = false;
  try {
    if (Capacitor.isPluginAvailable('Haptics')) {
      switch (type) {
        case 'light':
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
          capacitorHandled = true;
          break;
        case 'medium':
          Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
          capacitorHandled = true;
          break;
        case 'heavy':
          Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
          capacitorHandled = true;
          break;
        case 'success':
          Haptics.notification({ type: NotificationType.Success }).catch(() => {});
          capacitorHandled = true;
          break;
        case 'error':
          Haptics.notification({ type: NotificationType.Error }).catch(() => {});
          capacitorHandled = true;
          break;
        case 'turn':
          Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
          capacitorHandled = true;
          break;
      }
    }
  } catch {
    // Безопасный переход на фоллбэки в десктопных браузерах
  }

  if (capacitorHandled) return;

  // 2. Telegram WebApp Haptic
  const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (s: string) => void; notificationOccurred: (s: string) => void } } } }).Telegram?.WebApp?.HapticFeedback;
  if (tg) {
    try {
      if (type === 'success' || type === 'error') {
        tg.notificationOccurred(type);
      } else if (type === 'turn') {
        tg.notificationOccurred('warning');
      } else {
        tg.impactOccurred(type === 'heavy' ? 'heavy' : type === 'medium' ? 'medium' : 'light');
      }
      return;
    } catch {}
  }

  // 3. Native WebKit iOS WebView message handler (if hosted in native iOS wrapper)
  try {
    const webkitHandler = (window as unknown as { webkit?: { messageHandlers?: { haptic?: { postMessage: (msg: string) => void } } } }).webkit?.messageHandlers?.haptic;
    if (webkitHandler && typeof webkitHandler.postMessage === 'function') {
      webkitHandler.postMessage(type);
      return;
    }
  } catch {}

  // 4. W3C Vibration API (Android / Supported Browsers)
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    let triggered = false;
    switch (type) {
      case 'light': triggered = safeVibrate(15); break;
      case 'medium': triggered = safeVibrate([40, 30, 40]); break;
      case 'heavy': triggered = safeVibrate(100); break;
      case 'success': triggered = safeVibrate([20, 40, 20]); break;
      case 'error': triggered = safeVibrate([40, 30, 60]); break;
      case 'turn': triggered = safeVibrate([100, 50, 100]); break;
    }
    if (triggered) return;
  }

  // 5. iOS Safari WebKit Fallback (Taptic Engine Tick via input switch)
  if (typeof document !== 'undefined' && document.body) {
    try {
      let tickInput = document.getElementById('haptic-tick-input') as HTMLInputElement | null;
      if (!tickInput) {
        tickInput = document.createElement('input');
        tickInput.id = 'haptic-tick-input';
        tickInput.type = 'checkbox';
        tickInput.tabIndex = -1;
        tickInput.readOnly = true;
        tickInput.setAttribute('aria-hidden', 'true');
        tickInput.setAttribute('role', 'switch');
        tickInput.style.position = 'fixed';
        tickInput.style.top = '-9999px';
        tickInput.style.left = '-9999px';
        tickInput.style.opacity = '0';
        tickInput.style.pointerEvents = 'none';
        document.body.appendChild(tickInput);
      }
      tickInput.click();
    } catch {}
  }
};

// Семантические хелперы тактильной отдачи
export const hapticImpactLight = () => triggerHaptic('light');
export const hapticImpactMedium = () => triggerHaptic('medium');
export const hapticImpactHeavy = () => triggerHaptic('heavy');
export const hapticSuccess = () => triggerHaptic('success');
export const hapticError = () => triggerHaptic('error');
export const hapticTurnWarning = () => triggerHaptic('turn');
