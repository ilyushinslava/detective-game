// @vitest-environment node
// P0-2 / P0-3: Защита слота игрока в ТВ-комнате и режимная валидация действий.
import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoomServer, {
  isActionAllowedForMode,
  publicRoomsRegistry,
  roomToMorseRegistry,
  morseToRoomRegistry,
  morseToRoomsRegistry,
} from "../index";
import { getAdjacentCharacters } from "../../utils/gameLogic";
import { DUEL_QUESTIONS } from "../../constants/duelQuestions";

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
 * Поднимает комнату с хостом и гостем, переводит её в PLAYING.
 * Возвращает соединения и выданные authToken-ы.
 */
function startPlayingRoom(mode: "MANIAC_VS_OPERATIVE" | "LINE_UP") {
  const connections: any[] = [];
  const server = new GameRoomServer(createMockRoom(`parties/main/mode-room-${mode}`, connections));

  const hostConn = createMockConn("conn_host");
  connections.push(hostConn);
  server.onConnect(hostConn, {
    request: new Request(
      `http://localhost:1999/party/mode-room?clientId=c_host&isHost=true&nickname=Host&mode=${mode}`
    ),
  });

  const guestConn = createMockConn("conn_guest");
  connections.push(guestConn);
  server.onConnect(guestConn, {
    request: new Request(
      `http://localhost:1999/party/mode-room?clientId=c_guest&isHost=false&nickname=Guest&mode=${mode}`
    ),
  });

  const hostToken = findMessage(hostConn, "AUTH_TOKEN")?.authToken;
  const guestToken = findMessage(guestConn, "AUTH_TOKEN")?.authToken;

  server.onMessage(JSON.stringify({ type: "PLAYER_READY" }), hostConn);
  server.onMessage(JSON.stringify({ type: "PLAYER_READY" }), guestConn);

  expect(server.state.status).toBe("PLAYING");
  expect(server.state.mode).toBe(mode);

  return { server, hostConn, guestConn, hostToken, guestToken, connections };
}

describe("P0-2: Защита активного слота игрока в PLAYING", () => {
  beforeEach(() => {
    publicRoomsRegistry.clear();
    roomToMorseRegistry.clear();
    morseToRoomRegistry.clear();
    morseToRoomsRegistry.clear();
  });

  it("не передаёт слот отключённого игрока новому клиенту без валидного authToken в ТВ-комнате", () => {
    const connections: any[] = [];
    const server = new GameRoomServer(
      createMockRoom("parties/main/tv-slot-room", connections)
    );

    // ТВ-экран подписывается на комнату.
    const tvConn = createMockConn("conn_tv");
    connections.push(tvConn);
    server.onConnect(tvConn, {
      request: new Request(
        "http://localhost:1999/party/tv-slot-room?clientId=tv_display&clientType=TV_DISPLAY&mode=MANIAC_VS_OPERATIVE"
      ),
    });

    // Хост и гость занимают оба игровых слота.
    const hostConn = createMockConn("conn_host");
    connections.push(hostConn);
    server.onConnect(hostConn, {
      request: new Request(
        "http://localhost:1999/party/tv-slot-room?clientId=c_host&isHost=true&nickname=Host"
      ),
    });

    const guestConn = createMockConn("conn_guest");
    connections.push(guestConn);
    server.onConnect(guestConn, {
      request: new Request(
        "http://localhost:1999/party/tv-slot-room?clientId=c_guest&isHost=false&nickname=Guest"
      ),
    });

    const guestToken = findMessage(guestConn, "AUTH_TOKEN")?.authToken;
    const guestRole = server.state.players["c_guest"].role;
    expect(guestToken).toBeTruthy();

    server.state.status = "PLAYING";
    server.onClose(guestConn);
    expect(server.state.players["c_guest"].isDisconnected).toBe(true);

    // Злоумышленник сканирует QR-код ТВ и подключается без токена.
    const attackerConn = createMockConn("conn_attacker");
    connections.push(attackerConn);
    server.onConnect(attackerConn, {
      request: new Request(
        "http://localhost:1999/party/tv-slot-room?clientId=c_attacker&clientType=CONTROLLER"
      ),
    });

    // Соединение отклонено, слот не перехвачен, токен не выдан.
    expect(attackerConn.close).toHaveBeenCalled();
    expect(findMessage(attackerConn, "ERROR")?.message).toBe("ROOM_IN_PROGRESS");
    expect(findMessage(attackerConn, "AUTH_TOKEN")).toBeUndefined();
    expect(findMessage(attackerConn, "SESSION_RESTORED")).toBeUndefined();

    expect(server.state.players["c_attacker"]).toBeUndefined();
    expect(server.state.players["c_guest"]).toBeDefined();
    expect(server.state.players["c_guest"].role).toBe(guestRole);
    expect(server.state.players["c_guest"].authToken).toBe(guestToken);

    // Комната продолжает работать: законный игрок восстанавливается по своему токену.
    const legitConn = createMockConn("conn_legit");
    connections.push(legitConn);
    server.onConnect(legitConn, {
      request: new Request(
        `http://localhost:1999/party/tv-slot-room?clientId=c_guest_restored&clientType=CONTROLLER&authToken=${guestToken}`
      ),
    });

    expect(legitConn.close).not.toHaveBeenCalled();
    expect(server.state.players["c_guest_restored"]).toBeDefined();
    expect(server.state.players["c_guest_restored"].role).toBe(guestRole);
    expect(findMessage(legitConn, "SESSION_RESTORED")?.role).toBe(guestRole);
    expect(server.state.status).toBe("PLAYING");
  });
});

