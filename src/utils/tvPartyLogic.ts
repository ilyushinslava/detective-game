import type { Character, LastShift } from "../types/game";

export interface BoardPosition {
  row: number;
  col: number;
}

/**
 * Находит координаты персонажа на поле 5x5
 */
export function findCharacterPosition(
  board: Character[][],
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
  board: Character[][],
  characterId: string | null | undefined
): Character[] {
  const pos = findCharacterPosition(board, characterId);
  if (!pos) return [];

  const neighbors: Character[] = [];
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
  lastShift: LastShift | null | undefined,
  nextShift: LastShift
): boolean {
  if (!lastShift) return false;
  return (
    lastShift.type === nextShift.type &&
    lastShift.index === nextShift.index &&
    lastShift.direction !== nextShift.direction
  );
}
