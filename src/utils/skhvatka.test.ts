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

  it("Конспирация Бандита (disguiseKiller): провал при вытягивании мертвого персонажа", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    const initialKillerId = state.killerSecretId;

    const deadChar = state.board.flat().find(
      (c) => c.id !== initialKillerId && c.id !== state.detectiveSecretId
    )!;
    deadChar.isAlive = false;

    state.evidenceDeck = [deadChar.id, ...state.evidenceDeck.filter((id) => id !== deadChar.id)];

    const nextState = disguiseKiller(state);

    expect(nextState.killerSecretId).toBe(initialKillerId);
    expect(nextState.evidenceDeck).not.toContain(deadChar.id);
    expect(nextState.currentTurn).toBe("DETECTIVE");
    expect(nextState.disguisedNotification).toBeUndefined();
    expect(nextState.log[nextState.log.length - 1]).toContain("Провал конспирации");
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

  it("Попытка ликвидации персонажа не по соседству отклоняется (killCharacter)", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    const neighbors = getAdjacentCharacters(state.board, state.killerSecretId).map(c => c.id);
    const farCell = state.board.flat().find(c => c.id !== state.killerSecretId && !neighbors.includes(c.id))!;

    const nextState = killCharacter(state, farCell.id);

    expect(nextState).toBe(state);
    expect(nextState.currentTurn).toBe("KILLER");
  });

  it("Попытка обвинения персонажа не по соседству отклоняется (accuseCharacter)", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    const neighbors = getAdjacentCharacters(state.board, state.detectiveSecretId).map(c => c.id);
    const farCell = state.board.flat().find(c => c.id !== state.detectiveSecretId && !neighbors.includes(c.id))!;

    const nextState = accuseCharacter(state, farCell.id);

    expect(nextState).toBe(state);
    expect(nextState.currentTurn).toBe("DETECTIVE");
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