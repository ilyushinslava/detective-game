// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { partyService } from "../partyPeer";
import { safeSessionStorage, safeLocalStorage } from "../storage";
import GameRoomServer from "../../server/index";

describe("TV Hardening Regression Tests (Bugs 1-5)", () => {
  beforeEach(() => {
    safeSessionStorage.clear();
    safeLocalStorage.clear();
  });

  afterEach(() => {
    partyService.disconnect();
    safeSessionStorage.clear();
    safeLocalStorage.clear();
  });

  describe("Bug 1: authToken preservation during same-room reconnection", () => {
    it("сохраняет authToken при повторном вызове connect() к той же комнате", () => {
      safeSessionStorage.setItem("crime_city_auth_77777", "secret-auth-token-xyz");

      // Первый коннект
      partyService.connect("77777", "Agent_1", true, "MANIAC_VS_OPERATIVE", "client_p1", "CONTROLLER");
      expect(partyService.authToken).toBe("secret-auth-token-xyz");

      // Симулируем повторный вызов connect к той же комнате (например, при смене статуса лобби)
      partyService.connect("77777", "Agent_1", true, "MANIAC_VS_OPERATIVE", "client_p1", "CONTROLLER");
      expect(partyService.authToken).toBe("secret-auth-token-xyz");
      expect(safeSessionStorage.getItem("crime_city_auth_77777")).toBe("secret-auth-token-xyz");
    });
  });

  describe("Bug 3: fetchPublicRooms uses correct /parties/lobby/main?action=list path", () => {
    it("запрашивает комнаты по валидному пути PartyKit /parties/lobby/main?action=list", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
        if (typeof url === "string" && url.includes("/parties/lobby/main?action=list")) {
          return new Response(JSON.stringify([{ roomCode: "12345", mode: "MANIAC_VS_OPERATIVE" }]), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
        return new Response("Not found", { status: 404 });
      });

      const rooms = await partyService.fetchPublicRooms();
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/parties/lobby/main?action=list"),
        expect.any(Object)
      );
      expect(rooms).toHaveLength(1);
      expect(rooms[0].roomCode).toBe("12345");

      fetchSpy.mockRestore();
    });
  });

  describe("Bug 1 & Server Invariant: GameRoomServer handles OPPONENT_LEFT without killing lobby", () => {
    it("при выходе одного из игроков в лобби ТВ-комната остаётся в статусе WAITING", () => {
      const room = {
        id: "hardening-test-room",
        broadcast: vi.fn(),
      };
      const server = new GameRoomServer(room as any);

      // 1. Подключается ТВ
      const tvReq = new Request("http://localhost:1999/party/hardening-test-room?clientId=tv_1&clientType=TV_DISPLAY");
      const tvConn = { id: "conn_tv", send: vi.fn(), close: vi.fn() };
      server.onConnect(tvConn as any, { request: tvReq });

      // 2. Подключается Хост
      const hostReq = new Request("http://localhost:1999/party/hardening-test-room?clientId=p_host&isHost=true&clientType=CONTROLLER");
      const hostConn = { id: "conn_host", send: vi.fn(), close: vi.fn() };
      server.onConnect(hostConn as any, { request: hostReq });

      // 3. Подключается Гость
      const guestReq = new Request("http://localhost:1999/party/hardening-test-room?clientId=p_guest&isHost=false&clientType=CONTROLLER");
      const guestConn = { id: "conn_guest", send: vi.fn(), close: vi.fn() };
      server.onConnect(guestConn as any, { request: guestReq });

      expect(Object.keys(server.state.players)).toHaveLength(2);

      // 4. Гость выходит из лобби (explicit leave)
      server.onMessage(
        JSON.stringify({
          type: "PLAYER_LEFT_EXPLICIT",
          clientId: "p_guest",
        }),
        guestConn as any
      );

      // Комната не закрыта, остался 1 игрок и ТВ, статус WAITING
      expect(Object.keys(server.state.players)).toHaveLength(1);
      expect(server.state.players["p_host"]).toBeDefined();
      expect(Object.keys(server.state.tvDisplays)).toHaveLength(1);
      expect(server.state.status).toBe("WAITING");
    });
  });
});
