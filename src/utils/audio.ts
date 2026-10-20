// src/utils/audio.ts

type SoundType =
  | 'splash'
  | 'slide'
  | 'kill'
  | 'disguise'
  | 'radar'
  | 'arrest'
  | 'error'
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
};

class SoundController {
  private isSfxEnabled: boolean = true;
  private isAmbientEnabled: boolean = true;
  private ambientAudio: HTMLAudioElement | null = null;
  private currentAmbientVolume = 0.25;
  
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
    }
  }

  public play(type: SoundType, volume = 0.75): void {
    if (!this.isSfxEnabled) return;

    const variations = SOUND_LIBRARY[type];
    if (!variations || variations.length === 0) return;

    const randomIndex = Math.floor(Math.random() * variations.length);
    const selectedPath = variations[randomIndex];

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

  // Оставлено для совместимости, если где-то используется напрямую
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