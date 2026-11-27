import { areAdjacent, createInitialState, isOppositeShift } from "../utils/gameLogic";
import { gameReducer } from "../utils/gameReducer";
import { guestRegistry } from "../utils/guestManager";
import { sanitizePlayerName } from "../utils/nameFilter";
import type { GameState, Role, GameModeType } from "../types/game";
import type { ClientDeviceType } from "../types/multiplayer";
import { TURN_TIME_LIMIT_MS, TURN_GRACE_PERIOD_SECONDS } from "../constants/gameRules";
import { buildCorsHeaders, buildPreflightResponse, resolveAllowedOrigins } from "./cors";

/**
 * Пространственные действия, которые обязаны изменить состояние игры.
 * Если gameReducer вернул тот же объект состояния — действие фактически не применилось
 * (например, цель уже помилована или проверка внутри редьюсера не прошла).
 */
const SPATIAL_ACTIONS = new Set<string>([
  "KILL_CHARACTER",
  "TARGET_KILL",
  "ROB_NEIGHBOR",
  "ROB",
  "STEAL",
  "ACCUSE",
  "ARREST",
  "CAPTURE_SPY",
  "INTERROGATE",
]);

export type { ClientDeviceType };

export interface PlayerInfo {
  clientId: string;
  nickname: string;
  isHost: boolean;
  role: Role;
  connectionId: string;
  clientType: ClientDeviceType;
  authToken?: string;
  /**
   * Кластер 3: предыдущий authToken, который ещё принимается в течение
   * окна совместимости после ротации (см. AUTH_TOKEN_ROTATION_GRACE_MS).
   */
  previousAuthToken?: string;
  /** Метка (Date.now()) истечения окна совместимости предыдущего токена. */
  previousAuthTokenExpiresAt?: number;
  isDisconnected?: boolean;
  isBackground?: boolean;
  /**
   * SEC-NET-06: монотонно растущий номер привязки сессии к сокету.
   * Инкрементируется при каждом (re)bind соединения, чтобы отсечь
   * устаревшие события onClose от замещённых сокетов.
   */
  sessionEpoch?: number;
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
  hostToken?: string | null;
  restartRequestedBy?: string | null;
  pendingRematchMode?: string | null;
  bet?: number;
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
  maskPrivateRoomMeta,
  maskPrivateMorseCandidate,
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
  maskPrivateRoomMeta,
  maskPrivateMorseCandidate,
} from "./lobby";

import { normalizeMorse } from "../utils/morse";
export { normalizeMorse };

// Мгновенная диспетчеризация без искусственных задержек (устранение defer(50ms))
const defer = (fn: () => void) => {
  try {
    fn();
  } catch (_) {}
};

export const DISCONNECT_GRACE_PERIOD_MS = TURN_GRACE_PERIOD_SECONDS * 1000;

/**
 * Кластер 3: окно совместимости, в течение которого после ротации authToken
 * сервер продолжает принимать предыдущий токен (защита от гонок при реконнекте).
 */
export const AUTH_TOKEN_ROTATION_GRACE_MS = 60_000;

