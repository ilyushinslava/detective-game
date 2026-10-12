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
    expect(state.killCount).toBe(0);
    expect(state.currentTurn).toBe("KILLER");

    const neighbors = getAdjacentCharacters(state.board, state.killerSecretId);
    const target = neighbors[0];

    const nextState = killCharacter(state, target.id);

    expect(nextState.killCount).toBe(1);
    expect(nextState.board.flat().find((c) => c.id === target.id)?.isAlive).toBe(false);
    expect(nextState.currentTurn).toBe("DETECTIVE");
  });

  it("Опрос свидетелей при ликвидации невиновного: фиксация алиби Инспектора", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    
    const neighbors = getAdjacentCharacters(state.board, state.killerSecretId);
    const innocentTarget = neighbors.find((c) => c.id !== state.detectiveSecretId)!;

    const nextState = killCharacter(state, innocentTarget.id);

    expect(nextState.lastInterrogation).not.toBeNull();
    expect(nextState.lastInterrogation?.interrogator).toBe("KILLER");
    expect(nextState.lastInterrogation?.targetName).toBe(innocentTarget.name);
    expect(typeof nextState.lastInterrogation?.isNear).toBe("boolean");
  });

 it("Конспирация Бандита (disguiseKiller): смена тайной личности", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    const initialKillerId = state.killerSecretId;

    // Находим живого персонажа, отличного от текущего бандита и инспектора
    const aliveChar = state.board.flat().find(
      (c) => c.isAlive && c.id !== initialKillerId && c.id !== state.detectiveSecretId
    )!;

    // Гарантируем, что верхняя карта колоды улик ведет на этого живого персонажа
    state.evidenceDeck = [aliveChar.id, ...state.evidenceDeck.filter(id => id !== aliveChar.id)];

    const nextState = disguiseKiller(state);

    expect(nextState.killerSecretId).toBe(aliveChar.id);
    expect(nextState.currentTurn).toBe("DETECTIVE");
  });

  it("Проверка алиби Инспектора (exonerateFromHand): выставление isExonerated и добор карты", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    const cardToExonerate = state.detectiveHand[0];
    const initialHandSize = state.detectiveHand.length;

    const nextState = exonerateFromHand(state, cardToExonerate);

    const exoneratedChar = nextState.board.flat().find((c) => c.id === cardToExonerate);
    expect(exoneratedChar?.isExonerated).toBe(true);
    expect(nextState.detectiveHand).not.toContain(cardToExonerate);
    expect(nextState.detectiveHand.length).toBe(initialHandSize); // Сбросили одну, добрали новую
    expect(nextState.lastInterrogation?.interrogator).toBe("DETECTIVE");
    expect(nextState.currentTurn).toBe("KILLER");
  });

  it("Победа Закона при успешном Задержании Бандита (accuseCharacter)", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    
    // Искусственно ставим Инспектора рядом с Бандитом для успешного ареста
    const neighbors = getAdjacentCharacters(state.board, state.killerSecretId);
    state.detectiveSecretId = neighbors[0].id;

    const nextState = accuseCharacter(state, state.killerSecretId);

    expect(nextState.winner).toBe("DETECTIVE");
    expect(nextState.log[nextState.log.length - 1]).toContain("Победа Закона");
  });
});