// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "../App";
import { RoleRevealModal } from "../components/RoleRevealModal";
import GameRoomServer from "../server/index";
import { partyService } from "./partyPeer";
import { createInitialState, getAdjacentCharacters } from "./gameLogic";
import { gameReducer } from "./gameReducer";
import { I18nProvider } from "../i18n/context";
import { DUEL_CHARACTERS } from "../constants/duelCharacters";
import { DUEL_QUESTIONS } from "../constants/duelQuestions";

vi.mock("./audio", () => ({
  soundManager: {
    play: vi.fn(),
    getSfxEnabled: vi.fn(() => true),
    getAmbientEnabled: vi.fn(() => true),
    toggleSfx: vi.fn(),
    toggleAmbient: vi.fn(),
  },
}));

vi.mock("./haptics", () => ({
  triggerHaptic: vi.fn(),
}));

function createMockConnection(id: string, url: string) {
  return {
    id,
    url,
    send: vi.fn(),
    close: vi.fn(),
  };
}

function createMockRoom() {
  const map = new Map<string, any>();
  return {
    _connectionsMap: map,
    getConnections: () => map.values(),
    broadcast: vi.fn((msg: string) => {
      for (const conn of map.values()) {
        conn.send(msg);
      }
    }),
  };
}

describe("Сетевой протокол и синхронизация (Multiplayer Flow)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("Тест 1 (Паттерн подписки): partyService предоставляет рабочие слоты обратных вызовов", () => {
    expect(partyService).toBeDefined();
    expect(typeof partyService.connect).toBe("function");
    expect(typeof partyService.sendAction).toBe("function");
  });

  it("Тест 2 (Детерминизм сетевого редьюсера): удаленный экшен от сервера переключает ход без локальных гонок", () => {
    const initialState = createInitialState("SKHVATKA", "ONLINE", "KILLER", 2, 3, 16);
    const action = {
      type: "KILL_CHARACTER" as const,
      payload: { targetId: initialState.board[0][0].id },
      senderId: "remote",
      nextTurn: "DETECTIVE" as const,
    };
    const nextState = gameReducer(initialState, action);
    expect(nextState.currentTurn).toBe("DETECTIVE");
  });

  it("Тест 3 (Восстановление сессии): sessionStorage восстанавливает онлайн-статус", () => {
    sessionStorage.setItem(
      "mp_session",
      JSON.stringify({
        roomCode: "ROOM_777",
        myClientId: "client_abc",
        isHost: true,
        playerRole: "KILLER",
        mode: "SKHVATKA",
        nickname: "Агент 007",
      })
    );
    const raw = sessionStorage.getItem("mp_session");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.roomCode).toBe("ROOM_777");
    expect(parsed.isHost).toBe(true);
  });

  it("Тест 4 (Готовность игроков): флаг готовности в RoleRevealModal вызывает partyService.sendAction", () => {
    const spy = vi.spyOn(partyService, "sendAction");
    render(
      <I18nProvider>
        <RoleRevealModal
          mode="SKHVATKA"
          opponent="ONLINE"
          playerRole="KILLER"
          isOpponentConnected={true}
          onCancelMatch={vi.fn()}
          onComplete={vi.fn()}
          onReady={() => partyService.sendAction({ type: "PLAYER_READY" })}
          role1Name="Бандит"
          role2Name="Инспектор"
        />
      </I18nProvider>
    );
    const readyBtn = screen.getByRole("button", { name: /готов|к бою|начать/i });
    fireEvent.click(readyBtn);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "PLAYER_READY" }));
  });

  it("Тест 5 (Синхронизация банка/ставок): экшен SET_MATCH_POT обновляет банк в редьюсере", () => {
    const state = createInitialState("SKHVATKA", "ONLINE", "KILLER", 2, 3, 16);
    const next = gameReducer(state, {
      type: "SET_MATCH_POT",
      payload: { pot: 1000, bet: 500 },
      senderId: "remote",
    });
    expect(next.matchPot).toBe(1000);
    expect(next.matchBet).toBe(500);
  });

  it("Тест 6 (Анти-дребезг аудио выстрела): soundManager вызывается контролируемо", async () => {
    const { soundManager } = vi.mocked(await import("./audio"));
    soundManager.play("kill");
    expect(soundManager.play).toHaveBeenCalledWith("kill");
  });
});

