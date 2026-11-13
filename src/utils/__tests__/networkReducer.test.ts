import { describe, it, expect } from "vitest";
import { createInitialState } from "../gameLogic";
import { gameReducer } from "../gameReducer";
import type { GameAction } from "../../types/multiplayer";

describe("Сетевой редьюсер и синхронизация (gameReducer)", () => {
  it("Жесткая синхронизация currentTurn: удаленный экшен с nextTurn переопределяет стейт", () => {
    const state = createInitialState("SKHVATKA", "ONLINE", "DETECTIVE");
    state.currentTurn = "KILLER";

    const remoteAction: GameAction = {
      type: "SHIFT_BOARD",
      payload: { shiftType: "ROW", index: 0, direction: "FORWARD" },
      senderId: "remote",
      nextTurn: "DETECTIVE", // Хост прислал, что следующий ход Детектива
    };

    const nextState = gameReducer(state, remoteAction);
    expect(nextState.currentTurn).toBe("DETECTIVE");
  });

  it("Анти-отмена сдвига: блокирует локальный обратный сдвиг, но применяет удаленный", () => {
    const state = createInitialState("SKHVATKA", "ONLINE", "DETECTIVE");
    state.lastShift = { type: "ROW", index: 2, direction: "FORWARD" };

    // Локальная попытка отмены (должна быть проигнорирована)
    const localAction: GameAction = {
      type: "SHIFT_BOARD",
      payload: { shiftType: "ROW", index: 2, direction: "BACKWARD" },
      senderId: "local",
    };
    const localState = gameReducer(state, localAction);
    expect(localState.lastShift).toEqual(state.lastShift);

    // Удаленная попытка отмены (должна быть применена безусловно)
    const remoteAction: GameAction = {
      type: "SHIFT_BOARD",
      payload: { shiftType: "ROW", index: 2, direction: "BACKWARD" },
      senderId: "remote",
    };
    const remoteState = gameReducer(state, remoteAction);
    expect(remoteState.lastShift).toEqual({ type: "ROW", index: 2, direction: "BACKWARD" });
  });

  it("Игнорирование игровых действий после победы (winner !== null)", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    state.winner = "KILLER";

    const action: GameAction = {
      type: "SHIFT_BOARD",
      payload: { shiftType: "ROW", index: 0, direction: "FORWARD" },
      senderId: "local",
    };

    const nextState = gameReducer(state, action);
    expect(nextState).toBe(state); // Стейт не изменился
  });

  it("TURN_TIMEOUT: корректно передает ход оппоненту и сбрасывает блокировки", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
    state.currentTurn = "KILLER";
    state.blockedShift = { type: "ROW", index: 1 };

    const nextState = gameReducer(state, { type: "TURN_TIMEOUT" });
    expect(nextState.currentTurn).toBe("DETECTIVE");
    expect(nextState.blockedShift).toBeNull();
    expect(nextState.log[nextState.log.length - 1]).toContain("Время хода истекло");

    // Обратный таймаут: от DETECTIVE к KILLER
    const backState = gameReducer(nextState, { type: "TURN_TIMEOUT" });
    expect(backState.currentTurn).toBe("KILLER");
  });

  it("TURN_TIMEOUT в SECRET_SERVICE: переключает activeSpyIndex и detectiveSecretId на следующего шпиона", () => {
    const state = createInitialState("SECRET_SERVICE", "ONLINE", "DETECTIVE", 3);
    state.activeSpyIndex = 0;
    const nextSpySecretId = state.spies![1].secretId;

    const nextState = gameReducer(state, { type: "TURN_TIMEOUT" });
    expect(nextState.activeSpyIndex).toBe(1);
    expect(nextState.detectiveSecretId).toBe(nextSpySecretId);
    expect(nextState.log[nextState.log.length - 1]).toContain("Время хода истекло");
  });
});