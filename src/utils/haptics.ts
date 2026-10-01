let isHapticsEnabled = true;

export const setHapticsEnabled = (enabled: boolean) => {
  isHapticsEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('noir_haptics', enabled ? 'true' : 'false');
  }
};

export const getHapticsEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('noir_haptics');
    if (saved !== null) return saved === 'true';
  }
  return true;
};

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
  if (!getHapticsEnabled() || typeof window === 'undefined') return;

  // 1. Telegram WebApp Haptic API
  const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (s: string) => void; notificationOccurred: (s: string) => void } } } }).Telegram?.WebApp?.HapticFeedback;
  if (tg) {
    try {
      if (type === 'success' || type === 'error') {
        tg.notificationOccurred(type);
      } else {
        tg.impactOccurred(type === 'heavy' ? 'heavy' : type === 'medium' ? 'medium' : 'light');
      }
      return;
    } catch {
      // Игнорируем
    }
  }

  // 2. Android Vibration API
  if (navigator.vibrate) {
    try {
      switch (type) {
        case 'light': navigator.vibrate(18); return;
        case 'medium': navigator.vibrate(35); return;
        case 'heavy': navigator.vibrate(60); return;
        case 'success': navigator.vibrate([20, 40, 20]); return;
        case 'error': navigator.vibrate([40, 30, 60]); return;
      }
    } catch {
      // Игнорируем
    }
  }

  // 3. iPhone Safari Taptic Simulator (микро-щелчок звукового генератора для физического ощущения)
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(type === 'heavy' || type === 'error' ? 75 : 150, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch {
    // Игнорируем ограничения автовоспроизведения
  }
};
