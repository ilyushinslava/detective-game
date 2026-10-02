import type { GameState, LastShift, Character } from "../types/game";
import {
  getAdjacentCharacters,
  isOppositeShift,
  killCharacter,
  accuseCharacter,
  exonerateFromHand,
  disguiseKiller,
  shiftBoard,
  captureSpy,
  interrogateNeighbor,
} from "./gameLogic";

function getAllValidShifts(board: Character[][], lastShift: LastShift | null) {
  const shifts: Array<{
    type: "ROW" | "COL";
    index: number;
    direction: "FORWARD" | "BACKWARD";
  }> = [];
  const numRows = board.length;
  const numCols = board[0].length;

  for (let r = 0; r < numRows; r++) {
    for (const dir of ["FORWARD", "BACKWARD"] as const) {
      if (!isOppositeShift(lastShift, "ROW", r, dir)) {
        shifts.push({ type: "ROW", index: r, direction: dir });
      }
    }
  }

  for (let c = 0; c < numCols; c++) {
    for (const dir of ["FORWARD", "BACKWARD"] as const) {
      if (!isOppositeShift(lastShift, "COL", c, dir)) {
        shifts.push({ type: "COL", index: c, direction: dir });
      }
    }
  }

  return shifts;
}

export function getKillerAIMove(state: GameState): GameState {
  const killerNeighbors = getAdjacentCharacters(
    state.board,
    state.killerSecretId,
  );

  if (state.mode === "MANIAC_VS_OPERATIVE") {
    const validTargets = killerNeighbors.filter(
      (c) =>
        c.isAlive &&
        (state.victimList.includes(c.id) || c.id === state.detectiveSecretId),
    );
    if (validTargets.length > 0) {
      const detTarget = validTargets.find(
        (c) => c.id === state.detectiveSecretId,
      );
      const chosen =
        detTarget ??
        validTargets[Math.floor(Math.random() * validTargets.length)];
      return killCharacter(state, chosen.id);
    }
  } else if (state.mode === "SKHVATKA") {
    const validTargets = killerNeighbors.filter((c) => c.isAlive);
    if (validTargets.length > 0) {
      const detTarget = validTargets.find(
        (c) => c.id === state.detectiveSecretId,
      );
      const chosen =
        detTarget ??
        validTargets[Math.floor(Math.random() * validTargets.length)];
      return killCharacter(state, chosen.id);
    }

    const isFirstTurnKiller = state.killCount === 0;
    const exoneratedNeighbors = killerNeighbors.filter(
      (c) => c.isExonerated,
    ).length;
    if (
      !isFirstTurnKiller &&
      exoneratedNeighbors >= 3 &&
      state.evidenceDeck.length > 0 &&
      Math.random() < 0.4
    ) {
      return disguiseKiller(state);
    }
  }

  const validShifts = getAllValidShifts(state.board, state.lastShift);
  if (validShifts.length > 0) {
    const randomShift =
      validShifts[Math.floor(Math.random() * validShifts.length)];
    const newBoard = shiftBoard(
      state.board,
      randomShift.type,
      randomShift.index,
      randomShift.direction,
    );
    return {
      ...state,
      board: newBoard,
      currentTurn: "DETECTIVE",
      lastShift: randomShift,
      log: [
        ...state.log,
        `🤖 Бот сдвинул ${randomShift.type === "ROW" ? `ряд ${randomShift.index + 1}` : `колонку ${randomShift.index + 1}`}.`,
      ],
    };
  }

  return state;
}

export function getDetectiveAIMove(state: GameState): GameState {
  const detectiveNeighbors = getAdjacentCharacters(
    state.board,
    state.detectiveSecretId,
  );

  const suspectsNear = detectiveNeighbors.filter(
    (c) =>
      c.isAlive &&
      !c.isExonerated &&
      !state.detectiveHand.includes(c.id) &&
      c.id !== state.detectiveSecretId,
  );

  if (suspectsNear.length === 1 && Math.random() < 0.85) {
    return accuseCharacter(state, suspectsNear[0].id);
  }

  if (state.detectiveHand.length > 0 && Math.random() < 0.6) {
    const cardToExonerate = state.detectiveHand[0];
    return exonerateFromHand(state, cardToExonerate);
  }

  if (suspectsNear.length > 0 && Math.random() < 0.3) {
    const chosen =
      suspectsNear[Math.floor(Math.random() * suspectsNear.length)];
    return accuseCharacter(state, chosen.id);
  }

  const validShifts = getAllValidShifts(state.board, state.lastShift);
  if (validShifts.length > 0) {
    const randomShift =
      validShifts[Math.floor(Math.random() * validShifts.length)];
    const newBoard = shiftBoard(
      state.board,
      randomShift.type,
      randomShift.index,
      randomShift.direction,
    );
    return {
      ...state,
      board: newBoard,
      currentTurn: "KILLER",
      lastShift: randomShift,
      log: [
        ...state.log,
        `🤖 Бот сдвинул ${randomShift.type === "ROW" ? `ряд ${randomShift.index + 1}` : `колонку ${randomShift.index + 1}`}.`,
      ],
    };
  }

  return state;
}

export function getSecretServiceAIMove(state: GameState): GameState {
  const isAgent1 = state.currentTurn === "KILLER";
  const mySecretId = isAgent1 ? state.killerSecretId : state.detectiveSecretId;
  const myNeighbors = getAdjacentCharacters(state.board, mySecretId).filter(
    (c) => c.isAlive,
  );

  if (myNeighbors.length > 0 && Math.random() < 0.5) {
    const target = myNeighbors[Math.floor(Math.random() * myNeighbors.length)];
    return captureSpy(state, target.id);
  }

  if (myNeighbors.length > 0 && Math.random() < 0.7) {
    const target = myNeighbors[Math.floor(Math.random() * myNeighbors.length)];
    return interrogateNeighbor(state, target.id);
  }

  const validShifts = getAllValidShifts(state.board, state.lastShift);
  if (validShifts.length > 0) {
    const randomShift =
      validShifts[Math.floor(Math.random() * validShifts.length)];
    const newBoard = shiftBoard(
      state.board,
      randomShift.type,
      randomShift.index,
      randomShift.direction,
    );
    const nextTurn = isAgent1 ? "DETECTIVE" : "KILLER";
    return {
      ...state,
      board: newBoard,
      currentTurn: nextTurn,
      lastShift: randomShift,
      log: [
        ...state.log,
        `🤖 Бот сдвинул ${randomShift.type === "ROW" ? `ряд ${randomShift.index + 1}` : `колонку ${randomShift.index + 1}`}.`,
      ],
    };
  }

  return state;
}