describe("P0-3: Режимная валидация действий", () => {
  beforeEach(() => {
    publicRoomsRegistry.clear();
    roomToMorseRegistry.clear();
    morseToRoomRegistry.clear();
    morseToRoomsRegistry.clear();
  });

  it("хелпер isActionAllowedForMode корректно ограничивает действия по режимам", () => {
    expect(isActionAllowedForMode("LINE_UP", "DUEL_ACCUSE")).toBe(true);
    expect(isActionAllowedForMode("LINE_UP", "DUEL_ASK_QUESTION")).toBe(true);
    expect(isActionAllowedForMode("MANIAC_VS_OPERATIVE", "DUEL_ACCUSE")).toBe(false);

    expect(isActionAllowedForMode("MANIAC_VS_OPERATIVE", "KILL_CHARACTER")).toBe(true);
    expect(isActionAllowedForMode("LINE_UP", "KILL_CHARACTER")).toBe(false);

    expect(isActionAllowedForMode("THIEF_HUNT", "SWEAR_IN_OFFICER")).toBe(true);
    expect(isActionAllowedForMode("MANIAC_VS_OPERATIVE", "SWEAR_IN_OFFICER")).toBe(false);

    // Зачистка — штатное действие и для MANIAC_VS_OPERATIVE, и для SECRET_SERVICE.
    expect(isActionAllowedForMode("MANIAC_VS_OPERATIVE", "CLEANUP")).toBe(true);
    expect(isActionAllowedForMode("SECRET_SERVICE", "CLEANUP")).toBe(true);
    expect(isActionAllowedForMode("LINE_UP", "CLEANUP")).toBe(false);

    // Универсальные действия не ограничены.
    expect(isActionAllowedForMode("LINE_UP", "SHIFT_BOARD")).toBe(true);
  });

  it("отклоняет DUEL_ACCUSE в режиме MANIAC_VS_OPERATIVE, не мутируя состояние и не ломая комнату", () => {
    const { server, hostConn } = startPlayingRoom("MANIAC_VS_OPERATIVE");
    const snapshotBefore = JSON.stringify(server.state.gameState);

    hostConn.sent.length = 0;
    server.onMessage(
      JSON.stringify({
        type: "DUEL_ACCUSE",
        payload: { targetId: server.state.gameState!.board[0][0].id },
      }),
      hostConn
    );

    const rejected = findMessage(hostConn, "ACTION_REJECTED");
    expect(rejected?.reason).toBe("INVALID_ACTION_FOR_MODE");
    expect(findMessage(hostConn, "SYNC_ERROR")?.reason).toBe("INVALID_ACTION_FOR_MODE");

    // Состояние не изменилось, комната остаётся в игре.
    expect(JSON.stringify(server.state.gameState)).toBe(snapshotBefore);
    expect(server.state.status).toBe("PLAYING");

    // Позитивный кейс: штатное убийство в своём режиме по-прежнему применяется.
    const victimId = server.state.gameState!.victimList[0];
    const neighbors = getAdjacentCharacters(server.state.gameState!.board, victimId);
    server.state.gameState!.killerSecretId = neighbors[0].id;

    server.onMessage(
      JSON.stringify({
        type: "KILL_CHARACTER",
        payload: { targetId: victimId },
      }),
      hostConn
    );

    expect(server.state.gameState!.killCount).toBe(1);
    expect(server.state.status).toBe("PLAYING");
  });

  it("разрешает DUEL_ASK_QUESTION в LINE_UP, но отклоняет KILL_CHARACTER из чужого режима", () => {
    const { server, hostConn, guestConn } = startPlayingRoom("LINE_UP");

    // В LINE_UP первый ход за DETECTIVE (гость).
    expect(server.state.gameState!.currentTurn).toBe("DETECTIVE");
    const questionId = DUEL_QUESTIONS[0].id;

    guestConn.sent.length = 0;
    server.onMessage(
      JSON.stringify({
        type: "DUEL_ASK_QUESTION",
        payload: { questionId },
      }),
      guestConn
    );

    // Позитивный кейс: вопрос применён, ход перешёл к KILLER.
    expect(server.state.gameState!.duelHistory?.length).toBe(1);
    expect(server.state.gameState!.currentTurn).toBe("KILLER");

    const snapshotBefore = JSON.stringify(server.state.gameState);
    hostConn.sent.length = 0;
    server.onMessage(
      JSON.stringify({
        type: "KILL_CHARACTER",
        payload: { targetId: server.state.gameState!.board[0][0].id },
      }),
      hostConn
    );

    expect(findMessage(hostConn, "ACTION_REJECTED")?.reason).toBe("INVALID_ACTION_FOR_MODE");
    expect(JSON.stringify(server.state.gameState)).toBe(snapshotBefore);
    expect(server.state.status).toBe("PLAYING");
  });
});
