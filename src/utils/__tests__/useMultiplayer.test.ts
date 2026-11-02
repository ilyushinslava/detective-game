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
});
