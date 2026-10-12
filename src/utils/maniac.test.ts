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
    const initialVictimListLength = state.victimList.length;

    // Искусственно ставим Маньяка рядом с целью
    const neighbors = getAdjacentCharacters(state.board, targetId);
    state.killerSecretId = neighbors[0].id;

    const nextState = killCharacter(state, targetId);

    expect(nextState.killCount).toBe(1);
    expect(nextState.board.flat().find((c) => c.id === targetId)?.isAlive).toBe(false);
    expect(nextState.victimList[0]).not.toBe(targetId);
    expect(nextState.victimList.length).toBe(initialVictimListLength - 1);
  });

  it("Запрет атаки персонажей вне victimList: цель не погибает", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    
    // Находим персонажа, которого нет в списке жертв и который не является Оперативником
    const invalidTarget = state.board.flat().find(
      (c) => !state.victimList.includes(c.id) && c.id !== state.detectiveSecretId && c.id !== state.killerSecretId
    )!;

    // Ставим Маньяка рядом с неверной целью
    const neighbors = getAdjacentCharacters(state.board, invalidTarget.id);
    state.killerSecretId = neighbors[0].id;

    const nextState = killCharacter(state, invalidTarget.id);

    expect(nextState.killCount).toBe(0);
    expect(nextState.board.flat().find((c) => c.id === invalidTarget.id)?.isAlive).toBe(true);
    expect(nextState.currentTurn).toBe("KILLER"); // Ход не передан
  });

  it("Попытка ликвидации через клетку отклоняется даже для цели из списка жертв", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    const targetId = state.victimList[0];
    
    // Искусственно ставим Маньяка далеко от цели
    const neighbors = getAdjacentCharacters(state.board, targetId).map(c => c.id);
    const farCell = state.board.flat().find(c => c.id !== targetId && !neighbors.includes(c.id))!;
    state.killerSecretId = farCell.id;

    const nextState = killCharacter(state, targetId);

    expect(nextState).toBe(state);
    expect(nextState.currentTurn).toBe("KILLER");
  });

  it("Побег маньяка (escapeManiac): смена личности и добавление +1 цели", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    const initialKillerId = state.killerSecretId;
    const initialVictimCount = state.victimList.length;

    // Находим живого персонажа на поле, отличного от текущего маньяка и оперативника
    const aliveChar = state.board
      .flat()
      .find((c) => c.isAlive && c.id !== initialKillerId && c.id !== state.detectiveSecretId)!;

    // Гарантируем, что в колоде есть карты, и первая на выдачу — живой персонаж
    state.evidenceDeck = [aliveChar.id, ...state.evidenceDeck.filter((id) => id !== aliveChar.id)];

    const nextState = escapeManiac(state);

    expect(nextState.killerSecretId).not.toBe(initialKillerId);
    expect(nextState.killerSecretId).toBe(aliveChar.id);
    expect(nextState.victimList.length).toBe(initialVictimCount + 1);
    expect(nextState.currentTurn).toBe("DETECTIVE");
  });

  it("Поражение Маньяка при точном Задержании Оперативником", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";

    // Ставим Оперативника рядом с Маньяком
    const neighbors = getAdjacentCharacters(state.board, state.killerSecretId);
    state.detectiveSecretId = neighbors[0].id;

    const nextState = accuseCharacter(state, state.killerSecretId);

    expect(nextState.winner).toBe("DETECTIVE");
  });
});