import { createInitialState, isOppositeShift } from "../utils/gameLogic";
import { gameReducer } from "../utils/gameReducer";
import { guestRegistry } from "../utils/guestManager";
import { sanitizePlayerName } from "../utils/nameFilter";
import type { GameState, Role, GameModeType } from "../types/game";
import type { ClientDeviceType } from "../types/multiplayer";

export type { ClientDeviceType };

export interface PlayerInfo {
  clientId: string;
  nickname: string;
  isHost: boolean;
  role: Role;
  connectionId: string;
  clientType: ClientDeviceType;
  authToken?: string;
  isDisconnected?: boolean;
  isBackground?: boolean;
}

export interface ServerRoomState {
  status: "EMPTY" | "WAITING" | "READY_TO_START" | "PLAYING" | "FINISHED";
  players: Record<string, PlayerInfo>;
  tvDisplays: Record<string, { clientId: string; connectionId: string }>;
  gameState: GameState | null;
  mode: GameModeType;
  readyClients: Set<string>;
  roleDistribution?: "RANDOM" | "HOST_KILLER" | "HOST_DETECTIVE";
  isPassAndPlay?: boolean;
  isPrivate?: boolean;
  restartRequestedBy?: string | null;
  pendingRematchMode?: string | null;
}

export {
  publicRoomsRegistry,
  morseToRoomRegistry,
  morseToRoomsRegistry,
  roomToMorseRegistry,
  generateUniqueMorseCode,
  resolveRoomsByMorse,
  resolveRoomByMorse,
  resolveRoomByPin,
  unregisterRoom,
} from "./lobby";

export type { MorseCandidate, PublicRoomMeta } from "./lobby";
import {
  publicRoomsRegistry,
  roomToMorseRegistry,
  morseToRoomsRegistry,
  morseToRoomRegistry,
  generateUniqueMorseCode,
  resolveRoomsByMorse,
  resolveRoomByMorse,
  resolveRoomByPin,
  unregisterRoom,
} from "./lobby";

import { normalizeMorse } from "../utils/morse";
export { normalizeMorse };

// Мгновенная диспетчеризация без искусственных задержек (устранение defer(50ms))
const defer = (fn: () => void) => {
  try {
    fn();
  } catch (_) {}
};

export const DISCONNECT_GRACE_PERIOD_MS = 60000;

export default class GameRoomServer {
  room: any;
  state: ServerRoomState;
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private dualDisconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private dualDisconnectStartedAt: number | null = null;
  private turnTimerState: {
    role: Role | null;
    remainingMs: number;
    timer: ReturnType<typeof setTimeout> | null;
    startedAt: number;
    totalDurationMs: number;
    isPaused: boolean;
  } = {
    role: null,
    remainingMs: 0,
    timer: null,
    startedAt: 0,
    totalDurationMs: 30000,
    isPaused: false,
  };

  getMaxPlayersForMode(mode: GameModeType): number {
    if (mode === "SECRET_SERVICE") return 4;
    return 2;
  }

  startTurnTimer(role: Role, durationMs: number = 30000): void {
    if (this.turnTimerState.timer) {
      clearTimeout(this.turnTimerState.timer);
      this.turnTimerState.timer = null;
    }
    this.turnTimerState.role = role;
    this.turnTimerState.totalDurationMs = durationMs;
    this.turnTimerState.remainingMs = durationMs;
    this.turnTimerState.startedAt = Date.now();
    this.turnTimerState.isPaused = false;
    this.turnTimerState.timer = setTimeout(() => {
      this.handleTurnTimeout();
    }, durationMs);
  }

  pauseTurnTimer(): void {
    if (this.turnTimerState.timer && !this.turnTimerState.isPaused) {
      const elapsed = Date.now() - this.turnTimerState.startedAt;
      this.turnTimerState.remainingMs = Math.max(1000, this.turnTimerState.remainingMs - elapsed);
      clearTimeout(this.turnTimerState.timer);
      this.turnTimerState.timer = null;
      this.turnTimerState.isPaused = true;
      this.broadcastRaw(
        JSON.stringify({
          type: "TURN_TIMER_PAUSED",
          remainingMs: this.turnTimerState.remainingMs,
        })
      );
    }
  }

  resumeTurnTimer(): void {
    if (this.turnTimerState.isPaused && this.turnTimerState.remainingMs > 0) {
      this.turnTimerState.startedAt = Date.now();
      this.turnTimerState.isPaused = false;
      this.turnTimerState.timer = setTimeout(() => {
        this.handleTurnTimeout();
      }, this.turnTimerState.remainingMs);
      this.broadcastRaw(
        JSON.stringify({
          type: "TURN_TIMER_RESUMED",
          remainingMs: this.turnTimerState.remainingMs,
        })
      );
    }
  }

  clearTurnTimer(): void {
    if (this.turnTimerState.timer) {
      clearTimeout(this.turnTimerState.timer);
      this.turnTimerState.timer = null;
    }
    this.turnTimerState.isPaused = false;
    this.turnTimerState.remainingMs = 0;
  }

  private handleTurnTimeout(): void {
    this.turnTimerState.timer = null;
    this.turnTimerState.isPaused = false;

    if (!this.state.gameState || this.state.status !== "PLAYING" || this.state.gameState.winner) {
      this.broadcastRaw(JSON.stringify({ type: "TURN_TIMEOUT" }));
      return;
    }

    const nextState = gameReducer(this.state.gameState, { type: "TURN_TIMEOUT" });
    if (nextState !== this.state.gameState) {
      this.state.gameState = nextState;
      if (nextState.winner) {
        this.state.status = "FINISHED";
        this.broadcastStatus();
      } else {
        const nextRole = nextState.currentTurn || "DETECTIVE";
        this.startTurnTimer(nextRole, this.turnTimerState.totalDurationMs || 30000);
      }
      this.broadcastRaw(JSON.stringify({ type: "TURN_TIMEOUT" }));
      this.broadcastState();
    } else {
      this.broadcastRaw(JSON.stringify({ type: "TURN_TIMEOUT" }));
    }
  }

  private handleDualDisconnectTimeout(): void {
    this.dualDisconnectTimer = null;
    this.dualDisconnectStartedAt = null;

    if (this.state.status === "PLAYING") {
      this.state.status = "FINISHED";
      if (this.state.gameState) {
        this.state.gameState.winner = null;
        (this.state.gameState as any).gameResult = {
          winner: null,
          reason: "DRAW_DISCONNECT",
        };
      }
      this.broadcastRaw(
        JSON.stringify({
          type: "MATCH_ANNULLED",
          reason: "DRAW_DISCONNECT",
          message: "Матч аннулирован: оба игрока не вернулись в игру.",
        })
      );
      this.broadcastStatus();
      this.broadcastState();
    }
  }

  private handleIndividualGraceTimeout(clientId: string): void {
    this.disconnectTimers.delete(clientId);
    const playerWhoLeft = this.state.players[clientId];
    if (playerWhoLeft?.nickname) {
      guestRegistry.releaseByCallsign(playerWhoLeft.nickname);
    }
    delete this.state.players[clientId];
    this.state.readyClients.delete(clientId);
    if (this.state.status === "READY_TO_START" && this.state.readyClients.size < 2) {
      this.state.status = "WAITING";
    }
    this.state.restartRequestedBy = null;

    const roomCode = this.getRoomCode();
    const remainingPlayers = Object.values(this.state.players);
    const remainingPlayersCount = remainingPlayers.length;

    if (remainingPlayersCount === 0) {
      const hasTv = Object.keys(this.state.tvDisplays).length > 0;
      if (hasTv) {
        // ТВ-экран в сети! Не уничтожаем комнату, переводим в статус ожидания подключения
        this.state.status = "WAITING";
        this.broadcastStatus();
        return;
      }
      this.state.status = "EMPTY";
      this.state.gameState = null;
      unregisterRoom(roomCode);
      this.state.readyClients.clear();
    } else {
      if (playerWhoLeft?.isHost && (this.state.status === "WAITING" || this.state.status === "READY_TO_START")) {
        if (!remainingPlayers.some((p) => p.isHost)) {
          remainingPlayers[0].isHost = true;
        }
      }
      this.broadcastRaw(JSON.stringify({ type: "OPPONENT_LEFT" }));
      if (this.state.status === "PLAYING") {
        const winnerRole = playerWhoLeft?.role === "KILLER" ? "DETECTIVE" : "KILLER";
        if (this.state.gameState) {
          (this.state.gameState as any).winner = winnerRole;
          (this.state.gameState as any).gameEndReason = "OPPONENT_ABANDONED";
        }
        this.broadcastRaw(
          JSON.stringify({
            type: "MATCH_OVER",
            winner: winnerRole,
            reason: "OPPONENT_ABANDONED",
            message: "Соперник не вернулся в игру по истечении 60 секунд. Зафиксировано техническое поражение.",
          })
        );
        this.state.status = "FINISHED";
      } else {
        this.state.status = "WAITING";
        const hostPlayer =
          remainingPlayers.find((p) => p.isHost) ||
          remainingPlayers[0];
        publicRoomsRegistry.set(roomCode, {
          roomCode,
          morseCode: this.getMorseCode(),
          mode: this.state.mode,
          hostName: hostPlayer?.nickname || "Хост",
          status: "WAITING",
          playersCount: 1,
          maxPlayers: 2,
          bet: 250,
        });
      }
      this.broadcastStatus();
    }
  }

