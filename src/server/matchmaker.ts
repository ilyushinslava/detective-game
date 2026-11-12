// src/server/matchmaker.ts
import type { GameModeType, Role } from "../types/game";

export interface MatchmakingTicket {
  ticketId: string;
  clientId: string;
  connectionId: string;
  nickname: string;
  rank: string;
  mmr: number;
  mode: GameModeType;
  bet: number;
  createdAt: number;
}

export interface MatchmakingJoinPayload {
  ticketId?: string;
  clientId: string;
  nickname: string;
  rank?: string;
  mmr?: number;
  mode: GameModeType;
  bet?: number;
}

const BOT_CALLSIGNS = [
  "Агат",
  "Вектор",
  "Норд",
  "Сапфир",
  "Филин",
  "Зенит",
  "Орион",
  "Фантом",
  "Штиль",
  "Гранит",
];

const RANK_MMR_MAP: Record<string, number> = {
  "СТАЖЁР": 1000,
  "СЛЕДОВАТЕЛЬ": 1250,
  "КОМИССАР": 1500,
  "ШЕФ БЮРО": 1750,
};

export const SLA_BOT_TIMEOUT_MS = 25000; // 25 секунд SLA на поиск соперника

export default class MatchmakerServer {
  room: any;
  private queue: Map<string, MatchmakingTicket> = new Map();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private connections: Map<string, any> = new Map();

  constructor(room: any) {
    this.room = room;
  }

  getQueue(): MatchmakingTicket[] {
    return Array.from(this.queue.values());
  }

