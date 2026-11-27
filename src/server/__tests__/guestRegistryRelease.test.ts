// @vitest-environment node
// SEC-NET-07: номера гостей в guestRegistry должны освобождаться
// при преждевременном уничтожении комнаты и при остановке сервера.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import GameRoomServer from "../index";
import { guestRegistry } from "../../utils/guestManager";

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
  return {
    id,
    getConnections: () => [],
  };
}

describe("SEC-NET-07: освобождение номеров guestRegistry", () => {
  beforeEach(() => {
    guestRegistry.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    guestRegistry.reset();
  });

  it("onClose хоста в статусе WAITING освобождает номер гостя", () => {
    const roomId = "parties/main/guest-registry-host-close";
    const server = new GameRoomServer(createMockRoom(roomId));
    const conn = createMockConn("conn_host");

    // Номер занят до подключения — именно его должен освободить onClose.
    guestRegistry.claimNumber(777);

    const req = new Request(
      `http://localhost:1999/party/guest-registry-host-close?clientId=c_host&isHost=true&nickname=${encodeURIComponent(
        "Агент #777"
      )}&mode=MANIAC_VS_OPERATIVE`
    );
    server.onConnect(conn, { request: req });

    expect(server.state.status).toBe("WAITING");
    expect(server.state.players["c_host"]?.nickname).toBe("Агент #777");

    // До закрытия номер ещё занят.
    expect(guestRegistry.claimNumber(777)).not.toBe(777);

    server.onClose(conn);

    // После закрытия номер снова доступен для выдачи.
    expect(guestRegistry.claimNumber(777)).toBe(777);

    server.close();
  });

  it("close() освобождает номера всех оставшихся игроков", () => {
    const roomId = "parties/main/guest-registry-server-close";
    const server = new GameRoomServer(createMockRoom(roomId));
    const conn = createMockConn("conn_player");

    guestRegistry.claimNumber(888);

    const req = new Request(
      `http://localhost:1999/party/guest-registry-server-close?clientId=c_player&isHost=true&nickname=${encodeURIComponent(
        "Агент #888"
      )}&mode=MANIAC_VS_OPERATIVE`
    );
    server.onConnect(conn, { request: req });

    expect(server.state.players["c_player"]?.nickname).toBe("Агент #888");
    // До остановки сервера номер ещё занят.
    expect(guestRegistry.claimNumber(888)).not.toBe(888);

    server.close();

    // После остановки сервера номер освобождён и может быть выдан повторно.
    expect(guestRegistry.claimNumber(888)).toBe(888);
  });
});
