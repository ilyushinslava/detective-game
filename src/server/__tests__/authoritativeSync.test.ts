import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoomServer from "../index";

function createMockConn(id: string) {
  const sent: string[] = [];
  return {
    id,
    send: vi.fn((data: string) => sent.push(data)),
    close: vi.fn(),
    sent,
  };
}

describe("Authoritative PartyKit Server & Strict State Sync", () => {
  let server: GameRoomServer;
  let mockRoom: any;
  let connections: any[];

  beforeEach(() => {
    connections = [];
    mockRoom = {
      id: "parties/main/authoritative-test-room",
      getConnections: () => connections,
    };
    server = new GameRoomServer(mockRoom);
  });

  describe("1. State Initialization & Snapshot for TV Host", () => {
    it("initializes state and sends STATE_SNAPSHOT on TV connection", () => {
      const tvConn = createMockConn("conn_tv_1");
      connections.push(tvConn);

      const tvReq = new Request(
        "http://localhost:1999/party/authoritative-test-room?clientId=tv_display_1&clientType=TV_DISPLAY&mode=MANIAC_VS_OPERATIVE"
      );
      server.onConnect(tvConn, { request: tvReq });

      expect(server.state.gameState).not.toBeNull();
      expect(server.state.gameState?.board).toBeDefined();

      const snapshotMsg = tvConn.sent
        .map((s) => JSON.parse(s))
        .find((m) => m.type === "STATE_SNAPSHOT");

      expect(snapshotMsg).toBeDefined();
      expect(snapshotMsg.role).toBe("SPECTATOR");
      expect(snapshotMsg.state).toBeDefined();
      // Secrets must be hidden on TV snapshot
      expect(snapshotMsg.state.killerSecretId).toBeNull();
      expect(snapshotMsg.state.detectiveSecretId).toBeNull();
    });

    it("handles INIT / CREATE_ROOM command and returns STATE_SNAPSHOT", () => {
      const conn = createMockConn("conn_host_init");
      connections.push(conn);

      const req = new Request(
        "http://localhost:1999/party/authoritative-test-room?clientId=c_host&isHost=true&nickname=Host"
      );
      server.onConnect(conn, { request: req });

      conn.sent.length = 0; // clear connect messages

      server.onMessage(
        JSON.stringify({
          type: "INIT",
          payload: { mode: "MANIAC_VS_OPERATIVE" },
        }),
        conn
      );

      const snapshotMsg = conn.sent
        .map((s) => JSON.parse(s))
        .find((m) => m.type === "STATE_SNAPSHOT");

      expect(snapshotMsg).toBeDefined();
      expect(snapshotMsg.state).toBeDefined();
    });
  });

  describe("2. Authoritative Action Validation (DISPATCH_ACTION)", () => {
    let hostConn: any;
    let guestConn: any;

    beforeEach(() => {
      hostConn = createMockConn("conn_host");
      guestConn = createMockConn("conn_guest");
      connections.push(hostConn, guestConn);

      const hostReq = new Request(
        "http://localhost:1999/party/authoritative-test-room?clientId=c_host&isHost=true&nickname=Killer"
      );
      server.onConnect(hostConn, { request: hostReq });

      const guestReq = new Request(
        "http://localhost:1999/party/authoritative-test-room?clientId=c_guest&isHost=false&nickname=Detective"
      );
      server.onConnect(guestConn, { request: guestReq });

      // Start match
      server.onMessage(
        JSON.stringify({
          type: "START_MATCH",
          senderClientId: "c_host",
        }),
        hostConn
      );

      hostConn.sent.length = 0;
      guestConn.sent.length = 0;
    });

    it("rejects action if not player's turn with SYNC_ERROR and ACTION_REJECTED", () => {
      const currentTurn = server.state.gameState?.currentTurn;
      const wrongConn = currentTurn === "KILLER" ? guestConn : hostConn;
      const wrongRole = currentTurn === "KILLER" ? "DETECTIVE" : "KILLER";

      server.onMessage(
        JSON.stringify({
          type: "DISPATCH_ACTION",
          action: {
            type: "SHIFT_BOARD",
            payload: {
              shiftType: "ROW",
              index: 0,
              direction: "FORWARD",
            },
          },
        }),
        wrongConn
      );

      const syncError = wrongConn.sent
        .map((s: string) => JSON.parse(s))
        .find((m: any) => m.type === "SYNC_ERROR");

      expect(syncError).toBeDefined();
      expect(syncError.reason).toBe("NOT_YOUR_TURN");

      const rejected = wrongConn.sent
        .map((s: string) => JSON.parse(s))
        .find((m: any) => m.type === "ACTION_REJECTED");
      expect(rejected).toBeDefined();
      expect(rejected.reason).toBe("NOT_YOUR_TURN");
    });

    it("rejects out-of-bounds SHIFT_BOARD maneuver", () => {
      const currentTurn = server.state.gameState?.currentTurn;
      const activeConn = currentTurn === "KILLER" ? hostConn : guestConn;

      server.onMessage(
        JSON.stringify({
          type: "DISPATCH_ACTION",
          action: {
            type: "SHIFT_BOARD",
            payload: {
              shiftType: "ROW",
              index: 99, // Out of bounds
              direction: "FORWARD",
            },
          },
        }),
        activeConn
      );

      const syncError = activeConn.sent
        .map((s: string) => JSON.parse(s))
        .find((m: any) => m.type === "SYNC_ERROR");

      expect(syncError).toBeDefined();
      expect(syncError.reason).toBe("INDEX_OUT_OF_BOUNDS");
    });

    it("rejects anti-undo opposite shift maneuver", () => {
      const currentTurn = server.state.gameState?.currentTurn;
      const activeConn = currentTurn === "KILLER" ? hostConn : guestConn;

      // First shift is valid
      server.onMessage(
        JSON.stringify({
          type: "DISPATCH_ACTION",
          action: {
            type: "SHIFT_BOARD",
            payload: {
              shiftType: "ROW",
              index: 2,
              direction: "FORWARD",
            },
          },
        }),
        activeConn
      );

      // Verify state updated
      expect(server.state.gameState?.lastShift).toEqual({
        type: "ROW",
        index: 2,
        direction: "FORWARD",
      });

      // Advance turn manually for second player or check anti-undo directly
      const nextTurn = server.state.gameState?.currentTurn;
      const nextConn = nextTurn === "KILLER" ? hostConn : guestConn;
      nextConn.sent.length = 0;

      // Attempt reverse opposite shift on same line
      server.onMessage(
        JSON.stringify({
          type: "DISPATCH_ACTION",
          action: {
            type: "SHIFT_BOARD",
            payload: {
              shiftType: "ROW",
              index: 2,
              direction: "BACKWARD", // Opposite!
            },
          },
        }),
        nextConn
      );

      const syncError = nextConn.sent
        .map((s: string) => JSON.parse(s))
        .find((m: any) => m.type === "SYNC_ERROR");

      expect(syncError).toBeDefined();
      expect(syncError.reason).toBe("OPPOSITE_SHIFT_BLOCKED");
    });

    it("rejects target action if target card does not exist", () => {
      const currentTurn = server.state.gameState?.currentTurn;
      const activeConn = currentTurn === "KILLER" ? hostConn : guestConn;

      server.onMessage(
        JSON.stringify({
          type: "DISPATCH_ACTION",
          action: {
            type: "KILL_CHARACTER",
            payload: {
              targetId: "non_existent_card_999",
            },
          },
        }),
        activeConn
      );

      const syncError = activeConn.sent
        .map((s: string) => JSON.parse(s))
        .find((m: any) => m.type === "SYNC_ERROR");

      expect(syncError).toBeDefined();
      expect(syncError.reason).toBe("TARGET_NOT_FOUND");
    });

    it("broadcasts STATE_UPDATE and SYNC_STATE upon successful action dispatch", () => {
      const currentTurn = server.state.gameState?.currentTurn;
      const activeConn = currentTurn === "KILLER" ? hostConn : guestConn;
      const otherConn = currentTurn === "KILLER" ? guestConn : hostConn;

      activeConn.sent.length = 0;
      otherConn.sent.length = 0;

      server.onMessage(
        JSON.stringify({
          type: "DISPATCH_ACTION",
          action: {
            type: "SHIFT_BOARD",
            payload: {
              shiftType: "COL",
              index: 1,
              direction: "FORWARD",
            },
          },
        }),
        activeConn
      );

      // Verify active client received STATE_UPDATE and SYNC_STATE
      const activeUpdate = activeConn.sent
        .map((s: string) => JSON.parse(s))
        .find((m: any) => m.type === "STATE_UPDATE");
      const activeSync = activeConn.sent
        .map((s: string) => JSON.parse(s))
        .find((m: any) => m.type === "SYNC_STATE");

      expect(activeUpdate).toBeDefined();
      expect(activeSync).toBeDefined();

      // Verify other client received STATE_UPDATE and SYNC_STATE
      const otherUpdate = otherConn.sent
        .map((s: string) => JSON.parse(s))
        .find((m: any) => m.type === "STATE_UPDATE");
      const otherSync = otherConn.sent
        .map((s: string) => JSON.parse(s))
        .find((m: any) => m.type === "SYNC_STATE");

      expect(otherUpdate).toBeDefined();
      expect(otherSync).toBeDefined();
    });
  });

  describe("3. Session Reconnection & State Snapshot", () => {
    it("sends STATE_SNAPSHOT on reconnection with valid authToken", () => {
      const hostConn = createMockConn("conn_host_orig");
      connections.push(hostConn);

      const hostReq = new Request(
        "http://localhost:1999/party/authoritative-test-room?clientId=c_host&isHost=true&nickname=Host"
      );
      server.onConnect(hostConn, { request: hostReq });

      const authToken = server.state.players["c_host"].authToken;
      expect(authToken).toBeDefined();

      // Disconnect
      server.onClose(hostConn);
      expect(server.state.players["c_host"].isDisconnected).toBe(true);

      // Reconnect with same authToken
      const newHostConn = createMockConn("conn_host_reconnect");
      connections.push(newHostConn);

      const reconnectReq = new Request(
        `http://localhost:1999/party/authoritative-test-room?clientId=c_host&authToken=${authToken}`
      );
      server.onConnect(newHostConn, { request: reconnectReq });

      const snapshotMsg = newHostConn.sent
        .map((s: string) => JSON.parse(s))
        .find((m: any) => m.type === "STATE_SNAPSHOT");

      expect(snapshotMsg).toBeDefined();
      expect(snapshotMsg.clientId).toBe("c_host");
      expect(snapshotMsg.status).toBe(server.state.status);
    });
  });

  describe("4. Anti-Cheat: Mode-Specific Actions & Prohibited Client Actions", () => {
    let hostConn: any;
    let guestConn: any;

    beforeEach(() => {
      hostConn = createMockConn("conn_ac_host");
      guestConn = createMockConn("conn_ac_guest");
      connections.push(hostConn, guestConn);

      const hostReq = new Request(
        "http://localhost:1999/party/authoritative-test-room?clientId=c_host&isHost=true&nickname=Host&mode=MANIAC_VS_OPERATIVE"
      );
      server.onConnect(hostConn, { request: hostReq });

      const guestReq = new Request(
        "http://localhost:1999/party/authoritative-test-room?clientId=c_guest&isHost=false&nickname=Guest&mode=MANIAC_VS_OPERATIVE"
      );
      server.onConnect(guestConn, { request: guestReq });

      // Start match
      server.onMessage(
        JSON.stringify({
          type: "START_MATCH",
          senderClientId: "c_host",
        }),
        hostConn
      );

      hostConn.sent.length = 0;
      guestConn.sent.length = 0;
    });

    it("rejects CAPTURE_SPY when mode is MANIAC_VS_OPERATIVE with INVALID_ACTION_FOR_MODE", () => {
      server.state.gameState!.currentTurn = "KILLER";
      const allChars = server.state.gameState!.board.flat();
      const targetChar = allChars[0];

      server.onMessage(
        JSON.stringify({
          type: "DISPATCH_ACTION",
          action: {
            type: "CAPTURE_SPY",
            payload: { targetId: targetChar.id, isHit: true, winner: "KILLER" },
          },
          senderClientId: "c_host",
        }),
        hostConn
      );

      const rejectedMsg = hostConn.sent
        .map((s: string) => JSON.parse(s))
        .find((m: any) => m.type === "ACTION_REJECTED");

      expect(rejectedMsg).toBeDefined();
      expect(rejectedMsg.reason).toBe("INVALID_ACTION_FOR_MODE");
      expect(server.state.gameState!.winner).toBeNull();
    });

    it("rejects STEAL when mode is MANIAC_VS_OPERATIVE with INVALID_ACTION_FOR_MODE", () => {
      server.state.gameState!.currentTurn = "KILLER";
      const targetChar = server.state.gameState!.board.flat()[0];

      server.onMessage(
        JSON.stringify({
          type: "DISPATCH_ACTION",
          action: {
            type: "STEAL",
            payload: { targetId: targetChar.id },
          },
          senderClientId: "c_host",
        }),
        hostConn
      );

      const rejectedMsg = hostConn.sent
        .map((s: string) => JSON.parse(s))
        .find((m: any) => m.type === "ACTION_REJECTED");

      expect(rejectedMsg).toBeDefined();
      expect(rejectedMsg.reason).toBe("INVALID_ACTION_FOR_MODE");
    });

    it("blocks prohibited client commands (SET_MATCH_POT, RESTART_DUEL, RESOLVE_DUEL_TIE_BREAK)", () => {
      server.onMessage(
        JSON.stringify({
          type: "SET_MATCH_POT",
          payload: { pot: 999999, bet: 999999 },
          senderClientId: "c_host",
        }),
        hostConn
      );

      expect(server.state.gameState!.matchPot).not.toBe(999999);

      server.onMessage(
        JSON.stringify({
          type: "RESOLVE_DUEL_TIE_BREAK",
          payload: {},
          senderClientId: "c_host",
        }),
        hostConn
      );

      expect(server.state.gameState!.winner).toBeNull();
    });

    it("authoritatively initializes and recalculates matchBet and matchPot on START_MATCH and CONFIRM_RESTART", () => {
      // 1. By default, START_MATCH initializes default bet (250) and pot (500 for 2 players)
      expect(server.state.gameState!.matchBet).toBe(250);
      expect(server.state.gameState!.matchPot).toBe(500);

      // 2. On CONFIRM_RESTART (rematch), server maintains room bet and recalculates matchPot
      server.state.status = "FINISHED";
      server.state.restartRequestedBy = "c_guest";
      server.onMessage(
        JSON.stringify({
          type: "CONFIRM_RESTART",
          senderClientId: "c_host",
        }),
        hostConn
      );

      expect(server.state.gameState!.matchBet).toBe(250);
      expect(server.state.gameState!.matchPot).toBe(500);

      // 3. New room with custom bet (e.g. 500)
      const customServer = new GameRoomServer({ id: "parties/main/custom-bet-room", getConnections: () => [] });
      const hConn = createMockConn("c_h_custom");
      const gConn = createMockConn("c_g_custom");

      customServer.onConnect(hConn, {
        request: new Request("http://localhost:1999/party/custom-bet-room?clientId=c_h_custom&isHost=true&nickname=Host&bet=500"),
      });
      customServer.onConnect(gConn, {
        request: new Request("http://localhost:1999/party/custom-bet-room?clientId=c_g_custom&isHost=false&nickname=Guest"),
      });

      expect(customServer.state.bet).toBe(500);
      expect(customServer.state.gameState!.matchBet).toBe(500);
      expect(customServer.state.gameState!.matchPot).toBe(1000);

      customServer.onMessage(
        JSON.stringify({
          type: "START_MATCH",
          senderClientId: "c_h_custom",
        }),
        hConn
      );

      expect(customServer.state.gameState!.matchBet).toBe(500);
      expect(customServer.state.gameState!.matchPot).toBe(1000);
    });
  });
});
