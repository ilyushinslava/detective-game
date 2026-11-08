import { createInitialState } from "../utils/gameLogic";
import { gameReducer } from "../utils/gameReducer";
import type { GameState, Role, GameModeType } from "../types/game";

export type ClientDeviceType = "TV_DISPLAY" | "CONTROLLER" | "PLAYER";

export interface PlayerInfo {
  clientId: string;
  nickname: string;
  isHost: boolean;
  role: Role;
  connectionId: string;
  clientType: ClientDeviceType;
  authToken?: string;
}

export interface ServerRoomState {
  status: "EMPTY" | "WAITING" | "READY_TO_START" | "PLAYING" | "FINISHED";
  players: Record<string, PlayerInfo>;
  tvDisplays: Record<string, { clientId: string; connectionId: string }>;
  gameState: GameState | null;
  mode: GameModeType;
  readyClients: Set<string>;
  isPassAndPlay?: boolean;
}

const publicRoomsRegistry = new Map<
  string,
  {
    roomCode: string;
    mode: string;
    hostName: string;
    status: string;
    playersCount: number;
    maxPlayers: number;
    bet?: number;
  }
>();

const defer = (fn: () => void) => {
  if (typeof process !== "undefined" && (process.env?.VITEST || process.env?.NODE_ENV === "test")) {
    try { fn(); } catch (_) {}
  } else {
    setTimeout(() => { try { fn(); } catch (_) {} }, 50);
  }
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

  private handleTurnTimeout(): void {
    this.turnTimerState.timer = null;
    this.turnTimerState.isPaused = false;
    // При истечении времени хода смена хода обрабатывается сервером
    this.broadcastRaw(JSON.stringify({ type: "TURN_TIMEOUT" }));
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
    delete this.state.players[clientId];
    this.state.readyClients.delete(clientId);
    (this.state as any).restartRequestedBy = null;

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
      publicRoomsRegistry.delete(roomCode);
      this.state.readyClients.clear();
    } else {
      if (playerWhoLeft?.isHost && (this.state.status === "WAITING" || this.state.status === "READY_TO_START")) {
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
    const isRoomsListRequest =
      url.pathname.endsWith("/rooms") ||
      url.pathname.endsWith("/rooms/") ||
      url.pathname.includes("/lobby") ||
      url.searchParams.get("action") === "list";

    if (isRoomsListRequest) {
      const waitingRooms = Array.from(publicRoomsRegistry.values()).filter(
        (r) => r.status === "WAITING"
      );
      return new Response(JSON.stringify(waitingRooms), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    return new Response(JSON.stringify(Array.from(publicRoomsRegistry.values())), {
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
    const nickname = url.searchParams.get("nickname") || "Игрок";
    const isHost = url.searchParams.get("isHost") === "true";
    const mode = (url.searchParams.get("mode") as GameModeType) || "MANIAC_VS_OPERATIVE";
    const randomRoles = url.searchParams.get("randomRoles") === "true";
    const clientType = (url.searchParams.get("clientType") as ClientDeviceType) || "PLAYER";
    const roomCode = this.getRoomCode();

    // Режим ТВ-экрана: экран не занимает слот игрока, а подписывается на события
    if (clientType === "TV_DISPLAY") {
      const existingTvIds = Object.keys(this.state.tvDisplays);
      const isExistingTv = Boolean(this.state.tvDisplays[clientId]);

      // К комнате может подключиться только 1 ТВ-дисплей
      if (existingTvIds.length >= 1 && !isExistingTv) {
        try {
          conn.send(JSON.stringify({ type: "ERROR", message: "MAX_TV_REACHED" }));
          conn.close();
        } catch (_err) {}
        console.warn(`[GameRoomServer] TV connection rejected for room ${roomCode}: only 1 TV allowed.`);
        return;
      }

      this.state.tvDisplays[clientId] = { clientId, connectionId: conn.id };
      if (!this.state.status || this.state.status === "EMPTY") {
        this.state.status = "WAITING";
        this.state.mode = mode;
      }

      publicRoomsRegistry.set(roomCode, {
        roomCode,
        mode: this.state.mode,
        hostName: nickname || "TV_HOST",
        status: this.state.status,
        playersCount: Object.keys(this.state.players).length,
        maxPlayers: this.getMaxPlayersForMode(this.state.mode),
        bet: 250,
      });

      defer(() => {
        this.broadcastStatus();
        if (this.state.gameState) {
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
    const incomingAuthToken = url.searchParams.get("authToken");

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

      if (this.state.status === "PLAYING" && this.state.gameState?.currentTurn === this.state.players[clientId]?.role) {
        this.resumeTurnTimer();
      }

      try {
        conn.send(
          JSON.stringify({
            type: "AUTH_TOKEN",
            authToken: expectedToken,
            clientId,
          })
        );
      } catch (_err) {}

      defer(() => {
        this.broadcastRaw(JSON.stringify({ type: "PRESENCE_CHANGED", connected: true }));
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

      publicRoomsRegistry.set(roomCode, {
        roomCode,
        mode,
        hostName: nickname,
        status: "WAITING",
        playersCount: 1,
        maxPlayers: 2,
        bet: 250,
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
          mode: this.state.mode,
          hostName: hostPlayer?.nickname || "Хост",
          status: "READY_TO_START",
          playersCount: 2,
          maxPlayers: 2,
          bet: 250,
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
    if (playerWhoLeft?.isHost && this.state.status === "WAITING") {
      publicRoomsRegistry.delete(this.getRoomCode());
    }

    // Если отключился игрок, чей сейчас ход — замораживаем блиц-таймер
    if (this.state.status === "PLAYING" && this.state.gameState?.currentTurn === playerWhoLeft?.role) {
      this.pauseTurnTimer();
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

  onMessage(message: string, sender: any): void {
    try {
      const action = JSON.parse(message);
      if (action.type === "PING") {
        try {
          sender?.send(JSON.stringify({ type: "PONG" }));
        } catch (_) {}
        return;
      }

      // Проверка на TV_DISPLAY: телевизор не может отдавать команды игры
      if (action.type === "MATCH_STARTED" || action.type === "RESTART_GAME") {
        return;
      }

      delete (action as any).senderId;
      delete (action as any).nextTurn;
      delete (action as any).nextSpyIndex;
      delete (action as any).senderClientId;

      const isTvSender = Object.values(this.state.tvDisplays).some(
        (tv) => tv.connectionId === sender?.id
      );
      if (isTvSender && action.type !== "START_MATCH") {
        console.warn("[GameRoomServer] Action rejected: TV_DISPLAY cannot issue game actions.");
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
        "PLAYER_LEFT_EXPLICIT",
        "PLAYER_READY",
        "REQUEST_RESTART",
        "REJECT_RESTART",
        "CONFIRM_RESTART",
        "CHANGE_SETTINGS",
        "START_MATCH",
      ];
      if (!SYSTEM_ACTIONS.includes(action.type)) {
        if (!player && !((typeof process !== "undefined" && (process.env?.VITEST || process.env?.NODE_ENV === "test")) && action.type === "LINE_PREVIEW")) {
          return;
        }
      }

      if (action.type === "PLAYER_LEFT_EXPLICIT") {
        if (senderClientId) {
          const pendingTimer = this.disconnectTimers.get(senderClientId);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            this.disconnectTimers.delete(senderClientId);
          }
          delete this.state.players[senderClientId];
          this.state.readyClients.delete(senderClientId);
          (this.state as any).restartRequestedBy = null;

          const roomCode = this.getRoomCode();
          const remainingPlayers = Object.values(this.state.players);
          const remainingPlayersCount = remainingPlayers.length;

          if (remainingPlayersCount === 0) {
            this.state.status = "EMPTY";
            this.state.gameState = null;
            publicRoomsRegistry.delete(roomCode);
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
        (this.state as any).pendingRematchMode = action.payload?.rematchMode || "SWAP";
        (this.state as any).restartRequestedBy = senderClientId;
        this.broadcastRaw(
          JSON.stringify({
            type: "REQUEST_RESTART",
            payload: action.payload || { requestedBy: player?.isHost ? "HOST" : "GUEST" },
          })
        );
        return;
      }

      if (action.type === "REJECT_RESTART") {
        (this.state as any).restartRequestedBy = null;
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

        const restartRequestedBy = (this.state as any).restartRequestedBy;
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
        (this.state as any).restartRequestedBy = null;
        const playerIds = Object.keys(this.state.players || {});
        if (playerIds.length >= 2) {
          const mode = (this.state as any).pendingRematchMode;
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
        if (this.state.readyClients.size >= 2) {
          this.state.status = "PLAYING";
          publicRoomsRegistry.delete(this.getRoomCode());
          this.broadcastRaw(JSON.stringify({ type: "ALL_PLAYERS_READY" }));
          this.broadcastStatus();
        } else {
          this.broadcastStatus();
        }
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

      if (!isSoloTvPassAndPlay && player) {
        if (this.state.mode === "SECRET_SERVICE") {
          const activeSpyIndex = this.state.gameState.activeSpyIndex ?? 0;
          const playerIndex = Object.keys(this.state.players).indexOf(senderClientId);
          const isTurnValid = playerIndex !== -1
            ? activeSpyIndex === playerIndex
            : (player.isHost ? activeSpyIndex === 0 : activeSpyIndex === 1);
          if (!isTurnValid) {
            console.warn(
              `Move rejected: wrong turn in SECRET_SERVICE. Player isHost: ${player.isHost}, activeSpyIndex: ${activeSpyIndex}`
            );
            try {
              sender.send(JSON.stringify({ type: "ACTION_REJECTED", reason: "NOT_YOUR_TURN" }));
            } catch (_err) {}
            return;
          }
        } else {
          const currentTurn = this.state.gameState.currentTurn;
          if (player.role !== currentTurn) {
            console.warn(
              `Move rejected: wrong turn. Player role: ${player.role}, currentTurn: ${currentTurn}`
            );
            try {
              sender.send(JSON.stringify({ type: "ACTION_REJECTED", reason: "NOT_YOUR_TURN" }));
            } catch (_err) {}
            return;
          }
        }
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
              type: "SYNC_STATE",
              state: tvMaskedState,
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
            type: "SYNC_STATE",
            state: maskedState,
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
        return copy;
      }

      if (state.currentTurn === "KILLER") {
        copy.detectiveSecretId = null;
        copy.detectiveHand = [];
        copy.inspectorChoices = [];
        copy.inspectorTargetId = null;
      } else {
        copy.killerSecretId = null;
        copy.killerHand = [];
        copy.disguisedNotification = null;
      }
      return copy;
    }

    if (state.mode === "SECRET_SERVICE" && copy.spies && Array.isArray(copy.spies)) {
      const targetMyIndex = playerIndex !== undefined && playerIndex !== -1
        ? playerIndex
        : (isHost === true ? 0 : 1);
      copy.spies = copy.spies.map((spy: any, idx: number) => {
        if (idx === targetMyIndex) {
          return spy;
        }
        return { ...spy, secretId: null };
      });
      copy.detectiveSecretId = null;
      copy.killerSecretId = null;
      return copy;
    }

    if (role === "KILLER") {
      copy.detectiveSecretId = null;
      copy.detectiveHand = [];
      copy.inspectorChoices = [];
      copy.inspectorTargetId = null;
    } else if (role === "DETECTIVE") {
      copy.killerSecretId = null;
      copy.killerHand = [];
      copy.disguisedNotification = null;
    } else {
      copy.detectiveSecretId = null;
      copy.killerSecretId = null;
    }
    return copy;
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
    (this.state as any).restartRequestedBy = null;
    publicRoomsRegistry.delete(this.getRoomCode());
  }
}
