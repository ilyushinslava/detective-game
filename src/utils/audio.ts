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
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
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
        sound.play().catch(() => {});
      } else if (typeof Audio !== 'undefined') {
        const sound = new Audio(selectedPath);
        sound.volume = Math.max(0, Math.min(1, volume));
        sound.play().catch(() => {});
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
    this.ambientAudio.play().catch(() => {});
  }

  public stopAmbient(): void {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
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
    
    if (!this.isAmbientEnabled && this.ambientAudio) {
      this.ambientAudio.pause();
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