import { describe, it, expect } from "vitest";
import { findCharacterPosition, getCharacterNeighbors, isUndoShift } from "../tvPartyLogic";
import { createInitialState } from "../gameLogic";
import type { ShiftPayload } from "../../types/game";

describe("tvPartyLogic Unit Tests", () => {
  const gameState = createInitialState("SKHVATKA", "ONLINE", "KILLER");
  const board = gameState.board;

  it("находит позицию персонажа по ID", () => {
    const target = board[2][2];
    const pos = findCharacterPosition(board, target.id);
    expect(pos).toEqual({ row: 2, col: 2 });
  });

  it("возвращает null, если персонаж не найден или ID пустой", () => {
    expect(findCharacterPosition(board, "unknown-id")).toBeNull();
    expect(findCharacterPosition(board, null)).toBeNull();
  });

  it("возвращает ровно 8 соседей для центральной клетки (2, 2)", () => {
    const centerCard = board[2][2];
    const neighbors = getCharacterNeighbors(board, centerCard.id);
    expect(neighbors.length).toBe(8);
  });

  it("возвращает ровно 3 соседа для угловой клетки (0, 0)", () => {
    const cornerCard = board[0][0];
    const neighbors = getCharacterNeighbors(board, cornerCard.id);
    expect(neighbors.length).toBe(3);
  });

  it("возвращает ровно 5 соседей для клетки у края поля (0, 2)", () => {
    const edgeCard = board[0][2];
    const neighbors = getCharacterNeighbors(board, edgeCard.id);
    expect(neighbors.length).toBe(5);
  });

  it("корректно определяет попытку отмены предыдущего сдвига (Anti-Undo)", () => {
    const shiftLeft: ShiftPayload = { type: "ROW", index: 2, direction: "LEFT" };
    const shiftRight: ShiftPayload = { type: "ROW", index: 2, direction: "RIGHT" };
    const shiftDifferentRow: ShiftPayload = { type: "ROW", index: 3, direction: "RIGHT" };
    const shiftCol: ShiftPayload = { type: "COL", index: 2, direction: "UP" };

    expect(isUndoShift(shiftLeft, shiftRight)).toBe(true);
    expect(isUndoShift(shiftRight, shiftLeft)).toBe(true);
    expect(isUndoShift(shiftLeft, shiftDifferentRow)).toBe(false);
    expect(isUndoShift(shiftLeft, shiftCol)).toBe(false);
  });
});
