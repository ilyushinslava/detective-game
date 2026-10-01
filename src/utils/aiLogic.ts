import type { GameState, LastShift, Character } from '../types/game';
import {
  getAdjacentCharacters,
  getCharacterCoords,
  isOppositeShift,
  killCharacter,
  accuseCharacter,
  exonerateFromHand,
  disguiseKiller,
  shiftBoard,
  captureSpy,
  interrogateNeighbor,
  robNeighbor,
  setPolicePatrol,
  plantBomb,
  applyShield,
  sniperShot,
  crackVault,
  lockVault,
} from './gameLogic';

function getAllValidShifts(board: Character[][], lastShift: LastShift | null, blockedShift?: { type: 'ROW' | 'COL'; index: number } | null) {
  const shifts: Array<{ type: 'ROW' | 'COL'; index: number; direction: 'FORWARD' | 'BACKWARD' }> = [];
  const numRows = board.length;
  const numCols = board[0].length;

  for (let r = 0; r < numRows; r++) {
    if (blockedShift && blockedShift.type === 'ROW' && blockedShift.index === r) continue;
    for (const dir of ['FORWARD', 'BACKWARD'] as const) {
      if (!isOppositeShift(lastShift, 'ROW', r, dir)) {
        shifts.push({ type: 'ROW', index: r, direction: dir });
      }
    }
  }

  for (let c = 0; c < numCols; c++) {
    if (blockedShift && blockedShift.type === 'COL' && blockedShift.index === c) continue;
    for (const dir of ['FORWARD', 'BACKWARD'] as const) {
      if (!isOppositeShift(lastShift, 'COL', c, dir)) {
        shifts.push({ type: 'COL', index: c, direction: dir });
      }
    }
  }

  return shifts;
}

export function getKillerAIMove(state: GameState): GameState {
  if (state.mode === 'THIEF_HUNT') return getThiefAIMove(state);
  if (state.mode === 'EUROPOL_VS_OPG') return getOPGAIMove(state);
  if (state.mode === 'SPANISH_HEIST') return getHeistRobberAIMove(state);

  const killerNeighbors = getAdjacentCharacters(state.board, state.killerSecretId);

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
  }

  const isFirstTurnKiller = state.mode === 'SKHVATKA' && state.killCount === 0;
  const exoneratedNeighbors = killerNeighbors.filter((c) => c.isExonerated).length;
  if (!isFirstTurnKiller && exoneratedNeighbors >= 3 && state.evidenceDeck.length > 0 && Math.random() < 0.4) {
    return disguiseKiller(state);
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
  if (state.mode === 'THIEF_HUNT') return getPoliceAIMove(state);
  if (state.mode === 'EUROPOL_VS_OPG') return getEuropolAIMove(state);
  if (state.mode === 'SPANISH_HEIST') return getHeistSecurityAIMove(state);

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

export function getHeistRobberAIMove(state: GameState): GameState {
  const neighbors = getAdjacentCharacters(state.board, state.killerSecretId);
  const crackableVault = neighbors.find((c) => c.isVault && !c.isVaultCracked && !c.isVaultLocked);

  if (crackableVault) {
    return crackVault(state, crackableVault.id);
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
        `🤖 Грабители сдвинули ${randomShift.type === 'ROW' ? `ряд ${randomShift.index + 1}` : `колонку ${randomShift.index + 1}`}.`,
      ],
    };
  }

  return state;
}

export function getHeistSecurityAIMove(state: GameState): GameState {
  const neighbors = getAdjacentCharacters(state.board, state.detectiveSecretId);
  const suspects = neighbors.filter((c) => !c.isExonerated && !c.isVault && c.id !== state.detectiveSecretId);

  if (suspects.length === 1 && Math.random() < 0.75) {
    return accuseCharacter(state, suspects[0].id);
  }

  const targetVault = neighbors.find((c) => c.isVault && !c.isVaultCracked && !c.isVaultLocked);
  if (targetVault && Math.random() < 0.6) {
    return lockVault(state, targetVault.id);
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
        `🤖 Охрана сдвинула ${randomShift.type === 'ROW' ? `ряд ${randomShift.index + 1}` : `колонку ${randomShift.index + 1}`}.`,
      ],
    };
  }

  return state;
}

