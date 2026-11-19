// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  playHoverSound,
  playClickSound,
  playShiftSound,
  playEliminateSound,
  playRadarPing,
  _resetAudioContextForTesting,
} from '../tvAudio';
import { soundManager } from '../audio';

describe('tvAudio Utility (Neo-Noir Rules & Audio Invariant)', () => {
  beforeEach(() => {
    _resetAudioContextForTesting();
    vi.spyOn(soundManager, 'play').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('playHoverSound delegates to soundManager.play("tapMenu") without procedural oscillators', () => {
    expect(() => playHoverSound()).not.toThrow();
    expect(soundManager.play).toHaveBeenCalledWith('tapMenu', 0.4);
  });

  it('playClickSound delegates to soundManager.play("click") without procedural oscillators', () => {
    expect(() => playClickSound()).not.toThrow();
    expect(soundManager.play).toHaveBeenCalledWith('click', 0.5);
  });

  it('playShiftSound is safe and does not invoke procedural oscillator', () => {
    expect(() => playShiftSound()).not.toThrow();
    expect(soundManager.play).toHaveBeenCalledWith('slide');
  });

  it('playEliminateSound is safe and does not invoke procedural oscillator', () => {
    expect(() => playEliminateSound()).not.toThrow();
    expect(soundManager.play).toHaveBeenCalledWith('kill');
  });

  it('playRadarPing is safe and does not invoke procedural oscillator', () => {
    expect(() => playRadarPing()).not.toThrow();
    expect(soundManager.play).toHaveBeenCalledWith('radar');
  });
});
