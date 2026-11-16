// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalGame, resolveNextPlayerInfo } from "../useLocalGame";
import * as tvAudio from "../../utils/tvAudio";
import { createInitialState } from "../../utils/gameLogic";

describe("useLocalGame Hook & Local Engine Integration", () => {
  beforeEach(() => {
    vi.spyOn(tvAudio, "playShiftSound").mockImplementation(() => {});
    vi.spyOn(tvAudio, "playEliminateSound").mockImplementation(() => {});
    vi.spyOn(tvAudio, "playRadarPing").mockImplementation(() => {});
    vi.spyOn(tvAudio, "playClickSound").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("инициализирует локальное состояние в фазе ACTION без отправки сетевых пакетов", () => {
    const { result } = renderHook(() =>
      useLocalGame({ initialMode: "MANIAC_VS_OPERATIVE", initialOpponent: "PVP" })
    );

    expect(result.current.localPhase).toBe("ACTION");
    expect(result.current.isBlindfoldOpen).toBe(false);
    expect(result.current.gameState.mode).toBe("MANIAC_VS_OPERATIVE");
    expect(result.current.gameState.opponent).toBe("PVP");
    expect(result.current.nextPlayerInfo.nextRole).toBe("KILLER");
    expect(result.current.nextPlayerInfo.nextPlayerName).toBe("Маньяк");
  });

  it("воспроизводит процедурный звук playShiftSound при выполнении маневра SHIFT_BOARD", () => {
    const { result } = renderHook(() =>
      useLocalGame({ initialMode: "MANIAC_VS_OPERATIVE", initialOpponent: "PVP" })
    );

    act(() => {
      result.current.dispatchLocalAction({
        type: "SHIFT_BOARD",
        payload: { shiftType: "ROW", index: 0, direction: "FORWARD" },
      });
    });

    expect(tvAudio.playShiftSound).toHaveBeenCalledTimes(1);
    expect(result.current.gameState.lastShift).not.toBeNull();
  });

  it("воспроизводит playEliminateSound и переходит в фазу INTERSTITIAL при смене хода после ликвидации", async () => {
    const { result } = renderHook(() =>
      useLocalGame({ initialMode: "MANIAC_VS_OPERATIVE", initialOpponent: "PVP" })
    );

    const neighbors = tvAudio; // Just importing check
    const { killerSecretId, board } = result.current.gameState;
    // Находим соседнего персонажа для валидного удара
    const flat = board.flat();
    const killerChar = flat.find((c) => c.id === killerSecretId)!;
    // Находим реального соседа
    const { getAdjacentCharacters } = await import("../../utils/gameLogic");
    const adjacent = getAdjacentCharacters(board, killerSecretId);
    const targetVictim = adjacent[0];

    act(() => {
      result.current.dispatchLocalAction({
        type: "KILL_CHARACTER",
        payload: { targetId: targetVictim.id },
      });
    });

    expect(tvAudio.playEliminateSound).toHaveBeenCalledTimes(1);
    expect(result.current.gameState.currentTurn).toBe("DETECTIVE");
    expect(result.current.localPhase).toBe("INTERSTITIAL");
    expect(result.current.isBlindfoldOpen).toBe(true);
    expect(result.current.nextPlayerInfo.nextPlayerName).toBe("Оперативник");
  });

  it("снимает шторку INTERSTITIAL при вызове dismissInterstitial с клик-аудио", () => {
    const { result } = renderHook(() =>
      useLocalGame({ initialMode: "MANIAC_VS_OPERATIVE", initialOpponent: "PVP" })
    );

    act(() => {
      result.current.dispatchLocalAction({ type: "END_TURN" });
    });

    expect(result.current.localPhase).toBe("INTERSTITIAL");
    expect(result.current.isBlindfoldOpen).toBe(true);

    act(() => {
      result.current.dismissInterstitial();
    });

    expect(result.current.localPhase).toBe("ACTION");
    expect(result.current.isBlindfoldOpen).toBe(false);
    expect(tvAudio.playClickSound).toHaveBeenCalled();
  });

  it("воспроизводит playRadarPing при допросе / радаре", () => {
    const { result } = renderHook(() =>
      useLocalGame({ initialMode: "MANIAC_VS_OPERATIVE", initialOpponent: "PVP" })
    );

    act(() => {
      result.current.dispatchLocalAction({
        type: "CHECK_ALIBI",
        payload: { targetId: "c1" },
      });
    });

    expect(tvAudio.playRadarPing).toHaveBeenCalledTimes(1);
  });

  it("корректно разрешает имена и цвета ролей для всех 4 режимов игры", () => {
    const stateManiac = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "KILLER");
    expect(resolveNextPlayerInfo(stateManiac).nextPlayerName).toBe("Маньяк");

    const stateDetective = { ...stateManiac, currentTurn: "DETECTIVE" as const };
    expect(resolveNextPlayerInfo(stateDetective).nextPlayerName).toBe("Оперативник");

    const stateThief = createInitialState("THIEF_HUNT", "PVP", "KILLER");
    expect(resolveNextPlayerInfo(stateThief).nextPlayerName).toBe("Грабитель");
    const statePolice = { ...stateThief, currentTurn: "DETECTIVE" as const };
    expect(resolveNextPlayerInfo(statePolice).nextPlayerName).toBe("Полиция");

    const stateLineUp = createInitialState("LINE_UP", "PVP", "KILLER");
    // В режиме LINE_UP первым всегда ходит Следователь (DETECTIVE)
    expect(resolveNextPlayerInfo(stateLineUp).nextPlayerName).toBe("Следователь");
    const stateLineUpSuspect = { ...stateLineUp, currentTurn: "KILLER" as const };
    expect(resolveNextPlayerInfo(stateLineUpSuspect).nextPlayerName).toBe("Подозреваемый");

    const stateSecret = createInitialState("SECRET_SERVICE", "PVP", "KILLER");
    const secretInfo = resolveNextPlayerInfo(stateSecret);
    expect(secretInfo.nextPlayerName).toBeTruthy();
    expect(secretInfo.nextPlayerColor).toContain("text-");
  });

  describe("Solo Mode (AI Bot) & Раздумья бота", () => {
    it("активирует isAIThinking и совершает ход через calculateNextAIMove при ходе бота", () => {
      vi.useFakeTimers();

      // Игрок - Сыщик (DETECTIVE), первый ход у Маньяка (KILLER, Бот)
      const { result } = renderHook(() =>
        useLocalGame({
          initialMode: "MANIAC_VS_OPERATIVE",
          initialOpponent: "AI",
          initialRole: "DETECTIVE",
        })
      );

      // В самом начале наступает ход Маньяка-бота
      expect(result.current.gameState.currentTurn).toBe("KILLER");
      expect(result.current.isAIThinking).toBe(true);
      // Фаза INTERSTITIAL не должна активироваться в Solo AI режиме
      expect(result.current.isBlindfoldOpen).toBe(false);

      // Прокручиваем таймер раздумий бота (макс 2500 мс)
      act(() => {
        vi.advanceTimersByTime(2500);
      });

      // Бот совершил ход и передал ход человеку (Сыщику)
      expect(result.current.isAIThinking).toBe(false);
      expect(result.current.gameState.currentTurn).toBe("DETECTIVE");

      vi.useRealTimers();
    });

    it("блокирует dispatchLocalAction, пока бот думает (isAIThinking === true)", () => {
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useLocalGame({
          initialMode: "MANIAC_VS_OPERATIVE",
          initialOpponent: "AI",
          initialRole: "DETECTIVE",
        })
      );

      expect(result.current.isAIThinking).toBe(true);

      // Игрок пытается сделать сдвиг во время хода бота
      act(() => {
        result.current.dispatchLocalAction({
          type: "SHIFT_BOARD",
          payload: { shiftType: "ROW", index: 0, direction: "FORWARD" },
        });
      });

      // Действие должно быть проигнорировано
      expect(tvAudio.playShiftSound).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
