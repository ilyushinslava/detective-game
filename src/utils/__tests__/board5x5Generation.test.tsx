// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { generateBoard5x5, createInitialState } from "../gameLogic";
import { gameReducer } from "../gameReducer";
import { Board5x5 } from "../../components/Board5x5";
import type { GameState } from "../../types/game";

describe("Этап 1: Генерация сетки 5x5 и стейт-машина ходов (SSOT)", () => {
  describe("1. Процедурная генерация сетки (generateBoard5x5)", () => {
    it("генерирует двумерный массив 5x5 ровно из 25 клеток", () => {
      const board = generateBoard5x5({ proceduralDistribution: true });
      expect(board.length).toBe(5);
      board.forEach((row) => {
        expect(row.length).toBe(5);
      });
      const flat = board.flat();
      expect(flat.length).toBe(25);
    });

    it("каждая клетка имеет уникальный ID и статус", () => {
      const board = generateBoard5x5({ proceduralDistribution: true });
      const flat = board.flat();
      const ids = new Set(flat.map((c) => c.id));
      expect(ids.size).toBe(25);

      flat.forEach((cell) => {
        expect(cell.id).toBeTruthy();
        expect(["HIDDEN", "REVEALED", "BLOCKED"]).toContain(cell.status);
      });
    });

    it("процедурно распределяет типы EMPTY, CLUE и SUSPECT", () => {
      const board = generateBoard5x5({
        proceduralDistribution: true,
        clueCount: 5,
        emptyCount: 5,
        suspectCount: 15,
      });
      const flat = board.flat();

      const suspects = flat.filter((c) => c.cellType === "SUSPECT");
      const clues = flat.filter((c) => c.cellType === "CLUE");
      const empties = flat.filter((c) => c.cellType === "EMPTY");

      expect(suspects.length).toBe(15);
      expect(clues.length).toBe(5);
      expect(empties.length).toBe(5);

      // Улики должны иметь заполненные clueData
      clues.forEach((clue) => {
        expect(clue.clueData).toBeDefined();
        expect(clue.clueData?.title).toBeTruthy();
        expect(clue.clueData?.description).toBeTruthy();
      });
    });

    it("в классическом режиме (proceduralDistribution: false) сохраняет 25 подозреваемых со статусом REVEALED", () => {
      const board = generateBoard5x5({ proceduralDistribution: false });
      const flat = board.flat();
      expect(flat.length).toBe(25);
      expect(flat.every((c) => c.cellType === "SUSPECT")).toBe(true);
      expect(flat.every((c) => c.status === "REVEALED")).toBe(true);
    });

    it("createInitialState инициализирует 3 очка действий (AP) и сетку 5x5", () => {
      const state = createInitialState("MANIAC_VS_OPERATIVE", "AI", "DETECTIVE");
      expect(state.board.length).toBe(5);
      expect(state.actionPoints).toBe(3);
      expect(state.maxActionPoints).toBe(3);
    });
  });

  describe("2. Интеграция со стейт-машиной редюсера (gameReducer & REVEAL_CELL)", () => {
    let initialState: GameState;

    beforeEach(() => {
      initialState = createInitialState("MANIAC_VS_OPERATIVE", "AI", "DETECTIVE");
      // Переводим доску в процедурный режим с закрытыми клетками
      initialState.board = generateBoard5x5({
        proceduralDistribution: true,
        defaultStatus: "HIDDEN",
      });
      initialState.currentTurn = "DETECTIVE";
      initialState.actionPoints = 3;
      initialState.maxActionPoints = 3;
    });

    it("успешно открывает клетку и списывает 1 очко действий", () => {
      const targetCell = initialState.board[1][2];
      expect(targetCell.status).toBe("HIDDEN");

      const action = {
        type: "REVEAL_CELL" as const,
        payload: { cellId: targetCell.id, row: 1, col: 2 },
        role: "DETECTIVE" as const,
      };

      const nextState = gameReducer(initialState, action);

      expect(nextState.actionPoints).toBe(2);
      expect(nextState.board[1][2].status).toBe("REVEALED");
      expect(nextState.log[nextState.log.length - 1]).toContain("Разведка завершена");
    });

    it("блокирует открытие клетки при 0 очков действий (AP <= 0)", () => {
      initialState.actionPoints = 0;
      const targetCell = initialState.board[0][0];

      const action = {
        type: "REVEAL_CELL" as const,
        payload: { cellId: targetCell.id, row: 0, col: 0 },
        role: "DETECTIVE" as const,
      };

      const nextState = gameReducer(initialState, action);

      expect(nextState.actionPoints).toBe(0);
      expect(nextState.board[0][0].status).toBe("HIDDEN");
    });

    it("блокирует действие при попытке хода не в свою очередь", () => {
      initialState.currentTurn = "KILLER";

      const targetCell = initialState.board[0][0];
      const action = {
        type: "REVEAL_CELL" as const,
        payload: { cellId: targetCell.id },
        role: "DETECTIVE" as const,
      };

      const nextState = gameReducer(initialState, action);

      expect(nextState.actionPoints).toBe(3);
      expect(nextState.board[0][0].status).toBe("HIDDEN");
    });

    it("игнорирует повторное открытие уже открытой клетки", () => {
      initialState.board[0][0].status = "REVEALED";
      const targetCell = initialState.board[0][0];

      const action = {
        type: "REVEAL_CELL" as const,
        payload: { cellId: targetCell.id },
        role: "DETECTIVE" as const,
      };

      const nextState = gameReducer(initialState, action);

      // Очки действий не должны списываться повторно
      expect(nextState.actionPoints).toBe(3);
    });

    it("восстанавливает очки действий до максимума при END_TURN", () => {
      initialState.actionPoints = 1;

      const action = {
        type: "END_TURN" as const,
      };

      const nextState = gameReducer(initialState, action);

      expect(nextState.actionPoints).toBe(3);
      expect(nextState.currentTurn).toBe("KILLER");
    });

    it("экшен START_GAME процедурно генерирует поле 5x5 и сбрасывает AP", () => {
      const action = {
        type: "START_GAME" as const,
        payload: { mode: "MANIAC_VS_OPERATIVE", procedural: true },
      };

      const nextState = gameReducer(initialState, action);

      expect(nextState.board.length).toBe(5);
      expect(nextState.board[0].length).toBe(5);
      expect(nextState.actionPoints).toBe(3);
      expect(nextState.board.flat().some((c) => c.status === "HIDDEN")).toBe(true);
    });
  });

  describe("3. UI-компонент Board5x5 (Pure SSOT Rendering)", () => {
    afterEach(() => {
      cleanup();
    });
    it("отображает статус-бар очереди ходов и очков действий", () => {
      const board = generateBoard5x5({ proceduralDistribution: true, defaultStatus: "HIDDEN" });

      render(
        <Board5x5
          board={board}
          currentTurn="DETECTIVE"
          actionPoints={2}
          maxActionPoints={3}
        />
      );

      expect(screen.getByText("5×5 [25 КЛЕТОК]")).toBeDefined();
      expect(screen.getByText("ДЕТЕКТИВ")).toBeDefined();
      expect(screen.getByText("2/3")).toBeDefined();
    });

    it("рендерит ровно 25 ячеек в сетке 5x5", () => {
      const board = generateBoard5x5({ proceduralDistribution: true, defaultStatus: "HIDDEN" });

      render(<Board5x5 board={board} />);

      const grid = screen.getByTestId("board-5x5-grid");
      expect(grid.children.length).toBe(25);
    });

    it("клик по скрытой ячейке диспатчит onRevealCell", () => {
      const board = generateBoard5x5({ proceduralDistribution: true, defaultStatus: "HIDDEN" });
      const revealSpy = vi.fn();

      render(
        <Board5x5
          board={board}
          actionPoints={3}
          onRevealCell={revealSpy}
        />
      );

      const cell00 = screen.getByTestId("cell-0-0");
      fireEvent.click(cell00);

      expect(revealSpy).toHaveBeenCalledTimes(1);
      expect(revealSpy).toHaveBeenCalledWith(board[0][0].id, 0, 0);
    });

    it("блокирует клик по скрытой ячейке при 0 AP", () => {
      const board = generateBoard5x5({ proceduralDistribution: true, defaultStatus: "HIDDEN" });
      const revealSpy = vi.fn();

      render(
        <Board5x5
          board={board}
          actionPoints={0}
          onRevealCell={revealSpy}
        />
      );

      const cell00 = screen.getByTestId("cell-0-0");
      fireEvent.click(cell00);

      expect(revealSpy).not.toHaveBeenCalled();
    });
  });
});
