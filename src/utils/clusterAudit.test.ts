import { describe, it, expect } from "vitest";
import {
  createInitialState,
  disguiseKiller,
  escapeManiac,
  exonerateFromHand,
  setInspectorRole,
} from "./gameLogic";
import { gameReducer } from "./gameReducer";
import type { GameAction } from "../types/multiplayer";

describe("Сквозной аудит инвариантов (Кластеры 1, 2, 3)", () => {
  
  describe("1. Инвариант маскировки (disguiseKiller & escapeManiac)", () => {
    it("disguiseKiller: провал маскировки, если вытянута оправданная карта (isExonerated: true)", () => {
      const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
      const initialKillerId = state.killerSecretId;
      
      // Находим живого персонажа и делаем его оправданным
      const targetChar = state.board.flat().find(c => c.isAlive && c.id !== initialKillerId && c.id !== state.detectiveSecretId)!;
      targetChar.isExonerated = true;
      
      // Подкладываем его наверх колоды
      state.evidenceDeck = [targetChar.id, ...state.evidenceDeck.filter(id => id !== targetChar.id)];

      const nextState = disguiseKiller(state);

      // Личность не изменилась, ход перешел
      expect(nextState.killerSecretId).toBe(initialKillerId);
      expect(nextState.currentTurn).toBe("DETECTIVE");
      expect(nextState.log[nextState.log.length - 1]).toContain("Провал конспирации");
    });

    it("escapeManiac: провал побега, если вытянута оправданная карта (isExonerated: true)", () => {
      const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
      const initialKillerId = state.killerSecretId;
      const initialVictimCount = state.victimList.length;
      
      // Находим живого персонажа и делаем его оправданным
      const targetChar = state.board.flat().find(c => c.isAlive && c.id !== initialKillerId && c.id !== state.detectiveSecretId)!;
      targetChar.isExonerated = true;
      
      // Подкладываем его наверх колоды
      state.evidenceDeck = [targetChar.id, ...state.evidenceDeck.filter(id => id !== targetChar.id)];

      const nextState = escapeManiac(state);

      // Личность не изменилась, список жертв не вырос
      expect(nextState.killerSecretId).toBe(initialKillerId);
      expect(nextState.victimList.length).toBe(initialVictimCount);
      expect(nextState.currentTurn).toBe("DETECTIVE");
      expect(nextState.log[nextState.log.length - 1]).toContain("Провал побега");
    });
  });

  describe("2. Циклический добор и радар алиби (exonerateFromHand)", () => {
    it("exonerateFromHand: добор карты, установка радара и флага isExonerated", () => {
      const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
      state.currentTurn = "DETECTIVE";
      const cardToExonerate = state.detectiveHand[0];
      const initialHandSize = state.detectiveHand.length;
      const initialDeckSize = state.evidenceDeck.length;

      const nextState = exonerateFromHand(state, cardToExonerate);

      // Флаг на поле
      expect(nextState.board.flat().find(c => c.id === cardToExonerate)?.isExonerated).toBe(true);
      
      // Добор карты (размер руки сохранился, колода уменьшилась)
      expect(nextState.detectiveHand).not.toContain(cardToExonerate);
      expect(nextState.detectiveHand.length).toBe(initialHandSize);
      expect(nextState.evidenceDeck.length).toBe(initialDeckSize - 1);
      
      // Радар установлен
      expect(nextState.interrogationRadar).toEqual({
        targetId: cardToExonerate,
        interrogatorIndex: 0,
      });
      expect(nextState.currentTurn).toBe("KILLER");
    });
  });

  describe("3. Сетевой редуктор (gameReducer & Host-Authority)", () => {
    it("gameReducer: жестко применяет action.nextTurn для удаленных действий", () => {
      const state = createInitialState("SKHVATKA", "ONLINE", "DETECTIVE");
      state.currentTurn = "KILLER";

      const remoteAction: GameAction = {
        type: "SHIFT_BOARD",
        payload: { shiftType: "ROW", index: 0, direction: "FORWARD" },
        senderId: "remote",
        nextTurn: "DETECTIVE", // Хост прислал, что следующий ход Детектива
      };

      const nextState = gameReducer(state, remoteAction);
      
      // Локальный стейт обязан подчиниться хосту
      expect(nextState.currentTurn).toBe("DETECTIVE");
    });
  });

  describe("4. Логика назначения роли инспектора (setInspectorRole)", () => {
    it("setInspectorRole: выбор личности, перенос остатка в руку, очистка кандидатов", () => {
      const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
      // Имитируем состояние до выбора роли
      state.inspectorChoices = ["c1", "c2", "c3", "c4"];
      state.detectiveSecretId = "";
      state.detectiveHand = [];

      const chosenId = "c2";
      const nextState = setInspectorRole(state, chosenId);

      expect(nextState.detectiveSecretId).toBe(chosenId);
      expect(nextState.detectiveHand).toEqual(["c1", "c3", "c4"]);
      expect(nextState.inspectorChoices).toEqual([]);
    });
  });

  describe("5. Динамический список жертв маньяка", () => {
    it("escapeManiac: успешный побег добавляет +1 цель в victimList", () => {
      const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
      const initialVictimCount = state.victimList.length;
      const initialKillerId = state.killerSecretId;
      
      // Находим живого неоправданного персонажа
      const aliveChar = state.board.flat().find(c => c.isAlive && !c.isExonerated && c.id !== initialKillerId && c.id !== state.detectiveSecretId)!;
      
      // Подкладываем его наверх колоды, а за ним еще одну карту (для новой жертвы)
      const newVictimChar = state.board.flat().find(c => c.id !== aliveChar.id && c.id !== initialKillerId && c.id !== state.detectiveSecretId)!;
      state.evidenceDeck = [aliveChar.id, newVictimChar.id, ...state.evidenceDeck.filter(id => id !== aliveChar.id && id !== newVictimChar.id)];

      const nextState = escapeManiac(state);

      expect(nextState.killerSecretId).toBe(aliveChar.id);
      expect(nextState.victimList.length).toBe(initialVictimCount + 1);
      expect(nextState.victimList[nextState.victimList.length - 1]).toBe(newVictimChar.id);
      expect(nextState.disguisedNotification).toEqual({ roleName: "Маньяк", newSecretId: aliveChar.id });
    });
  });

});