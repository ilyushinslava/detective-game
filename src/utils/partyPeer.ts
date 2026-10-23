import type { Role } from "../types/game";
import type { GameAction } from "../types/multiplayer";

class PartyService {
  roomCode: string = "";
  myClientId: string = "local-stub";
  isHost: boolean = true;
  lastSyncedState: any = null;
  socket: WebSocket | null = null;

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
    this.myClientId = clientId || `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (typeof window === "undefined" || typeof WebSocket === "undefined") {
      return;
    }

    const rawHost = import.meta.env?.VITE_PARTYKIT_HOST?.trim();
    let wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let host = window.location.hostname ? `${window.location.hostname}:1999` : "localhost:1999";

    if (rawHost) {
      if (rawHost.startsWith("https://") || rawHost.startsWith("wss://")) {
        wsProtocol = "wss:";
        host = rawHost.replace(/^(https?:\/\/|wss?:\/\/)/, "");
      } else if (rawHost.startsWith("http://") || rawHost.startsWith("ws://")) {
        wsProtocol = "ws:";
        host = rawHost.replace(/^(https?:\/\/|wss?:\/\/)/, "");
      } else {
        host = rawHost;
      }
    }

    const encodedNick = encodeURIComponent(nickname || "Агент");
    const url = `${wsProtocol}//${host}/party/${roomCode}?clientId=${this.myClientId}&nickname=${encodedNick}&isHost=${isHost}&mode=${mode}&randomRoles=true`;

    try {
      const ws = new WebSocket(url);
      this.socket = ws;

      ws.onopen = () => {
        if (this.socket === ws) {
          this.onPresenceChanged?.(true);
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (!data || typeof data !== "object") return;

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
          this.socket = null;
          this.onPresenceChanged?.(false);
        }
      };

      ws.onerror = (err) => {
        console.warn("[PartyService] WebSocket error:", err);
      };
    } catch (err) {
      console.error("[PartyService] Connection failed:", err);
    }
  }

  disconnect(): void {
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
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("[PartyService] Socket is not open, action dropped:", action?.type);
      return;
    }

    try {
      const payload = {
        ...action,
        senderClientId: this.myClientId,
      };
      this.socket.send(JSON.stringify(payload));
    } catch (err) {
      console.error("[PartyService] Failed to send action:", err);
    }
  }

  async fetchPublicRooms(): Promise<any[]> {
    if (typeof window === "undefined" || typeof fetch === "undefined") {
      return [];
    }
    const rawHost = import.meta.env?.VITE_PARTYKIT_HOST?.trim();
    let httpProtocol = window.location.protocol === "https:" ? "https:" : "http:";
    let host = window.location.hostname ? `${window.location.hostname}:1999` : "localhost:1999";

    if (rawHost) {
      if (rawHost.startsWith("https://") || rawHost.startsWith("wss://")) {
        httpProtocol = "https:";
        host = rawHost.replace(/^(https?:\/\/|wss?:\/\/)/, "");
      } else if (rawHost.startsWith("http://") || rawHost.startsWith("ws://")) {
        httpProtocol = "http:";
        host = rawHost.replace(/^(https?:\/\/|wss?:\/\/)/, "");
      } else {
        host = rawHost;
      }
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
}

export const partyService = new PartyService();
