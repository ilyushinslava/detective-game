import type { ServerEvent, ServerEventType } from "../types/multiplayer";

/**
 * Список серверных событий, которые клиент обязан разбирать отдельно
 * от обычной синхронизации состояния.
 */
export const SERVER_EVENT_TYPES: readonly ServerEventType[] = [
  "TURN_TIMER_PAUSED",
  "TURN_TIMER_RESUMED",
  "DUAL_DISCONNECT_PAUSE",
  "MATCH_ANNULLED",
  "SYNC_ERROR",
  "ACTION_REJECTED",
] as const;

const SERVER_EVENT_TYPE_SET = new Set<string>(SERVER_EVENT_TYPES);

/** Проверяет, относится ли тип пакета к известным серверным событиям. */
export function isServerEventType(type: unknown): type is ServerEventType {
  return typeof type === "string" && SERVER_EVENT_TYPE_SET.has(type);
}

function toFiniteNonNegativeNumber(value: unknown): number | null {
  const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num);
}

function normalizeReason(reason: unknown): string {
  return typeof reason === "string" && reason.trim().length > 0 ? reason.trim() : "UNKNOWN_REASON";
}

/**
 * Безопасно разбирает входящий пакет и возвращает типизированное серверное событие.
 * Возвращает `null`, если пакет не относится к серверным событиям или содержит
 * некорректные поля (защита от битых/поддельных данных).
 */
export function parseServerEvent(raw: unknown): ServerEvent | null {
  let data: any = raw;

  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (!isServerEventType(data.type)) return null;

  switch (data.type) {
    case "TURN_TIMER_PAUSED":
    case "TURN_TIMER_RESUMED": {
      const remainingMs = toFiniteNonNegativeNumber(data.remainingMs);
      if (remainingMs === null) return null;
      return { type: data.type, remainingMs };
    }
    case "DUAL_DISCONNECT_PAUSE": {
      const gracePeriodMs = toFiniteNonNegativeNumber(data.gracePeriodMs);
      if (gracePeriodMs === null) return null;
      return { type: data.type, gracePeriodMs };
    }
    case "MATCH_ANNULLED": {
      const message =
        typeof data.message === "string" && data.message.trim().length > 0
          ? data.message.trim()
          : undefined;
      return { type: data.type, reason: normalizeReason(data.reason), message };
    }
    case "SYNC_ERROR": {
      const actionType =
        typeof data.actionType === "string" && data.actionType.trim().length > 0
          ? data.actionType.trim()
          : undefined;
      return { type: data.type, reason: normalizeReason(data.reason), actionType };
    }
    case "ACTION_REJECTED": {
      return { type: data.type, reason: normalizeReason(data.reason) };
    }
    default:
      return null;
  }
}

const REJECT_REASON_TEXT: Record<string, string> = {
  NOT_YOUR_TURN: "Сейчас ход соперника. Дождитесь своей очереди.",
  INVALID_PHASE: "Действие недоступно на текущем этапе матча.",
  MATCH_NOT_FINISHED: "Матч ещё не завершён — действие пока недоступно.",
  NOT_HOST: "Это действие доступно только хосту комнаты.",
  NOT_AUTHORIZED_RESTART: "Запросить реванш может только участник матча.",
  INVALID_ACTION_FOR_MODE: "Действие недоступно в выбранном режиме игры.",
  GAME_NOT_FOUND: "Матч не найден. Переподключитесь к комнате.",
  GAME_ALREADY_FINISHED: "Матч уже завершён.",
};

/** Превращает машиночитаемый код отказа сервера в понятный текст для игрока. */
export function getServerRejectReasonText(reason?: string): string {
  if (!reason) return "Действие отклонено сервером. Обновите состояние и попробуйте снова.";
  const known = REJECT_REASON_TEXT[reason];
  if (known) return known;
  return `Действие отклонено сервером (${reason}). Обновите состояние и попробуйте снова.`;
}

/** Текст уведомления о рассинхронизации состояния с рекомендацией переподключиться. */
export function getSyncErrorMessage(reason?: string): string {
  const base = "Состояние матча рассинхронизировано с сервером. Переподключитесь к комнате, чтобы продолжить.";
  if (!reason || reason === "UNKNOWN_REASON") return base;
  const known = REJECT_REASON_TEXT[reason];
  return known ? `${base} Причина: ${known}` : `${base} Код: ${reason}.`;
}

/** Текст финального экрана для аннулированного матча. */
export function getMatchAnnulledMessage(reason?: string, message?: string): string {
  if (message && message.trim().length > 0) return message.trim();
  if (reason === "DRAW_DISCONNECT") {
    return "Оба игрока не вернулись в игру. Матч аннулирован, победа и поражение не начислены.";
  }
  return "Матч аннулирован. Результат не засчитан, рейтинг не изменился.";
}

/** Форматирует миллисекунды в таймкод MM:SS (для баннера паузы таймера). */
export function formatRemainingMs(remainingMs: number | null | undefined): string {
  if (typeof remainingMs !== "number" || !Number.isFinite(remainingMs)) return "--:--";
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
