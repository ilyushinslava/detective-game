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
  robNeighbor,
  setPolicePatrol,
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
export function getThiefAIMove(state: GameState): GameState {
  if (state.winner) return state;

  const neighbors = getAdjacentCharacters(state.board, state.killerSecretId);
  const validTargets = neighbors.filter((c) => c.isAlive && !c.isRobbed);

  if (validTargets.length > 0) {
    const target =
      validTargets[Math.floor(Math.random() * validTargets.length)];
    return robNeighbor(state, target.id);
  }

  const possibleShifts: {
    type: "ROW" | "COL";
    index: number;
    direction: "FORWARD" | "BACKWARD";
  }[] = [];
  const types: ("ROW" | "COL")[] = ["ROW", "COL"];
  const directions: ("FORWARD" | "BACKWARD")[] = ["FORWARD", "BACKWARD"];

  for (const type of types) {
    for (let index = 0; index < 5; index++) {
      if (
        state.blockedShift &&
        state.blockedShift.type === type &&
        state.blockedShift.index === index
      ) {
        continue;
      }

      for (const direction of directions) {
        if (!isOppositeShift(state.lastShift, type, index, direction)) {
          possibleShifts.push({ type, index, direction });
        }
      }
    }
  }

  if (possibleShifts.length > 0) {
    const shift =
      possibleShifts[Math.floor(Math.random() * possibleShifts.length)];
    const newBoard = shiftBoard(
      state.board,
      shift.type,
      shift.index,
      shift.direction,
    );

    return {
      ...state,
      board: newBoard,
      currentTurn: "DETECTIVE",
      lastShift: shift,
      log: [
        ...state.log,
        `Вор сдвинул ${shift.type === "ROW" ? `ряд ${shift.index + 1}` : `колонку ${shift.index + 1}`}.`,
      ],
    };
  }

  return {
    ...state,
    currentTurn: "DETECTIVE",
    log: [...state.log, "Вор затаился и пропустил ход."],
  };
}
export function getPoliceAIMove(state: GameState): GameState {
  if (state.winner) return state;

  // 1. С вероятностью 50% выставляем оцепление на случайный ряд или колонку
  const shouldPatrol = Math.random() < 0.5;
  if (shouldPatrol) {
    const types: ("ROW" | "COL")[] = ["ROW", "COL"];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomIndex = Math.floor(Math.random() * 5);
    return setPolicePatrol(state, randomType, randomIndex);
  }

  // 2. Иначе делаем валидный сдвиг поля
  const possibleShifts: {
    type: "ROW" | "COL";
    index: number;
    direction: "FORWARD" | "BACKWARD";
  }[] = [];
  const types: ("ROW" | "COL")[] = ["ROW", "COL"];
  const directions: ("FORWARD" | "BACKWARD")[] = ["FORWARD", "BACKWARD"];

  for (const type of types) {
    for (let index = 0; index < 5; index++) {
      if (
        state.blockedShift &&
        state.blockedShift.type === type &&
        state.blockedShift.index === index
      ) {
        continue;
      }

      for (const direction of directions) {
        if (!isOppositeShift(state.lastShift, type, index, direction)) {
          possibleShifts.push({ type, index, direction });
        }
      }
    }
  }

  if (possibleShifts.length > 0) {
    const shift =
      possibleShifts[Math.floor(Math.random() * possibleShifts.length)];
    const newBoard = shiftBoard(
      state.board,
      shift.type,
      shift.index,
      shift.direction,
    );

    return {
      ...state,
      board: newBoard,
      currentTurn: "KILLER",
      lastShift: shift,
      log: [
        ...state.log,
        `Полиция сдвинула ${shift.type === "ROW" ? `ряд ${shift.index + 1}` : `колонку ${shift.index + 1}`}.`,
      ],
    };
  }

  // Фолбэк на установку патруля, если со сдвигами возник коллизионный тупик
  return setPolicePatrol(state, "ROW", 0);
}
