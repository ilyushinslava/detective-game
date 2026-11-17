import { describe, it, expect } from "vitest";
import { gameReducer } from "../gameReducer";
import { createInitialState, generateBoard5x5 } from "../gameLogic";
import type { GameState } from "../../types/game";
import type { GameAction } from "../../types/multiplayer";

describe("Stage 3: Условия победы и сбор улик на сетке 5x5", () => {
  it("должен инкрементировать trophiesDetective и добавлять улику в evidenceDeck при открытии CLUE", () => {
    const baseState = createInitialState("MANIAC_VS_OPERATIVE", "PVP");
    const board5x5 = generateBoard5x5({ proceduralDistribution: true, clueCount: 5, emptyCount: 5 });

    let state: GameState = {
      ...baseState,
      board: board5x5,
      currentTurn: "DETECTIVE",
      actionPoints: 3,
      trophiesDetective: 0,
      evidenceDeck: [],
      winner: null,
    };

    // Находим первую клетку-улику
    let clueR = -1;
    let clueC = -1;
    let clueCell: any = null;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (board5x5[r][c].cellType === "CLUE") {
          clueR = r;
          clueC = c;
          clueCell = board5x5[r][c];
          break;
        }
      }
      if (clueCell) break;
    }

    expect(clueCell).not.toBeNull();

    const action: GameAction = {
      type: "REVEAL_CELL",
      senderId: "DETECTIVE",
      role: "DETECTIVE",
      payload: { row: clueR, col: clueC, cellId: clueCell.id },
    };

    state = gameReducer(state, action);

    expect(state.trophiesDetective).toBe(1);
    expect(state.evidenceDeck).toContain(clueCell.id);
    expect(state.board[clueR][clueC].status).toBe("REVEALED");
    expect(state.winner).toBeNull();
  });

  it("не должен увеличивать trophiesDetective при открытии EMPTY клетки", () => {
    const baseState = createInitialState("MANIAC_VS_OPERATIVE", "PVP");
    const board5x5 = generateBoard5x5({ proceduralDistribution: true, clueCount: 5, emptyCount: 5 });

    let state: GameState = {
      ...baseState,
      board: board5x5,
      currentTurn: "DETECTIVE",
      actionPoints: 3,
      trophiesDetective: 0,
      evidenceDeck: [],
      winner: null,
    };

    // Находим пустую клетку
    let emptyR = -1;
    let emptyC = -1;
    let emptyCell: any = null;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (board5x5[r][c].cellType === "EMPTY") {
          emptyR = r;
          emptyC = c;
          emptyCell = board5x5[r][c];
          break;
        }
      }
      if (emptyCell) break;
    }

    expect(emptyCell).not.toBeNull();

    const action: GameAction = {
      type: "REVEAL_CELL",
      senderId: "DETECTIVE",
      role: "DETECTIVE",
      payload: { row: emptyR, col: emptyC, cellId: emptyCell.id },
    };

    state = gameReducer(state, action);

    expect(state.trophiesDetective).toBe(0);
    expect(state.evidenceDeck).toEqual([]);
    expect(state.board[emptyR][emptyC].status).toBe("REVEALED");
    expect(state.winner).toBeNull();
  });

  it("должен завершать игру победой Сыщика (winner = 'DETECTIVE') при сборе 4-й ключевой улики", () => {
    const baseState = createInitialState("MANIAC_VS_OPERATIVE", "PVP");
    const board5x5 = generateBoard5x5({ proceduralDistribution: true, clueCount: 5, emptyCount: 5 });

    let state: GameState = {
      ...baseState,
      board: board5x5,
      currentTurn: "DETECTIVE",
      actionPoints: 10, // Даем достаточно AP для теста
      trophiesDetective: 0,
      evidenceDeck: [],
      winner: null,
      spyTargetTrophies: 4,
    };

    // Собираем все клетки-улики
    const clueCells: { r: number; c: number; cell: any }[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (board5x5[r][c].cellType === "CLUE") {
          clueCells.push({ r, c, cell: board5x5[r][c] });
        }
      }
    }

    expect(clueCells.length).toBeGreaterThanOrEqual(4);

    // Открываем первые 3 улики
    for (let i = 0; i < 3; i++) {
      const { r, c, cell } = clueCells[i];
      state = gameReducer(state, {
        type: "REVEAL_CELL",
        senderId: "DETECTIVE",
        role: "DETECTIVE",
        payload: { row: r, col: c, cellId: cell.id },
      });
      expect(state.trophiesDetective).toBe(i + 1);
      expect(state.winner).toBeNull();
    }

    // Открываем 4-ю улику — триггер победы
    const fourth = clueCells[3];
    state = gameReducer(state, {
      type: "REVEAL_CELL",
      senderId: "DETECTIVE",
      role: "DETECTIVE",
      payload: { row: fourth.r, col: fourth.c, cellId: fourth.cell.id },
    });

    expect(state.trophiesDetective).toBe(4);
    expect(state.winner).toBe("DETECTIVE");
    expect(state.log.some((msg) => msg.includes("🏆 Сыщик собрал все ключевые улики"))).toBe(true);

    // Попытка дальнейших ходов блокируется
    const fifth = clueCells[4];
    const prevBoard = state.board;
    const postWinState = gameReducer(state, {
      type: "REVEAL_CELL",
      senderId: "DETECTIVE",
      role: "DETECTIVE",
      payload: { row: fifth.r, col: fifth.c, cellId: fifth.cell.id },
    });

    expect(postWinState.board).toBe(prevBoard);
  });

  it("сохраняет классическую победу через арест (ACCUSE) на сетке 5x5", () => {
    const baseState = createInitialState("MANIAC_VS_OPERATIVE", "PVP");
    const board5x5 = baseState.board;

    // В классическом поле baseState.board[0][0] и baseState.board[0][1] являются соседями
    const killerId = board5x5[0][0].id;
    const detectiveId = board5x5[0][1].id;

    const state: GameState = {
      ...baseState,
      board: board5x5,
      killerSecretId: killerId,
      detectiveSecretId: detectiveId,
      currentTurn: "DETECTIVE",
      winner: null,
    };

    const action: GameAction = {
      type: "ACCUSE",
      senderId: "DETECTIVE",
      payload: { targetId: killerId },
    };

    const nextState = gameReducer(state, action);

    expect(nextState.winner).toBe("DETECTIVE");
    expect(nextState.log.some((msg) => msg.includes("Победа Закона!"))).toBe(true);
  });
});
