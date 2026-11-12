// src/utils/audio.ts

type SoundType =
  | 'splash'
  | 'slide'
  | 'kill'
  | 'disguise'
  | 'radar'
  | 'arrest'
  | 'error'
  | 'deny'
  | 'click'
  | 'confirm'
  | 'tapMenu'
  | 'impact'
  | 'gameStart'
  | 'win'
  | 'lose'
  | 'patrol'
  | 'steal';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const getPath = (fileName: string) => `${basePath}/sounds/${fileName}`;

const SOUND_LIBRARY: Record<SoundType, string[]> = {
  splash: [getPath('splash.mp3')],
  slide: [getPath('slide-1.mp3'), getPath('slide-2.mp3')],
  kill: [getPath('kill-1.mp3'), getPath('kill-2.mp3'), getPath('shot-distant.mp3')],
  disguise: [getPath('disguise-1.mp3'), getPath('disguise-2.mp3'), getPath('disguise-3.mp3')],
  radar: [getPath('radar-1.mp3'), getPath('radar-2.mp3')],
  arrest: [getPath('arrest.mp3')],
  error: [getPath('error.mp3')],
  impact: [getPath('impact.mp3')],
  gameStart: [getPath('game-start.mp3')],
  win: [getPath('win.mp3')],
  lose: [getPath('lose.mp3')],
  patrol: [getPath('patrol-siren.mp3')],
  steal: [getPath('coin-steal.mp3'), getPath('coin-steal2.mp3')],
  deny: [getPath('deny.mp3')],
  click: [getPath('click.mp3')],
  confirm: [getPath('confirm.mp3')],
  tapMenu: [getPath('tapInMenu.mp3')],
};

class SoundController {
  private isSfxEnabled: boolean = true;
  private isAmbientEnabled: boolean = true;
  private ambientAudio: HTMLAudioElement | null = null;
  private currentAmbientVolume = 0.25;
  private lastPlayTime: Map<string, number> = new Map();
  
  // Web Audio API
  private ctx: AudioContext | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private isDecodingMap: Map<string, Promise<AudioBuffer | null>> = new Map();
  private morseOsc: OscillatorNode | null = null;
  private morseGain: GainNode | null = null;

  // Процедурный ТВ-эмбиент на Web Audio API (чистый синтез, zero-asset)
  private tvAmbientNodes: {
    osc1: OscillatorNode;
    osc2: OscillatorNode;
    oscSub: OscillatorNode;
    filter: BiquadFilterNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
    gain: GainNode;
  } | null = null;
  private tvAmbientTargetVolume = 0.16;

  // HTMLAudio fallback pool
  private audioPool: Map<string, HTMLAudioElement[]> = new Map();
  private poolIndex: Map<string, number> = new Map();
  private readonly POOL_SIZE = 2;

