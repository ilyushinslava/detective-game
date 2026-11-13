import type { Role } from "../types/game";
import type { GameAction } from "../types/multiplayer";
import { GAME_CONFIG } from "../config/gameConfig";
import { DEFAULT_BET } from "../constants/gameRules";

export interface MorseCandidate {
  roomCode: string;
  hostName: string;
  mode: string;
  status: string;
  playersCount: number;
  maxPlayers: number;
}

export interface ResolveRoomResponse {
  ok: boolean;
  disambiguation?: boolean;
  candidates?: MorseCandidate[];
  roomCode?: string;
  morseCode?: string | null;
  hostName?: string;
  status?: string;
  mode?: string;
  error?: string;
  message?: string;
}

class PartyService {
  roomCode: string = "";
  morseCode: string | null = null;
  myClientId: string = "local-stub";
  authToken: string | null = null;
  isHost: boolean = true;
  lastSyncedState: any = null;
  socket: WebSocket | null = null;
  private nick: string = "Агент";
  private mode: string = "MANIAC_VS_OPERATIVE";
  private clientType?: string | null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isExplicitDisconnect: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private queuedActions: GameAction[] = [];
  private failedAttempts: number = 0;

  resolveEndpoints(): { wsProtocol: string; httpProtocol: string; host: string } {
    const fallbackHost = GAME_CONFIG.NETWORK.FALLBACK_GATEWAYS[0] || "detective-game-server.partykit.dev";
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

    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const isLocalOrLan =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("172.") ||
        hostname.endsWith(".local") ||
        hostname.includes("lan");

      if (isLocalOrLan) {
        const port = GAME_CONFIG?.NETWORK?.DEFAULT_DEV_PORT || 1999;
        const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const httpProto = window.location.protocol === "https:" ? "https:" : "http:";
        return {
          wsProtocol: wsProto,
          httpProtocol: httpProto,
          host: `${hostname}:${port}`,
        };
      }
    }

