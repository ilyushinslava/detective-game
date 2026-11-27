import { describe, it, expect } from "vitest";
import {
  parseServerEvent,
  getServerRejectReasonText,
  getSyncErrorMessage,
  getMatchAnnulledMessage,
  formatRemainingMs,
  isActionRejectReason,
} from "../serverEvents";

describe("serverEvents", () => {
  describe("parseServerEvent", () => {
    it("разбирает объект TURN_TIMER_PAUSED и сохраняет remainingMs", () => {
      expect(parseServerEvent({ type: "TURN_TIMER_PAUSED", remainingMs: 5000 })).toEqual({
        type: "TURN_TIMER_PAUSED",
        remainingMs: 5000,
      });
    });

    it("разбирает JSON-строку TURN_TIMER_RESUMED", () => {
      const raw = JSON.stringify({ type: "TURN_TIMER_RESUMED", remainingMs: 12000 });
      expect(parseServerEvent(raw)).toEqual({ type: "TURN_TIMER_RESUMED", remainingMs: 12000 });
    });

    it("разбирает DUAL_DISCONNECT_PAUSE с gracePeriodMs", () => {
      expect(parseServerEvent({ type: "DUAL_DISCONNECT_PAUSE", gracePeriodMs: 20000 })).toEqual({
        type: "DUAL_DISCONNECT_PAUSE",
        gracePeriodMs: 20000,
      });
    });

    it("разбирает MATCH_ANNULLED с reason и message", () => {
      expect(
        parseServerEvent({
          type: "MATCH_ANNULLED",
          reason: "DRAW_DISCONNECT",
          message: "Матч аннулирован сервером.",
        })
      ).toEqual({
        type: "MATCH_ANNULLED",
        reason: "DRAW_DISCONNECT",
        message: "Матч аннулирован сервером.",
      });
    });

    it("разбирает SYNC_ERROR с reason и actionType", () => {
      expect(
        parseServerEvent({ type: "SYNC_ERROR", reason: "INVALID_PHASE", actionType: "SHIFT_BOARD" })
      ).toEqual({
        type: "SYNC_ERROR",
        reason: "INVALID_PHASE",
        actionType: "SHIFT_BOARD",
      });
    });

    it("разбирает ACTION_REJECTED с reason", () => {
      expect(parseServerEvent({ type: "ACTION_REJECTED", reason: "NOT_YOUR_TURN" })).toEqual({
        type: "ACTION_REJECTED",
        reason: "NOT_YOUR_TURN",
      });
    });

    it("разбирает SESSION_SUPERSEDED и сохраняет reason", () => {
      expect(parseServerEvent({ type: "SESSION_SUPERSEDED", reason: "NEW_SESSION" })).toEqual({
        type: "SESSION_SUPERSEDED",
        reason: "NEW_SESSION",
      });
    });

    it("разбирает ACTION_REJECTED с причиной TARGET_NOT_IN_RADIUS", () => {
      expect(
        parseServerEvent({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" })
      ).toEqual({
        type: "ACTION_REJECTED",
        reason: "TARGET_NOT_IN_RADIUS",
      });
    });

    it("сохраняет actionType у SYNC_ERROR с причиной TARGET_NOT_IN_RADIUS", () => {
      expect(
        parseServerEvent({
          type: "SYNC_ERROR",
          reason: "TARGET_NOT_IN_RADIUS",
          actionType: "KILL_CHARACTER",
        })
      ).toEqual({
        type: "SYNC_ERROR",
        reason: "TARGET_NOT_IN_RADIUS",
        actionType: "KILL_CHARACTER",
      });
    });

    it("округляет дробные числовые значения", () => {
      expect(parseServerEvent({ type: "TURN_TIMER_PAUSED", remainingMs: 1234.6 })).toEqual({
        type: "TURN_TIMER_PAUSED",
        remainingMs: 1235,
      });
      expect(parseServerEvent({ type: "DUAL_DISCONNECT_PAUSE", gracePeriodMs: 999.2 })).toEqual({
        type: "DUAL_DISCONNECT_PAUSE",
        gracePeriodMs: 999,
      });
    });

    it("принимает числовые значения в виде строк", () => {
      expect(parseServerEvent({ type: "TURN_TIMER_RESUMED", remainingMs: "7500" })).toEqual({
        type: "TURN_TIMER_RESUMED",
        remainingMs: 7500,
      });
    });

    it("возвращает null для отрицательных и NaN-значений remainingMs", () => {
      expect(parseServerEvent({ type: "TURN_TIMER_PAUSED", remainingMs: -1 })).toBeNull();
      expect(parseServerEvent({ type: "TURN_TIMER_PAUSED", remainingMs: NaN })).toBeNull();
      expect(parseServerEvent({ type: "TURN_TIMER_PAUSED", remainingMs: "abc" })).toBeNull();
      expect(parseServerEvent({ type: "DUAL_DISCONNECT_PAUSE", gracePeriodMs: -100 })).toBeNull();
    });

    it("подставляет UNKNOWN_REASON при отсутствующей причине", () => {
      expect(parseServerEvent({ type: "MATCH_ANNULLED" })).toEqual({
        type: "MATCH_ANNULLED",
        reason: "UNKNOWN_REASON",
        message: undefined,
      });
      expect(parseServerEvent({ type: "SYNC_ERROR" })).toEqual({
        type: "SYNC_ERROR",
        reason: "UNKNOWN_REASON",
        actionType: undefined,
      });
      expect(parseServerEvent({ type: "ACTION_REJECTED" })).toEqual({
        type: "ACTION_REJECTED",
        reason: "UNKNOWN_REASON",
      });
    });

    it("возвращает null для неизвестного типа", () => {
      expect(parseServerEvent({ type: "STATE_UPDATE" })).toBeNull();
      expect(parseServerEvent({ type: "PONG" })).toBeNull();
    });

    it("возвращает null для битого JSON, массива и null", () => {
      expect(parseServerEvent("INVALID_CORRUPTED_JSON{{{")).toBeNull();
      expect(parseServerEvent([{ type: "TURN_TIMER_PAUSED", remainingMs: 1000 }])).toBeNull();
      expect(parseServerEvent(null)).toBeNull();
      expect(parseServerEvent(undefined)).toBeNull();
      expect(parseServerEvent(42)).toBeNull();
    });
  });

  describe("getServerRejectReasonText", () => {
    it("возвращает русские тексты для известных кодов", () => {
      expect(getServerRejectReasonText("NOT_YOUR_TURN")).toContain("Сейчас ход соперника");
      expect(getServerRejectReasonText("NOT_HOST")).toContain("только хосту");
      expect(getServerRejectReasonText("INVALID_ACTION_FOR_MODE")).toContain("выбранном режиме");
      expect(getServerRejectReasonText("INVALID_PHASE")).toContain("текущем этапе");
      expect(getServerRejectReasonText("GAME_NOT_FOUND")).toContain("Матч не найден");
    });

    it("возвращает понятный не-generic текст для TARGET_NOT_IN_RADIUS", () => {
      const text = getServerRejectReasonText("TARGET_NOT_IN_RADIUS");
      expect(text).toContain("3×3");
      expect(text).not.toContain("TARGET_NOT_IN_RADIUS");
    });

    it("для неизвестного кода возвращает общий текст с указанием кода", () => {
      const text = getServerRejectReasonText("SOME_UNKNOWN_CODE");
      expect(text).toContain("SOME_UNKNOWN_CODE");
      expect(text).toContain("Действие отклонено сервером");
    });

    it("для пустой причины возвращает общий текст без кода", () => {
      const text = getServerRejectReasonText("");
      expect(text).toContain("Действие отклонено сервером");
      expect(text).not.toContain("(");
    });
  });

  describe("getSyncErrorMessage", () => {
    it("содержит рекомендацию переподключиться и расшифровку причины", () => {
      const text = getSyncErrorMessage("NOT_YOUR_TURN");
      expect(text).toContain("Переподключитесь");
      expect(text).toContain("Сейчас ход соперника");
    });

    it("для неизвестной причины добавляет код", () => {
      const text = getSyncErrorMessage("WEIRD_REASON");
      expect(text).toContain("Переподключитесь");
      expect(text).toContain("WEIRD_REASON");
    });

    it("для отсутствующей причины возвращает только базовую рекомендацию", () => {
      const text = getSyncErrorMessage();
      expect(text).toContain("Переподключитесь");
      expect(text).not.toContain("Причина:");
    });
  });

  describe("isActionRejectReason", () => {
    it("считает обычным отказом действия известные коды", () => {
      expect(isActionRejectReason("TARGET_NOT_IN_RADIUS")).toBe(true);
      expect(isActionRejectReason("ACTION_NOT_APPLIED")).toBe(true);
      expect(isActionRejectReason("NOT_YOUR_TURN")).toBe(true);
    });

    it("неизвестный код не считается обычным отказом (потенциальный десинк)", () => {
      expect(isActionRejectReason("SOME_UNKNOWN_CODE")).toBe(false);
      expect(isActionRejectReason(undefined)).toBe(false);
      expect(isActionRejectReason(42)).toBe(false);
    });
  });

  describe("getMatchAnnulledMessage", () => {
    it("приоритетно возвращает серверный message", () => {
      expect(getMatchAnnulledMessage("DRAW_DISCONNECT", "Свой текст сервера")).toBe(
        "Свой текст сервера"
      );
    });

    it("для DRAW_DISCONNECT возвращает текст про обоих игроков", () => {
      const text = getMatchAnnulledMessage("DRAW_DISCONNECT");
      expect(text).toContain("Оба игрока");
      expect(text).toContain("аннулирован");
    });

    it("для прочих причин возвращает нейтральный текст", () => {
      const text = getMatchAnnulledMessage("OTHER_REASON");
      expect(text).toContain("Матч аннулирован");
      expect(text.toLowerCase()).toContain("результат не засчитан");
    });
  });

  describe("formatRemainingMs", () => {
    it("форматирует миллисекунды в MM:SS", () => {
      expect(formatRemainingMs(27000)).toBe("00:27");
      expect(formatRemainingMs(0)).toBe("00:00");
    });

    it("возвращает --:-- для null/undefined/нечисла", () => {
      expect(formatRemainingMs(null)).toBe("--:--");
      expect(formatRemainingMs(undefined)).toBe("--:--");
      expect(formatRemainingMs(NaN)).toBe("--:--");
    });

    it("округляет вверх до целой секунды", () => {
      expect(formatRemainingMs(1)).toBe("00:01");
      expect(formatRemainingMs(999)).toBe("00:01");
      expect(formatRemainingMs(60001)).toBe("01:01");
    });
  });
});
