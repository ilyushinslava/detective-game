import { describe, it, expect } from "vitest";
import { createInitialState, interrogateTrait, accuseLineUp } from "./gameLogic";

describe("Режим: Очная ставка (LINE_UP)", () => {
  it("createInitialState генерирует поле 5x5, разные detectiveSecretId и killerSecretId, а первый ход за DETECTIVE", () => {
    const state = createInitialState("LINE_UP", "PVP");
    expect(state.board.length).toBe(5);
    expect(state.board[0].length).toBe(5);
    expect(state.detectiveSecretId).toBeTruthy();
    expect(state.killerSecretId).toBeTruthy();
    expect(state.detectiveSecretId).not.toBe(state.killerSecretId);
    expect(state.currentTurn).toBe("DETECTIVE");
    expect(state.log[0]).toContain("Очная ставка");
  });

  it("interrogateTrait корректно считывает признак цели, меняет currentTurn и формирует lastTraitQuestion", () => {
    const state = createInitialState("LINE_UP", "PVP");
    const targetChar = state.board.flat().find(c => c.id === state.killerSecretId)!;
    
    const nextState = interrogateTrait(state, "hasHat");
    
    expect(nextState.currentTurn).toBe("KILLER");
    expect(nextState.lastTraitQuestion).toEqual({
      trait: "hasHat",
      answer: Boolean(targetChar.hasHat),
      askerRole: "DETECTIVE"
    });
    expect(nextState.log[nextState.log.length - 1]).toContain("запросил признак");
  });

  it("accuseLineUp с правильным targetId присуждает победу обвиняющему", () => {
    const state = createInitialState("LINE_UP", "PVP");
    const targetId = state.killerSecretId;
    
    const nextState = accuseLineUp(state, targetId);
    
    expect(nextState.winner).toBe("DETECTIVE");
    expect(nextState.log[nextState.log.length - 1]).toContain("Точное опознание!");
  });

  it("accuseLineUp с ошибочным targetId приводит к поражению обвиняющего", () => {
    const state = createInitialState("LINE_UP", "PVP");
    const wrongTargetId = state.board.flat().find(c => c.id !== state.killerSecretId)!.id;
    
    const nextState = accuseLineUp(state, wrongTargetId);
    
    expect(nextState.winner).toBe("KILLER");
    expect(nextState.log[nextState.log.length - 1]).toContain("Ошибка следствия!");
  });
});