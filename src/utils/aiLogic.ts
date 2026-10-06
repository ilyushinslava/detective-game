import type { GameState, LastShift, Character } from "../types/game";
import {
  getAdjacentCharacters,
  isOppositeShift,
  killCharacter,
  accuseCharacter,
  exonerateFromHand,
  disguiseKiller,
  shiftBoard,
  spyCatch,
  spyInterrogate,
  robNeighbor,
  setPolicePatrol,
} from "./gameLogic";

function getAllValidShifts(
  board: Character[][],
  lastShift: LastShift | null,
  blockedShift?: { type: "ROW" | "COL"; index: number } | null,
) {
  const shifts: Array<{
    type: "ROW" | "COL";
    index: number;
    direction: "FORWARD" | "BACKWARD";
  }> = [];
  const numRows = board.length;
  const numCols = board[0].length;

  for (let r = 0; r < numRows; r++) {
    if (blockedShift?.type === "ROW" && blockedShift.index === r) continue;
    for (const dir of ["FORWARD", "BACKWARD"] as const) {
      if (!isOppositeShift(lastShift, "ROW", r, dir)) {
        shifts.push({ type: "ROW", index: r, direction: dir });
      }
    }
  }

  for (let c = 0; c < numCols; c++) {
    if (blockedShift?.type === "COL" && blockedShift.index === c) continue;
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
        (c.id === state.victimList[0] || c.id === state.detectiveSecretId),
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

  const validShifts = getAllValidShifts(
    state.board,
    state.lastShift,
    state.blockedShift,
  );
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

  return {
    ...state,
    currentTurn: "DETECTIVE",
    log: [
      ...state.log,
      "🤖 Бот-преступник пропустил ход (нет доступных действий).",
    ],
  };
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

  const validShifts = getAllValidShifts(
    state.board,
    state.lastShift,
    state.blockedShift,
  );
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

  return {
    ...state,
    currentTurn: "KILLER",
    log: [
      ...state.log,
      "🤖 Бот-инспектор пропустил ход (нет доступных действий).",
    ],
  };
}

export function getSecretServiceAIMove(state: GameState): GameState {
  if (state.winner || !state.spies || state.activeSpyIndex === undefined)
    return state;

  const activeSpy = state.spies[state.activeSpyIndex];
  if (!activeSpy || !activeSpy.isAI) return state;

  const neighbors = getAdjacentCharacters(
    state.board,
    activeSpy.secretId,
  ).filter((c) => c.isAlive);
  const selfChar = state.board
    .flat()
    .find((c) => c.id === activeSpy.secretId && c.isAlive);

  const validTargets = [...neighbors, ...(selfChar ? [selfChar] : [])];
  const rand = Math.random();

  // 1. Попытка поймать шпиона (40% шанс при наличии живых соседей)
  if (validTargets.length > 0 && rand < 0.4) {
    const target =
      validTargets[Math.floor(Math.random() * validTargets.length)];
    const resultState = spyCatch(state, target.id);
    if (resultState !== state) return resultState;
  }

  // 2. Попытка допроса (40% шанс при наличии живых соседей)
  if (validTargets.length > 0 && rand < 0.8) {
    const target =
      validTargets[Math.floor(Math.random() * validTargets.length)];
    const resultState = spyInterrogate(state, target.id);
    if (resultState !== state) return resultState;
  }

  // 3. Сдвиг поля (если атака/допрос не удались или выпало 20%)
  const validShifts = getAllValidShifts(
    state.board,
    state.lastShift,
    state.blockedShift,
  );
  if (validShifts.length > 0) {
    const randomShift =
      validShifts[Math.floor(Math.random() * validShifts.length)];
    const newBoard = shiftBoard(
      state.board,
      randomShift.type,
      randomShift.index,
      randomShift.direction,
    );
    const nextIndex = (state.activeSpyIndex + 1) % state.spies.length;
    return {
      ...state,
      board: newBoard,
      activeSpyIndex: nextIndex,
      lastShift: randomShift,
      lastSpyInterrogation: null,
      log: [
        ...state.log,
        `🤖 ${activeSpy.name} сдвинул ${randomShift.type === "ROW" ? `ряд ${randomShift.index + 1}` : `колонку ${randomShift.index + 1}`}.`,
      ],
    };
  }

  // 4. Гарантированный фолбэк передачи хода (чтобы бот никогда не зависал)
  const nextIndex = (state.activeSpyIndex + 1) % state.spies.length;
  return {
    ...state,
    activeSpyIndex: nextIndex,
    log: [...state.log, `🤖 ${activeSpy.name} пропустил ход.`],
  };
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

  const validShifts = getAllValidShifts(
    state.board,
    state.lastShift,
    state.blockedShift,
  );

  if (validShifts.length > 0) {
    const shift = validShifts[Math.floor(Math.random() * validShifts.length)];
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

  const shouldPatrol = Math.random() < 0.5;
  if (shouldPatrol) {
    const types: ("ROW" | "COL")[] = ["ROW", "COL"];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomIndex = Math.floor(Math.random() * 5);
    return setPolicePatrol(state, randomType, randomIndex);
  }

  const validShifts = getAllValidShifts(
    state.board,
    state.lastShift,
    state.blockedShift,
  );

  if (validShifts.length > 0) {
    const shift = validShifts[Math.floor(Math.random() * validShifts.length)];
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

  return setPolicePatrol(state, "ROW", 0);
}
