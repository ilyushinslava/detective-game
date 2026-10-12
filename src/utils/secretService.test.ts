import { describe, it, expect } from "vitest";
import {
  createInitialState,
  spyCatch,
  spyInterrogate,
  getAdjacentCharacters,
} from "./gameLogic";

describe("Режим: Секретная служба (SECRET_SERVICE)", () => {
  it("Успешный арест шпиона (spyCatch): начисление трофея, ликвидация, смена прикрытия, передача хода", () => {
    const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 3);
    const activeSpyIndex = state.activeSpyIndex!;
    const activeSpy = state.spies![activeSpyIndex];
    const targetSpy = state.spies![1];

    // Находим соседнюю клетку для активного шпиона
    const neighbors = getAdjacentCharacters(state.board, activeSpy.secretId);
    const targetCell = neighbors[0];

    // Искусственно помещаем вражеского шпиона в соседнюю клетку
    const originalTargetSecretId = targetCell.id;
    state.spies![1].secretId = originalTargetSecretId;

    const nextState = spyCatch(state, originalTargetSecretId);

    // Проверки
    const updatedActiveSpy = nextState.spies![activeSpyIndex];
    const updatedTargetSpy = nextState.spies![1];
    const targetCharacterOnBoard = nextState.board.flat().find(c => c.id === originalTargetSecretId);

    expect(updatedActiveSpy.trophies).toBe(1); // Начислен трофей
    expect(targetCharacterOnBoard?.isAlive).toBe(false); // Разоблаченный агент ликвидирован
    expect(updatedTargetSpy.secretId).not.toBe(originalTargetSecretId); // Сменилось прикрытие
    expect(nextState.activeSpyIndex).toBe((activeSpyIndex + 1) % nextState.spies!.length); // Ход передан
  });

  it("Ошибочный арест (spyCatch на мирного): неначисление трофеев, фиксация промаха, передача хода", () => {
    const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 3);
    const activeSpyIndex = state.activeSpyIndex!;
    const activeSpy = state.spies![activeSpyIndex];

    // Находим соседнюю клетку, которая НЕ является вражеским шпионом
    const neighbors = getAdjacentCharacters(state.board, activeSpy.secretId);
    const civilianCell = neighbors.find(c => c.id !== state.spies![1].secretId)!;

    const nextState = spyCatch(state, civilianCell.id);

    const updatedActiveSpy = nextState.spies![activeSpyIndex];
    const civilianCharacterOnBoard = nextState.board.flat().find(c => c.id === civilianCell.id);

    expect(updatedActiveSpy.trophies).toBe(0); // Трофей не начислен
    expect(civilianCharacterOnBoard?.isAlive).toBe(true); // Мирный житель жив
    expect(nextState.activeSpyIndex).toBe((activeSpyIndex + 1) % nextState.spies!.length); // Ход передан
    expect(nextState.log[nextState.log.length - 1]).toContain("Промах"); // В логе зафиксирован промах
  });

  it("Опрос свидетелей (spyInterrogate): определение соседства, радар, передача хода", () => {
    const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 3);
    const activeSpyIndex = state.activeSpyIndex!;
    const activeSpy = state.spies![activeSpyIndex];

    // Находим соседнюю клетку для активного шпиона
    const neighbors = getAdjacentCharacters(state.board, activeSpy.secretId);
    const targetCell = neighbors[0];

    // Ставим второго шпиона тоже по соседству с этой клеткой (или прямо в нее)
    state.spies![1].secretId = targetCell.id;

    const nextState = spyInterrogate(state, targetCell.id);

    expect(nextState.interrogationRadar).toEqual({
      targetId: targetCell.id,
      interrogatorIndex: activeSpyIndex,
    }); // Радар выставлен
    expect(nextState.lastSpyInterrogation?.raisedHandsPlayerNames).toContain(activeSpy.name); // Активный шпион подтвердил контакт
    expect(nextState.lastSpyInterrogation?.raisedHandsPlayerNames).toContain(state.spies![1].name); // Второй шпион подтвердил контакт
    expect(nextState.activeSpyIndex).toBe((activeSpyIndex + 1) % nextState.spies!.length); // Ход передан
  });

  it("Попытка разоблачения (spyCatch) на клетку не соседа не меняет стейт и не передает ход", () => {
    const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 3);
    const activeSpyIndex = state.activeSpyIndex!;
    const activeSpy = state.spies![activeSpyIndex];

    const neighbors = getAdjacentCharacters(state.board, activeSpy.secretId).map(c => c.id);
    const farCell = state.board.flat().find(c => c.id !== activeSpy.secretId && !neighbors.includes(c.id))!;

    const nextState = spyCatch(state, farCell.id);

    expect(nextState).toBe(state); // Стейт не изменился
    expect(nextState.activeSpyIndex).toBe(activeSpyIndex); // Ход не передан
  });

  it("Попытка опроса (spyInterrogate) на клетку не соседа не меняет стейт и не передает ход", () => {
    const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 3);
    const activeSpyIndex = state.activeSpyIndex!;
    const activeSpy = state.spies![activeSpyIndex];

    const neighbors = getAdjacentCharacters(state.board, activeSpy.secretId).map(c => c.id);
    const farCell = state.board.flat().find(c => c.id !== activeSpy.secretId && !neighbors.includes(c.id))!;

    const nextState = spyInterrogate(state, farCell.id);

    expect(nextState).toBe(state); // Стейт не изменился
    expect(nextState.activeSpyIndex).toBe(activeSpyIndex); // Ход не передан
  });

  it("Условие победы: достижение targetTrophies приводит к winner != null", () => {
    const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE", 2, 3);
    const activeSpyIndex = state.activeSpyIndex!;
    
    // Искусственно даем активному шпиону 2 трофея (при цели 3)
    state.spies![activeSpyIndex].trophies = 2;

    const activeSpy = state.spies![activeSpyIndex];
    const neighbors = getAdjacentCharacters(state.board, activeSpy.secretId);
    const targetCell = neighbors[0];

    // Подставляем вражеского шпиона
    state.spies![1].secretId = targetCell.id;

    const nextState = spyCatch(state, targetCell.id);

    expect(nextState.spies![activeSpyIndex].trophies).toBe(3); // Достигнута цель
    expect(nextState.winner).not.toBeNull(); // Победитель определен
  });
});