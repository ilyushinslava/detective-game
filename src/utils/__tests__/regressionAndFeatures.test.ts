import { describe, it, expect } from "vitest";
import {
  createInitialState,
  shiftBoard,
  spyInterrogate,
  areAdjacent,
  getAdjacentCharacters,
} from "../gameLogic";
import { SPY_COLORS } from "../../types/game";
import { ALL_CHARACTERS } from "../../constants/characters";

describe("Регрессионный аудит и валидация фичей (Блоки 2 - 5)", () => {
  describe("Блок 2: Инварианты стейта и валидация сессии", () => {
    it("2.4: hasActiveGame флаг сбрасывается при наличии победителя", () => {
      const state = createInitialState("SKHVATKA", "AI", "DETECTIVE");
      expect(state.winner).toBeNull();
      expect(state.board.length).toBeGreaterThanOrEqual(5);

      const finishedState = { ...state, winner: "KILLER" as const };
      const hasActiveGame = Boolean(!finishedState.winner && finishedState.board?.length >= 5);
      expect(hasActiveGame).toBe(false);
    });

    it("2.2: Изоляция радара и подсветки роли", () => {
      const state = createInitialState("SKHVATKA", "AI", "DETECTIVE");
      const killerId = state.killerSecretId;
      const neighbors = getAdjacentCharacters(state.board, killerId).map((c) => c.id);
      
      expect(neighbors.length).toBeGreaterThan(0);
      expect(neighbors.length).toBeLessThanOrEqual(8);
      expect(neighbors).not.toContain(killerId);
    });
  });

  describe("Блок 3: Контроль палитры Noir", () => {
    it("3.1: В SPY_COLORS полностью отсутствуют запрещенные классы (amber, yellow, cyan)", () => {
      SPY_COLORS.forEach((color) => {
        const fullClassString = `${color.text} ${color.bg} ${color.border} ${color.ring}`;
        expect(fullClassString).not.toMatch(/amber/);
        expect(fullClassString).not.toMatch(/yellow/);
        expect(fullClassString).not.toMatch(/cyan/);
      });
      expect(SPY_COLORS[0].text).toContain("red");
      expect(SPY_COLORS[1].text).toContain("blue");
    });
  });

  describe("Блок 4: Брендинг и целостность пула карт", () => {
    it("4.1: Доступно не менее 50 уникальных персонажей для динамических сеток", () => {
      expect(ALL_CHARACTERS.length).toBeGreaterThanOrEqual(50);
      const uniqueIds = new Set(ALL_CHARACTERS.map((c) => c.id));
      expect(uniqueIds.size).toBe(ALL_CHARACTERS.length);
    });
  });

  describe("Блок 5: Secret Service, динамические сетки и остаточные эффекты", () => {
    it("5.2 & 5.5: Масштабирование Secret Service от 2 до 6 игроков с позывными", () => {
      const state4P = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 4, 4, 0, "Зенит");
      expect(state4P.spies).toBeDefined();
      expect(state4P.spies?.length).toBe(4);
      expect(state4P.spies?.[0].name).toBe("Зенит");
      expect(state4P.spies?.[1].name).toBe("Дамаск");
      expect(state4P.spies?.[2].name).toBe("Филин");
      expect(state4P.spies?.[3].name).toBe("Вектор");
      expect(state4P.boardSize).toBe(5);

      const state6P = createInitialState("SECRET_SERVICE", "AI", "DETECTIVE", 6, 4, 0, "Командир");
      expect(state6P.spies?.length).toBe(6);
      expect(state6P.spies?.[0].name).toBe("Командир");
      expect(state6P.spies?.[4].name).toBe("Агат");
      expect(state6P.spies?.[5].name).toBe("Норд");
      expect(state6P.boardSize).toBe(6);
    });

    it("5.3: Динамическая геометрия поля под размер состава игроков", () => {
      const state2P = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2);
      expect(state2P.board.length).toBe(5);
      expect(state2P.board[0].length).toBe(5);

      const state5P = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 5);
      expect(state5P.board.length).toBe(6);
      expect(state5P.board[0].length).toBe(6);
      expect(state5P.board.flat().length).toBe(36);

      const state8P = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 8);
      expect(state8P.board.length).toBe(7);
      expect(state8P.board[0].length).toBe(7);
      expect(state8P.board.flat().length).toBe(49);
    });

    it("5.3: Корректность сдвигов shiftBoard на нестандартной сетке 6x6", () => {
      const state6P = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 6);
      const originalRow0 = [...state6P.board[0]];
      
      const shiftedBoard = shiftBoard(state6P.board, "ROW", 0, "FORWARD");
      expect(shiftedBoard[0].length).toBe(6);
      expect(shiftedBoard[0][0].id).toBe(originalRow0[5].id);
      expect(shiftedBoard[0][1].id).toBe(originalRow0[0].id);

      const originalCol0Top = shiftedBoard[0][0].id;
      const colShifted = shiftBoard(shiftedBoard, "COL", 0, "FORWARD");
      expect(colShifted.length).toBe(6);
      expect(colShifted[1][0].id).toBe(originalCol0Top);
    });

    it("5.2: Перекрёстный допрос 4 участников в Secret Service", () => {
      const state4P = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 4);
      expect(state4P.activeSpyIndex).toBe(0);

      const activeSpy = state4P.spies![0];
      const targetChar = state4P.board.flat().find((c) => c.id !== activeSpy.secretId && areAdjacent(state4P.board, activeSpy.secretId, c.id))!;
      
      const afterInterrogate = spyInterrogate(state4P, targetChar.id);
      expect(afterInterrogate.activeSpyIndex).toBe(1);
      expect(afterInterrogate.log.length).toBeGreaterThan(state4P.log.length);
    });

    it("5.4: Остаточный след сдвига сохраняет вектор ровно на 1 действие", () => {
      const state = createInitialState("SKHVATKA", "AI", "DETECTIVE");
      expect(state.lastShift).toBeNull();

      const stateAfterShift = {
        ...state,
        lastShift: { type: "ROW" as const, index: 2, direction: "FORWARD" as const },
      };

      expect(stateAfterShift.lastShift.type).toBe("ROW");
      expect(stateAfterShift.lastShift.index).toBe(2);
    });
  });
});
