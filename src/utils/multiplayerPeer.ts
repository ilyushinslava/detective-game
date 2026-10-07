import mqtt, { type MqttClient } from "mqtt";
import type { GameAction } from "../types/multiplayer";

class MultiplayerService {
  private client: MqttClient | null = null;
  public isHost: boolean = false;
  public roomCode: string | null = null;

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

    // Надежный брокер HiveMQ
    this.client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt", {
      clientId: `host_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
      clean: true,
      connectTimeout: 5000,
    });

    this.client.on("connect", () => {
      this.client?.subscribe(topic, (err) => {
        if (!err) {
          onReady(code);
        } else if (onError) {
          onError(err);
        }
      });
    });

    this.client.on("message", (_topic, message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "CLIENT_JOINED") {
          // Отвечаем клиенту подтверждением рукопожатия
          this.client?.publish(
            topic,
            JSON.stringify({ type: "HOST_HANDSHAKE" }),
          );
          if (this.onPlayerConnected) this.onPlayerConnected();
        } else if (data.type === "GAME_ACTION" && data.payload) {
          if (this.onActionReceived && data.senderId !== "host") {
            this.onActionReceived(data.payload as GameAction);
          }
        }
      } catch (e) {
        console.error("Ошибка парсинга пакета:", e);
      }
    });

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
      clientId: `client_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
      clean: true,
      connectTimeout: 5000,
    });

    this.client.on("connect", () => {
      this.client?.subscribe(topic, { qos: 1 }, (err) => {
        if (!err) {
          // Уведомляем хоста о подключении ТОЛЬКО после успешной подписки
          this.client?.publish(
            topic,
            JSON.stringify({ type: "CLIENT_JOINED" }),
            { qos: 1 },
          );

          // Таймаут на ответ хоста
          setTimeout(() => {
            if (!handshakeReceived) {
              onError();
            }
          }, 6000);
        } else {
          onError();
        }
      });
    });

    this.client.on("message", (_topic, message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "HOST_HANDSHAKE") {
          handshakeReceived = true;
          if (this.onPlayerConnected) this.onPlayerConnected();
        } else if (data.type === "GAME_ACTION" && data.payload) {
          if (this.onActionReceived && data.senderId !== "client") {
            this.onActionReceived(data.payload as GameAction);
          }
        }
      } catch (e) {
        console.error("Ошибка парсинга пакета:", e);
      }
    });

    this.client.on("error", (err) => {
      console.error("[MQTT Client Error]:", err);
      onError();
    });
  }

  public broadcastMatchStart(state: any) {
    if (!this.client || !this.client.connected || !this.roomCode) return;
    const topic = `city-of-sins/room/${this.roomCode}`;
    this.client.publish(
      topic,
      JSON.stringify({
        type: "GAME_ACTION",
        senderId: "host",
        payload: {
          type: "MATCH_STARTED",
          payload: { state },
          senderId: "host",
          timestamp: Date.now(),
        },
      }),
      { qos: 1 }, // Гарантированная доставка
    );
  }

  public sendAction(action: GameAction) {
    if (!this.client || !this.client.connected || !this.roomCode) return;
    const topic = `city-of-sins/room/${this.roomCode}`;
    this.client.publish(
      topic,
      JSON.stringify({
        type: "GAME_ACTION",
        senderId: this.isHost ? "host" : "client",
        payload: action,
      }),
    );
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
