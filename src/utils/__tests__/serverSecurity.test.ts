import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoomServer from "../../server/index";

function createMockConn(id: string) {
  const sent: string[] = [];
  return {
    id,
    send: vi.fn((data: string) => sent.push(data)),
    close: vi.fn(),
    sent,
  };
}

describe("GameRoomServer Security (SEC-01 & SEC-02)", () => {
  let server: GameRoomServer;
  let mockRoom: any;
  let connections: any[];

  beforeEach(() => {
    connections = [];
    mockRoom = {
      id: "parties/main/security-test-room",
      getConnections: () => connections,
    };
    server = new GameRoomServer(mockRoom);
  });

  describe("SEC-01: Session Hijacking Prevention via AuthToken", () => {
    it("issues a unique authToken to newly connected host and guest", () => {
      const hostConn = createMockConn("conn_host_1");
      connections.push(hostConn);

      const hostReq = new Request("http://localhost:1999/party/security-test-room?clientId=c_host&isHost=true&nickname=Host");
      server.onConnect(hostConn, { request: hostReq });

      const authMsg = hostConn.sent
        .map((s) => JSON.parse(s))
        .find((m) => m.type === "AUTH_TOKEN");

      expect(authMsg).toBeDefined();
      expect(typeof authMsg.authToken).toBe("string");
      expect(authMsg.authToken.length).toBeGreaterThan(10);
      expect(authMsg.clientId).toBe("c_host");

      // Check host stored token
      const hostToken = server.state.players["c_host"].authToken;
      expect(hostToken).toBe(authMsg.authToken);

      // Now connect guest
      const guestConn = createMockConn("conn_guest_1");
      connections.push(guestConn);
      const guestReq = new Request("http://localhost:1999/party/security-test-room?clientId=c_guest&isHost=false&nickname=Guest");
      server.onConnect(guestConn, { request: guestReq });

      const guestAuthMsg = guestConn.sent
        .map((s) => JSON.parse(s))
        .find((m) => m.type === "AUTH_TOKEN");

      expect(guestAuthMsg).toBeDefined();
      expect(guestAuthMsg.authToken).not.toBe(authMsg?.authToken);
    });

    it("sanitizes ROOM_STATUS: authToken is never leaked to other players", () => {
      const hostConn = createMockConn("conn_h");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/security-test-room?clientId=c_host&isHost=true"),
      });

      const broadcastSpy = vi.spyOn(server, "broadcastRaw");
      server.broadcastStatus();

      expect(broadcastSpy).toHaveBeenCalled();
      const lastPayload = JSON.parse(broadcastSpy.mock.calls[broadcastSpy.mock.calls.length - 1][0]);

      expect(lastPayload.type).toBe("ROOM_STATUS");
      expect(lastPayload.players.c_host).toBeDefined();
      // authToken must be stripped
      expect(lastPayload.players.c_host.authToken).toBeUndefined();
    });

    it("rejects unauthorized reconnection attempt with mismatched or missing authToken", () => {
      const hostConn = createMockConn("conn_h_legit");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/security-test-room?clientId=victim_id&isHost=true"),
      });

      // Attacker tries to hijack victim_id without token
      const attackerConn = createMockConn("conn_attacker");
      connections.push(attackerConn);
      server.onConnect(attackerConn, {
        request: new Request("http://localhost:1999/party/security-test-room?clientId=victim_id&isHost=false"),
      });

      expect(attackerConn.close).toHaveBeenCalled();
      const errorMsg = attackerConn.sent
        .map((s) => JSON.parse(s))
        .find((m) => m.type === "ERROR");
      expect(errorMsg?.message).toBe("UNAUTHORIZED_SESSION");

      // Verify server connectionId for victim was NOT overridden
      expect(server.state.players["victim_id"].connectionId).toBe("conn_h_legit");
    });

    it("allows valid reconnection when authToken matches", () => {
      const hostConn = createMockConn("conn_h_orig");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/security-test-room?clientId=player_1&isHost=true"),
      });

      const token = server.state.players["player_1"].authToken;
      expect(token).toBeDefined();

      // Legitimate client reconnects with valid authToken
      const resumeConn = createMockConn("conn_h_resumed");
      connections.push(resumeConn);
      server.onConnect(resumeConn, {
        request: new Request(`http://localhost:1999/party/security-test-room?clientId=player_1&authToken=${token}`),
      });

      expect(resumeConn.close).not.toHaveBeenCalled();
      expect(server.state.players["player_1"].connectionId).toBe("conn_h_resumed");
    });
  });

  describe("SEC-02: START_MATCH Privilege Enforcement", () => {
    it("rejects START_MATCH when issued by a non-host guest player", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/security-test-room?clientId=host_id&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/security-test-room?clientId=guest_id&isHost=false"),
      });

      expect(server.state.status).toBe("READY_TO_START");

      // Guest sends START_MATCH
      server.onMessage(
        JSON.stringify({
          type: "START_MATCH",
          payload: { mode: "MANIAC_VS_OPERATIVE" },
        }),
        guestConn
      );

      // Must remain in READY_TO_START because guest is not authorized
      expect(server.state.status).toBe("READY_TO_START");
      expect(server.state.gameState).toBeDefined();
      // Status didn't change to PLAYING
      expect(server.state.status).not.toBe("PLAYING");
    });

    it("accepts START_MATCH when issued by host or TV display", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/security-test-room?clientId=host_id&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/security-test-room?clientId=guest_id&isHost=false"),
      });

      // Host sends START_MATCH
      server.onMessage(
        JSON.stringify({
          type: "START_MATCH",
          payload: { mode: "MANIAC_VS_OPERATIVE" },
        }),
        hostConn
      );

      expect(server.state.status).toBe("PLAYING");
    });
  });

  describe("SEC-03: victimList Masking & Queue Length Preservation", () => {
    it("masks future victim IDs as 'UNKNOWN' while preserving total queue length and first target", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/security-test-room?clientId=host_id&isHost=true&mode=MANIAC_VS_OPERATIVE"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/security-test-room?clientId=guest_id&isHost=false&mode=MANIAC_VS_OPERATIVE"),
      });

      // The server created initial gameState with 4 victims in victimList
      const serverVictims = server.state.gameState!.victimList;
      expect(serverVictims.length).toBe(4);

      // Inspect masked state sent to guest
      const guestSyncCalls = guestConn.sent
        .map((s) => JSON.parse(s))
        .filter((m) => m.type === "SYNC_STATE");
      const lastGuestState = guestSyncCalls[guestSyncCalls.length - 1].state;

      // Queue length must match the real 4 victims count
      expect(lastGuestState.victimList.length).toBe(4);
      // The current target is exposed
      expect(lastGuestState.victimList[0]).toBe(serverVictims[0]);
      // Future targets are masked as UNKNOWN
      expect(lastGuestState.victimList[1]).toBe("UNKNOWN");
      expect(lastGuestState.victimList[2]).toBe("UNKNOWN");
      expect(lastGuestState.victimList[3]).toBe("UNKNOWN");
    });
  });
});
