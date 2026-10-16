import { describe, it, expect } from "vitest";
import {
  createInitialState,
  swearInOfficer,
  accuseCharacter,
  killCharacter,
  getAdjacentCharacters,
} from "./gameLogic";

describe("Игровые правила (Rules Audit)", () => {
  it("THIEF_HUNT: Вызов патруля начисляет Вору +1 сокровище и передает ход", () => {
    let state = createInitialState("THIEF_HUNT", "PVP");
    const initialTrophies = state.trophiesKiller ?? 0;
    const oldOfficerId = state.uniformedOfficers![0];
    
    state = swearInOfficer(state, oldOfficerId);
    
    expect(state.trophiesKiller).toBe(initialTrophies + 1);
    expect(state.currentTurn).toBe("KILLER");
    expect(state.uniformedOfficers).not.toContain(oldOfficerId);
  });

  it("THIEF_HUNT: Ложное обвинение не выставляет алиби (isExonerated: true)", () => {
    let state = createInitialState("THIEF_HUNT", "PVP");
    state.currentTurn = "DETECTIVE";
    
    const targetId = state.board.flat().find(c => c.id !== state.killerSecretId)!.id;
    // Подменяем позицию сыщика для успешного обхода проверки "соседство"
    state.detectiveSecretId = targetId; 
    
    const newState = accuseCharacter(state, targetId);
    const targetChar = newState.board.flat().find(c => c.id === targetId);
    
    expect(targetChar?.isExonerated).toBe(false);
    expect(newState.currentTurn).toBe("KILLER");
  });

  it("MANIAC_VS_OPERATIVE: Ложное задержание возвращает цель из victimList в evidenceDeck", () => {
    let state = createInitialState("MANIAC_VS_OPERATIVE", "PVP");
    state.currentTurn = "DETECTIVE";
    
    const initialVictimCount = state.victimList.length;
    const initialDeckCount = state.evidenceDeck.length;
    const lastVictim = state.victimList[state.victimList.length - 1];
    
    const targetId = state.board.flat().find(c => c.id !== state.killerSecretId)!.id;
    state.detectiveSecretId = targetId; // Искусственно удовлетворяем условие соседства
    
    const newState = accuseCharacter(state, targetId);
    
    expect(newState.victimList.length).toBe(initialVictimCount - 1);
    expect(newState.evidenceDeck.length).toBe(initialDeckCount + 1);
    expect(newState.evidenceDeck[newState.evidenceDeck.length - 1]).toBe(lastVictim);
  });

  it("SKHVATKA vs MANIAC_VS_OPERATIVE: Ликвидация невиновного создает объект lastInterrogation только в Схватке", () => {
    // Тест для режима Схватка
    let stateSkhvatka = createInitialState("SKHVATKA", "PVP");
    // Берем реального живого соседа убийцы, не совпадающего с детективом
    const neighborsSkhvatka = getAdjacentCharacters(stateSkhvatka.board, stateSkhvatka.killerSecretId);
    const validTargetSkhvatka = neighborsSkhvatka.find(c => c.id !== stateSkhvatka.detectiveSecretId && c.isAlive)!;
    
    const resSkhvatka = killCharacter(stateSkhvatka, validTargetSkhvatka.id);
    expect(resSkhvatka.lastInterrogation).not.toBeNull();
    expect(resSkhvatka.lastInterrogation?.interrogator).toBe("KILLER");
    
    // Тест для режима Маньяка
    let stateManiac = createInitialState("MANIAC_VS_OPERATIVE", "PVP");
    const targetManiacId = stateManiac.victimList[0];
    // Ставим маньяка реальным соседом первой жертвы
    const neighborsManiac = getAdjacentCharacters(stateManiac.board, targetManiacId);
    stateManiac.killerSecretId = neighborsManiac[0].id;
    
    const resManiac = killCharacter(stateManiac, targetManiacId);
    expect(resManiac.lastInterrogation).toBeNull(); // Опрос не проводится
  });
});