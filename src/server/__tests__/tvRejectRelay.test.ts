// @vitest-environment node
// Ран C: пересылка текстовой причины отказа действия на ТВ-дисплеи (10-foot UI).
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

function messagesOfType(conn: { sent: string[] }, type: string): any[] {
  return parseSent(conn).filter((m) => m && m.type === type);
}

interface ConnectOptions {
  id: string;
  clientId: string;
  nickname?: string;
  isHost?: boolean;
  clientType?: string;
}

function connect(
  server: GameRoomServer,
  connections: any[],
  opts: ConnectOptions
) {
  const conn = createMockConn(opts.id);
  connections.push(conn);
  const params = new URLSearchParams({
    clientId: opts.clientId,
    nickname: opts.nickname || opts.clientId,
    isHost: String(Boolean(opts.isHost)),
    mode: "MANIAC_VS_OPERATIVE",
  });
  if (opts.clientType) params.set("clientType", opts.clientType);
  server.onConnect(conn, {
    request: new Request(`http://localhost:1999/party/tv-reject?${params.toString()}`),
  });
  return conn;
}

let activeServers: GameRoomServer[] = [];

function startPlayingRoomWithTv() {
  const connections: any[] = [];
  const server = new GameRoomServer(
    createMockRoom("parties/main/tv-reject", connections)
  );
  activeServers.push(server);

  const hostConn = connect(server, connections, {
    id: "conn_host",
    clientId: "c_host",
    nickname: "Host",
    isHost: true,
    clientType: "CONTROLLER",
  });
  const guestConn = connect(server, connections, {
    id: "conn_guest",
    clientId: "c_guest",
    nickname: "Guest",
    isHost: false,
    clientType: "CONTROLLER",
  });
  const tvConn = connect(server, connections, {
    id: "conn_tv",
    clientId: "tv_1",
    nickname: "TV",
    clientType: "TV_DISPLAY",
  });

  server.onMessage(JSON.stringify({ type: "PLAYER_READY" }), hostConn);
  server.onMessage(JSON.stringify({ type: "PLAYER_READY" }), guestConn);

  // При наличии ТВ-дисплея матч стартует явной командой START_MATCH хоста
  // (статус READY_TO_START), а не автоматически.
  expect(server.state.status).toBe("READY_TO_START");
  server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);

  expect(server.state.status).toBe("PLAYING");
  expect(Object.keys(server.state.tvDisplays)).toHaveLength(1);

  return { server, hostConn, guestConn, tvConn };
}

beforeEach(() => {
  publicRoomsRegistry.clear();
  roomToMorseRegistry.clear();
  morseToRoomRegistry.clear();
  morseToRoomsRegistry.clear();
});

afterEach(() => {
  for (const server of activeServers) {
    try {
      server.close();
    } catch (_) {}
  }
  activeServers = [];
});

describe("Пересылка ACTION_REJECTED на ТВ-дисплеи (Ран C)", () => {
  it("8) отказ игрового действия доходит до ТВ-дисплея, но не до соперника", () => {
    const { server, hostConn, guestConn, tvConn } = startPlayingRoomWithTv();
    const gs = server.state.gameState!;
    gs.currentTurn = "KILLER";
    gs.killerSecretId = gs.board[0][0].id;

    const targetId = gs.board[4][4].id;

    server.onMessage(
      JSON.stringify({ type: "KILL_CHARACTER", payload: { targetId } }),
      hostConn
    );

    // Отправитель получает ровно один ACTION_REJECTED.
    const hostRejects = messagesOfType(hostConn, "ACTION_REJECTED");
    expect(hostRejects).toHaveLength(1);
    expect(hostRejects[0].reason).toBe("TARGET_NOT_IN_RADIUS");

    // ТВ-дисплей получает текстовую причину отказа ровно один раз.
    const tvRejects = messagesOfType(tvConn, "ACTION_REJECTED");
    expect(tvRejects).toHaveLength(1);
    expect(tvRejects[0].reason).toBe("TARGET_NOT_IN_RADIUS");

    // Соперник отказа НЕ получает.
    expect(messagesOfType(guestConn, "ACTION_REJECTED")).toHaveLength(0);
  });

  it("9) helper не дублирует сообщение ТВ-отправителю; не-хост TV_CONFIRM_RESTART отклоняется один раз", () => {
    const { server, guestConn, tvConn } = startPlayingRoomWithTv();

    // Прямая проверка guard helper'а: если отправитель — сам ТВ, дубль не шлём.
    const before = messagesOfType(tvConn, "ACTION_REJECTED").length;
    (server as any).notifyTvDisplaysOfRejection(
      "NOT_HOST",
      "TV_CONFIRM_RESTART",
      tvConn.id
    );
    expect(messagesOfType(tvConn, "ACTION_REJECTED")).toHaveLength(before);

    // Реальная ветка отказа TV_CONFIRM_RESTART (не-хост) — ровно одно сообщение,
    // без дубля от helper'а пересылки на ТВ.
    server.onMessage(JSON.stringify({ type: "TV_CONFIRM_RESTART" }), guestConn);
    const guestRejects = messagesOfType(guestConn, "ACTION_REJECTED");
    expect(guestRejects).toHaveLength(1);
    expect(guestRejects[0].reason).toBe("NOT_HOST");
  });
});