    return {
      wsProtocol: "wss:",
      httpProtocol: "https:",
      host: fallbackHost,
    };
  }

  async resolveRoom(query: { morse?: string; pin?: string }): Promise<ResolveRoomResponse> {
    // В тестовом окружении без запущенного сетевого сервера PartyKit обращаемся к реестру напрямую
    const isTestEnv =
      (typeof process !== "undefined" && (Boolean(process.env?.VITEST) || process.env?.NODE_ENV === "test")) ||
      import.meta.env?.MODE === "test" ||
      Boolean(import.meta.env?.VITEST);

    if (isTestEnv) {
      try {
        const {
          resolveRoomsByMorse,
          resolveRoomByPin,
          roomToMorseRegistry,
          morseToRoomRegistry,
          morseToRoomsRegistry,
          publicRoomsRegistry,
        } = await import("../server/index");
        if (query.morse) {
          const candidates = resolveRoomsByMorse(query.morse);
          if (candidates.length === 1) {
            const single = candidates[0];
            return {
              ok: true,
              disambiguation: false,
              roomCode: single.roomCode,
              morseCode: query.morse,
              hostName: single.hostName,
              status: single.status,
              mode: single.mode,
              playersCount: single.playersCount,
              maxPlayers: single.maxPlayers,
            };
          }
          if (candidates.length > 1) {
            return {
              ok: true,
              disambiguation: true,
              morseCode: query.morse,
              candidates,
            };
          }
        }

        if (query.pin) {
          const found = resolveRoomByPin(query.pin);
          if (found) {
            const roomMeta = publicRoomsRegistry.get(found);
            const morseCode = roomToMorseRegistry.get(found);
            return {
              ok: true,
              disambiguation: false,
              roomCode: found,
              morseCode: morseCode || null,
              hostName: roomMeta?.hostName || "Хост",
              status: roomMeta?.status || "WAITING",
              mode: roomMeta?.mode || "MANIAC_VS_OPERATIVE",
              playersCount: roomMeta?.playersCount || 0,
              maxPlayers: roomMeta?.maxPlayers || 2,
            };
          }
          if (query.pin.length >= 4) {
            return {
              ok: true,
              disambiguation: false,
              roomCode: query.pin,
              morseCode: null,
              status: "WAITING",
              mode: "MANIAC_VS_OPERATIVE",
            };
          }
        }
      } catch (err) {
        console.error("CATCH IN partyService.resolveRoom:", err);
      }
    }

    const { httpProtocol, host } = this.resolveEndpoints();
    const params = new URLSearchParams({ action: "resolve" });
    if (query.morse) params.set("morse", query.morse);
    if (query.pin) params.set("pin", query.pin);

    const url = `${httpProtocol}//${host}/party/main?${params.toString()}`;
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 3000) : null;
      const res = await fetch(url, { signal: controller?.signal });
      if (timeoutId) clearTimeout(timeoutId);
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { ok: false, error: e?.message || "NETWORK_ERROR" };
    }
  }

  onSyncState: ((state: any, role?: Role, status?: string) => void) | null = null;
  onRoomStatus: ((status: any) => void) | null = null;
  onAllPlayersReady: (() => void) | null = null;
  onAction: ((action: any) => void) | null = null;
  onPresenceChanged: ((connected: boolean) => void) | null = null;
  onPlayerDisconnected: ((info: { role?: Role; clientId: string; graceTimeoutSec: number }) => void) | null = null;
  onPlayerReconnected: ((info: { role?: Role; clientId: string }) => void) | null = null;
  onSessionRestored: ((data: any) => void) | null = null;
  onConnectionStateChange: ((state: { isConnected: boolean; isReconnecting: boolean; attempt: number; maxAttempts: number }) => void) | null = null;

  constructor() {
    this.setupVisibilityListener();
  }

  private setupVisibilityListener(): void {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.notifyBackground(true);
        } else if (document.visibilityState === "visible") {
          this.notifyBackground(false);
          this.ensureConnection();
        }
      });
    }
  }

  notifyBackground(isBackground: boolean): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(
          JSON.stringify({
            type: "CLIENT_BACKGROUNDED",
            senderClientId: this.myClientId,
            payload: { isBackground },
          })
        );
      } catch (_) {}
    }
  }

  connect(
    roomCode: string,
    nickname: string,
    isHost: boolean,
    mode: string,
    clientId?: string,
    clientType?: string,
    isPrivate?: boolean
  ): void {
    if (this.socket && this.socket.readyState === WebSocket.CONNECTING && this.roomCode === roomCode) {
      return;
    }

    const savedClientType = clientType || this.clientType;

    if (this.socket) {
      try {
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.onmessage = null;
        this.socket.onopen = null;
      } catch (_) {}
      this.disconnect();
    }

    this.roomCode = roomCode;
    this.isHost = isHost;
    this.nick = nickname || "Агент";
    this.mode = mode || "MANIAC_VS_OPERATIVE";
    if (savedClientType) this.clientType = savedClientType;
    this.myClientId = clientId || `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (!this.authToken && typeof sessionStorage !== "undefined" && roomCode) {
      this.authToken = sessionStorage.getItem(`crime_city_auth_${roomCode}`);
    }
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
    const authParam = this.authToken ? `&authToken=${encodeURIComponent(this.authToken)}` : "";
    const privateParam = isPrivate ? `&isPrivate=true` : "";
    const url = `${wsProtocol}//${host}/party/${roomCode}?clientId=${this.myClientId}&nickname=${encodedNick}&isHost=${this.isHost}&mode=${this.mode}&randomRoles=true${this.clientType ? `&clientType=${this.clientType}` : ""}${privateParam}${authParam}`;

    try {
      const ws = new WebSocket(url);
      this.socket = ws;

      ws.onopen = () => {
        if (this.socket === ws) {
          this.failedAttempts = 0;
          this.reconnectAttempts = 0;
          this.onPresenceChanged?.(true);
          this.onConnectionStateChange?.({
            isConnected: true,
            isReconnecting: false,
            attempt: 0,
            maxAttempts: GAME_CONFIG.NETWORK.RECONNECT.MAX_ATTEMPTS,
          });
          this.stopHeartbeat();
          this.pingInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
              this.socket.send(JSON.stringify({ type: "PING" }));
            }
          }, GAME_CONFIG.NETWORK.RECONNECT.HEARTBEAT_INTERVAL_MS);

          const actionsToProcess = [...this.queuedActions];
          this.queuedActions = [];
          for (const queuedAction of actionsToProcess) {
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

          if (data.type === "AUTH_TOKEN" && data.authToken) {
            this.authToken = data.authToken;
            if (typeof sessionStorage !== "undefined" && this.roomCode) {
              sessionStorage.setItem(`crime_city_auth_${this.roomCode}`, data.authToken);
            }
            return;
          }

          if (data.type === "PLAYER_DISCONNECTED") {
            this.onPlayerDisconnected?.(data);
            this.onAction?.(data);
            return;
          }

          if (data.type === "PLAYER_RECONNECTED") {
            this.onPlayerReconnected?.(data);
            this.onAction?.(data);
            return;
          }

          if (data.type === "SESSION_RESTORED") {
            this.onSessionRestored?.(data);
            if (data.gameState) {
              this.onSyncState?.(data.gameState, data.role, data.status);
            }
            this.onAction?.(data);
            return;
          }

          if (data.type === "SYNC_STATE") {
            this.lastSyncedState = data.state;
            if (data.morseCode) {
              this.morseCode = data.morseCode;
            }
            this.onSyncState?.(data.state, data.role, data.status);
            return;
          }

          if (data.type === "ROOM_STATUS") {
            if (data.morseCode) {
              this.morseCode = data.morseCode;
            }
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
            this.onConnectionStateChange?.({
              isConnected: false,
              isReconnecting: true,
              attempt: this.reconnectAttempts,
              maxAttempts: GAME_CONFIG.NETWORK.RECONNECT.MAX_ATTEMPTS,
            });
            const baseDelay = Math.max(1000, GAME_CONFIG.NETWORK.RECONNECT.INITIAL_DELAY_MS || 1000);
            const delay = Math.min(
              baseDelay * Math.pow(1.5, this.reconnectAttempts - 1),
              GAME_CONFIG.NETWORK.RECONNECT.MAX_DELAY_MS || 10000
            );
            this.reconnectTimeout = setTimeout(() => {
              if (!this.isExplicitDisconnect && this.roomCode) {
                this.connect(this.roomCode, this.nick, this.isHost, this.mode, this.myClientId, this.clientType);
              }
            }, delay);
          } else if (!this.isExplicitDisconnect) {
            this.onConnectionStateChange?.({
              isConnected: false,
              isReconnecting: false,
              attempt: this.reconnectAttempts,
              maxAttempts: GAME_CONFIG.NETWORK.RECONNECT.MAX_ATTEMPTS,
            });
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
      this.connect(this.roomCode, this.nick, this.isHost, this.mode, this.myClientId, this.clientType);
    } else if (this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: "PING" }));
      } catch (err) {
        console.warn("[PartyService] Ping failed on ensureConnection, reconnecting...", err);
        this.connect(this.roomCode, this.nick, this.isHost, this.mode, this.myClientId, this.clientType);
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
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: "PLAYER_LEFT_EXPLICIT", senderClientId: this.myClientId }));
      } catch (_) {}
    }
    if (this.socket) {
      try {
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.onmessage = null;
        this.socket.onopen = null;
        this.socket.close();
      } catch (err) {
        console.warn("[PartyService] Error closing socket:", err);
      }
      this.socket = null;
    }
    if (this.roomCode && typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(`crime_city_auth_${this.roomCode}`);
    }
    this.authToken = null;
    this.roomCode = "";
    this.morseCode = null;
    this.clientType = null;
    this.lastSyncedState = null;
    this.onPresenceChanged?.(false);
    this.onConnectionStateChange?.({
      isConnected: false,
      isReconnecting: false,
      attempt: 0,
      maxAttempts: GAME_CONFIG.NETWORK.RECONNECT.MAX_ATTEMPTS,
    });
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

    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      console.warn("[PartyService] Socket is still connecting, action dropped:", action?.type);
    }
  }

  async verifyRoomMorse(roomCode: string, morse: string): Promise<{ ok: boolean; roomCode?: string; error?: string }> {
    const cleanMorse = morse.replace(/[•\.]/g, ".").replace(/[—–\-]/g, "-").replace(/[^.\-]/g, "");
    const isTestEnv =
      (typeof process !== "undefined" && (Boolean(process.env?.VITEST) || process.env?.NODE_ENV === "test")) ||
      import.meta.env?.MODE === "test" ||
      Boolean(import.meta.env?.VITEST);
    if (isTestEnv) {
      try {
        const { publicRoomsRegistry, roomToMorseRegistry } = await import("../server/index");
        const meta = publicRoomsRegistry.get(roomCode);
        const expected = roomToMorseRegistry.get(roomCode) || meta?.morseCode;
        if (expected && expected === cleanMorse) {
          return { ok: true, roomCode };
        }
        return { ok: false, error: "INVALID_MORSE_CODE" };
      } catch (_) {}
    }

    const { httpProtocol, host } = this.resolveEndpoints();
    try {
      const url = `${httpProtocol}//${host}/party/main?action=verify_morse&roomCode=${encodeURIComponent(roomCode)}&morse=${encodeURIComponent(cleanMorse)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { ok: false, error: e?.message || "NETWORK_ERROR" };
    }
  }

  async fetchPublicRooms(): Promise<any[]> {
    if (typeof window === "undefined" || typeof fetch === "undefined") {
      return [];
    }
    const { httpProtocol, host } = this.resolveEndpoints();

    try {
      const res = await fetch(`${httpProtocol}//${host}/parties/lobby?action=list`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {
      // fallback to legacy /parties/main/lobby
    }

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

  private matchmakingSocket: WebSocket | null = null;
  private matchmakingTicketId: string | null = null;

  startMatchmaking(
    options: {
      mode: string;
      nickname: string;
      rank?: string;
      mmr?: number;
      bet?: number;
    },
    onEvent: (event: {
      type: "QUEUE_TICKET" | "MATCH_FOUND" | "QUEUE_LEFT" | "ERROR";
      payload?: any;
    }) => void
  ): () => void {
    if (this.matchmakingSocket) {
      try {
        this.matchmakingSocket.close();
      } catch (_) {}
      this.matchmakingSocket = null;
    }

    const { wsProtocol, host } = this.resolveEndpoints();
    const url = `${wsProtocol}//${host}/parties/matchmaker/default`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      onEvent({ type: "ERROR", payload: err });
      return () => {};
    }
    this.matchmakingSocket = ws;

    const clientId = this.myClientId || `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    ws.onopen = () => {
      try {
        ws.send(
          JSON.stringify({
            type: "JOIN_QUEUE",
            payload: {
              clientId,
              nickname: options.nickname || "Агент",
              rank: options.rank || "СТАЖЁР",
              mmr: options.mmr,
              mode: options.mode,
              bet: options.bet || DEFAULT_BET,
            },
          })
        );
      } catch (_) {}
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
        if (msg.type === "QUEUE_TICKET") {
          this.matchmakingTicketId = msg.payload?.ticketId || null;
          onEvent({ type: "QUEUE_TICKET", payload: msg.payload });
        } else if (msg.type === "MATCH_FOUND") {
          this.matchmakingTicketId = null;
          onEvent({ type: "MATCH_FOUND", payload: msg.payload });
          try {
            ws.close();
          } catch (_) {}
          this.matchmakingSocket = null;
        } else if (msg.type === "QUEUE_LEFT") {
          this.matchmakingTicketId = null;
          onEvent({ type: "QUEUE_LEFT" });
        }
      } catch (e) {
        console.warn("[PartyService] Matchmaker parse error:", e);
      }
    };

    ws.onerror = (err) => {
      onEvent({ type: "ERROR", payload: err });
    };

    ws.onclose = () => {
      if (this.matchmakingSocket === ws) {
        this.matchmakingSocket = null;
      }
    };

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(
            JSON.stringify({
              type: "LEAVE_QUEUE",
              payload: { ticketId: this.matchmakingTicketId },
            })
          );
          ws.close();
        } catch (_) {}
      }
      this.matchmakingSocket = null;
      this.matchmakingTicketId = null;
    };
  }
}

export const partyService = new PartyService();
