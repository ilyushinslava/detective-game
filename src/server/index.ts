const activeRooms = new Map<string, any>();
import type { Room, Server, Connection } from "partykit/server";
import { gameReducer } from "../utils/gameReducer";
import { createInitialState } from "../utils/gameLogic";
import type { GameState, GameAction, GameModeType, PlayerRole } from "../types/game";

interface PlayerMeta {
  clientId: string;
  connId: string;
  nickname: string;
  role: PlayerRole;
  isHost: boolean;
  connected: boolean;
}

interface RoomData {
  code: string;
  mode: GameModeType;
  hostName: string;
  players: Record<string, PlayerMeta>;
  gameState: GameState | null;
  status: "WAITING" | "READY_TO_START" | "PLAYING" | "FINISHED";
}

function maskStateForPlayer(rawState: GameState, playerRole: string): GameState {
  if (!rawState) return rawState;
  const clone: GameState = JSON.parse(JSON.stringify(rawState));
  clone.playerRole = playerRole as any;

  if (clone.mode === "SECRET_SERVICE") {
    if (Array.isArray(clone.spies)) {
      const mySpyIndex = playerRole === "KILLER" ? 0 : playerRole === "DETECTIVE" ? 1 : -1;
      clone.spies = clone.spies.map((s: any, idx: number) => {
        if (idx !== mySpyIndex) {
          return { ...s, secretId: "" };
        }
        return s;
      });
    }
    return clone;
  }

  // Для Бандита (KILLER) скрываем тайную личность Сыщика (DETECTIVE)
  if (playerRole === "KILLER") {
    clone.detectiveSecretId = "" as any;
  } else {
    // Для Сыщика (DETECTIVE) скрываем тайную личность Бандита и его карты на руке
    clone.killerSecretId = "" as any;
    if (Array.isArray(clone.killerHand)) {
      clone.killerHand = clone.killerHand.map(() => "???");
    }
  }

  return clone;
}

