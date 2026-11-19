/**
 * src/utils/tvAudio.ts
 * Звуковые вызовы для TV-интерфейса.
 * Согласно правилам проекта и регламенту Neo-Noir:
 * Процедурный синтез через createOscillator полностью отключен.
 * Воспроизводятся исключительно оригинальные аудиофайлы из public/sounds через soundManager.
 */

import { soundManager } from "./audio";

let audioCtx: AudioContext | null = null;

export function playHoverSound(): void {
  // Навигация D-Pad: тихий клик меню
  soundManager.play("tapMenu", 0.4);
}

export function playClickSound(): void {
  // Выбор D-Pad: клик
  soundManager.play("click", 0.5);
}

export function playShiftSound(): void {
  // Звук сдвига ряда/колонки через soundManager.play("slide")
  soundManager.play("slide");
}

export function playEliminateSound(): void {
  // Звук выстрела/устранения через soundManager.play("kill")
  soundManager.play("kill");
}

export function playRadarPing(): void {
  // Звук радара через soundManager.play("radar")
  soundManager.play("radar");
}

export function _resetAudioContextForTesting(): void {
  audioCtx = null;
}


