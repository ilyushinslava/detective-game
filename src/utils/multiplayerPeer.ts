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
  push,
  onChildAdded,
  runTransaction,
  query,
  limitToLast,
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
  public hostName: string = "Игрок 1";
  public guestName: string = "Игрок 2";

  private actionSubscribers: Set<ActionCallback> = new Set();
  private processedActionIds: Set<string> = new Set();
  private unsubscribes: Array<() => void> = [];
  private sessionRestoredAt: number = 0;
  private connectedRef: DatabaseReference | null = null;
  private authPromise: Promise<any> | null = null;
  private roomRef: DatabaseReference | null = null;

  private async ensureAuth(): Promise<any> {
    if (auth.currentUser) return auth.currentUser;
    if (this.authPromise) return this.authPromise;

    this.authPromise = signInAnonymously(auth)
      .then((cred) => cred.user)
      .catch((err) => {
        console.warn("Firebase auth fallback:", err.message);
        return null;
      })
      .finally(() => {
        this.authPromise = null;
      });

    return this.authPromise;
  }

  private actionsRef: DatabaseReference | null = null;
  private guestRef: DatabaseReference | null = null;
  private hostConnectedRef: DatabaseReference | null = null;
  private guestConnectedRef: DatabaseReference | null = null;

  public onPlayerConnected: (() => void) | null = null;
  public onPlayerDisconnected: (() => void) | null = null;
  public onRoomClosed: (() => void) | null = null;
  public onPresenceChanged: ((isOpponentConnected: boolean) => void) | null = null;

  public saveGameState(state: any) {
    if (!this.roomCode) return;
    set(ref(db, `rooms/${this.roomCode}/gameState`), JSON.stringify(state)).catch(() => {});
  }

  public async restoreSession(code: string, clientId: string, isHost: boolean): Promise<any> {
    this.isHost = isHost;
    this.roomCode = code;
    this.myClientId = clientId;

    try {
      await this.ensureAuth();
      this.roomRef = ref(db, `rooms/${code}`);
      const snap = await get(this.roomRef);
      if (!snap.exists()) throw new Error("Room closed");

      const data = snap.val();
      if (data.status === "CLOSED") throw new Error("Room closed");
      await update(this.roomRef, isHost ? { hostConnected: true } : { guestConnected: true }).catch(() => {});

      this.hostName = data.hostName;
      this.guestName = data.guestName || "Игрок 2";

      this.actionsRef = ref(db, `rooms/${code}/actions`);
      this.guestRef = ref(db, `rooms/${code}/guestId`);

      if (isHost) {
        this.hostConnectedRef = ref(db, `rooms/${code}/hostConnected`);
        this.unsubscribes.push(
          onValue(ref(db, `rooms/${code}/guestConnected`), (s) => {
            if (this.onPresenceChanged) this.onPresenceChanged(s.val() === true);
          })
        );
      } else {
        this.guestConnectedRef = ref(db, `rooms/${code}/guestConnected`);
        this.unsubscribes.push(
          onValue(ref(db, `rooms/${code}/hostConnected`), (s) => {
            if (this.onPresenceChanged) this.onPresenceChanged(s.val() === true);
          })
        );
      }

      this.connectedRef = ref(db, ".info/connected");
      this.unsubscribes.push(
        onValue(this.connectedRef, (s) => {
        if (s.val() === true) {
          if (isHost && this.hostConnectedRef && this.roomRef) {
            onDisconnect(this.hostConnectedRef).set(false).catch(() => {});
            update(this.roomRef, { hostConnected: true }).catch(() => {});
          } else if (!isHost && this.guestConnectedRef && this.roomRef) {
            onDisconnect(this.guestConnectedRef).set(false).catch(() => {});
            update(this.roomRef, { guestConnected: true }).catch(() => {});
          }
        }
        })
      );

      this.sessionRestoredAt = Date.now();
      this.listenToActions();

      if (this.onPresenceChanged) this.onPresenceChanged(true);

      if (data.gameState) {
        return JSON.parse(data.gameState);
      }
      return null;
    } catch (e) {
      await this.disconnect();
      throw e;
    }
  }

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

      const publicRoomsRef = query(ref(db, "public_rooms"), limitToLast(50));
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

          for (const [, room] of Object.entries(data)) {
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
    this.disconnect();
    this.isHost = true;
    this.hostName = hostName.trim() || "Игрок 1";
    const code = this.generateCode();
    this.roomCode = code;
    this.onPlayerConnected = onConnected;

    try {
      const user = await this.ensureAuth();
      const uid = user.uid;
      this.roomRef = ref(db, `rooms/${code}`);
      this.actionsRef = ref(db, `rooms/${code}/actions`);
      this.guestRef = ref(db, `rooms/${code}/guestId`);
      this.hostConnectedRef = ref(db, `rooms/${code}/hostConnected`);

      this.unsubscribes.push(
        onValue(ref(db, `rooms/${code}/guestConnected`), (s) => {
          if (this.onPresenceChanged) this.onPresenceChanged(s.val() === true);
        })
      );

      this.connectedRef = ref(db, ".info/connected");
      onValue(this.connectedRef, (s) => {
        if (s.val() === true && this.hostConnectedRef && this.roomRef) {
          onDisconnect(this.hostConnectedRef).set(false).catch(() => {});
          update(this.roomRef, { hostConnected: true }).catch(() => {});
        }
      });

      const statusRef = ref(db, `rooms/${code}/status`);
      this.unsubscribes.push(
        onValue(statusRef, (snap) => {
          if (!snap.exists() || snap.val() === "CLOSED") {
            if (this.onRoomClosed) this.onRoomClosed();
          }
        })
      );

      await set(this.roomRef, {
        hostId: uid,
        hostName: this.hostName,
        status: "WAITING",
        hostConnected: true,
        guestConnected: false,
        guestId: "",
        guestName: "",
        createdAt: Date.now(),
        mode: mode,
      });
      await remove(this.actionsRef);

      if (!isPrivate) {
        const publicRoomRef = ref(db, `public_rooms/${code}`);
        onDisconnect(publicRoomRef).remove();
        await set(publicRoomRef, {
          roomCode: code,
          hostId: uid,
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

      this.unsubscribes.push(
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
            this.guestName = nameSnap.val() || "Игрок 2";
          } catch {
            this.guestName = "Игрок 2";
          }

          update(ref(db, `public_rooms/${code}`), { playersCount: 2 }).catch(() => {});
          if (this.onPlayerConnected) this.onPlayerConnected();
        } else if (guestWasConnected && (!guestId || guestId === "")) {
          guestWasConnected = false;
          update(ref(db, `public_rooms/${code}`), { playersCount: 1 }).catch(() => {});
        }
        })
      );

      this.listenToActions();
    } catch (err) {
      if (onError) onError(err);
    }
  }

      public async joinRoom(
    code: string,
    guestName: string,
    onConnected: (initialState: any, mode: string) => void,
    onError: () => void,
  ) {
    this.disconnect();
    this.isHost = false;
    this.roomCode = code;
    this.guestName = guestName.trim() || "Игрок 2";

    try {
      const user = await this.ensureAuth();
      const uid = user.uid;
      const roomRef = ref(db, `rooms/${code}`);
      this.roomRef = roomRef;

      const snap = await get(roomRef);
      if (!snap.exists()) {
        onError();
        return;
      }

      const roomData = snap.val();
      if (roomData.status === "CLOSED" || (roomData.guestId && roomData.guestId !== "" && roomData.guestId !== uid)) {
        onError();
        return;
      }

      // Шаг 1: Заявляем слот гостя (соответствует правилу !data.exists() || data.val() === "")
      await set(ref(db, `rooms/${code}/guestId`), uid);

      // Шаг 2: Теперь data.parent().child("guestId").val() === auth.uid истинно, обновляем остальные поля
      await update(roomRef, {
        guestName: this.guestName,
        guestConnected: true,
        status: "CONNECTED",
      });

      this.hostName = roomData.hostName || "Игрок 1";

      this.guestRef = ref(db, `rooms/${code}/guestId`);
      this.guestConnectedRef = ref(db, `rooms/${code}/guestConnected`);

      if (this.onPresenceChanged) this.onPresenceChanged(true);

      this.unsubscribes.push(
        onValue(ref(db, `rooms/${code}/hostConnected`), (s) => {
          if (this.onPresenceChanged) this.onPresenceChanged(s.val() === true);
        })
      );

      this.connectedRef = ref(db, ".info/connected");
      this.unsubscribes.push(
        onValue(this.connectedRef, (s) => {
          if (s.val() === true && this.guestConnectedRef && this.roomRef) {
            onDisconnect(this.guestConnectedRef).set(false).catch(() => {});
            update(this.roomRef, { guestConnected: true }).catch(() => {});
          }
        })
      );

      const statusRef = ref(db, `rooms/${code}/status`);
      this.unsubscribes.push(
        onValue(statusRef, (s) => {
          if (!s.exists() || s.val() === "CLOSED") {
            if (this.onRoomClosed) this.onRoomClosed();
          }
        })
      );

      this.actionsRef = ref(db, `rooms/${code}/actions`);
      this.listenToActions();

      let parsedState = null;
      if (roomData && roomData.gameState) {
        try {
          parsedState = JSON.parse(roomData.gameState);
        } catch (e) {
          console.error("Parse state error", e);
        }
      }

      onConnected(parsedState, roomData?.mode || "SKHVATKA");
    } catch (err) {
      console.error("Join room error:", err);
      onError();
    }
  }

  private listenToActions() {
    if (!this.actionsRef) return;

    const unsub = onChildAdded(this.actionsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      if (data.senderClientId === this.myClientId) return;

      if (this.sessionRestoredAt > 0 && data.timestamp && data.timestamp < this.sessionRestoredAt) {
        return;
      }

      if (data.actionJson) {
        try {
          const parsed = JSON.parse(data.actionJson) as GameAction;

          if (parsed.type === "MATCH_STARTED" || parsed.type === "RESTART_GAME") {
            this.processedActionIds.clear();
          } else if (data.actionId) {
            if (this.processedActionIds.has(data.actionId)) return;
            this.processedActionIds.add(data.actionId);
            if (this.processedActionIds.size > 100) {
              const first = this.processedActionIds.values().next().value;
              if (first) this.processedActionIds.delete(first);
            }
          }

          this.notifySubscribers(parsed);
        } catch (e) {
          console.error("Action parse error", e);
        }
      }
    });
    this.unsubscribes.push(unsub);
  }

  public setPlayerReady(isReady: boolean = true) {
    if (!this.roomCode) return;
    const readyKey = this.isHost ? "hostReady" : "guestReady";
    update(ref(db, `rooms/${this.roomCode}`), {
      [readyKey]: isReady,
      status: "PLAYING",
    }).catch(() => {});
  }

  public subscribeToOpponentReady(callback: (ready: boolean) => void): () => void {
    if (!this.roomCode) return () => {};
    const readyKey = this.isHost ? "guestReady" : "hostReady";
    const targetRef = ref(db, `rooms/${this.roomCode}/${readyKey}`);
    onValue(targetRef, (snapshot) => {
      callback(snapshot.val() === true);
    });
    return () => {
      off(targetRef);
    };
  }

  public broadcastMatchStart(state: any) {
    if (!this.roomCode) return;
    if (this.actionsRef) {
      remove(this.actionsRef).catch(() => {});
    } else if (this.roomCode) {
      remove(ref(db, `rooms/${this.roomCode}/actions`)).catch(() => {});
    }
    if (!this.roomCode) return;
    this.processedActionIds.clear();

    const maskStateForOpponent = (rawState: any) => {
      if (!rawState) return rawState;
      const masked = JSON.parse(JSON.stringify(rawState));
      const hostRole = rawState.playerRole;

      if (rawState.mode === "SECRET_SERVICE") {
        const localSpyIndex = hostRole === "KILLER" ? 0 : 1;
        if (masked.spies && masked.spies[localSpyIndex]) {
          masked.spies[localSpyIndex] = {
            ...masked.spies[localSpyIndex],
            secretId: null,
          };
        }
      } else {
        // Хост всегда маскирует свои секреты
        if (hostRole === "KILLER") {
          masked.killerSecretId = null;
          masked.killerHand = [];
        } else if (hostRole === "DETECTIVE") {
          masked.detectiveSecretId = null;
          masked.detectiveHand = [];
        }

        // В Схватке до выбора Инспектора не светим дефолтный detectiveSecretId
        if (rawState.mode === "SKHVATKA") {
          if (rawState.killCount === 0 || (rawState.inspectorChoices && rawState.inspectorChoices.length > 0)) {
            masked.detectiveSecretId = null;
            masked.detectiveHand = [];
          }
          // Варианты выбора скрываем только если противник играет за Бандита (KILLER).
          // Если гость — Инспектор (DETECTIVE, когда hostRole === "KILLER"), оставляем choices.
          if (hostRole === "DETECTIVE") {
            masked.inspectorChoices = [];
          }
        }
      }
      return masked;
    };

    const sanitizedRemoteState = maskStateForOpponent(state);

    set(ref(db, `rooms/${this.roomCode}/gameState`), JSON.stringify(sanitizedRemoteState)).catch(() => {});
    update(ref(db, `rooms/${this.roomCode}`), {
      hostReady: false,
      guestReady: false,
      hostConnected: true,
      status: "PLAYING",
    }).catch(() => {});

    const actionId = `${this.myClientId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const action: GameAction = {
      type: "MATCH_STARTED",
      payload: { state: sanitizedRemoteState },
      senderId: "remote",
      timestamp: Date.now(),
      actionId,
    } as any;

    push(ref(db, `rooms/${this.roomCode}/actions`), {
      senderClientId: this.myClientId,
      actionId,
      actionJson: JSON.stringify(action),
      timestamp: Date.now(),
    });
  }

  public sendAction(action: GameAction) {
    if (!this.roomCode) return;
    const actionId = `${this.myClientId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    push(ref(db, `rooms/${this.roomCode}/actions`), {
      senderClientId: this.myClientId,
      actionId,
      actionJson: JSON.stringify({
        ...action,
        senderId: "remote",
        actionId,
      }),
      timestamp: Date.now(),
    });
  }

      public disconnect(intentionalLeave: boolean = false): void {
    this.processedActionIds.clear();
    this.sessionRestoredAt = 0;

    // 1. Моментальная отписка всех слушателей в памяти
    this.unsubscribes.forEach((u) => {
      try {
        u();
      } catch (_) {}
    });
    this.unsubscribes = [];

    // 2. Фоновая отправка сетевых сигналов без блокировки главного потока
    const oldRoomRef = this.roomRef;
    const oldRoomCode = this.roomCode;
    const wasHost = this.isHost;
    const oldHostConnectedRef = this.hostConnectedRef;
    const oldGuestConnectedRef = this.guestConnectedRef;
    const oldGuestRef = this.guestRef;

    if (oldHostConnectedRef) {
      onDisconnect(oldHostConnectedRef).cancel().catch(() => {});
    }
    if (oldGuestConnectedRef) {
      onDisconnect(oldGuestConnectedRef).cancel().catch(() => {});
    }
    if (oldGuestRef) {
      onDisconnect(oldGuestRef).cancel().catch(() => {});
    }

    if (oldRoomRef) {
      onDisconnect(oldRoomRef).cancel().catch(() => {});
      if (wasHost) {
        update(oldRoomRef, { hostConnected: false, status: "CLOSED" }).catch(() => {});
        remove(oldRoomRef).catch(() => {});
        if (oldRoomCode) {
          onDisconnect(ref(db, `public_rooms/${oldRoomCode}`)).cancel().catch(() => {});
          remove(ref(db, `public_rooms/${oldRoomCode}`)).catch(() => {});
        }
      } else if (!intentionalLeave) {
        update(oldRoomRef, {
          guestConnected: false,
          guestId: "",
          status: "WAITING",
        }).catch(() => {});
        if (oldRoomCode) {
          update(ref(db, `public_rooms/${oldRoomCode}`), { playersCount: 1 }).catch(() => {});
        }
      }
    }

    // 3. Моментальное обнуление ссылок сессии
    this.hostConnectedRef = null;
    this.guestConnectedRef = null;
    this.guestRef = null;
    this.connectedRef = null;
    this.actionsRef = null;
    this.roomRef = null;
    this.isHost = false;
    this.roomCode = null;
    this.onPresenceChanged = null;
  }

  public async leaveRoom(): Promise<void> {
    if (this.roomRef) {
      await update(this.roomRef, {
        status: "CLOSED",
        hostConnected: false,
        guestConnected: false,
        guestId: "",
      }).catch(() => {});
    }
    if (this.roomCode) {
      remove(ref(db, `public_rooms/${this.roomCode}`)).catch(() => {});
    }
    await this.disconnect(true);
  }

  public async closeRoom(): Promise<void> {
    this.disconnect();
  }

  async registerPublicRoom(roomCode: string, mode: string, bet: number = 250, hostName: string = "Агент"): Promise<void> {
    try {
      const roomRef = ref(db, `public_rooms/${roomCode}`);
      await set(roomRef, {
        roomCode,
        hostName,
        mode,
        bet,
        playersCount: 1,
        maxPlayers: mode === 'SECRET_SERVICE' ? 4 : 2,
        createdAt: Date.now(),
      });
    } catch (e) {
      console.warn("registerPublicRoom failed:", e);
    }
  }

  async removePublicRoom(roomCode: string): Promise<void> {
    try {
      const roomRef = ref(db, `public_rooms/${roomCode}`);
      await set(roomRef, null);
    } catch (e) {
      console.warn("removePublicRoom failed:", e);
    }
  }
}

export const mpService = new MultiplayerService();

