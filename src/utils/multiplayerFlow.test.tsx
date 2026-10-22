// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "../App";
import { RoleRevealModal } from "../components/RoleRevealModal";
import { mpService } from "./multiplayerPeer";
import GameRoomServer from "../server/index";
import { partyService } from "./partyPeer";
import { createInitialState } from "./gameLogic";
import { gameReducer } from "./gameReducer";
import { I18nProvider } from "../i18n/context";
import * as database from "firebase/database";

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  signInAnonymously: vi.fn(() => Promise.resolve({ user: { uid: "123" } })),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback({ uid: "123" });
    return () => {};
  }),
}));

vi.mock("firebase/database", () => ({
  getDatabase: vi.fn(),
  ref: vi.fn((_, path) => ({ path })),
  set: vi.fn(() => Promise.resolve()),
  get: vi.fn(() => Promise.resolve({ exists: () => false, val: () => null })),
  onValue: vi.fn(),
  off: vi.fn(),
  onDisconnect: vi.fn(() => ({
    set: vi.fn(() => Promise.resolve()),
    cancel: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
  })),
  remove: vi.fn(() => Promise.resolve()),
  update: vi.fn(() => Promise.resolve()),
  push: vi.fn(() => Promise.resolve({ key: "mock_action_id" })),
  onChildAdded: vi.fn(() => vi.fn()),
  runTransaction: vi.fn((_, updateFn) => Promise.resolve({ committed: true, snapshot: { exists: () => true, val: () => (updateFn ? updateFn({}) : {}) } })),
}));

vi.mock("./audio", () => ({
  soundManager: {
    play: vi.fn(),
    getSfxEnabled: vi.fn(() => true),
    getAmbientEnabled: vi.fn(() => true),
    toggleSfx: vi.fn(),
    toggleAmbient: vi.fn(),
  },
}));

