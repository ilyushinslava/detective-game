// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { partyService } from "../partyPeer";
import type { GameAction } from "../../types/multiplayer";

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

describe("PartyService Network Client", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
    partyService.disconnect();
    partyService.clearAllListeners();
  });

  afterEach(() => {
    partyService.disconnect();
    partyService.clearAllListeners();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("Резолв адресов (resolveEndpoints)", () => {
    it("на внешнем домене возвращает wss и fallback-хост", () => {
      delete (window as any).location;
      (window as any).location = { hostname: "ilyushinslava.github.io" };

      const endpoints = partyService.resolveEndpoints();
      expect(endpoints.wsProtocol).toBe("wss:");
      expect(endpoints.httpProtocol).toBe("https:");
      expect(endpoints.host).toBeDefined();
    });
  });

  describe("Подключение и обмен сообщениями", () => {
    it("формирует корректный URL комнаты и переходит в статус online при открытии сокета", () => {
      const presenceSpy = vi.fn();
      partyService.onPresenceChanged = presenceSpy;

      partyService.connect("TEST_ROOM", "Детектив", true, "SKHVATKA", "client_1");

      const ws = MockWebSocket.instances[0];
      expect(ws).toBeDefined();
      expect(ws.url).toContain("/party/TEST_ROOM");
      expect(ws.url).toContain("clientId=client_1");

      ws.simulateOpen();
      expect(presenceSpy).toHaveBeenCalledWith(true);
    });

    it("обрабатывает входящие сообщения SYNC_STATE и передает их в колбэк", () => {
      const syncSpy = vi.fn();
      partyService.onSyncState = syncSpy;

      partyService.connect("ROOM_SYNC", "Агент", false, "SKHVATKA");
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const mockPayload = {
        type: "SYNC_STATE",
        state: { round: 1, currentTurn: "KILLER" },
        role: "KILLER",
        status: "PLAYING",
      };
      ws.simulateMessage(mockPayload);

      expect(syncSpy).toHaveBeenCalledWith(
        mockPayload.state,
        mockPayload.role,
        mockPayload.status
      );
    });

    it("игнорирует PONG-сообщения без вызова экшен-хэндлеров", () => {
      const actionSpy = vi.fn();
      partyService.onAction = actionSpy;

      partyService.connect("ROOM_PONG", "Агент", false, "SKHVATKA");
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      ws.simulateMessage({ type: "PONG" });
      expect(actionSpy).not.toHaveBeenCalled();
    });
  });

  describe("Буферизация и отправка действий (sendAction)", () => {
    it("немедленно отправляет экшен, если сокет открыт", () => {
      partyService.connect("ROOM_SEND", "Агент", true, "SKHVATKA", "client_host");
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const action: GameAction = {
        type: "SHIFT_BOARD",
        payload: { shiftType: "ROW", index: 0, direction: "LEFT" },
      };
      partyService.sendAction(action);

      expect(ws.sentMessages.length).toBe(1);
      const sent = JSON.parse(ws.sentMessages[0]);
      expect(sent.type).toBe("SHIFT_BOARD");
      expect(sent.senderClientId).toBe("client_host");
    });

    it("буферизует экшены во время переподключения и сбрасывает их после onopen", () => {
      partyService.connect("ROOM_QUEUE", "Агент", true, "SKHVATKA", "client_host");
      const ws1 = MockWebSocket.instances[0];
      ws1.simulateOpen();
      ws1.close();

      const action: GameAction = {
        type: "KILL_CHARACTER",
        payload: { targetId: "c5" },
      };
      partyService.sendAction(action);

      partyService.connect("ROOM_QUEUE", "Агент", true, "SKHVATKA", "client_host");
      const ws2 = MockWebSocket.instances[1];
      expect(ws2.sentMessages.length).toBe(0);

      ws2.simulateOpen();
      expect(ws2.sentMessages.length).toBe(1);
      const sent = JSON.parse(ws2.sentMessages[0]);
      expect(sent.type).toBe("KILL_CHARACTER");
    });
  });

  describe("Восстановление сессии (ensureConnection) и Heartbeat", () => {
    it("отправляет PING с интервалом сердечного ритма", () => {
      partyService.connect("ROOM_PING", "Агент", true, "SKHVATKA");
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      vi.advanceTimersByTime(25000);
      const hasPing = ws.sentMessages.some((msg) => JSON.parse(msg).type === "PING");
      expect(hasPing).toBe(true);
    });

    it("ensureConnection переподключается, если сокет был закрыт", () => {
      partyService.connect("ROOM_RECONNECT", "Агент", true, "SKHVATKA");
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();
      ws.close();

      partyService.ensureConnection();
      expect(MockWebSocket.instances.length).toBeGreaterThan(1);
    });
  });

  describe("Античит и валидация сетевых пакетов (Стальной Щит)", () => {
    it("молча дропает вредоносные входящие пакеты с XSS/скриптами вместо экшенов", () => {
      const actionSpy = vi.fn();
      partyService.onAction = actionSpy;

      partyService.connect("SECURITY_ROOM", "Агент", true, "SKHVATKA");
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      // Отправляем пакет с вредоносным type
      ws.simulateMessage({ type: "<script>alert('xss')</script>", payload: {} });
      ws.simulateMessage({ type: "javascript:void(0)", payload: {} });
      ws.simulateMessage({ type: "bad payload with spaces", payload: {} });

      expect(actionSpy).not.toHaveBeenCalled();
    });

    it("безопасно обрабатывает битый JSON без краша приложения", () => {
      const actionSpy = vi.fn();
      partyService.onAction = actionSpy;

      partyService.connect("SECURITY_ROOM", "Агент", true, "SKHVATKA");
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      // Симулируем приход битого JSON
      expect(() => {
        ws.onmessage?.({ data: "INVALID_CORRUPTED_JSON{{{" } as MessageEvent);
      }).not.toThrow();

      expect(actionSpy).not.toHaveBeenCalled();
    });

    it("дропает пакеты с попыткой прототипного загрязнения (__proto__)", () => {
      const actionSpy = vi.fn();
      partyService.onAction = actionSpy;

      partyService.connect("SECURITY_ROOM", "Агент", true, "SKHVATKA");
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      const maliciousPayload = JSON.parse('{"type":"SHIFT_BOARD","payload":{"__proto__":{"polluted":true}}}');
      ws.simulateMessage(maliciousPayload);

      expect(actionSpy).not.toHaveBeenCalled();
    });

    it("корректно доставляет валидный каноничный GameAction", () => {
      const actionSpy = vi.fn();
      partyService.onAction = actionSpy;

      partyService.connect("SECURITY_ROOM", "Агент", true, "SKHVATKA");
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      ws.simulateMessage({ type: "SHIFT_BOARD", payload: { type: "ROW", index: 1 } });
      expect(actionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "SHIFT_BOARD", payload: { type: "ROW", index: 1 } })
      );
    });
  });

  describe("Event Bus & Memory Leak Prevention (CRIT-05)", () => {
    it("subscribe возвращает cleanup-функцию, которая надёжно отписывает слушатель", () => {
      const listener = vi.fn();
      const unsub = partyService.subscribe("action", listener);

      expect(partyService.getListenerCount("action")).toBe(1);

      partyService.emit("action", { type: "TEST_ACTION" });
      expect(listener).toHaveBeenCalledTimes(1);

      // Отписываемся
      unsub();
      expect(partyService.getListenerCount("action")).toBe(0);

      partyService.emit("action", { type: "TEST_ACTION_2" });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("поддерживает независимую подписку и корректный подсчет нескольких слушателей", () => {
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      const unsubA = partyService.subscribe("syncState", listenerA);
      const unsubB = partyService.subscribe("syncState", listenerB);

      expect(partyService.getListenerCount("syncState")).toBe(2);

      partyService.emit("syncState", { mode: "MANIAC_VS_OPERATIVE" });
      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).toHaveBeenCalledTimes(1);

      unsubA();
      expect(partyService.getListenerCount("syncState")).toBe(1);

      partyService.emit("syncState", { mode: "THIEF_HUNT" });
      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).toHaveBeenCalledTimes(2);

      unsubB();
      expect(partyService.getListenerCount("syncState")).toBe(0);
    });

    it("ошибка в одном обработчике не ломает выполнение остальных слушателей (fault tolerance)", () => {
      const errorListener = vi.fn(() => {
        throw new Error("Crashing listener");
      });
      const safeListener = vi.fn();

      const unsubError = partyService.subscribe("roomStatus", errorListener);
      const unsubSafe = partyService.subscribe("roomStatus", safeListener);

      expect(() => {
        partyService.emit("roomStatus", { status: "PLAYING" });
      }).not.toThrow();

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(safeListener).toHaveBeenCalledTimes(1);

      unsubError();
      unsubSafe();
    });
  });
});
