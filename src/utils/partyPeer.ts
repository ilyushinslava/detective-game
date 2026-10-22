import PartySocket from "partysocket";
import type { GameState, GameAction, GameModeType, PlayerRole } from "../types/game";

export interface PartyPeerCallbacks {
  onSyncState?: (gameState: GameState, role: PlayerRole, status: string) => void;
  onRoomStatus?: (data: { status: string; mode: string; hostName: string; playersCount: number }) => void;
  onPresenceChanged?: (connected: boolean) => void;
  onError?: (err: any) => void;
}

class PartyPeerService {
  private socket: PartySocket | null = null;
  public roomCode: string | null = null;
  public isHost: boolean = false;
  public myClientId: string = "";
  public hostName: string = "Игрок 1";
  public guestName: string = "Игрок 2";

  // Колбэки
  public onSyncState: ((gameState: GameState, role: PlayerRole, status: string) => void) | null = null;
  public onRoomStatus: ((data: { status: string; mode: string; hostName: string; playersCount: number }) => void) | null = null;
  public onPresenceChanged: ((connected: boolean) => void) | null = null;
  public onAllPlayersReady: (() => void) | null = null;
  public onAction: ((action: any) => void) | null = null;
  public lastSyncedState: any = null;
  public onRoomClosed: (() => void) | null = null;

  constructor() {
    let storedId: string | null = null;
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        storedId = sessionStorage.getItem("crime_city_party_client_id");
      } catch {}
    }
    if (!storedId) {
      storedId = "client_" + Math.random().toString(36).substring(2, 9);
      if (typeof window !== "undefined" && window.sessionStorage) {
        try {
          sessionStorage.setItem("crime_city_party_client_id", storedId);
        } catch {}
      }
    }
    this.myClientId = storedId;
  }

  // Подключение к комнате (как хост или гость)
  public connect(
    roomCode: string,
    nickname: string,
    isHost: boolean,
    mode: GameModeType = "SKHVATKA",
    clientId?: string
  ) {
    this.disconnect();
    this.roomCode = roomCode;
    this.isHost = isHost;
    if (clientId) {
      this.myClientId = clientId;
      if (typeof window !== "undefined" && window.sessionStorage) {
        try {
          sessionStorage.setItem("crime_city_party_client_id", clientId);
        } catch {}
      }
    }

    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.") ||
      window.location.hostname.startsWith("10.") ||
      window.location.hostname.endsWith(".local");

    const host = isLocal
      ? `${window.location.hostname}:1999`
      : window.location.host;
       // Для продакшена

    this.socket = new PartySocket({
      host,
      room: roomCode,
      query: {
        clientId: this.myClientId,
        nickname,
        isHost: String(isHost),
        mode,
      },
    });

    this.socket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "SYNC_STATE") {
          this.lastSyncedState = data.gameState;
          if (data.role) {
            (this as any).role = data.role;
          }
          if (this.onSyncState) {
            this.onSyncState(data.gameState, data.role, data.status);
          }
        } else if (data.type === "ROOM_STATE_BROADCAST") {
          // Гарантированная синхронизация поля
          const myRole = (this as any).role || (this.isHost ? "KILLER" : "DETECTIVE");
          this.lastSyncedState = data.gameState;
          if (this.onSyncState) {
            this.onSyncState(data.gameState, myRole, data.status);
          }
        } else if (data.type === "ROOM_STATUS") {
          if (this.onRoomStatus) {
            this.onRoomStatus(data.status || data);
          }
        } else if (data.type === "PLAYER_READY_UPDATE") {
          if (this.onAction) {
            this.onAction(data);
          }
        } else if (data.type === "ALL_PLAYERS_READY") {
          if (this.onAllPlayersReady) {
            this.onAllPlayersReady();
          }
          if (this.onAction) {
            this.onAction(data);
          }
        } else if (data.type === "GAME_ACTION") {
          if (this.onAction) {
            this.onAction(data.action);
          }
        } else if (data.type === "PRESENCE_CHANGED") {
          if (this.onPresenceChanged) {
            this.onPresenceChanged(data.connected);
          }
        } else if (data.type === "ERROR") {
          if ((this as any).onError) {
            (this as any).onError(data.message);
          }
        }
      } catch (err) {
        console.error("[PartyPeer] Parse message error:", err);
      }
    });

    this.socket.addEventListener("close", () => {
      if (this.onPresenceChanged) {
        this.onPresenceChanged(false);
      }
    });
  }

  // Отправка намерения хода на авторитетный сервер
  public sendAction(action: GameAction) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const payload = {
      ...action,
      senderClientId: this.myClientId,
      senderRole: (this as any).role || (this.isHost ? "KILLER" : "DETECTIVE"),
    };
    this.socket.send(JSON.stringify(payload));
  }

  // Отключение
  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.roomCode = null;
    this.isHost = false;
  }

  async fetchPublicRooms(): Promise<Array<{
    roomCode: string;
    mode: string;
    hostName: string;
    status: string;
    playersCount: number;
    maxPlayers: number;
    bet?: number;
  }>> {
    try {
      const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "https:" : "http:";
      const host = (this as any).partyHost || (typeof window !== "undefined" && window.location.port === "5173" ? `${window.location.hostname}:1999` : (typeof window !== "undefined" ? window.location.host : "localhost:1999"));
      let res = await fetch(`${protocol}//${host}/parties/main`, { method: "GET" }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${protocol}//${host}/party/main`, { method: "GET" }).catch(() => null);
      }
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.filter((r: any) => r.status === "WAITING");
        }
        if (data && data.roomCode && data.status === "WAITING") {
          return [data];
        }
      }
    } catch (e) {
      console.warn("fetchPublicRooms error:", e);
    }
    return [];
  }

}

export const partyService = new PartyPeerService();
if (typeof window !== "undefined") { (window as any).partyService = partyService; }