  private startTickLoop(): void {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => {
      this.processQueue();
    }, 1000);
  }

  private stopTickLoopIfEmpty(): void {
    if (this.queue.size === 0 && this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  onConnect(conn: any): void {
    this.connections.set(conn.id, conn);
    this.startTickLoop();
  }

  onClose(conn: any): void {
    this.connections.delete(conn.id);
    // Удаляем все билеты, ассоциированные с данным соединением
    for (const [ticketId, ticket] of this.queue.entries()) {
      if (ticket.connectionId === conn.id) {
        this.queue.delete(ticketId);
      }
    }
    this.stopTickLoopIfEmpty();
  }

  onMessage(messageStr: string, senderConn: any): void {
    try {
      const data = JSON.parse(messageStr);
      const { type, payload } = data;

      if (type === "JOIN_QUEUE") {
        this.handleJoinQueue(payload, senderConn);
      } else if (type === "LEAVE_QUEUE") {
        this.handleLeaveQueue(payload, senderConn);
      } else if (type === "PING") {
        senderConn.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
      }
    } catch (e) {
      console.warn("[Matchmaker] Invalid message format:", e);
    }
  }

  handleJoinQueue(payload: MatchmakingJoinPayload, conn: any): void {
    const ticketId =
      payload.ticketId ||
      `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rank = payload.rank || "СТАЖЁР";
    const mmr =
      typeof payload.mmr === "number"
        ? payload.mmr
        : RANK_MMR_MAP[rank.toUpperCase()] || 1000;
    const mode = payload.mode || "MANIAC_VS_OPERATIVE";
    const bet = typeof payload.bet === "number" ? payload.bet : 250;

    const ticket: MatchmakingTicket = {
      ticketId,
      clientId: payload.clientId,
      connectionId: conn.id,
      nickname: payload.nickname || "Агент",
      rank,
      mmr,
      mode,
      bet,
      createdAt: Date.now(),
    };

    // Удаляем предыдущие билеты этого клиента
    for (const [id, t] of this.queue.entries()) {
      if (t.clientId === ticket.clientId) {
        this.queue.delete(id);
      }
    }

    this.queue.set(ticketId, ticket);

    // Подтверждение постановки в очередь
    conn.send(
      JSON.stringify({
        type: "QUEUE_TICKET",
        payload: {
          ticketId,
          queuePosition: this.queue.size,
          estWaitSeconds: 10,
        },
      })
    );

    // Мгновенная проверка очереди
    this.processQueue();
  }

  handleLeaveQueue(payload: { ticketId: string }, conn: any): void {
    if (payload?.ticketId && this.queue.has(payload.ticketId)) {
      this.queue.delete(payload.ticketId);
    } else {
      for (const [id, t] of this.queue.entries()) {
        if (t.connectionId === conn.id) {
          this.queue.delete(id);
        }
      }
    }

    conn.send(JSON.stringify({ type: "QUEUE_LEFT" }));
    this.stopTickLoopIfEmpty();
  }

  processQueue(): void {
    const now = Date.now();
    const tickets = Array.from(this.queue.values());

    // 1. Проверяем SLA-фолбек на бота (если игрок ждёт >= 25 сек)
    for (const ticket of tickets) {
      const waitTimeMs = now - ticket.createdAt;
      if (waitTimeMs >= SLA_BOT_TIMEOUT_MS) {
        this.triggerSlaBotMatch(ticket);
        this.queue.delete(ticket.ticketId);
      }
    }

    // 2. Группируем оставшиеся билеты по игровым режимам
    const remaining = Array.from(this.queue.values());
    const byMode: Record<string, MatchmakingTicket[]> = {};
    for (const t of remaining) {
      if (!byMode[t.mode]) byMode[t.mode] = [];
      byMode[t.mode].push(t);
    }

    // 3. Подбор пар внутри каждого режима
    for (const mode in byMode) {
      const pool = byMode[mode];
      if (pool.length < 2) continue;

      // Сортируем по времени ожидания (старшие билеты первыми)
      pool.sort((a, b) => a.createdAt - b.createdAt);

      const matchedIndices = new Set<number>();

      for (let i = 0; i < pool.length; i++) {
        if (matchedIndices.has(i)) continue;
        const t1 = pool[i];
        const waitSec1 = (now - t1.createdAt) / 1000;

        let bestMatchIndex = -1;
        let minMmrDiff = Infinity;

        for (let j = i + 1; j < pool.length; j++) {
          if (matchedIndices.has(j)) continue;
          const t2 = pool[j];
          if (t1.clientId === t2.clientId) continue;

          const waitSec2 = (now - t2.createdAt) / 1000;
          const maxWait = Math.max(waitSec1, waitSec2);
          const mmrDiff = Math.abs(t1.mmr - t2.mmr);

          // Динамическое расширение окна:
          // 0-5 сек: +-100 MMR
          // 6-15 сек: +-300 MMR
          // >15 сек: глобально без ограничений
          const allowedDiff = maxWait >= 15 ? Infinity : maxWait >= 6 ? 300 : 100;

          if (mmrDiff <= allowedDiff && mmrDiff < minMmrDiff) {
            minMmrDiff = mmrDiff;
            bestMatchIndex = j;
          }
        }

        if (bestMatchIndex !== -1) {
          const t2 = pool[bestMatchIndex];
          matchedIndices.add(i);
          matchedIndices.add(bestMatchIndex);

          this.triggerHumanMatch(t1, t2);
          this.queue.delete(t1.ticketId);
          this.queue.delete(t2.ticketId);
        }
      }
    }

    this.stopTickLoopIfEmpty();
  }

  private triggerHumanMatch(t1: MatchmakingTicket, t2: MatchmakingTicket): void {
    const roomCode = `mm_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const conn1 = this.connections.get(t1.connectionId);
    const conn2 = this.connections.get(t2.connectionId);

    // Случайное распределение ролей: KILLER / DETECTIVE
    const isP1Killer = Math.random() < 0.5;
    const role1: Role = isP1Killer ? "KILLER" : "DETECTIVE";
    const role2: Role = isP1Killer ? "DETECTIVE" : "KILLER";

    if (conn1) {
      try {
        conn1.send(
          JSON.stringify({
            type: "MATCH_FOUND",
            payload: {
              ticketId: t1.ticketId,
              roomCode,
              mode: t1.mode,
              role: role1,
              isHost: true,
              isAiMatch: false,
              opponentName: t2.nickname,
              opponentRank: t2.rank,
              bet: Math.max(t1.bet, t2.bet),
            },
          })
        );
      } catch (_) {}
    }

    if (conn2) {
      try {
        conn2.send(
          JSON.stringify({
            type: "MATCH_FOUND",
            payload: {
              ticketId: t2.ticketId,
              roomCode,
              mode: t2.mode,
              role: role2,
              isHost: false,
              isAiMatch: false,
              opponentName: t1.nickname,
              opponentRank: t1.rank,
              bet: Math.max(t1.bet, t2.bet),
            },
          })
        );
      } catch (_) {}
    }
  }

  private triggerSlaBotMatch(ticket: MatchmakingTicket): void {
    const conn = this.connections.get(ticket.connectionId);
    if (!conn) return;

    const randomCallsign =
      BOT_CALLSIGNS[Math.floor(Math.random() * BOT_CALLSIGNS.length)];
    const botName = `Агент «${randomCallsign}»`;
    const role: Role = Math.random() < 0.5 ? "KILLER" : "DETECTIVE";
    const roomCode = `ai_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      conn.send(
        JSON.stringify({
          type: "MATCH_FOUND",
          payload: {
            ticketId: ticket.ticketId,
            roomCode,
            mode: ticket.mode,
            role,
            isHost: true,
            isAiMatch: true,
            opponentName: botName,
            opponentRank: ticket.rank,
            bet: ticket.bet,
          },
        })
      );
    } catch (_) {}
  }

  async onRequest(req: Request): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(req.url);
    if (url.searchParams.get("action") === "status") {
      return new Response(
        JSON.stringify({
          ok: true,
          queueLength: this.queue.size,
          tickets: this.getQueue().map((t) => ({
            ticketId: t.ticketId,
            mode: t.mode,
            rank: t.rank,
            waitSec: Math.round((Date.now() - t.createdAt) / 1000),
          })),
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, queueLength: this.queue.size }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}