export function getOPGAIMove(state: GameState): GameState {
  const neighbors = getAdjacentCharacters(state.board, state.killerSecretId).filter((c) => c.isAlive);
  const detTarget = neighbors.find((c) => c.id === state.detectiveSecretId);
  if (detTarget) return killCharacter(state, detTarget.id);

  const unmined = neighbors.filter((c) => !c.hasBomb);
  if (unmined.length > 0 && Math.random() < 0.35) {
    const target = unmined[Math.floor(Math.random() * unmined.length)];
    return plantBomb(state, target.id);
  }

  if (neighbors.length > 0 && Math.random() < 0.6) {
    const target = neighbors[Math.floor(Math.random() * neighbors.length)];
    return killCharacter(state, target.id);
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
        `🤖 ОПГ сдвинула ${randomShift.type === 'ROW' ? `ряд ${randomShift.index + 1}` : `колонку ${randomShift.index + 1}`}.`,
      ],
    };
  }

  return state;
}

export function getEuropolAIMove(state: GameState): GameState {
  const detPos = getCharacterCoords(state.board, state.detectiveSecretId);
  const neighbors = getAdjacentCharacters(state.board, state.detectiveSecretId).filter((c) => c.isAlive);

  const suspects = neighbors.filter((c) => !c.isExonerated && c.id !== state.detectiveSecretId);
  if (suspects.length === 1 && Math.random() < 0.7) {
    return accuseCharacter(state, suspects[0].id);
  }

  if (detPos && Math.random() < 0.3) {
    const candidates: Character[] = [];
    const deltas = [[-2, 0], [2, 0], [0, -2], [0, 2]];
    for (const [dr, dc] of deltas) {
      const nr = detPos.r + dr;
      const nc = detPos.c + dc;
      if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
        const char = state.board[nr][nc];
        if (char.isAlive && !char.isExonerated) candidates.push(char);
      }
    }

    if (candidates.length > 0) {
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      return sniperShot(state, target.id);
    }
  }

  const unshielded = [
    state.board.flat().find((c) => c.id === state.detectiveSecretId),
    ...neighbors,
  ].filter((c): c is Character => Boolean(c && c.isAlive && !c.isShielded));

  if (unshielded.length > 0 && Math.random() < 0.4) {
    const target = unshielded[0];
    return applyShield(state, target.id);
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
        `🤖 Европол сдвинул ${randomShift.type === 'ROW' ? `ряд ${randomShift.index + 1}` : `колонку ${randomShift.index + 1}`}.`,
      ],
    };
  }

  return state;
}

export function getThiefAIMove(state: GameState): GameState {
  const thiefNeighbors = getAdjacentCharacters(state.board, state.killerSecretId);
  const robTargets = thiefNeighbors.filter((c) => !c.isRobbed && c.id !== state.killerSecretId);

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
  const policeNeighbors = getAdjacentCharacters(state.board, state.detectiveSecretId);
  const suspects = policeNeighbors.filter((c) => !c.isExonerated && c.id !== state.detectiveSecretId);

  if (suspects.length === 1 && Math.random() < 0.75) {
    return accuseCharacter(state, suspects[0].id);
  }

  if (Math.random() < 0.45 && !state.blockedShift) {
    const type: 'ROW' | 'COL' = Math.random() < 0.5 ? 'ROW' : 'COL';
    const index = Math.floor(Math.random() * 5);
    return setPolicePatrol(state, type, index);
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

export function getSecretServiceAIMove(state: GameState): GameState {
  const isAgent1 = state.currentTurn === 'KILLER';
  const mySecretId = isAgent1 ? state.killerSecretId : state.detectiveSecretId;
  const myNeighbors = getAdjacentCharacters(state.board, mySecretId).filter((c) => c.isAlive);

  if (myNeighbors.length > 0 && Math.random() < 0.5) {
    const target = myNeighbors[Math.floor(Math.random() * myNeighbors.length)];
    return captureSpy(state, target.id);
  }

  if (myNeighbors.length > 0 && Math.random() < 0.7) {
    const target = myNeighbors[Math.floor(Math.random() * myNeighbors.length)];
    return interrogateNeighbor(state, target.id);
  }

  const validShifts = getAllValidShifts(state.board, state.lastShift, state.blockedShift);
  if (validShifts.length > 0) {
    const randomShift = validShifts[Math.floor(Math.random() * validShifts.length)];
    const newBoard = shiftBoard(state.board, randomShift.type, randomShift.index, randomShift.direction);
    const nextTurn = isAgent1 ? 'DETECTIVE' : 'KILLER';
    return {
      ...state,
      board: newBoard,
      currentTurn: nextTurn,
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
