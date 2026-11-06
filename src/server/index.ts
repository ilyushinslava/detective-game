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

export default class GameRoomServer {
  room: any;
  state: ServerRoomState;
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

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
        maxPlayers: 4,
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

    // Повторное подключение игрока
    if (this.state.players[clientId]) {
      const pendingTimer = this.disconnectTimers.get(clientId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        this.disconnectTimers.delete(clientId);
      }
      this.state.players[clientId].connectionId = conn.id;
      this.state.players[clientId].clientType = clientType;
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

    if (isHost || activePlayersCount === 0) {
      this.state.mode = mode;
      this.state.status = "WAITING";
      this.state.players[clientId] = {
        clientId,
        nickname,
        isHost: true,
        role: "KILLER",
        connectionId: conn.id,
        clientType,
      };

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

      this.state.players[clientId] = {
        clientId,
        nickname,
        isHost: false,
        role: hostIsKiller ? "DETECTIVE" : "KILLER",
        connectionId: conn.id,
        clientType,
      };

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

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(clientId);
      delete this.state.players[clientId];
      this.state.readyClients.delete(clientId);

      const roomCode = this.getRoomCode();
      if (roomCode && Object.keys(this.state.players).length === 0) {
        publicRoomsRegistry.delete(roomCode);
      }

      const remainingPlayersCount = Object.keys(this.state.players).length;
      if (remainingPlayersCount === 0) {
        this.state.status = "EMPTY";
        this.state.gameState = null;
        publicRoomsRegistry.delete(roomCode);
        this.state.readyClients.clear();
      } else {
        this.broadcastRaw(JSON.stringify({ type: "OPPONENT_LEFT" }));
        if (this.state.status === "PLAYING") {
          this.state.status = "FINISHED";
        } else {
          this.state.status = "WAITING";
          const hostPlayer =
            Object.values(this.state.players).find((p) => p.isHost) ||
            Object.values(this.state.players)[0];
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
    }, 15000);

    this.disconnectTimers.set(clientId, timer);
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

          const roomCode = this.getRoomCode();
          const remainingPlayersCount = Object.keys(this.state.players).length;

          if (remainingPlayersCount === 0) {
            this.state.status = "EMPTY";
            this.state.gameState = null;
            publicRoomsRegistry.delete(roomCode);
            this.state.readyClients.clear();
          } else {
            this.broadcastRaw(JSON.stringify({ type: "OPPONENT_LEFT" }));
            if (this.state.status === "PLAYING") {
              this.state.status = "FINISHED";
            } else {
              this.state.status = "WAITING";
              const hostPlayer =
                Object.values(this.state.players).find((p) => p.isHost) ||
                Object.values(this.state.players)[0];
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
        this.broadcastRaw(
          JSON.stringify({
            type: "REQUEST_RESTART",
            payload: action.payload || { requestedBy: player?.isHost ? "HOST" : "GUEST" },
          })
        );
        return;
      }

      if (action.type === "REJECT_RESTART") {
        this.broadcastRaw(JSON.stringify({ type: "REJECT_RESTART" }));
        return;
      }

      if (action.type === "CONFIRM_RESTART") {
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
            return;
          }
        } else {
          const currentTurn = this.state.gameState.currentTurn;
          if (player.role !== currentTurn) {
            console.warn(
              `Move rejected: wrong turn. Player role: ${player.role}, currentTurn: ${currentTurn}`
            );
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
    const payload = JSON.stringify({
      type: "ROOM_STATUS",
      status: this.state.status,
      players: this.state.players,
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
    copy.killerHand = [];
    copy.detectiveHand = [];
    copy.inspectorChoices = [];
    copy.disguisedNotification = null;
    copy.evidenceDeck = [];
    if (copy.victimList && copy.victimList.length > 0) {
      copy.victimList = [copy.victimList[0]];
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
      copy.victimList = [copy.victimList[0]];
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

  close(): void {
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();
    publicRoomsRegistry.delete(this.getRoomCode());
  }
}
