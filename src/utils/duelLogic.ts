import { DUEL_CHARACTERS } from "../constants/duelCharacters";
import { DUEL_QUESTIONS } from "../constants/duelQuestions";
import type { DuelCharacter, DuelHistoryEntry } from "../types/duel";
import type { Role } from "../types/game";

export interface DuelState {
  board: DuelCharacter[];
  killerSecretId: string;
  detectiveSecretId: string;
  currentTurn: Role;
  turnTimeRemaining: number; // 25 сек
  matchTimeRemaining: number; // 480 сек (8 минут)
  penalties: Record<Role, number>;
  accusedTargets: Record<Role, string[]>;
  history: DuelHistoryEntry[];
  winner: Role | "DRAW" | null;
  winReason?: "ACCUSATION" | "TIE_BREAK_PENALTIES" | "TIE_BREAK_CANDIDATES" | "TIE_BREAK_DRAW";
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createInitialDuelState(): DuelState {
  const clonedCharacters = DUEL_CHARACTERS.map((c) => ({
    ...c,
    attributes: { ...c.attributes },
  }));
  const shuffled = shuffleArray(clonedCharacters);
  const detectiveSecretId = shuffled[0].id;
  const killerSecretId = shuffled[1].id;

  return {
    board: clonedCharacters,
    killerSecretId,
    detectiveSecretId,
    currentTurn: "DETECTIVE",
    turnTimeRemaining: 25,
    matchTimeRemaining: 480,
    penalties: { DETECTIVE: 0, KILLER: 0 },
    accusedTargets: { DETECTIVE: [], KILLER: [] },
    history: [],
    winner: null,
  };
}

export function filterCandidates(
  allCharacters: DuelCharacter[],
  history: DuelHistoryEntry[],
  forRole: Role
): DuelCharacter[] {
  // Фильтруем персонажей по ответам соперника на вопросы, заданные игроком forRole
  const roleQuestions = history.filter((h) => h.askerRole === forRole);
  if (roleQuestions.length === 0) return allCharacters;

  return allCharacters.filter((char) => {
    return roleQuestions.every((entry) => {
      const q = DUEL_QUESTIONS.find((item) => item.id === entry.questionId);
      if (!q) return true;
      return q.check(char.attributes) === entry.answer;
    });
  });
}

export function askDuelQuestion(state: DuelState, questionId: string): DuelState {
  if (state.winner) return state;
  const question = DUEL_QUESTIONS.find((q) => q.id === questionId);
  if (!question) return state;

  // Вопрос задается оппоненту: проверяется секретная личность противника
  const targetSecretId = state.currentTurn === "DETECTIVE" ? state.killerSecretId : state.detectiveSecretId;
  const targetChar = state.board.find((c) => c.id === targetSecretId);
  if (!targetChar) return state;

  const answer = question.check(targetChar.attributes);
  const entry: DuelHistoryEntry = {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    askerRole: state.currentTurn,
    questionId: question.id,
    questionText: question.text,
    answer,
    timestamp: Date.now(),
  };

  const nextTurn: Role = state.currentTurn === "DETECTIVE" ? "KILLER" : "DETECTIVE";

  return {
    ...state,
    history: [...state.history, entry],
    currentTurn: nextTurn,
    turnTimeRemaining: 25,
  };
}

export function accuseDuelTarget(state: DuelState, targetId: string): DuelState {
  if (state.winner) return state;
  const currentRole = state.currentTurn;
  const alreadyAccused = state.accusedTargets[currentRole].includes(targetId);
  if (alreadyAccused) return state; // Повторное обвинение запрещено

  const targetSecretId = currentRole === "DETECTIVE" ? state.killerSecretId : state.detectiveSecretId;

  if (targetId === targetSecretId) {
    // Точное обвинение немедленно завершает партию победой
    return {
      ...state,
      winner: currentRole,
      winReason: "ACCUSATION",
    };
  }

  // Ошибочное обвинение: +1 штраф, фиксация цели, переход хода
  const nextTurn: Role = currentRole === "DETECTIVE" ? "KILLER" : "DETECTIVE";
  return {
    ...state,
    penalties: {
      ...state.penalties,
      [currentRole]: state.penalties[currentRole] + 1,
    },
    accusedTargets: {
      ...state.accusedTargets,
      [currentRole]: [...state.accusedTargets[currentRole], targetId],
    },
    currentTurn: nextTurn,
    turnTimeRemaining: 25,
  };
}

export function resolveDuelTieBreak(state: DuelState): DuelState {
  if (state.winner) return state;

  // 1. Сравнение штрафных очков (меньше = победа)
  if (state.penalties.DETECTIVE < state.penalties.KILLER) {
    return { ...state, winner: "DETECTIVE", winReason: "TIE_BREAK_PENALTIES" };
  }
  if (state.penalties.KILLER < state.penalties.DETECTIVE) {
    return { ...state, winner: "KILLER", winReason: "TIE_BREAK_PENALTIES" };
  }

  // 2. Сравнение оставшихся кандидатов (меньше кандидатов = больше исключено = победа)
  const detCandidates = filterCandidates(state.board, state.history, "DETECTIVE").length;
  const kilCandidates = filterCandidates(state.board, state.history, "KILLER").length;

  if (detCandidates < kilCandidates) {
    return { ...state, winner: "DETECTIVE", winReason: "TIE_BREAK_CANDIDATES" };
  }
  if (kilCandidates < detCandidates) {
    return { ...state, winner: "KILLER", winReason: "TIE_BREAK_CANDIDATES" };
  }

  // 3. Полное равенство
  return { ...state, winner: "DRAW", winReason: "TIE_BREAK_DRAW" };
}