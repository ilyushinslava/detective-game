import { describe, it, expect } from "vitest";
import {
  createInitialState,
  killCharacter,
  disguiseKiller,
  exonerateFromHand,
  accuseCharacter,
  getAdjacentCharacters,
} from "./gameLogic";

describe("Режим: Схватка (SKHVATKA)", () => {
  it("Обязательная ликвидация в 1-м раунде: счетчик убийств увеличивается", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    const target = getAdjacentCharacters(state.board, state.killerSecretId)[0];

    const nextState = killCharacter(state, target.id);

    expect(nextState.killCount).toBe(1);
    expect(nextState.board.flat().find((c) => c.id === target.id)?.isAlive).toBe(false);
    expect(nextState.currentTurn).toBe("DETECTIVE");
  });

  it("Победа Бандита при 14 убийствах", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    state.killCount = 13;
    const target = getAdjacentCharacters(state.board, state.killerSecretId).find(c => c.id !== state.detectiveSecretId)!;

    const nextState = killCharacter(state, target.id);

    expect(nextState.killCount).toBe(14);
    expect(nextState.winner).toBe("KILLER");
  });

  it("Опрос свидетелей при ликвидации невиновного: фиксация алиби Инспектора", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    const innocentTarget = getAdjacentCharacters(state.board, state.killerSecretId).find((c) => c.id !== state.detectiveSecretId)!;

    const nextState = killCharacter(state, innocentTarget.id);

    expect(nextState.lastInterrogation).not.toBeNull();
    expect(nextState.lastInterrogation?.interrogator).toBe("KILLER");
    expect(typeof nextState.lastInterrogation?.isNear).toBe("boolean");
  });

  it("Конспирация Бандита (disguiseKiller): смена тайной личности на живого персонажа с поля", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    const initialKillerId = state.killerSecretId;
    const aliveCharOnBoard = state.board.flat().find(
      (c) => c.isAlive && c.id !== initialKillerId && c.id !== state.detectiveSecretId
    )!;

    state.evidenceDeck = [aliveCharOnBoard.id, ...state.evidenceDeck.filter((id) => id !== aliveCharOnBoard.id)];
    const nextState = disguiseKiller(state);

    expect(nextState.killerSecretId).toBe(aliveCharOnBoard.id);
    expect(nextState.evidenceDeck[nextState.evidenceDeck.length - 1]).toBe(initialKillerId);
    expect(nextState.board.flat().some((c) => c.id === nextState.killerSecretId && c.isAlive)).toBe(true);
    expect(nextState.currentTurn).toBe("DETECTIVE");
    expect(nextState.disguisedNotification).toEqual({
      roleName: "Бандит",
      newSecretId: aliveCharOnBoard.id,
    });
  });

  it("Проверка алиби Инспектора (exonerateFromHand): выставление isExonerated и добор карты", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
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
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    state.detectiveSecretId = getAdjacentCharacters(state.board, state.killerSecretId)[0].id;

    const nextState = accuseCharacter(state, state.killerSecretId);

    expect(nextState.winner).toBe("DETECTIVE");
  });
});