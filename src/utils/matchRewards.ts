// src/utils/matchRewards.ts
// P0-4: единые серверные правила награды/MMR и валидации матча.
//
// Этот модуль — клиентское зеркало серверной функции public.record_match_result
// (миграция 20261127_record_match_anticheat.sql). Он используется:
//   * в оффлайн-режиме и mock-клиенте Supabase (src/lib/supabase.ts);
//   * как fallback, если облачный RPC недоступен.
// Источник истины в онлайне — ответ RPC, но правила расчёта обязаны совпадать.

export type MatchRole = "DETECTIVE" | "KILLER" | "SPY" | string;

// Лимиты длительности матча берутся из единого источника истины (gameRules.ts)
// и реэкспортируются для обратной совместимости существующих импортов.
import {
  MATCH_MIN_DURATION_SECONDS,
  MATCH_DEFAULT_DURATION_SECONDS,
  MATCH_MAX_DURATION_SECONDS,
  MATCH_SECRET_SERVICE_MAX_DURATION_SECONDS,
  MATCH_LINE_UP_MAX_DURATION_SECONDS,
} from "../constants/gameRules";

export {
  MATCH_MIN_DURATION_SECONDS,
  MATCH_DEFAULT_DURATION_SECONDS,
  MATCH_MAX_DURATION_SECONDS,
  MATCH_SECRET_SERVICE_MAX_DURATION_SECONDS,
  MATCH_LINE_UP_MAX_DURATION_SECONDS,
};

export const MMR_WIN_DELTA = 25;
export const MMR_LOSS_DELTA = -20;
export const MMR_ABS_MAX_DELTA = 30;

export const CASH_WIN_REWARD = 100;
export const CASH_LOSS_REWARD = 25;
export const CASH_MAX_REWARD = 300;

const KNOWN_MODES = [
  "MANIAC_VS_OPERATIVE",
  "THIEF_HUNT",
  "SECRET_SERVICE",
  "LINE_UP",
] as const;

export function normalizeMode(mode?: string | null): string {
  return (mode || "MANIAC_VS_OPERATIVE").trim().toUpperCase();
}

export function normalizeRole(role?: MatchRole | null): string {
  return (role || "").trim().toUpperCase();
}

export function isKnownMode(mode?: string | null): boolean {
  return (KNOWN_MODES as readonly string[]).includes(normalizeMode(mode));
}

/**
 * Верхняя граница длительности матча для режима (античит-кламп).
 */
export function getMaxMatchDuration(mode?: string | null): number {
  switch (normalizeMode(mode)) {
    case "SECRET_SERVICE":
      return MATCH_SECRET_SERVICE_MAX_DURATION_SECONDS;
    case "LINE_UP":
      return MATCH_LINE_UP_MAX_DURATION_SECONDS;
    case "THIEF_HUNT":
    case "MANIAC_VS_OPERATIVE":
      return MATCH_MAX_DURATION_SECONDS;
    default:
      return MATCH_MAX_DURATION_SECONDS;
  }
}

/**
 * Приводит длительность матча к серверным рамкам.
 * Не «раздувает» фактическое значение: используется реальная длительность,
 * округлённая до целого и ограниченная минимумом/максимумом режима.
 */
export function clampMatchDuration(
  mode: string | null | undefined,
  durationSeconds?: number | null
): number {
  const raw =
    typeof durationSeconds === "number" && Number.isFinite(durationSeconds)
      ? durationSeconds
      : MATCH_DEFAULT_DURATION_SECONDS;
  const rounded = Math.round(raw);
  if (rounded <= 0) return MATCH_DEFAULT_DURATION_SECONDS;
  return Math.min(Math.max(rounded, MATCH_MIN_DURATION_SECONDS), getMaxMatchDuration(mode));
}

/**
 * Серверное определение победителя.
 *
 * Для всех режимов, кроме SECRET_SERVICE, истина выводится из связки
 * role / winnerRole (клиентский isWinner игнорируется).
 * В SECRET_SERVICE роль обоих игроков — DETECTIVE, поэтому используется
 * клиентская подсказка (сервер не может различить, кто собрал трофеи).
 */
export function resolveMatchOutcome(params: {
  mode?: string | null;
  role?: MatchRole | null;
  winnerRole?: MatchRole | null;
  fallbackIsWinner?: boolean;
}): boolean {
  const mode = normalizeMode(params.mode);
  const fallback = Boolean(params.fallbackIsWinner);

  if (mode === "SECRET_SERVICE") return fallback;

  const role = normalizeRole(params.role);
  const winnerRole = normalizeRole(params.winnerRole);

  if (!role || !winnerRole) return fallback;
  if (winnerRole === "DRAW" || winnerRole === "OPPONENT") return false;

  return role === winnerRole;
}

/**
 * Серверная дельта MMR: +25 за победу, -20 за поражение, кламп ±30.
 */
export function calculateMmrDelta(isWinner: boolean): number {
  const delta = isWinner ? MMR_WIN_DELTA : MMR_LOSS_DELTA;
  return Math.max(-MMR_ABS_MAX_DELTA, Math.min(MMR_ABS_MAX_DELTA, delta));
}

/**
 * Серверная награда cash за матч: 100 за победу, 25 за поражение, кламп 0..300.
 */
export function calculateMatchCashReward(isWinner: boolean): number {
  const reward = isWinner ? CASH_WIN_REWARD : CASH_LOSS_REWARD;
  return Math.max(0, Math.min(CASH_MAX_REWARD, reward));
}

/**
 * Уникальный идентификатор матча (ключ идемпотентности награды).
 */
export function createMatchId(): string {
  const globalCrypto = typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }
  // RFC4122 v4 fallback для сред без crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
