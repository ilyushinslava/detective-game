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

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
  if (!getHapticsEnabled() || typeof window === 'undefined') return;

  const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (s: string) => void; notificationOccurred: (s: string) => void } } } }).Telegram?.WebApp?.HapticFeedback;
  if (tg) {
    try {
      if (type === 'success' || type === 'error') {
        tg.notificationOccurred(type);
      } else {
        tg.impactOccurred(type === 'heavy' ? 'heavy' : type === 'medium' ? 'medium' : 'light');
      }
      return;
    } catch {}
  }

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      switch (type) {
        case 'light': navigator.vibrate(15); return;
        case 'medium': navigator.vibrate([40, 30, 40]); return;
        case 'heavy': navigator.vibrate(100); return;
        case 'success': navigator.vibrate([20, 40, 20]); return;
        case 'error': navigator.vibrate([40, 30, 60]); return;
      }
    } catch {}
  }

  // iOS Safari WebKit Fallback (Taptic Engine Tick)
  if (typeof document !== 'undefined' && document.body) {
    try {
      let tickInput = document.getElementById('haptic-tick-input') as HTMLInputElement | null;
      if (!tickInput) {
        tickInput = document.createElement('input');
        tickInput.id = 'haptic-tick-input';
        tickInput.type = 'checkbox';
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
