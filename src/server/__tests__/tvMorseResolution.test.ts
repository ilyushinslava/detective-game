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

    it("generates strictly 7 symbol codes consisting only of . and -", () => {
      const code = generateUniqueMorseCode();
      expect(code.length).toBe(7);
      expect(/^[.\-]+$/.test(code)).toBe(true);
    });

    it("guarantees collision-free generation across multiple active rooms", () => {
      const generated = new Set<string>();
      // Generate 50 unique codes and verify no collisions
      for (let i = 0; i < 50; i++) {
        const code = generateUniqueMorseCode(generated);
        expect(code.length).toBe(7);
        expect(generated.has(code)).toBe(false);
        generated.add(code);
      }
      expect(generated.size).toBe(50);
    });

    it("expands gracefully to 8 symbols without crashing when 128 combinations are exhausted", () => {
      const fullSet = new Set<string>();
      // Fill all 128 7-symbol combinations
      for (let i = 0; i < 128; i++) {
        fullSet.add(i.toString(2).padStart(7, "0").replace(/0/g, ".").replace(/1/g, "-"));
      }
      expect(fullSet.size).toBe(128);

      const overflowCode = generateUniqueMorseCode(fullSet);
      expect(overflowCode.length).toBe(8);
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
      expect(dataMorse.disambiguation).toBe(false);
      expect(dataMorse.roomCode).toBe("test-pin-77777");

      // Query by PIN / roomCode
      const reqPin = new Request(`http://localhost:1999/party/main?action=resolve&pin=test-pin-77777`);
      const resPin = await server.onRequest(reqPin);
      expect(resPin.status).toBe(200);
      const dataPin = await resPin.json();
      expect(dataPin.ok).toBe(true);
      expect(dataPin.roomCode).toBe("test-pin-77777");
    });

    it("handles Morse collision by returning disambiguation: true with multiple host candidates", async () => {
      const sharedMorse = "...-";
      const server = new GameRoomServer({ id: "parties/main/room-A" });

      // Room A
      morseToRoomRegistry.set(sharedMorse, "room-A");
      publicRoomsRegistry.set("room-A", {
        roomCode: "room-A",
        morseCode: sharedMorse,
        mode: "MANIAC_VS_OPERATIVE",
        hostName: "Детектив Алекс",
        status: "WAITING",
        playersCount: 1,
        maxPlayers: 2,
      });

      // Room B shares the same Morse code
      publicRoomsRegistry.set("room-B", {
        roomCode: "room-B",
        morseCode: sharedMorse,
        mode: "THIEF_HUNT",
        hostName: "Инспектор Виктор",
        status: "WAITING",
        playersCount: 1,
        maxPlayers: 2,
      });

      const { morseToRoomsRegistry } = await import("../index");
      morseToRoomsRegistry.set(sharedMorse, new Set(["room-A", "room-B"]));

      const req = new Request(`http://localhost:1999/party/main?action=resolve&morse=${sharedMorse}`);
      const res = await server.onRequest(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.disambiguation).toBe(true);
      expect(Array.isArray(data.candidates)).toBe(true);
      expect(data.candidates.length).toBe(2);
      expect(data.candidates.map((c: any) => c.hostName)).toEqual(
        expect.arrayContaining(["Детектив Алекс", "Инспектор Виктор"])
      );
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

    it("masks/omits morseCode for private rooms in list requests (Security Audit)", async () => {
      publicRoomsRegistry.set("room-public", {
        roomCode: "room-public",
        morseCode: ".......",
        mode: "MANIAC_VS_OPERATIVE",
        hostName: "Public Host",
        status: "WAITING",
        playersCount: 1,
        maxPlayers: 2,
        isPrivate: false,
      });
      publicRoomsRegistry.set("room-secret", {
        roomCode: "room-secret",
        morseCode: ".------",
        mode: "MANIAC_VS_OPERATIVE",
        hostName: "Secret Host",
        status: "WAITING",
        playersCount: 1,
        maxPlayers: 2,
        isPrivate: true,
      });

      const mockRoom = { id: "parties/main/server-test" };
      const server = new GameRoomServer(mockRoom);

      const req = new Request("http://localhost:1999/party/main?action=list");
      const res = await server.onRequest(req);
      expect(res.status).toBe(200);
      const rooms = await res.json();

      const publicRoom = rooms.find((r: any) => r.roomCode === "room-public");
      const secretRoom = rooms.find((r: any) => r.roomCode === "room-secret");

      expect(publicRoom.morseCode).toBe(".......");
      expect(secretRoom.morseCode).toBeUndefined();
    });
  });
});