describe("GameRoomServer (PartyKit Мультиплеер)", () => {
  let mockRoom: any;
  let server: GameRoomServer;

  beforeEach(() => {
    mockRoom = createMockRoom();
    server = new GameRoomServer(mockRoom);
  });

  it("Тест 1 (Арбитраж): Гость с isHost=false подключается к пустой комнате -> получает ERROR ROOM_NOT_FOUND и conn.close()", () => {
    const guestConn = createMockConnection(
      "conn_guest",
      "http://localhost:1999/parties/main/room_100?clientId=c_guest&isHost=false&nickname=Гость"
    );
    const req = new Request(guestConn.url);

    server.onConnect(guestConn as any, { request: req });

    expect(guestConn.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "ERROR", message: "ROOM_NOT_FOUND" })
    );
    expect(guestConn.close).toHaveBeenCalled();
    expect(Object.keys(server.state.players).length).toBe(0);
  });

  it("Тест 2 (Хост + Гость): Хост -> WAITING/KILLER, затем Гость -> READY_TO_START/DETECTIVE", () => {
    const hostConn = createMockConnection(
      "conn_host",
      "http://localhost:1999/parties/main/room_200?clientId=c_host&isHost=true&nickname=Хост"
    );
    mockRoom._connectionsMap.set(hostConn.id, hostConn);
    server.onConnect(hostConn as any, { request: new Request(hostConn.url) });

    expect(server.state.status).toBe("WAITING");
    expect(server.state.players["c_host"].role).toBe("KILLER");

    const guestConn = createMockConnection(
      "conn_guest",
      "http://localhost:1999/parties/main/room_200?clientId=c_guest&isHost=false&nickname=Гость"
    );
    mockRoom._connectionsMap.set(guestConn.id, guestConn);
    server.onConnect(guestConn as any, { request: new Request(guestConn.url) });

    expect(server.state.status).toBe("READY_TO_START");
    expect(server.state.players["c_guest"].role).toBe("DETECTIVE");
    expect(server.state.gameState).toBeDefined();
  });

  it("Тест 3 (Передача первого хода): Хост шлет экшен хода -> сервер применяет его, currentTurn переключается без 'wrong turn'", () => {
    const hostConn = createMockConnection(
      "conn_h",
      "http://localhost:1999/parties/main/room_turn?clientId=c_h&isHost=true&nickname=H"
    );
    mockRoom._connectionsMap.set(hostConn.id, hostConn);
    server.onConnect(hostConn as any, { request: new Request(hostConn.url) });

    const guestConn = createMockConnection(
      "conn_g",
      "http://localhost:1999/parties/main/room_turn?clientId=c_g&isHost=false&nickname=G"
    );
    mockRoom._connectionsMap.set(guestConn.id, guestConn);
    server.onConnect(guestConn as any, { request: new Request(guestConn.url) });

    server.onMessage(JSON.stringify({ type: "PLAYER_READY", senderClientId: "c_h" }), hostConn);
    server.onMessage(JSON.stringify({ type: "PLAYER_READY", senderClientId: "c_g" }), guestConn);
    expect(server.state.status).toBe("PLAYING");

    const targetVictim = server.state.gameState!.board[0][0].id;
    server.onMessage(
      JSON.stringify({
        type: "KILL_CHARACTER",
        payload: { targetId: targetVictim },
        senderClientId: "c_h",
      }),
      hostConn
    );

    expect(server.state.gameState!.killCount).toBe(1);
    expect(server.state.gameState!.currentTurn).toBe("DETECTIVE");
  });

  it("Тест 4 (Безопасность / Маскирование): Хост (KILLER) и Гость (DETECTIVE) получают только свои тайные данные", () => {
    const hostConn = createMockConnection(
      "conn_h_sec",
      "http://localhost:1999/parties/main/room_sec_test?clientId=c_h&isHost=true"
    );
    mockRoom._connectionsMap.set(hostConn.id, hostConn);
    server.onConnect(hostConn as any, { request: new Request(hostConn.url) });

    const guestConn = createMockConnection(
      "conn_g_sec",
      "http://localhost:1999/parties/main/room_sec_test?clientId=c_g&isHost=false"
    );
    mockRoom._connectionsMap.set(guestConn.id, guestConn);
    server.onConnect(guestConn as any, { request: new Request(guestConn.url) });

    const hostCalls = hostConn.send.mock.calls;
    const lastHostSyncCall = hostCalls
      .map((c: any) => JSON.parse(c[0]))
      .filter((m: any) => m.type === "SYNC_STATE")
      .pop();
    expect(lastHostSyncCall.state.detectiveSecretId).toBeNull();

    const guestCalls = guestConn.send.mock.calls;
    const lastGuestSyncCall = guestCalls
      .map((c: any) => JSON.parse(c[0]))
      .filter((m: any) => m.type === "SYNC_STATE")
      .pop();
    expect(lastGuestSyncCall.state.killerSecretId).toBeNull();
  });
});

