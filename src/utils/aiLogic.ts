import type { GameState, LastShift, Character } from '../types/game';
import {
  getAdjacentCharacters,
  isOppositeShift,
  killCharacter,
  accuseCharacter,
  exonerateFromHand,
  disguiseKiller,
  shiftBoard,
  robNeighbor,
  setPolicePatrol,
} from './gameLogic';

function getAllValidShifts(board: Character[][], lastShift: LastShift | null, blockedShift?: { type: 'ROW' | 'COL'; index: number } | null) {
  const shifts: Array<{ type: 'ROW' | 'COL'; index: number; direction: 'FORWARD' | 'BACKWARD' }> = [];
  const numRows = board.length;
  const numCols = board[0].length;

  for (let r = 0; r < numRows; r++) {
    if (blockedShift?.type === 'ROW' && blockedShift.index === r) continue;
    for (const dir of ['FORWARD', 'BACKWARD'] as const) {
      if (!isOppositeShift(lastShift, 'ROW', r, dir)) {
        shifts.push({ type: 'ROW', index: r, direction: dir });
      }
    }
  }

  for (let c = 0; c < numCols; c++) {
    if (blockedShift?.type === 'COL' && blockedShift.index === c) continue;
    for (const dir of ['FORWARD', 'BACKWARD'] as const) {
      if (!isOppositeShift(lastShift, 'COL', c, dir)) {
        shifts.push({ type: 'COL', index: c, direction: dir });
      }
    }
  }

  return shifts;
}

export function getKillerAIMove(state: GameState): GameState {
  const killerNeighbors = getAdjacentCharacters(state.board, state.killerSecretId);

  if (state.mode === 'THIEF_HUNT') {
    return getThiefAIMove(state);
  }

  if (state.mode === 'MANIAC_VS_OPERATIVE') {
    const validTargets = killerNeighbors.filter(
      (c) => c.isAlive && (state.victimList.includes(c.id) || c.id === state.detectiveSecretId)
    );
    if (validTargets.length > 0) {
      const detTarget = validTargets.find((c) => c.id === state.detectiveSecretId);
      const chosen = detTarget ?? validTargets[Math.floor(Math.random() * validTargets.length)];
      return killCharacter(state, chosen.id);
    }
  } else if (state.mode === 'SKHVATKA') {
    const validTargets = killerNeighbors.filter((c) => c.isAlive);
    if (validTargets.length > 0) {
      const detTarget = validTargets.find((c) => c.id === state.detectiveSecretId);
      const chosen = detTarget ?? validTargets[Math.floor(Math.random() * validTargets.length)];
      return killCharacter(state, chosen.id);
    }

    const isFirstTurnKiller = state.killCount === 0;
    const exoneratedNeighbors = killerNeighbors.filter((c) => c.isExonerated).length;
    if (!isFirstTurnKiller && exoneratedNeighbors >= 3 && state.evidenceDeck.length > 0 && Math.random() < 0.4) {
      return disguiseKiller(state);
    }
  }

  const validShifts = getAllValidShifts(state.board, state.lastShift, state.blockedShift);
  if (validShifts.length > 0) {
    const randomShift = validShifts[Math.floor(Math.random() * validShifts.length)];
    const newBoard = shiftBoard(state.board, randomShift.type, randomShift.index, randomShift.direction);
    return {
      ...state,
      board: newBoard,
      currentTurn: 'DETECTIVE',
      lastShift: randomShift,
      blockedShift: null,
      log: [
        ...state.log,
        `🤖 Бот сдвинул ${randomShift.type === 'ROW' ? `ряд ${randomShift.index + 1}` : `колонку ${randomShift.index + 1}`}.`,
      ],
    };
  }

  return state;
}

