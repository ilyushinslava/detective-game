// @vitest-environment node
// Спринт 2.3: серверная проверка соседства 3x3 и явный ACTION_REJECTED.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameRoomServer, {
  publicRoomsRegistry,
  roomToMorseRegistry,
  morseToRoomRegistry,
  morseToRoomsRegistry,
} from "../index";
import { areAdjacent, getAdjacentCharacters } from "../../utils/gameLogic";

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

function startPlayingRoom(mode: string) {
  const connections: any[] = [];
  const server = new GameRoomServer(
    createMockRoom(`parties/main/spatial-${mode}`, connections)
  );
  activeServers.push(server);

  const hostConn = createMockConn("conn_host");
  connections.push(hostConn);
  server.onConnect(hostConn, {
    request: new Request(
      `http://localhost:1999/party/spatial?clientId=c_host&isHost=true&nickname=Host&mode=${mode}`
    ),
  });

  const guestConn = createMockConn("conn_guest");
  connections.push(guestConn);
  server.onConnect(guestConn, {
    request: new Request(
      `http://localhost:1999/party/spatial?clientId=c_guest&isHost=false&nickname=Guest&mode=${mode}`
    ),
  });

  server.onMessage(JSON.stringify({ type: "PLAYER_READY" }), hostConn);
  server.onMessage(JSON.stringify({ type: "PLAYER_READY" }), guestConn);

  expect(server.state.status).toBe("PLAYING");
  expect(server.state.mode).toBe(mode);

  return { server, hostConn, guestConn };
}

let activeServers: GameRoomServer[] = [];

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

