import mqtt, { type MqttClient } from "mqtt";
import type { GameAction } from "../types/multiplayer";

class MultiplayerService {
  private client: MqttClient | null = null;
  public isHost: boolean = false;
  public roomCode: string | null = null;
  public myClientId: string = `client_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;

  public onActionReceived: ((action: GameAction) => void) | null = null;
  public onPlayerConnected: (() => void) | null = null;
  public onPlayerDisconnected: (() => void) | null = null;

  private generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  public createRoom(
    onReady: (code: string) => void,
    onConnected: () => void,
    onError?: (err: any) => void,
  ) {
    this.disconnect();
    this.isHost = true;
    const code = this.generateCode();
    this.roomCode = code;
    this.onPlayerConnected = onConnected;

    const topic = `city-of-sins/room/${code}`;

    this.client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt", {
      clientId: `host_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
      clean: true,
      connectTimeout: 7000,
    });

    this.client.on("connect", () => {
      console.log("[MQTT Host] Connected to broker, subscribing to:", topic);
      this.client?.subscribe(topic, { qos: 1 }, (err) => {
        if (!err) {
          console.log("[MQTT Host] Room ready:", code);
          onReady(code);
        } else if (onError) {
          onError(err);
        }
      });
    });

    this.setupMessageListener(topic);

    this.client.on("error", (err) => {
      console.error("[MQTT Host Error]:", err);
      if (onError) onError(err);
    });
  }

  public joinRoom(code: string, onConnected: () => void, onError: () => void) {
    this.disconnect();
    this.isHost = false;
    this.roomCode = code;
    this.onPlayerConnected = onConnected;

    const topic = `city-of-sins/room/${code}`;
    let handshakeReceived = false;

    this.client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt", {
      clientId: `guest_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
      clean: true,
      connectTimeout: 7000,
    });

    this.client.on("connect", () => {
      console.log("[MQTT Guest] Connected to broker, subscribing to:", topic);
      this.client?.subscribe(topic, { qos: 1 }, (err) => {
        if (!err) {
          console.log("[MQTT Guest] Subscribed, sending CLIENT_JOINED");
          this.client?.publish(
            topic,
            JSON.stringify({
              type: "CLIENT_JOINED",
              senderId: this.myClientId,
            }),
            { qos: 1 },
          );

          setTimeout(() => {
            if (!handshakeReceived) {
              console.warn("[MQTT Guest] Handshake timeout");
              onError();
            }
          }, 8000);
        } else {
          onError();
        }
      });
    });

    this.setupMessageListener(topic, () => {
      handshakeReceived = true;
    });

    this.client.on("error", (err) => {
      console.error("[MQTT Guest Error]:", err);
      onError();
    });
  }

  private setupMessageListener(topic: string, onHandshake?: () => void) {
    if (!this.client) return;

    this.client.on("message", (_topic, rawMessage) => {
      try {
        const text = rawMessage.toString();
        const data = JSON.parse(text);

        // Игнорируем собственные эхо-сообщения
        if (data.senderClientId === this.myClientId) {
          return;
        }

        console.log(`[MQTT RX] Received event "${data.type}":`, data);

        if (data.type === "CLIENT_JOINED" && this.isHost) {
          console.log("[MQTT Host] Guest detected, sending HOST_HANDSHAKE");
          this.client?.publish(
            topic,
            JSON.stringify({
              type: "HOST_HANDSHAKE",
              senderClientId: this.myClientId,
            }),
            { qos: 1 },
          );
          if (this.onPlayerConnected) this.onPlayerConnected();
        } else if (data.type === "HOST_HANDSHAKE" && !this.isHost) {
          console.log("[MQTT Guest] Handshake confirmed by Host");
          if (onHandshake) onHandshake();
          if (this.onPlayerConnected) this.onPlayerConnected();
        } else if (data.type === "GAME_ACTION" && data.payload) {
          console.log(
            "[MQTT] Dispatching remote GameAction to UI:",
            data.payload.type,
          );
          if (this.onActionReceived) {
            this.onActionReceived(data.payload as GameAction);
          }
        }
      } catch (e) {
        console.error("[MQTT Parse Error]:", e);
      }
    });
  }

  public broadcastMatchStart(state: any) {
    if (!this.client || !this.client.connected || !this.roomCode) {
      console.error(
        "[MQTT] Cannot start match: client not connected or no roomCode",
      );
      return;
    }
    const topic = `city-of-sins/room/${this.roomCode}`;
    const packet = {
      type: "GAME_ACTION",
      senderClientId: this.myClientId,
      payload: {
        type: "MATCH_STARTED",
        payload: { state },
        senderId: "remote",
        timestamp: Date.now(),
      },
    };
    console.log("[MQTT TX] Broadcasting MATCH_STARTED to room:", this.roomCode);
    this.client.publish(topic, JSON.stringify(packet), { qos: 1 });
  }

  public sendAction(action: GameAction) {
    if (!this.client || !this.client.connected || !this.roomCode) {
      console.warn("[MQTT] sendAction skipped: client not connected");
      return;
    }
    const topic = `city-of-sins/room/${this.roomCode}`;
    const packet = {
      type: "GAME_ACTION",
      senderClientId: this.myClientId,
      payload: {
        ...action,
        senderId: "remote", // для получателя этот экшен будет remote
      },
    };
    console.log(
      `[MQTT TX] Sending "${action.type}" to room ${this.roomCode}:`,
      packet,
    );
    this.client.publish(topic, JSON.stringify(packet), { qos: 1 });
  }

  public disconnect() {
    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }
    this.isHost = false;
    this.roomCode = null;
  }
}

export const mpService = new MultiplayerService();
