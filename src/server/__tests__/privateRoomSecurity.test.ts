// @vitest-environment node
// P0-1: Регрессионные тесты защиты приватных комнат и авторизации хоста.
import { describe, it, expect, beforeEach, vi } from "vitest";
import GameRoomServer, {
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

function createMockRoom(id: string) {
  const connections: any[] = [];
  return {
    id,
    getConnections: () => connections,
    connections,
  };
}

describe("P0-1: Private rooms & host authorization", () => {
  beforeEach(() => {
    publicRoomsRegistry.clear();
    roomToMorseRegistry.clear();
    morseToRoomRegistry.clear();
    morseToRoomsRegistry.clear();
  });

  it("hides roomCode and morseCode of private rooms in GET_ROOMS, but keeps them for public rooms", async () => {
    publicRoomsRegistry.set("room-public", {
      roomCode: "room-public",
      morseCode: ".......",
      mode: "MANIAC_VS_OPERATIVE",
      hostName: "Public Host",
      status: "WAITING",
      playersCount: 1,
      maxPlayers: 2,
      isPrivate: false,
    });
    publicRoomsRegistry.set("room-secret", {
      roomCode: "room-secret",
      morseCode: ".------",
      mode: "MANIAC_VS_OPERATIVE",
      hostName: "Secret Host",
      status: "WAITING",
      playersCount: 1,
      maxPlayers: 2,
      isPrivate: true,
    });

    const server = new GameRoomServer(createMockRoom("parties/main/list-room"));

    const res = await server.onRequest(
      new Request("http://localhost:1999/party/main?action=list")
    );
    expect(res.status).toBe(200);
    const rooms = await res.json();

    const publicRoom = rooms.find((r: any) => r.hostName === "Public Host");
    const secretRoom = rooms.find((r: any) => r.hostName === "Secret Host");

    expect(publicRoom).toBeDefined();
    expect(publicRoom.roomCode).toBe("room-public");
    expect(publicRoom.morseCode).toBe(".......");

    expect(secretRoom).toBeDefined();
    expect(secretRoom.roomCode).toBeUndefined();
    expect(secretRoom.morseCode).toBeUndefined();

    // Резолв приватной комнаты по PIN подтверждает факт, но не раскрывает секретные коды.
    const resolveRes = await server.onRequest(
      new Request("http://localhost:1999/party/main?action=resolve&pin=room-secret")
    );
    expect(resolveRes.status).toBe(200);
    const resolved = await resolveRes.json();
    expect(resolved.ok).toBe(true);
    expect(resolved.roomCode).toBeUndefined();
    expect(resolved.morseCode).toBeUndefined();
  });

  it("rejects TV_DISPLAY access to a private room without a valid morse code or token (check runs before TV branch)", () => {
    const server = new GameRoomServer(createMockRoom("parties/main/tv-private-room"));

    // Хост создаёт приватную комнату.
    const hostConn = createMockConn("conn_host");
    server.onConnect(hostConn, {
      request: new Request(
        "http://localhost:1999/party/tv-private-room?clientId=host_1&isHost=true&isPrivate=true&nickname=Host"
      ),
    });
    expect(server.state.isPrivate).toBe(true);
    const expectedMorse = roomToMorseRegistry.get("tv-private-room");
    expect(expectedMorse).toBeTruthy();

    // ТВ без кода/токена отклоняется до обработки ветки TV_DISPLAY.
    const tvBadConn = createMockConn("conn_tv_bad");
    server.onConnect(tvBadConn, {
      request: new Request(
        "http://localhost:1999/party/tv-private-room?clientId=tv_bad&clientType=TV_DISPLAY&nickname=TV"
      ),
    });
    expect(tvBadConn.close).toHaveBeenCalled();
    expect(tvBadConn.sent).toContainEqual({ type: "ERROR", message: "INVALID_MORSE_CODE" });
    expect(server.state.tvDisplays["tv_bad"]).toBeUndefined();

    // Контроль: ТВ с валидным кодом Морзе допускается.
    const tvGoodConn = createMockConn("conn_tv_good");
    server.onConnect(tvGoodConn, {
      request: new Request(
        `http://localhost:1999/party/tv-private-room?clientId=tv_good&clientType=TV_DISPLAY&nickname=TV&morse=${expectedMorse}`
      ),
    });
    expect(tvGoodConn.close).not.toHaveBeenCalled();
    expect(server.state.tvDisplays["tv_good"]).toBeDefined();
  });

  it("ignores isHost=true from a foreign client and does not overwrite room metadata or morseCode", () => {
    const server = new GameRoomServer(createMockRoom("parties/main/spoof-room"));

    const hostConn = createMockConn("conn_host");
    server.onConnect(hostConn, {
      request: new Request(
        "http://localhost:1999/party/spoof-room?clientId=host_1&isHost=true&nickname=Host&mode=MANIAC_VS_OPERATIVE"
      ),
    });

    expect(server.state.players["host_1"]).toBeDefined();
    expect(server.state.players["host_1"].isHost).toBe(true);
    expect(server.state.hostToken).toBeTruthy();

    const hostTokenBefore = server.state.hostToken;
    const morseBefore = roomToMorseRegistry.get("spoof-room");
    const metadataBefore = publicRoomsRegistry.get("spoof-room");
    expect(morseBefore).toBeTruthy();
    expect(metadataBefore?.hostName).toBe("Host");

    // Чужой клиент подменяет isHost=true в query.
    const attackerConn = createMockConn("conn_attacker");
    server.onConnect(attackerConn, {
      request: new Request(
        "http://localhost:1999/party/spoof-room?clientId=attacker_1&isHost=true&nickname=Attacker"
      ),
    });

    // Прав хоста не получил.
    expect(server.state.players["attacker_1"]).toBeDefined();
    expect(server.state.players["attacker_1"].isHost).toBe(false);
    expect(server.state.players["host_1"].isHost).toBe(true);

    // Метаданные комнаты и morseCode не перезаписаны.
    expect(server.state.hostToken).toBe(hostTokenBefore);
    expect(roomToMorseRegistry.get("spoof-room")).toBe(morseBefore);
    expect(publicRoomsRegistry.get("spoof-room")?.hostName).toBe("Host");
    expect(server.state.mode).toBe("MANIAC_VS_OPERATIVE");

    // Атакующий не может менять настройки комнаты как хост.
    attackerConn.sent.length = 0;
    server.onMessage(
      JSON.stringify({
        type: "CHANGE_SETTINGS",
        payload: { mode: "THIEF_HUNT" },
      }),
      attackerConn
    );
    expect(attackerConn.sent).toContainEqual({
      type: "ACTION_REJECTED",
      reason: "NOT_HOST",
    });
    expect(server.state.mode).toBe("MANIAC_VS_OPERATIVE");
  });
});