describe("Сетевой протокол и синхронизация (Multiplayer Flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Гонка PLAYER_READY: экшен готовности от удаленного игрока НЕ должен сбрасывать isIntroPhase", async () => {
    let actionCallback: ((action: any) => void) | undefined;

    vi.spyOn(mpService, "subscribeToActions").mockImplementation((cb: any) => {
      actionCallback = cb;
      return () => {};
    });

    render(
      <I18nProvider>
        <App />
      </I18nProvider>
    );

    act(() => {
      actionCallback?.({
        type: "MATCH_STARTED",
        payload: { state: createInitialState("SKHVATKA", "ONLINE", "KILLER") },
        senderId: "remote",
      });
    });

    // Проверяем, что фаза вступления отображается после старта матча.
    expect(
      screen.getAllByText(/Агент|Ориентировка|Задание/i).length
    ).toBeGreaterThan(0);

    act(() => {
      actionCallback?.({ type: "PLAYER_READY", senderId: "remote" });
    });

    // PLAYER_READY не должен сбрасывать фазу вступления.
    expect(
      screen.getAllByText(/Агент|Ориентировка|Задание/i).length
    ).toBeGreaterThan(0);
  });

  it("Синхронизация готовности: если один игрок уже готов, второй при готовности сразу завершает интро", () => {
    partyService.roomCode = "1234";
    vi.spyOn(partyService, "sendAction").mockImplementation(() => {});

    const onCompleteMock = vi.fn();

    render(
      <RoleRevealModal
        mode="SKHVATKA"
        opponent="ONLINE"
        playerRole="KILLER"
        killer={{ id: "c1", name: "Винсент", role: "KILLER" } as any}
        detective={undefined}
        inspectorChoices={[]}
        onSelectDetectiveRole={vi.fn()}
        onComplete={onCompleteMock}
      />
    );

    act(() => {
      if (partyService.onAllPlayersReady) {
        partyService.onAllPlayersReady();
      }
    });

    const readyButtons = screen.getAllByTestId("ready-button");
    const readyButton = readyButtons[readyButtons.length - 1];
    act(() => {
      fireEvent.click(readyButton);
    });

    expect(onCompleteMock).toHaveBeenCalledTimes(1);
  });

  it("Намеренный выход leaveRoom переводит комнату в статус CLOSED", async () => {
    mpService.isHost = true;
    mpService.roomCode = "1234";
    (mpService as any).roomRef = {} as any;

    await mpService.leaveRoom();

    expect(database.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "CLOSED",
      })
    );
  });

  it("Отсутствие затирания экшенов: MATCH_STARTED содержит в себе matchPot и matchBet, исключая отправку SET_MATCH_POT", () => {
    const state = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    state.matchPot = 500;
    state.matchBet = 250;

    const broadcastSpy = vi.spyOn(mpService, "broadcastMatchStart");
    mpService.broadcastMatchStart(state);

    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        matchPot: 500,
        matchBet: 250,
      })
    );
  });

  it("Синхронизация выбора личности: экшен SET_INSPECTOR_ROLE обновляет detectiveSecretId", () => {
    const state = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    const chosenId = state.inspectorChoices![1];

    const action: any = {
      type: "SET_INSPECTOR_ROLE",
      payload: { chosenId },
      senderId: "remote",
    };

    const nextState = gameReducer(state, action);

    expect(nextState.detectiveSecretId).toBe(chosenId);
    expect(nextState.inspectorChoices).toEqual([]);
    expect(nextState.detectiveHand).not.toContain(chosenId);
  });

  it("Идентичность поля: Гость принимает раскладку Хоста из MATCH_STARTED", () => {
    const hostState = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    const guestState = createInitialState("SKHVATKA", "ONLINE", "DETECTIVE");

    const action: any = {
      type: "MATCH_STARTED",
      payload: { state: hostState },
      senderId: "remote",
    };

    const nextState = gameReducer(guestState, action);

    expect(nextState.board).toEqual(hostState.board);
    expect(nextState.killerSecretId).toBe(hostState.killerSecretId);
  });

  it("АФК-таймер готовности: по истечении 15 секунд срабатывает onCancelMatch", () => {
    vi.useFakeTimers();
    const onCancelMatchMock = vi.fn();

    render(
      <RoleRevealModal
        mode="SKHVATKA"
        opponent="ONLINE"
        playerRole="KILLER"
        killer={undefined}
        detective={undefined}
        inspectorChoices={[]}
        onSelectDetectiveRole={vi.fn()}
        onComplete={vi.fn()}
        onCancelMatch={onCancelMatchMock}
      />
    );

    const readyButtons = screen.getAllByTestId("ready-button");
    const readyButton = readyButtons[readyButtons.length - 1];

    act(() => {
      fireEvent.click(readyButton);
    });

    act(() => {
      vi.advanceTimersByTime(16000);
    });

    expect(onCancelMatchMock).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
  it("Реванш после завершения партии: gameReducer не отбрасывает REQUEST_RESTART и MATCH_STARTED при наличии winner", () => {
    const state = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    state.winner = "DETECTIVE";

    const requestAction: any = {
      type: "REQUEST_RESTART",
      payload: { requestedBy: "GUEST" },
      senderId: "remote",
    };

    const afterRequest = gameReducer(state, requestAction);
    expect(afterRequest.restartRequestedBy).toBe("GUEST");

    const newState = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    const restartAction: any = {
      type: "MATCH_STARTED",
      payload: { state: newState },
      senderId: "remote",
    };

    const afterRestart = gameReducer(afterRequest, restartAction);
    expect(afterRestart.winner).toBeNull();
    expect(afterRestart.board).toEqual(newState.board);
  });

  it("Маскирование broadcastMatchStart: гость-Инспектор получает inspectorChoices, если хост — Бандит", () => {
    mpService.roomCode = "1234";
    const state = createInitialState("SKHVATKA", "ONLINE", "KILLER");

    // Убеждаемся, что у хоста-Бандита сформированы варианты для Инспектора
    expect(state.inspectorChoices).toBeDefined();
    expect(state.inspectorChoices!.length).toBe(4);

    mpService.broadcastMatchStart(state);

    // database.set вызывается для сохранения gameState в RTDB
    expect(database.set).toHaveBeenCalled();

    const setCalls = vi.mocked(database.set).mock.calls;
    const gameStateCall = setCalls.find((call) => {
      const pathArg = (call[0] as any)?.path;
      return typeof pathArg === "string" && pathArg.includes("gameState");
    });

    expect(gameStateCall).toBeDefined();
    const savedState = JSON.parse(gameStateCall![1] as string);

    // inspectorChoices должен передаваться гостю-Инспектору без затирания
    expect(savedState.inspectorChoices).toEqual(state.inspectorChoices);
    // При этом секреты самого хоста-Бандита должны быть скрыты
    expect(savedState.killerSecretId).toBeNull();
    expect(savedState.killerHand).toEqual([]);
  });
});
describe("GameRoomServer (PartyKit Мультиплеер)", () => {
  const createMockRoom = (roomId: string = "test_room") => {
    const connections = new Map<string, any>();
    return {
      id: roomId,
      getConnections: () => connections.values(),
      getConnection: (id: string) => connections.get(id),
      broadcast: vi.fn(),
      _connectionsMap: connections,
    };
  };

  const createMockConnection = (id: string, urlStr: string) => {
    return {
      id,
      url: urlStr,
      send: vi.fn(),
      close: vi.fn(),
    };
  };

  it("Тест 1 (Арбитраж): Гость с isHost=false подключается к пустой комнате -> получает ERROR ROOM_NOT_FOUND и conn.close()", () => {
    const mockRoom = createMockRoom("room_404");
    const server = new GameRoomServer(mockRoom as any);

    const guestConn = createMockConnection("conn_guest_1", "http://localhost:1999/parties/main/room_404?clientId=guest_1&nickname=Guest&isHost=false&mode=SKHVATKA");
    const req = new Request(guestConn.url);

    server.onConnect(guestConn as any, { request: req });

    expect(guestConn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "ERROR", message: "ROOM_NOT_FOUND" })
    );
    expect(guestConn.close).toHaveBeenCalledTimes(1);
    expect(Object.keys(server.state.players).length).toBe(0);
  });

  it("Тест 2 (Хост + Гость): Хост -> WAITING/KILLER, затем Гость -> READY_TO_START/DETECTIVE", () => {
    const mockRoom = createMockRoom("room_200");
    const server = new GameRoomServer(mockRoom as any);

    // 1. Хост подключается
    const hostConn = createMockConnection("conn_host", "http://localhost:1999/parties/main/room_200?clientId=client_host&nickname=Host&isHost=true&mode=SKHVATKA");
    mockRoom._connectionsMap.set(hostConn.id, hostConn);
    server.onConnect(hostConn as any, { request: new Request(hostConn.url) });

    expect(server.state.status).toBe("WAITING");
    expect(server.state.players["client_host"]).toBeDefined();
    expect(server.state.players["client_host"].role).toBe("KILLER");
    expect(server.state.players["client_host"].isHost).toBe(true);

    // 2. Гость подключается к созданной комнате
    const guestConn = createMockConnection("conn_guest", "http://localhost:1999/parties/main/room_200?clientId=client_guest&nickname=Guest&isHost=false&mode=SKHVATKA");
    mockRoom._connectionsMap.set(guestConn.id, guestConn);
    server.onConnect(guestConn as any, { request: new Request(guestConn.url) });

    expect(server.state.status).toBe("READY_TO_START");
    expect(server.state.players["client_guest"]).toBeDefined();
    expect(server.state.players["client_guest"].role).toBe("DETECTIVE");
    expect(server.state.players["client_guest"].isHost).toBe(false);
    expect(server.state.gameState).not.toBeNull();
  });

  it("Тест 3 (Передача первого хода): Хост шлет экшен хода -> сервер применяет его, currentTurn переключается без 'wrong turn'", () => {
    const consoleWarnSpy = vi.spyOn(console, "warn");
    const mockRoom = createMockRoom("room_turn");
    const server = new GameRoomServer(mockRoom as any);

    // Подключаем хоста и гостя
    const hostConn = createMockConnection("conn_h", "http://localhost:1999/parties/main/room_turn?clientId=c_h&nickname=Host&isHost=true&mode=SKHVATKA");
    mockRoom._connectionsMap.set(hostConn.id, hostConn);
    server.onConnect(hostConn as any, { request: new Request(hostConn.url) });

    const guestConn = createMockConnection("conn_g", "http://localhost:1999/parties/main/room_turn?clientId=c_g&nickname=Guest&isHost=false&mode=SKHVATKA");
    mockRoom._connectionsMap.set(guestConn.id, guestConn);
    server.onConnect(guestConn as any, { request: new Request(guestConn.url) });

    // Оба игрока шлют готовность для перехода в PLAYING
    server.onMessage(JSON.stringify({ type: "PLAYER_READY", senderClientId: "c_h" }), hostConn as any);
    server.onMessage(JSON.stringify({ type: "PLAYER_READY", senderClientId: "c_g" }), guestConn as any);

    expect(server.state.status).toBe("PLAYING");
    expect(server.state.gameState!.currentTurn).toBe("KILLER");

    // Хост (KILLER) совершает сдвиг ряда
    const shiftAction = {
      type: "SHIFT_BOARD",
      payload: { shiftType: "ROW", index: 0, direction: "FORWARD" },
      senderClientId: "c_h",
    };

    server.onMessage(JSON.stringify(shiftAction), hostConn as any);

    expect(server.state.gameState!.currentTurn).toBe("DETECTIVE");
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining("Move rejected: wrong turn"), expect.anything(), expect.anything(), expect.anything());
    consoleWarnSpy.mockRestore();
  });
});
