import { describe, it, expect } from "vitest";
import {
  createInitialState,
  robNeighbor,
  fastDisguise,
  accuseCharacter,
  swearInOfficer,
  getAdjacentCharacters,
} from "./gameLogic";

describe("Режим: Охота на грабителя (THIEF_HUNT)", () => {
  it("Кража у соседа (robNeighbor): увеличение трофеев, личность НЕ меняется", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    const startKiller = state.killerSecretId;
    const target = getAdjacentCharacters(state.board, startKiller)[0];
    
    const nextState = robNeighbor(state, target.id);

    expect(nextState.trophiesKiller).toBe(1);
    expect(nextState.board.flat().find((c) => c.id === target.id)?.isRobbed).toBe(true);
    expect(nextState.killerSecretId).toBe(startKiller); // Личность осталась прежней
    expect(nextState.currentTurn).toBe("DETECTIVE");
  });

  it("Победа Вора при 5 кражах", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    state.trophiesKiller = 4;
    const target = getAdjacentCharacters(state.board, state.killerSecretId)[0];
    
    const nextState = robNeighbor(state, target.id);

    expect(nextState.trophiesKiller).toBe(5);
    expect(nextState.winner).toBe("KILLER");
  });

  it("Быстрая конспирация из руки (fastDisguise): замена killerSecretId картой из killerHand", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    const initialKillerId = state.killerSecretId;
    const maskToUse = state.killerHand![0];

    const nextState = fastDisguise(state, maskToUse);

    expect(nextState.killerSecretId).toBe(maskToUse);
    expect(nextState.killerHand).not.toContain(maskToUse);
    expect(nextState.killerHand).toContain(initialKillerId);
    expect(nextState.disguisedNotification).toEqual({ roleName: "Грабитель", newSecretId: maskToUse });
  });

  it("Задержание вора через патрульного (accuseCharacter): победа Полиции", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    const patrolOfficer = state.board.flat().find(c => c.id !== state.killerSecretId && c.id !== state.detectiveSecretId)!;
    state.uniformedOfficers = [patrolOfficer.id];
    state.killerSecretId = getAdjacentCharacters(state.board, patrolOfficer.id)[0].id;

    const nextState = accuseCharacter(state, state.killerSecretId);

    expect(nextState.winner).toBe("DETECTIVE");
  });

  it("Присяга нового офицера (swearInOfficer): замена патрульного и штраф (Вор крадет 1 сокровище)", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    const oldOfficer = state.uniformedOfficers![0];
    const initialTrophies = state.trophiesKiller ?? 0;

    const nextState = swearInOfficer(state, oldOfficer);

    expect(nextState.uniformedOfficers).not.toContain(oldOfficer);
    expect(nextState.trophiesKiller).toBe(initialTrophies + 1);
    expect(nextState.currentTurn).toBe("KILLER");
  });
});