import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  off,
  onDisconnect,
  remove,
  type DatabaseReference,
} from "firebase/database";
import type { GameAction } from "../types/multiplayer";

const firebaseConfig = {
  apiKey: "AIzaSyBROSVP1oRoUQfKF0HzABi-jQh7m4v0SRs",
  authDomain: "the-wicked-city.firebaseapp.com",
  databaseURL: "https://the-wicked-city-default-rtdb.firebaseio.com",
  projectId: "the-wicked-city",
  storageBucket: "the-wicked-city.firebasestorage.app",
  messagingSenderId: "786914165881",
  appId: "1:786914165881:web:80afb2a4971377f54080a8",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app);

type ActionCallback = (action: GameAction) => void;

class MultiplayerService {
  public isHost: boolean = false;
  public roomCode: string | null = null;
  public myClientId: string =
    "client_" + Date.now() + "_" + Math.random().toString(16).slice(2, 6);

  private actionSubscribers: Set<ActionCallback> = new Set();
  private roomRef: DatabaseReference | null = null;
  private actionsRef: DatabaseReference | null = null;
  private guestRef: DatabaseReference | null = null;

  public onPlayerConnected: (() => void) | null = null;
  public onPlayerDisconnected: (() => void) | null = null;

  private generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  public subscribeToActions(callback: ActionCallback): () => void {
    this.actionSubscribers.add(callback);
    return () => {
      this.actionSubscribers.delete(callback);
    };
  }

  private notifySubscribers(action: GameAction) {
    this.actionSubscribers.forEach((cb) => cb(action));
  }

  public async createRoom(
    onReady: (code: string) => void,
    onConnected: () => void,
    onError?: (err: any) => void,
  ) {
    this.disconnect();
    this.isHost = true;
    const code = this.generateCode();
    this.roomCode = code;
    this.onPlayerConnected = onConnected;

    try {
      this.roomRef = ref(db, "rooms/" + code);
      this.actionsRef = ref(db, "rooms/" + code + "/actions");
      this.guestRef = ref(db, "rooms/" + code + "/guestId");

      onDisconnect(this.roomRef).remove();

      await set(this.roomRef, {
        hostId: this.myClientId,
        status: "WAITING",
        createdAt: Date.now(),
      });

      onReady(code);

      onValue(this.guestRef, (snapshot) => {
        const guestId = snapshot.val();
        if (guestId && guestId !== this.myClientId) {
          if (this.onPlayerConnected) this.onPlayerConnected();
        }
      });

      this.listenToActions();
    } catch (err) {
      if (onError) onError(err);
    }
  }

  public async joinRoom(
    code: string,
    onConnected: () => void,
    onError: () => void,
  ) {
    this.disconnect();
    this.isHost = false;
    this.roomCode = code;
    this.onPlayerConnected = onConnected;

    try {
      this.roomRef = ref(db, "rooms/" + code);
      const snapshot = await get(this.roomRef);

      if (!snapshot.exists()) {
        onError();
        return;
      }

      this.guestRef = ref(db, "rooms/" + code + "/guestId");
      onDisconnect(this.guestRef).remove();

      await set(this.guestRef, this.myClientId);

      if (this.onPlayerConnected) this.onPlayerConnected();

      this.actionsRef = ref(db, "rooms/" + code + "/actions");
      this.listenToActions();
    } catch {
      onError();
    }
  }

  private listenToActions() {
    if (!this.actionsRef) return;

    onValue(this.actionsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      if (data.senderClientId === this.myClientId) return;

      // Парсим JSON-строку обратно в объект (это обходит проблему undefined в Firebase)
      if (data.actionJson) {
        this.notifySubscribers(JSON.parse(data.actionJson) as GameAction);
      } else if (data.action) {
        // Fallback для обратной совместимости, если вдруг останутся старые пакеты
        this.notifySubscribers(data.action as GameAction);
      }
    });
  }

  public broadcastMatchStart(state: any) {
    if (!this.roomCode) return;
    const action: GameAction = {
      type: "MATCH_STARTED",
      payload: { state },
      senderId: "remote",
      timestamp: Date.now(),
    } as any;

    // Сериализуем action в JSON-строку, чтобы нативно вычистить все undefined поля
    set(ref(db, "rooms/" + this.roomCode + "/actions"), {
      senderClientId: this.myClientId,
      actionJson: JSON.stringify(action),
      timestamp: Date.now(),
    });
  }

  public sendAction(action: GameAction) {
    if (!this.roomCode) return;

    // Сериализуем action в JSON-строку, чтобы нативно вычистить все undefined поля
    set(ref(db, "rooms/" + this.roomCode + "/actions"), {
      senderClientId: this.myClientId,
      actionJson: JSON.stringify({
        ...action,
        senderId: "remote",
      }),
      timestamp: Date.now(),
    });
  }

  public disconnect() {
    if (this.guestRef) {
      off(this.guestRef);
      this.guestRef = null;
    }
    if (this.actionsRef) {
      off(this.actionsRef);
      this.actionsRef = null;
    }
    if (this.roomRef) {
      off(this.roomRef);
      if (this.isHost) {
        remove(this.roomRef);
      }
      this.roomRef = null;
    }
    this.isHost = false;
    this.roomCode = null;
  }
}

export const mpService = new MultiplayerService();
