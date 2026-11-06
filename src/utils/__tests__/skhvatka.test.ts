import { describe, it, expect } from "vitest";
import {
  createInitialState,
  killCharacter,
  disguiseKiller,
  exonerateFromHand,
  accuseCharacter,
  getAdjacentCharacters,
} from "../gameLogic";

describe("Режим: Схватка (SKHVATKA)", () => {
  it("Обязательная ликвидация в 1-м раунде: счетчик убийств увеличивается", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    const targetId = state.victimList[0];
    const neighbors = getAdjacentCharacters(state.board, targetId);
    state.killerSecretId = neighbors[0].id;
    const nextState = killCharacter(state, targetId);

    expect(nextState.killCount).toBe(1);
    expect(nextState.board.flat().find((c) => c.id === targetId)?.isAlive).toBe(false);
    expect(nextState.currentTurn).toBe("DETECTIVE");
  });

  it("Опрос свидетелей при ликвидации невиновного: фиксация алиби Инспектора", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    const innocentTarget = getAdjacentCharacters(state.board, state.killerSecretId).find((c) => c.id !== state.detectiveSecretId)!;

    const nextState = killCharacter(state, innocentTarget.id);

    expect(nextState.lastInterrogation).not.toBeNull();
    expect(nextState.lastInterrogation?.interrogator).toBe("KILLER");
    expect(typeof nextState.lastInterrogation?.isNear).toBe("boolean");
  });

  it("Проверка алиби Оперативника: выставление статуса алиби", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    const cardToExonerate = state.detectiveHand[0];
    const nextState = exonerateFromHand(state, cardToExonerate);
    expect(nextState.board.flat().find((c) => c.id === cardToExonerate)?.isExonerated).toBe(true);
    expect(nextState.currentTurn).toBe("KILLER");
  });

  it("Проверка алиби Инспектора (exonerateFromHand): выставление isExonerated и добор карты", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    const cardToExonerate = state.detectiveHand[0];
    const initialHandSize = state.detectiveHand.length;

    const nextState = exonerateFromHand(state, cardToExonerate);

    expect(nextState.board.flat().find((c) => c.id === cardToExonerate)?.isExonerated).toBe(true);
    expect(nextState.detectiveHand).not.toContain(cardToExonerate);
    expect(nextState.detectiveHand.length).toBe(initialHandSize);
    expect(nextState.lastInterrogation?.interrogator).toBe("DETECTIVE");
    expect(nextState.currentTurn).toBe("KILLER");
  });

  it("Победа Закона при успешном Задержании Бандита", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    state.detectiveSecretId = getAdjacentCharacters(state.board, state.killerSecretId)[0].id;

    const nextState = accuseCharacter(state, state.killerSecretId);

    expect(nextState.winner).toBe("DETECTIVE");
  });
});