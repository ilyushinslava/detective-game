import { describe, it, expect } from "vitest";
import { createInitialState, getAdjacentCharacters } from "./gameLogic";
import { gameReducer } from "./gameReducer";
import type { GameAction } from "../types/multiplayer";

describe("Полные циклы правил 4 режимов (fullGameCycles)", () => {
  describe("1. Режим СХВАТКА (SKHVATKA)", () => {
    it("Победа Бандита при устранении 14 жертв", () => {
      let state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
      state.killCount = 13;

      const neighbors = getAdjacentCharacters(state.board, state.killerSecretId);
      const target = neighbors.find((c) => c.id !== state.detectiveSecretId)!;

      const action: GameAction = {
        type: "KILL_CHARACTER",
        payload: { targetId: target.id },
        senderId: "local",
      };

      state = gameReducer(state, action);
      expect(state.killCount).toBe(14);
      expect(state.winner).toBe("KILLER");
    });

    it("Победа Бандита при устранении Инспектора", () => {
      let state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
      const neighbors = getAdjacentCharacters(state.board, state.killerSecretId);
      state.detectiveSecretId = neighbors[0].id;

      const action: GameAction = {
        type: "KILL_CHARACTER",
        payload: { targetId: state.detectiveSecretId },
        senderId: "local",
      };

      state = gameReducer(state, action);
      expect(state.winner).toBe("KILLER");
    });

    it("Победа Инспектора при успешном Задержании Бандита", () => {
      let state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
      state.currentTurn = "DETECTIVE";
      const neighbors = getAdjacentCharacters(state.board, state.killerSecretId);
      state.detectiveSecretId = neighbors[0].id;

      const action: GameAction = {
        type: "ACCUSE",
        payload: { targetId: state.killerSecretId },
        senderId: "local",
      };

      state = gameReducer(state, action);
      expect(state.winner).toBe("DETECTIVE");
    });

    it("Опрос свидетелей и проверка алиби из руки", () => {
      let state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
      state.currentTurn = "DETECTIVE";
      const alibiCard = state.detectiveHand[0];

      const action: GameAction = {
        type: "EXONERATE",
        payload: { targetId: alibiCard },
        senderId: "local",
      };

      state = gameReducer(state, action);
      const cardOnBoard = state.board.flat().find((c) => c.id === alibiCard);
      expect(cardOnBoard?.isExonerated).toBe(true);
      expect(state.lastInterrogation?.interrogator).toBe("DETECTIVE");
      expect(state.currentTurn).toBe("KILLER");
    });
  });

  describe("2. Режим МАНЬЯК ПРОТИВ ОПЕРАТИВНИКА (MANIAC_VS_OPERATIVE)", () => {
    it("Устранение 4 целей строго по victimList приносит победу Маньяку", () => {
      let state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
      const deckTargets = state.board
        .flat()
        .filter((c) => c.id !== state.killerSecretId && c.id !== state.detectiveSecretId)
        .map((c) => c.id);
      state.evidenceDeck = deckTargets.slice(4);
      state.victimList = deckTargets.slice(0, 4);

      for (let i = 0; i < 4; i++) {
        const targetId = state.victimList[0];
        const neighbors = getAdjacentCharacters(state.board, targetId);
        state.killerSecretId = neighbors[0].id;
        state.currentTurn = "KILLER";

        state = gameReducer(state, {
          type: "KILL_CHARACTER",
          payload: { targetId },
          senderId: "local",
        });
      }

      expect(state.killCount).toBe(4);
      expect(state.winner).toBe("KILLER");
    });

    it("Ранение Оперативника: потеря жизни из руки и смена личности", () => {
      let state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
      const initialLives = state.detectiveHand.length;
      const expectedNewSecret = state.detectiveHand[0];
      const neighbors = getAdjacentCharacters(state.board, state.detectiveSecretId);
      state.killerSecretId = neighbors[0].id;

      state = gameReducer(state, {
        type: "KILL_CHARACTER",
        payload: { targetId: state.detectiveSecretId },
        senderId: "local",
      });

      expect(state.detectiveHand.length).toBe(initialLives - 1);
      expect(state.detectiveSecretId).toBe(expectedNewSecret);
      expect(state.winner).toBeNull();
    });

    it("Побег маньяка: смена личности и добавление цели в список", () => {
      let state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
      const initialCount = state.victimList.length;
      const aliveUnexonerated = state.board
        .flat()
        .filter((c) => c.isAlive && !c.isExonerated && c.id !== state.killerSecretId && c.id !== state.detectiveSecretId)
        .map((c) => c.id);
      state.evidenceDeck = aliveUnexonerated;

      state = gameReducer(state, {
        type: "ESCAPE_MANIAC",
        senderId: "local",
      });

      expect(state.victimList.length).toBe(initialCount + 1);
      expect(state.killerSecretId).toBe(aliveUnexonerated[0]);
    });
  });

  describe("3. Режим ОХОТА НА ГРАБИТЕЛЯ (THIEF_HUNT)", () => {
    it("Кража 5 сокровищ приносит победу Вору", () => {
      let state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
      state.trophiesKiller = 4;
      const neighbors = getAdjacentCharacters(state.board, state.killerSecretId);
      const target = neighbors.find((c) => !c.isRobbed)!;

      state = gameReducer(state, {
        type: "ROB_NEIGHBOR",
        payload: { targetId: target.id },
        senderId: "local",
      });

      expect(state.trophiesKiller).toBe(5);
      expect(state.winner).toBe("KILLER");
    });

    it("Вызов патруля заменяет офицера и начисляет сокровище Вору", () => {
      let state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
      state.currentTurn = "DETECTIVE";
      const oldOfficer = state.uniformedOfficers![0];
      const initialTrophies = state.trophiesKiller ?? 0;

      state = gameReducer(state, {
        type: "SWEAR_IN_OFFICER",
        payload: { targetId: oldOfficer },
        senderId: "local",
      });

      expect(state.uniformedOfficers).not.toContain(oldOfficer);
      expect(state.trophiesKiller).toBe(initialTrophies + 1);
      expect(state.currentTurn).toBe("KILLER");
    });

    it("Быстрая конспирация маской из руки", () => {
      let state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
      const maskId = state.killerHand![0];
      const oldKillerId = state.killerSecretId;

      state = gameReducer(state, {
        type: "FAST_DISGUISE",
        payload: { targetId: maskId },
        senderId: "local",
      });

      expect(state.killerSecretId).toBe(maskId);
      expect(state.killerHand).toContain(oldKillerId);
      expect(state.killerHand).not.toContain(maskId);
    });

    it("Задержание Вора от патрульного офицера", () => {
      let state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
      state.currentTurn = "DETECTIVE";
      const patrolOfficerId = state.uniformedOfficers![0];
      const neighbors = getAdjacentCharacters(state.board, patrolOfficerId);
      const targetNeighbor = neighbors.find((n) => !state.uniformedOfficers?.includes(n.id)) || neighbors[0];
      state.killerSecretId = targetNeighbor.id;

      state = gameReducer(state, {
        type: "ACCUSE",
        payload: { targetId: state.killerSecretId },
        senderId: "local",
      });

      expect(state.winner).toBe("DETECTIVE");
    });
  });

  describe("4. Режим СЕКРЕТНАЯ СЛУЖБА (SECRET_SERVICE)", () => {
    it("Сбор 4 трофеев приносит победу Агенту", () => {
      let state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 4);
      state.activeSpyIndex = 0;
      state.spies![0].trophies = 3;

      const activeSpy = state.spies![0];
      const enemySpy = state.spies![1];
      const neighbors = getAdjacentCharacters(state.board, activeSpy.secretId);
      enemySpy.secretId = neighbors[0].id;

      state = gameReducer(state, {
        type: "CAPTURE_SPY",
        payload: { targetId: enemySpy.secretId },
        senderId: "local",
      });

      expect(state.spies![0].trophies).toBe(4);
      expect(state.winner).toBe("KILLER");
    });

    it("Перекрестный опрос свидетелей фиксирует ответ двух агентов", () => {
      let state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 4);
      state.activeSpyIndex = 0;
      const activeSpy = state.spies![0];
      const enemySpy = state.spies![1];
      const targetCell = getAdjacentCharacters(state.board, activeSpy.secretId)[0];
      enemySpy.secretId = targetCell.id;

      state = gameReducer(state, {
        type: "INTERROGATE",
        payload: { targetId: targetCell.id },
        senderId: "local",
      });

      expect(state.lastSpyInterrogation?.raisedHandsPlayerNames).toContain(activeSpy.name);
      expect(state.lastSpyInterrogation?.raisedHandsPlayerNames).toContain(enemySpy.name);
    });
  });
});
