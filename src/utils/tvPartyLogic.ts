import type { CharacterCard, ShiftPayload } from "../types/game";

export interface BoardPosition {
  row: number;
  col: number;
}

/**
 * Находит координаты персонажа на поле 5x5
 */
export function findCharacterPosition(
  board: CharacterCard[][],
  characterId: string | null | undefined
): BoardPosition | null {
  if (!board || !characterId) return null;

  for (let r = 0; r < board.length; r++) {
    const row = board[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c]?.id === characterId) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

/**
 * Возвращает список физических соседей персонажа (3, 5 или 8)
 * Диагонали учитываются, границы поля не заворачиваются
 */
export function getCharacterNeighbors(
  board: CharacterCard[][],
  characterId: string | null | undefined
): CharacterCard[] {
  const pos = findCharacterPosition(board, characterId);
  if (!pos) return [];

  const neighbors: CharacterCard[] = [];
  const rows = board.length;
  const cols = board[0]?.length || 0;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;

      const nr = pos.row + dr;
      const nc = pos.col + dc;

      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const card = board[nr][nc];
        if (card) {
          neighbors.push(card);
        }
      }
    }
  }

  return neighbors;
}

/**
 * Проверяет, отменяет ли новый сдвиг действие предыдущего игрока (Anti-Undo)
 */
export function isUndoShift(
  lastShift: ShiftPayload | null | undefined,
  nextShift: ShiftPayload
): boolean {
  if (!lastShift) return false;
  if (lastShift.type !== nextShift.type) return false;
  if (lastShift.index !== nextShift.index) return false;

  if (lastShift.type === "ROW") {
    return (
      (lastShift.direction === "LEFT" && nextShift.direction === "RIGHT") ||
      (lastShift.direction === "RIGHT" && nextShift.direction === "LEFT")
    );
  }

  if (lastShift.type === "COL") {
    return (
      (lastShift.direction === "UP" && nextShift.direction === "DOWN") ||
      (lastShift.direction === "DOWN" && nextShift.direction === "UP")
    );
  }

  return false;
}
