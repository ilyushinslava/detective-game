// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import GameRoomServer, {
  generateUniqueMorseCode,
  normalizeMorse,
  resolveRoomByMorse,
  resolveRoomByPin,
  unregisterRoom,
  morseToRoomRegistry,
  roomToMorseRegistry,
  publicRoomsRegistry,
} from "../index";

describe("TV Tactical Morse Resolution & Collision Invariants (TASK-NET-002)", () => {
  beforeEach(() => {
    morseToRoomRegistry.clear();
    roomToMorseRegistry.clear();
    publicRoomsRegistry.clear();
  });

  describe("Morse Code Generation & Normalization", () => {
    it("normalizes dot and dash variants and strips whitespace", () => {
      expect(normalizeMorse("• — • —")).toBe(".-.-");
      expect(normalizeMorse(".-.-")).toBe(".-.-");
      expect(normalizeMorse("•-•-")).toBe(".-.-");
      expect(normalizeMorse("— — • •")).toBe("--..");
      expect(normalizeMorse("")).toBe("");
    });

    it("generates 4 or 5 symbol codes consisting only of . and -", () => {
      const code = generateUniqueMorseCode();
      expect(code.length).toBeGreaterThanOrEqual(4);
      expect(code.length).toBeLessThanOrEqual(5);
      expect(/^[.\-]+$/.test(code)).toBe(true);
    });

    it("guarantees collision-free generation across multiple active rooms", () => {
      const generated = new Set<string>();
      // Generate 40 unique codes and verify no collisions
      for (let i = 0; i < 40; i++) {
        const code = generateUniqueMorseCode(generated);
        expect(generated.has(code)).toBe(false);
        generated.add(code);
      }
      expect(generated.size).toBe(40);
    });

    it("expands gracefully to 6 symbols without crashing when 48 combinations are exhausted", () => {
      const fullSet = new Set<string>();
      // Fill all 16 4-symbol + 32 5-symbol combinations
      for (let i = 0; i < 16; i++) {
        fullSet.add(i.toString(2).padStart(4, "0").replace(/0/g, ".").replace(/1/g, "-"));
      }
      for (let i = 0; i < 32; i++) {
        fullSet.add(i.toString(2).padStart(5, "0").replace(/0/g, ".").replace(/1/g, "-"));
      }
      expect(fullSet.size).toBe(48);

      const overflowCode = generateUniqueMorseCode(fullSet);
      expect(overflowCode.length).toBeGreaterThanOrEqual(5);
      expect(fullSet.has(overflowCode)).toBe(false);
    });
  });

  describe("GameRoomServer Morse Registration & Resolution", () => {
    it("registers and retrieves a tactical callsign for a room", () => {
      const mockRoom = { id: "parties/main/room-alpha-123" };
      const server = new GameRoomServer(mockRoom);

      const morse = server.getMorseCode();
      expect(morse).toBeDefined();
      expect(morse.length).toBeGreaterThanOrEqual(4);

      // Verify reverse lookup
      expect(resolveRoomByMorse(morse)).toBe("room-alpha-123");
      expect(resolveRoomByMorse(morse.split("").map((c) => (c === "." ? "•" : "—")).join(" "))).toBe("room-alpha-123");
    });

    it("resolves rooms via HTTP onRequest with ?action=resolve&morse=...", async () => {
      const mockRoom = { id: "parties/main/test-pin-77777" };
      const server = new GameRoomServer(mockRoom);
      const morse = server.getMorseCode();

      // Register in public registry
      publicRoomsRegistry.set("test-pin-77777", {
        roomCode: "test-pin-77777",
        morseCode: morse,
        mode: "MANIAC_VS_OPERATIVE",
        hostName: "Host TV",
        status: "WAITING",
        playersCount: 0,
        maxPlayers: 2,
      });

      // Query by morse
      const reqMorse = new Request(`http://localhost:1999/party/main?action=resolve&morse=${morse}`);
      const resMorse = await server.onRequest(reqMorse);
      expect(resMorse.status).toBe(200);
      const dataMorse = await resMorse.json();
      expect(dataMorse.ok).toBe(true);
      expect(dataMorse.roomCode).toBe("test-pin-77777");

      // Query by PIN
      const reqPin = new Request(`http://localhost:1999/party/main?action=resolve&pin=test-pin-77777`);
      const resPin = await server.onRequest(reqPin);
      expect(resPin.status).toBe(200);
      const dataPin = await resPin.json();
      expect(dataPin.ok).toBe(true);
      expect(dataPin.roomCode).toBe("test-pin-77777");
    });

    it("returns 404 ROOM_NOT_FOUND when resolution fails", async () => {
      const mockRoom = { id: "parties/main/empty-room" };
      const server = new GameRoomServer(mockRoom);

      const req = new Request("http://localhost:1999/party/main?action=resolve&morse=.....-");
      const res = await server.onRequest(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBe("ROOM_NOT_FOUND");
    });

    it("unregisters morse and public room entry upon unregisterRoom", () => {
      const mockRoom = { id: "parties/main/room-to-delete" };
      const server = new GameRoomServer(mockRoom);
      const morse = server.getMorseCode();

      expect(resolveRoomByMorse(morse)).toBe("room-to-delete");

      unregisterRoom("room-to-delete");

      expect(resolveRoomByMorse(morse)).toBeNull();
      expect(resolveRoomByPin("room-to-delete")).toBeNull();
    });
  });
});
