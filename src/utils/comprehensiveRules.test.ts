import { describe, it, expect } from "vitest";
import {
  createInitialState,
  killCharacter,
  disguiseKiller,
  exonerateFromHand,
  accuseCharacter,
  getAdjacentCharacters,
  escapeManiac,
  robNeighbor,
  fastDisguise,
  swearInOfficer,
  spyCatch,
  spyInterrogate,
} from "./gameLogic";

describe("Математическая строгость и инварианты", () => {
  it("Инвариант поля 5x5: все карты в колоде и на руках присутствуют на поле", () => {
    const modes = ["SKHVATKA", "MANIAC_VS_OPERATIVE", "THIEF_HUNT", "SECRET_SERVICE"] as const;
    
    modes.forEach(mode => {
      const state = createInitialState(mode, "PVP", "DETECTIVE");
      const boardIds = new Set(state.board.flat().map(c => c.id));
      
      expect(boardIds.size).toBe(25);
      
      state.evidenceDeck.forEach(id => {
        expect(boardIds.has(id), `В режиме ${mode} карта ${id} из колоды отсутствует на поле`).toBe(true);
      });

      expect(boardIds.has(state.killerSecretId)).toBe(true);
      expect(boardIds.has(state.detectiveSecretId)).toBe(true);
      state.detectiveHand.forEach(id => expect(boardIds.has(id)).toBe(true));
      state.killerHand?.forEach(id => expect(boardIds.has(id)).toBe(true));
      state.uniformedOfficers?.forEach(id => expect(boardIds.has(id)).toBe(true));
      state.spies?.forEach(spy => expect(boardIds.has(spy.secretId)).toBe(true));
    });
  });
});

describe("Режим: СХВАТКА (SKHVATKA)", () => {
  it("Обязательная ликвидация в 1-м раунде и опрос свидетелей", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    const target = getAdjacentCharacters(state.board, state.killerSecretId).find(c => c.id !== state.detectiveSecretId)!;

    const nextState = killCharacter(state, target.id);

    expect(nextState.killCount).toBe(1);
    expect(nextState.board.flat().find((c) => c.id === target.id)?.isAlive).toBe(false);
    expect(nextState.lastInterrogation).not.toBeNull();
    expect(nextState.lastInterrogation?.interrogator).toBe("KILLER");
    expect(typeof nextState.lastInterrogation?.isNear).toBe("boolean");
  });

  it("Победа Бандита при 14 убийствах", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    state.killCount = 13;
    const target = getAdjacentCharacters(state.board, state.killerSecretId).find(c => c.id !== state.detectiveSecretId)!;

    const nextState = killCharacter(state, target.id);

    expect(nextState.killCount).toBe(14);
    expect(nextState.winner).toBe("KILLER");
  });

  it("Победа Инспектора при успешном задержании, ошибка ставит isExonerated", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    
    // Ошибка
    const innocentTarget = getAdjacentCharacters(state.board, state.detectiveSecretId).find(c => c.id !== state.killerSecretId)!;
    const missState = accuseCharacter(state, innocentTarget.id);
    expect(missState.winner).toBeNull();
    expect(missState.board.flat().find(c => c.id === innocentTarget.id)?.isExonerated).toBe(true);

    // Успех
    state.detectiveSecretId = getAdjacentCharacters(state.board, state.killerSecretId)[0].id;
    const winState = accuseCharacter(state, state.killerSecretId);
    expect(winState.winner).toBe("DETECTIVE");
  });

  it("Конспирация Бандита: смена на живую карту с поля, провал при мертвом", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    const initialKillerId = state.killerSecretId;

    // Успех
    const aliveChar = state.board.flat().find(c => c.isAlive && c.id !== initialKillerId && c.id !== state.detectiveSecretId)!;
    state.evidenceDeck = [aliveChar.id, ...state.evidenceDeck.filter(id => id !== aliveChar.id)];
    const successState = disguiseKiller(state);
    expect(successState.killerSecretId).toBe(aliveChar.id);
    expect(successState.evidenceDeck[successState.evidenceDeck.length - 1]).toBe(initialKillerId);

    // Провал
    const deadChar = state.board.flat().find(c => c.id !== initialKillerId && c.id !== state.detectiveSecretId)!;
    deadChar.isAlive = false;
    state.evidenceDeck = [deadChar.id, ...state.evidenceDeck.filter(id => id !== deadChar.id)];
    const failState = disguiseKiller(state);
    expect(failState.killerSecretId).toBe(initialKillerId);
    expect(failState.log[failState.log.length - 1]).toContain("Провал конспирации");
  });
});

