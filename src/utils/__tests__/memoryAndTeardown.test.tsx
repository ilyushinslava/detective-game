// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, render, cleanup } from '@testing-library/react';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import { useSpatialNavigation } from '../../hooks/useSpatialNavigation';
import { TvBoardView } from '../../components/tv/TvBoardView';
import { createInitialState } from '../gameLogic';
import { playHoverSound, playClickSound, _resetAudioContextForTesting } from '../tvAudio';

describe('Memory & Teardown Audit (Phase 6)', () => {
  let addEventListenerSpy: any;
  let removeEventListenerSpy: any;
  let docAddEventListenerSpy: any;
  let docRemoveEventListenerSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    docAddEventListenerSpy = vi.spyOn(document, 'addEventListener');
    docRemoveEventListenerSpy = vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('useIdleTimer: attaches events on mount and removes all matching listeners on unmount', () => {
    const { unmount } = renderHook(() => useIdleTimer({ timeoutMs: 1000 }));

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), { passive: true });
    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function), { passive: true });
    expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
  });

  it('useSpatialNavigation: removes keydown listener with useCapture on unmount or disable', () => {
    const { unmount } = renderHook(() => useSpatialNavigation());

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
  });

  it('TvBoardView: removes window keydown and document backbutton listeners on unmount', () => {
    const mockState = createInitialState('MANIAC_VS_OPERATIVE', 'ONLINE', 'KILLER', 2, 3, 16, 'Игрок 2');
    const { unmount } = render(
      <TvBoardView
        gameState={mockState}
        secondsLeft={60}
      />
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(docAddEventListenerSpy).toHaveBeenCalledWith('backbutton', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(docRemoveEventListenerSpy).toHaveBeenCalledWith('backbutton', expect.any(Function));
  });

  it('tvAudio: AudioContext is a strict singleton (constructor called only once across multiple sound calls)', () => {
    _resetAudioContextForTesting();

    const mockStart = vi.fn();
    const mockStop = vi.fn();
    const mockConnect = vi.fn();
    const mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: mockConnect,
      start: mockStart,
      stop: mockStop,
    };

    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: mockConnect,
    };

    let constructorCallCount = 0;
    const MockAudioContext = vi.fn().mockImplementation(() => {
      constructorCallCount++;
      return {
        currentTime: 0,
        state: 'running',
        destination: {},
        createOscillator: vi.fn().mockReturnValue(mockOscillator),
        createGain: vi.fn().mockReturnValue(mockGain),
        resume: vi.fn().mockResolvedValue(undefined),
      };
    });

    (window as any).AudioContext = MockAudioContext;

    // Вызываем звуки 20 раз подряд
    for (let i = 0; i < 10; i++) {
      playHoverSound();
      playClickSound();
    }

    // Проверяем, что инстанс AudioContext был создан ровно 1 раз (защита от лимита 6 инстансов в WebView)
    expect(constructorCallCount).toBe(1);
    expect(MockAudioContext).toHaveBeenCalledTimes(1);
  });
});
