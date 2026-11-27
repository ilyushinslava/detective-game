import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameRoomServer from "../index";
import {
  TURN_TIME_LIMIT_SECONDS,
  TURN_TIME_LIMIT_MS,
  TURN_GRACE_PERIOD_SECONDS,
  MATCH_MIN_DURATION_SECONDS,
  MATCH_DEFAULT_DURATION_SECONDS,
  MATCH_MAX_DURATION_SECONDS,
  MATCH_SECRET_SERVICE_MAX_DURATION_SECONDS,
  MATCH_LINE_UP_MAX_DURATION_SECONDS,
} from "../../constants/gameRules";
import {
  MATCH_MIN_DURATION_SECONDS as REWARD_MIN_DURATION_SECONDS,
  MATCH_DEFAULT_DURATION_SECONDS as REWARD_DEFAULT_DURATION_SECONDS,
  MATCH_MAX_DURATION_SECONDS as REWARD_MAX_DURATION_SECONDS,
  MATCH_SECRET_SERVICE_MAX_DURATION_SECONDS as REWARD_SECRET_SERVICE_MAX_DURATION_SECONDS,
  MATCH_LINE_UP_MAX_DURATION_SECONDS as REWARD_LINE_UP_MAX_DURATION_SECONDS,
  clampMatchDuration,
} from "../../utils/matchRewards";
import { GAME_CONFIG } from "../../config/gameConfig";
import { DISCONNECT_GRACE_PERIOD_MS } from "../index";

function createMockConn(id: string) {
  const sent: string[] = [];
  return {
    id,
    send: vi.fn((data: string) => sent.push(data)),
    close: vi.fn(),
    sent,
  };
}

const ROOM_PATH = "parties/main/turn-timer-room";

describe("Server turn timer lifecycle & duration limits", () => {
  let server: GameRoomServer;
  let mockRoom: any;
  let connections: any[];

  beforeEach(() => {
    vi.useFakeTimers();
    connections = [];
    mockRoom = {
      id: ROOM_PATH,
      getConnections: () => connections,
    };
    server = new GameRoomServer(mockRoom);
  });

  afterEach(() => {
    if (server) server.close();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  function connectBoth() {
    const hostConn = createMockConn("conn_host");
    connections.push(hostConn);
    server.onConnect(hostConn, {
      request: new Request(
        `http://localhost:1999/party/turn-timer-room?clientId=c_host&isHost=true&nickname=Host`
      ),
    });

    const guestConn = createMockConn("conn_guest");
    connections.push(guestConn);
    server.onConnect(guestConn, {
      request: new Request(
        `http://localhost:1999/party/turn-timer-room?clientId=c_guest&isHost=false&nickname=Guest`
      ),
    });

    return { hostConn, guestConn };
  }

  it("запускает таймер хода на START_MATCH и переключает ход по истечении", () => {
    const { hostConn } = connectBoth();

    server.onMessage(
      JSON.stringify({ type: "START_MATCH", senderClientId: "c_host" }),
      hostConn
    );

    expect(server.state.status).toBe("PLAYING");
    expect(server.state.gameState?.currentTurn).toBe("KILLER");

    // До истечения лимита ход не меняется
    vi.advanceTimersByTime(TURN_TIME_LIMIT_MS - 1);
    expect(server.state.gameState?.currentTurn).toBe("KILLER");

    // По истечении лимита ход переходит сопернику
    vi.advanceTimersByTime(1);
    expect(server.state.gameState?.currentTurn).toBe("DETECTIVE");
  });

  it("запускает таймер хода при готовности обоих игроков (PLAYER_READY)", () => {
    const { hostConn, guestConn } = connectBoth();

    server.onMessage(
      JSON.stringify({ type: "PLAYER_READY", senderClientId: "c_host" }),
      hostConn
    );
    server.onMessage(
      JSON.stringify({ type: "PLAYER_READY", senderClientId: "c_guest" }),
      guestConn
    );

    expect(server.state.status).toBe("PLAYING");
    expect(server.state.gameState?.currentTurn).toBe("KILLER");

    vi.advanceTimersByTime(TURN_TIME_LIMIT_MS);
    expect(server.state.gameState?.currentTurn).toBe("DETECTIVE");
  });

  it("по таймауту перезапускает таймер для следующего хода", () => {
    const { hostConn } = connectBoth();

    server.onMessage(
      JSON.stringify({ type: "START_MATCH", senderClientId: "c_host" }),
      hostConn
    );

    // KILLER -> DETECTIVE
    vi.advanceTimersByTime(TURN_TIME_LIMIT_MS);
    expect(server.state.gameState?.currentTurn).toBe("DETECTIVE");

    // DETECTIVE -> KILLER (таймер перезапущен автоматически)
    vi.advanceTimersByTime(TURN_TIME_LIMIT_MS);
    expect(server.state.gameState?.currentTurn).toBe("KILLER");
  });

  it("транслирует TURN_TIMEOUT игрокам при истечении хода", () => {
    const { hostConn, guestConn } = connectBoth();

    server.onMessage(
      JSON.stringify({ type: "START_MATCH", senderClientId: "c_host" }),
      hostConn
    );

    vi.advanceTimersByTime(TURN_TIME_LIMIT_MS);

    const guestTimeout = guestConn.sent
      .map((s) => JSON.parse(s))
      .find((m) => m.type === "TURN_TIMEOUT");
    expect(guestTimeout).toBeDefined();
  });

  describe("Согласование лимитов длительности", () => {
    it("сервер, конфиг клиента и matchRewards используют единые константы", () => {
      // Лимит хода
      expect(TURN_TIME_LIMIT_MS).toBe(TURN_TIME_LIMIT_SECONDS * 1000);
      expect(GAME_CONFIG.TIMERS.TURN_TIME_LIMIT_SEC).toBe(TURN_TIME_LIMIT_SECONDS);

      // Грейс-период отключения совпадает у сервера и клиента
      expect(DISCONNECT_GRACE_PERIOD_MS).toBe(TURN_GRACE_PERIOD_SECONDS * 1000);

      // Лимиты длительности матча реэкспортируются из gameRules без дублирования
      expect(REWARD_MIN_DURATION_SECONDS).toBe(MATCH_MIN_DURATION_SECONDS);
      expect(REWARD_DEFAULT_DURATION_SECONDS).toBe(MATCH_DEFAULT_DURATION_SECONDS);
      expect(REWARD_MAX_DURATION_SECONDS).toBe(MATCH_MAX_DURATION_SECONDS);
      expect(REWARD_SECRET_SERVICE_MAX_DURATION_SECONDS).toBe(
        MATCH_SECRET_SERVICE_MAX_DURATION_SECONDS
      );
      expect(REWARD_LINE_UP_MAX_DURATION_SECONDS).toBe(MATCH_LINE_UP_MAX_DURATION_SECONDS);

      // Кламп использует те же значения
      expect(clampMatchDuration("MANIAC_VS_OPERATIVE", MATCH_DEFAULT_DURATION_SECONDS)).toBe(
        MATCH_DEFAULT_DURATION_SECONDS
      );
      expect(clampMatchDuration("SECRET_SERVICE", Number.MAX_SAFE_INTEGER)).toBe(
        MATCH_SECRET_SERVICE_MAX_DURATION_SECONDS
      );
      expect(clampMatchDuration("LINE_UP", Number.MAX_SAFE_INTEGER)).toBe(
        MATCH_LINE_UP_MAX_DURATION_SECONDS
      );
    });
  });
});
