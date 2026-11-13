/**
 * src/utils/tvAudio.ts
 * Синтез процедурных UI-звуков через Web Audio API для пульта Android TV (D-Pad).
 * Не требует загрузки внешних аудиофайлов, работает мгновенно с нулевой задержкой.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) return null;

  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }

  // Автоматический resume при пользовательском жесте (требование автоплея в современных браузерах)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

// Глобальный слушатель первого пользовательского взаимодействия для разблокировки AudioContext
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('keydown', unlockAudio, { passive: true, once: true });
  window.addEventListener('click', unlockAudio, { passive: true, once: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
}

/**
 * Очень короткий, тихий "тик" при навигации D-Pad по элементам.
 * Осциллятор: sine, высокая частота (~950Hz -> ~1300Hz), затухание за 0.05с.
 */
export function playHoverSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    // Короткий мягкий импульс высокой частоты
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(1300, now + 0.04);

    // Тихий уровень громкости с быстрым затуханием за 0.05с
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch {
    // Graceful fallback в средах без полной поддержки Web Audio API (например, jsdom)
  }
}

/**
 * Более плотный подтверждающий звук при нажатии Enter (DPAD_CENTER).
 * Осциллятор: triangle, низкая/средняя частота (~320Hz -> ~160Hz), затухание за 0.1с.
 */
export function playClickSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const now = ctx.currentTime;

    // Плотный тактильный клик
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.09);

    // Уверенный, но комфортный щелчок за 0.10с
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.10);
  } catch {
    // Graceful fallback
  }
}

/**
 * Для изоляции юнит-тестов
 */
export function _resetAudioContextForTesting(): void {
  audioCtx = null;
}