describe("Серверная проверка соседства 3x3 (Спринт 2.3)", () => {
  it("a) MANIAC: KILL_CHARACTER по не соседней клетке отклоняется с TARGET_NOT_IN_RADIUS", () => {
    const { server, hostConn } = startPlayingRoom("MANIAC_VS_OPERATIVE");
    const gs = server.state.gameState!;
    gs.currentTurn = "KILLER";
    gs.killerSecretId = gs.board[0][0].id;

    const targetId = gs.board[4][4].id;
    const killCountBefore = gs.killCount;
    const boardBefore = JSON.stringify(gs.board);

    server.onMessage(
      JSON.stringify({ type: "KILL_CHARACTER", payload: { targetId } }),
      hostConn
    );

    const rejected = findMessage(hostConn, "ACTION_REJECTED");
    const syncError = findMessage(hostConn, "SYNC_ERROR");
    expect(rejected?.reason).toBe("TARGET_NOT_IN_RADIUS");
    expect(syncError?.reason).toBe("TARGET_NOT_IN_RADIUS");
    expect(syncError?.actionType).toBe("KILL_CHARACTER");

    expect(server.state.gameState!.killCount).toBe(killCountBefore);
    expect(JSON.stringify(server.state.gameState!.board)).toBe(boardBefore);
    expect(server.state.status).toBe("PLAYING");
  });

  it("b) MANIAC: KILL_CHARACTER по соседу применяется, без ACTION_REJECTED", () => {
    const { server, hostConn } = startPlayingRoom("MANIAC_VS_OPERATIVE");
    const gs = server.state.gameState!;
    gs.currentTurn = "KILLER";

    const targetId = gs.victimList[0];
    const neighbors = getAdjacentCharacters(gs.board, targetId);
    expect(neighbors.length).toBeGreaterThan(0);
    gs.killerSecretId = neighbors[0].id;

    server.onMessage(
      JSON.stringify({ type: "KILL_CHARACTER", payload: { targetId } }),
      hostConn
    );

    expect(server.state.gameState!.killCount).toBe(1);
    expect(findMessage(hostConn, "ACTION_REJECTED")).toBeUndefined();
    expect(findMessage(hostConn, "STATE_UPDATE")).toBeDefined();
  });

  it("c1) THIEF_HUNT: ROB_NEIGHBOR по далёкой цели отклоняется, трофеи не меняются", () => {
    const { server, hostConn } = startPlayingRoom("THIEF_HUNT");
    const gs = server.state.gameState!;
    gs.currentTurn = "KILLER";
    gs.killerSecretId = gs.board[0][0].id;
    const trophiesBefore = gs.trophiesKiller ?? 0;

    const targetId = gs.board[4][4].id;
    server.onMessage(
      JSON.stringify({ type: "ROB_NEIGHBOR", payload: { targetId } }),
      hostConn
    );

    expect(findMessage(hostConn, "ACTION_REJECTED")?.reason).toBe("TARGET_NOT_IN_RADIUS");
    expect(server.state.gameState!.trophiesKiller ?? 0).toBe(trophiesBefore);
  });

  it("c2) THIEF_HUNT: ROB_NEIGHBOR по соседу добавляет трофей", () => {
    const { server, hostConn } = startPlayingRoom("THIEF_HUNT");
    const gs = server.state.gameState!;
    gs.currentTurn = "KILLER";
    gs.killerSecretId = gs.board[2][2].id;
    const targetId = getAdjacentCharacters(gs.board, gs.killerSecretId)[0].id;
    const trophiesBefore = gs.trophiesKiller ?? 0;

    server.onMessage(
      JSON.stringify({ type: "ROB_NEIGHBOR", payload: { targetId } }),
      hostConn
    );

    expect(findMessage(hostConn, "ACTION_REJECTED")).toBeUndefined();
    expect(server.state.gameState!.trophiesKiller ?? 0).toBe(trophiesBefore + 1);
  });

  it("c3) THIEF_HUNT: ROB_NEIGHBOR «сам-себе» проходит", () => {
    const { server, hostConn } = startPlayingRoom("THIEF_HUNT");
    const gs = server.state.gameState!;
    gs.currentTurn = "KILLER";
    gs.killerSecretId = gs.board[2][2].id;
    const trophiesBefore = gs.trophiesKiller ?? 0;

    server.onMessage(
      JSON.stringify({ type: "ROB_NEIGHBOR", payload: { targetId: gs.killerSecretId } }),
      hostConn
    );

    expect(findMessage(hostConn, "ACTION_REJECTED")).toBeUndefined();
    expect(server.state.gameState!.trophiesKiller ?? 0).toBe(trophiesBefore + 1);
  });

  it("d1) MANIAC: ACCUSE по далёкой цели отклоняется с TARGET_NOT_IN_RADIUS", () => {
    const { server, guestConn } = startPlayingRoom("MANIAC_VS_OPERATIVE");
    const gs = server.state.gameState!;
    gs.currentTurn = "DETECTIVE";
    gs.killerSecretId = gs.board[0][0].id;
    gs.detectiveSecretId = gs.board[0][4].id;

    const targetId = gs.board[4][4].id;
    server.onMessage(
      JSON.stringify({ type: "ACCUSE", payload: { targetId } }),
      guestConn
    );

    expect(findMessage(guestConn, "ACTION_REJECTED")?.reason).toBe("TARGET_NOT_IN_RADIUS");
  });

  it("d2) MANIAC: ACCUSE по соседу применяется (isExonerated === true)", () => {
    const { server, guestConn } = startPlayingRoom("MANIAC_VS_OPERATIVE");
    const gs = server.state.gameState!;
    gs.currentTurn = "DETECTIVE";
    gs.killerSecretId = gs.board[0][0].id;

    const targetId = gs.board[4][4].id;
    const neighbors = getAdjacentCharacters(gs.board, targetId);
    gs.detectiveSecretId = neighbors[0].id;

    server.onMessage(
      JSON.stringify({ type: "ACCUSE", payload: { targetId } }),
      guestConn
    );

    expect(findMessage(guestConn, "ACTION_REJECTED")).toBeUndefined();
    const targetChar = server.state.gameState!.board.flat().find((c) => c.id === targetId);
    expect(targetChar?.isExonerated).toBe(true);
  });

  it("e) THIEF_HUNT: ACCUSE проходит, если цель рядом с офицером (регрессия)", () => {
    const { server, guestConn } = startPlayingRoom("THIEF_HUNT");
    const gs = server.state.gameState!;
    gs.currentTurn = "DETECTIVE";
    gs.killerSecretId = gs.board[0][0].id;

    const targetId = gs.board[4][4].id;
    // Детектив далеко от цели, но рядом с целью стоит офицер.
    gs.detectiveSecretId = gs.board[0][0].id;
    const officerId = getAdjacentCharacters(gs.board, targetId)[0].id;
    gs.uniformedOfficers = [officerId];

    const stateBefore = server.state.gameState;
    server.onMessage(
      JSON.stringify({ type: "ACCUSE", payload: { targetId } }),
      guestConn
    );

    expect(findMessage(guestConn, "ACTION_REJECTED")).toBeUndefined();
    expect(server.state.gameState).not.toBe(stateBefore);
  });

  it("f1) SECRET_SERVICE: INTERROGATE по далёкой цели отклоняется, activeSpyIndex не меняется", () => {
    const { server, hostConn } = startPlayingRoom("SECRET_SERVICE");
    const gs = server.state.gameState!;
    gs.activeSpyIndex = 0;
    gs.spies![0].secretId = gs.board[0][0].id;
    const indexBefore = gs.activeSpyIndex;

    const targetId = gs.board[4][4].id;
    server.onMessage(
      JSON.stringify({ type: "INTERROGATE", payload: { targetId } }),
      hostConn
    );

    expect(findMessage(hostConn, "ACTION_REJECTED")?.reason).toBe("TARGET_NOT_IN_RADIUS");
    expect(server.state.gameState!.activeSpyIndex).toBe(indexBefore);
  });

  it("f2) SECRET_SERVICE: INTERROGATE по соседу применяется", () => {
    const { server, hostConn } = startPlayingRoom("SECRET_SERVICE");
    const gs = server.state.gameState!;
    gs.activeSpyIndex = 0;
    gs.spies![0].secretId = gs.board[0][0].id;
    const targetId = getAdjacentCharacters(gs.board, gs.spies![0].secretId)[0].id;

    server.onMessage(
      JSON.stringify({ type: "INTERROGATE", payload: { targetId } }),
      hostConn
    );

    expect(findMessage(hostConn, "ACTION_REJECTED")).toBeUndefined();
    expect(server.state.gameState!.activeSpyIndex).toBe(1);
  });

  it("f3) SECRET_SERVICE: CAPTURE_SPY по далёкой цели отклоняется", () => {
    const { server, hostConn } = startPlayingRoom("SECRET_SERVICE");
    const gs = server.state.gameState!;
    gs.activeSpyIndex = 0;
    gs.spies![0].secretId = gs.board[0][0].id;
    const indexBefore = gs.activeSpyIndex;

    const targetId = gs.board[4][4].id;
    server.onMessage(
      JSON.stringify({ type: "CAPTURE_SPY", payload: { targetId } }),
      hostConn
    );

    expect(findMessage(hostConn, "ACTION_REJECTED")?.reason).toBe("TARGET_NOT_IN_RADIUS");
    expect(server.state.gameState!.activeSpyIndex).toBe(indexBefore);
  });

  it("f4) SECRET_SERVICE: CAPTURE_SPY по соседу применяется", () => {
    const { server, hostConn } = startPlayingRoom("SECRET_SERVICE");
    const gs = server.state.gameState!;
    gs.activeSpyIndex = 0;
    gs.spies![0].secretId = gs.board[2][2].id;
    const targetId = getAdjacentCharacters(gs.board, gs.spies![0].secretId)[0].id;
    // Делаем захват результативным: цель — тайная личность второго агента.
    gs.spies![1].secretId = targetId;

    server.onMessage(
      JSON.stringify({ type: "CAPTURE_SPY", payload: { targetId } }),
      hostConn
    );

    expect(findMessage(hostConn, "ACTION_REJECTED")).toBeUndefined();
    expect(server.state.gameState!.spies![0].trophies).toBe(1);
    expect(server.state.gameState!.activeSpyIndex).toBe(1);
  });

  it("g) SECRET_SERVICE: мёртвый secretId агента — fallback на первого живого", () => {
    const { server, hostConn } = startPlayingRoom("SECRET_SERVICE");
    const gs = server.state.gameState!;
    gs.activeSpyIndex = 0;

    const deadId = gs.board[0][0].id;
    gs.board[0][0] = { ...gs.board[0][0], isAlive: false };
    gs.spies![0].secretId = deadId;

    const firstAlive = gs.board.flat().find((c) => c.isAlive)!;
    const livingNeighbor = getAdjacentCharacters(gs.board, firstAlive.id).find((c) => c.isAlive)!;
    expect(livingNeighbor).toBeDefined();

    server.onMessage(
      JSON.stringify({ type: "INTERROGATE", payload: { targetId: livingNeighbor.id } }),
      hostConn
    );

    expect(findMessage(hostConn, "ACTION_REJECTED")).toBeUndefined();
    expect(server.state.gameState!.activeSpyIndex).toBe(1);
  });

  it("h) LINE_UP: DUEL_ASK_QUESTION / DUEL_ACCUSE не отклоняются проверкой радиуса", () => {
    const { server } = startPlayingRoom("LINE_UP");

    const ask = server.validateActionLogic({ type: "DUEL_ASK_QUESTION", payload: {} }, null);
    expect(ask.valid).toBe(true);
    expect(ask.reason).not.toBe("TARGET_NOT_IN_RADIUS");

    const accuse = server.validateActionLogic({ type: "DUEL_ACCUSE", payload: {} }, null);
    expect(accuse.valid).toBe(true);
    expect(accuse.reason).not.toBe("TARGET_NOT_IN_RADIUS");
  });

  it("i) Соседство 3x3 не замыкается тором на доске 5x5", () => {
    const { server } = startPlayingRoom("MANIAC_VS_OPERATIVE");
    const board = server.state.gameState!.board;

    expect(areAdjacent(board, board[0][0].id, board[0][4].id)).toBe(false);
    expect(areAdjacent(board, board[0][0].id, board[0][1].id)).toBe(true);
  });

  it("j) No-op: ACCUSE по уже помилованной цели даёт ACTION_NOT_APPLIED", () => {
    const { server, guestConn } = startPlayingRoom("MANIAC_VS_OPERATIVE");
    const gs = server.state.gameState!;
    gs.currentTurn = "DETECTIVE";
    gs.killerSecretId = gs.board[0][0].id;

    const targetId = gs.board[4][4].id;
    gs.detectiveSecretId = getAdjacentCharacters(gs.board, targetId)[0].id;
    gs.board = gs.board.map((row) =>
      row.map((c) => (c.id === targetId ? { ...c, isExonerated: true } : c))
    );

    server.onMessage(
      JSON.stringify({ type: "ACCUSE", payload: { targetId } }),
      guestConn
    );

    const rejected = findMessage(guestConn, "ACTION_REJECTED");
    const syncError = findMessage(guestConn, "SYNC_ERROR");
    expect(rejected?.reason).toBe("ACTION_NOT_APPLIED");
    expect(syncError?.reason).toBe("ACTION_NOT_APPLIED");
  });
});
