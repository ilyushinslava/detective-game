import { describe, it, expect } from "vitest";
import {
  createInitialState,
  robNeighbor,
  killCharacter,
  accuseCharacter,
  spyCatch,
  getAdjacentCharacters,
} from "./gameLogic";
import { gameReducer } from "./gameReducer";
import type { GameAction } from "../types/multiplayer";

describe("Сквозной аудит исправлений (Кластеры 1 и 2)", () => {
  it("Кластер 1: gameReducer жестко применяет action.nextTurn для удаленных действий", () => {
    const state = createInitialState("SKHVATKA", "ONLINE", "DETECTIVE");
    state.currentTurn = "KILLER";

    const remoteAction: GameAction = {
      type: "SHIFT_BOARD",
      payload: { shiftType: "ROW", index: 0, direction: "FORWARD" },
      senderId: "remote",
      nextTurn: "DETECTIVE",
    };

    const nextState = gameReducer(state, remoteAction);
    expect(nextState.currentTurn).toBe("DETECTIVE");
  });

  it("Кластер 1: Вор при совершении кражи не меняет личность и не берет карту из колоды", () => {
    const state = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
    const initialThiefId = state.killerSecretId;
    const initialDeckLength = state.evidenceDeck.length;
    const target = getAdjacentCharacters(state.board, initialThiefId)[0];

    const nextState = robNeighbor(state, target.id);

    expect(nextState.killerSecretId).toBe(initialThiefId);
    expect(nextState.evidenceDeck.length).toBe(initialDeckLength);
    expect(nextState.trophiesKiller).toBe(1);
    expect(nextState.board.flat().find((c) => c.id === target.id)?.isRobbed).toBe(true);
  });

  it("Кластер 1: Маньяк не может ликвидировать персонажа, не являющегося текущей целью", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    const currentVictim = state.victimList[0];
    const invalidTarget = state.board.flat().find(
      (c) => c.id !== currentVictim && c.id !== state.detectiveSecretId && c.id !== state.killerSecretId
    )!;

    state.killerSecretId = getAdjacentCharacters(state.board, invalidTarget.id)[0].id;
    const nextState = killCharacter(state, invalidTarget.id);

    expect(nextState.killCount).toBe(0);
    expect(nextState.board.flat().find((c) => c.id === invalidTarget.id)?.isAlive).toBe(true);
    expect(nextState.currentTurn).toBe("KILLER");
  });

  it("Кластер 1: Убийство Оперативника с картами в руке передает новую личность без завершения игры", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
    const initialHandCount = state.detectiveHand.length;
    const expectedNewRole = state.detectiveHand[0];

    state.killerSecretId = getAdjacentCharacters(state.board, state.detectiveSecretId)[0].id;
    const nextState = killCharacter(state, state.detectiveSecretId);

    expect(nextState.winner).toBeNull();
    expect(nextState.detectiveSecretId).toBe(expectedNewRole);
    expect(nextState.detectiveHand.length).toBe(initialHandCount - 1);
  });

  it("Кластер 1: Секретная служба инициализируется строго с целью в 4 трофея", () => {
    const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 4);
    expect(state.spyTargetTrophies).toBe(4);
  });

  it("Кластер 2: Ошибочное задержание оправдывает цель без поражения", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    state.currentTurn = "DETECTIVE";
    const innocentTarget = getAdjacentCharacters(state.board, state.detectiveSecretId).find(
      (c) => c.id !== state.killerSecretId
    )!;

    const nextState = accuseCharacter(state, innocentTarget.id);

    expect(nextState.winner).toBeNull();
    expect(nextState.board.flat().find((c) => c.id === innocentTarget.id)?.isExonerated).toBe(true);
    expect(nextState.currentTurn).toBe("KILLER");
  });

  it("Кластер 2: Промах при разоблачении шпиона не начисляет трофеев", () => {
    const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 4);
    const activeSpy = state.spies![state.activeSpyIndex!];
    const civilianTarget = getAdjacentCharacters(state.board, activeSpy.secretId).find(
      (c) => !state.spies!.some((s) => s.secretId === c.id)
    )!;

    const nextState = spyCatch(state, civilianTarget.id);

    expect(nextState.spies![state.activeSpyIndex!].trophies).toBe(0);
    expect(nextState.board.flat().find((c) => c.id === civilianTarget.id)?.isAlive).toBe(true);
  });
});