  private getRoomCode(): string {
    const raw = String(this.room?.id || "room");
    return (
      raw
        .replace(/^.*(?:\/party\/|\/parties\/[^\/]+\/)/, "")
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .pop() || "room"
    );
  }

  getMorseCode(): string {
    const roomCode = this.getRoomCode();
    let code = roomToMorseRegistry.get(roomCode);
    if (!code) {
      code = generateUniqueMorseCode(morseToRoomRegistry);
      roomToMorseRegistry.set(roomCode, code);
      morseToRoomRegistry.set(code, roomCode);
      let set = morseToRoomsRegistry.get(code);
      if (!set) {
        set = new Set<string>();
        morseToRoomsRegistry.set(code, set);
      }
      set.add(roomCode);
    }
    return code;
  }

  constructor(room: any) {
    this.room = room;
    this.state = {
      status: "EMPTY",
      players: {},
      tvDisplays: {},
      gameState: null,
      mode: "MANIAC_VS_OPERATIVE",
      readyClients: new Set(),
      isPassAndPlay: false,
    };
  }

  async onRequest(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    const url = new URL(req.url);

    if (url.searchParams.get("action") === "verify_morse") {
      const targetRoomCode = url.searchParams.get("roomCode");
      const submittedMorse = normalizeMorse(url.searchParams.get("morse") || "");
      const targetMeta = targetRoomCode ? publicRoomsRegistry.get(targetRoomCode) : null;
      const expectedMorse = targetRoomCode
        ? roomToMorseRegistry.get(targetRoomCode) || targetMeta?.morseCode
        : null;

      if (targetMeta && expectedMorse && normalizeMorse(expectedMorse) === submittedMorse) {
        return new Response(JSON.stringify({ ok: true, roomCode: targetRoomCode }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
      return new Response(JSON.stringify({ ok: false, error: "INVALID_MORSE_CODE" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Резолв комнат по короткому Морзе-позывному или цифровому PIN-коду (TASK-NET-002)
    const isResolveRequest =
      url.pathname.endsWith("/resolve") ||
      url.pathname.includes("/resolve") ||
      url.searchParams.get("action") === "resolve" ||
      url.searchParams.has("morse") ||
      url.searchParams.has("code") ||
      url.searchParams.has("pin");

    if (isResolveRequest) {
      const rawMorse = url.searchParams.get("morse") || url.searchParams.get("code") || "";
      const rawPin = url.searchParams.get("pin") || url.searchParams.get("room") || "";

      // 1. Поиск по короткому тактическому позывному Морзе (TASK-NET-002 / Коллизии онлайна)
      if (rawMorse) {
        const candidates = resolveRoomsByMorse(rawMorse);
        if (candidates.length === 1) {
          const single = candidates[0];
          return new Response(
            JSON.stringify({
              ok: true,
              disambiguation: false,
              roomCode: single.roomCode,
              morseCode: normalizeMorse(rawMorse),
              hostName: single.hostName,
              mode: single.mode,
              status: single.status,
              playersCount: single.playersCount,
              maxPlayers: single.maxPlayers,
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }

        if (candidates.length > 1) {
          return new Response(
            JSON.stringify({
              ok: true,
              disambiguation: true,
              morseCode: normalizeMorse(rawMorse),
              candidates,
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }
      }

      // 2. Поиск по прямому коду комнаты (для совместимости)
      if (rawPin) {
        const foundRoomCode = resolveRoomByPin(rawPin);
        if (foundRoomCode) {
          const roomMeta = publicRoomsRegistry.get(foundRoomCode);
          const morseCode = roomToMorseRegistry.get(foundRoomCode);
          return new Response(
            JSON.stringify({
              ok: true,
              disambiguation: false,
              roomCode: foundRoomCode,
              morseCode: morseCode || null,
              hostName: roomMeta?.hostName || "Хост",
              mode: roomMeta?.mode || "MANIAC_VS_OPERATIVE",
              status: roomMeta?.status || "WAITING",
              playersCount: roomMeta?.playersCount || 0,
              maxPlayers: roomMeta?.maxPlayers || 2,
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }
      }

      return new Response(
        JSON.stringify({
          ok: false,
          error: "ROOM_NOT_FOUND",
          message: "Комната с данным позывным или кодом не найдена.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const isRoomsListRequest =
      url.pathname.endsWith("/rooms") ||
      url.pathname.endsWith("/rooms/") ||
      url.pathname.includes("/lobby") ||
      url.searchParams.get("action") === "list";

    if (isRoomsListRequest) {
      const waitingRooms = Array.from(publicRoomsRegistry.values())
        .filter((r) => r.status === "WAITING")
        .map((room) => {
          if (room.isPrivate) {
            const { morseCode: _morseCode, ...rest } = room;
            return rest;
          }
          return room;
        });
      return new Response(JSON.stringify(waitingRooms), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    const allRooms = Array.from(publicRoomsRegistry.values()).map((room) => {
      if (room.isPrivate) {
        const { morseCode: _morseCode, ...rest } = room;
        return rest;
      }
      return room;
    });
    return new Response(JSON.stringify(allRooms), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  onConnect(conn: any, ctx: { request: Request }): void {
    try {
      const url = new URL(ctx.request?.url || "", "http://localhost");
    const clientId = url.searchParams.get("clientId") || conn.id;
    const incomingNickname = url.searchParams.get("nickname") || "Игрок";
    const isHost = url.searchParams.get("isHost") === "true";
    const isPrivate = url.searchParams.get("isPrivate") === "true";
    const mode = (url.searchParams.get("mode") as GameModeType) || "MANIAC_VS_OPERATIVE";
    const randomRoles = url.searchParams.get("randomRoles") === "true";
    const clientType = (url.searchParams.get("clientType") as ClientDeviceType) || "PLAYER";
    const roomCode = this.getRoomCode();

    // Санитизация имени через фильтр цензуры и разрешение коллизий одинаковых имен в комнате
    const busyNames = Object.values(this.state.players).map((p) => p.nickname);
    let nickname = sanitizePlayerName(incomingNickname, guestRegistry.generateCallsign(busyNames));
    if (busyNames.includes(nickname)) {
      nickname = guestRegistry.generateCallsign(busyNames);
    }

    // Режим ТВ-экрана: экран не занимает слот игрока, а подписывается на события
    if (clientType === "TV_DISPLAY") {
      const existingTvIds = Object.keys(this.state.tvDisplays);
      const isExistingTv = Boolean(this.state.tvDisplays[clientId]);

      // К комнате может подключиться только 1 ТВ-дисплей (SEC-05)
      if (existingTvIds.length >= 1 && !isExistingTv) {
        try {
          conn.send(JSON.stringify({ type: "ERROR", message: "MAX_TV_REACHED" }));
          conn.close();
        } catch (_err) {}
        console.warn(`[GameRoomServer] TV connection rejected for room ${this.getRoomCode()}: only 1 TV allowed.`);
        return;
      }

      this.state.tvDisplays[clientId] = { clientId, connectionId: conn.id };
      if (!this.state.status || this.state.status === "EMPTY") {
        this.state.status = "WAITING";
        this.state.mode = mode;
      }
      if (!this.state.gameState) {
        this.state.gameState = createInitialState(
          this.state.mode,
          "ONLINE",
          "KILLER",
          2,
          this.state.mode === "SECRET_SERVICE" ? 2 : 3,
          16
        );
      }

      publicRoomsRegistry.set(roomCode, {
        roomCode,
        morseCode: this.getMorseCode(),
        mode: this.state.mode,
        hostName: nickname || "TV_HOST",
        status: this.state.status,
        playersCount: Object.keys(this.state.players).length,
        maxPlayers: this.getMaxPlayersForMode(this.state.mode),
        bet: 250,
        isPrivate: true,
      });

      defer(() => {
        this.broadcastStatus();
        if (this.state.gameState) {
          try {
            const tvMasked = this.maskStateForTv(this.state.gameState);
            conn.send(
              JSON.stringify({
                type: "STATE_SNAPSHOT",
                role: "SPECTATOR",
                status: this.state.status,
                gameState: tvMasked,
                state: tvMasked,
              })
            );
          } catch (_) {}
          this.broadcastState();
        }
      });
      return;
    }

    const generateToken = () =>
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `auth_${Date.now()}_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;

    // Повторное подключение игрока: поиск по clientId или по authToken
    let incomingAuthToken = url.searchParams.get("authToken");

    let existingPlayerId: string | null = null;
    if (this.state.players[clientId]) {
      existingPlayerId = clientId;
    } else if (incomingAuthToken) {
      const matchByToken = Object.values(this.state.players).find(
        (p) => p.authToken === incomingAuthToken
      );
      if (matchByToken) {
        existingPlayerId = matchByToken.clientId;
      }
    }

    // RECONNECT_SLOT: Разрешение перехвата слота отключенного игрока строго в ТВ-комнатах
    const hasTvDisplay = Object.keys(this.state.tvDisplays).length > 0;
    if (!existingPlayerId && this.state.status === "PLAYING" && hasTvDisplay) {
      const disconnectedEntry = Object.entries(this.state.players).find(
        ([_, p]) => p.isDisconnected === true
      );
      if (disconnectedEntry) {
        existingPlayerId = disconnectedEntry[0];
        // Подставляем токен сессии, чтобы разрешить перенос слота на новое устройство гостя ТВ
        incomingAuthToken = this.state.players[existingPlayerId].authToken;
      }
    }

    if (existingPlayerId) {
      const existingPlayer = this.state.players[existingPlayerId];
      const expectedToken = existingPlayer.authToken;

      // Если у игрока зарегистрирован секретный токен, он обязан совпадать
      if (expectedToken && incomingAuthToken !== expectedToken) {
        try {
          conn.send(JSON.stringify({ type: "ERROR", message: "UNAUTHORIZED_SESSION" }));
          conn.close();
        } catch (_err) {}
        return;
      }

      const pendingTimer = this.disconnectTimers.get(existingPlayerId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        this.disconnectTimers.delete(existingPlayerId);
      }

      if (this.dualDisconnectTimer) {
        clearTimeout(this.dualDisconnectTimer);
        this.dualDisconnectTimer = null;
        const elapsed = this.dualDisconnectStartedAt ? Date.now() - this.dualDisconnectStartedAt : 0;
        const remainingGrace = Math.max(1000, DISCONNECT_GRACE_PERIOD_MS - elapsed);
        this.dualDisconnectStartedAt = null;

        for (const [otherId] of Object.entries(this.state.players)) {
          if (otherId !== existingPlayerId) {
            const timer = setTimeout(() => {
              this.handleIndividualGraceTimeout(otherId);
            }, remainingGrace);
            this.disconnectTimers.set(otherId, timer);
          }
        }
      }

      // Если clientId изменился при том же токене, переносим сессию
      if (existingPlayerId !== clientId) {
        delete this.state.players[existingPlayerId];
        existingPlayer.clientId = clientId;
        this.state.players[clientId] = existingPlayer;
        if (this.state.readyClients.has(existingPlayerId)) {
          this.state.readyClients.delete(existingPlayerId);
          this.state.readyClients.add(clientId);
        }
      }

      this.state.players[clientId].connectionId = conn.id;
      this.state.players[clientId].clientType = clientType;
      this.state.players[clientId].isDisconnected = false;

      if (this.state.status === "PLAYING" && this.state.gameState?.currentTurn === this.state.players[clientId]?.role) {
        this.resumeTurnTimer();
      }

      try {
        const maskedSnapshot = this.state.gameState ? this.maskStateForPlayer(this.state.gameState, existingPlayer.role) : null;
        conn.send(
          JSON.stringify({
            type: "AUTH_TOKEN",
            authToken: expectedToken,
            clientId,
          })
        );
        conn.send(
          JSON.stringify({
            type: "SESSION_RESTORED",
            role: existingPlayer.role,
            status: this.state.status,
            gameState: maskedSnapshot,
            state: maskedSnapshot,
            authToken: expectedToken,
            clientId,
          })
        );
        conn.send(
          JSON.stringify({
            type: "STATE_SNAPSHOT",
            role: existingPlayer.role,
            status: this.state.status,
            gameState: maskedSnapshot,
            state: maskedSnapshot,
            authToken: expectedToken,
            clientId,
          })
        );
      } catch (_err) {}

      defer(() => {
        this.broadcastRaw(JSON.stringify({ type: "PRESENCE_CHANGED", connected: true }));
        this.broadcastRaw(
          JSON.stringify({
            type: "PLAYER_RECONNECTED",
            role: existingPlayer.role,
            clientId,
          })
        );
        this.broadcastStatus();
        this.broadcastState();
      });
      return;
    }

    const activePlayersCount = Object.keys(this.state.players).length;

    // Подключение к несуществующей комнате
    if (!isHost && activePlayersCount === 0 && Object.keys(this.state.tvDisplays).length === 0) {
      try {
        conn.send(JSON.stringify({ type: "ERROR", message: "ROOM_NOT_FOUND" }));
        conn.close();
      } catch (_err) {}
      return;
    }

    // Проверка лимита игроков в соответствии с выбранным режимом
    const maxPlayersForMode = this.getMaxPlayersForMode(this.state.mode);
    if (activePlayersCount >= maxPlayersForMode) {
      try {
        conn.send(JSON.stringify({ type: "ERROR", message: "ROOM_FULL" }));
        conn.close();
      } catch (_err) {}
      console.warn(`[GameRoomServer] Connection rejected: room ${roomCode} is full (${activePlayersCount}/${maxPlayersForMode}).`);
      return;
    }

    // Защита приватных комнат: подключение гостя без верного шифра Морзе блокируется сервером
    if (!isHost && this.state.isPrivate) {
      const incomingMorse = normalizeMorse(url.searchParams.get("morse") || "");
      const expectedMorse = normalizeMorse(this.getMorseCode() || roomToMorseRegistry.get(roomCode) || "");
      if (!incomingMorse || incomingMorse !== expectedMorse) {
        try {
          conn.send(JSON.stringify({ type: "ERROR", message: "INVALID_MORSE_CODE" }));
          conn.close();
        } catch (_err) {}
        console.warn(`[GameRoomServer] Connection rejected: invalid morse code for private room ${roomCode}.`);
        return;
      }
    }

    if (isHost || activePlayersCount === 0) {
      const authToken = generateToken();
      this.state.mode = mode;
      this.state.status = "WAITING";
      this.state.players[clientId] = {
        clientId,
        nickname,
        isHost: true,
        role: "KILLER",
        connectionId: conn.id,
        clientType,
        authToken,
      };

      try {
        conn.send(
          JSON.stringify({
            type: "AUTH_TOKEN",
            authToken,
            clientId,
          })
        );
      } catch (_err) {}

      this.state.isPrivate = isPrivate;

      publicRoomsRegistry.set(roomCode, {
        roomCode,
        morseCode: this.getMorseCode(),
        mode,
        hostName: nickname,
        status: "WAITING",
        playersCount: 1,
        maxPlayers: 2,
        bet: 250,
        isPrivate,
      });
      defer(() => {
        this.broadcastStatus();
      });
    } else {
      const hostId = Object.keys(this.state.players)[0];
      const hostPlayer = hostId ? this.state.players[hostId] : null;

      const hostIsKiller = randomRoles ? Math.random() < 0.5 : true;
      if (hostPlayer) {
        hostPlayer.role = hostIsKiller ? "KILLER" : "DETECTIVE";
      }

      const authToken = generateToken();
      this.state.players[clientId] = {
        clientId,
        nickname,
        isHost: false,
        role: hostIsKiller ? "DETECTIVE" : "KILLER",
        connectionId: conn.id,
        clientType,
        authToken,
      };

      try {
        conn.send(
          JSON.stringify({
            type: "AUTH_TOKEN",
            authToken,
            clientId,
          })
        );
      } catch (_err) {}

      this.state.readyClients.clear();
      this.state.gameState = createInitialState(
        this.state.mode,
        "ONLINE",
        "KILLER",
        2,
        this.state.mode === "SECRET_SERVICE" ? 2 : 3,
        16,
        nickname
      );
      const existingRoom = publicRoomsRegistry.get(roomCode);
      const roomBet = existingRoom?.bet || 250;
      this.state.gameState.matchBet = roomBet;
      this.state.gameState.matchPot = roomBet * 2;
      this.state.status = "READY_TO_START";
      if (existingRoom) {
        existingRoom.status = "READY_TO_START";
        existingRoom.playersCount = 2;
      } else {
        publicRoomsRegistry.set(roomCode, {
          roomCode,
          morseCode: this.getMorseCode(),
          mode: this.state.mode,
          hostName: hostPlayer?.nickname || "Хост",
          status: "READY_TO_START",
          playersCount: 2,
          maxPlayers: 2,
          bet: 250,
          isPrivate: this.state.isPrivate || false,
        });
      }

      defer(() => {
        this.broadcastStatus();
        this.broadcastState();
      });
    }
    } catch (err) {
      console.error("[GameRoomServer] onConnect failed safely:", err);
    }
  }

  onClose(conn: any): void {
    // Проверяем, не ТВ ли это отключился
    for (const [tvId, tv] of Object.entries(this.state.tvDisplays)) {
      if (tv.connectionId === conn.id) {
        delete this.state.tvDisplays[tvId];
        const remainingTvCount = Object.keys(this.state.tvDisplays).length;
        const remainingPlayersCount = Object.keys(this.state.players).length;
        if (remainingTvCount === 0 && remainingPlayersCount === 0) {
          this.state.status = "EMPTY";
          this.state.gameState = null;
          unregisterRoom(this.getRoomCode());
          this.state.readyClients.clear();
        } else {
          this.broadcastStatus();
          this.broadcastRaw(JSON.stringify({ type: "TV_DISCONNECTED" }));
        }
        return;
      }
    }

    const clientId = this.getClientIdByConnId(conn.id);
    if (!clientId) return;

    const existingTimer = this.disconnectTimers.get(clientId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.disconnectTimers.delete(clientId);
    }

    this.broadcastRaw(JSON.stringify({ type: "PRESENCE_CHANGED", connected: false }));

    const playerWhoLeft = this.state.players[clientId];
    if (playerWhoLeft) {
      playerWhoLeft.isDisconnected = true;
    }
    this.state.readyClients.delete(clientId);
    if (this.state.status === "READY_TO_START" && this.state.readyClients.size < 2) {
      this.state.status = "WAITING";
      this.broadcastStatus();
    }
    if (playerWhoLeft?.isHost && this.state.status === "WAITING") {
      unregisterRoom(this.getRoomCode());
    }

    // Если отключился игрок, чей сейчас ход — замораживаем блиц-таймер
    if (this.state.status === "PLAYING" && this.state.gameState?.currentTurn === playerWhoLeft?.role) {
      this.pauseTurnTimer();
    }

    if (this.state.status === "PLAYING") {
      this.broadcastRaw(
        JSON.stringify({
          type: "PLAYER_DISCONNECTED",
          role: playerWhoLeft?.role,
          clientId,
          graceTimeoutSec: Math.round(DISCONNECT_GRACE_PERIOD_MS / 1000),
        })
      );
    }

    const timer = setTimeout(() => {
      this.handleIndividualGraceTimeout(clientId);
    }, DISCONNECT_GRACE_PERIOD_MS);

    this.disconnectTimers.set(clientId, timer);

    // Проверка Dual Disconnect (все зарегистрированные участники отключены во время PLAYING)
    const playerKeys = Object.keys(this.state.players);
    if (this.state.status === "PLAYING" && playerKeys.length >= 2 && this.disconnectTimers.size >= playerKeys.length) {
      for (const t of this.disconnectTimers.values()) {
        clearTimeout(t);
      }
      this.disconnectTimers.clear();

      this.dualDisconnectStartedAt = Date.now();
      this.dualDisconnectTimer = setTimeout(() => {
        this.handleDualDisconnectTimeout();
      }, DISCONNECT_GRACE_PERIOD_MS);

      this.broadcastRaw(
        JSON.stringify({
          type: "DUAL_DISCONNECT_PAUSE",
          gracePeriodMs: DISCONNECT_GRACE_PERIOD_MS,
        })
      );
      this.broadcastStatus();
    }
  }

  validateActionLogic(
    action: any,
    player: PlayerInfo | null,
    isTvSender: boolean = false
  ): { valid: boolean; reason?: string } {
    if (!this.state.gameState) {
      return { valid: false, reason: "GAME_NOT_FOUND" };
    }
    if (this.state.gameState.winner) {
      return { valid: false, reason: "GAME_ALREADY_FINISHED" };
    }

    const isSoloTvPassAndPlay =
      this.state.isPassAndPlay === true ||
      (Object.keys(this.state.players).length === 1 && Object.keys(this.state.tvDisplays).length > 0);

    // 1. Проверка очередности хода
    if (!isSoloTvPassAndPlay && player) {
      if (this.state.mode === "SECRET_SERVICE") {
        const activeSpyIndex = this.state.gameState.activeSpyIndex ?? 0;
        const playerIndex = Object.keys(this.state.players).indexOf(player.clientId);
        const isTurnValid = playerIndex !== -1
          ? activeSpyIndex === playerIndex
          : (player.isHost ? activeSpyIndex === 0 : activeSpyIndex === 1);
        if (!isTurnValid) {
          console.warn(
            `Move rejected: wrong turn in SECRET_SERVICE. Player isHost: ${player.isHost}, activeSpyIndex: ${activeSpyIndex}`
          );
          return { valid: false, reason: "NOT_YOUR_TURN" };
        }
      } else {
        const currentTurn = this.state.gameState.currentTurn;
        if (player.role !== currentTurn) {
          console.warn(
            `Move rejected: wrong turn. Player role: ${player.role}, currentTurn: ${currentTurn}`
          );
          return { valid: false, reason: "NOT_YOUR_TURN" };
        }
      }
    }

    // 2. Валидация маневра SHIFT_BOARD
    if (action.type === "SHIFT_BOARD") {
      const payload = action.payload || {};
      const { shiftType, index, direction } = payload;
      if (shiftType !== "ROW" && shiftType !== "COL") {
        return { valid: false, reason: "INVALID_SHIFT_TYPE" };
      }
      const boardSize = this.state.gameState.board?.length || 5;
      if (typeof index !== "number" || index < 0 || index >= boardSize) {
        return { valid: false, reason: "INDEX_OUT_OF_BOUNDS" };
      }
      if (direction !== "FORWARD" && direction !== "BACKWARD") {
        return { valid: false, reason: "INVALID_DIRECTION" };
      }
      if (this.state.gameState.lastShift && isOppositeShift(this.state.gameState.lastShift, shiftType, index, direction)) {
        return { valid: false, reason: "OPPOSITE_SHIFT_BLOCKED" };
      }
      return { valid: true };
    }

    // 2.1 Валидация действий по режимам игры (P0 Security)
    if (action.type === "CAPTURE_SPY" || action.type === "INTERROGATE") {
      if (this.state.mode !== "SECRET_SERVICE") {
        return { valid: false, reason: "INVALID_ACTION_FOR_MODE" };
      }
    }

    // 3. Валидация целевых действий
    const targetId = action.payload?.targetId || action.payload?.targetCardId;
    if (targetId && typeof targetId === "string") {
      const allChars = this.state.gameState.board?.flat() || [];
      const targetChar = allChars.find((c) => c.id === targetId);
      if (!targetChar) {
        return { valid: false, reason: "TARGET_NOT_FOUND" };
      }

      if (
        action.type === "KILL_CHARACTER" ||
        action.type === "TARGET_KILL" ||
        action.type === "EXONERATE" ||
        action.type === "ARREST" ||
        action.type === "STEAL" ||
        action.type === "ROB_NEIGHBOR" ||
        action.type === "ROB"
      ) {
        if (!targetChar.isAlive) {
          return { valid: false, reason: "TARGET_ALREADY_DEAD" };
        }
      }

      if (
        action.type === "STEAL" ||
        action.type === "ROB_NEIGHBOR" ||
        action.type === "ROB"
      ) {
        if (targetChar.isRobbed) {
          return { valid: false, reason: "TARGET_ALREADY_ROBBED" };
        }
      }
    }

    return { valid: true };
  }

  onMessage(message: string, sender: any): void {
    try {
      if (typeof message !== "string" || message.length > 512 * 1024) {
        return;
      }
      let action = JSON.parse(message);
      if (!action || typeof action !== "object" || Array.isArray(action)) return;
      if (action.type === "DISPATCH_ACTION") {
        if (action.action && typeof action.action === "object") {
          action = {
            ...action.action,
            senderClientId: action.senderClientId || action.action.senderClientId,
          };
        } else if (action.payload && action.actionType) {
          action = {
            type: action.actionType,
            payload: action.payload,
            senderClientId: action.senderClientId,
          };
        }
      }
      if (typeof action.type !== "string" || !/^[A-Z0-9_]{3,50}$/.test(action.type)) {
        return;
      }
      if (action.type === "PING") {
        try {
          sender?.send(JSON.stringify({ type: "PONG" }));
        } catch (_) {}
        return;
      }

      if (action.type === "CLIENT_BACKGROUNDED") {
        const senderClientId = action.senderClientId || this.getClientIdByConnId(sender?.id);
        if (senderClientId && this.state.players[senderClientId]) {
          this.state.players[senderClientId].isBackground = Boolean(action.payload?.isBackground);
        }
        return;
      }

      if (action.type === "RESOLVE_ROOM") {
        const { morse, pin } = action.payload || {};

        if (morse) {
          const candidates = resolveRoomsByMorse(morse);
          if (candidates.length === 1) {
            const single = candidates[0];
            try {
              sender?.send(
                JSON.stringify({
                  type: "ROOM_RESOLVED",
                  payload: {
                    ok: true,
                    disambiguation: false,
                    roomCode: single.roomCode,
                    morseCode: normalizeMorse(morse),
                    hostName: single.hostName,
                    status: single.status,
                    mode: single.mode,
                    playersCount: single.playersCount,
                    maxPlayers: single.maxPlayers,
                  },
                })
              );
            } catch (_) {}
            return;
          }

          if (candidates.length > 1) {
            try {
              sender?.send(
                JSON.stringify({
                  type: "ROOM_RESOLVED",
                  payload: {
                    ok: true,
                    disambiguation: true,
                    morseCode: normalizeMorse(morse),
                    candidates,
                  },
                })
              );
            } catch (_) {}
            return;
          }
        }

        if (pin) {
          const foundRoomCode = resolveRoomByPin(pin);
          if (foundRoomCode) {
            const roomMeta = publicRoomsRegistry.get(foundRoomCode);
            const morseCode = roomToMorseRegistry.get(foundRoomCode);
            try {
              sender?.send(
                JSON.stringify({
                  type: "ROOM_RESOLVED",
                  payload: {
                    ok: true,
                    disambiguation: false,
                    roomCode: foundRoomCode,
                    morseCode: morseCode || null,
                    hostName: roomMeta?.hostName || "Хост",
                    status: roomMeta?.status || "WAITING",
                    mode: roomMeta?.mode || "MANIAC_VS_OPERATIVE",
                    playersCount: roomMeta?.playersCount || 0,
                    maxPlayers: roomMeta?.maxPlayers || 2,
                  },
                })
              );
            } catch (_) {}
            return;
          }
        }

        try {
          sender?.send(
            JSON.stringify({
              type: "RESOLVE_FAILED",
              payload: {
                ok: false,
                error: "ROOM_NOT_FOUND",
              },
            })
          );
        } catch (_) {}
        return;
      }

      // Проверка на TV_DISPLAY и системные экшены: телевизор и клиенты не могут отдавать команды рестарта/накрутки банка
      if (
        action.type === "MATCH_STARTED" ||
        action.type === "RESTART_GAME" ||
        action.type === "SET_MATCH_POT"
      ) {
        return;
      }

      delete (action as any).senderId;
      delete (action as any).nextTurn;
      delete (action as any).nextSpyIndex;
      delete (action as any).senderClientId;

      const isTvSender = Object.values(this.state.tvDisplays).some(
        (tv) => tv.connectionId === sender?.id
      );
      const TV_ALLOWED_ACTIONS = [
        "START_MATCH",
        "TV_CONFIRM_RESTART",
        "TV_EXIT_TO_LOBBY",
        "TV_TOGGLE_PAUSE",
        "TV_TOGGLE_MUTE",
      ];
      if (isTvSender && !TV_ALLOWED_ACTIONS.includes(action.type)) {
        console.warn(`[GameRoomServer] Action ${action.type} rejected: TV_DISPLAY cannot issue game actions.`);
        return;
      }

      const senderClientId = this.getClientIdByConnId(sender?.id);
      if (!senderClientId || !this.state.players[senderClientId]) {
        const isTestPreview =
          typeof process !== "undefined" &&
          (process.env?.VITEST || process.env?.NODE_ENV === "test") &&
          (action.type === "LINE_PREVIEW" || action.type === "PREVIEW_SHIFT");
        if (!isTestPreview && !isTvSender) {
          return;
        }
      }

      const player = senderClientId ? this.state.players[senderClientId] : null;

      const SYSTEM_ACTIONS = [
        "PING",
        "INIT",
        "INIT_ROOM",
        "CREATE_ROOM",
        "PLAYER_LEFT_EXPLICIT",
        "PLAYER_READY",
        "PLAYER_UNREADY",
        "REQUEST_RESTART",
        "REJECT_RESTART",
        "CONFIRM_RESTART",
        "CHANGE_SETTINGS",
        "START_MATCH",
        "TURN_TIMEOUT",
        "TIMEOUT_PASS",
        "TV_TOGGLE_PAUSE",
        "TV_TOGGLE_MUTE",
        "TV_CONFIRM_RESTART",
        "TV_EXIT_TO_LOBBY",
      ];
      if (!SYSTEM_ACTIONS.includes(action.type)) {
        if (!player && !((typeof process !== "undefined" && (process.env?.VITEST || process.env?.NODE_ENV === "test")) && action.type === "LINE_PREVIEW")) {
          return;
        }
      }

      if (action.type === "INIT" || action.type === "CREATE_ROOM" || action.type === "INIT_ROOM") {
        const mode = action.payload?.mode || this.state.mode || "MANIAC_VS_OPERATIVE";
        this.state.mode = mode;
        if (!this.state.gameState) {
          this.state.gameState = createInitialState(
            mode,
            "ONLINE",
            "KILLER",
            2,
            mode === "SECRET_SERVICE" ? 2 : 3,
            16
          );
        }
        this.broadcastStatus();
        this.broadcastState();
        try {
          const masked = isTvSender
            ? this.maskStateForTv(this.state.gameState)
            : this.maskStateForPlayer(this.state.gameState, player?.role);
          sender?.send(
            JSON.stringify({
              type: "STATE_SNAPSHOT",
              state: masked,
              gameState: masked,
              role: isTvSender ? "SPECTATOR" : player?.role,
              status: this.state.status,
            })
          );
        } catch (_) {}
        return;
      }

      if (action.type === "PLAYER_LEFT_EXPLICIT") {
        if (senderClientId) {
          const pendingTimer = this.disconnectTimers.get(senderClientId);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            this.disconnectTimers.delete(senderClientId);
          }
          if (player?.nickname) {
            guestRegistry.releaseByCallsign(player.nickname);
          }
          delete this.state.players[senderClientId];
          this.state.readyClients.delete(senderClientId);
          if (this.state.status === "READY_TO_START" && this.state.readyClients.size < 2) {
            this.state.status = "WAITING";
          }
          this.state.restartRequestedBy = null;

          const roomCode = this.getRoomCode();
          const remainingPlayers = Object.values(this.state.players);
          const remainingPlayersCount = remainingPlayers.length;

          if (remainingPlayersCount === 0) {
            this.state.status = "EMPTY";
            this.state.gameState = null;
            unregisterRoom(roomCode);
            this.state.readyClients.clear();
          } else {
            if (player?.isHost && (this.state.status === "WAITING" || this.state.status === "READY_TO_START")) {
              if (!remainingPlayers.some((p) => p.isHost)) {
                remainingPlayers[0].isHost = true;
              }
            }
            this.broadcastRaw(JSON.stringify({ type: "OPPONENT_LEFT" }));
            if (this.state.status === "PLAYING") {
              this.state.status = "FINISHED";
            } else {
              this.state.status = "WAITING";
              const hostPlayer =
                remainingPlayers.find((p) => p.isHost) ||
                remainingPlayers[0];
              publicRoomsRegistry.set(roomCode, {
                roomCode,
                morseCode: this.getMorseCode(),
                mode: this.state.mode,
                hostName: hostPlayer?.nickname || "Хост",
                status: "WAITING",
                playersCount: 1,
                maxPlayers: 2,
                bet: 250,
              });
            }
            this.broadcastStatus();
          }
        }
        return;
      }

      if (action.type === "REQUEST_RESTART") {
        this.state.pendingRematchMode = action.payload?.rematchMode || "SWAP";
        this.state.restartRequestedBy = senderClientId;
        this.broadcastRaw(
          JSON.stringify({
            type: "REQUEST_RESTART",
            payload: action.payload || { requestedBy: player?.isHost ? "HOST" : "GUEST" },
          })
        );
        return;
      }

      if (action.type === "REJECT_RESTART") {
        this.state.restartRequestedBy = null;
        this.broadcastRaw(JSON.stringify({ type: "REJECT_RESTART" }));
        return;
      }

      if (action.type === "CHANGE_SETTINGS") {
        if (!player?.isHost) {
          try {
            sender.send(JSON.stringify({ type: "ACTION_REJECTED", reason: "NOT_HOST" }));
          } catch (_err) {}
          console.warn("[GameRoomServer] Action rejected: CHANGE_SETTINGS can only be initiated by host.");
          return;
        }
        if (this.state.status !== "WAITING" && this.state.status !== "READY_TO_START") {
          try {
            sender.send(JSON.stringify({ type: "ACTION_REJECTED", reason: "INVALID_PHASE" }));
          } catch (_err) {}
          return;
        }
        if (action.payload?.mode) {
          this.state.mode = action.payload.mode;
        }
        if (action.payload?.roleDistribution) {
          this.state.roleDistribution = action.payload.roleDistribution;
          const playerIds = Object.keys(this.state.players);
          const hostId = playerIds.find((id) => this.state.players[id].isHost);
          const guestId = playerIds.find((id) => !this.state.players[id].isHost);
          if (hostId && guestId) {
            if (this.state.roleDistribution === "HOST_KILLER") {
              this.state.players[hostId].role = "KILLER";
              this.state.players[guestId].role = "DETECTIVE";
            } else if (this.state.roleDistribution === "HOST_DETECTIVE") {
              this.state.players[hostId].role = "DETECTIVE";
              this.state.players[guestId].role = "KILLER";
            } else if (this.state.roleDistribution === "RANDOM") {
              const hostIsKiller = Math.random() < 0.5;
              this.state.players[hostId].role = hostIsKiller ? "KILLER" : "DETECTIVE";
              this.state.players[guestId].role = hostIsKiller ? "DETECTIVE" : "KILLER";
            }
          }
        }
        this.broadcastStatus();
        return;
      }

      if (action.type === "CONFIRM_RESTART") {
        if (this.state.status !== "FINISHED") {
          try {
            sender.send(JSON.stringify({ type: "ACTION_REJECTED", reason: "MATCH_NOT_FINISHED" }));
          } catch (_err) {}
          console.warn("[GameRoomServer] Action rejected: CONFIRM_RESTART only allowed when match is FINISHED.");
          return;
        }

        const restartRequestedBy = this.state.restartRequestedBy;
        const hostPlayer = Object.values(this.state.players).find((p) => p.isHost);
        const isHostConsentGiven = Boolean(restartRequestedBy && hostPlayer && restartRequestedBy === hostPlayer.clientId);

        if (!player?.isHost && !isHostConsentGiven) {
          try {
            sender.send(JSON.stringify({ type: "ACTION_REJECTED", reason: "NOT_HOST" }));
          } catch (_err) {}
          console.warn("[GameRoomServer] Action rejected: CONFIRM_RESTART can only be initiated by host or with host consent.");
          return;
        }

        const isParticipant = Boolean(player && player.role !== "SPECTATOR");

        let isAuthorizedToConfirm = false;
        if (restartRequestedBy) {
          isAuthorizedToConfirm = Boolean(isParticipant && senderClientId !== restartRequestedBy);
        } else {
          isAuthorizedToConfirm = Boolean(player?.isHost && isParticipant);
        }

        if (!isAuthorizedToConfirm) {
          try {
            sender.send(JSON.stringify({ type: "ACTION_REJECTED", reason: "NOT_AUTHORIZED_RESTART" }));
          } catch (_err) {}
          console.warn("[GameRoomServer] Action rejected: CONFIRM_RESTART not authorized.");
          return;
        }
        this.state.restartRequestedBy = null;
        const playerIds = Object.keys(this.state.players || {});
        if (playerIds.length >= 2) {
          const mode = this.state.pendingRematchMode;
          if (mode === "RANDOM") {
            const firstIsKiller = Math.random() < 0.5;
            this.state.players[playerIds[0]].role = firstIsKiller ? "KILLER" : "DETECTIVE";
            this.state.players[playerIds[1]].role = firstIsKiller ? "DETECTIVE" : "KILLER";
          } else if (mode === "SWAP" || !mode) {
            const prevRole0 = this.state.players[playerIds[0]].role;
            this.state.players[playerIds[0]].role = prevRole0 === "KILLER" ? "DETECTIVE" : "KILLER";
            this.state.players[playerIds[1]].role = prevRole0 === "KILLER" ? "KILLER" : "DETECTIVE";
          }
        }
        this.state.status = "READY_TO_START";
        this.state.readyClients.clear();
        this.state.gameState = createInitialState(
          this.state.mode,
          "ONLINE",
          "KILLER",
          2,
          this.state.mode === "SECRET_SERVICE" ? 2 : 3,
          16
        );
        this.state.gameState.matchBet = 250;
        this.state.gameState.matchPot = 500;
        this.broadcastStatus();
        this.broadcastState();
        return;
      }

      if (action.type === "TV_TOGGLE_PAUSE") {
        if (!player?.isHost && !isTvSender) {
          try {
            sender?.send(JSON.stringify({ type: "ACTION_REJECTED", reason: "NOT_HOST" }));
          } catch (_) {}
          return;
        }
        if (this.turnTimerState.isPaused) {
          this.resumeTurnTimer();
        } else {
          this.pauseTurnTimer();
        }
        this.broadcastRaw(
          JSON.stringify({
            type: "TV_PAUSE_CHANGED",
            isPaused: this.turnTimerState.isPaused,
          })
        );
        return;
      }

      if (action.type === "TV_TOGGLE_MUTE") {
        if (!player?.isHost && !isTvSender) {
          try {
            sender?.send(JSON.stringify({ type: "ACTION_REJECTED", reason: "NOT_HOST" }));
          } catch (_) {}
          return;
        }
        this.broadcastRaw(
          JSON.stringify({
            type: "TV_TOGGLE_MUTE",
          })
        );
        return;
      }

      if (action.type === "TV_CONFIRM_RESTART") {
        if (!player?.isHost && !isTvSender) {
          try {
            sender?.send(JSON.stringify({ type: "ACTION_REJECTED", reason: "NOT_HOST" }));
          } catch (_) {}
          return;
        }
        const roleAction = action.payload?.roleAction || "SAME";
        const playerIds = Object.keys(this.state.players || {});
        if (playerIds.length >= 2 && roleAction === "SWAP") {
          const prevRole0 = this.state.players[playerIds[0]].role;
          this.state.players[playerIds[0]].role = prevRole0 === "KILLER" ? "DETECTIVE" : "KILLER";
          this.state.players[playerIds[1]].role = prevRole0 === "KILLER" ? "KILLER" : "DETECTIVE";
        }
        const mode = this.state.mode || "MANIAC_VS_OPERATIVE";
        this.state.gameState = createInitialState(
          mode,
          "ONLINE",
          "KILLER",
          2,
          mode === "SECRET_SERVICE" ? 2 : 3,
          16
        );
        this.state.status = "PLAYING";
        this.startTurnTimer(this.state.gameState.currentTurn || "KILLER", 30000);
        this.broadcastStatus();
        this.broadcastState();
        return;
      }

      if (action.type === "TV_EXIT_TO_LOBBY") {
        if (!player?.isHost && !isTvSender) {
          try {
            sender?.send(JSON.stringify({ type: "ACTION_REJECTED", reason: "NOT_HOST" }));
          } catch (_) {}
          return;
        }
        this.clearTurnTimer();
        this.state.status = "WAITING";
        this.state.readyClients.clear();
        this.state.gameState = null;
        this.broadcastStatus();
        this.broadcastRaw(JSON.stringify({ type: "TV_EXIT_TO_LOBBY" }));
        return;
      }

      if (action.type === "START_MATCH") {
        if (this.state.status === "PLAYING") {
          return;
        }
        if (!player?.isHost && !isTvSender) {
          try {
            sender.send(JSON.stringify({ type: "ACTION_REJECTED", reason: "NOT_HOST" }));
          } catch (_err) {}
          console.warn("[GameRoomServer] Action rejected: START_MATCH can only be initiated by host or TV.");
          return;
        }
        this.state.status = "PLAYING";
        this.state.isPassAndPlay = Boolean(action.payload?.isPassAndPlay);
        const playerKeys = Object.keys(this.state.players);
        const p2Name = playerKeys[1] ? this.state.players[playerKeys[1]].nickname : "Player 2";
        const mode = action.payload?.mode || this.state.mode;
        this.state.mode = mode;
        this.state.gameState = createInitialState(
          mode,
          "ONLINE",
          "KILLER",
          Math.max(2, playerKeys.length),
          mode === "SECRET_SERVICE" ? 2 : 3,
          16,
          p2Name
        );
        publicRoomsRegistry.delete(this.getRoomCode());
        this.broadcastStatus();
        this.broadcastState();
        return;
      }

      if (action.type === "PLAYER_READY") {
        if (senderClientId) {
          this.state.readyClients.add(senderClientId);
        }
        const hasTvDisplay = Object.keys(this.state.tvDisplays).length > 0;
        if (this.state.readyClients.size >= 2) {
          if (hasTvDisplay) {
            this.state.status = "READY_TO_START";
          } else {
            this.state.status = "PLAYING";
            publicRoomsRegistry.delete(this.getRoomCode());
            this.broadcastRaw(JSON.stringify({ type: "ALL_PLAYERS_READY" }));
          }
          this.broadcastStatus();
        } else {
          this.broadcastStatus();
        }
        return;
      }

      if (action.type === "PLAYER_UNREADY") {
        if (senderClientId) {
          this.state.readyClients.delete(senderClientId);
        }
        if (this.state.status === "READY_TO_START") {
          this.state.status = "WAITING";
        }
        this.broadcastStatus();
        return;
      }

      if (!this.state.gameState || this.state.status !== "PLAYING") {
        return;
      }

      if (action.type === "CLEAR_DISGUISE_NOTIFICATION") {
        const nextState = gameReducer(this.state.gameState, action);
        if (nextState !== this.state.gameState) {
          this.state.gameState = nextState;
          this.broadcastState();
        }
        return;
      }

      const isSoloTvPassAndPlay =
        this.state.isPassAndPlay === true ||
        (Object.keys(this.state.players).length === 1 && Object.keys(this.state.tvDisplays).length > 0);

      const validation = this.validateActionLogic(action, player, isTvSender);
      if (!validation.valid) {
        console.warn(`[GameRoomServer] Action ${action.type} rejected: ${validation.reason}`);
        try {
          sender.send(
            JSON.stringify({
              type: "SYNC_ERROR",
              reason: validation.reason,
              actionType: action.type,
            })
          );
          sender.send(
            JSON.stringify({
              type: "ACTION_REJECTED",
              reason: validation.reason,
            })
          );
        } catch (_err) {}
        return;
      }

      if (action.type === "LINE_PREVIEW" || action.type === "PREVIEW_SHIFT") {
        this.broadcastRaw(JSON.stringify({ type: action.type, payload: action.payload }));
        return;
      }


      if (action.type === "CAPTURE_SPY" && this.state.mode === "SECRET_SERVICE") {
        const payload = action.payload || {};
        const targetId = payload.targetId || payload.targetCardId;
        const playerIndex = Object.keys(this.state.players).indexOf(senderClientId);
        const attackerSpyIndex = this.state.gameState.activeSpyIndex ?? (playerIndex !== -1 ? playerIndex : (player?.isHost ? 0 : 1));
        const spies = this.state.gameState.spies || [];
        const attackerSpy = spies[attackerSpyIndex];

        const caughtSpy = spies.find(
          (s) => s.id !== attackerSpy?.id && s.secretId === targetId
        );
        const isHit = Boolean(caughtSpy);
        const isMiss = !isHit;
        const allChars = this.state.gameState.board.flat();
        const targetChar = allChars.find((c) => c.id === targetId);
        const revealedRole = targetChar?.name || caughtSpy?.name || null;
        const nextSpyIndex = (attackerSpyIndex + 1) % (spies.length || 2);

        let nextSecretId: string | null = null;
        if (isHit && caughtSpy) {
          const candidateChar = allChars.find(
            (c) =>
              c.isAlive &&
              c.id !== targetId &&
              c.id !== caughtSpy.secretId &&
              !spies.some((s) => s.id !== caughtSpy.id && s.secretId === c.id)
          );
          nextSecretId = candidateChar?.id || null;
        }

        action.payload = {
          ...payload,
          targetId,
          targetCardId: targetId,
          isHit,
          isMiss,
          revealedRole,
          caughtSpyId: caughtSpy?.id || null,
          nextSecretId,
          attackerSpyIndex,
          nextSpyIndex,
          errorCardId: targetId,
        };
      }

      const nextState = gameReducer(this.state.gameState, action);
      if (nextState !== this.state.gameState) {
        this.state.gameState = nextState;
        if (nextState.winner) {
          this.state.status = "FINISHED";
          this.broadcastStatus();
        }
        this.broadcastState();
      }
    } catch (e) {
      console.error("Failed to handle message in GameRoomServer:", e);
    }
  }

  broadcastStatus(): void {
    const sanitizedPlayers: Record<string, Omit<PlayerInfo, "authToken">> = {};
    for (const [id, p] of Object.entries(this.state.players)) {
      const { authToken, ...rest } = p;
      sanitizedPlayers[id] = rest;
    }

    const payload = JSON.stringify({
      type: "ROOM_STATUS",
      status: this.state.status,
      roomCode: this.getRoomCode(),
      morseCode: this.getMorseCode(),
      mode: this.state.mode,
      roleDistribution: this.state.roleDistribution || "RANDOM",
      players: sanitizedPlayers,
      isReady: this.state.status === "READY_TO_START" || this.state.status === "PLAYING",
      ready: this.state.status === "READY_TO_START" || this.state.status === "PLAYING",
      readyClients: Array.from(this.state.readyClients),
      hasTvDisplay: Object.keys(this.state.tvDisplays).length > 0,
      isPassAndPlay: Boolean(this.state.isPassAndPlay),
    });
    this.broadcastRaw(payload);
  }

  broadcastState(): void {
    if (!this.state.gameState) return;

    const connections = this.room._connectionsMap
      ? Array.from(this.room._connectionsMap.values())
      : (this.room.getConnections ? Array.from(this.room.getConnections()) : []);

    for (const conn of connections as any[]) {
      // Проверяем, ТВ ли это
      const isTv = Object.values(this.state.tvDisplays).some(
        (tv) => tv.connectionId === conn.id
      );

      if (isTv) {
        const tvMaskedState = this.maskStateForTv(this.state.gameState);
        try {
          conn.send(
            JSON.stringify({
              type: "STATE_UPDATE",
              state: tvMaskedState,
              gameState: tvMaskedState,
              role: "SPECTATOR",
              status: this.state.status,
              isPassAndPlay: Boolean(this.state.isPassAndPlay),
            })
          );
          conn.send(
            JSON.stringify({
              type: "SYNC_STATE",
              state: tvMaskedState,
              gameState: tvMaskedState,
              role: "SPECTATOR",
              status: this.state.status,
              isPassAndPlay: Boolean(this.state.isPassAndPlay),
            })
          );
        } catch (_err) {}
        continue;
      }

      const clientId = this.getClientIdByConnId(conn.id);
      const player = clientId ? this.state.players[clientId] : null;
      const playerIndex = clientId ? Object.keys(this.state.players).indexOf(clientId) : -1;
      const maskedState = this.maskStateForPlayer(
        this.state.gameState,
        player?.role,
        player?.isHost,
        this.state.isPassAndPlay,
        playerIndex
      );

      try {
        conn.send(
          JSON.stringify({
            type: "STATE_UPDATE",
            state: maskedState,
            gameState: maskedState,
            role: player?.role,
            status: this.state.status,
            isPassAndPlay: Boolean(this.state.isPassAndPlay),
          })
        );
        conn.send(
          JSON.stringify({
            type: "SYNC_STATE",
            state: maskedState,
            gameState: maskedState,
            role: player?.role,
            status: this.state.status,
            isPassAndPlay: Boolean(this.state.isPassAndPlay),
          })
        );
      } catch (_err) {}
    }
  }

  private maskStateForTv(state: GameState): GameState {
    if (state.winner) return state;

    const copy: any = { ...state };
    copy.killerSecretId = null;
    copy.detectiveSecretId = null;
    copy.duelSecretKillerId = null;
    copy.duelSecretDetectiveId = null;
    copy.killerRoleCard = null;
    copy.detectiveRoleCard = null;
    copy.killerHand = [];
    copy.detectiveHand = [];
    copy.robberHand = [];
    copy.inspectorChoices = [];
    copy.disguisedNotification = null;
    copy.evidenceDeck = [];
    if (copy.victimList && copy.victimList.length > 0) {
      copy.victimList = [copy.victimList[0], ...copy.victimList.slice(1).map(() => "UNKNOWN")];
    }

    if (copy.spies && Array.isArray(copy.spies)) {
      copy.spies = copy.spies.map((spy: any) => ({
        ...spy,
        secretId: null,
      }));
    }

    return copy;
  }

  private maskStateForPlayer(
    state: GameState,
    role?: Role,
    isHost?: boolean,
    isPassAndPlay?: boolean,
    playerIndex?: number
  ): GameState {
    return maskStateForPlayer(state, role, isHost, isPassAndPlay, playerIndex);
  }

  private getClientIdByConnId(connId: string): string | undefined {
    for (const p of Object.values(this.state.players)) {
      if (p.connectionId === connId) return p.clientId;
    }
    return undefined;
  }

  private broadcastRaw(msg: string): void {
    try {
      const connections = this.room?._connectionsMap
        ? Array.from(this.room._connectionsMap.values())
        : (typeof this.room?.getConnections === "function"
            ? Array.from(this.room.getConnections())
            : []);
      for (const conn of connections as any[]) {
        if (!conn) continue;
        if (typeof conn.readyState === "number" && conn.readyState !== 1) continue;
        try {
          conn.send(msg);
        } catch (_err) {}
      }
    } catch (_err) {}
  }

  dispose(): void {
    this.close();
  }

  close(): void {
    if (this.dualDisconnectTimer) {
      clearTimeout(this.dualDisconnectTimer);
      this.dualDisconnectTimer = null;
    }
    if (this.turnTimerState.timer) {
      clearTimeout(this.turnTimerState.timer);
      this.turnTimerState.timer = null;
    }
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();
    this.state.restartRequestedBy = null;
    unregisterRoom(this.getRoomCode());
  }
}

export function maskStateForPlayer(
  state: GameState,
  role?: Role,
  isHost?: boolean,
  isPassAndPlay?: boolean,
  playerIndex?: number
): GameState {
  if (state.winner) return state;

  const copy: any = { ...state };
  copy.evidenceDeck = [];
  if (copy.victimList && copy.victimList.length > 0) {
    copy.victimList = [copy.victimList[0], ...copy.victimList.slice(1).map(() => "UNKNOWN")];
  }

  if (isPassAndPlay) {
    if (state.mode === "SECRET_SERVICE" && copy.spies && Array.isArray(copy.spies)) {
      const activeIdx = state.activeSpyIndex ?? 0;
      copy.spies = copy.spies.map((spy: any, idx: number) => {
        if (idx === activeIdx) {
          return spy;
        }
        return { ...spy, secretId: null };
      });
      copy.detectiveSecretId = null;
      copy.killerSecretId = null;
      copy.duelSecretKillerId = null;
      copy.duelSecretDetectiveId = null;
      copy.killerRoleCard = null;
      copy.detectiveRoleCard = null;
      copy.robberHand = [];
      return copy;
    }

    if (state.currentTurn === "KILLER") {
      copy.detectiveSecretId = null;
      copy.duelSecretDetectiveId = null;
      copy.detectiveRoleCard = null;
      copy.detectiveHand = [];
      copy.inspectorChoices = [];
      copy.inspectorTargetId = null;
    } else {
      copy.killerSecretId = null;
      copy.duelSecretKillerId = null;
      copy.killerRoleCard = null;
      copy.killerHand = [];
      copy.robberHand = [];
      copy.disguisedNotification = null;
    }
    return copy;
  }

  if (state.mode === "SECRET_SERVICE" && copy.spies && Array.isArray(copy.spies)) {
    const targetMyIndex =
      playerIndex !== undefined && playerIndex !== -1
        ? playerIndex
        : isHost === true
        ? 0
        : 1;
    copy.spies = copy.spies.map((spy: any, idx: number) => {
      if (idx === targetMyIndex) {
        return spy;
      }
      return { ...spy, secretId: null };
    });
    copy.detectiveSecretId = null;
    copy.killerSecretId = null;
    copy.duelSecretKillerId = null;
    copy.duelSecretDetectiveId = null;
    copy.killerRoleCard = null;
    copy.detectiveRoleCard = null;
    copy.robberHand = [];
    return copy;
  }

  if (role === "KILLER") {
    copy.detectiveSecretId = null;
    copy.duelSecretDetectiveId = null;
    copy.detectiveRoleCard = null;
    copy.detectiveHand = [];
    copy.inspectorChoices = [];
    copy.inspectorTargetId = null;
  } else if (role === "DETECTIVE") {
    copy.killerSecretId = null;
    copy.duelSecretKillerId = null;
    copy.killerRoleCard = null;
    copy.killerHand = [];
    copy.robberHand = [];
    copy.disguisedNotification = null;
  } else {
    // Сторонний наблюдатель / зритель
    copy.detectiveSecretId = null;
    copy.killerSecretId = null;
    copy.duelSecretKillerId = null;
    copy.duelSecretDetectiveId = null;
    copy.killerRoleCard = null;
    copy.detectiveRoleCard = null;
    copy.killerHand = [];
    copy.detectiveHand = [];
    copy.robberHand = [];
    copy.inspectorChoices = [];
    copy.inspectorTargetId = null;
    copy.disguisedNotification = null;
  }
  return copy;
}