export function getDetectiveAIMove(state: GameState): GameState {
  if (state.mode === 'THIEF_HUNT') {
    return getPoliceAIMove(state);
  }

  const detectiveNeighbors = getAdjacentCharacters(state.board, state.detectiveSecretId);

  const suspectsNear = detectiveNeighbors.filter(
    (c) => c.isAlive && !c.isExonerated && !state.detectiveHand.includes(c.id) && c.id !== state.detectiveSecretId
  );

  if (suspectsNear.length === 1 && Math.random() < 0.85) {
    return accuseCharacter(state, suspectsNear[0].id);
  }

  if (state.detectiveHand.length > 0 && Math.random() < 0.6) {
    const cardToExonerate = state.detectiveHand[0];
    return exonerateFromHand(state, cardToExonerate);
  }

  if (suspectsNear.length > 0 && Math.random() < 0.3) {
    const chosen = suspectsNear[Math.floor(Math.random() * suspectsNear.length)];
    return accuseCharacter(state, chosen.id);
  }

  const validShifts = getAllValidShifts(state.board, state.lastShift, state.blockedShift);
  if (validShifts.length > 0) {
    const randomShift = validShifts[Math.floor(Math.random() * validShifts.length)];
    const newBoard = shiftBoard(state.board, randomShift.type, randomShift.index, randomShift.direction);
    return {
      ...state,
      board: newBoard,
      currentTurn: 'KILLER',
      lastShift: randomShift,
      blockedShift: null,
      log: [
        ...state.log,
        `🤖 Бот сдвинул ${randomShift.type === 'ROW' ? `ряд ${randomShift.index + 1}` : `колонку ${randomShift.index + 1}`}.`,
      ],
    };
  }

  return state;
}

export function getThiefAIMove(state: GameState): GameState {
  const neighbors = getAdjacentCharacters(state.board, state.killerSecretId);
  const robTargets = neighbors.filter((c) => !c.isRobbed);

  if (robTargets.length > 0) {
    const target = robTargets[Math.floor(Math.random() * robTargets.length)];
    return robNeighbor(state, target.id);
  }

  const validShifts = getAllValidShifts(state.board, state.lastShift, state.blockedShift);
  if (validShifts.length > 0) {
    const randomShift = validShifts[Math.floor(Math.random() * validShifts.length)];
    const newBoard = shiftBoard(state.board, randomShift.type, randomShift.index, randomShift.direction);
    return {
      ...state,
      board: newBoard,
      currentTurn: 'DETECTIVE',
      lastShift: randomShift,
      blockedShift: null,
      log: [
        ...state.log,
        `🤖 Вор сдвинул ${randomShift.type === 'ROW' ? `ряд ${randomShift.index + 1}` : `колонку ${randomShift.index + 1}`}.`,
      ],
    };
  }

  return state;
}

export function getPoliceAIMove(state: GameState): GameState {
  const neighbors = getAdjacentCharacters(state.board, state.detectiveSecretId);
  const nearThief = neighbors.find((c) => c.id === state.killerSecretId);

  if (nearThief && Math.random() < 0.75) {
    return accuseCharacter(state, nearThief.id);
  }

  if (state.blockedShift === null && Math.random() < 0.4) {
    const randomIdx = Math.floor(Math.random() * 5);
    return setPolicePatrol(state, 'ROW', randomIdx);
  }

  const validShifts = getAllValidShifts(state.board, state.lastShift, state.blockedShift);
  if (validShifts.length > 0) {
    const randomShift = validShifts[Math.floor(Math.random() * validShifts.length)];
    const newBoard = shiftBoard(state.board, randomShift.type, randomShift.index, randomShift.direction);
    return {
      ...state,
      board: newBoard,
      currentTurn: 'KILLER',
      lastShift: randomShift,
      blockedShift: null,
      log: [
        ...state.log,
        `🤖 Полиция сдвинула ${randomShift.type === 'ROW' ? `ряд ${randomShift.index + 1}` : `колонку ${randomShift.index + 1}`}.`,
      ],
    };
  }

  return state;
}
