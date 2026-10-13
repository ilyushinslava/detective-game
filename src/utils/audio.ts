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
  | 'lose';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const getPath = (fileName: string) => `${basePath}/sounds/${fileName}`;

const SOUND_LIBRARY: Record<SoundType, string[]> = {
  splash: [getPath('splash.mp3')],
  slide: [getPath('slide-1.mp3'), getPath('slide-2.mp3')],
  kill: [getPath('kill-1.mp3'), getPath('kill-2.mp3')],
  disguise: [getPath('disguise-1.mp3'), getPath('disguise-2.mp3'), getPath('disguise-3.mp3')],
  radar: [getPath('radar-1.mp3'), getPath('radar-2.mp3')],
  arrest: [getPath('arrest.mp3')],
  error: [getPath('error.mp3')],
  impact: [getPath('impact.mp3')],
  gameStart: [getPath('game-start.mp3')],
  win: [getPath('win.mp3')],
  lose: [getPath('lose.mp3')],
};

class SoundController {
  private isMuted: boolean = false;
  private ambientAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      Object.values(SOUND_LIBRARY).flat().forEach((path) => {
        const audio = new Audio(path);
        audio.preload = 'auto';
      });
    }
  }

  public play(type: SoundType, volume = 0.75): void {
    if (this.isMuted) return;

    const variations = SOUND_LIBRARY[type];
    if (!variations || variations.length === 0) return;

    const randomIndex = Math.floor(Math.random() * variations.length);
    const selectedPath = variations[randomIndex];

    try {
      const sound = new Audio(selectedPath);
      sound.volume = Math.max(0, Math.min(1, volume));
      sound.play().catch(() => {});
    } catch (err) {
      console.warn(`[Audio] Ошибка воспроизведения ${selectedPath}:`, err);
    }
  }

  public playAmbient(volume = 0.25): void {
    if (this.isMuted) return;

    if (!this.ambientAudio) {
      this.ambientAudio = new Audio(getPath('ambient.mp3'));
      this.ambientAudio.loop = true;
    }

    this.ambientAudio.volume = volume;
    this.ambientAudio.play().catch(() => {});
  }

  public stopAmbient(): void {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio.currentTime = 0;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.ambientAudio) {
      this.ambientAudio.pause();
    } else if (!this.isMuted && this.ambientAudio) {
      this.ambientAudio.play().catch(() => {});
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const soundManager = new SoundController();