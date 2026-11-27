import type { Role, GameModeType } from "./game";

export type ClientDeviceType = "TV_DISPLAY" | "CONTROLLER" | "PLAYER" | "SPECTATOR";

export type RoomStatus = "EMPTY" | "WAITING" | "READY_TO_START" | "PLAYING" | "PAUSED" | "FINISHED";

export interface MorseCandidate {
  roomCode: string;
  hostName: string;
  mode: string;
  status: string;
  playersCount: number;
  maxPlayers: number;
  isPrivate?: boolean;
}

export type BaseGameAction = {
  senderId?: string;
  timestamp?: number;
  actionId?: string;
  nextTurn?: Role;
  nextSpyIndex?: number;
  targetId?: string;
};

export type GameAction = BaseGameAction & (
  | { type: "SHIFT_BOARD"; payload: any }
  | { type: "KILL_CHARACTER"; payload: any }
  | { type: "ROB_NEIGHBOR"; payload: any }
  | { type: "ACCUSE"; payload: any }
  | { type: "CAPTURE_SPY"; payload: any }
  | { type: "INTERROGATE"; payload: any }
  | { type: "ESCAPE_MANIAC" }
  | { type: "FAST_DISGUISE"; payload: any }
  | { type: "DISGUISE" }
  | { type: "EXONERATE"; payload: any }
  | { type: "CLEANUP" }
  | { type: "RESTART_GAME"; payload?: any }
  | { type: "MATCH_STARTED"; payload: { state: any } }
  | { type: "REQUEST_RESTART"; payload: { requestedBy: "HOST" | "GUEST"; rematchMode?: "SWAP" | "SAME" | "RANDOM" } }
  | { type: "CONFIRM_RESTART" }
  | { type: "REJECT_RESTART" }
  | { type: "CLEAR_DISGUISE_NOTIFICATION" }
  | { type: "ASK_QUESTION"; payload: any }
  | { type: "TURN_TIMEOUT" }
  | { type: "TIMEOUT_PASS" }
  | { type: "DUEL_TIMEOUT_PASS" }
  | { type: "RESTART_DUEL"; payload?: any }
  | { type: "RESOLVE_DUEL_TIE_BREAK"; payload?: any }
  | { type: "SET_MATCH_POT"; payload: { pot: number; bet: number } }
  | { type: "PLAYER_READY" }
  | { type: "PLAYER_UNREADY" }
  | { type: "SWEAR_IN_OFFICER"; payload: any }
  | { type: "SET_INSPECTOR_ROLE"; payload: { chosenId: string } }
  | { type: "DUEL_ASK_QUESTION"; payload: { questionId: string }; senderId?: string }
  | { type: "DUEL_ACCUSE"; payload: { targetId: string }; senderId?: string }
  | { type: "PREVIEW_SHIFT"; payload: { type: "ROW" | "COL"; index: number } | null }
  | { type: "START_GAME"; payload?: any }
  | { type: "START_MATCH"; payload?: { mode?: GameModeType; isPassAndPlay?: boolean } }
  | { type: "CHANGE_SETTINGS"; payload?: { mode?: GameModeType; roleDistribution?: "RANDOM" | "HOST_KILLER" | "HOST_DETECTIVE" } }
  | { type: "END_TURN" }
  | { type: "CONFIRM_TURN_READY" }
  | { type: "TV_TOGGLE_PAUSE" }
  | { type: "TV_TOGGLE_MUTE" }
  | { type: "TV_CONFIRM_RESTART"; payload?: { roleAction?: "SWAP" | "SAME" } }
  | { type: "TV_EXIT_TO_LOBBY" }
);

/**
 * События, которые авторитетный сервер (PartyKit) отправляет клиенту
 * вне обычного потока синхронизации состояния (STATE_UPDATE / ROOM_STATUS).
 * Используются для управления паузами таймера, дисконнектами и отклонёнными действиями.
 */
export type ServerEventType =
  | "TURN_TIMER_PAUSED"
  | "TURN_TIMER_RESUMED"
  | "DUAL_DISCONNECT_PAUSE"
  | "MATCH_ANNULLED"
  | "SYNC_ERROR"
  | "ACTION_REJECTED"
  | "SESSION_SUPERSEDED";

/** Сервер поставил таймер хода на паузу (например, активный игрок потерял связь). */
export interface TurnTimerPausedEvent {
  type: "TURN_TIMER_PAUSED";
  /** Оставшееся время хода в миллисекундах на момент паузы. */
  remainingMs: number;
}

/** Сервер возобновил таймер хода с сохранённым остатком времени. */
export interface TurnTimerResumedEvent {
  type: "TURN_TIMER_RESUMED";
  /** Оставшееся время хода в миллисекундах, с которого продолжается отсчёт. */
  remainingMs: number;
}

/** Оба игрока оффлайн: матч поставлен на паузу до истечения grace period. */
export interface DualDisconnectPauseEvent {
  type: "DUAL_DISCONNECT_PAUSE";
  /** Длительность окна ожидания возвращения игроков в миллисекундах. */
  gracePeriodMs: number;
}

/** Матч аннулирован (например, оба игрока не вернулись): победа/поражение не начисляются. */
export interface MatchAnnulledEvent {
  type: "MATCH_ANNULLED";
  /** Машиночитаемая причина аннулирования (например, DRAW_DISCONNECT). */
  reason: string;
  /** Готовый текст для игрока (если сервер его прислал). */
  message?: string;
}

/** Сервер обнаружил рассинхронизацию состояния с клиентом. */
export interface SyncErrorEvent {
  type: "SYNC_ERROR";
  /** Причина отклонения/рассинхронизации (машиночитаемый код). */
  reason: string;
  /** Тип действия, которое вызвало ошибку. */
  actionType?: string;
}

/** Действие игрока отклонено авторитетным сервером. */
export interface ActionRejectedEvent {
  type: "ACTION_REJECTED";
  /** Причина отклонения действия (машиночитаемый код). */
  reason: string;
}

/**
 * Сессия этого сокета замещена новым подключением с тем же authToken
 * (например, игрок открыл игру во второй вкладке). Клиент обязан
 * прекратить автопереподключение, чтобы вкладки не выбивали друг друга.
 */
export interface SessionSupersededEvent {
  type: "SESSION_SUPERSEDED";
  /** Машиночитаемая причина замещения (например, NEW_SESSION). */
  reason: string;
}

export type ServerEvent =
  | TurnTimerPausedEvent
  | TurnTimerResumedEvent
  | DualDisconnectPauseEvent
  | MatchAnnulledEvent
  | SyncErrorEvent
  | ActionRejectedEvent
  | SessionSupersededEvent;
