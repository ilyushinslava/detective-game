import { describe, it, expect } from "vitest";
import {
  isOppositeShift,
  getAdjacentCharacters,
  canCleanupBoard,
  createInitialState,
  cleanupDeadCharacters,
} from "./gameLogic";
import type { Character, GameState } from "../types/game";

const createMockChar = (id: string, name: string, isAlive = true): Character => ({
  id, name, isAlive, isExonerated: false
});

describe("Ядро правил игры (gameLogic)", () => {
  it("должно блокировать отмену хода противника (anti-undo)", () => {
    const lastShift = { type: "ROW" as const, index: 2, direction: "FORWARD" as const };
    expect(isOppositeShift(lastShift, "ROW", 2, "BACKWARD")).toBe(true);
    expect(isOppositeShift(lastShift, "ROW", 2, "FORWARD")).toBe(false);
  });

  it("должно корректно находить соседей клетки (включая диагонали)", () => {
    const board: Character[][] = [
      [createMockChar("1", "A"), createMockChar("2", "B"), createMockChar("3", "C")],
      [createMockChar("4", "D"), createMockChar("5", "E"), createMockChar("6", "F")],
      [createMockChar("7", "G"), createMockChar("8", "H"), createMockChar("9", "I")],
    ];
    const centerNeighbors = getAdjacentCharacters(board, "5");
    expect(centerNeighbors.length).toBe(8);
  });

  it("Гарантия колоды: все карты в evidenceDeck, руках и ролях присутствуют на поле 5x5", () => {
    const modes = ["SKHVATKA", "MANIAC_VS_OPERATIVE", "THIEF_HUNT", "SECRET_SERVICE"] as const;
    
    modes.forEach(mode => {
      const state = createInitialState(mode, "PVP", "DETECTIVE");
      const boardIds = new Set(state.board.flat().map(c => c.id));
      
      // Проверяем колоду
      state.evidenceDeck.forEach(id => {
        expect(boardIds.has(id), `В режиме ${mode} карта ${id} из колоды отсутствует на поле`).toBe(true);
      });

      // Проверяем руки и роли
      expect(boardIds.has(state.killerSecretId)).toBe(true);
      expect(boardIds.has(state.detectiveSecretId)).toBe(true);
      state.detectiveHand.forEach(id => expect(boardIds.has(id)).toBe(true));
      state.killerHand?.forEach(id => expect(boardIds.has(id)).toBe(true));
      state.uniformedOfficers?.forEach(id => expect(boardIds.has(id)).toBe(true));
      state.spies?.forEach(spy => expect(boardIds.has(spy.secretId)).toBe(true));
    });
  });

  it("cleanupDeadCharacters смещает убитых в конец поля без добора карт", () => {
    const board: Character[][] = Array(5).fill(null).map((_, r) =>
      Array(5).fill(null).map((__, c) => createMockChar(`c_${r}_${c}`, `Персонаж ${r}_${c}`))
    );
    board[0][0].isAlive = false;

    const state: GameState = {
      mode: "SKHVATKA", opponent: "AI", playerRole: "DETECTIVE", board,
      currentTurn: "DETECTIVE", killerSecretId: "c_1_1", detectiveSecretId: "c_2_2",
      detectiveHand: [], evidenceDeck: ["c25"], killCount: 1, winner: null,
      log: [], lastShift: null, lastInterrogation: null,
    };

    const nextState = cleanupDeadCharacters(state);

    expect(nextState.evidenceDeck).toEqual(["c25"]);
    expect(nextState.board.flat().length).toBe(25);
    expect(nextState.board.flat()[24].id).toBe("c_0_0");
    expect(nextState.board.flat()[24].isAlive).toBe(false);
  });
});