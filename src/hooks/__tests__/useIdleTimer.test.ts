// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimer } from '../useIdleTimer';

describe('useIdleTimer Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initially returns isIdle = false', () => {
    const { result } = renderHook(() => useIdleTimer({ timeoutMs: 1000 }));
    expect(result.current.isIdle).toBe(false);
  });

  it('switches isIdle to true after timeoutMs of inactivity', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() =>
      useIdleTimer({ timeoutMs: 3000, onIdle })
    );

    expect(result.current.isIdle).toBe(false);
    expect(onIdle).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.isIdle).toBe(true);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('resets timer on user input events (keydown, mousemove, touchstart)', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() =>
      useIdleTimer({ timeoutMs: 5000, onIdle })
    );

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.isIdle).toBe(false);

    // Activity arrives before timeout
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.isIdle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.isIdle).toBe(true);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('resets timer and calls onActive when resetTimer is invoked', () => {
    const onActive = vi.fn();
    const { result } = renderHook(() =>
      useIdleTimer({ timeoutMs: 2000, onActive })
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.isIdle).toBe(true);

    act(() => {
      result.current.resetTimer();
    });

    expect(result.current.isIdle).toBe(false);
    expect(onActive).toHaveBeenCalledTimes(1);
  });
});
