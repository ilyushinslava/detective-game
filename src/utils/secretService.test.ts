import { describe, it, expect } from "vitest";
import {
  createInitialState,
  spyCatch,
  spyInterrogate,
  getAdjacentCharacters,
} from "./gameLogic";

describe("Режим: Секретная служба (SECRET_SERVICE)", () => {
  it("Успешный арест шпиона (spyCatch): начисление трофея, смена прикрытия жертвы", () => {
    const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 4);
    const activeSpyIndex = state.activeSpyIndex!;
    const activeSpy = state.spies![activeSpyIndex];
    const targetCell = getAdjacentCharacters(state.board, activeSpy.secretId)[0];
    state.spies![1].secretId = targetCell.id;

    const nextState = spyCatch(state, targetCell.id);

    expect(nextState.spies![activeSpyIndex].trophies).toBe(1);
    expect(nextState.board.flat().find(c => c.id === targetCell.id)?.isAlive).toBe(false);
    expect(nextState.spies![1].secretId).not.toBe(targetCell.id);
    expect(nextState.activeSpyIndex).toBe((activeSpyIndex + 1) % nextState.spies!.length);
  });

  it("Условие победы: достижение 4 трофеев приводит к победе", () => {
    const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 4);
    const activeSpyIndex = state.activeSpyIndex!;
    state.spies![activeSpyIndex].trophies = 3; // 3 из 4
    const targetCell = getAdjacentCharacters(state.board, state.spies![activeSpyIndex].secretId)[0];
    state.spies![1].secretId = targetCell.id;

    const nextState = spyCatch(state, targetCell.id);

    expect(nextState.spies![activeSpyIndex].trophies).toBe(4);
    expect(nextState.winner).not.toBeNull();
  });

  it("Опрос свидетелей (spyInterrogate): определение соседства, радар", () => {
    const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 4);
    const activeSpyIndex = state.activeSpyIndex!;
    const activeSpy = state.spies![activeSpyIndex];
    const targetCell = getAdjacentCharacters(state.board, activeSpy.secretId)[0];
    state.spies![1].secretId = targetCell.id;

    const nextState = spyInterrogate(state, targetCell.id);

    expect(nextState.interrogationRadar).toEqual({
      targetId: targetCell.id,
      interrogatorIndex: activeSpyIndex,
    });
    expect(nextState.lastSpyInterrogation?.raisedHandsPlayerNames).toContain(activeSpy.name);
    expect(nextState.lastSpyInterrogation?.raisedHandsPlayerNames).toContain(state.spies![1].name);
  });
});