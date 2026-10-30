import type { Role } from "../types/game";
import type { GameAction } from "../types/multiplayer";
import { GAME_CONFIG } from "../config/gameConfig";

class PartyService {
  roomCode: string = "";
  myClientId: string = "local-stub";
  isHost: boolean = true;
  lastSyncedState: any = null;
  socket: WebSocket | null = null;
  private nick: string = "Агент";
  private mode: string = "SKHVATKA";
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isExplicitDisconnect: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private queuedActions: GameAction[] = [];
  private failedAttempts: number = 0;

  resolveEndpoints(): { wsProtocol: string; httpProtocol: string; host: string } {
    const fallbackHost = GAME_CONFIG.NETWORK.FALLBACK_GATEWAYS[0] || "detective-game-haxi.onrender.com";
    const rawHost = (import.meta.env?.VITE_WS_GATEWAY || import.meta.env?.VITE_PARTYKIT_HOST)?.trim();
    if (rawHost) {
      const isSecure = rawHost.startsWith("https://") || rawHost.startsWith("wss://");
      const cleanHost = rawHost.replace(/^(https?:\/\/|wss?:\/\/)/, "");
      return {
        wsProtocol: isSecure ? "wss:" : "ws:",
        httpProtocol: isSecure ? "https:" : "http:",
        host: cleanHost,
      };
    }

    if (this.failedAttempts >= 2) {
      return {
        wsProtocol: "wss:",
        httpProtocol: "https:",
        host: fallbackHost,
      };
    }

    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const isDevEnv = Boolean(import.meta.env?.DEV);
      const isLocalHostOrLan =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.endsWith(".local");

      if (isDevEnv && isLocalHostOrLan) {
        return {
          wsProtocol: "ws:",
          httpProtocol: "http:",
          host: `${hostname}:${GAME_CONFIG.NETWORK.DEFAULT_DEV_PORT}`,
        };
      }
    }

