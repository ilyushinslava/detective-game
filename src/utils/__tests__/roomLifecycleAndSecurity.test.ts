import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameRoomServer, { DISCONNECT_GRACE_PERIOD_MS } from "../../server/index";
import { rooms, getOrCreateRoom, EMPTY_ROOM_CLEANUP_DELAY_MS } from "../../../server-standalone.mjs";

function createMockConn(id: string) {
  const sent: string[] = [];
  return {
    id,
    send: vi.fn((data: string) => sent.push(data)),
    close: vi.fn(),
    sent,
  };
}

describe("Room Lifecycle & Security Enhancements (Stage 1.1)", () => {
  let server: GameRoomServer;
  let mockRoom: any;
  let connections: any[];

  beforeEach(() => {
    vi.useFakeTimers();
    connections = [];
    mockRoom = {
      id: "parties/main/lifecycle-test-room",
      getConnections: () => connections,
    };
    server = new GameRoomServer(mockRoom);
  });

  afterEach(() => {
    if (server) server.close();
    vi.useRealTimers();
    rooms.clear();
  });

  describe("1. Rematch Security & Confirmation Workflow", () => {
    it("rejects CONFIRM_RESTART during an active match (MATCH_NOT_FINISHED)", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);
      expect(server.state.status).toBe("PLAYING");

      // Attempting to restart while PLAYING
      server.onMessage(JSON.stringify({ type: "CONFIRM_RESTART" }), hostConn);

      const rejected = hostConn.sent
        .map((s) => JSON.parse(s))
        .find((m) => m.type === "ACTION_REJECTED");

      expect(rejected).toBeDefined();
      expect(rejected.reason).toBe("MATCH_NOT_FINISHED");
      expect(server.state.status).toBe("PLAYING");
    });

    it("prevents host from self-confirming their own rematch request", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      server.state.status = "FINISHED";

      // Host requests rematch
      server.onMessage(
        JSON.stringify({ type: "REQUEST_RESTART", payload: { rematchMode: "SWAP" } }),
        hostConn
      );
      expect((server.state as any).restartRequestedBy).toBe("c_host");

      // Host immediately tries to self-confirm without guest's consent
      server.onMessage(JSON.stringify({ type: "CONFIRM_RESTART" }), hostConn);

      const rejected = hostConn.sent
        .map((s) => JSON.parse(s))
        .find((m) => m.type === "ACTION_REJECTED");

      expect(rejected).toBeDefined();
      expect(rejected.reason).toBe("NOT_AUTHORIZED_RESTART");
      // Match status must still be FINISHED
      expect(server.state.status).toBe("FINISHED");
    });

    it("allows second participant to confirm rematch request and resets status to READY_TO_START", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      server.state.status = "FINISHED";

      // Host requests rematch
      server.onMessage(
        JSON.stringify({ type: "REQUEST_RESTART", payload: { rematchMode: "SWAP" } }),
        hostConn
      );

      // Guest confirms rematch
      server.onMessage(JSON.stringify({ type: "CONFIRM_RESTART" }), guestConn);

      expect(server.state.status).toBe("READY_TO_START");
      expect((server.state as any).restartRequestedBy).toBeNull();
    });

    it("rejects CONFIRM_RESTART from TV displays and SPECTATOR connections", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      // Register TV display
      const tvConn = createMockConn("conn_tv");
      connections.push(tvConn);
      server.onConnect(tvConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_tv&clientType=TV_DISPLAY"),
      });

      server.state.status = "FINISHED";
      server.onMessage(JSON.stringify({ type: "REQUEST_RESTART" }), hostConn);

      // TV tries to confirm
      server.onMessage(JSON.stringify({ type: "CONFIRM_RESTART" }), tvConn);
      expect(server.state.status).toBe("FINISHED");

      // Register spectator player
      const spectatorConn = createMockConn("conn_spec");
      connections.push(spectatorConn);
      server.state.players["c_spec"] = {
        clientId: "c_spec",
        nickname: "Spectator",
        isHost: false,
        role: "SPECTATOR",
        connectionId: spectatorConn.id,
        clientType: "PLAYER",
        authToken: "tok_spec",
      };

      // Spectator tries to confirm
      server.onMessage(JSON.stringify({ type: "CONFIRM_RESTART" }), spectatorConn);
      expect(server.state.status).toBe("FINISHED");
    });

    it("clears restartRequestedBy when initiator explicitly leaves the room", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      server.state.status = "FINISHED";
      server.onMessage(JSON.stringify({ type: "REQUEST_RESTART" }), hostConn);
      expect((server.state as any).restartRequestedBy).toBe("c_host");

      // Host explicitly exits to menu
      server.onMessage(JSON.stringify({ type: "PLAYER_LEFT_EXPLICIT" }), hostConn);

      expect((server.state as any).restartRequestedBy).toBeNull();
    });

    it("preserves restartRequestedBy during transient network disconnect until Grace Period expires", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      server.state.status = "FINISHED";
      server.onMessage(JSON.stringify({ type: "REQUEST_RESTART" }), hostConn);
      expect((server.state as any).restartRequestedBy).toBe("c_host");

      // Transient socket disconnect of host
      server.onClose(hostConn);

      // At 30s (within Grace Period), request is preserved
      vi.advanceTimersByTime(30000);
      expect((server.state as any).restartRequestedBy).toBe("c_host");

      // After 60s total, grace period expires and player is removed
      vi.advanceTimersByTime(31000);
      expect((server.state as any).restartRequestedBy).toBeNull();
    });
  });

  describe("2. Behavioral Grace Period (60 Seconds)", () => {
    it("keeps player in room at 59s, but executes OPPONENT_LEFT and removes player at 61s", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);
      expect(server.state.status).toBe("PLAYING");

      // Host disconnects
      server.onClose(hostConn);

      // Advance to 59s: host should NOT be deleted yet
      vi.advanceTimersByTime(59000);
      expect(server.state.players["c_host"]).toBeDefined();
      expect(server.state.status).toBe("PLAYING");

      // Advance past 60s (to 61s total): host removed, status set to FINISHED
      vi.advanceTimersByTime(2000);
      expect(server.state.players["c_host"]).toBeUndefined();
      expect(server.state.status).toBe("FINISHED");

      const opponentLeftMsg = guestConn.sent
        .map((s) => JSON.parse(s))
        .find((m) => m.type === "OPPONENT_LEFT");
      expect(opponentLeftMsg).toBeDefined();
    });
  });

  describe("3. Standalone Room Cleanup and Generation Invariants", () => {
    it("increments generation on reconnect so stale cleanup callback cannot delete active room", () => {
      const roomId = "test-generation-room";
      const entry = getOrCreateRoom(roomId);
      const initialGen = entry.generation;

      // Emulate scheduling a cleanup
      const scheduledGen = ++entry.generation;
      let cleanupRan = false;
      entry.cleanupTimer = setTimeout(() => {
        const currentEntry = rooms.get(roomId);
        if (
          currentEntry &&
          currentEntry === entry &&
          currentEntry.generation === scheduledGen &&
          currentEntry.roomCtx._connectionsMap.size === 0
        ) {
          rooms.delete(roomId);
          cleanupRan = true;
        }
      }, EMPTY_ROOM_CLEANUP_DELAY_MS);

      // Client connects: clears timer and increments generation
      clearTimeout(entry.cleanupTimer);
      entry.cleanupTimer = null;
      entry.generation++;

      expect(entry.generation).toBeGreaterThan(scheduledGen);

      // Fast-forward past cleanup delay
      vi.advanceTimersByTime(EMPTY_ROOM_CLEANUP_DELAY_MS + 1000);

      // Room must still exist in map
      expect(rooms.has(roomId)).toBe(true);
      expect(cleanupRan).toBe(false);
    });

    it("protects newly created room with same ID against stale callback of replaced room", () => {
      const roomId = "test-reused-room-id";
      const oldEntry = getOrCreateRoom(roomId);
      const oldScheduledGen = ++oldEntry.generation;

      let oldCallbackDeleted = false;
      setTimeout(() => {
        const currentEntry = rooms.get(roomId);
        if (
          currentEntry &&
          currentEntry === oldEntry &&
          currentEntry.generation === oldScheduledGen &&
          currentEntry.roomCtx._connectionsMap.size === 0
        ) {
          rooms.delete(roomId);
          oldCallbackDeleted = true;
        }
      }, EMPTY_ROOM_CLEANUP_DELAY_MS);

      // Emulate room replacement with brand new instance (different object reference)
      const newCtx = { _connectionsMap: new Map() };
      const newServer = new GameRoomServer(newCtx);
      const newEntry = {
        roomCtx: newCtx,
        server: newServer,
        generation: 1,
        cleanupTimer: null,
        cleanupScheduledAt: null,
      };
      rooms.set(roomId, newEntry);

      // Old callback fires
      vi.advanceTimersByTime(EMPTY_ROOM_CLEANUP_DELAY_MS + 1000);

      // New entry must NOT be deleted because currentEntry !== oldEntry
      expect(oldCallbackDeleted).toBe(false);
      expect(rooms.get(roomId)).toBe(newEntry);
    });
  });

  describe("4. Control Messages Permissions & Turn Checks", () => {
    it("rejects CHANGE_SETTINGS from non-host and accepts from host in LOBBY", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true&mode=MANIAC_VS_OPERATIVE"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      // Guest tries to change mode
      server.onMessage(
        JSON.stringify({ type: "CHANGE_SETTINGS", payload: { mode: "SECRET_SERVICE" } }),
        guestConn
      );

      const rejected = guestConn.sent
        .map((s) => JSON.parse(s))
        .find((m) => m.type === "ACTION_REJECTED");
      expect(rejected?.reason).toBe("NOT_HOST");
      expect(server.state.mode).toBe("MANIAC_VS_OPERATIVE");

      // Host changes mode
      server.onMessage(
        JSON.stringify({ type: "CHANGE_SETTINGS", payload: { mode: "SECRET_SERVICE" } }),
        hostConn
      );
      expect(server.state.mode).toBe("SECRET_SERVICE");
    });

    it("rejects moves made out-of-turn with ACTION_REJECTED", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true&mode=MANIAC_VS_OPERATIVE"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);
      expect(server.state.status).toBe("PLAYING");

      // Host has role KILLER, Guest has role DETECTIVE
      // In initial state currentTurn is KILLER.
      // Guest tries to move -> rejected.
      server.onMessage(
        JSON.stringify({ type: "MAKE_MOVE", payload: { x: 1, y: 1 } }),
        guestConn
      );

      const rejected = guestConn.sent
        .map((s) => JSON.parse(s))
        .find((m) => m.type === "ACTION_REJECTED");
      expect(rejected?.reason).toBe("NOT_YOUR_TURN");
    });
  });

  describe("5. Dual Disconnect, turnTimer Pause & TV Party Safety (Stage 1.2)", () => {
    it("DUAL-01: avoids premature forfeit when both players disconnect sequentially", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);
      expect(server.state.status).toBe("PLAYING");

      // Host disconnects first at t = 0
      server.onClose(hostConn);
      // Guest disconnects right after at t = 500ms
      vi.advanceTimersByTime(500);
      server.onClose(guestConn);

      // Fast-forward 59.5 seconds from start (which is past host's original 60s if individual)
      vi.advanceTimersByTime(60000);

      // Neither player must be forfeited prematurely; room must pause instead of declaring guest winner
      expect(server.state.status).not.toBe("EMPTY");
    });

    it("DUAL-02: annuls match without winner on dual disconnect timeout (reason: DRAW_DISCONNECT)", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);

      // Both players drop
      server.onClose(hostConn);
      server.onClose(guestConn);

      // Advance past 60s Grace Period
      vi.advanceTimersByTime(61000);

      expect(server.state.status).toBe("FINISHED");
      expect(server.state.gameState?.winner).toBeNull();
      expect((server.state.gameState as any)?.gameResult?.reason).toBe("DRAW_DISCONNECT");
    });

    it("DUAL-03: single player recovery from dual disconnect grants remaining grace period to second player", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      const hostToken = server.state.players["c_host"].authToken;
      server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);

      // Both disconnect
      server.onClose(hostConn);
      server.onClose(guestConn);

      // Advance 25s (within 60s window)
      vi.advanceTimersByTime(25000);

      // Host reconnects
      const hostResumeConn = createMockConn("conn_host_resumed");
      connections.push(hostResumeConn);
      server.onConnect(hostResumeConn, {
        request: new Request(`http://localhost:1999/party/lifecycle-test-room?clientId=c_host&authToken=${hostToken}`),
      });

      // Match is still PLAYING (not finished, not annulled)
      expect(server.state.status).toBe("PLAYING");

      // Advance 30s more (total 55s for guest - guest still within 60s)
      vi.advanceTimersByTime(30000);
      expect(server.state.status).toBe("PLAYING");

      // Advance 10s more (total 65s for guest - guest expires)
      vi.advanceTimersByTime(10000);
      // Now guest should be removed and host wins
      expect(server.state.players["c_guest"]).toBeUndefined();
      expect(server.state.status).toBe("FINISHED");
    });

    it("TIMER-01: freezes turnTimer when active turn player disconnects", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);
      // Current turn is KILLER (Host)
      server.startTurnTimer("KILLER", 30000);

      // Advance 10s (20s remaining)
      vi.advanceTimersByTime(10000);

      // Host drops
      server.onClose(hostConn);

      // Advance 40s (past original 30s timer mark)
      vi.advanceTimersByTime(40000);

      // Turn timeout must NOT have fired because it was frozen!
      const timeoutMsg = guestConn.sent
        .map((s) => JSON.parse(s))
        .find((m) => m.type === "TURN_TIMEOUT");
      expect(timeoutMsg).toBeUndefined();
    });

    it("TIMER-02: resumes turnTimer with remaining time when player reconnects", () => {
      const hostConn = createMockConn("conn_host");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_host&isHost=true"),
      });

      const guestConn = createMockConn("conn_guest");
      connections.push(guestConn);
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=c_guest&isHost=false"),
      });

      const hostToken = server.state.players["c_host"].authToken;
      server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);
      server.startTurnTimer("KILLER", 30000);

      // 10s elapse -> 20s remain
      vi.advanceTimersByTime(10000);
      server.onClose(hostConn);

      // Player is offline for 15s
      vi.advanceTimersByTime(15000);

      // Player reconnects
      const hostResumeConn = createMockConn("conn_host_resumed");
      connections.push(hostResumeConn);
      server.onConnect(hostResumeConn, {
        request: new Request(`http://localhost:1999/party/lifecycle-test-room?clientId=c_host&authToken=${hostToken}`),
      });

      // Now timer is resumed with ~20s remaining.
      // Advance 15s -> still not timed out
      vi.advanceTimersByTime(15000);
      let timeoutMsg = hostResumeConn.sent
        .map((s) => JSON.parse(s))
        .find((m) => m.type === "TURN_TIMEOUT");
      expect(timeoutMsg).toBeUndefined();

      // Advance 6s more -> now times out
      vi.advanceTimersByTime(6000);
      timeoutMsg = hostResumeConn.sent
        .map((s) => JSON.parse(s))
        .find((m) => m.type === "TURN_TIMEOUT");
      expect(timeoutMsg).toBeDefined();
    });

    it("TV-01: TV display keeps room and session alive when all mobile controllers disconnect", () => {
      // Connect TV display
      const tvConn = createMockConn("conn_tv");
      connections.push(tvConn);
      server.onConnect(tvConn, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=tv_screen&clientType=TV_DISPLAY"),
      });

      // Connect two mobile controllers
      const phone1 = createMockConn("conn_p1");
      connections.push(phone1);
      server.onConnect(phone1, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=p1&clientType=CONTROLLER&isHost=false"),
      });

      const phone2 = createMockConn("conn_p2");
      connections.push(phone2);
      server.onConnect(phone2, {
        request: new Request("http://localhost:1999/party/lifecycle-test-room?clientId=p2&clientType=CONTROLLER&isHost=false"),
      });

      expect(Object.keys(server.state.players).length).toBe(2);
      expect(Object.keys(server.state.tvDisplays).length).toBe(1);

      // Both phones disconnect
      server.onClose(phone1);
      server.onClose(phone2);

      // Advance past Grace Period
      vi.advanceTimersByTime(65000);

      // Room must NOT be EMPTY because TV display is still connected!
      expect(server.state.status).toBe("WAITING");
      expect(Object.keys(server.state.tvDisplays).length).toBe(1);
    });
  });
});
