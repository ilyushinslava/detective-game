// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGameTimer } from "./useGameTimer";

describe("useGameTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not tick when game has not started", () => {
    const { result } = renderHook(() =>
      useGameTimer({
        hasStartedEver: false,
        isIntroPhase: false,
        winner: null,
      })
    );

    expect(result.current.secondsElapsed).toBe(0);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.secondsElapsed).toBe(0);
  });

  it("ticks when game is active", () => {
    const { result } = renderHook(() =>
      useGameTimer({
        hasStartedEver: true,
        isIntroPhase: false,
        winner: null,
      })
    );

    expect(result.current.secondsElapsed).toBe(0);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.secondsElapsed).toBe(2);
  });

  it("stops ticking when a winner is declared", () => {
    let winner: string | null = null;
    const { result, rerender } = renderHook(() =>
      useGameTimer({
        hasStartedEver: true,
        isIntroPhase: false,
        winner,
      })
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.secondsElapsed).toBe(2);

    winner = "DETECTIVE";
    rerender();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.secondsElapsed).toBe(2);
  });
});
