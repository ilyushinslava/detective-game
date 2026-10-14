import { describe, it, expect } from "vitest";
import {
  createInitialState,
  killCharacter,
  escapeManiac,
  accuseCharacter,
  getAdjacentCharacters,
} from "./gameLogic";

describe("Режим: Маньяк против оперативника (MANIAC_VS_OPERATIVE)", () => {
  it("Ликвидация цели строго из victimList: открытие следующей жертвы", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    const targetId = state.victimList[0];
    state.killerSecretId = getAdjacentCharacters(state.board, targetId)[0].id;

    const nextState = killCharacter(state, targetId);

    expect(nextState.killCount).toBe(1);
    expect(nextState.board.flat().find((c) => c.id === targetId)?.isAlive).toBe(false);
    expect(nextState.victimList[0]).not.toBe(targetId);
  });

  it("Запрет атаки персонажей вне victimList: цель не погибает", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    const invalidTarget = state.board.flat().find(
      (c) => !state.victimList.includes(c.id) && c.id !== state.detectiveSecretId && c.id !== state.killerSecretId
    )!;
    state.killerSecretId = getAdjacentCharacters(state.board, invalidTarget.id)[0].id;

    const nextState = killCharacter(state, invalidTarget.id);

    expect(nextState.killCount).toBe(0);
    expect(nextState.board.flat().find((c) => c.id === invalidTarget.id)?.isAlive).toBe(true);
    expect(nextState.currentTurn).toBe("KILLER");
  });

  it("Убийство Оперативника: потеря карты из руки (жизни) и смена личности Оперативника", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    const initialHandSize = state.detectiveHand.length;
    const expectedNewSecretId = state.detectiveHand[0];
    state.killerSecretId = getAdjacentCharacters(state.board, state.detectiveSecretId)[0].id;

    const nextState = killCharacter(state, state.detectiveSecretId);

    expect(nextState.detectiveHand.length).toBe(initialHandSize - 1);
    expect(nextState.detectiveSecretId).toBe(expectedNewSecretId);
    expect(nextState.winner).toBeNull();
  });

  it("Убийство Оперативника без карт в руке: победа Маньяка", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    state.detectiveHand = [];
    state.killerSecretId = getAdjacentCharacters(state.board, state.detectiveSecretId)[0].id;

    const nextState = killCharacter(state, state.detectiveSecretId);

    expect(nextState.winner).toBe("KILLER");
  });

  it("Побег маньяка (escapeManiac): смена личности и добавление +1 цели", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    const initialVictimCount = state.victimList.length;
    const aliveChar = state.board.flat().find((c) => c.isAlive && c.id !== state.killerSecretId && c.id !== state.detectiveSecretId)!;
    state.evidenceDeck = [aliveChar.id, ...state.evidenceDeck.filter((id) => id !== aliveChar.id)];

    const nextState = escapeManiac(state);

    expect(nextState.killerSecretId).toBe(aliveChar.id);
    expect(nextState.victimList.length).toBe(initialVictimCount + 1);
    expect(nextState.disguisedNotification).toEqual({ roleName: "Маньяк", newSecretId: aliveChar.id });
  });

  it("Поражение Маньяка при точном Задержании Оперативником", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    state.detectiveSecretId = getAdjacentCharacters(state.board, state.killerSecretId)[0].id;

    const nextState = accuseCharacter(state, state.killerSecretId);

    expect(nextState.winner).toBe("DETECTIVE");
  });
});