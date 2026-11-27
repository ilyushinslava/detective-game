// src/server/lobby.ts
import { normalizeMorse } from "../utils/morse";
import type { MorseCandidate } from "../types/multiplayer";
import { buildCorsHeaders, buildPreflightResponse, resolveAllowedOrigins } from "./cors";

export type { MorseCandidate };

export interface PublicRoomMeta {
  roomCode: string;
  morseCode?: string;
  mode: string;
  hostName: string;
  status: string;
  playersCount: number;
  maxPlayers: number;
  bet?: number;
  isPrivate?: boolean;
}

// Global shared registries for in-memory and standalone fallback
const g = globalThis as any;
export const publicRoomsRegistry: Map<string, PublicRoomMeta> =
  g.__ps_publicRoomsRegistry || (g.__ps_publicRoomsRegistry = new Map());
export const morseToRoomRegistry: Map<string, string> =
  g.__ps_morseToRoomRegistry || (g.__ps_morseToRoomRegistry = new Map());
export const morseToRoomsRegistry: Map<string, Set<string>> =
  g.__ps_morseToRoomsRegistry || (g.__ps_morseToRoomsRegistry = new Map());
export const roomToMorseRegistry: Map<string, string> =
  g.__ps_roomToMorseRegistry || (g.__ps_roomToMorseRegistry = new Map());

// P0-1: Единые хелперы маскирования приватных комнат.
// Приватные комнаты не должны раскрывать roomCode и morseCode в публичных ответах.
export function maskPrivateRoomMeta(room: PublicRoomMeta): Partial<PublicRoomMeta> {
  if (!room.isPrivate) return room;
  const { roomCode: _roomCode, morseCode: _morseCode, ...rest } = room;
  return rest;
}

export function maskPrivateMorseCandidate(
  candidate: MorseCandidate
): Partial<MorseCandidate> {
  if (!candidate.isPrivate) return candidate;
  const { roomCode: _roomCode, ...rest } = candidate;
  return rest;
}

export function generateUniqueMorseCode(
  existingCodes: Set<string> | Map<string, any> = morseToRoomRegistry
): string {
  const hasCode = (c: string) =>
    existingCodes instanceof Set ? existingCodes.has(c) : existingCodes.has(c);

  const candidates: string[] = [];
  // Ровно 128 комбинаций из 7 символов (TASK: 7-значный Морзе как единый стандарт)
  for (let i = 0; i < 128; i++) {
    candidates.push(
      i.toString(2).padStart(7, "0").replace(/0/g, ".").replace(/1/g, "-")
    );
  }

  // Перемешивание кандидатов
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const c of candidates) {
    if (!hasCode(c)) {
      return c;
    }
  }

  // Расширение до 8 символов при переполнении пула
  for (let i = 0; i < 256; i++) {
    const c = i
      .toString(2)
      .padStart(8, "0")
      .replace(/0/g, ".")
      .replace(/1/g, "-");
    if (!hasCode(c)) return c;
  }
  return ".......-";
}

export function resolveRoomsByMorse(morse: string): MorseCandidate[] {
  const norm = normalizeMorse(morse);
  if (!norm) return [];

  const candidates: MorseCandidate[] = [];
  const roomSet = morseToRoomsRegistry.get(norm);

  if (roomSet && roomSet.size > 0) {
    for (const code of roomSet) {
      const meta = publicRoomsRegistry.get(code);
      if (meta && meta.status !== "FINISHED") {
        candidates.push({
          roomCode: code,
          hostName: meta.hostName || "Хост",
          mode: meta.mode || "MANIAC_VS_OPERATIVE",
          status: meta.status || "WAITING",
          playersCount: meta.playersCount || 0,
          maxPlayers: meta.maxPlayers || 2,
          isPrivate: meta.isPrivate,
        });
      }
    }
  }

  // Совместимость с morseToRoomRegistry
  if (candidates.length === 0) {
    const legacyCode = morseToRoomRegistry.get(norm);
    if (legacyCode) {
      const meta = publicRoomsRegistry.get(legacyCode);
      candidates.push({
        roomCode: legacyCode,
        hostName: meta?.hostName || "Хост",
        mode: meta?.mode || "MANIAC_VS_OPERATIVE",
        status: meta?.status || "WAITING",
        playersCount: meta?.playersCount || 0,
        maxPlayers: meta?.maxPlayers || 2,
        isPrivate: meta?.isPrivate,
      });
    }
  }

  return candidates;
}