export default class GameRoomServer implements Server {
  static async onFetch(req: Request, lobby: { rooms: any }): Promise<Response> {
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers });
    const waitingRooms = Array.from(activeRooms.values()).filter((r: any) => r.status === "WAITING");
    return new Response(JSON.stringify(waitingRooms), { headers });
  }

  cleanupTimeout: any = null;
  readyClients: Set<string> = new Set();
  room: Room;
  state: RoomData;

  constructor(room: Room) {
    this.room = room;
    this.state = {
      code: room.id,
      mode: "SKHVATKA",
      hostName: "Агент 1",
      players: {},
      gameState: null,
      status: "WAITING",
    };
  }

  onConnect(conn: Connection, ctx: { request: Request }) {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
    const url = new URL(ctx.request.url);
    const clientId = url.searchParams.get("clientId") || conn.id;
    const nickname = url.searchParams.get("nickname") || "Агент";
    const mode = (url.searchParams.get("mode") as GameModeType) || "SKHVATKA";
    const isHostAttempt = url.searchParams.get("isHost") === "true";

    let player = this.state.players[clientId];

    if (player) {
      player.connId = conn.id;
      player.connected = true;
    } else {
      const activeCount = Object.keys(this.state.players).length;
      if (activeCount === 0 && !isHostAttempt) {
        conn.send(JSON.stringify({ type: "ERROR", message: "ROOM_NOT_FOUND" }));
        conn.close();
        return;
      }

      player = {
        clientId,
        connId: conn.id,
        nickname,
        role: isHostAttempt ? "KILLER" : "DETECTIVE",
        isHost: isHostAttempt,
        connected: true,
      };
      this.state.players[clientId] = player;

      if (isHostAttempt) {
        this.state.hostName = nickname;
        this.state.mode = mode;
        if (this.room.id !== "main" && this.room.id !== "registry") {
          activeRooms.set(this.room.id, {
            roomCode: this.room.id,
            mode: this.state.mode,
            hostName: this.state.hostName,
            status: "WAITING",
            playersCount: 1,
            maxPlayers: this.state.mode === 'SECRET_SERVICE' ? 4 : 2,
            bet: 250,
          });
        }
      }
    }

    const connectedList = Object.values(this.state.players).filter((p) => p.connected);

    if (connectedList.length >= 2) {
      this.room.broadcast(JSON.stringify({
        type: "PRESENCE_CHANGED",
        connected: true,
      }));

      if (this.state.status === "WAITING") {
        this.state.status = "READY_TO_START";
        this.state.gameState = createInitialState(
          this.state.mode,
          "ONLINE",
          "KILLER",
          this.state.mode === "SECRET_SERVICE" ? 2 : 2,
          this.state.mode === "SECRET_SERVICE" ? 4 : 3,
          0,
          0
        );

        const meta = activeRooms.get(this.room.id);
        if (meta) {
          meta.status = "READY_TO_START";
          meta.playersCount = connectedList.length;
        }

        this.room.broadcast(JSON.stringify({ type: "ROOM_STATUS", status: "READY_TO_START" }));
      }

      this.broadcastState();
      this.broadcastSync();
    } else {
      conn.send(JSON.stringify({
        type: "SYNC_STATE",
        gameState: this.state.gameState ? maskStateForPlayer(this.state.gameState, player.role) : null,
        status: this.state.status,
        role: player.role,
        mode: this.state.mode,
      }));
      this.broadcastSync();
    }
  }

  onClose(conn: Connection) {
    const player = Object.values(this.state.players).find(p => p.connId === conn.id);
    if (player) {
      player.connected = false;
      this.room.broadcast(JSON.stringify({
        type: "PRESENCE_CHANGED",
        connected: false,
        disconnectedClientId: player.clientId,
      }));
    }

    const activeConnections = Array.from(this.room.getConnections()).length;
    if (activeConnections === 0) {
      activeRooms.delete(this.room.id);
      if (this.cleanupTimeout) {
        clearTimeout(this.cleanupTimeout);
      }
      this.cleanupTimeout = setTimeout(() => {
        const stillConnected = Object.values(this.state.players).filter((p) => p.connected).length;
        if (stillConnected === 0) {
          this.state.players = {};
          this.state.gameState = null;
          this.state.status = "WAITING";
          this.readyClients.clear();
        }
        this.cleanupTimeout = null;
      }, 45000);
    }
  }

  onRequest(req: Request): Response | Promise<Response> {
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers });
    const waitingRooms = Array.from(activeRooms.values()).filter((r: any) => r.status === "WAITING");
    return new Response(JSON.stringify(waitingRooms), { headers });
  }

  onMessage(message: string, sender: Connection) {
    try {
      const action = JSON.parse(message) as GameAction;

      const player = (action as any).senderClientId
        ? this.state.players[(action as any).senderClientId]
        : Object.values(this.state.players).find(p => p.connId === sender.id);

      if (action && action.type === "PLAYER_READY") {
        const cId = player ? player.clientId : (action as any).senderClientId || sender.id;
        this.readyClients.add(cId);

        if (this.readyClients.size >= 2) {
          this.state.status = "PLAYING";
          const activeMeta = activeRooms.get(this.room.id);
          if (activeMeta) activeMeta.status = "PLAYING";

          this.room.broadcast(JSON.stringify({ type: "ALL_PLAYERS_READY" }));
          this.broadcastState();
          this.broadcastSync();
        }
        return;
      }

      if (action.type === "REQUEST_RESTART") {
        if (this.state.gameState) {
          this.state.gameState.restartRequestedBy = (action as any).payload?.requestedBy;
          this.broadcastState();
        }
        return;
      }

      if (action.type === "REJECT_RESTART") {
        if (this.state.gameState) {
          this.state.gameState.restartRequestedBy = null;
          this.broadcastState();
        }
        return;
      }

      if (action.type === "CONFIRM_RESTART" || action.type === "RESTART_GAME") {
        this.state.gameState = createInitialState(
          this.state.mode,
          "ONLINE",
          "KILLER",
          this.state.mode === "SECRET_SERVICE" ? 2 : 2,
          this.state.mode === "SECRET_SERVICE" ? 4 : 3,
          0,
          0
        );
        this.state.status = "PLAYING";
        this.readyClients.clear();
        for (const p of Object.values(this.state.players)) {
          this.readyClients.add(p.clientId);
        }
        this.room.broadcast(JSON.stringify({
          type: "MATCH_STARTED",
          payload: { state: this.state.gameState },
        }));
        this.broadcastState();
        this.broadcastSync();
        return;
      }

      if (!this.state.gameState || this.state.status !== "PLAYING") {
        return;
      }

      const playerRole = player ? player.role : ((action as any).senderRole || (action as any).role);

      if (action.type === "SET_INSPECTOR_ROLE" || action.type === "CLEANUP") {
        this.state.gameState = gameReducer(this.state.gameState, action as any);
        this.broadcastState();
        return;
      }

      if (playerRole && this.state.mode !== "SECRET_SERVICE" && this.state.mode !== "LINE_UP") {
        if (playerRole !== this.state.gameState.currentTurn) {
          console.warn("[RoomServer] Move rejected: wrong turn", playerRole, "expected", this.state.gameState.currentTurn);
          const conn = this.room.getConnection(sender.id);
          if (conn && player) {
            conn.send(JSON.stringify({
              type: "SYNC_STATE",
              gameState: maskStateForPlayer(this.state.gameState, player.role),
              status: this.state.status,
              role: player.role,
              mode: this.state.mode,
            }));
          }
          return;
        }
      }

      const normalizedAction = { ...action, senderId: "server" };
      this.state.gameState = gameReducer(this.state.gameState, normalizedAction as any);

      if (this.state.gameState.winner) {
        this.state.status = "FINISHED";
      }

      this.broadcastState();
    } catch (err) {
      console.error("[RoomServer] Error handling message:", err);
    }
  }

  private broadcastState() {
    if (!this.state.gameState) return;
    const connections = Array.from(this.room.getConnections());
    for (const conn of connections) {
      const url = new URL(conn.url || "", "http://localhost");
      const connClientId = url.searchParams.get("clientId");
      const player = (connClientId && this.state.players[connClientId])
        || Object.values(this.state.players).find((p) => p.connId === conn.id);

      if (player) {
        const masked = maskStateForPlayer(this.state.gameState, player.role);
        conn.send(JSON.stringify({
          type: "SYNC_STATE",
          gameState: masked,
          status: this.state.status,
          role: player.role,
          mode: this.state.mode,
        }));
      }
    }
  }

  private broadcastSync() {
    this.room.broadcast(JSON.stringify({
      type: "ROOM_STATUS",
      status: this.state.status,
      mode: this.state.mode,
      hostName: this.state.hostName,
      playersCount: Object.values(this.state.players).filter((p) => p.connected).length,
    }));
  }
}
