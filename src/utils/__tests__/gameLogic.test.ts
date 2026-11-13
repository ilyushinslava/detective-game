import { describe, it, expect } from "vitest";
import {
  isOppositeShift,
  getAdjacentCharacters,
  createInitialState,
  cleanupDeadCharacters,
  canCleanupBoard,
  shiftBoard,
} from "../gameLogic";
import type { Character, GameState } from "../../types/game";

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
      boardSize: 5, victimList: [],
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

  it("canCleanupBoard: неактивна (false) при всех живых персонажах, активна (true) при наличии убитых", () => {
    const aliveBoard: Character[][] = Array(5).fill(null).map((_, r) =>
      Array(5).fill(null).map((__, c) => createMockChar(`c_${r}_${c}`, `Персонаж ${r}_${c}`, true))
    );

    // При полном здоровье всех персонажей зачистка строго недоступна
    expect(canCleanupBoard(aliveBoard)).toBe(false);

    // Убиваем персонажа в начале поля
    aliveBoard[0][1].isAlive = false;
    expect(canCleanupBoard(aliveBoard)).toBe(true);
  });

  describe("shiftBoard: строгая валидация и защита от выхода за границы", () => {
    const createBoard3x3 = (): Character[][] => [
      [createMockChar("c1", "A"), createMockChar("c2", "B"), createMockChar("c3", "C")],
      [createMockChar("c4", "D"), createMockChar("c5", "E"), createMockChar("c6", "F")],
      [createMockChar("c7", "G"), createMockChar("c8", "H"), createMockChar("c9", "I")],
    ];

    it("безопасно возвращает исходное поле при выходе индекса за границы (index < 0 или index >= size)", () => {
      const board = createBoard3x3();

      // Отрицательный индекс строки
      const resNegRow = shiftBoard(board, "ROW", -1, "FORWARD");
      expect(resNegRow).toBe(board);

      // Индекс строки равен длине (3)
      const resOverflowRow = shiftBoard(board, "ROW", 3, "FORWARD");
      expect(resOverflowRow).toBe(board);

      // Отрицательный индекс колонки
      const resNegCol = shiftBoard(board, "COL", -5, "BACKWARD");
      expect(resNegCol).toBe(board);

      // Индекс колонки за пределами
      const resOverflowCol = shiftBoard(board, "COL", 99, "BACKWARD");
      expect(resOverflowCol).toBe(board);
    });

    it("безопасно отклоняет невалидные типы индексов (NaN, нецелые числа)", () => {
      const board = createBoard3x3();

      expect(shiftBoard(board, "ROW", NaN as any, "FORWARD")).toBe(board);
      expect(shiftBoard(board, "ROW", 1.5 as any, "FORWARD")).toBe(board);
      expect(shiftBoard(board, "ROW", "0" as any, "FORWARD")).toBe(board);
      expect(shiftBoard(board, "ROW", undefined as any, "FORWARD")).toBe(board);
    });

    it("безопасно обрабатывает невалидную структуру поля или невалидные направления", () => {
      expect(shiftBoard([] as any, "ROW", 0, "FORWARD")).toEqual([]);
      expect(shiftBoard(null as any, "ROW", 0, "FORWARD")).toBeNull();

      const board = createBoard3x3();
      expect(shiftBoard(board, "INVALID" as any, 0, "FORWARD")).toBe(board);
      expect(shiftBoard(board, "ROW", 0, "SIDEWAYS" as any)).toBe(board);
    });

    it("корректно сдвигает валидные строки и колонки (тороидальный сдвиг)", () => {
      const board = createBoard3x3();

      // Сдвиг строки 0 FORWARD (вправо): c3 становится на место c1
      const shiftedRow = shiftBoard(board, "ROW", 0, "FORWARD");
      expect(shiftedRow[0].map(c => c.id)).toEqual(["c3", "c1", "c2"]);
      expect(shiftedRow[1].map(c => c.id)).toEqual(["c4", "c5", "c6"]);

      // Сдвиг колонки 1 FORWARD (вниз): c8 становится на место c2
      const shiftedCol = shiftBoard(board, "COL", 1, "FORWARD");
      expect(shiftedCol[0][1].id).toBe("c8");
      expect(shiftedCol[1][1].id).toBe("c2");
      expect(shiftedCol[2][1].id).toBe("c5");
    });
  });
});