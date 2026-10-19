import { describe, it, expect } from "vitest";
import {
  createInitialDuelState,
  askDuelQuestion,
  accuseDuelTarget,
  filterCandidates,
  resolveDuelTieBreak,
} from "./duelLogic";
import { DUEL_QUESTIONS } from "../constants/duelQuestions";

describe("Режим: Очная ставка (LINE_UP) - Новая логика", () => {
  it("Генерация начального состояния: 25 карт, разные секреты, таймеры 25 и 480", () => {
    const state = createInitialDuelState();
    expect(state.board.length).toBe(25);
    expect(state.detectiveSecretId).toBeTruthy();
    expect(state.killerSecretId).toBeTruthy();
    expect(state.detectiveSecretId).not.toBe(state.killerSecretId);
    expect(state.turnTimeRemaining).toBe(25);
    expect(state.matchTimeRemaining).toBe(480);
    expect(state.currentTurn).toBe("DETECTIVE");
    expect(state.winner).toBeNull();
  });

  it("Вопрос: правильная проверка атрибута соперника, переключение хода, появление в истории", () => {
    const state = createInitialDuelState();
    const targetChar = state.board.find(c => c.id === state.killerSecretId)!;
    
    // Берем первый вопрос (например, "Это женщина?")
    const question = DUEL_QUESTIONS[0];
    const expectedAnswer = question.check(targetChar.attributes);

    const nextState = askDuelQuestion(state, question.id);

    expect(nextState.currentTurn).toBe("KILLER");
    expect(nextState.history.length).toBe(1);
    expect(nextState.history[0].askerRole).toBe("DETECTIVE");
    expect(nextState.history[0].questionId).toBe(question.id);
    expect(nextState.history[0].answer).toBe(expectedAnswer);
    expect(nextState.turnTimeRemaining).toBe(25);
  });

  it("Фильтр кандидатов: сужение списка при ответах", () => {
    let state = createInitialDuelState();
    
    // Искусственно задаем пол цели для предсказуемости теста
    const targetChar = state.board.find(c => c.id === state.killerSecretId)!;
    targetChar.attributes.gender = "FEMALE";

    const question = DUEL_QUESTIONS.find(q => q.id === "q_gender_female")!;
    state = askDuelQuestion(state, question.id);

    const candidates = filterCandidates(state.board, state.history, "DETECTIVE");
    
    // Все оставшиеся кандидаты должны быть женщинами
    expect(candidates.every(c => c.attributes.gender === "FEMALE")).toBe(true);
    // И их должно быть меньше 25
    expect(candidates.length).toBeLessThan(25);
  });

  it("Обвинение: победа при верной цели", () => {
    const state = createInitialDuelState();
    const targetId = state.killerSecretId; // Детектив угадывает Киллера

    const nextState = accuseDuelTarget(state, targetId);

    expect(nextState.winner).toBe("DETECTIVE");
    expect(nextState.winReason).toBe("ACCUSATION");
  });

  it("Обвинение: +1 штраф и продолжение игры при неверной цели", () => {
    const state = createInitialDuelState();
    const wrongTargetId = state.board.find(c => c.id !== state.killerSecretId)!.id;

    const nextState = accuseDuelTarget(state, wrongTargetId);

    expect(nextState.winner).toBeNull();
    expect(nextState.penalties.DETECTIVE).toBe(1);
    expect(nextState.accusedTargets.DETECTIVE).toContain(wrongTargetId);
    expect(nextState.currentTurn).toBe("KILLER");
  });

  it("Запрет повторного обвинения того же подозреваемого", () => {
    let state = createInitialDuelState();
    const wrongTargetId = state.board.find(c => c.id !== state.killerSecretId)!.id;

    state = accuseDuelTarget(state, wrongTargetId); // Ход перешел к KILLER
    state.currentTurn = "DETECTIVE"; // Искусственно возвращаем ход Детективу для теста

    const nextState = accuseDuelTarget(state, wrongTargetId); // Пытаемся обвинить того же

    // Состояние не должно измениться (штраф не увеличился, ход не перешел)
    expect(nextState.penalties.DETECTIVE).toBe(1);
    expect(nextState.currentTurn).toBe("DETECTIVE");
  });

  it("Тай-брейк: победа по штрафам", () => {
    const state = createInitialDuelState();
    state.penalties.DETECTIVE = 0;
    state.penalties.KILLER = 1;

    const nextState = resolveDuelTieBreak(state);

    expect(nextState.winner).toBe("DETECTIVE");
    expect(nextState.winReason).toBe("TIE_BREAK_PENALTIES");
  });

  it("Тай-брейк: победа по количеству кандидатов при равных штрафах", () => {
    let state = createInitialDuelState();
    state.penalties.DETECTIVE = 1;
    state.penalties.KILLER = 1;

    // Детектив задает вопрос, сужая круг подозреваемых
    const targetChar = state.board.find(c => c.id === state.killerSecretId)!;
    targetChar.attributes.gender = "FEMALE";
    state = askDuelQuestion(state, "q_gender_female"); // Ход перешел к KILLER

    const nextState = resolveDuelTieBreak(state);

    // У Детектива меньше кандидатов (он задал вопрос), он должен победить
    expect(nextState.winner).toBe("DETECTIVE");
    expect(nextState.winReason).toBe("TIE_BREAK_CANDIDATES");
  });
});