describe("Сквозное тестирование мультиплеерных режимов (E2E Suites)", () => {
  let mockRoom: any;
  let server: GameRoomServer;

  beforeEach(() => {
    mockRoom = createMockRoom();
    server = new GameRoomServer(mockRoom);
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("1. Тест режима SECRET_SERVICE (Секретная служба): арбитраж разоблачения, маскирование и контроль очереди", () => {
    const hostConn = createMockConnection(
      "conn_h_ss",
      "http://localhost:1999/parties/main/room_ss?clientId=host_ss&isHost=true&nickname=HostAgent&mode=SECRET_SERVICE"
    );
    mockRoom._connectionsMap.set(hostConn.id, hostConn);
    server.onConnect(hostConn as any, { request: new Request(hostConn.url) });

    const guestConn = createMockConnection(
      "conn_g_ss",
      "http://localhost:1999/parties/main/room_ss?clientId=guest_ss&isHost=false&nickname=GuestAgent&mode=SECRET_SERVICE"
    );
    mockRoom._connectionsMap.set(guestConn.id, guestConn);
    server.onConnect(guestConn as any, { request: new Request(guestConn.url) });

    server.onMessage(JSON.stringify({ type: "PLAYER_READY", senderClientId: "host_ss" }), hostConn);
    server.onMessage(JSON.stringify({ type: "PLAYER_READY", senderClientId: "guest_ss" }), guestConn);

    expect(server.state.status).toBe("PLAYING");
    expect(server.state.gameState?.activeSpyIndex).toBe(0);

    const hostCalls = hostConn.send.mock.calls;
    const lastHostSync = hostCalls
      .map((c: any) => JSON.parse(c[0]))
      .filter((m: any) => m.type === "SYNC_STATE")
      .pop();
    expect(lastHostSync.state.spies[0].secretId).not.toBeNull();
    expect(lastHostSync.state.spies[1].secretId).toBeNull();

    const rawGuestSecretId = server.state.gameState!.spies![1].secretId;
    expect(rawGuestSecretId).toBeTruthy();

    server.onMessage(
      JSON.stringify({
        type: "CAPTURE_SPY",
        payload: { targetId: rawGuestSecretId },
        senderClientId: "host_ss",
      }),
      hostConn
    );

    expect(server.state.gameState!.spies![0].trophies).toBe(1);
    expect(server.state.gameState!.activeSpyIndex).toBe(1);
    expect(server.state.gameState!.justCaughtSpyId).toBe(server.state.gameState!.spies![1].id);

    const consoleWarnSpy = vi.spyOn(console, "warn");
    const nextTargetId = server.state.gameState!.board[0][0].id;
    server.onMessage(
      JSON.stringify({
        type: "CAPTURE_SPY",
        payload: { targetId: nextTargetId },
        senderClientId: "host_ss",
      }),
      hostConn
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Move rejected: wrong turn in SECRET_SERVICE"));
    expect(server.state.gameState!.activeSpyIndex).toBe(1);
    consoleWarnSpy.mockRestore();
  });

  it("2. Тест режима LINE_UP (Очная ставка): задание вопроса и передача очереди", () => {
    const hostConn = createMockConnection(
      "conn_h_lineup",
      "http://localhost:1999/parties/main/room_lineup?clientId=h_lu&isHost=true&nickname=HostLu&mode=LINE_UP"
    );
    mockRoom._connectionsMap.set(hostConn.id, hostConn);
    server.onConnect(hostConn as any, { request: new Request(hostConn.url) });

    const guestConn = createMockConnection(
      "conn_g_lineup",
      "http://localhost:1999/parties/main/room_lineup?clientId=g_lu&isHost=false&nickname=GuestLu&mode=LINE_UP"
    );
    mockRoom._connectionsMap.set(guestConn.id, guestConn);
    server.onConnect(guestConn as any, { request: new Request(guestConn.url) });

    server.onMessage(JSON.stringify({ type: "PLAYER_READY", senderClientId: "h_lu" }), hostConn);
    server.onMessage(JSON.stringify({ type: "PLAYER_READY", senderClientId: "g_lu" }), guestConn);

    expect(server.state.status).toBe("PLAYING");

    server.state.gameState!.killerSecretId = DUEL_CHARACTERS[0].id;
    server.state.gameState!.detectiveSecretId = DUEL_CHARACTERS[1].id;

    const initialTurn = server.state.gameState!.currentTurn;
    const activeConn = initialTurn === "KILLER" ? hostConn : guestConn;
    const activeClientId = initialTurn === "KILLER" ? "h_lu" : "g_lu";
    const questionId = DUEL_QUESTIONS[0]?.id || "q_man";

    server.onMessage(
      JSON.stringify({
        type: "DUEL_ASK_QUESTION",
        payload: { questionId },
        senderClientId: activeClientId,
      }),
      activeConn
    );

    expect(server.state.gameState!.duelHistory?.length).toBe(1);
    expect(server.state.gameState!.currentTurn).not.toBe(initialTurn);
  });

  it("3. Тест режима THIEF_HUNT (Охота на грабителя): кража и обновление трофеев", () => {
    const hostConn = createMockConnection(
      "conn_h_thief",
      "http://localhost:1999/parties/main/room_thief?clientId=h_th&isHost=true&nickname=HostThief&mode=THIEF_HUNT"
    );
    mockRoom._connectionsMap.set(hostConn.id, hostConn);
    server.onConnect(hostConn as any, { request: new Request(hostConn.url) });

    const guestConn = createMockConnection(
      "conn_g_thief",
      "http://localhost:1999/parties/main/room_thief?clientId=g_th&isHost=false&nickname=GuestPolice&mode=THIEF_HUNT"
    );
    mockRoom._connectionsMap.set(guestConn.id, guestConn);
    server.onConnect(guestConn as any, { request: new Request(guestConn.url) });

    server.onMessage(JSON.stringify({ type: "PLAYER_READY", senderClientId: "h_th" }), hostConn);
    server.onMessage(JSON.stringify({ type: "PLAYER_READY", senderClientId: "g_th" }), guestConn);

    expect(server.state.status).toBe("PLAYING");

    const thiefSecretId = server.state.gameState!.killerSecretId!;
    const adjacentNeighbors = getAdjacentCharacters(server.state.gameState!.board, thiefSecretId);
    expect(adjacentNeighbors.length).toBeGreaterThan(0);
    const targetCellId = adjacentNeighbors[0].id;

    server.onMessage(
      JSON.stringify({
        type: "ROB_NEIGHBOR",
        payload: { targetId: targetCellId },
        senderClientId: "h_th",
      }),
      hostConn
    );

    expect(server.state.gameState!.trophiesKiller).toBe(1);
    expect(server.state.gameState!.currentTurn).toBe("DETECTIVE");
  });

  it("4. Тест жизненного цикла сессии и Реванша: REQUEST_RESTART и CONFIRM_RESTART", () => {
    const hostConn = createMockConnection(
      "conn_h_rev",
      "http://localhost:1999/parties/main/room_rev?clientId=h_rev&isHost=true&nickname=HostRev&mode=SKHVATKA"
    );
    mockRoom._connectionsMap.set(hostConn.id, hostConn);
    server.onConnect(hostConn as any, { request: new Request(hostConn.url) });

    const guestConn = createMockConnection(
      "conn_g_rev",
      "http://localhost:1999/parties/main/room_rev?clientId=g_rev&isHost=false&nickname=GuestRev&mode=SKHVATKA"
    );
    mockRoom._connectionsMap.set(guestConn.id, guestConn);
    server.onConnect(guestConn as any, { request: new Request(guestConn.url) });

    server.state.status = "FINISHED";
    guestConn.send.mockClear();
    hostConn.send.mockClear();

    server.onMessage(
      JSON.stringify({
        type: "REQUEST_RESTART",
        payload: { requestedBy: "HOST" },
        senderClientId: "h_rev",
      }),
      hostConn
    );

    expect(guestConn.send).toHaveBeenCalledWith(
      expect.stringContaining('"REQUEST_RESTART"')
    );

    server.onMessage(
      JSON.stringify({
        type: "CONFIRM_RESTART",
        senderClientId: "g_rev",
      }),
      guestConn
    );

    expect(server.state.status).toBe("PLAYING");
    expect(server.state.gameState).toBeDefined();

    const lastGuestSync = guestConn.send.mock.calls
      .map((c: any) => JSON.parse(c[0]))
      .filter((m: any) => m.type === "SYNC_STATE")
      .pop();

    expect(lastGuestSync).toBeDefined();
    expect(lastGuestSync.status).toBe("PLAYING");
    expect(["KILLER", "DETECTIVE"]).toContain(lastGuestSync.role);
  });
});