export function resolveRoomByMorse(morse: string): string | null {
  const candidates = resolveRoomsByMorse(morse);
  return candidates.length > 0 ? candidates[0].roomCode : null;
}

export function resolveRoomByPin(pin: string): string | null {
  const clean = String(pin || "").trim();
  if (!clean) return null;
  if (publicRoomsRegistry.has(clean)) return clean;
  if (roomToMorseRegistry.has(clean)) return clean;
  return null;
}

export function unregisterRoom(roomCode: string): void {
  const morse = roomToMorseRegistry.get(roomCode);
  if (morse) {
    const set = morseToRoomsRegistry.get(morse);
    if (set) {
      set.delete(roomCode);
      if (set.size === 0) {
        morseToRoomsRegistry.delete(morse);
      }
    }
    if (morseToRoomRegistry.get(morse) === roomCode) {
      morseToRoomRegistry.delete(morse);
    }
    roomToMorseRegistry.delete(roomCode);
  }
  publicRoomsRegistry.delete(roomCode);
}

export default class LobbyServer {
  room: any;

  constructor(room: any) {
    this.room = room;
  }

  async onRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // SEC-ENV-02: cross-origin разрешён только доверенным origins (ALLOWED_ORIGINS).
    const allowedOrigins = resolveAllowedOrigins(
      ((this as any).env ?? (this.room as any)?.env ?? null) as Record<string, unknown> | null
    );
    const preflightResponse = buildPreflightResponse(req, allowedOrigins);
    if (preflightResponse) return preflightResponse;

    const corsHeaders = buildCorsHeaders(req.headers.get("origin"), allowedOrigins);

    if (action === "list" || url.pathname.endsWith("/rooms")) {
      const rooms = Array.from(publicRoomsRegistry.values()).map(maskPrivateRoomMeta);
      return new Response(JSON.stringify(rooms), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "resolve") {
      const morse = url.searchParams.get("morse");
      const pin = url.searchParams.get("pin");

      if (morse) {
        const candidates = resolveRoomsByMorse(morse);
        if (candidates.length === 1) {
          const single = candidates[0];
          const base = {
            ok: true,
            disambiguation: false,
            hostName: single.hostName,
            status: single.status,
            mode: single.mode,
            playersCount: single.playersCount,
            maxPlayers: single.maxPlayers,
          };
          // Приватная комната: подтверждаем резолв, но не раскрываем секретные коды.
          const payload = single.isPrivate
            ? { ...base, isPrivate: true }
            : { ...base, roomCode: single.roomCode, morseCode: morse };
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        } else if (candidates.length > 1) {
          return new Response(
            JSON.stringify({
              ok: true,
              disambiguation: true,
              morseCode: candidates.some((c) => c.isPrivate) ? undefined : morse,
              candidates: candidates.map(maskPrivateMorseCandidate),
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        } else {
          return new Response(
            JSON.stringify({ ok: false, error: "ROOM_NOT_FOUND" }),
            { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      if (pin) {
        const resolved = resolveRoomByPin(pin);
        if (resolved) {
          const meta = publicRoomsRegistry.get(resolved);
          const morseCode = roomToMorseRegistry.get(resolved);
          const base = {
            ok: true,
            disambiguation: false,
            hostName: meta?.hostName || "Хост",
            status: meta?.status || "WAITING",
            mode: meta?.mode || "MANIAC_VS_OPERATIVE",
            playersCount: meta?.playersCount || 0,
            maxPlayers: meta?.maxPlayers || 2,
          };
          // Приватная комната: не отражаем обратно roomCode/morseCode.
          const payload = meta?.isPrivate
            ? { ...base, isPrivate: true }
            : { ...base, roomCode: resolved, morseCode: morseCode || null };
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        } else {
          return new Response(
            JSON.stringify({ ok: false, error: "ROOM_NOT_FOUND" }),
            { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  onConnect(conn: any): void {
    // Broadcast active rooms status to newly connected lobby client
    const rooms = Array.from(publicRoomsRegistry.values()).map(maskPrivateRoomMeta);
    try {
      conn.send(JSON.stringify({ type: "LOBBY_ROOMS_UPDATE", payload: { rooms } }));
    } catch (_) {}
  }
}
