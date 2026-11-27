// @vitest-environment node
// Кластер 3: ротация authToken с окном совместимости.
// Инвариант: при каждом успешном (re)bind сессии выдаётся новый authToken,
// предыдущий принимается ещё AUTH_TOKEN_ROTATION_GRACE_MS, после чего отклоняется.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameRoomServer, {
  AUTH_TOKEN_ROTATION_GRACE_MS,
  publicRoomsRegistry,
  roomToMorseRegistry,
  morseToRoomRegistry,
  morseToRoomsRegistry,
} from "../index";

function createMockConn(id: string) {
  const sent: any[] = [];
  return {
    id,
    sent,
    send: vi.fn((msg: string) => {
      try {
        sent.push(JSON.parse(msg));
      } catch (_) {
        sent.push(msg);
      }
    }),
    close: vi.fn(),
  };
}

function createMockRoom(id: string, connections: any[]) {
  return {
    id,
    getConnections: () => connections,
    connections,
  };
}

function findMsg(conn: any, type: string) {
  return conn.sent.find((m: any) => m && m.type === type);
}

function findAllMsgs(conn: any, type: string) {
  return conn.sent.filter((m: any) => m && m.type === type);
}

describe("Кластер 3: ротация authToken с окном совместимости", () => {
  let server: GameRoomServer;
  let connections: any[];
  let roomId: string;

  const connect = (conn: any, params: Record<string, string>) => {
    const query = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    server.onConnect(conn, {
      request: new Request(`http://localhost:1999/party/${roomId}?${query}`),
    });
  };

  const addConn = (id: string) => {
    const conn = createMockConn(id);
    connections.push(conn);
    return conn;
  };

  beforeEach(() => {
    publicRoomsRegistry.clear();
    roomToMorseRegistry.clear();
    morseToRoomRegistry.clear();
    morseToRoomsRegistry.clear();
    vi.useFakeTimers();
    connections = [];
    roomId = `auth-rotation-${Math.random().toString(36).slice(2, 9)}`;
    server = new GameRoomServer(createMockRoom(`parties/main/${roomId}`, connections));
  });

  afterEach(() => {
    server.close();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const createTwoPlayers = () => {
    const hostConn = addConn("conn_host");
    connect(hostConn, { clientId: "c_host", isHost: "true" });

    const guestConn = addConn("conn_guest");
    connect(guestConn, { clientId: "c_guest", isHost: "false" });

    return {
      hostConn,
      guestConn,
      hostToken: server.state.players["c_host"].authToken as string,
      guestToken: server.state.players["c_guest"].authToken as string,
    };
  };

  it("(а) реконнект выдаёт новый токен, а прежний ещё принимается в пределах окна", () => {
    const { hostToken } = createTwoPlayers();

    const hostConn2 = addConn("conn_host_2");
    connect(hostConn2, { clientId: "c_host", isHost: "true", authToken: hostToken });

    const rotated = findMsg(hostConn2, "AUTH_TOKEN")?.authToken as string;
    expect(rotated).toBeDefined();
    expect(rotated).not.toBe(hostToken);
    expect(server.state.players["c_host"].authToken).toBe(rotated);
    expect(server.state.players["c_host"].previousAuthToken).toBe(hostToken);
    expect(server.state.players["c_host"].previousAuthTokenExpiresAt).toBeGreaterThan(Date.now());

    // SESSION_RESTORED/STATE_SNAPSHOT тоже несут актуальный (новый) токен.
    expect(findMsg(hostConn2, "SESSION_RESTORED")?.authToken).toBe(rotated);
    expect(findMsg(hostConn2, "STATE_SNAPSHOT")?.authToken).toBe(rotated);

    // Повторный реконнект со старым токеном внутри 60с проходит.
    const hostConn3 = addConn("conn_host_3");
    connect(hostConn3, { clientId: "c_host", isHost: "true", authToken: hostToken });

    expect(hostConn3.close).not.toHaveBeenCalled();
    expect(findMsg(hostConn3, "SESSION_RESTORED")).toBeDefined();
    expect(findMsg(hostConn3, "ERROR")).toBeUndefined();
    expect(server.state.players["c_host"].connectionId).toBe("conn_host_3");
  });

  it("(б) после истечения окна прежний токен отклоняется с UNAUTHORIZED_SESSION и close()", () => {
    const { hostToken } = createTwoPlayers();

    const hostConn2 = addConn("conn_host_2");
    connect(hostConn2, { clientId: "c_host", isHost: "true", authToken: hostToken });
    const rotated = findMsg(hostConn2, "AUTH_TOKEN")?.authToken as string;
    expect(rotated).not.toBe(hostToken);

    vi.advanceTimersByTime(AUTH_TOKEN_ROTATION_GRACE_MS + 1_000);

    const staleConn = addConn("conn_host_stale");
    connect(staleConn, { clientId: "c_host", isHost: "true", authToken: hostToken });

    expect(findMsg(staleConn, "ERROR")?.message).toBe("UNAUTHORIZED_SESSION");
    expect(staleConn.close).toHaveBeenCalled();
    expect(findMsg(staleConn, "SESSION_RESTORED")).toBeUndefined();

    // Текущий токен по-прежнему работает.
    const freshConn = addConn("conn_host_fresh");
    connect(freshConn, { clientId: "c_host", isHost: "true", authToken: rotated });
    expect(findMsg(freshConn, "SESSION_RESTORED")).toBeDefined();
  });

  it("(в) двойная ротация: token1 отклоняется, token2 принимается, token3 — текущий", () => {
    const { hostToken: token1 } = createTwoPlayers();

    const conn2 = addConn("conn_rot_2");
    connect(conn2, { clientId: "c_host", isHost: "true", authToken: token1 });
    const token2 = findMsg(conn2, "AUTH_TOKEN")?.authToken as string;
    expect(token2).not.toBe(token1);

    const conn3 = addConn("conn_rot_3");
    connect(conn3, { clientId: "c_host", isHost: "true", authToken: token2 });
    const token3 = findMsg(conn3, "AUTH_TOKEN")?.authToken as string;
    expect(token3).not.toBe(token2);

    // token3 — текущий, token2 — предыдущий.
    expect(server.state.players["c_host"].authToken).toBe(token3);
    expect(server.state.players["c_host"].previousAuthToken).toBe(token2);

    // token1 больше не валиден.
    const connStale = addConn("conn_rot_stale");
    connect(connStale, { clientId: "c_host", isHost: "true", authToken: token1 });
    expect(findMsg(connStale, "ERROR")?.message).toBe("UNAUTHORIZED_SESSION");
    expect(connStale.close).toHaveBeenCalled();

    // token2 принимается в пределах окна.
    const connPrev = addConn("conn_rot_prev");
    connect(connPrev, { clientId: "c_host", isHost: "true", authToken: token2 });
    expect(connPrev.close).not.toHaveBeenCalled();
    expect(findMsg(connPrev, "SESSION_RESTORED")).toBeDefined();
    expect(server.state.players["c_host"].previousAuthToken).toBe(token3);
  });

  it("(г) публичные сообщения не содержат authToken/previousAuthToken/previousAuthTokenExpiresAt", () => {
    const { hostConn, guestConn, hostToken, guestToken } = createTwoPlayers();

    // Ротация хоста: появляется новый токен и метаданные предыдущего.
    const hostConn2 = addConn("conn_host_rot");
    connect(hostConn2, { clientId: "c_host", isHost: "true", authToken: hostToken });
    const rotatedHostToken = findMsg(hostConn2, "AUTH_TOKEN")?.authToken as string;
    expect(rotatedHostToken).toBeDefined();

    // Ни один публичный пакет не должен содержать серверные поля токенов.
    const ownSessionTypes = new Set(["AUTH_TOKEN", "SESSION_RESTORED", "STATE_SNAPSHOT"]);
    for (const conn of connections) {
      for (const packet of conn.sent) {
        if (!packet || typeof packet !== "object") continue;
        if (ownSessionTypes.has(packet.type)) continue;
        const raw = JSON.stringify(packet);
        expect(raw).not.toContain("previousAuthToken");
        expect(raw).not.toContain("previousAuthTokenExpiresAt");
        expect(raw).not.toContain(hostToken);
        expect(raw).not.toContain(guestToken);
        expect(raw).not.toContain(rotatedHostToken);
      }
    }

    // ROOM_STATUS: у игроков нет полей токенов.
    for (const conn of connections) {
      for (const statusMsg of findAllMsgs(conn, "ROOM_STATUS")) {
        for (const player of Object.values(statusMsg.players || {})) {
          expect(player).not.toHaveProperty("authToken");
          expect(player).not.toHaveProperty("previousAuthToken");
          expect(player).not.toHaveProperty("previousAuthTokenExpiresAt");
        }
      }
    }

    // Кросс-утечек нет: гостю не уходят токены хоста и наоборот.
    const hostPackets = JSON.stringify(hostConn2.sent);
    expect(hostPackets).not.toContain(guestToken);
    const guestPackets = JSON.stringify(guestConn.sent);
    expect(guestPackets).not.toContain(rotatedHostToken);
    expect(guestPackets).not.toContain(hostToken);
  });

  it("(д) регрессия: новый игрок без токена подключается и получает AUTH_TOKEN с sessionEpoch", () => {
    const hostConn = addConn("conn_new_host");
    connect(hostConn, { clientId: "c_new_host", isHost: "true" });

    const hostAuth = findMsg(hostConn, "AUTH_TOKEN");
    expect(hostAuth?.authToken).toBeTruthy();
    expect(server.state.players["c_new_host"].sessionEpoch).toBe(1);

    const guestConn = addConn("conn_new_guest");
    connect(guestConn, { clientId: "c_new_guest", isHost: "false" });

    const guestAuth = findMsg(guestConn, "AUTH_TOKEN");
    expect(guestAuth?.authToken).toBeTruthy();
    expect(guestAuth?.authToken).not.toBe(hostAuth?.authToken);
    expect(server.state.players["c_new_guest"].sessionEpoch).toBe(1);
    expect(guestConn.close).not.toHaveBeenCalled();
  });

  it("(е) регрессия: SESSION_CONFLICT по валидному токену чужого clientId по-прежнему отклоняется", () => {
    const { hostToken } = createTwoPlayers();

    // Хост ротирует токен, после чего атакующий использует его с clientId гостя.
    const hostConn2 = addConn("conn_host_rot2");
    connect(hostConn2, { clientId: "c_host", isHost: "true", authToken: hostToken });
    const rotatedHostToken = findMsg(hostConn2, "AUTH_TOKEN")?.authToken as string;
    const guestTokenBefore = server.state.players["c_guest"].authToken;

    const attackerConn = addConn("conn_conflict_rot");
    connect(attackerConn, { clientId: "c_guest", authToken: rotatedHostToken });

    expect(findMsg(attackerConn, "ERROR")?.message).toBe("SESSION_CONFLICT");
    expect(attackerConn.close).toHaveBeenCalled();
    expect(findMsg(attackerConn, "SESSION_RESTORED")).toBeUndefined();

    // Состояние не изменилось.
    expect(server.state.players["c_guest"].authToken).toBe(guestTokenBefore);
    expect(server.state.players["c_guest"].previousAuthToken).toBeUndefined();
  });
});
