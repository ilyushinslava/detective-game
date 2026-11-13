// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playHoverSound, playClickSound, _resetAudioContextForTesting } from '../tvAudio';

describe('tvAudio Utility (Web Audio API)', () => {
  let mockSetValueAtTime: any;
  let mockExponentialRampToValueAtTime: any;
  let mockStart: any;
  let mockStop: any;
  let mockConnect: any;
  let mockResume: any;

  beforeEach(() => {
    _resetAudioContextForTesting();
    mockSetValueAtTime = vi.fn();
    mockExponentialRampToValueAtTime = vi.fn();
    mockStart = vi.fn();
    mockStop = vi.fn();
    mockConnect = vi.fn();
    mockResume = vi.fn().mockResolvedValue(undefined);

    const mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: mockSetValueAtTime,
        exponentialRampToValueAtTime: mockExponentialRampToValueAtTime,
      },
      connect: mockConnect,
      start: mockStart,
      stop: mockStop,
    };

    const mockGain = {
      gain: {
        setValueAtTime: mockSetValueAtTime,
        exponentialRampToValueAtTime: mockExponentialRampToValueAtTime,
      },
      connect: mockConnect,
    };

    const MockAudioContext = vi.fn().mockImplementation(() => ({
      currentTime: 1.0,
      state: 'suspended',
      destination: {},
      createOscillator: vi.fn().mockReturnValue(mockOscillator),
      createGain: vi.fn().mockReturnValue(mockGain),
      resume: mockResume,
    }));

    (window as any).AudioContext = MockAudioContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('playHoverSound executes oscillator with high frequency short pulse and resumes audio context', () => {
    expect(() => playHoverSound()).not.toThrow();
    expect(mockResume).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledWith(1.0);
    expect(mockStop).toHaveBeenCalledWith(1.05);
  });

  it('playClickSound executes triangle oscillator with decay of 0.10s', () => {
    expect(() => playClickSound()).not.toThrow();
    expect(mockResume).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledWith(1.0);
    expect(mockStop).toHaveBeenCalledWith(1.10);
  });

  it('safely handles environments where AudioContext throws or is unavailable', () => {
    (window as any).AudioContext = undefined;
    (window as any).webkitAudioContext = undefined;

    expect(() => playHoverSound()).not.toThrow();
    expect(() => playClickSound()).not.toThrow();
  });
});
