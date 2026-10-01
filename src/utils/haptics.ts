// Универсальный Haptic Feedback для Android, iPhone (iOS Web Audio Click) и Telegram Mini App
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
  if (typeof window === 'undefined') return;

  // 1. Если запущено внутри Telegram Mini App
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

  // 2. Стандартный Android Vibration API
  if (navigator.vibrate) {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(15);
          return;
        case 'medium':
          navigator.vibrate(30);
          return;
        case 'heavy':
          navigator.vibrate(55);
          return;
        case 'success':
          navigator.vibrate([25, 40, 25]);
          return;
        case 'error':
          navigator.vibrate([40, 30, 60]);
          return;
      }
    } catch {
      // Игнорируем
    }
  }

  // 3. iPhone / iOS Safari Taptic Simulator (микро-щелчок звукового синтезатора для тактильного ощущения нажатия)
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(type === 'heavy' || type === 'error' ? 80 : 160, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    }
  } catch {
    // Safari AudioContext restricted
  }
};