/** Генерация криптостойкого токена сессии с fallback для окружений без crypto.randomUUID. */
const generateAuthToken = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `auth_${Date.now()}_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;

/**
 * P0-3: Карта режимных ограничений для игровых действий.
 * Действие, отсутствующее в карте, считается универсальным и разрешено в любом режиме.
 * CLEANUP дополнительно разрешён в SECRET_SERVICE, так как «Зачистка» является
 * штатным действием этого режима (см. getAvailableActionDescriptors).
 */
const MODE_RESTRICTED_ACTIONS: Record<string, GameModeType[]> = {
  DUEL_ASK_QUESTION: ["LINE_UP"],
  DUEL_ACCUSE: ["LINE_UP"],
  ASK_QUESTION: ["LINE_UP"],
  KILL_CHARACTER: ["MANIAC_VS_OPERATIVE"],
  CLEANUP: ["MANIAC_VS_OPERATIVE", "SECRET_SERVICE"],
  SWEAR_IN_OFFICER: ["THIEF_HUNT"],
  SET_INSPECTOR_ROLE: ["MANIAC_VS_OPERATIVE"],
};

/**
 * Проверяет, допустимо ли действие в текущем режиме комнаты.
 * Используется серверным guard-ом, чтобы клиент не мог применить
 * действие чужого режима и смутировать состояние комнаты.
 */
export function isActionAllowedForMode(mode: GameModeType, actionType: string): boolean {
  const allowedModes = MODE_RESTRICTED_ACTIONS[actionType];
  if (!allowedModes) return true;
  return allowedModes.includes(mode);
}

export default class GameRoomServer {
  room: any;
  state: ServerRoomState;
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private dualDisconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private dualDisconnectStartedAt: number | null = null;
  private matchStartedAt: number | null = null;
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
    totalDurationMs: TURN_TIME_LIMIT_MS,
    isPaused: false,
  };

  getMaxPlayersForMode(mode: GameModeType): number {
    if (mode === "SECRET_SERVICE") return 4;
    return 2;
  }

  startTurnTimer(role: Role, durationMs: number = TURN_TIME_LIMIT_MS): void {
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
        this.startTurnTimer(nextRole, this.turnTimerState.totalDurationMs || TURN_TIME_LIMIT_MS);
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

    // SEC-NET-06: устаревший таймер не должен аннулировать матч,
    // если хотя бы один игрок успел вернуться в игру.
    const players = Object.values(this.state.players);
    if (players.some((p) => p.isDisconnected !== true)) {
      return;
    }

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
    // SEC-NET-06: устаревший таймер не должен удалять вернувшегося игрока
    // или сессию, перенесённую на новый clientId.
    if (this.state.players[clientId]?.isDisconnected !== true) {
      this.disconnectTimers.delete(clientId);
      return;
    }
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
      bet: 250,
    };
  }

  async onRequest(req: Request): Promise<Response> {
    // SEC-ENV-02: cross-origin разрешён только доверенным origins (ALLOWED_ORIGINS).
    const allowedOrigins = resolveAllowedOrigins(
      ((this as any).env ?? this.room?.env ?? null) as Record<string, unknown> | null
    );
    const preflightResponse = buildPreflightResponse(req, allowedOrigins);
    if (preflightResponse) return preflightResponse;

    const corsHeaders = buildCorsHeaders(req.headers.get("origin"), allowedOrigins);
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
            ...corsHeaders,
          },
        });
      }
      return new Response(JSON.stringify({ ok: false, error: "INVALID_MORSE_CODE" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
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
          const base = {
            ok: true,
            disambiguation: false,
            hostName: single.hostName,
            mode: single.mode,
            status: single.status,
            playersCount: single.playersCount,
            maxPlayers: single.maxPlayers,
          };
          // P0-1: приватная комната не раскрывает roomCode/morseCode.
          const payload = single.isPrivate
            ? { ...base, isPrivate: true }
            : { ...base, roomCode: single.roomCode, morseCode: normalizeMorse(rawMorse) };
          return new Response(JSON.stringify(payload), {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          });
        }

        if (candidates.length > 1) {
          return new Response(
            JSON.stringify({
              ok: true,
              disambiguation: true,
              morseCode: candidates.some((c) => c.isPrivate)
                ? undefined
                : normalizeMorse(rawMorse),
              candidates: candidates.map(maskPrivateMorseCandidate),
            }),
            {
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
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
          const base = {
            ok: true,
            disambiguation: false,
            hostName: roomMeta?.hostName || "Хост",
            mode: roomMeta?.mode || "MANIAC_VS_OPERATIVE",
            status: roomMeta?.status || "WAITING",
            playersCount: roomMeta?.playersCount || 0,
            maxPlayers: roomMeta?.maxPlayers || 2,
          };
          // P0-1: приватная комната не отражает обратно roomCode/morseCode.
          const payload = roomMeta?.isPrivate
            ? { ...base, isPrivate: true }
            : { ...base, roomCode: foundRoomCode, morseCode: morseCode || null };
          return new Response(JSON.stringify(payload), {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          });
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
            ...corsHeaders,
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
        .map(maskPrivateRoomMeta);
      return new Response(JSON.stringify(waitingRooms), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }
    const allRooms = Array.from(publicRoomsRegistry.values()).map(maskPrivateRoomMeta);
    return new Response(JSON.stringify(allRooms), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
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
    const rawBet = parseInt(url.searchParams.get("bet") || "", 10);
    const incomingBet = !isNaN(rawBet) && rawBet > 0 ? rawBet : 250;
    const roomCode = this.getRoomCode();

    // P0-1: Проверка доступа к приватной комнате выполняется ДО обработки ветки TV_DISPLAY,
    // чтобы телевизионный экран не мог обойти защиту приватной комнаты.
    let incomingAuthToken = url.searchParams.get("authToken");
    if (this.state.isPrivate) {
      const expectedMorse = normalizeMorse(
        roomToMorseRegistry.get(roomCode) || this.getMorseCode() || ""
      );
      const incomingMorse = normalizeMorse(url.searchParams.get("morse") || "");
      const hasValidMorse = Boolean(expectedMorse) && incomingMorse === expectedMorse;
      const hasValidParticipantToken = Boolean(
        incomingAuthToken &&
          ((this.state.hostToken && incomingAuthToken === this.state.hostToken) ||
            Object.values(this.state.players).some((p) =>
              this.isValidAuthToken(p, incomingAuthToken)
            ))
      );
      if (!hasValidMorse && !hasValidParticipantToken) {
        try {
          conn.send(JSON.stringify({ type: "ERROR", message: "INVALID_MORSE_CODE" }));
          conn.close();
        } catch (_err) {}
        console.warn(
          `[GameRoomServer] Access denied to private room ${roomCode}: missing or invalid morse code / auth token.`
        );
        return;
      }
    }

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
      const existingRoom = publicRoomsRegistry.get(roomCode);
      const roomBet = existingRoom?.bet || incomingBet || 250;
      this.state.bet = roomBet;

      if (!this.state.gameState) {
        this.state.gameState = createInitialState(
          this.state.mode,
          "ONLINE",
          "KILLER",
          2,
          this.state.mode === "SECRET_SERVICE" ? 2 : 3,
          16
        );
        this.state.gameState.matchBet = roomBet;
        this.state.gameState.matchPot = roomBet * 2;
      }

      publicRoomsRegistry.set(roomCode, {
        roomCode,
        morseCode: this.getMorseCode(),
        mode: this.state.mode,
        hostName: nickname || "TV_HOST",
        status: this.state.status,
        playersCount: Object.keys(this.state.players).length,
        maxPlayers: this.getMaxPlayersForMode(this.state.mode),
        bet: roomBet,
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

    const generateToken = generateAuthToken;

    // Повторное подключение игрока: поиск по clientId или по authToken
    let existingPlayerId: string | null = null;
    if (this.state.players[clientId]) {
      existingPlayerId = clientId;
    } else if (incomingAuthToken) {
      const matchByToken = Object.values(this.state.players).find((p) =>
        this.isValidAuthToken(p, incomingAuthToken)
      );
      if (matchByToken) {
        existingPlayerId = matchByToken.clientId;
      }
    }

    // P0-2: Хост может восстановить свою сессию только при предъявлении валидного hostToken.
    const incomingHostTokenParam = url.searchParams.get("hostToken") || "";
    if (
      !existingPlayerId &&
      incomingHostTokenParam &&
      this.state.hostToken &&
      incomingHostTokenParam === this.state.hostToken
    ) {
      const hostEntry = Object.values(this.state.players).find((p) => p.isHost);
      if (hostEntry) {
        existingPlayerId = hostEntry.clientId;
        incomingAuthToken = incomingAuthToken || hostEntry.authToken || null;
      }
    }

    // SEC-NET-06: явный конфликт сессий — валидный authToken принадлежит игроку A,
    // но переданный clientId занят другим существующим игроком B.
    if (incomingAuthToken && this.state.players[clientId]) {
      const tokenOwner = Object.values(this.state.players).find((p) =>
        this.isValidAuthToken(p, incomingAuthToken)
      );
      if (tokenOwner && tokenOwner.clientId !== clientId) {
        try {
          conn.send(JSON.stringify({ type: "ERROR", message: "SESSION_CONFLICT" }));
          conn.close();
        } catch (_err) {}
        console.warn(
          `[GameRoomServer] SESSION_CONFLICT in room ${roomCode}: token owner ${tokenOwner.clientId} != requested clientId ${clientId}.`
        );
        return;
      }
    }

    if (existingPlayerId) {
      const existingPlayer = this.state.players[existingPlayerId];
      const expectedToken = existingPlayer.authToken;

      // Если у игрока зарегистрирован секретный токен, он обязан совпадать
      // (либо быть действующим предыдущим токеном в пределах окна совместимости).
      if (expectedToken && !this.isValidAuthToken(existingPlayer, incomingAuthToken)) {
        try {
          conn.send(JSON.stringify({ type: "ERROR", message: "UNAUTHORIZED_SESSION" }));
          conn.close();
        } catch (_err) {}
        return;
      }

      // SEC-NET-06: запоминаем прежний сокет ДО перепривязки, чтобы затем
      // атомарно заместить его новым соединением.
      const previousConnectionId = existingPlayer.connectionId;

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

      // SEC-NET-06: инкремент epoch и обновление connectionId делаются ДО закрытия
      // старого сокета, чтобы его последующий onClose уже видел несовпадение.
      this.state.players[clientId].connectionId = conn.id;
      this.state.players[clientId].clientType = clientType;
      this.state.players[clientId].isDisconnected = false;
      this.state.players[clientId].sessionEpoch =
        (this.state.players[clientId].sessionEpoch ?? 0) + 1;

      // Кластер 3: при каждом успешном (re)bind сессии выдаём новый authToken.
      // Прежний токен остаётся валидным в течение окна совместимости.
      const rotatedAuthToken = this.rotateAuthToken(this.state.players[clientId]);

      // SEC-NET-06: замещаем живой старый сокет новым (один authToken = один сокет).
      if (previousConnectionId && previousConnectionId !== conn.id) {
        const activeConnections: any[] = this.room?._connectionsMap
          ? Array.from(this.room._connectionsMap.values())
          : typeof this.room?.getConnections === "function"
            ? Array.from(this.room.getConnections())
            : [];
        const previousConn = activeConnections.find(
          (c) => c && c.id === previousConnectionId
        );
        if (previousConn) {
          try {
            previousConn.send?.(
              JSON.stringify({ type: "SESSION_SUPERSEDED", reason: "NEW_SESSION" })
            );
          } catch (_err) {}
          try {
            previousConn.close?.();
          } catch (_err) {}
        }
      }

      if (this.state.status === "PLAYING" && this.state.gameState?.currentTurn === this.state.players[clientId]?.role) {
        this.resumeTurnTimer();
      }

      try {
        // SEC-NET-06: индекс игрока считаем по НОВОМУ clientId (после переноса сессии),
        // а не по удалённому existingPlayerId (иначе получаем -1).
        const playerIndex = Object.keys(this.state.players).indexOf(clientId);
        const maskedSnapshot = this.state.gameState
          ? this.maskStateForPlayer(
              this.state.gameState,
              existingPlayer.role,
              existingPlayer.isHost,
              this.state.isPassAndPlay,
              playerIndex
            )
          : null;
        conn.send(
          JSON.stringify({
            type: "AUTH_TOKEN",
            authToken: rotatedAuthToken,
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
            authToken: rotatedAuthToken,
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
            authToken: rotatedAuthToken,
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

    // P0-2: В фазе PLAYING новый клиент без валидного authToken/hostToken
    // не имеет права занимать чужой активный слот игрока.
    if (this.state.status === "PLAYING") {
      const incomingHostToken = url.searchParams.get("hostToken") || "";
      const hasValidHostToken =
        Boolean(this.state.hostToken) && incomingHostToken === this.state.hostToken;
      if (!hasValidHostToken) {
        try {
          conn.send(JSON.stringify({ type: "ERROR", message: "ROOM_IN_PROGRESS" }));
          conn.close();
        } catch (_err) {}
        console.warn(
          `[GameRoomServer] Connection rejected during PLAYING: no valid auth/host token for room ${roomCode}.`
        );
        return;
      }
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

    // P0-1: isHost из query НЕ является источником правды.
    // Хостом признаётся только первый создатель комнаты либо владелец валидного hostToken.
    const hostTokenFromQuery = url.searchParams.get("hostToken") || incomingAuthToken || "";
    const hasValidHostToken = Boolean(
      this.state.hostToken && hostTokenFromQuery && hostTokenFromQuery === this.state.hostToken
    );
    const isRoomCreator = activePlayersCount === 0;
    const isAuthorizedHost = isRoomCreator || hasValidHostToken;

    if (isAuthorizedHost) {
      const authToken = generateToken();
      // P0-1: hostToken выдаётся только создателю/владельцу комнаты.
      this.state.hostToken = authToken;
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
        sessionEpoch: 1,
      };

      try {
        conn.send(
          JSON.stringify({
            type: "AUTH_TOKEN",
            authToken,
            hostToken: authToken,
            clientId,
          })
        );
      } catch (_err) {}

      this.state.isPrivate = isPrivate;
      this.state.bet = incomingBet;

      publicRoomsRegistry.set(roomCode, {
        roomCode,
        morseCode: this.getMorseCode(),
        mode,
        hostName: nickname,
        status: "WAITING",
        playersCount: 1,
        maxPlayers: 2,
        bet: incomingBet,
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
        sessionEpoch: 1,
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
      const roomBet = existingRoom?.bet || this.state.bet || incomingBet || 250;
      this.state.bet = roomBet;
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
          bet: roomBet,
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

    // SEC-NET-06: строгая защита от stale-close. Если слот уже перепривязан
    // к новому сокету, закрытие старого считается устаревшим и не должно
    // менять состояние, слать PRESENCE_CHANGED или запускать таймеры.
    if (this.state.players[clientId]?.connectionId !== conn.id) {
      return;
    }

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
      // SEC-NET-07: комната уничтожается сразу, не дожидаясь grace-таймера,
      // поэтому номер гостя нужно освободить здесь же, иначе он «зависнет» занятым.
      if (playerWhoLeft.nickname) {
        guestRegistry.releaseByCallsign(playerWhoLeft.nickname);
      }
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
          nickname: playerWhoLeft?.nickname,
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

  /**
   * Возвращает secretId активного агента SECRET_SERVICE для проверки радиуса 3x3.
   * Точно повторяет fallback из spyCatch/spyInterrogate: если тайная личность
   * отсутствует на доске или мертва — берётся первый живой персонаж.
   */
  private resolveSpyActorSecretId(): string {
    const gameState = this.state.gameState;
    if (!gameState) return "";
    const spies = gameState.spies || [];
    const activeSpyIndex = gameState.activeSpyIndex ?? 0;
    const activeSpy = spies[activeSpyIndex];
    let secretId: string | undefined = activeSpy?.secretId;
    const isOnBoard = secretId
      ? gameState.board.flat().some((c) => c.id === secretId && c.isAlive)
      : false;
    if (!isOnBoard) {
      const firstAlive = gameState.board.flat().find((c) => c.isAlive);
      if (firstAlive) secretId = firstAlive.id;
    }
    return secretId ?? "";
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

    // 2.1 Валидация действий по режимам игры и защита от читов (P0 Security)
    if (
      action.type === "SET_MATCH_POT" ||
      action.type === "RESTART_DUEL" ||
      action.type === "RESOLVE_DUEL_TIE_BREAK"
    ) {
      return { valid: false, reason: "PROHIBITED_ACTION" };
    }

    // P0-3: Режимная валидация действий — действие обязано принадлежать активному режиму.
    if (!isActionAllowedForMode(this.state.mode, action.type)) {
      return { valid: false, reason: "INVALID_ACTION_FOR_MODE" };
    }

    if (action.type === "CAPTURE_SPY" || action.type === "INTERROGATE") {
      if (this.state.mode !== "SECRET_SERVICE") {
        return { valid: false, reason: "INVALID_ACTION_FOR_MODE" };
      }
    }
    if (action.type === "TARGET_KILL") {
      if (this.state.mode !== "MANIAC_VS_OPERATIVE") {
        return { valid: false, reason: "INVALID_ACTION_FOR_MODE" };
      }
    }
    if (action.type === "STEAL" || action.type === "ROB_NEIGHBOR" || action.type === "ROB") {
      if (this.state.mode !== "THIEF_HUNT") {
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

    // 4. Серверная проверка радиуса 3x3 для пространственных действий.
    // Зеркалирует правила gameLogic: соседство по Чебышёву, без замыкания тором.
    const spatialTargetId = action.payload?.targetId || action.payload?.targetCardId;
    if (spatialTargetId && typeof spatialTargetId === "string") {
      const board = this.state.gameState.board;
      let allowed = true;

      if (action.type === "KILL_CHARACTER" || action.type === "TARGET_KILL") {
        allowed = areAdjacent(board, this.state.gameState.killerSecretId, spatialTargetId);
      } else if (
        action.type === "ROB_NEIGHBOR" ||
        action.type === "ROB" ||
        action.type === "STEAL"
      ) {
        allowed =
          areAdjacent(board, this.state.gameState.killerSecretId, spatialTargetId) ||
          spatialTargetId === this.state.gameState.killerSecretId;
      } else if (action.type === "ACCUSE" || action.type === "ARREST") {
        const detectiveSecretId = this.state.gameState.detectiveSecretId;
        allowed =
          areAdjacent(board, detectiveSecretId, spatialTargetId) ||
          spatialTargetId === detectiveSecretId;
        if (!allowed && this.state.mode === "THIEF_HUNT") {
          const officers = this.state.gameState.uniformedOfficers || [];
          allowed =
            officers.includes(spatialTargetId) ||
            officers.some((offId) => areAdjacent(board, offId, spatialTargetId));
        }
      } else if (action.type === "CAPTURE_SPY" || action.type === "INTERROGATE") {
        const actorSecretId = this.resolveSpyActorSecretId();
        allowed =
          areAdjacent(board, actorSecretId, spatialTargetId) ||
          spatialTargetId === actorSecretId;
      }
      // EXONERATE (цель из detectiveHand), LINE_UP (DUEL_*) и прочие
      // не пространственные действия радиус не проверяют.

      if (!allowed) {
        return { valid: false, reason: "TARGET_NOT_IN_RADIUS" };
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
        // SEC-NET-06: игрока определяем строго по серверному connectionId,
        // а не по клиентскому senderClientId — осиротевший сокет не должен
        // подделывать присутствие другого игрока.
        const senderClientId = this.getClientIdByConnId(sender?.id);
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
            const base = {
              ok: true,
              disambiguation: false,
              hostName: single.hostName,
              status: single.status,
              mode: single.mode,
              playersCount: single.playersCount,
              maxPlayers: single.maxPlayers,
            };
            // P0-1: приватная комната не раскрывает roomCode/morseCode.
            const resolvedPayload = single.isPrivate
              ? { ...base, isPrivate: true }
              : { ...base, roomCode: single.roomCode, morseCode: normalizeMorse(morse) };
            try {
              sender?.send(
                JSON.stringify({ type: "ROOM_RESOLVED", payload: resolvedPayload })
              );
            } catch (_) {}
            return;
          }

          if (candidates.length > 1) {
            const disambiguationPayload = {
              ok: true,
              disambiguation: true,
              morseCode: candidates.some((c) => c.isPrivate)
                ? undefined
                : normalizeMorse(morse),
              candidates: candidates.map(maskPrivateMorseCandidate),
            };
            try {
              sender?.send(
                JSON.stringify({ type: "ROOM_RESOLVED", payload: disambiguationPayload })
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
            const base = {
              ok: true,
              disambiguation: false,
              hostName: roomMeta?.hostName || "Хост",
              status: roomMeta?.status || "WAITING",
              mode: roomMeta?.mode || "MANIAC_VS_OPERATIVE",
              playersCount: roomMeta?.playersCount || 0,
              maxPlayers: roomMeta?.maxPlayers || 2,
            };
            // P0-1: приватная комната не отражает обратно roomCode/morseCode.
            const resolvedPayload = roomMeta?.isPrivate
              ? { ...base, isPrivate: true }
              : { ...base, roomCode: foundRoomCode, morseCode: morseCode || null };
            try {
              sender?.send(
                JSON.stringify({ type: "ROOM_RESOLVED", payload: resolvedPayload })
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
        action.type === "SET_MATCH_POT" ||
        action.type === "RESTART_DUEL" ||
        action.type === "RESOLVE_DUEL_TIE_BREAK"
      ) {
        console.warn(`[GameRoomServer] Blocked prohibited client action: ${action.type}`);
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
          const currentBet = this.state.bet || 250;
          this.state.gameState.matchBet = currentBet;
          this.state.gameState.matchPot = currentBet * 2;
        }
        this.broadcastStatus();
        this.broadcastState();
        try {
          const playerIndex = senderClientId ? Object.keys(this.state.players).indexOf(senderClientId) : -1;
          const masked = isTvSender
            ? this.maskStateForTv(this.state.gameState)
            : this.maskStateForPlayer(
                this.state.gameState,
                player?.role,
                player?.isHost,
                this.state.isPassAndPlay,
                playerIndex
              );
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

        const isParticipant = Boolean(
          player &&
          (player.clientType as string) !== "TV_DISPLAY" &&
          (player.role as string) !== "SPECTATOR"
        );

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
        const currentBet = this.state.bet || 250;
        const playersCount = Math.max(2, Object.keys(this.state.players).length);
        this.state.gameState.matchBet = currentBet;
        this.state.gameState.matchPot = currentBet * playersCount;
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
        const currentBet = this.state.bet || 250;
        const playersCount = Math.max(2, playerIds.length);
        this.state.gameState.matchBet = currentBet;
        this.state.gameState.matchPot = currentBet * playersCount;
        this.state.status = "PLAYING";
        this.matchStartedAt = Date.now();
        this.startTurnTimer(this.state.gameState.currentTurn || "KILLER", TURN_TIME_LIMIT_MS);
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
        this.matchStartedAt = null;
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
        this.matchStartedAt = Date.now();
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
        const currentBet = this.state.bet || 250;
        const playersCount = Math.max(2, playerKeys.length);
        this.state.gameState.matchBet = currentBet;
        this.state.gameState.matchPot = currentBet * playersCount;
        publicRoomsRegistry.delete(this.getRoomCode());
        // Запускаем серверный таймер хода при старте матча (START_MATCH),
        // а не только при рестарте ТВ.
        this.startTurnTimer(this.state.gameState.currentTurn || "KILLER", TURN_TIME_LIMIT_MS);
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
            this.matchStartedAt = Date.now();
            publicRoomsRegistry.delete(this.getRoomCode());
            // Запускаем серверный таймер хода при переходе в PLAYING по готовности
            // обоих игроков (PLAYER_READY), без ТВ-экрана.
            if (this.state.gameState) {
              this.startTurnTimer(this.state.gameState.currentTurn || "KILLER", TURN_TIME_LIMIT_MS);
            }
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
        // Текстовая причина отказа — на ТВ-дисплеи (10-foot UI).
        // Если отправитель сам ТВ, ему ответ уже ушёл выше как sender.
        if (!isTvSender) {
          this.notifyTvDisplaysOfRejection(validation.reason, action.type, sender?.id);
        }
        return;
      }

      if (action.type === "LINE_PREVIEW" || action.type === "PREVIEW_SHIFT") {
        this.broadcastRaw(JSON.stringify({ type: action.type, payload: action.payload }));
        return;
      }


      if (action.type === "CAPTURE_SPY" && this.state.mode === "SECRET_SERVICE") {
        const payload = action.payload || {};
        const targetId = payload.targetId || payload.targetCardId;
        const playerIndex = Object.keys(this.state.players).indexOf(senderClientId || "");
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
      } else if (SPATIAL_ACTIONS.has(action.type)) {
        // Страховка от «тихого» no-op: пространственное действие не изменило состояние.
        // Сообщаем только отправителю, не рассылая отказ всем игрокам.
        try {
          sender.send(
            JSON.stringify({
              type: "SYNC_ERROR",
              reason: "ACTION_NOT_APPLIED",
              actionType: action.type,
            })
          );
          sender.send(
            JSON.stringify({
              type: "ACTION_REJECTED",
              reason: "ACTION_NOT_APPLIED",
            })
          );
        } catch (_err) {}
        // Текстовая причина отказа — на ТВ-дисплеи (10-foot UI).
        if (!isTvSender) {
          this.notifyTvDisplaysOfRejection("ACTION_NOT_APPLIED", action.type, sender?.id);
        }
      }
    } catch (e) {
      console.error("Failed to handle message in GameRoomServer:", e);
    }
  }

  /**
   * Пересылает текстовую причину отказа действия на подключённые ТВ-дисплеи.
   *
   * Отправляется СТРОГО на ТВ-соединения (не сопернику и не зрителям):
   * мобильные пульты получают отказ как отправители действия, а ТВ игровых
   * действий не инициирует и без этой пересылки не узнал бы причину.
   *
   * @param reason машиночитаемый код отказа (например, TARGET_NOT_IN_RADIUS)
   * @param actionType тип отменённого действия (для диагностики/совместимости)
   * @param senderConnectionId id соединения-отправителя: если это сам ТВ,
   *        дубль не отправляем — он уже получил ответ как `sender`.
   */
  private notifyTvDisplaysOfRejection(
    reason: string,
    actionType?: string,
    senderConnectionId?: string
  ): void {
    const tvDisplays = Object.values(this.state.tvDisplays || {});
    if (tvDisplays.length === 0) return;

    const tvConnectionIds = new Set(
      tvDisplays
        .map((tv) => tv?.connectionId)
        .filter((id): id is string => typeof id === "string")
    );
    if (tvConnectionIds.size === 0) return;

    const connections: any[] = this.room?._connectionsMap
      ? Array.from(this.room._connectionsMap.values())
      : this.room?.getConnections
        ? Array.from(this.room.getConnections() as any)
        : [];
    if (connections.length === 0) return;

    const payload = JSON.stringify({
      type: "ACTION_REJECTED",
      reason,
      ...(actionType ? { actionType } : {}),
    });

    for (const conn of connections) {
      if (!conn || typeof conn.id !== "string") continue;
      if (!tvConnectionIds.has(conn.id)) continue;
      if (senderConnectionId && conn.id === senderConnectionId) continue;
      try {
        conn.send(payload);
      } catch (_err) {
        // Один сломанный ТВ-коннект не должен мешать остальным.
      }
    }
  }

  broadcastStatus(): void {
    const sanitizedPlayers: Record<
      string,
      Omit<PlayerInfo, "authToken" | "previousAuthToken" | "previousAuthTokenExpiresAt">
    > = {};
    for (const [id, p] of Object.entries(this.state.players)) {
      const { authToken, previousAuthToken, previousAuthTokenExpiresAt, ...rest } = p;
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
    if (state.winner || this.state.status === "FINISHED") {
      const unmasked: any = { ...state };
      if (unmasked.killerSecretId) {
        unmasked.killerId = unmasked.killerSecretId;
        unmasked.criminalId = unmasked.killerSecretId;
      }
      if (unmasked.detectiveSecretId) {
        unmasked.detectiveId = unmasked.detectiveSecretId;
      }
      if (this.matchStartedAt) {
        const elapsedSec = Math.max(0, Math.floor((Date.now() - this.matchStartedAt) / 1000));
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        unmasked.elapsedTime = `${mins}:${secs}`;
        unmasked.matchDuration = unmasked.elapsedTime;
      }
      if (!unmasked.turnCount) {
        unmasked.turnCount =
          unmasked.turnNumber ||
          unmasked.history?.length ||
          (unmasked.log ? Math.max(1, Math.floor(unmasked.log.length / 2)) : 1);
      }
      return unmasked;
    }

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

  /**
   * Кластер 3: токен валиден, если он текущий либо действующий предыдущий
   * в пределах окна совместимости после ротации. Истёкший предыдущий токен
   * очищается лениво, чтобы состояние не разрасталось.
   */
  private isValidAuthToken(player: PlayerInfo, token: string | null | undefined): boolean {
    if (!token) return false;
    if (player.authToken && token === player.authToken) return true;
    if (player.previousAuthToken && token === player.previousAuthToken) {
      if (player.previousAuthTokenExpiresAt && player.previousAuthTokenExpiresAt > Date.now()) {
        return true;
      }
      delete player.previousAuthToken;
      delete player.previousAuthTokenExpiresAt;
    }
    return false;
  }

  /**
   * Кластер 3: ротация authToken при успешном (re)bind сессии.
   * Прежний токен сохраняется как previousAuthToken с окном совместимости.
   */
  private rotateAuthToken(player: PlayerInfo): string {
    const nextToken = generateAuthToken();
    if (player.authToken) {
      player.previousAuthToken = player.authToken;
      player.previousAuthTokenExpiresAt = Date.now() + AUTH_TOKEN_ROTATION_GRACE_MS;
    } else {
      delete player.previousAuthToken;
      delete player.previousAuthTokenExpiresAt;
    }
    player.authToken = nextToken;
    return nextToken;
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
    // SEC-NET-07: при остановке сервера номера всех оставшихся гостей
    // должны быть возвращены в реестр, иначе они утекают навсегда.
    for (const player of Object.values(this.state.players)) {
      if (player?.nickname) {
        guestRegistry.releaseByCallsign(player.nickname);
      }
    }
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
  if (role && role !== "SPECTATOR") {
    copy.playerRole = role;
  }
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
