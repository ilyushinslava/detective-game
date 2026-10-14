import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
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
const auth = getAuth(app);

type ActionCallback = (action: GameAction) => void;

export interface PublicRoomMeta {
  roomCode: string;
  hostId: string;
  hostName: string;
  mode: string;
  bet: number;
  playersCount: number;
  maxPlayers: number;
  isPrivate: boolean;
  createdAt: number;
}

class MultiplayerService {
  public isHost: boolean = false;
  public roomCode: string | null = null;
  public myClientId: string =
    "client_" + Date.now() + "_" + Math.random().toString(16).slice(2, 6);
  public hostName: string = "Агент 1";
  public guestName: string = "Агент 2";

  private actionSubscribers: Set<ActionCallback> = new Set();
  private authPromise: Promise<any> | null = null;
  private roomRef: DatabaseReference | null = null;

  private async ensureAuth(): Promise<any> {
    if (auth.currentUser) return auth.currentUser;
    if (this.authPromise) return this.authPromise;

    this.authPromise = signInAnonymously(auth).catch((err) => {
      this.authPromise = null;
      console.error("Firebase auth error:", err);
      throw err;
    });

    return this.authPromise;
  }
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

  public subscribeToPublicRooms(
    callback: (rooms: PublicRoomMeta[]) => void,
  ): () => void {
    let isCancelled = false;
    let unsubscribe: (() => void) | null = null;

    this.ensureAuth().then(() => {
      if (isCancelled) return;

      const publicRoomsRef = ref(db, "public_rooms");
      unsubscribe = onValue(
        publicRoomsRef,
        (snapshot) => {
          const data = snapshot.val();
          if (!data) {
            callback([]);
            return;
          }
          const now = Date.now();
          const activeRooms: PublicRoomMeta[] = [];

          for (const [code, room] of Object.entries(data)) {
            const r = room as PublicRoomMeta;
            if (!r.isPrivate && r.playersCount < r.maxPlayers) {
              if (now - r.createdAt < 30 * 60 * 1000) {
                activeRooms.push(r);
              }
            }
          }

          activeRooms.sort((a, b) => b.createdAt - a.createdAt);
          callback(activeRooms);
        },
        (error) => {
          // Мягко глушим ошибку сокета при простое или переключении табов
          console.warn("Public rooms sync paused:", error.message);
        },
      );
    }).catch((err) => {
      console.error("Failed to subscribe to public rooms due to auth error", err);
    });

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }

  public async findQuickPlayRoom(bet: number = 250): Promise<string | null> {
    try {
      await this.ensureAuth();
      const snapshot = await get(ref(db, "public_rooms"));
      if (!snapshot.exists()) return null;

      const data = snapshot.val();
      const now = Date.now();

      for (const [code, room] of Object.entries(data)) {
        const r = room as PublicRoomMeta;
        if (
          !r.isPrivate &&
          r.bet === bet &&
          r.playersCount < r.maxPlayers &&
          now - r.createdAt < 30 * 60 * 1000
        ) {
          return code;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  public async createRoom(
    hostName: string,
    mode: string,
    bet: number = 250,
    isPrivate: boolean = false,
    maxPlayers: number = 2,
    onReady: (code: string) => void,
    onConnected: () => void,
    onError?: (err: any) => void,
  ) {
    await this.disconnect();
    this.isHost = true;
    this.hostName = hostName.trim() || "Агент 1";
    const code = this.generateCode();
    this.roomCode = code;
    this.onPlayerConnected = onConnected;

    try {
      await this.ensureAuth();
      this.roomRef = ref(db, `rooms/${code}`);
      this.actionsRef = ref(db, `rooms/${code}/actions`);
      this.guestRef = ref(db, `rooms/${code}/guestId`);

      onDisconnect(this.roomRef).remove();

      await set(this.roomRef, {
        hostId: this.myClientId,
        hostName: this.hostName,
        status: "WAITING",
        guestId: "",
        guestName: "",
        createdAt: Date.now(),
        mode: mode,
      });

      if (!isPrivate) {
        const publicRoomRef = ref(db, `public_rooms/${code}`);
        onDisconnect(publicRoomRef).remove();
        await set(publicRoomRef, {
          roomCode: code,
          hostId: this.myClientId,
          hostName: this.hostName,
          mode,
          bet,
          playersCount: 1,
          maxPlayers,
          isPrivate,
          createdAt: Date.now(),
        });
      }

      onReady(code);

      let guestWasConnected = false;

      onValue(this.guestRef, async (snapshot) => {
        const guestId = snapshot.val();

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

          // Обновляем счетчик игроков в публичном лобби
          update(ref(db, `public_rooms/${code}`), { playersCount: 2 }).catch(
            () => {},
          );

          if (this.onPlayerConnected) this.onPlayerConnected();
        } else if (guestWasConnected && (!guestId || guestId === "")) {
          guestWasConnected = false;
          // Возвращаем счетчик обратно
          update(ref(db, `public_rooms/${code}`), { playersCount: 1 }).catch(
            () => {},
          );
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
    await this.disconnect();
    this.isHost = false;
    this.roomCode = code;
    this.guestName = guestName.trim() || "Агент 2";
    this.onPlayerConnected = onConnected;

    try {
      await this.ensureAuth();
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

      // Обновляем счетчик в публичном лобби
      update(ref(db, `public_rooms/${code}`), { playersCount: 2 }).catch(
        () => {},
      );

      this.guestRef = ref(db, `rooms/${code}/guestId`);
      onDisconnect(this.guestRef).set("");

      if (this.onPlayerConnected) this.onPlayerConnected();

      let hostWasConnected = true;

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

  public async disconnect(): Promise<void> {
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
        const promises = [remove(this.roomRef).catch(() => {})];
        if (this.roomCode) {
          promises.push(remove(ref(db, `public_rooms/${this.roomCode}`)).catch(() => {}));
        }
        await Promise.all(promises);
      } else {
        const promises = [
          update(this.roomRef, {
            guestId: "",
            guestName: "",
            status: "WAITING",
          }).catch(() => {})
        ];
        if (this.roomCode) {
          promises.push(
            update(ref(db, `public_rooms/${this.roomCode}`), {
              playersCount: 1,
            }).catch(() => {})
          );
        }
        await Promise.all(promises);
      }
      this.roomRef = null;
    }
    this.isHost = false;
    this.roomCode = null;
  }

  public async closeRoom(): Promise<void> {
    await this.disconnect();
  }
}

export const mpService = new MultiplayerService();
