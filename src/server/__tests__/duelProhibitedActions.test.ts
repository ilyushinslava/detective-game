// @vitest-environment node
// SEC-NET-04-T: серверная блокировка дуэльных эксплойтов.
// Проверяем два слоя защиты:
//   1) ранний фильтр в onMessage отбрасывает SET_MATCH_POT / RESTART_DUEL /
//      RESOLVE_DUEL_TIE_BREAK до обработки (состояние и рассылки не меняются);
//   2) validateActionLogic возвращает код PROHIBITED_ACTION для этих действий.
// Продовый код не изменяется — только тесты.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameRoomServer, {
  publicRoomsRegistry,
  roomToMorseRegistry,
  morseToRoomRegistry,
  morseToRoomsRegistry,
} from "../index";

function createMockConn(id: string) {
  const sent: string[] = [];
  return {
    id,
    sent,
    send: vi.fn((msg: string) => {
      sent.push(msg);
    }),
    close: vi.fn(),
  };
}

function createMockRoom(id: string, connections: any[]) {
  return {
    id,
    getConnections: () => connections,
  };
}

function parseSent(conn: { sent: string[] }): any[] {
  return conn.sent.map((s) => {
    try {
      return JSON.parse(s);
    } catch (_) {
      return s;
    }
  });
}

function findMessage(conn: { sent: string[] }, type: string): any | undefined {
  return parseSent(conn).find((m) => m && m.type === type);
}

/**
 * Поднимает комнату LINE_UP с хостом и гостем и переводит её в PLAYING
 * через PLAYER_READY обоих игроков (без ТВ-экрана).
 */
function startDuelRoom() {
  const connections: any[] = [];
  const server = new GameRoomServer(
    createMockRoom("parties/main/duel-prohibited-room", connections)
  );

  const hostConn = createMockConn("conn_host");
  connections.push(hostConn);
  server.onConnect(hostConn, {
    request: new Request(
      "http://localhost:1999/party/duel-prohibited-room?clientId=c_host&isHost=true&nickname=Host&mode=LINE_UP"
    ),
  });

  const guestConn = createMockConn("conn_guest");
  connections.push(guestConn);
  server.onConnect(guestConn, {
    request: new Request(
      "http://localhost:1999/party/duel-prohibited-room?clientId=c_guest&isHost=false&nickname=Guest&mode=LINE_UP"
    ),
  });

  server.onMessage(JSON.stringify({ type: "PLAYER_READY" }), hostConn);
  server.onMessage(JSON.stringify({ type: "PLAYER_READY" }), guestConn);

  // Сбрасываем служебные сообщения подключения/готовности.
  hostConn.sent.length = 0;
  guestConn.sent.length = 0;

  return { server, hostConn, guestConn, connections };
}

/**
 * Снимок реально существующих дуэльных/матчевых полей состояния.
 * Используется для проверки, что запрещённая команда не мутирует игру.
 */
function snapshotDuelState(server: GameRoomServer) {
  const gs = server.state.gameState!;
  return {
    status: server.state.status,
    currentTurn: gs.currentTurn,
    winner: gs.winner,
    matchPot: gs.matchPot,
    duelHistory: JSON.parse(JSON.stringify(gs.duelHistory ?? [])),
    duelPenalties: JSON.parse(JSON.stringify(gs.duelPenalties ?? {})),
    duelAccusations: JSON.parse(JSON.stringify(gs.duelAccusations ?? [])),
  };
}

