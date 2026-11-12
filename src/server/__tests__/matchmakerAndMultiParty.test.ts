// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import MatchmakerServer, { SLA_BOT_TIMEOUT_MS } from "../matchmaker";
import LobbyServer, {
  publicRoomsRegistry,
  roomToMorseRegistry,
  morseToRoomRegistry,
  morseToRoomsRegistry,
} from "../lobby";

describe("PartyKit Multi-Party Topology & Matchmaker (Sprint 1 & 2)", () => {
  beforeEach(() => {
    publicRoomsRegistry.clear();
    roomToMorseRegistry.clear();
    morseToRoomRegistry.clear();
    morseToRoomsRegistry.clear();
    vi.useRealTimers();
  });

  describe("MatchmakerServer Queue & Pairing Logic", () => {
    it("handles JOIN_QUEUE, registers ticket and issues QUEUE_TICKET event", () => {
      const matchmaker = new MatchmakerServer({ id: "matchmaker-default" });
      const sentMessages: string[] = [];
      const mockConn = {
        id: "conn_p1",
        send: (data: string) => sentMessages.push(data),
      };

      matchmaker.onConnect(mockConn);
      matchmaker.onMessage(
        JSON.stringify({
          type: "JOIN_QUEUE",
          payload: {
            clientId: "client_p1",
            nickname: "Детектив Холмс",
            rank: "СТАЖЁР",
            mode: "MANIAC_VS_OPERATIVE",
          },
        }),
        mockConn
      );

      expect(matchmaker.getQueue().length).toBe(1);
      const ticket = matchmaker.getQueue()[0];
      expect(ticket.nickname).toBe("Детектив Холмс");
      expect(ticket.mmr).toBe(1000);
      expect(ticket.mode).toBe("MANIAC_VS_OPERATIVE");

      expect(sentMessages.length).toBeGreaterThanOrEqual(1);
      const firstMsg = JSON.parse(sentMessages[0]);
      expect(firstMsg.type).toBe("QUEUE_TICKET");
      expect(firstMsg.payload.ticketId).toBeDefined();
    });

    it("handles LEAVE_QUEUE and removes ticket from queue", () => {
      const matchmaker = new MatchmakerServer({ id: "matchmaker-default" });
      const sentMessages: string[] = [];
      const mockConn = {
        id: "conn_p1",
        send: (data: string) => sentMessages.push(data),
      };

      matchmaker.onConnect(mockConn);
      matchmaker.onMessage(
        JSON.stringify({
          type: "JOIN_QUEUE",
          payload: {
            clientId: "client_p1",
            nickname: "Агент 007",
            rank: "КОМИССАР",
            mode: "MANIAC_VS_OPERATIVE",
          },
        }),
        mockConn
      );

      expect(matchmaker.getQueue().length).toBe(1);

      matchmaker.onMessage(
        JSON.stringify({
          type: "LEAVE_QUEUE",
          payload: {},
        }),
        mockConn
      );

      expect(matchmaker.getQueue().length).toBe(0);
      const leaveMsg = sentMessages.find((m) => JSON.parse(m).type === "QUEUE_LEFT");
      expect(leaveMsg).toBeDefined();
    });

    it("automatically cleans up tickets when connection disconnects (onClose)", () => {
      const matchmaker = new MatchmakerServer({ id: "matchmaker-default" });
      const mockConn = {
        id: "conn_disconnect_test",
        send: () => {},
      };

      matchmaker.onConnect(mockConn);
      matchmaker.onMessage(
        JSON.stringify({
          type: "JOIN_QUEUE",
          payload: {
            clientId: "client_ghost",
            nickname: "Призрак",
            rank: "СТАЖЁР",
            mode: "MANIAC_VS_OPERATIVE",
          },
        }),
        mockConn
      );

      expect(matchmaker.getQueue().length).toBe(1);

      matchmaker.onClose(mockConn);
      expect(matchmaker.getQueue().length).toBe(0);
    });

    it("matches two human players with compatible MMR in the same mode immediately", () => {
      const matchmaker = new MatchmakerServer({ id: "matchmaker-default" });
      const p1Messages: string[] = [];
      const p2Messages: string[] = [];

      const conn1 = {
        id: "conn_p1",
        send: (data: string) => p1Messages.push(data),
      };
      const conn2 = {
        id: "conn_p2",
        send: (data: string) => p2Messages.push(data),
      };

      matchmaker.onConnect(conn1);
      matchmaker.onConnect(conn2);

      // Player 1 joins queue
      matchmaker.onMessage(
        JSON.stringify({
          type: "JOIN_QUEUE",
          payload: {
            clientId: "p1",
            nickname: "Игрок 1",
            rank: "СТАЖЁР",
            mmr: 1000,
            mode: "MANIAC_VS_OPERATIVE",
          },
        }),
        conn1
      );

      expect(matchmaker.getQueue().length).toBe(1);

      // Player 2 joins queue in the same mode with same rank
      matchmaker.onMessage(
        JSON.stringify({
          type: "JOIN_QUEUE",
          payload: {
            clientId: "p2",
            nickname: "Игрок 2",
            rank: "СТАЖЁР",
            mmr: 1050,
            mode: "MANIAC_VS_OPERATIVE",
          },
        }),
        conn2
      );

      // Both should be matched and removed from queue
      expect(matchmaker.getQueue().length).toBe(0);

      const p1Match = p1Messages.map((m) => JSON.parse(m)).find((m) => m.type === "MATCH_FOUND");
      const p2Match = p2Messages.map((m) => JSON.parse(m)).find((m) => m.type === "MATCH_FOUND");

      expect(p1Match).toBeDefined();
      expect(p2Match).toBeDefined();

      expect(p1Match.payload.roomCode).toBe(p2Match.payload.roomCode);
      expect(p1Match.payload.isAiMatch).toBe(false);
      expect(p2Match.payload.isAiMatch).toBe(false);
      expect(p1Match.payload.role).not.toBe(p2Match.payload.role);
      expect(p1Match.payload.opponentName).toBe("Игрок 2");
      expect(p2Match.payload.opponentName).toBe("Игрок 1");
    });

    it("does not match players in different game modes", () => {
      const matchmaker = new MatchmakerServer({ id: "matchmaker-default" });
      const conn1 = { id: "c1", send: () => {} };
      const conn2 = { id: "c2", send: () => {} };

      matchmaker.onConnect(conn1);
      matchmaker.onConnect(conn2);

      matchmaker.onMessage(
        JSON.stringify({
          type: "JOIN_QUEUE",
          payload: { clientId: "p1", nickname: "P1", mode: "MANIAC_VS_OPERATIVE" },
        }),
        conn1
      );
      matchmaker.onMessage(
        JSON.stringify({
          type: "JOIN_QUEUE",
          payload: { clientId: "p2", nickname: "P2", mode: "THIEF_HUNT" },
        }),
        conn2
      );

      expect(matchmaker.getQueue().length).toBe(2);
    });

    it("triggers SLA Fallback to AI bot match after 25 seconds of waiting", () => {
      const matchmaker = new MatchmakerServer({ id: "matchmaker-default" });
      const messages: string[] = [];
      const conn = {
        id: "conn_alone",
        send: (data: string) => messages.push(data),
      };

      matchmaker.onConnect(conn);
      matchmaker.onMessage(
        JSON.stringify({
          type: "JOIN_QUEUE",
          payload: {
            clientId: "p_alone",
            nickname: "Одинокий Волк",
            rank: "КОМИССАР",
            mode: "MANIAC_VS_OPERATIVE",
          },
        }),
        conn
      );

      expect(matchmaker.getQueue().length).toBe(1);

      // Artificially simulate 26 seconds of wait time on the ticket
      const ticket = matchmaker.getQueue()[0];
      ticket.createdAt = Date.now() - (SLA_BOT_TIMEOUT_MS + 1000);

      // Trigger queue process
      matchmaker.processQueue();

      expect(matchmaker.getQueue().length).toBe(0);

      const matchFound = messages.map((m) => JSON.parse(m)).find((m) => m.type === "MATCH_FOUND");
      expect(matchFound).toBeDefined();
      expect(matchFound.payload.isAiMatch).toBe(true);
      expect(matchFound.payload.opponentName).toMatch(/Агент «.*»/);
      expect(matchFound.payload.opponentRank).toBe("КОМИССАР");
      expect(matchFound.payload.roomCode).toMatch(/^ai_/);
    });
  });

  describe("LobbyServer Discovery & Room Registry", () => {
    it("returns public rooms list on HTTP onRequest with action=list", async () => {
      const lobby = new LobbyServer({ id: "lobby-global" });

      publicRoomsRegistry.set("room_test_1", {
        roomCode: "room_test_1",
        mode: "MANIAC_VS_OPERATIVE",
        hostName: "Шериф",
        status: "WAITING",
        playersCount: 1,
        maxPlayers: 2,
        bet: 500,
      });

      const req = new Request("http://localhost:1999/parties/lobby?action=list");
      const res = await lobby.onRequest(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
      expect(data[0].roomCode).toBe("room_test_1");
      expect(data[0].hostName).toBe("Шериф");
    });

    it("resolves rooms by PIN on HTTP onRequest with action=resolve&pin=...", async () => {
      const lobby = new LobbyServer({ id: "lobby-global" });

      publicRoomsRegistry.set("55443", {
        roomCode: "55443",
        mode: "SECRET_SERVICE",
        hostName: "Резидент",
        status: "WAITING",
        playersCount: 1,
        maxPlayers: 4,
      });

      const req = new Request("http://localhost:1999/parties/lobby?action=resolve&pin=55443");
      const res = await lobby.onRequest(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.roomCode).toBe("55443");
      expect(data.hostName).toBe("Резидент");
      expect(data.mode).toBe("SECRET_SERVICE");
    });

    it("sends active rooms update to newly connected WebSocket clients", () => {
      const lobby = new LobbyServer({ id: "lobby-global" });
      const sent: string[] = [];
      const conn = {
        id: "lobby_client_1",
        send: (data: string) => sent.push(data),
      };

      publicRoomsRegistry.set("active_1", {
        roomCode: "active_1",
        mode: "THIEF_HUNT",
        hostName: "Инспектор",
        status: "WAITING",
        playersCount: 1,
        maxPlayers: 2,
      });

      lobby.onConnect(conn);

      expect(sent.length).toBe(1);
      const msg = JSON.parse(sent[0]);
      expect(msg.type).toBe("LOBBY_ROOMS_UPDATE");
      expect(msg.payload.rooms.length).toBe(1);
      expect(msg.payload.rooms[0].roomCode).toBe("active_1");
    });
  });
});
