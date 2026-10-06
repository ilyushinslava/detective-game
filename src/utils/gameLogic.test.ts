import { describe, it, expect } from "vitest";
import {
  isOppositeShift,
  getAdjacentCharacters,
  killCharacter,
  accuseCharacter,
  canCleanupBoard,
  disguiseKiller,
  createInitialState,
  spyCatch,
  cleanupDeadCharacters,
} from "./gameLogic";
import type { Character, GameState } from "../types/game";

const createMockChar = (
  id: string,
  name: string,
  isAlive = true,
  isExonerated = false,
): Character => ({
  id,
  name,
  isAlive,
  isExonerated,
});

describe("Ядро правил игры (gameLogic)", () => {
  it("должно блокировать отмену хода противника (anti-undo)", () => {
    const lastShift = {
      type: "ROW" as const,
      index: 2,
      direction: "FORWARD" as const,
    };

    expect(isOppositeShift(lastShift, "ROW", 2, "BACKWARD")).toBe(true);
    expect(isOppositeShift(lastShift, "ROW", 2, "FORWARD")).toBe(false);
    expect(isOppositeShift(lastShift, "ROW", 1, "BACKWARD")).toBe(false);
    expect(isOppositeShift(lastShift, "COL", 2, "BACKWARD")).toBe(false);
  });

  it("должно корректно находить соседей клетки (включая диагонали)", () => {
    const board: Character[][] = [
      [
        createMockChar("1", "A"),
        createMockChar("2", "B"),
        createMockChar("3", "C"),
      ],
      [
        createMockChar("4", "D"),
        createMockChar("5", "E"),
        createMockChar("6", "F"),
      ],
      [
        createMockChar("7", "G"),
        createMockChar("8", "H"),
        createMockChar("9", "I"),
      ],
    ];

    const centerNeighbors = getAdjacentCharacters(board, "5");
    expect(centerNeighbors.length).toBe(8);
    expect(centerNeighbors.map((c) => c.id)).toEqual(
      expect.arrayContaining(["1", "2", "3", "4", "6", "7", "8", "9"]),
    );

    const cornerNeighbors = getAdjacentCharacters(board, "1");
    expect(cornerNeighbors.length).toBe(3);
    expect(cornerNeighbors.map((c) => c.id)).toEqual(
      expect.arrayContaining(["2", "4", "5"]),
    );
  });

  it("Бандит побеждает мгновенно при убийстве Инспектора", () => {
    const board: Character[][] = [
      [createMockChar("k", "Бандит"), createMockChar("i", "Инспектор")],
      [createMockChar("v1", "Жертва 1"), createMockChar("v2", "Жертва 2")],
    ];

    const state: GameState = {
      mode: "SKHVATKA",
      board,
      currentTurn: "KILLER",
      killerSecretId: "k",
      detectiveSecretId: "i",
      detectiveHand: [],
      evidenceDeck: [],
      victimList: [],
      killCount: 0,
      winner: null,
      log: [],
      lastShift: null,
      lastInterrogation: null,
    };

    const nextState = killCharacter(state, "i");
    expect(nextState.winner).toBe("KILLER");
    expect(nextState.board[0][1].isAlive).toBe(false);
  });

  it("Бандит побеждает при наборе 14 убийств", () => {
    const board: Character[][] = [
      [createMockChar("k", "Бандит"), createMockChar("v1", "Жертва 1")],
      [createMockChar("v2", "Жертва 2"), createMockChar("i", "Инспектор")],
    ];

    const state: GameState = {
      mode: "SKHVATKA",
      board,
      currentTurn: "KILLER",
      killerSecretId: "k",
      detectiveSecretId: "i",
      detectiveHand: [],
      evidenceDeck: [],
      victimList: [],
      killCount: 13,
      winner: null,
      log: [],
      lastShift: null,
      lastInterrogation: null,
    };

    const nextState = killCharacter(state, "v1");
    expect(nextState.killCount).toBe(14);
    expect(nextState.winner).toBe("KILLER");
  });

  it("Инспектор побеждает при верном обвинении Бандита-соседа", () => {
    const board: Character[][] = [
      [createMockChar("i", "Инспектор"), createMockChar("k", "Бандит")],
      [createMockChar("v1", "Гражданин"), createMockChar("v2", "Гражданин 2")],
    ];

    const state: GameState = {
      mode: "SKHVATKA",
      board,
      currentTurn: "DETECTIVE",
      killerSecretId: "k",
      detectiveSecretId: "i",
      detectiveHand: [],
      evidenceDeck: [],
      victimList: [],
      killCount: 0,
      winner: null,
      log: [],
      lastShift: null,
      lastInterrogation: null,
    };

    const nextState = accuseCharacter(state, "k");
    expect(nextState.winner).toBe("DETECTIVE");
  });

  it("Ложное обвинение оправдывает персонажа (isExonerated = true)", () => {
    const board: Character[][] = [
      [createMockChar("i", "Инспектор"), createMockChar("v1", "Подозреваемый")],
      [createMockChar("k", "Бандит"), createMockChar("v2", "Гражданин 2")],
    ];

    const state: GameState = {
      mode: "SKHVATKA",
      board,
      currentTurn: "DETECTIVE",
      killerSecretId: "k",
      detectiveSecretId: "i",
      detectiveHand: [],
      evidenceDeck: [],
      victimList: [],
      killCount: 0,
      winner: null,
      log: [],
      lastShift: null,
      lastInterrogation: null,
    };

    const nextState = accuseCharacter(state, "v1");
    expect(nextState.winner).toBeNull();
    expect(nextState.currentTurn).toBe("KILLER");
    expect(nextState.board[0][1].isExonerated).toBe(true);
  });

  it("кнопка «Обновить» активна только если мертвый находится перед живым", () => {
    const boardNeedsCleanup: Character[][] = [
      [createMockChar("1", "A", false), createMockChar("2", "B", true)],
      [createMockChar("3", "C", true), createMockChar("4", "D", true)],
    ];
    expect(canCleanupBoard(boardNeedsCleanup)).toBe(true);

    const boardAlreadyClean: Character[][] = [
      [createMockChar("1", "A", true), createMockChar("2", "B", true)],
      [createMockChar("3", "C", true), createMockChar("4", "D", false)],
    ];
    expect(canCleanupBoard(boardAlreadyClean)).toBe(false);
  });

  it("Маньяк не может убить соседа, которого нет в списке смертников", () => {
    const board: Character[][] = [
      [
        createMockChar("m", "Маньяк"),
        createMockChar("targetNotInList", "Не в списке"),
      ],
      [createMockChar("v1", "В списке"), createMockChar("op", "Оперативник")],
    ];

    const state: GameState = {
      mode: "MANIAC_VS_OPERATIVE",
      board,
      currentTurn: "KILLER",
      killerSecretId: "m",
      detectiveSecretId: "op",
      detectiveHand: [],
      evidenceDeck: [],
      victimList: ["v1"],
      killCount: 0,
      winner: null,
      log: [],
      lastShift: null,
      lastInterrogation: null,
    };

    // Попытка убить цель вне списка смертников
    const unallowedKillState = killCharacter(state, "targetNotInList");
    expect(unallowedKillState.killCount).toBe(0);
    expect(unallowedKillState.currentTurn).toBe("KILLER"); // Ход не сменился
    expect(unallowedKillState.board[0][1].isAlive).toBe(true);
  });
  it("Маньяк не может маскироваться в режиме MANIAC_VS_OPERATIVE", () => {
    const board: Character[][] = Array(5)
      .fill(null)
      .map((_, r) =>
        Array(5)
          .fill(null)
          .map((__, c) => createMockChar(`c_${r}_${c}`, `Персонаж ${r}_${c}`)),
      );

    const state: GameState = {
      mode: "MANIAC_VS_OPERATIVE",
      opponent: "AI",
      playerRole: "KILLER",
      board,
      currentTurn: "KILLER",
      killerSecretId: "c_0_0",
      detectiveSecretId: "c_4_4",
      detectiveHand: [],
      evidenceDeck: ["c_new_1", "c_new_2"],
      victimList: ["c_0_1"],
      killCount: 0,
      winner: null,
      log: [],
      lastShift: null,
      lastInterrogation: null,
    };

    const nextState = disguiseKiller(state);

    expect(nextState.killerSecretId).toBe("c_0_0");
    expect(nextState.evidenceDeck).toEqual(["c_new_1", "c_new_2"]);
    expect(nextState.currentTurn).toBe("KILLER");
  });

  it("spyCatch начисляет трофей при поимке другого шпиона и не начисляет на мирном", () => {
    let state = createInitialState("SECRET_SERVICE", "AI", "DETECTIVE");
    if (!state.spies) return;

    const activeSpy = state.spies[0];
    const victimSpy = state.spies[1];

    // Размещаем жертву рядом с активным шпионом
    const neighbors = getAdjacentCharacters(state.board, activeSpy.secretId);
    expect(neighbors.length).toBeGreaterThan(0);

    // 1. Попытка поймать шпиона
    state.spies[1].secretId = neighbors[0].id;
    const caughtState = spyCatch(state, neighbors[0].id);

    expect(caughtState.spies![0].trophies).toBe(1);
    expect(
      caughtState.board.flat().find((c) => c.id === neighbors[0].id)?.isAlive,
    ).toBe(false);

    // 2. Попытка поймать мирного жителя (трофей не дается, цель не гибнет)
    const civilian = neighbors.find(
      (c) =>
        c.id !== state.spies![1].secretId && c.id !== state.spies![2].secretId,
    );
    if (civilian) {
      const failState = spyCatch(caughtState, civilian.id);
      expect(failState.spies![0].trophies).toBe(1);
      expect(
        failState.board.flat().find((c) => c.id === civilian.id)?.isAlive,
      ).toBe(true);
    }
  });

  it("cleanupDeadCharacters удаляет убитых и добирает новые карты из evidenceDeck", () => {
    const board: Character[][] = Array(5)
      .fill(null)
      .map((_, r) =>
        Array(5)
          .fill(null)
          .map((__, c) => createMockChar(`c_${r}_${c}`, `Персонаж ${r}_${c}`)),
      );

    // Делаем первого персонажа мертвым
    board[0][0].isAlive = false;

    const state: GameState = {
      mode: "SKHVATKA",
      opponent: "AI",
      playerRole: "DETECTIVE",
      board,
      currentTurn: "DETECTIVE",
      killerSecretId: "c_1_1",
      detectiveSecretId: "c_2_2",
      detectiveHand: [],
      evidenceDeck: ["c25"],
      killCount: 1,
      winner: null,
      log: [],
      lastShift: null,
      lastInterrogation: null,
    };

    const nextState = cleanupDeadCharacters(state);

    expect(nextState.evidenceDeck).toEqual([]);
    expect(nextState.board.flat().length).toBe(25);
    expect(nextState.board.flat().some((c) => c.id === "c25")).toBe(true);
    expect(
      nextState.board.flat().some((c) => c.id === "c_0_0" && !c.isAlive),
    ).toBe(false);
    expect(nextState.currentTurn).toBe("KILLER");
  });
});
