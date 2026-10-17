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

  it("Запрет обвинения мертвых персонажей", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    const targetId = getAdjacentCharacters(state.board, state.detectiveSecretId)[0].id;
    state.board = state.board.map(row => row.map(c => c.id === targetId ? { ...c, isAlive: false } : c));

    const nextState = accuseCharacter(state, targetId);

    expect(nextState).toBe(state);
  });

  it("Стабильное прохождение цепочки из 4 убийств с добором целей и победой Маньяка", () => {
    let state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    state.evidenceDeck = state.board.flat().filter(c => c.isAlive && c.id !== state.detectiveSecretId && c.id !== state.killerSecretId).map(c => c.id);
    state.victimList = [state.evidenceDeck.shift()!];

    for (let i = 1; i <= 4; i++) {
      const targetId = state.victimList[0];
      state.killerSecretId = getAdjacentCharacters(state.board, targetId)[0].id;
      state = killCharacter(state, targetId);

      if (i < 4) {
        expect(state.winner).toBeNull();
        expect(state.victimList.length).toBeGreaterThan(0);
      } else {
        expect(state.winner).toBe("KILLER");
      }
    }
  });

  it("Автодобор victimList до 4 карт после убийства", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    state.victimList = [state.victimList[0]]; // Оставляем 1 цель
    const aliveOthers = state.board.flat().filter(c => c.isAlive && c.id !== state.killerSecretId && c.id !== state.detectiveSecretId && c.id !== state.victimList[0]);
    state.evidenceDeck = aliveOthers.map(c => c.id).slice(0, 5);
    state.killerSecretId = getAdjacentCharacters(state.board, state.victimList[0])[0].id;

    const nextState = killCharacter(state, state.victimList[0]);

    expect(nextState.victimList.length).toBe(4);
  });

  it("Завершение игры победой Оперативника, если список жертв и колода исчерпаны", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    const targetId = state.victimList[0];
    state.victimList = [targetId];
    state.evidenceDeck = []; // Пустая колода
    state.killCount = 2; // Меньше 4
    state.killerSecretId = getAdjacentCharacters(state.board, targetId)[0].id;

    const nextState = killCharacter(state, targetId);

    expect(nextState.victimList.length).toBe(0);
    expect(nextState.winner).toBe("DETECTIVE");
  });

  it("Ложное задержание: список жертв пополняется из колоды до 4", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";

    const singleVictim = state.victimList[0];
    state.victimList = [singleVictim];

    const validTargets = state.board.flat().filter(c => c.isAlive && c.id !== state.detectiveSecretId && c.id !== state.killerSecretId && c.id !== singleVictim);
    state.evidenceDeck = validTargets.map(c => c.id).slice(0, 4);

    const wrongTarget = getAdjacentCharacters(state.board, state.detectiveSecretId).find(c => c.id !== state.killerSecretId)!;

    const nextState = accuseCharacter(state, wrongTarget.id);

    // singleVictim вернется в колоду, затем мы доберем до 4 целей
    expect(nextState.victimList.length).toBe(4);
  });
});