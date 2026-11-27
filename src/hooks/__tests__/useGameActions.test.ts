// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGameActions, type UseGameActionsParams } from "../useGameActions";
import { createInitialState } from "../../utils/gameLogic";

vi.mock("../../utils/audio", () => ({
  soundManager: {
    play: vi.fn(),
  },
}));

vi.mock("../../utils/haptics", () => ({
  triggerHaptic: vi.fn(),
}));

vi.mock("../../utils/partyPeer", () => ({
  partyService: {
    sendAction: vi.fn(),
    isOnline: false,
  },
}));

describe("useGameActions Hook", () => {
  let mockParams: UseGameActionsParams;

  beforeEach(() => {
    vi.clearAllMocks();
    const state = createInitialState("SKHVATKA", "AI", "KILLER");

    mockParams = {
      gameState: state,
      setGameState: vi.fn(),
      dispatchAction: vi.fn(),
      isHumanTurn: true,
      selectedId: null,
      setSelectedId: vi.fn(),
      selectedCharacter: null,
      killerAdjacentIds: ["c2", "c3"],
      detectiveAdjacentIds: [],
      activeAgentAdjacentIds: [],
      isFirstTurnKiller: false,
      isCleanupAvailable: false,
      isKillerView: true,
      isKillerTurn: true,
      setErrorCardId: vi.fn(),
      setIsHandSheetOpen: vi.fn(),
      setIsQuestionCatalogOpen: vi.fn(),
      setIsCandidatesSheetOpen: vi.fn(),
      setIsAccuseModalOpen: vi.fn(),
      handleStartNewGame: vi.fn(),
    };
  });

  describe("Защита от невалидных действий", () => {
    it("handleKill не отправляет экшен, если сейчас не ход игрока (isHumanTurn = false)", () => {
      mockParams.isHumanTurn = false;
      mockParams.selectedId = "c2";
      const { result } = renderHook(() => useGameActions(mockParams));

      act(() => {
        result.current.handleKill("c2");
      });

      expect(mockParams.dispatchAction).not.toHaveBeenCalled();
    });

    it("handleKill не отправляет экшен, если цель не выбрана или не передана", () => {
      mockParams.selectedId = null;
      const { result } = renderHook(() => useGameActions(mockParams));

      act(() => {
        result.current.handleKill(null as any);
      });

      expect(mockParams.dispatchAction).not.toHaveBeenCalled();
    });
  });

  describe("Отправка игровых действий через dispatchAction", () => {
    it("handleKill отправляет экшен KILL_CHARACTER при корректных параметрах", () => {
      mockParams.selectedId = "c2";
      const { result } = renderHook(() => useGameActions(mockParams));

      act(() => {
        result.current.handleKill("c2");
      });

      expect(mockParams.dispatchAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "KILL_CHARACTER",
          payload: { targetId: "c2" },
        })
      );
      expect(mockParams.setSelectedId).toHaveBeenCalledWith(null);
    });

    it("handleShift отправляет экшен SHIFT_BOARD с типом сдвига", () => {
      const { result } = renderHook(() => useGameActions(mockParams));

      act(() => {
        result.current.handleShift("ROW", 1, "LEFT");
      });

      expect(mockParams.dispatchAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SHIFT_BOARD",
          payload: { shiftType: "ROW", index: 1, direction: "LEFT" },
        })
      );
    });

    it("handleReset вызывает перезапуск игры через handleStartNewGame с параметрами матча", () => {
      const { result } = renderHook(() => useGameActions(mockParams));

      act(() => {
        result.current.handleReset();
      });

      expect(mockParams.handleStartNewGame).toHaveBeenCalledWith(
        "SKHVATKA",
        "AI",
        "KILLER",
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe("Фильтрация списков доступных действий (availableActions / targetActions / cleanupAction)", () => {
    it("cleanupAction возвращает действие зачистки, если оно доступно", () => {
      mockParams.isCleanupAvailable = true;
      const { result } = renderHook(() => useGameActions(mockParams));

      expect(result.current.availableActions).toBeInstanceOf(Array);
    });

    it("targetActions не содержит действий зачистки (cleanup_ss / cleanup_basic)", () => {
      const { result } = renderHook(() => useGameActions(mockParams));

      const hasCleanup = result.current.targetActions.some(
        (a) => a.id === "cleanup_ss" || a.id === "cleanup_basic"
      );
      expect(hasCleanup).toBe(false);
    });
  });

  describe("THIEF_HUNT: Действие 'Вызов патруля' (SWEAR_IN_OFFICER)", () => {
    it("Кнопка 'Вызов патруля' заблокирована (disabled: true), если игрок не выделил офицера", () => {
      const state = createInitialState("THIEF_HUNT", "AI", "DETECTIVE");
      state.currentTurn = "DETECTIVE";
      expect(state.uniformedOfficers?.length).toBeGreaterThan(0);
      expect(state.evidenceDeck.length).toBeGreaterThan(0);

      mockParams.gameState = state;
      mockParams.isHumanTurn = true;
      mockParams.isKillerTurn = false;
      mockParams.isKillerView = false;
      mockParams.selectedId = null;

      const { result } = renderHook(() => useGameActions(mockParams));

      const patrolAction = result.current.availableActions.find((a) => a.id === "patrol_call");
      expect(patrolAction).toBeDefined();
      expect(patrolAction?.disabled).toBe(true);
    });

    it("Кнопка 'Вызов патруля' заблокирована (disabled: true), если выбран персонаж не из uniformedOfficers", () => {
      const state = createInitialState("THIEF_HUNT", "AI", "DETECTIVE");
      state.currentTurn = "DETECTIVE";
      const nonOfficerId = "c99_unknown";

      mockParams.gameState = state;
      mockParams.isHumanTurn = true;
      mockParams.isKillerTurn = false;
      mockParams.isKillerView = false;
      mockParams.selectedId = nonOfficerId;

      const { result } = renderHook(() => useGameActions(mockParams));

      const patrolAction = result.current.availableActions.find((a) => a.id === "patrol_call");
      expect(patrolAction).toBeDefined();
      expect(patrolAction?.disabled).toBe(true);

      act(() => {
        result.current.handleSwearInOfficer();
      });
      expect(mockParams.dispatchAction).not.toHaveBeenCalled();
    });

    it("Кнопка 'Вызов патруля' активна ТОЛЬКО при выделении карточки офицера из uniformedOfficers", () => {
      const state = createInitialState("THIEF_HUNT", "AI", "DETECTIVE");
      state.currentTurn = "DETECTIVE";
      const chosenOfficerId = state.uniformedOfficers![0];

      mockParams.gameState = state;
      mockParams.isHumanTurn = true;
      mockParams.isKillerTurn = false;
      mockParams.isKillerView = false;
      mockParams.selectedId = chosenOfficerId;

      const { result } = renderHook(() => useGameActions(mockParams));

      const patrolAction = result.current.availableActions.find((a) => a.id === "patrol_call");
      expect(patrolAction).toBeDefined();
      expect(patrolAction?.disabled).toBe(false);

      act(() => {
        result.current.handleSwearInOfficer();
      });

      expect(mockParams.dispatchAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SWEAR_IN_OFFICER",
          payload: { targetId: chosenOfficerId },
        })
      );
    });
  });

  describe("MEM-RES-03: таймер подсветки ошибки", () => {
    const setupMissAccuse = () => {
      const state = createInitialState("MANIAC_VS_OPERATIVE", "AI", "KILLER");
      state.currentTurn = "DETECTIVE";
      const board = state.board.flat();
      const missTarget = board.find((c) => c.id !== state.killerSecretId)!.id;
      const secondMissTarget = board.find(
        (c) => c.id !== state.killerSecretId && c.id !== missTarget
      )!.id;
      mockParams.gameState = state;
      mockParams.isHumanTurn = true;
      mockParams.selectedId = missTarget;
      return { missTarget, secondMissTarget };
    };

    const nullCalls = () =>
      (mockParams.setErrorCardId as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: any[]) => call[0] === null
      );

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("очищает таймер подсветки при размонтировании (нет setState после unmount)", () => {
      setupMissAccuse();
      const { result, unmount } = renderHook(() => useGameActions(mockParams));

      act(() => {
        result.current.handleAccuse();
      });

      expect(mockParams.setErrorCardId).toHaveBeenCalledTimes(1);
      expect(nullCalls()).toHaveLength(0);

      unmount();

      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Таймер должен быть снят в cleanup-эффекте: сброса в null после unmount нет.
      expect(nullCalls()).toHaveLength(0);
    });

    it("при повторном отказе старый таймер не сбрасывает новую подсветку раньше времени", () => {
      const { missTarget, secondMissTarget } = setupMissAccuse();
      const { result, rerender } = renderHook(
        (params: UseGameActionsParams) => useGameActions(params),
        { initialProps: mockParams }
      );

      act(() => {
        result.current.handleAccuse();
      });
      act(() => {
        vi.advanceTimersByTime(250);
      });

      mockParams = { ...mockParams, selectedId: secondMissTarget };
      rerender(mockParams);

      act(() => {
        result.current.handleAccuse();
      });

      // t = 500 мс от первого отказа: старый таймер уже очищен новым вызовом.
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(nullCalls()).toHaveLength(0);

      // Новый таймер отрабатывает ровно один раз через 500 мс после второго отказа.
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(nullCalls()).toHaveLength(1);

      expect(mockParams.setErrorCardId).toHaveBeenNthCalledWith(1, missTarget);
      expect(mockParams.setErrorCardId).toHaveBeenNthCalledWith(2, secondMissTarget);
    });
  });
});