  constructor() {
    if (typeof window !== 'undefined') {
      if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
        try {
          (navigator as any).audioSession.type = 'ambient';
        } catch {}
      }

      const savedSfx = localStorage.getItem('crime_city_sfx');
      if (savedSfx !== null) this.isSfxEnabled = savedSfx === 'true';

      const savedAmbient = localStorage.getItem('crime_city_ambient');
      if (savedAmbient !== null) this.isAmbientEnabled = savedAmbient === 'true';

      // Инициализация Web Audio контекста и предзагрузка
      this.initAudioContext();
      this.preloadAllBuffers();

      // Fallback пул HTMLAudio
      if (typeof Audio !== 'undefined') {
        Object.values(SOUND_LIBRARY).flat().forEach((path) => {
          const pool: HTMLAudioElement[] = [];
          for (let i = 0; i < this.POOL_SIZE; i++) {
            const audio = new Audio(path);
            audio.preload = 'auto';
            pool.push(audio);
          }
          this.audioPool.set(path, pool);
          this.poolIndex.set(path, 0);
        });
      }

      // Глобальный триггер разблокировки AudioContext при первом касании/клике
      const unlock = () => {
        this.unlockAudioContext();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true, passive: true });
    }
  }

  private initAudioContext(): void {
    if (typeof window === 'undefined') return;
    try {
      if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
        try {
          (navigator as any).audioSession.type = 'ambient';
        } catch {}
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx && !this.ctx) {
        this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      }
    } catch (e) {
      console.warn('[Audio] Web Audio API не поддерживается:', e);
    }
  }

  public unlockAudioContext(): void {
    this.initAudioContext();
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      try {
        const silentBuffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(this.ctx.destination);
        source.start(0);
      } catch (_) {}
    }
  }

  private async fetchAndDecode(path: string): Promise<AudioBuffer | null> {
    if (this.bufferCache.has(path)) {
      return this.bufferCache.get(path)!;
    }
    if (this.isDecodingMap.has(path)) {
      return this.isDecodingMap.get(path)!;
    }

    const decodePromise = (async () => {
      try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        if (!this.ctx) return null;
        const decoded = await this.ctx.decodeAudioData(arrayBuffer);
        this.bufferCache.set(path, decoded);
        return decoded;
      } catch (err) {
        console.warn(`[Audio] Ошибка декодирования ${path}:`, err);
        return null;
      } finally {
        this.isDecodingMap.delete(path);
      }
    })();

    this.isDecodingMap.set(path, decodePromise);
    return decodePromise;
  }

  private preloadAllBuffers(): void {
    if (!this.ctx) return;
    const allPaths = Array.from(new Set(Object.values(SOUND_LIBRARY).flat()));
    for (const path of allPaths) {
      this.fetchAndDecode(path).catch(() => {});
    }
  }

  public play(type: SoundType, volume = 0.75): void {
    if (!this.isSfxEnabled) return;

    const throttledTypes = ['kill', 'arrest', 'error', 'deny', 'steal'];
    if (throttledTypes.includes(type)) {
      const now = Date.now();
      const last = this.lastPlayTime.get(type) || 0;
      if (now - last < 250) return;
      this.lastPlayTime.set(type, now);
    }

    const variations = SOUND_LIBRARY[type];
    if (!variations || variations.length === 0) return;

    const randomIndex = Math.floor(Math.random() * variations.length);
    const selectedPath = variations[randomIndex];

    // Приоритет 1: Web Audio API (нулевая задержка, полифония, микширование)
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const cachedBuffer = this.bufferCache.get(selectedPath);
      if (cachedBuffer) {
        try {
          const source = this.ctx.createBufferSource();
          source.buffer = cachedBuffer;

          const gainNode = this.ctx.createGain();
          gainNode.gain.value = Math.max(0, Math.min(1, volume));

          source.connect(gainNode);
          gainNode.connect(this.ctx.destination);

          source.start(0);
          return;
        } catch (e) {
          console.warn('[Audio] Ошибка воспроизведения через Web Audio API, переключение на fallback:', e);
        }
      } else {
        // Фоновая подгрузка в кеш для последующих вызовов
        this.fetchAndDecode(selectedPath).catch(() => {});
      }
    }

    // Приоритет 2: HTMLAudioElement fallback
    try {
      const pool = this.audioPool.get(selectedPath);
      if (pool && pool.length > 0) {
        const index = this.poolIndex.get(selectedPath) || 0;
        const sound = pool[index];
        
        this.poolIndex.set(selectedPath, (index + 1) % this.POOL_SIZE);

        sound.currentTime = 0;
        sound.volume = Math.max(0, Math.min(1, volume));
        sound.play()?.catch?.(() => {});
      } else if (typeof Audio !== 'undefined') {
        const sound = new Audio(selectedPath);
        sound.volume = Math.max(0, Math.min(1, volume));
        sound.play()?.catch?.(() => {});
      }
    } catch (err) {
      console.warn(`[Audio] Ошибка воспроизведения ${selectedPath}:`, err);
    }
  }

  public playAmbient(volume = 0.25): void {
    this.currentAmbientVolume = volume;
    if (!this.isAmbientEnabled) return;

    if (!this.ambientAudio) {
      this.ambientAudio = new Audio(getPath('ambient.mp3'));
      this.ambientAudio.loop = true;
    }

    this.ambientAudio.volume = this.currentAmbientVolume;
    this.ambientAudio.play()?.catch?.(() => {});
  }

  public stopAmbient(): void {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
    }
  }

  /**
   * Запуск аналогового тона телеграфного ключа через Web Audio API (TASK-SND-001)
   * @param frequency Частота тона в Гц (по умолчанию 700 Гц — стандартный CW радиосигнал)
   */
  public startMorseTone(frequency: number = 700): void {
    if (!this.isSfxEnabled) return;

    this.unlockAudioContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.morseOsc) {
      return; // Уже играет
    }

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);

      const gain = this.ctx.createGain();
      // Атака (Envelope attack): плавное нарастание от 0 за 15 мс для исключения щелчков
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.015);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);

      this.morseOsc = osc;
      this.morseGain = gain;
    } catch (err) {
      console.warn('[Audio] Ошибка воспроизведения тона Морзе:', err);
    }
  }

  /**
   * Остановка тона телеграфного ключа с мягким спадом огибающей (Release envelope: 15 мс)
   */
  public stopMorseTone(): void {
    if (!this.ctx || !this.morseGain || !this.morseOsc) {
      this.morseOsc = null;
      this.morseGain = null;
      return;
    }

    try {
      const now = this.ctx.currentTime;
      const osc = this.morseOsc;
      const gain = this.morseGain;

      this.morseOsc = null;
      this.morseGain = null;

      const currentGain = typeof gain.gain.value === 'number' ? gain.gain.value : 0.2;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(currentGain, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.015);

      osc.stop(now + 0.02);
      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (_) {}
      }, 50);
    } catch (err) {
      console.warn('[Audio] Ошибка остановки тона Морзе:', err);
      this.morseOsc = null;
      this.morseGain = null;
    }
  }

  /**
   * Запуск кинематографичного аналогового нео-нуарного эмбиента для лобби ТВ
   * Синтезируется напрямую через Web Audio API без скачивания тяжелых аудиофайлов.
   * Архитектура:
   * - Корневой тон (55 Гц / суббас A1) + детюненный обертон (55.4 Гц / треугольник)
   * - Глубокий суб-бас (27.5 Гц / A0)
   * - Теплый низкочастотный фильтр (BiquadFilter 140 Гц, Q=2.0)
   * - Медленная LFO-модуляция частоты среза (0.07 Гц, «дыхание» ~14 сек)
   * - Мягкая огибающая нарастания (Fade-In 2.0 сек)
   */
  public startTvAmbient(volume: number = 0.16): void {
    this.tvAmbientTargetVolume = volume;
    if (!this.isAmbientEnabled) return;

    this.unlockAudioContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.tvAmbientNodes) {
      return; // Уже запущен
    }

    try {
      const now = this.ctx.currentTime;

      // Низкочастотный фильтр с аналоговым резонансом
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      if (filter.frequency.setValueAtTime) {
        filter.frequency.setValueAtTime(140, now);
      } else {
        filter.frequency.value = 140;
      }
      if (filter.Q.setValueAtTime) {
        filter.Q.setValueAtTime(2.0, now);
      } else {
        filter.Q.value = 2.0;
      }

      // Медленный генератор модуляции (LFO)
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      if (lfo.frequency.setValueAtTime) {
        lfo.frequency.setValueAtTime(0.07, now);
      } else {
        lfo.frequency.value = 0.07;
      }

      const lfoGain = this.ctx.createGain();
      if (lfoGain.gain.setValueAtTime) {
        lfoGain.gain.setValueAtTime(35, now);
      } else {
        lfoGain.gain.value = 35;
      }

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      // Основной фундаментальный тон
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      if (osc1.frequency.setValueAtTime) {
        osc1.frequency.setValueAtTime(55, now);
      } else {
        osc1.frequency.value = 55;
      }

      // Детюненный обертон (создает фазовое биение)
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      if (osc2.frequency.setValueAtTime) {
        osc2.frequency.setValueAtTime(55.4, now);
      } else {
        osc2.frequency.value = 55.4;
      }

      // Суб-гармоника для массивности звука в зале
      const oscSub = this.ctx.createOscillator();
      oscSub.type = 'sine';
      if (oscSub.frequency.setValueAtTime) {
        oscSub.frequency.setValueAtTime(27.5, now);
      } else {
        oscSub.frequency.value = 27.5;
      }

      // Мастер-гейн эмбиента с плавным нарастанием
      const gain = this.ctx.createGain();
      const targetVol = Math.max(0, Math.min(1, volume));
      if (gain.gain.setValueAtTime && gain.gain.linearRampToValueAtTime) {
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(targetVol, now + 2.0);
      } else {
        gain.gain.value = targetVol;
      }

      osc1.connect(filter);
      osc2.connect(filter);
      oscSub.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      oscSub.start(now);
      lfo.start(now);

      this.tvAmbientNodes = { osc1, osc2, oscSub, filter, lfo, lfoGain, gain };
    } catch (err) {
      console.warn('[Audio] Ошибка запуска ТВ эмбиента:', err);
      this.tvAmbientNodes = null;
    }
  }

  /**
   * Остановка кинематографичного эмбиента лобби ТВ с мягким спадом (1.2 сек)
   */
  public stopTvAmbient(): void {
    if (!this.tvAmbientNodes || !this.ctx) {
      this.tvAmbientNodes = null;
      return;
    }

    try {
      const now = this.ctx.currentTime;
      const { osc1, osc2, oscSub, lfo, lfoGain, filter, gain } = this.tvAmbientNodes;
      this.tvAmbientNodes = null;

      const currentGain = typeof gain.gain.value === 'number' ? gain.gain.value : this.tvAmbientTargetVolume;
      if (gain.gain.cancelScheduledValues && gain.gain.setValueAtTime && gain.gain.linearRampToValueAtTime) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(currentGain, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 1.2);
      }

      if (osc1.stop) osc1.stop(now + 1.25);
      if (osc2.stop) osc2.stop(now + 1.25);
      if (oscSub.stop) oscSub.stop(now + 1.25);
      if (lfo.stop) lfo.stop(now + 1.25);

      setTimeout(() => {
        try {
          osc1.disconnect();
          osc2.disconnect();
          oscSub.disconnect();
          lfo.disconnect();
          lfoGain.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (_) {}
      }, 1300);
    } catch (err) {
      console.warn('[Audio] Ошибка остановки ТВ эмбиента:', err);
      this.tvAmbientNodes = null;
    }
  }

  public isTvAmbientActive(): boolean {
    return this.tvAmbientNodes !== null;
  }

  /**
   * Полная остановка всех звуковых эффектов, фонового эмбиента и тонов Морзе
   */
  public stopAll(): void {
    this.stopMorseTone();
    this.stopTvAmbient();
    this.stopAmbient();
    if (this.audioPool && (typeof process === 'undefined' || !process.env?.VITEST)) {
      for (const pool of this.audioPool.values()) {
        for (const audio of pool) {
          try {
            if (typeof audio.pause === 'function' && !audio.paused) {
              audio.pause();
              audio.currentTime = 0;
            }
          } catch (_) {}
        }
      }
    }
  }

  public toggleSfx(): boolean {
    this.isSfxEnabled = !this.isSfxEnabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('crime_city_sfx', this.isSfxEnabled ? 'true' : 'false');
    }
    return this.isSfxEnabled;
  }

  public toggleAmbient(): boolean {
    this.isAmbientEnabled = !this.isAmbientEnabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('crime_city_ambient', this.isAmbientEnabled ? 'true' : 'false');
    }
    
    if (!this.isAmbientEnabled) {
      if (this.ambientAudio) {
        this.ambientAudio.pause();
      }
      this.stopTvAmbient();
    } else if (this.isAmbientEnabled) {
      this.playAmbient(this.currentAmbientVolume);
    }
    return this.isAmbientEnabled;
  }

  public getSfxEnabled(): boolean {
    return this.isSfxEnabled;
  }

  public getAmbientEnabled(): boolean {
    return this.isAmbientEnabled;
  }

  public getMuted(): boolean {
    return !this.isSfxEnabled && !this.isAmbientEnabled;
  }

  public toggleMute(): boolean {
    const isCurrentlyMuted = this.getMuted();
    if (!isCurrentlyMuted) {
      if (this.isSfxEnabled) this.toggleSfx();
      if (this.isAmbientEnabled) this.toggleAmbient();
    } else {
      if (!this.isSfxEnabled) this.toggleSfx();
      if (!this.isAmbientEnabled) this.toggleAmbient();
    }
    return this.getMuted();
  }
}

export const soundManager = new SoundController();