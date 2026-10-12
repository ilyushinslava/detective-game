import { describe, it, expect } from "vitest";
import {
  createInitialState,
  robNeighbor,
  setPolicePatrol,
  fastDisguise,
  accuseCharacter,
  getAdjacentCharacters,
} from "./gameLogic";
import { getThiefAIMove, getPoliceAIMove } from "./aiLogic";

describe("Режим: Охота на грабителя (THIEF_HUNT)", () => {
  it("Кража у соседа и у своей клетки (robNeighbor): увеличение trophiesKiller", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    const startKiller = state.killerSecretId;
    
    // Кража у самого себя
    const nextState = robNeighbor(state, startKiller);

    expect(nextState.trophiesKiller).toBe(1);
    expect(nextState.board.flat().find((c) => c.id === startKiller)?.isRobbed).toBe(true);
    expect(nextState.killerSecretId).not.toBe(startKiller); // Личность сменилась из колоды
    expect(nextState.currentTurn).toBe("DETECTIVE");
  });

  it("Быстрая конспирация из руки (fastDisguise): замена killerSecretId картой из killerHand", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    const initialKillerId = state.killerSecretId;
    const maskToUse = state.killerHand![0];

    const nextState = fastDisguise(state, maskToUse);

    expect(nextState.killerSecretId).toBe(maskToUse);
    expect(nextState.killerHand).not.toContain(maskToUse);
    expect(nextState.killerHand).toContain(initialKillerId); // Старая личность ушла в руку
    expect(nextState.currentTurn).toBe("DETECTIVE");
  });

  it("Задержание вора через патрульного (accuseCharacter): победа Полиции", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    
    // Берем живого персонажа, который не является Грабителем или Детективом
    const patrolOfficer = state.board.flat().find(
      (c) => c.id !== state.killerSecretId && c.id !== state.detectiveSecretId
    )!;
    
    // Явно назначаем его патрульным
    state.uniformedOfficers = [patrolOfficer.id];
    
    // Искусственно ставим Вора рядом с патрульным
    const neighbors = getAdjacentCharacters(state.board, patrolOfficer.id);
    state.killerSecretId = neighbors[0].id;

    // Полиция обвиняет Вора, находящегося рядом с патрульным
    const nextState = accuseCharacter(state, state.killerSecretId);

    expect(nextState.winner).toBe("DETECTIVE");
  });

  it("Попытка кражи у персонажа не по соседству отклоняется (robNeighbor)", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    const neighbors = getAdjacentCharacters(state.board, state.killerSecretId).map(c => c.id);
    const farCell = state.board.flat().find(c => c.id !== state.killerSecretId && !neighbors.includes(c.id))!;

    const nextState = robNeighbor(state, farCell.id);

    expect(nextState).toBe(state);
    expect(nextState.currentTurn).toBe("KILLER");
  });

  it("Полиция блокирует ряд или колонку патрулем", () => {
    const state = createInitialState("THIEF_HUNT", "AI", "KILLER");
    const nextState = setPolicePatrol(state, "ROW", 1);

    expect(nextState.blockedShift).toEqual({ type: "ROW", index: 1 });
  });

  it("Бот-вор и бот-полиция совершают корректные ходы", () => {
    const state = createInitialState("THIEF_HUNT", "AI", "DETECTIVE");
    const thiefMove = getThiefAIMove(state);
    expect(thiefMove.currentTurn).toBe("DETECTIVE");

    const policeMove = getPoliceAIMove(thiefMove);
    expect(policeMove.currentTurn).toBe("KILLER");
  });
});