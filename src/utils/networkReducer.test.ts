import { describe, it, expect } from "vitest";
import { createInitialState } from "./gameLogic";
import { gameReducer } from "./gameReducer";
import type { GameAction } from "../types/multiplayer";

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
});