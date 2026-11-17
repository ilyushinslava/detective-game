// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMatchEndHandler } from "../useMatchEndHandler";
import type { GameState } from "../../types/game";

vi.mock("../../utils/audio", () => ({
  soundManager: {
    play: vi.fn(),
  },
}));

vi.mock("../../utils/haptics", () => ({
  triggerHaptic: vi.fn(),
}));

describe("useMatchEndHandler", () => {
  const createMockGameState = (overrides?: Partial<GameState>): GameState => ({
    mode: "MANIAC_VS_OPERATIVE",
    opponent: "AI",
    playerRole: "DETECTIVE",
    winner: undefined,
    gridSize: 3,
    characters: [],
    clues: [],
    log: [],
    turn: 1,
    currentTurn: "DETECTIVE",
    history: [],
    future: [],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("не вызывает recordMatchResult, если победитель еще не определен", () => {
    const mockRecord = vi.fn();
    const matchRecordedRef = { current: false };

    renderHook(() =>
      useMatchEndHandler({
        gameState: createMockGameState({ winner: undefined }),
        matchResultRecordedRef: matchRecordedRef,
        recordMatchResult: mockRecord,
      })
    );

    expect(mockRecord).not.toHaveBeenCalled();
    expect(matchRecordedRef.current).toBe(false);
  });

  it("вызывает recordMatchResult с +25 MMR при победе сыщика в офлайн-игре с ИИ", async () => {
    const mockRecord = vi.fn().mockResolvedValue({ newMmr: 1025, mmrDelta: 25 });
    const mockOnRating = vi.fn();
    const matchRecordedRef = { current: false };

    renderHook(() =>
      useMatchEndHandler({
        gameState: createMockGameState({
          winner: "DETECTIVE",
          playerRole: "DETECTIVE",
          opponent: "AI",
          mode: "MANIAC_VS_OPERATIVE",
        }),
        matchResultRecordedRef: matchRecordedRef,
        recordMatchResult: mockRecord,
        secondsElapsed: 85,
        onRatingCalculated: mockOnRating,
      })
    );

    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        mode: "MANIAC_VS_OPERATIVE",
        winnerRole: "DETECTIVE",
        role: "DETECTIVE",
        durationSeconds: 85,
        mmrDelta: 25,
      })
    );
    expect(matchRecordedRef.current).toBe(true);

    // Дожидаемся разрешения промиса для onRatingCalculated
    await vi.waitFor(() => {
      expect(mockOnRating).toHaveBeenCalledWith({
        newMmr: 1025,
        mmrDelta: 25,
        isWin: true,
      });
    });
  });

  it("вызывает recordMatchResult с -20 MMR при поражении сыщика", async () => {
    const mockRecord = vi.fn().mockResolvedValue({ newMmr: 980, mmrDelta: -20 });
    const mockOnRating = vi.fn();
    const matchRecordedRef = { current: false };

    renderHook(() =>
      useMatchEndHandler({
        gameState: createMockGameState({
          winner: "KILLER",
          playerRole: "DETECTIVE",
          opponent: "AI",
          mode: "THIEF_HUNT",
        }),
        matchResultRecordedRef: matchRecordedRef,
        recordMatchResult: mockRecord,
        secondsElapsed: 110,
        onRatingCalculated: mockOnRating,
      })
    );

    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledWith(
      false,
      expect.objectContaining({
        mode: "THIEF_HUNT",
        winnerRole: "KILLER",
        role: "DETECTIVE",
        durationSeconds: 110,
        mmrDelta: -20,
      })
    );
    expect(matchRecordedRef.current).toBe(true);
  });

  it("гарантирует однократную запись: повторный ререндер не дублирует вызов", () => {
    const mockRecord = vi.fn();
    const matchRecordedRef = { current: false };

    const { rerender } = renderHook(
      ({ state }) =>
        useMatchEndHandler({
          gameState: state,
          matchResultRecordedRef: matchRecordedRef,
          recordMatchResult: mockRecord,
        }),
      {
        initialProps: {
          state: createMockGameState({ winner: "DETECTIVE", playerRole: "DETECTIVE" }),
        },
      }
    );

    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(matchRecordedRef.current).toBe(true);

    // Повторный рендер со стейтом победителя
    rerender({
      state: createMockGameState({ winner: "DETECTIVE", playerRole: "DETECTIVE" }),
    });

    // Количество вызовов по-прежнему ровно 1
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });

  it("начисляет приз только при победе в онлайн-матче", () => {
    const mockAwardPrize = vi.fn();
    const mockRecord = vi.fn();
    const matchRecordedRef = { current: false };

    renderHook(() =>
      useMatchEndHandler({
        gameState: createMockGameState({
          winner: "DETECTIVE",
          playerRole: "DETECTIVE",
          opponent: "ONLINE",
          matchPot: 500,
        }),
        matchResultRecordedRef: matchRecordedRef,
        awardPrize: mockAwardPrize,
        recordMatchResult: mockRecord,
      })
    );

    expect(mockAwardPrize).toHaveBeenCalledWith(500);
    expect(mockRecord).toHaveBeenCalledWith(true, expect.anything());
  });
});
