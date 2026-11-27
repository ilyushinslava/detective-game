// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMultiplayer } from "../useMultiplayer";
import { partyService } from "../partyPeer";
import { soundManager } from "../audio";
import { createInitialState } from "../gameLogic";

vi.mock("../audio", () => ({
  soundManager: {
    play: vi.fn(),
  },
}));

vi.mock("../partyPeer", () => ({
  partyService: {
    roomCode: "TEST_ROOM",
    isHost: true,
    ensureConnection: vi.fn(),
    disconnect: vi.fn(),
    sendAction: vi.fn(),
    onSyncState: null,
    onRoomStatus: null,
    onAllPlayersReady: null,
    onPresenceChanged: null,
    onAction: null,
  },
}));

describe("useMultiplayer Hook", () => {
  let mockParams: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    sessionStorage.clear();

    const baseState = createInitialState("SKHVATKA", "ONLINE", "KILLER");

    mockParams = {
      gameState: baseState,
      setGameState: vi.fn((updater) => {
        if (typeof updater === "function") {
          mockParams.gameState = updater(mockParams.gameState);
        } else {
          mockParams.gameState = updater;
        }
      }),
      profile: { nickname: "Agent 007", rating: 1200 },
      setActiveMode: vi.fn(),
      setIsLobbyOpen: vi.fn(),
      setHasStartedEver: vi.fn(),
      setIsIntroPhase: vi.fn(),
      setToastMessage: vi.fn(),
      dispatchAction: vi.fn(),
      matchResultRecordedRef: { current: false },
      setSelectedId: vi.fn(),
      setSelectedInspectorChoiceId: vi.fn(),
      setSecondsElapsed: vi.fn(),
      setIsPauseOpen: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe("Фоновая активность и переподключение (visibility & focus)", () => {
    it("вызывает partyService.ensureConnection при возвращении вкладки в фокус", () => {
      renderHook(() => useMultiplayer(mockParams));

      act(() => {
        window.dispatchEvent(new Event("focus"));
      });

      expect(partyService.ensureConnection).toHaveBeenCalled();
    });
  });

  describe("Обработка сетевых событий partyService", () => {
    it("onSyncState обновляет стейт и играет звук kill при увеличении числа жертв", () => {
      renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onSyncState?.(
          {
            ...mockParams.gameState,
            killCount: 1,
            mode: "SKHVATKA",
          },
          "KILLER",
          "PLAYING"
        );
      });

      expect(soundManager.play).toHaveBeenCalledWith("kill");
      expect(mockParams.setIsIntroPhase).toHaveBeenCalledWith(false);
      expect(mockParams.setHasStartedEver).toHaveBeenCalledWith(true);
    });

    it("onSyncState играет звук slide при изменении положения рядов/колонок", () => {
      mockParams.gameState.lastShift = { type: "ROW", index: 0, direction: "LEFT" };
      renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onSyncState?.(
          {
            ...mockParams.gameState,
            lastShift: { type: "ROW", index: 1, direction: "RIGHT" },
          },
          "KILLER",
          "PLAYING"
        );
      });

      expect(soundManager.play).toHaveBeenCalledWith("slide");
    });

    it("onRoomStatus EMPTY сбрасывает сессию и открывает лобби", () => {
      sessionStorage.setItem("mp_session", "room_123");
      renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onRoomStatus?.({ status: "EMPTY" });
      });

      expect(sessionStorage.getItem("mp_session")).toBeNull();
      expect(mockParams.setIsLobbyOpen).toHaveBeenCalledWith(true);
      expect(mockParams.setHasStartedEver).toHaveBeenCalledWith(false);
    });

    it("onPresenceChanged меняет флаги подключения соперника", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onPresenceChanged?.(false);
      });

      expect(result.current.isOpponentConnected).toBe(false);
      expect(result.current.opponentDisconnectedNotice).toBe(true);

      act(() => {
        partyService.onPresenceChanged?.(true);
      });

      expect(result.current.isOpponentConnected).toBe(true);
      expect(result.current.opponentDisconnectedNotice).toBe(false);
    });

    it("onAction REQUEST_RESTART и REJECT_RESTART перенаправляются в dispatchAction", () => {
      renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onAction?.({ type: "REQUEST_RESTART", payload: {} });
      });

      expect(mockParams.dispatchAction).toHaveBeenCalledWith(
        expect.objectContaining({ type: "REQUEST_RESTART", senderId: "remote" })
      );

      act(() => {
        partyService.onAction?.({ type: "REJECT_RESTART" });
      });

      expect(mockParams.dispatchAction).toHaveBeenCalledWith(
        expect.objectContaining({ type: "REJECT_RESTART", senderId: "remote" })
      );
      expect(mockParams.setToastMessage).toHaveBeenCalledWith("Соперник отклонил предложение о реванше");
    });
  });

  describe("Логика запроса и подтверждения реванша", () => {
    it("requestRematch отправляет REQUEST_RESTART с senderId local", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        result.current.requestRematch("SWAP");
      });

      expect(mockParams.dispatchAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "REQUEST_RESTART",
          senderId: "local",
          payload: { rematchMode: "SWAP", requestedBy: "HOST" },
        })
      );
    });

    it("acceptRestart отправляет CONFIRM_RESTART и сбрасывает restartRequestedBy", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        result.current.acceptRestart();
      });

      expect(mockParams.dispatchAction).toHaveBeenCalledWith({
        type: "CONFIRM_RESTART",
        senderId: "local",
      });
    });

    it("rejectRestart отправляет REJECT_RESTART", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        result.current.rejectRestart();
      });

      expect(mockParams.dispatchAction).toHaveBeenCalledWith({
        type: "REJECT_RESTART",
        senderId: "local",
      });
    });

    it("таймер реванша автоматически отклоняет запрос через 15 секунд", () => {
      mockParams.gameState.restartRequestedBy = "GUEST";
      renderHook(() => useMultiplayer(mockParams));

      act(() => {
        vi.advanceTimersByTime(16000);
      });

      expect(mockParams.dispatchAction).toHaveBeenCalledWith({
        type: "REJECT_RESTART",
        senderId: "local",
      });
    });
  });

  describe("handleExitToMenu", () => {
    it("корректно отключает сокет, очищает сессию и возвращает в режим AI", () => {
      sessionStorage.setItem("mp_session", "session_test");
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        result.current.handleExitToMenu();
      });

      expect(partyService.disconnect).toHaveBeenCalled();
      expect(sessionStorage.getItem("mp_session")).toBeNull();
      expect(mockParams.setIsLobbyOpen).toHaveBeenCalledWith(true);
      expect(mockParams.setHasStartedEver).toHaveBeenCalledWith(false);
      expect(mockParams.gameState.opponent).toBe("AI");
    });
  });

  describe("Серверные события: пауза таймера, дисконнект и аннулирование", () => {
    it("TURN_TIMER_PAUSED выставляет паузу и не уменьшает остаток времени", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onAction?.({ type: "TURN_TIMER_PAUSED", remainingMs: 5000 });
      });

      expect(result.current.isTurnTimerPaused).toBe(true);
      expect(result.current.turnTimerRemainingMs).toBe(5000);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.turnTimerRemainingMs).toBe(5000);
    });

    it("TURN_TIMER_RESUMED снимает паузу и продолжает отсчёт с остатка", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onAction?.({ type: "TURN_TIMER_PAUSED", remainingMs: 5000 });
      });
      act(() => {
        partyService.onAction?.({ type: "TURN_TIMER_RESUMED", remainingMs: 5000 });
      });

      expect(result.current.isTurnTimerPaused).toBe(false);
      expect(result.current.turnTimerRemainingMs).toBe(5000);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.turnTimerRemainingMs).toBe(4000);
    });

    it("DUAL_DISCONNECT_PAUSE выставляет флаги и скрывает уведомление о дисконнекте", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onAction?.({ type: "DUAL_DISCONNECT_PAUSE", gracePeriodMs: 20000 });
      });

      expect(result.current.isDualDisconnectPaused).toBe(true);
      expect(result.current.dualDisconnectGraceMs).toBe(20000);
      expect(result.current.opponentDisconnectedNotice).toBe(false);
    });

    it("пауза двойного дисконнекта снимается при восстановлении присутствия", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onAction?.({ type: "DUAL_DISCONNECT_PAUSE", gracePeriodMs: 20000 });
      });
      act(() => {
        partyService.onPresenceChanged?.(true);
      });

      expect(result.current.isDualDisconnectPaused).toBe(false);
      expect(result.current.dualDisconnectGraceMs).toBeNull();
    });

    it("пауза двойного дисконнекта снимается при статусе PLAYING", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onAction?.({ type: "DUAL_DISCONNECT_PAUSE", gracePeriodMs: 20000 });
      });
      act(() => {
        partyService.onRoomStatus?.({ status: "PLAYING" });
      });

      expect(result.current.isDualDisconnectPaused).toBe(false);
      expect(result.current.dualDisconnectGraceMs).toBeNull();
    });

    it("MATCH_ANNULLED фиксирует аннулирование, победителя нет и результат записан как обработанный", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onAction?.({
          type: "MATCH_ANNULLED",
          reason: "DRAW_DISCONNECT",
          message: "Оба игрока не вернулись. Матч аннулирован.",
        });
      });

      expect(result.current.isMatchAnnulled).toBe(true);
      expect(result.current.matchAnnulledMessage).toBe("Оба игрока не вернулись. Матч аннулирован.");
      expect(mockParams.gameState.winner).toBeNull();
      expect(mockParams.gameState.gameEndReason).toBe("MATCH_ANNULLED");
      expect(mockParams.gameState.gameResult.reason).toBe("DRAW_DISCONNECT");
      expect(mockParams.matchResultRecordedRef.current).toBe(true);
    });

    it("повторный MATCH_ANNULLED идемпотентен и не перезаписывает сообщение", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onAction?.({
          type: "MATCH_ANNULLED",
          reason: "DRAW_DISCONNECT",
          message: "Первое сообщение.",
        });
      });
      act(() => {
        partyService.onAction?.({
          type: "MATCH_ANNULLED",
          reason: "DRAW_DISCONNECT",
          message: "Второе сообщение.",
        });
      });

      expect(result.current.matchAnnulledMessage).toBe("Первое сообщение.");
      expect(mockParams.matchResultRecordedRef.current).toBe(true);
    });

    it("SYNC_ERROR выставляет сообщение с причиной, clearSyncError очищает", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onAction?.({ type: "SYNC_ERROR", reason: "NOT_YOUR_TURN" });
      });

      expect(result.current.syncErrorMessage).toContain("Переподключитесь");
      expect(result.current.syncErrorMessage).toContain("Сейчас ход соперника");

      act(() => {
        result.current.clearSyncError();
      });

      expect(result.current.syncErrorMessage).toBeNull();
    });

    it("ACTION_REJECTED показывает русский текст по коду, clearActionRejected очищает", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onAction?.({ type: "ACTION_REJECTED", reason: "NOT_HOST" });
      });

      expect(result.current.actionRejectedMessage).toContain("только хосту");

      act(() => {
        result.current.clearActionRejected();
      });

      expect(result.current.actionRejectedMessage).toBeNull();
    });

    it("новый syncState снимает залипшее сообщение об отклонённом действии", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onAction?.({ type: "ACTION_REJECTED", reason: "NOT_HOST" });
      });
      expect(result.current.actionRejectedMessage).not.toBeNull();

      act(() => {
        partyService.onSyncState?.(
          { ...mockParams.gameState, killCount: 0 },
          "KILLER",
          "PLAYING"
        );
      });

      expect(result.current.actionRejectedMessage).toBeNull();
    });

    it("reconnectToRoom вызывает partyService.ensureConnection", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));
      vi.clearAllMocks();

      act(() => {
        result.current.reconnectToRoom();
      });

      expect(partyService.ensureConnection).toHaveBeenCalledTimes(1);
    });

    it("handleExitToMenu сбрасывает серверные состояния, gameEndReason и gameResult", () => {
      const { result } = renderHook(() => useMultiplayer(mockParams));

      act(() => {
        partyService.onAction?.({ type: "TURN_TIMER_PAUSED", remainingMs: 5000 });
        partyService.onAction?.({ type: "DUAL_DISCONNECT_PAUSE", gracePeriodMs: 20000 });
        partyService.onAction?.({ type: "SYNC_ERROR", reason: "NOT_YOUR_TURN" });
        partyService.onAction?.({ type: "ACTION_REJECTED", reason: "NOT_HOST" });
        partyService.onAction?.({ type: "MATCH_ANNULLED", reason: "DRAW_DISCONNECT" });
      });

      expect(result.current.isMatchAnnulled).toBe(true);

      act(() => {
        result.current.handleExitToMenu();
      });

      expect(result.current.isMatchAnnulled).toBe(false);
      expect(result.current.matchAnnulledMessage).toBeNull();
      expect(result.current.isTurnTimerPaused).toBe(false);
      expect(result.current.turnTimerRemainingMs).toBeNull();
      expect(result.current.isDualDisconnectPaused).toBe(false);
      expect(result.current.dualDisconnectGraceMs).toBeNull();
      expect(result.current.syncErrorMessage).toBeNull();
      expect(result.current.actionRejectedMessage).toBeNull();
      expect(mockParams.gameState.gameEndReason).toBeUndefined();
      expect(mockParams.gameState.gameResult).toBeUndefined();
    });
  });
});
