// @vitest-environment node
// SEC-ENV-02: allowlist CORS для PartyKit-сервера (list / resolve / verify_morse).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import GameRoomServer, {
  publicRoomsRegistry,
  roomToMorseRegistry,
  morseToRoomRegistry,
  morseToRoomsRegistry,
} from "../index";
import LobbyServer from "../lobby";
import {
  DEFAULT_ALLOWED_ORIGINS,
  buildCorsHeaders,
  isOriginAllowed,
  isPrivateNetworkOrigin,
  matchesOriginPattern,
  parseAllowedOrigins,
} from "../cors";

const ORIGINAL_ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS;

const ALLOWED_ORIGIN = "https://allowed.test";
const DENIED_ORIGIN = "https://evil.example";

function createMockRoom(id: string) {
  return {
    id,
    env: undefined as Record<string, unknown> | undefined,
    getConnections: () => [] as any[],
  };
}

describe("SEC-ENV-02: CORS allowlist", () => {
  beforeEach(() => {
    publicRoomsRegistry.clear();
    roomToMorseRegistry.clear();
    morseToRoomRegistry.clear();
    morseToRoomsRegistry.clear();
    // Детерминированно фиксируем allowlist независимо от окружения запуска.
    process.env.ALLOWED_ORIGINS = `${ALLOWED_ORIGIN}, http://localhost:5173`;
  });

  afterEach(() => {
    if (ORIGINAL_ALLOWED_ORIGINS === undefined) {
      delete process.env.ALLOWED_ORIGINS;
    } else {
      process.env.ALLOWED_ORIGINS = ORIGINAL_ALLOWED_ORIGINS;
    }
  });

  describe("утилиты политики", () => {
    it("parseAllowedOrigins возвращает безопасный дефолт для пустой строки", () => {
      expect(parseAllowedOrigins(undefined)).toEqual([...DEFAULT_ALLOWED_ORIGINS]);
      expect(parseAllowedOrigins("")).toEqual([...DEFAULT_ALLOWED_ORIGINS]);
      expect(parseAllowedOrigins(" , , ")).toEqual([...DEFAULT_ALLOWED_ORIGINS]);
    });

    it("parseAllowedOrigins разбирает env-строку через запятую и чистит значения", () => {
      expect(parseAllowedOrigins(" https://a.test/ , https://b.test ")).toEqual([
        "https://a.test",
        "https://b.test",
      ]);
    });

    it("дефолт содержит локальную разработку, прод и Capacitor", () => {
      expect(DEFAULT_ALLOWED_ORIGINS).toEqual(
        expect.arrayContaining([
          "http://localhost:5173",
          "http://localhost:4173",
          "http://127.0.0.1:5173",
          "http://127.0.0.1:4173",
          "https://ilyushinslava.github.io",
          "capacitor://localhost",
        ])
      );
    });

    it("поддерживает wildcard-шаблоны origins", () => {
      expect(matchesOriginPattern("https://a.example.com", "https://*.example.com")).toBe(true);
      expect(matchesOriginPattern("https://example.com", "https://*.example.com")).toBe(false);
      expect(matchesOriginPattern("https://a.test/", "https://a.test")).toBe(true);
    });

    it("разрешает локальные/LAN origins для dev TV Party", () => {
      expect(isPrivateNetworkOrigin("http://192.168.1.50:5173")).toBe(true);
      expect(isPrivateNetworkOrigin("http://10.0.0.5:1999")).toBe(true);
      expect(isPrivateNetworkOrigin("http://172.20.0.3:4173")).toBe(true);
      expect(isPrivateNetworkOrigin("http://localhost:1999")).toBe(true);
      expect(isPrivateNetworkOrigin("http://172.15.0.3:4173")).toBe(false);
      expect(isPrivateNetworkOrigin("https://evil.example")).toBe(false);
    });

    it("buildCorsHeaders не добавляет заголовки без Origin и для чужого Origin", () => {
      expect(buildCorsHeaders(null, [ALLOWED_ORIGIN])).toEqual({});
      expect(buildCorsHeaders(DENIED_ORIGIN, [ALLOWED_ORIGIN])).toEqual({});
    });

    it("buildCorsHeaders возвращает preflight-заголовки для разрешённого Origin", () => {
      const headers = buildCorsHeaders(ALLOWED_ORIGIN, [ALLOWED_ORIGIN], { preflight: true });
      expect(headers["Access-Control-Allow-Origin"]).toBe(ALLOWED_ORIGIN);
      expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
      expect(headers["Access-Control-Allow-Headers"]).toContain("Content-Type");
      expect(headers["Access-Control-Max-Age"]).toBeDefined();
      expect(headers.Vary).toContain("Origin");
    });

    it("isOriginAllowed не разрешает пустой и неизвестный Origin", () => {
      expect(isOriginAllowed(null, [ALLOWED_ORIGIN])).toBe(false);
      expect(isOriginAllowed(DENIED_ORIGIN, [ALLOWED_ORIGIN])).toBe(false);
      expect(isOriginAllowed(ALLOWED_ORIGIN, [ALLOWED_ORIGIN])).toBe(true);
    });
  });

  describe("GameRoomServer.onRequest", () => {
    it("разрешённый Origin получает Access-Control-Allow-Origin (эндпоинт list)", async () => {
      const server = new GameRoomServer(createMockRoom("parties/main/cors-list"));
      const res = await server.onRequest(
        new Request("http://localhost:1999/party/main?action=list", {
          headers: { Origin: ALLOWED_ORIGIN },
        })
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("vary")).toContain("Origin");
      await expect(res.json()).resolves.toEqual([]);
    });

    it("неразрешённый Origin НЕ получает CORS-заголовки, ответ не ломается", async () => {
      const server = new GameRoomServer(createMockRoom("parties/main/cors-deny"));
      const res = await server.onRequest(
        new Request("http://localhost:1999/party/main?action=list", {
          headers: { Origin: DENIED_ORIGIN },
        })
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
      await expect(res.json()).resolves.toEqual([]);
    });

    it("запрос без Origin (same-origin/curl) не блокируется и не получает ACAO", async () => {
      const server = new GameRoomServer(createMockRoom("parties/main/cors-same-origin"));
      const res = await server.onRequest(
        new Request("http://localhost:1999/party/main?action=list")
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
      await expect(res.json()).resolves.toEqual([]);
    });

    it("preflight OPTIONS для разрешённого Origin отвечает 204 с методами и заголовками", async () => {
      const server = new GameRoomServer(createMockRoom("parties/main/cors-preflight-ok"));
      const res = await server.onRequest(
        new Request("http://localhost:1999/party/main?action=list", {
          method: "OPTIONS",
          headers: {
            Origin: ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "GET",
          },
        })
      );

      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("access-control-allow-methods")).toContain("GET");
      expect(res.headers.get("access-control-allow-methods")).toContain("POST");
      expect(res.headers.get("access-control-allow-methods")).toContain("OPTIONS");
      expect(res.headers.get("access-control-allow-headers")).toContain("Content-Type");
      expect(res.headers.get("access-control-max-age")).not.toBeNull();
    });

    it("preflight OPTIONS для чужого Origin отвечает 403 без ACAO", async () => {
      const server = new GameRoomServer(createMockRoom("parties/main/cors-preflight-deny"));
      const res = await server.onRequest(
        new Request("http://localhost:1999/party/main?action=list", {
          method: "OPTIONS",
          headers: { Origin: DENIED_ORIGIN },
        })
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("не ломает формат ответа resolve для разрешённого Origin", async () => {
      const server = new GameRoomServer(createMockRoom("parties/main/cors-resolve"));
      const res = await server.onRequest(
        new Request("http://localhost:1999/party/main?action=resolve&morse=...", {
          headers: { Origin: ALLOWED_ORIGIN },
        })
      );

      expect(res.status).toBe(404);
      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      await expect(res.json()).resolves.toMatchObject({ ok: false, error: "ROOM_NOT_FOUND" });
    });
  });

  describe("LobbyServer.onRequest", () => {
    it("разрешённый Origin получает ACAO, чужой — нет", async () => {
      const lobby = new LobbyServer(createMockRoom("parties/lobby/cors"));

      const allowedRes = await lobby.onRequest(
        new Request("http://localhost:1999/parties/lobby?action=list", {
          headers: { Origin: ALLOWED_ORIGIN },
        })
      );
      expect(allowedRes.status).toBe(200);
      expect(allowedRes.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);

      const deniedRes = await lobby.onRequest(
        new Request("http://localhost:1999/parties/lobby?action=list", {
          headers: { Origin: DENIED_ORIGIN },
        })
      );
      expect(deniedRes.status).toBe(200);
      expect(deniedRes.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("preflight OPTIONS лобби не содержит wildcard", async () => {
      const lobby = new LobbyServer(createMockRoom("parties/lobby/cors-preflight"));
      const res = await lobby.onRequest(
        new Request("http://localhost:1999/parties/lobby?action=list", {
          method: "OPTIONS",
          headers: { Origin: ALLOWED_ORIGIN },
        })
      );

      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("access-control-allow-origin")).not.toBe("*");
    });
  });
});
