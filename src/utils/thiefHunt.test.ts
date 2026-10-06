import { describe, it, expect } from "vitest";
import { createInitialState, robNeighbor, setPolicePatrol } from "./gameLogic";
import { getThiefAIMove, getPoliceAIMove } from "./aiLogic";

describe("Режим: Охота на грабителя (THIEF_HUNT)", () => {
  it("Вор успешно похищает сокровище и сменяет тайную личность", () => {
    const state = createInitialState("THIEF_HUNT", "AI", "DETECTIVE");
    const startKiller = state.killerSecretId;
    const target =
      state.board[0][0].id !== startKiller
        ? state.board[0][0].id
        : state.board[0][1].id;

    // Имитируем соседство
    state.killerSecretId = state.board[0][0].id;
    const nextState = robNeighbor(state, state.board[0][1].id);

    expect(nextState.trophiesKiller).toBe(1);
    expect(nextState.killerSecretId).not.toBe(startKiller);
  });

  it("Полиция блокирует ряд или колонку патрулем", () => {
    const state = createInitialState("THIEF_HUNT", "AI", "KILLER");
    const nextState = setPolicePatrol(state, "ROW", 1);

    expect(nextState.blockedShift).toEqual({ type: "ROW", index: 1 });
  });

  it("Бот-вор и бот-полиция совершают корректные ходы", () => {
    const state = createInitialState("THIEF_HUNT", "AI", "DETECTIVE");
    const thiefMove = getThiefAIMove(state);
    expect(thiefMove.currentTurn).toBe("DETECTIVE");

    const policeMove = getPoliceAIMove(thiefMove);
    expect(policeMove.currentTurn).toBe("KILLER");
  });
});