describe("SEC-NET-04-T: блокировка дуэльных эксплойтов", () => {
  let activeServers: GameRoomServer[] = [];

  beforeEach(() => {
    activeServers = [];
    publicRoomsRegistry.clear();
    roomToMorseRegistry.clear();
    morseToRoomRegistry.clear();
    morseToRoomsRegistry.clear();
  });

  afterEach(() => {
    for (const server of activeServers) {
      try {
        server.close();
      } catch (_) {
        // ignore
      }
    }
    activeServers = [];
  });

  function startTrackedDuelRoom() {
    const ctx = startDuelRoom();
    activeServers.push(ctx.server);
    return ctx;
  }

  it("(а, д) RESTART_DUEL от клиента не меняет состояние, не рассылает STATE_UPDATE/MATCH_ANNULLED и не убивает комнату", () => {
    const { server, hostConn, guestConn } = startTrackedDuelRoom();

    expect(server.state.status).toBe("PLAYING");
    const before = snapshotDuelState(server);

    server.onMessage(
      JSON.stringify({ type: "RESTART_DUEL", payload: {}, senderClientId: "c_host" }),
      hostConn
    );

    // Состояние не изменилось ни в одном из реальных полей.
    expect(snapshotDuelState(server)).toEqual(before);

    // Ранний фильтр не рассылает ни обновление состояния, ни аннулирование матча.
    expect(findMessage(hostConn, "STATE_UPDATE")).toBeUndefined();
    expect(findMessage(guestConn, "STATE_UPDATE")).toBeUndefined();
    expect(findMessage(hostConn, "MATCH_ANNULLED")).toBeUndefined();
    expect(findMessage(guestConn, "MATCH_ANNULLED")).toBeUndefined();

    // Комната остаётся живой: статус не FINISHED, PING по-прежнему отвечает PONG.
    expect(server.state.status).toBe("PLAYING");
    server.onMessage(JSON.stringify({ type: "PING" }), hostConn);
    expect(findMessage(hostConn, "PONG")).toBeDefined();
  });

  it("(д) RESTART_DUEL через DISPATCH_ACTION-обёртку тоже отбрасывается ранним фильтром", () => {
    const { server, hostConn, guestConn } = startTrackedDuelRoom();
    const before = snapshotDuelState(server);

    server.onMessage(
      JSON.stringify({
        type: "DISPATCH_ACTION",
        action: { type: "RESTART_DUEL", payload: {} },
        senderClientId: "c_host",
      }),
      hostConn
    );

    expect(snapshotDuelState(server)).toEqual(before);
    expect(findMessage(hostConn, "STATE_UPDATE")).toBeUndefined();
    expect(findMessage(guestConn, "STATE_UPDATE")).toBeUndefined();
    expect(server.state.status).toBe("PLAYING");
  });

  it("(г) ранний фильтр отбрасывает RESTART_DUEL до validateActionLogic (второй слой не задействуется)", () => {
    const { server, hostConn } = startTrackedDuelRoom();
    const validateSpy = vi.spyOn(server, "validateActionLogic");

    server.onMessage(
      JSON.stringify({ type: "RESTART_DUEL", payload: {}, senderClientId: "c_host" }),
      hostConn
    );

    // Запрещённая команда отсекается ещё до валидатора — обойти ранний фильтр
    // штатным путём onMessage нельзя.
    expect(validateSpy).not.toHaveBeenCalled();
  });

  it("(б) RESOLVE_DUEL_TIE_BREAK в LINE_UP не меняет winner/дуэльные поля и не рассылает STATE_UPDATE", () => {
    const { server, hostConn, guestConn } = startTrackedDuelRoom();
    const before = snapshotDuelState(server);

    server.onMessage(
      JSON.stringify({
        type: "RESOLVE_DUEL_TIE_BREAK",
        payload: {},
        senderClientId: "c_host",
      }),
      hostConn
    );

    expect(server.state.gameState!.winner).toBe(before.winner);
    expect(snapshotDuelState(server)).toEqual(before);
    expect(findMessage(hostConn, "STATE_UPDATE")).toBeUndefined();
    expect(findMessage(guestConn, "STATE_UPDATE")).toBeUndefined();
  });

  it("(г) validateActionLogic возвращает код PROHIBITED_ACTION для SET_MATCH_POT, RESTART_DUEL и RESOLVE_DUEL_TIE_BREAK", () => {
    const { server } = startTrackedDuelRoom();

    // Берём игрока, чей ход сейчас активен, чтобы проверка очередности
    // не перекрыла проверку запрещённого действия.
    const currentTurn = server.state.gameState!.currentTurn;
    const activePlayer = Object.values(server.state.players).find(
      (p) => p.role === currentTurn
    );
    expect(activePlayer).toBeDefined();

    const prohibited = ["SET_MATCH_POT", "RESTART_DUEL", "RESOLVE_DUEL_TIE_BREAK"];
    for (const type of prohibited) {
      const result = server.validateActionLogic({ type, payload: {} }, activePlayer!);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("PROHIBITED_ACTION");
    }

    // Проверка изолирована от очередности хода: даже без игрока (player = null)
    // запрещённое действие получает именно PROHIBITED_ACTION.
    for (const type of prohibited) {
      const result = server.validateActionLogic({ type, payload: {} }, null);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("PROHIBITED_ACTION");
    }
  });
});