    return {
      wsProtocol: "wss:",
      httpProtocol: "https:",
      host: fallbackHost,
    };
  }

  onSyncState: ((state: any, role?: Role, status?: string) => void) | null = null;
  onRoomStatus: ((status: any) => void) | null = null;
  onAllPlayersReady: (() => void) | null = null;
  onAction: ((action: any) => void) | null = null;
  onPresenceChanged: ((connected: boolean) => void) | null = null;

  connect(
    roomCode: string,
    nickname: string,
    isHost: boolean,
    mode: string,
    clientId?: string
  ): void {
    if (this.socket) {
      this.disconnect();
    }

    this.roomCode = roomCode;
    this.isHost = isHost;
    this.nick = nickname || "Агент";
    this.mode = mode || "SKHVATKA";
    this.myClientId = clientId || `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.isExplicitDisconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (typeof window === "undefined" || typeof WebSocket === "undefined") {
      return;
    }

    const { wsProtocol, host } = this.resolveEndpoints();

    const encodedNick = encodeURIComponent(this.nick);
    const url = `${wsProtocol}//${host}/party/${roomCode}?clientId=${this.myClientId}&nickname=${encodedNick}&isHost=${this.isHost}&mode=${this.mode}&randomRoles=true`;

    try {
      const ws = new WebSocket(url);
      this.socket = ws;

      ws.onopen = () => {
        if (this.socket === ws) {
          this.failedAttempts = 0;
          this.reconnectAttempts = 0;
          this.onPresenceChanged?.(true);
          this.stopHeartbeat();
          this.pingInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
              this.socket.send(JSON.stringify({ type: "PING" }));
            }
          }, GAME_CONFIG.NETWORK.RECONNECT.HEARTBEAT_INTERVAL_MS);

          while (this.queuedActions.length > 0) {
            const queuedAction = this.queuedActions.shift();
            if (queuedAction) {
              this.sendAction(queuedAction);
            }
          }
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (!data || typeof data !== "object") return;

          if (data.type === "PONG") {
            return;
          }

          if (data.type === "SYNC_STATE") {
            this.lastSyncedState = data.state;
            this.onSyncState?.(data.state, data.role, data.status);
            return;
          }

          if (data.type === "ROOM_STATUS") {
            this.onRoomStatus?.(data);
            return;
          }

          if (data.type === "ALL_PLAYERS_READY") {
            this.onAllPlayersReady?.();
            this.onAction?.(data);
            return;
          }

          if (data.type === "OPPONENT_LEFT") {
            this.onPresenceChanged?.(false);
            this.onAction?.(data);
            return;
          }

          this.onAction?.(data);
        } catch (err) {
          console.warn("[PartyService] Failed to parse message:", err);
        }
      };

      ws.onclose = () => {
        if (this.socket === ws) {
          this.stopHeartbeat();
          this.socket = null;
          this.onPresenceChanged?.(false);

          if (!this.isExplicitDisconnect && this.roomCode && this.reconnectAttempts < GAME_CONFIG.NETWORK.RECONNECT.MAX_ATTEMPTS) {
            this.reconnectAttempts++;
            const delay = Math.min(
              GAME_CONFIG.NETWORK.RECONNECT.INITIAL_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1),
              GAME_CONFIG.NETWORK.RECONNECT.MAX_DELAY_MS
            );
            this.reconnectTimeout = setTimeout(() => {
              if (!this.isExplicitDisconnect && this.roomCode) {
                this.connect(this.roomCode, this.nick, this.isHost, this.mode, this.myClientId);
              }
            }, delay);
          }
        }
      };

      ws.onerror = (err) => {
        this.failedAttempts++;
        console.warn("[PartyService] WebSocket error:", err);
      };
    } catch (err) {
      console.error("[PartyService] Connection failed:", err);
    }
  }

  ensureConnection(): void {
    if (!this.roomCode) return;

    if (
      !this.socket ||
      this.socket.readyState === WebSocket.CLOSED ||
      this.socket.readyState === WebSocket.CLOSING
    ) {
      console.log("[PartyService] Reconnecting due to visibility resume...");
      this.connect(this.roomCode, this.nick, this.isHost, this.mode, this.myClientId);
    } else if (this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: "PING" }));
      } catch (err) {
        console.warn("[PartyService] Ping failed on ensureConnection, reconnecting...", err);
        this.connect(this.roomCode, this.nick, this.isHost, this.mode, this.myClientId);
      }
    }
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect(): void {
    this.isExplicitDisconnect = true;
    this.reconnectAttempts = 0;
    this.failedAttempts = 0;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.queuedActions = [];
    this.stopHeartbeat();
    if (this.socket) {
      try {
        this.socket.close();
      } catch (err) {
        console.warn("[PartyService] Error closing socket:", err);
      }
      this.socket = null;
    }
    this.roomCode = "";
    this.lastSyncedState = null;
    this.onPresenceChanged?.(false);
  }

  sendAction(action: GameAction): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        const payload = {
          ...action,
          senderClientId: this.myClientId,
        };
        this.socket.send(JSON.stringify(payload));
      } catch (err) {
        console.error("[PartyService] Failed to send action:", err);
      }
      return;
    }

    if (this.roomCode || (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.CLOSING))) {
      if (this.queuedActions.length >= 20) {
        this.queuedActions.shift();
      }
      this.queuedActions.push(action);
      return;
    }

    console.warn("[PartyService] Socket is not open and no active room, action dropped:", action?.type);
  }

  async fetchPublicRooms(): Promise<any[]> {
    if (typeof window === "undefined" || typeof fetch === "undefined") {
      return [];
    }
    const { httpProtocol, host } = this.resolveEndpoints();

    try {
      const res = await fetch(`${httpProtocol}//${host}/parties/main/lobby?action=list`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {
      // fallback
    }
    return [];
  }
}

export const partyService = new PartyService();
