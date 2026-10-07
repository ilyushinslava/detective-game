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
  update,
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

  public hostName: string = "Восток";
  public guestName: string = "Запад";

  private actionSubscribers: Set<ActionCallback> = new Set();
  private roomRef: DatabaseReference | null = null;
  private actionsRef: DatabaseReference | null = null;
  private guestRef: DatabaseReference | null = null;

  public onPlayerConnected: (() => void) | null = null;
  public onPlayerDisconnected: (() => void) | null = null;
  public onRoomClosed: (() => void) | null = null;

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
    hostName: string,
    onReady: (code: string) => void,
    onConnected: () => void,
    onError?: (err: any) => void,
  ) {
    this.disconnect();
    this.isHost = true;
    this.hostName = hostName.trim() || "Восток";
    const code = this.generateCode();
    this.roomCode = code;
    this.onPlayerConnected = onConnected;

    try {
      this.roomRef = ref(db, `rooms/${code}`);
      this.actionsRef = ref(db, `rooms/${code}/actions`);
      this.guestRef = ref(db, `rooms/${code}/guestId`);

      // Если хост отключается (закрыл вкладку) — удаляем всю комнату
      onDisconnect(this.roomRef).remove();

      await set(this.roomRef, {
        hostId: this.myClientId,
        hostName: this.hostName,
        status: "WAITING",
        guestId: "",
        guestName: "",
        createdAt: Date.now(),
      });

      onReady(code);

      let guestWasConnected = false;

      // Слушаем подключение/отключение гостя
      onValue(this.guestRef, async (snapshot) => {
        const guestId = snapshot.val();

        // Строгая проверка: строка, не пустая, не равна ID хоста
        if (
          typeof guestId === "string" &&
          guestId.length > 0 &&
          guestId !== this.myClientId
        ) {
          guestWasConnected = true;
          try {
            const nameSnap = await get(ref(db, `rooms/${code}/guestName`));
            this.guestName = nameSnap.val() || "Запад";
          } catch {
            this.guestName = "Запад";
          }
          if (this.onPlayerConnected) this.onPlayerConnected();
        }
        // Если гость был, а теперь ID пустой — значит он отключился
        else if (guestWasConnected && (!guestId || guestId === "")) {
          guestWasConnected = false;
          if (this.onPlayerDisconnected) this.onPlayerDisconnected();
        }
      });

      this.listenToActions();
    } catch (err) {
      if (onError) onError(err);
    }
  }

  public async joinRoom(
    code: string,
    guestName: string,
    onConnected: () => void,
    onError: () => void,
  ) {
    this.disconnect();
    this.isHost = false;
    this.roomCode = code;
    this.guestName = guestName.trim() || "Запад";
    this.onPlayerConnected = onConnected;

    try {
      this.roomRef = ref(db, `rooms/${code}`);
      const snapshot = await get(this.roomRef);

      if (!snapshot.exists()) {
        onError();
        return;
      }

      const data = snapshot.val();
      this.hostName = data.hostName || "Восток";

      await update(this.roomRef, {
        guestId: this.myClientId,
        guestName: this.guestName,
        status: "CONNECTED",
      });

      // Если гость отключается — затираем только его ID
      this.guestRef = ref(db, `rooms/${code}/guestId`);
      onDisconnect(this.guestRef).set("");

      if (this.onPlayerConnected) this.onPlayerConnected();

      let hostWasConnected = true;

      // Слушаем удаление комнаты хостом
      onValue(this.roomRef, (snap) => {
        if (!snap.exists()) {
          if (hostWasConnected) {
            hostWasConnected = false;
            if (this.onPlayerDisconnected) this.onPlayerDisconnected();
            if (this.onRoomClosed) this.onRoomClosed();
          }
        }
      });

      this.actionsRef = ref(db, `rooms/${code}/actions`);
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

      if (data.actionJson) {
        try {
          const parsed = JSON.parse(data.actionJson);
          this.notifySubscribers(parsed as GameAction);
        } catch (e) {
          console.error("Action parse error", e);
        }
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

    set(ref(db, `rooms/${this.roomCode}/actions`), {
      senderClientId: this.myClientId,
      actionJson: JSON.stringify(action),
      timestamp: Date.now(),
    });
  }

  public sendAction(action: GameAction) {
    if (!this.roomCode) return;

    set(ref(db, `rooms/${this.roomCode}/actions`), {
      senderClientId: this.myClientId,
      actionJson: JSON.stringify({
        ...action,
        senderId: "remote",
      }),
      timestamp: Date.now(),
    });
  }

  public disconnect() {
    // Строго отписываемся от всех событий перед занулением
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
        remove(this.roomRef).catch(() => {});
      } else {
        update(this.roomRef, {
          guestId: "",
          guestName: "",
          status: "WAITING",
        }).catch(() => {});
      }
      this.roomRef = null;
    }
    this.isHost = false;
    this.roomCode = null;
  }
}

export const mpService = new MultiplayerService();
