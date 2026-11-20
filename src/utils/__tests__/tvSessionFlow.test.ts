import { describe, it, expect, beforeEach } from "vitest";
import { createInitialState, isOppositeShift, getAdjacentCharacters } from "../gameLogic";
import { gameReducer } from "../gameReducer";
import type { GameState, LastShift } from "../../types/game";
import GameRoomServer from "../../server/index";

describe("TV Session Flow E2E Suite", () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState("SECRET_SERVICE", "ONLINE", "KILLER");
  });

  describe("Scenario 1: Line shift & mirroring on TV", () => {
    it("shifts row cyclically and updates lastShift in GameState", () => {
      const originalRow1Ids = state.board[1].map((c) => c.id);

      const shiftAction = {
        type: "SHIFT_BOARD" as const,
        payload: {
          shiftType: "ROW" as const,
          index: 1,
          direction: "FORWARD" as const,
        },
      };

      const nextState = gameReducer(state, shiftAction);

      // Row 1 shifted forward (last element wrapped to index 0)
      const expectedRow1Ids = [
        originalRow1Ids[originalRow1Ids.length - 1],
        ...originalRow1Ids.slice(0, originalRow1Ids.length - 1),
      ];

      expect(nextState.board[1].map((c) => c.id)).toEqual(expectedRow1Ids);
      expect(nextState.lastShift).toEqual({
        type: "ROW",
        index: 1,
        direction: "FORWARD",
      });
      // In SECRET_SERVICE, shift advances activeSpyIndex (0 -> 1)
      expect(nextState.activeSpyIndex).toBe(1);
    });

    it("correctly identifies opposite shift as Anti-Undo", () => {
      const shift1: LastShift = {
        type: "ROW",
        index: 1,
        direction: "FORWARD",
      };

      expect(isOppositeShift(shift1, "ROW", 1, "BACKWARD")).toBe(true);
      expect(isOppositeShift(shift1, "ROW", 2, "BACKWARD")).toBe(false);
      expect(isOppositeShift(shift1, "COL", 1, "BACKWARD")).toBe(false);
    });
  });

  describe("Scenario 2: Action execution and turn transition", () => {
    it("advances activeSpyIndex on action with remote synchronization", () => {
      expect(state.activeSpyIndex).toBe(0);

      const endTurnAction = {
        type: "END_TURN" as any,
        senderId: "remote",
        nextSpyIndex: 1,
      };

      const nextState = gameReducer(state, endTurnAction);
      expect(nextState.activeSpyIndex).toBe(1);
    });

    it("updates spy trophies and switches activeSpyIndex on CAPTURE_SPY", () => {
      expect(state.activeSpyIndex).toBe(0);
      const targetSpy = state.spies![1];

      const captureAction = {
        type: "CAPTURE_SPY" as const,
        payload: {
          targetId: targetSpy.secretId,
          targetCardId: targetSpy.secretId,
          isHit: true,
          attackerSpyIndex: 0,
          nextSpyIndex: 1,
        },
      };

      const nextState = gameReducer(state, captureAction);
      expect(nextState.spies![0].trophies).toBe(1);
      expect(nextState.activeSpyIndex).toBe(1);
    });
  });

  describe("Scenario 3: Pass-and-Play privacy and neighbor resolution", () => {
    it("correctly computes physical neighbors for active agent in TV controller", () => {
      const activeSpySecretId = state.spies![0].secretId;
      const neighbors = getAdjacentCharacters(state.board, activeSpySecretId);
      expect(neighbors.length).toBeGreaterThanOrEqual(3);
      expect(neighbors.length).toBeLessThanOrEqual(8);
      // Secret agent cannot be their own neighbor
      expect(neighbors.some((c) => c.id === activeSpySecretId)).toBe(false);
    });

    it("verifies next player resolution for device handover in pass-and-play", () => {
      const currentSpyIndex = state.activeSpyIndex ?? 0;
      const nextSpyIndex = (currentSpyIndex + 1) % (state.spies?.length || 1);
      const nextAgentName = state.spies![nextSpyIndex].name;

      expect(nextAgentName).toBeTruthy();
      expect(nextSpyIndex).not.toBe(currentSpyIndex);
    });
  });

  describe("Scenario 4: PartyKit Server TV_DISPLAY & LINE_PREVIEW network invariants", () => {
    it("registers TV_DISPLAY client in tvDisplays and masks secretId in sync state", () => {
      const tvMessages: string[] = [];
      const mockTvConn = {
        id: "conn-tv-1",
        send: (msg: string) => tvMessages.push(msg),
        close: () => {},
      };

      const connections = [mockTvConn];
      const mockRoom = {
        id: "tv-room-42",
        getConnections: () => connections,
      };

      const server = new GameRoomServer(mockRoom);

      server.onConnect(mockTvConn, {
        request: new Request("http://localhost/party/tv-room-42?clientId=tv-client-1&clientType=TV_DISPLAY"),
      });

      expect(server.state.tvDisplays["tv-client-1"]).toBeDefined();
      expect(server.state.tvDisplays["tv-client-1"].connectionId).toBe("conn-tv-1");
      expect(server.state.players["tv-client-1"]).toBeUndefined();

      const statusMsg = tvMessages.find((m) => JSON.parse(m).type === "ROOM_STATUS");
      expect(statusMsg).toBeDefined();
      expect(JSON.parse(statusMsg!).hasTvDisplay).toBe(true);

      server.state.gameState = createInitialState("SECRET_SERVICE", "ONLINE", "KILLER");
      server.state.status = "PLAYING";

      tvMessages.length = 0;
      server.broadcastState();

      const syncMsg = tvMessages.find((m) => JSON.parse(m).type === "SYNC_STATE");
      expect(syncMsg).toBeDefined();
      const parsed = JSON.parse(syncMsg!);
      expect(parsed.role).toBe("SPECTATOR");

      expect(parsed.state.killerSecretId).toBeNull();
      expect(parsed.state.detectiveSecretId).toBeNull();
      if (parsed.state.spies) {
        for (const spy of parsed.state.spies) {
          expect(spy.secretId).toBeNull();
        }
      }
      server.close();
    });

    it("TV_DISPLAY receives unmasked killerId and killerSecretId when winner is not null (match finished)", () => {
      const tvMessages: string[] = [];
      const mockTvConn = {
        id: "conn-tv-win",
        send: (msg: string) => tvMessages.push(msg),
        close: () => {},
      };
      const mockRoom = {
        id: "room-tv-win",
        getConnections: () => [mockTvConn],
      };
      const server = new GameRoomServer(mockRoom);
      server.onConnect(mockTvConn, {
        request: new Request("http://localhost/party/room-tv-win?clientId=tv-client-win&clientType=TV_DISPLAY"),
      });

      const initialGameState = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
      const realKillerId = initialGameState.killerSecretId;
      expect(realKillerId).toBeTruthy();

      server.state.gameState = initialGameState;
      server.state.status = "PLAYING";

      // 1. Во время матча killerSecretId замаскирован
      tvMessages.length = 0;
      server.broadcastState();
      let syncMsg = tvMessages.find((m) => JSON.parse(m).type === "SYNC_STATE");
      expect(JSON.parse(syncMsg!).state.killerSecretId).toBeNull();

      // 2. После завершения партии (winner !== null) TV получает реальный killerId и killerSecretId
      server.state.gameState.winner = "KILLER";
      server.state.status = "FINISHED";
      tvMessages.length = 0;
      server.broadcastState();

      syncMsg = tvMessages.find((m) => JSON.parse(m).type === "SYNC_STATE");
      expect(syncMsg).toBeDefined();
      const parsedFinished = JSON.parse(syncMsg!);
      expect(parsedFinished.state.killerSecretId).toBe(realKillerId);
      expect(parsedFinished.state.killerId).toBe(realKillerId);
      expect(parsedFinished.state.criminalId).toBe(realKillerId);
      server.close();
    });

    it("broadcasts LINE_PREVIEW without modifying gameState or invoking reducer", () => {
      const broadcastMessages: string[] = [];
      const mockTvConn = {
        id: "conn-tv-1",
        send: (msg: string) => broadcastMessages.push(msg),
        close: () => {},
      };
      const mockPlayerConn = {
        id: "conn-p1",
        send: (msg: string) => broadcastMessages.push(msg),
        close: () => {},
      };

      const mockRoom = {
        id: "tv-room-42",
        getConnections: () => [mockTvConn, mockPlayerConn],
      };

      const server = new GameRoomServer(mockRoom);
      server.state.status = "PLAYING";
      const initialGameState = createInitialState("SECRET_SERVICE", "ONLINE", "KILLER");
      server.state.gameState = initialGameState;

      const previewPayload = {
        line: { type: "ROW", index: 2, direction: "FORWARD" },
      };

      server.onMessage(
        JSON.stringify({ type: "LINE_PREVIEW", payload: previewPayload }),
        mockPlayerConn
      );

      const previewMsg = broadcastMessages.find((m) => {
        try {
          const parsed = JSON.parse(m);
          return parsed.type === "LINE_PREVIEW";
        } catch {
          return false;
        }
      });

      expect(previewMsg).toBeDefined();
      expect(JSON.parse(previewMsg!).payload).toEqual(previewPayload);
      expect(server.state.gameState).toBe(initialGameState);
      server.close();
    });

    it("rejects any gameplay actions from TV_DISPLAY connections", () => {
      const mockTvConn = {
        id: "conn-tv-1",
        send: () => {},
        close: () => {},
      };

      const mockRoom = {
        id: "tv-room-42",
        getConnections: () => [mockTvConn],
      };

      const server = new GameRoomServer(mockRoom);
      server.state.status = "PLAYING";
      const initialGameState = createInitialState("SECRET_SERVICE", "ONLINE", "KILLER");
      server.state.gameState = initialGameState;

      server.state.tvDisplays["tv-client-1"] = {
        clientId: "tv-client-1",
        connectionId: "conn-tv-1",
      };

      server.onMessage(
        JSON.stringify({
          type: "SHIFT_BOARD",
          payload: { shiftType: "ROW", index: 1, direction: "FORWARD" },
        }),
        mockTvConn
      );

      expect(server.state.gameState).toBe(initialGameState);
      expect(server.state.gameState.lastShift).toBeNull();
      server.close();
    });

    it("accepts and broadcasts LINE_PREVIEW and SHIFT_BOARD from authenticated controller", () => {
      const messagesBroadcasted: string[] = [];
      const mockTvConn = {
        id: "conn-tv-1",
        send: (msg: string) => messagesBroadcasted.push(msg),
        close: () => {},
      };
      const mockControllerConn = {
        id: "conn-ctrl-1",
        send: (msg: string) => {},
        close: () => {},
      };

      const mockRoom = {
        id: "tv-room-42",
        getConnections: () => [mockTvConn, mockControllerConn],
      };

      const server = new GameRoomServer(mockRoom);
      server.state.status = "PLAYING";
      const initialGameState = createInitialState("SECRET_SERVICE", "ONLINE", "KILLER");
      server.state.gameState = initialGameState;

      server.state.tvDisplays["tv-client-1"] = {
        clientId: "tv-client-1",
        connectionId: "conn-tv-1",
      };

      // Register controller player as active player 0 (Host / Killer)
      server.state.players["ctrl-p1"] = {
        clientId: "ctrl-p1",
        connectionId: "conn-ctrl-1",
        nickname: "Agent Controller",
        role: "KILLER",
        isHost: true,
        authToken: "auth-ctrl-1",
      };

      // Controller previews line 2
      server.onMessage(
        JSON.stringify({
          type: "LINE_PREVIEW",
          payload: { line: { type: "ROW", index: 2, direction: "FORWARD" } },
          senderClientId: "ctrl-p1",
        }),
        mockControllerConn
      );

      // Verify LINE_PREVIEW is broadcasted
      const previewMsg = messagesBroadcasted.find((m) => m.includes("LINE_PREVIEW"));
      expect(previewMsg).toBeDefined();

      // Controller executes SHIFT_BOARD
      server.onMessage(
        JSON.stringify({
          type: "SHIFT_BOARD",
          payload: { shiftType: "ROW", index: 2, direction: "FORWARD" },
          senderClientId: "ctrl-p1",
        }),
        mockControllerConn
      );

      // State is updated on server
      expect(server.state.gameState.lastShift).toEqual({
        type: "ROW",
        index: 2,
        direction: "FORWARD",
      });

      server.close();
    });
  });
});