describe("Режим: МАНЬЯК ПРОТИВ ОПЕРАТИВНИКА (MANIAC_VS_OPERATIVE)", () => {
  it("Атака строго по victimList[0] или Оперативнику, игнор остальных", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    
    // Игнор
    const invalidTarget = state.board.flat().find(c => !state.victimList.includes(c.id) && c.id !== state.detectiveSecretId && c.id !== state.killerSecretId)!;
    state.killerSecretId = getAdjacentCharacters(state.board, invalidTarget.id)[0].id;
    const failState = killCharacter(state, invalidTarget.id);
    expect(failState.killCount).toBe(0);

    // Успех по жертве
    const targetId = state.victimList[0];
    state.killerSecretId = getAdjacentCharacters(state.board, targetId)[0].id;
    const successState = killCharacter(state, targetId);
    expect(successState.killCount).toBe(1);
    expect(successState.victimList[0]).not.toBe(targetId);
  });

  it("Система жизней Оперативника: смена роли из руки, поражение при пустой руке", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    const initialHandSize = state.detectiveHand.length;
    const expectedNewSecretId = state.detectiveHand[0];
    state.killerSecretId = getAdjacentCharacters(state.board, state.detectiveSecretId)[0].id;

    // Смена жизни
    const nextState = killCharacter(state, state.detectiveSecretId);
    expect(nextState.detectiveHand.length).toBe(initialHandSize - 1);
    expect(nextState.detectiveSecretId).toBe(expectedNewSecretId);
    expect(nextState.winner).toBeNull();

    // Поражение
    nextState.detectiveHand = [];
    nextState.killerSecretId = getAdjacentCharacters(nextState.board, nextState.detectiveSecretId)[0].id;
    const finalState = killCharacter(nextState, nextState.detectiveSecretId);
    expect(finalState.winner).toBe("KILLER");
  });

  it("Побег маньяка: смена личности и +1 жертва", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    const initialVictimCount = state.victimList.length;
    const aliveChar = state.board.flat().find(c => c.isAlive && c.id !== state.killerSecretId && c.id !== state.detectiveSecretId)!;
    state.evidenceDeck = [aliveChar.id, ...state.evidenceDeck.filter(id => id !== aliveChar.id)];

    const nextState = escapeManiac(state);
    expect(nextState.killerSecretId).toBe(aliveChar.id);
    expect(nextState.victimList.length).toBe(initialVictimCount + 1);
  });
});

describe("Режим: ОХОТА НА ГРАБИТЕЛЯ (THIEF_HUNT)", () => {
  it("Кража НЕ меняет личность и НЕ списывает карты из колоды", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    const startKiller = state.killerSecretId;
    const initialDeckLength = state.evidenceDeck.length;
    const target = getAdjacentCharacters(state.board, startKiller)[0];
    
    const nextState = robNeighbor(state, target.id);

    expect(nextState.trophiesKiller).toBe(1);
    expect(nextState.board.flat().find(c => c.id === target.id)?.isRobbed).toBe(true);
    expect(nextState.killerSecretId).toBe(startKiller);
    expect(nextState.evidenceDeck.length).toBe(initialDeckLength);
  });

  it("Смена личности СТРОГО через fastDisguise", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    const initialKillerId = state.killerSecretId;
    const maskToUse = state.killerHand![0];

    const nextState = fastDisguise(state, maskToUse);

    expect(nextState.killerSecretId).toBe(maskToUse);
    expect(nextState.killerHand).not.toContain(maskToUse);
    expect(nextState.killerHand).toContain(initialKillerId);
  });

  it("Победа Вора ровно на 5 кражах", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    state.trophiesKiller = 4;
    const target = getAdjacentCharacters(state.board, state.killerSecretId)[0];
    
    const nextState = robNeighbor(state, target.id);
    expect(nextState.trophiesKiller).toBe(5);
    expect(nextState.winner).toBe("KILLER");
  });

  it("Задержание Вора работает от тайного детектива И от патрульного", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    
    // Через патрульного
    const patrolOfficer = state.board.flat().find(c => c.id !== state.killerSecretId && c.id !== state.detectiveSecretId)!;
    state.uniformedOfficers = [patrolOfficer.id];
    state.killerSecretId = getAdjacentCharacters(state.board, patrolOfficer.id)[0].id;

    const nextState = accuseCharacter(state, state.killerSecretId);
    expect(nextState.winner).toBe("DETECTIVE");
  });
});

describe("Режим: СЕКРЕТНАЯ СЛУЖБА (SECRET_SERVICE)", () => {
  it("Игра ведется строго до 4 трофеев", () => {
    const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 4);
    expect(state.spyTargetTrophies).toBe(4);
  });

  it("Разоблачение: поимка дает трофей и меняет прикрытие, ошибка не дает трофей", () => {
    const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 4);
    const activeSpyIndex = state.activeSpyIndex!;
    const activeSpy = state.spies![activeSpyIndex];
    
    // Успех
    const targetCell = getAdjacentCharacters(state.board, activeSpy.secretId)[0];
    state.spies![1].secretId = targetCell.id;
    const winState = spyCatch(state, targetCell.id);
    expect(winState.spies![activeSpyIndex].trophies).toBe(1);
    expect(winState.spies![1].secretId).not.toBe(targetCell.id);

    // Ошибка
    const civilianCell = getAdjacentCharacters(state.board, activeSpy.secretId).find(c => c.id !== state.spies![1].secretId)!;
    const failState = spyCatch(state, civilianCell.id);
    expect(failState.spies![activeSpyIndex].trophies).toBe(0);
  });
});