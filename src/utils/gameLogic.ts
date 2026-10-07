import type {
  Character,
  GameModeType,
  GameState,
  OpponentType,
  Role,
  LastShift,
  SpyPlayer,
} from "../types/game";
import { ALL_CHARACTERS } from "../constants/characters";

export const CHARACTERS_DATA = ALL_CHARACTERS;

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function isOppositeShift(
  lastShift: LastShift | null,
  type: "ROW" | "COL",
  index: number,
  direction: "FORWARD" | "BACKWARD",
): boolean {
  if (!lastShift) return false;
  return (
    lastShift.type === type &&
    lastShift.index === index &&
    lastShift.direction !== direction
  );
}

export function getCharacterCoords(
  board: Character[][],
  characterId: string,
): { r: number; c: number } | null {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c].id === characterId) return { r, c };
    }
  }
  return null;
}

export function areAdjacent(
  board: Character[][],
  id1: string,
  id2: string,
): boolean {
  const p1 = getCharacterCoords(board, id1);
  const p2 = getCharacterCoords(board, id2);
  if (!p1 || !p2) return false;
  const dr = Math.abs(p1.r - p2.r);
  const dc = Math.abs(p1.c - p2.c);
  return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
}

export function getAdjacentCharacters(
  board: Character[][],
  characterId: string,
): Character[] {
  const pos = getCharacterCoords(board, characterId);
  if (!pos) return [];
  const { r, c } = pos;
  const adjacent: Character[] = [];
  const numRows = board.length;
  const numCols = board[0].length;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols) {
        adjacent.push(board[nr][nc]);
      }
    }
  }
  return adjacent;
}

export function createInitialState(
  mode: GameModeType,
  opponent: OpponentType,
  playerRole: Role = "DETECTIVE",
  playerCount: number = 3,
  targetTrophies: number = 3,
  maxTurns: number = 16,
): GameState {
  let boardSize = 5;

  if (mode === "SECRET_SERVICE") {
    if (playerCount >= 7) boardSize = 7;
    else if (playerCount >= 5) boardSize = 6;
  }

  const totalCells = boardSize * boardSize;
  const shuffledCharacters = shuffle(ALL_CHARACTERS);

  const boardCharacters = shuffledCharacters.slice(0, totalCells).map((c) => ({
    ...c,
    isAlive: true,
    isExonerated: false,
    isRobbed: false,
    isShielded: false,
    hasBomb: false,
    isVault: false,
    isVaultCracked: false,
    isVaultLocked: false,
  }));

  const board: Character[][] = [];
  for (let i = 0; i < boardSize; i++) {
    board.push(boardCharacters.slice(i * boardSize, i * boardSize + boardSize));
  }

  if (mode === "SPANISH_HEIST") {
    board[0][0].isVault = true;
    board[0][boardSize - 1].isVault = true;
    board[boardSize - 1][0].isVault = true;
    board[boardSize - 1][boardSize - 1].isVault = true;
  }

  let deck = shuffledCharacters.slice(totalCells).map((c) => c.id);

  const candidatePool = boardCharacters.filter((c) => !c.isVault);
  const killerIndex = Math.floor(Math.random() * candidatePool.length);
  const chosenKiller = candidatePool[killerIndex];
  let killerSecretId = chosenKiller.id;
  const killerNeighbors = getAdjacentCharacters(board, killerSecretId).map(
    (c) => c.id,
  );
  const validDetectiveCandidates = candidatePool.filter(
    (c) => c.id !== killerSecretId && !killerNeighbors.includes(c.id),
  );

  let detectiveSecretId: string = "";
  let detectiveHand: string[] = [];
  let inspectorChoices: string[] = [];
  let victimList: string[] = [];
  let killerHand: string[] = [];
  let uniformedOfficers: string[] = [];

  let spies: SpyPlayer[] | undefined = undefined;
  let activeSpyIndex: number | undefined = undefined;
  let spyTargetTrophies: number | undefined = undefined;

  if (mode === "SKHVATKA") {
    const safeCandidates = shuffle(validDetectiveCandidates);
    const chosenChoices = safeCandidates.slice(0, 4);
    inspectorChoices = chosenChoices.map((c) => c.id);
    detectiveSecretId = inspectorChoices[0];
    detectiveHand = inspectorChoices.slice(1);
  } else if (mode === "MANIAC_VS_OPERATIVE") {
    const safeCandidates = shuffle(validDetectiveCandidates);
    detectiveSecretId = safeCandidates[0].id;
    detectiveHand = [
      safeCandidates[1].id,
      safeCandidates[2].id,
      safeCandidates[3].id,
    ];
    const potentialVictims = boardCharacters
      .filter((c) => c.id !== killerSecretId && c.id !== detectiveSecretId)
      .map((c) => c.id);
    victimList = shuffle(potentialVictims).slice(0, 4);
  } else if (mode === "THIEF_HUNT") {
    const thiefCandidate =
      candidatePool[Math.floor(Math.random() * candidatePool.length)];
    killerSecretId = thiefCandidate.id;

    const thiefNeighbors = getAdjacentCharacters(board, killerSecretId).map(
      (c) => c.id,
    );
    const validCopCandidates = candidatePool.filter(
      (c) => c.id !== killerSecretId && !thiefNeighbors.includes(c.id),
    );
    const copCandidate =
      validCopCandidates.length > 0
        ? validCopCandidates[
            Math.floor(Math.random() * validCopCandidates.length)
          ]
        : candidatePool.find((c) => c.id !== killerSecretId)!;

    detectiveSecretId = copCandidate.id;

    killerHand = [deck.shift()!, deck.shift()!, deck.shift()!].filter(Boolean);
    uniformedOfficers = [deck.shift()!, deck.shift()!].filter(Boolean);
  } else if (mode === "SECRET_SERVICE") {
    deck = shuffle(boardCharacters.map((c) => c.id));

    if (opponent === "PVP" || opponent === "ONLINE") {
      spies = [
        {
          id: "p1",
          name: "Агент «Восток»",
          secretId: deck.shift()!,
          trophies: 0,
          isAI: false,
        },
        {
          id: "p2",
          name: "Агент «Запад»",
          secretId: deck.shift()!,
          trophies: 0,
          isAI: false,
        },
      ];
      spyTargetTrophies = targetTrophies;
    } else {
      const botNames = [
        "Альфа",
        "Омега",
        "Гамма",
        "Дельта",
        "Эпсилон",
        "Зета",
        "Тета",
        "Сигма",
      ];
      spies = [
        {
          id: "p1",
          name: "Агент «Восток»",
          secretId: deck.shift()!,
          trophies: 0,
          isAI: false,
        },
      ];
      for (let i = 1; i < playerCount; i++) {
        spies.push({
          id: `p${i + 1}`,
          name: `Бот «${botNames[i - 1] ?? i}»`,
          secretId: deck.shift()!,
          trophies: 0,
          isAI: true,
        });
      }
      spyTargetTrophies = targetTrophies;
    }

    activeSpyIndex = 0;
    detectiveSecretId = spies[0].secretId;
    killerSecretId = spies[1].secretId;
  } else {
    const chosenDet =
      validDetectiveCandidates[
        Math.floor(Math.random() * validDetectiveCandidates.length)
      ];
    detectiveSecretId = chosenDet.id;
  }

  return {
    board,
    boardSize,
    evidenceDeck: deck,
    killerSecretId,
    detectiveSecretId,
    detectiveHand,
    inspectorChoices,
    victimList,
    killerHand,
    uniformedOfficers,
    currentTurn: "KILLER",
    killCount: 0,
    trophiesKiller: 0,
    trophiesDetective: 0,
    blockedShift: null,
    lastShift: null,
    winner: null,
    mode,
    opponent,
    playerRole,
    spies,
    activeSpyIndex,
    spyTargetTrophies,
    maxTurns,
    lastSpyInterrogation: null,
    log: [
      `Операция началась (${mode}). Режим: ${mode === "SECRET_SERVICE" ? `Куча-мала (${playerCount} игр., поле ${boardSize}x${boardSize})` : opponent === "AI" ? "Против бота" : "Вдвоем"}.`,
      "Раунд 1: Первый ход.",
    ],
  };
}

export function setInspectorRole(
  state: GameState,
  chosenId: string,
): GameState {
  if (!state.inspectorChoices?.includes(chosenId)) return state;
  const remainingHand = state.inspectorChoices.filter((id) => id !== chosenId);
  return {
    ...state,
    detectiveSecretId: chosenId,
    detectiveHand: remainingHand,
    inspectorChoices: [],
    log: [...state.log, "Инспектор определился с тайным досье прикрытия."],
  };
}

export function shiftBoard(
  board: Character[][],
  type: "ROW" | "COL",
  index: number,
  direction: "FORWARD" | "BACKWARD",
): Character[][] {
  const newBoard = board.map((row) => [...row]);
  const size = newBoard.length;

  if (type === "ROW") {
    const row = [...newBoard[index]];
    if (direction === "FORWARD") {
      const last = row.pop()!;
      row.unshift(last);
    } else {
      const first = row.shift()!;
      row.push(first);
    }
    newBoard[index] = row;
  } else {
    const col: Character[] = [];
    for (let r = 0; r < size; r++) col.push(newBoard[r][index]);
    if (direction === "FORWARD") {
      const last = col.pop()!;
      col.unshift(last);
    } else {
      const first = col.shift()!;
      col.push(first);
    }
    for (let r = 0; r < size; r++) newBoard[r][index] = col[r];
  }

  return newBoard;
}

export function killCharacter(state: GameState, targetId: string): GameState {
  if (state.winner) return state;

  const isAdjacent = areAdjacent(state.board, state.killerSecretId, targetId);
  if (!isAdjacent) return state;

  if (state.mode === "MANIAC_VS_OPERATIVE") {
    const isCurrentVictim =
      state.victimList.length > 0 && targetId === state.victimList[0];
    const isDetective = targetId === state.detectiveSecretId;
    if (!isCurrentVictim && !isDetective) {
      return state;
    }
  }

  const targetChar = state.board.flat().find((c) => c.id === targetId);

  if (targetChar?.isShielded) {
    const newBoard = state.board.map((row) =>
      row.map((c) => (c.id === targetId ? { ...c, isShielded: false } : c)),
    );
    return {
      ...state,
      board: newBoard,
      currentTurn: "DETECTIVE",
      blockedShift: null,
      lastInterrogation: null,
      log: [
        ...state.log,
        `Выстрел отражен! Бронежилет спас жизнь ${targetChar.name}! Защита снята.`,
      ],
    };
  }

  let killedName = "";
  const newBoard = state.board.map((row) =>
    row.map((c) => {
      if (c.id === targetId) {
        killedName = c.name;
        return { ...c, isAlive: false, hasBomb: false };
      }
      return c;
    }),
  );

  let newVictimList = [...state.victimList];
  if (state.mode === "MANIAC_VS_OPERATIVE" && targetId === newVictimList[0]) {
    newVictimList.shift();

    while (newVictimList.length > 0) {
      const nextId = newVictimList[0];
      const nextChar = newBoard.flat().find((c) => c.id === nextId);
      if (nextChar && !nextChar.isAlive) {
        newVictimList.shift();
      } else {
        break;
      }
    }
  }

  let newDetectiveHand = [...state.detectiveHand];
  if (
    state.mode === "MANIAC_VS_OPERATIVE" &&
    newDetectiveHand.includes(targetId)
  ) {
    newDetectiveHand = newDetectiveHand.filter((id) => id !== targetId);
  }

  const newKillCount = state.killCount + 1;
  let winner: Role | null = null;

  if (targetId === state.detectiveSecretId) {
    winner = "KILLER";
  } else if (
    state.mode === "MANIAC_VS_OPERATIVE" &&
    newVictimList.length === 0
  ) {
    winner = "KILLER";
  } else if (state.mode === "EUROPOL_VS_OPG" && newKillCount >= 6) {
    winner = "KILLER";
  } else if (state.mode === "SKHVATKA" && newKillCount >= 14) {
    winner = "KILLER";
  }

  let lastInterrogation = null;
  let interrogationLog = "";

  if (state.mode === "SKHVATKA" && !winner) {
    const isNear = areAdjacent(state.board, state.detectiveSecretId, targetId);
    lastInterrogation = {
      interrogator: "KILLER" as Role,
      targetName: killedName,
      isNear,
    };
    interrogationLog = ` Допрос: Инспектор ${isNear ? "находился" : "НЕ находился"} рядом с убитым.`;
  }

  return {
    ...state,
    board: newBoard,
    victimList: newVictimList,
    detectiveHand: newDetectiveHand,
    killCount: newKillCount,
    winner,
    currentTurn: "DETECTIVE",
    blockedShift: null,
    lastInterrogation,
    log: [
      ...state.log,
      `Ликвидация: персонаж ${killedName} устранен.${
        newDetectiveHand.length < state.detectiveHand.length
          ? " Улика уничтожена!"
          : ""
      }${winner ? " Победа преступного мира!" : ""}${interrogationLog}`,
    ],
  };
}

export function setPolicePatrol(
  state: GameState,
  type: "ROW" | "COL",
  index: number,
): GameState {
  const lineName = type === "ROW" ? `ряд ${index + 1}` : `колонку ${index + 1}`;
  return {
    ...state,
    blockedShift: { type, index },
    currentTurn: "KILLER",
    log: [
      ...state.log,
      `Полиция выставила патруль и заблокировала ${lineName}.`,
    ],
  };
}

export function crackVault(state: GameState, targetId: string): GameState {
  if (state.winner || state.mode !== "SPANISH_HEIST") return state;
  if (!areAdjacent(state.board, state.killerSecretId, targetId)) return state;

  const target = state.board.flat().find((c) => c.id === targetId);
  if (
    !target ||
    !target.isVault ||
    target.isVaultCracked ||
    target.isVaultLocked
  )
    return state;

  const crackedCount = (state.trophiesKiller ?? 0) + 1;
  const isWin = crackedCount >= 3;

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isVaultCracked: true } : c)),
  );

  return {
    ...state,
    board: newBoard,
    trophiesKiller: crackedCount,
    winner: isWin ? "KILLER" : null,
    currentTurn: "DETECTIVE",
    blockedShift: null,
    log: [
      ...state.log,
      `Сейф ${target.name} взломан! Прогресс ограбления: ${crackedCount}/3.${
        isWin ? " Хранилище казино полностью обчищено! Победа банды!" : ""
      }`,
    ],
  };
}

export function lockVault(state: GameState, targetId: string): GameState {
  if (state.winner || state.mode !== "SPANISH_HEIST") return state;
  if (!areAdjacent(state.board, state.detectiveSecretId, targetId))
    return state;

  const target = state.board.flat().find((c) => c.id === targetId);
  if (
    !target ||
    !target.isVault ||
    target.isVaultCracked ||
    target.isVaultLocked
  )
    return state;

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isVaultLocked: true } : c)),
  );

  return {
    ...state,
    board: newBoard,
    currentTurn: "KILLER",
    blockedShift: null,
    log: [
      ...state.log,
      `Охрана включила протокол тревоги на сейфе ${target.name}!`,
    ],
  };
}

export function plantBomb(state: GameState, targetId: string): GameState {
  if (state.winner || state.mode !== "EUROPOL_VS_OPG") return state;
  if (!areAdjacent(state.board, state.killerSecretId, targetId)) return state;

  const targetChar = state.board.flat().find((c) => c.id === targetId);
  if (!targetChar || targetChar.hasBomb) return state;

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, hasBomb: true } : c)),
  );

  return {
    ...state,
    board: newBoard,
    currentTurn: "DETECTIVE",
    blockedShift: null,
    log: [
      ...state.log,
      `ОПГ заложила скрытый заряд взрывчатки в квартале ${targetChar.name}!`,
    ],
  };
}

export function applyShield(state: GameState, targetId: string): GameState {
  if (state.winner || state.mode !== "EUROPOL_VS_OPG") return state;
  if (
    !areAdjacent(state.board, state.detectiveSecretId, targetId) &&
    targetId !== state.detectiveSecretId
  ) {
    return state;
  }

  const targetChar = state.board.flat().find((c) => c.id === targetId);
  if (!targetChar || targetChar.isShielded) return state;

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isShielded: true } : c)),
  );

  return {
    ...state,
    board: newBoard,
    currentTurn: "KILLER",
    blockedShift: null,
    log: [
      ...state.log,
      `Европол экипировал защитным протоколом: ${targetChar.name}.`,
    ],
  };
}

export function sniperShot(state: GameState, targetId: string): GameState {
  if (state.winner || state.mode !== "EUROPOL_VS_OPG") return state;

  const pDet = getCharacterCoords(state.board, state.detectiveSecretId);
  const pTarget = getCharacterCoords(state.board, targetId);
  if (!pDet || !pTarget) return state;

  const dr = Math.abs(pDet.r - pTarget.r);
  const dc = Math.abs(pDet.c - pTarget.c);
  const isValidSniperRange = (dr === 2 && dc === 0) || (dr === 0 && dc === 2);

  if (!isValidSniperRange) return state;

  const targetChar = state.board.flat().find((c) => c.id === targetId);
  if (!targetChar || !targetChar.isAlive) return state;

  if (targetId === state.killerSecretId) {
    return {
      ...state,
      winner: "DETECTIVE",
      log: [
        ...state.log,
        `Снайперский выстрел точно в цель! Глава ОПГ (${targetChar.name}) ликвидирован! Победа Европола!`,
      ],
    };
  }

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isAlive: false } : c)),
  );

  return {
    ...state,
    board: newBoard,
    currentTurn: "KILLER",
    blockedShift: null,
    log: [
      ...state.log,
      `Снайпер Европола устранил ложную цель: ${targetChar.name}.`,
    ],
  };
}

export function robNeighbor(state: GameState, targetId: string): GameState {
  if (state.winner || state.mode !== "THIEF_HUNT") return state;

  const isAdjacent = areAdjacent(state.board, state.killerSecretId, targetId);
  const isSelf = state.killerSecretId === targetId;
  if (!isAdjacent && !isSelf) return state;

  const targetChar = state.board.flat().find((c) => c.id === targetId);
  if (!targetChar || targetChar.isRobbed) return state;

  const newTrophies = (state.trophiesKiller ?? 0) + 1;
  const isWin = newTrophies >= 5;

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isRobbed: true } : c)),
  );

  return {
    ...state,
    board: newBoard,
    trophiesKiller: newTrophies,
    winner: isWin ? "KILLER" : null,
    currentTurn: "DETECTIVE",
    blockedShift: null,
    log: [
      ...state.log,
      `Вор похитил сокровище у ${targetChar.name}! Добыча: ${newTrophies}/5.${
        isWin ? " Вор украл всё и победил!" : ""
      }`,
    ],
  };
}

export function accuseCharacter(state: GameState, targetId: string): GameState {
  if (state.winner) return state;

  let isAdjacent = areAdjacent(state.board, state.detectiveSecretId, targetId);
  let isSelf = targetId === state.detectiveSecretId;

  if (state.mode === "THIEF_HUNT" && state.uniformedOfficers) {
    const isNearOfficer = state.uniformedOfficers.some((offId) =>
      areAdjacent(state.board, offId, targetId),
    );
    const isOfficerSelf = state.uniformedOfficers.includes(targetId);
    isAdjacent = isAdjacent || isNearOfficer;
    isSelf = isSelf || isOfficerSelf;
  }

  if (!isAdjacent && !isSelf) return state;

  const targetChar = state.board.flat().find((c) => c.id === targetId);
  const targetName = targetChar?.name ?? targetId;

  if (targetChar?.hasBomb) {
    const isDetKilled = targetId === state.detectiveSecretId;
    const newBoard = state.board.map((row) =>
      row.map((c) =>
        c.id === targetId ? { ...c, isAlive: false, hasBomb: false } : c,
      ),
    );

    return {
      ...state,
      board: newBoard,
      currentTurn: "KILLER",
      winner: isDetKilled ? "KILLER" : null,
      blockedShift: null,
      lastInterrogation: null,
      log: [
        ...state.log,
        `💥 ЛОВУШКА! При проверке сдетонировала скрытая бомба ОПГ! ${targetName} ликвидирован!${
          isDetKilled ? " Командир Европола погиб при взрыве!" : ""
        }`,
      ],
    };
  }

  if (targetId === state.killerSecretId) {
    return {
      ...state,
      winner: "DETECTIVE",
      blockedShift: null,
      lastInterrogation: null,
      log: [
        ...state.log,
        `Точное задержание! ${targetName} оказался преступником. Победа Закона!`,
      ],
    };
  }

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isExonerated: true } : c)),
  );

  return {
    ...state,
    board: newBoard,
    currentTurn: "KILLER",
    blockedShift: null,
    lastInterrogation: null,
    log: [
      ...state.log,
      `Ложная проверка: ${targetName} не преступник, подозрения сняты.`,
    ],
  };
}

export function exonerateFromHand(state: GameState, id: string): GameState {
  if (!state.detectiveHand.includes(id)) return state;

  let name = "";
  const newBoard = state.board.map((row) =>
    row.map((c) => {
      if (c.id === id) {
        name = c.name;
        return { ...c, isExonerated: true };
      }
      return c;
    }),
  );

  const nextHand = state.detectiveHand.filter((cardId) => cardId !== id);
  const nextDeck = [...state.evidenceDeck];
  if (nextDeck.length > 0) nextHand.push(nextDeck.shift()!);

  const isNear = areAdjacent(state.board, state.killerSecretId, id);

  return {
    ...state,
    board: newBoard,
    detectiveHand: nextHand,
    evidenceDeck: nextDeck,
    currentTurn: "KILLER",
    blockedShift: null,
    lastInterrogation: {
      interrogator: "DETECTIVE",
      targetName: name,
      isNear,
    },
    log: [
      ...state.log,
      `Из досье сыщика подтверждено алиби для: ${name}.`,
      `Допрос: Преступник ${isNear ? "находится" : "НЕ находится"} рядом с ${name}.`,
    ],
  };
}

export function disguiseKiller(state: GameState): GameState {
  if (
    state.winner ||
    state.mode === "MANIAC_VS_OPERATIVE" ||
    state.evidenceDeck.length === 0
  ) {
    return state;
  }

  const nextDeck = [...state.evidenceDeck];
  const drawnId = nextDeck.shift();

  if (!drawnId) return state;

  const drawnChar = state.board.flat().find((c) => c.id === drawnId);
  const isAlive = drawnChar?.isAlive ?? false;

  if (isAlive) {
    nextDeck.push(state.killerSecretId);
    return {
      ...state,
      killerSecretId: drawnId,
      evidenceDeck: nextDeck,
      currentTurn: "DETECTIVE",
      blockedShift: null,
      lastInterrogation: null,
      log: [...state.log, "Преступник успешно сменил облик и ушел в тень."],
    };
  } else {
    return {
      ...state,
      evidenceDeck: nextDeck,
      currentTurn: "DETECTIVE",
      blockedShift: null,
      lastInterrogation: null,
      log: [
        ...state.log,
        "Провал маскировки: вытянута карта убитого. Преступник остался в прежнем облике.",
      ],
    };
  }
}

export function canCleanupBoard(board: Character[][] | Character[]): boolean {
  if (!board || board.length === 0) return false;

  const flat: Character[] = Array.isArray(board[0])
    ? (board as Character[][]).flat()
    : (board as Character[]);

  let foundDead = false;
  for (const char of flat) {
    if (!char.isAlive) {
      foundDead = true;
    } else if (foundDead) {
      return true;
    }
  }

  return false;
}

export function cleanupDeadCharacters(state: GameState): GameState {
  if (state.winner || !canCleanupBoard(state.board)) return state;

  const numRows = state.board.length;
  const numCols = state.board[0].length;
  const totalCells = numRows * numCols;
  const flatBoard = state.board.flat();

  const living = flatBoard.filter((c) => c.isAlive);
  const dead = flatBoard.filter((c) => !c.isAlive);

  if (dead.length === 0) return state;

  const currentBoardIds = new Set(flatBoard.map((c) => c.id));
  const nextDeck = [...state.evidenceDeck];
  const newCharacters: Character[] = [];

  let drawnCount = 0;
  while (
    living.length + newCharacters.length < totalCells &&
    nextDeck.length > 0
  ) {
    const candidateId = nextDeck.shift()!;
    if (state.mode === "SECRET_SERVICE" || currentBoardIds.has(candidateId)) {
      continue;
    }

    const baseChar = CHARACTERS_DATA.find((c) => c.id === candidateId);
    newCharacters.push({
      id: candidateId,
      name: baseChar?.name ?? candidateId,
      isAlive: true,
      isExonerated: false,
      isRobbed: false,
      isShielded: false,
      hasBomb: false,
      isVault: false,
      isVaultCracked: false,
      isVaultLocked: false,
    });
    currentBoardIds.add(candidateId);
    drawnCount++;
  }

  const remainingDead = dead.slice(drawnCount);
  const reordered = [...living, ...newCharacters, ...remainingDead];

  const updatedBoard: Character[][] = [];
  for (let r = 0; r < numRows; r++) {
    updatedBoard.push(reordered.slice(r * numCols, r * numCols + numCols));
  }

  const nextTurn: Role =
    state.currentTurn === "KILLER" ? "DETECTIVE" : "KILLER";

  let nextSpyIndex = state.activeSpyIndex;
  if (state.mode === "SECRET_SERVICE" && state.spies) {
    nextSpyIndex = (state.activeSpyIndex! + 1) % state.spies.length;
  }

  return {
    ...state,
    board: updatedBoard,
    evidenceDeck: nextDeck,
    currentTurn: nextTurn,
    activeSpyIndex: nextSpyIndex,
    blockedShift: null,
    lastShift: null,
    lastInterrogation: null,
    lastSpyInterrogation: null,
    log: [
      ...state.log,
      `Обновление поля: убрано тел — ${dead.length}.${
        drawnCount > 0
          ? ` Прибыло новых подозреваемых из резерва: ${drawnCount}.`
          : " Поле уплотнено."
      }`,
    ],
  };
}

export function spyCatch(state: GameState, targetId: string): GameState {
  if (
    state.winner ||
    state.mode !== "SECRET_SERVICE" ||
    !state.spies ||
    state.activeSpyIndex === undefined
  )
    return state;

  const activeSpy = state.spies[state.activeSpyIndex];
  const isAdjacent = areAdjacent(state.board, activeSpy.secretId, targetId);
  const isSelf = activeSpy.secretId === targetId;

  if (!isAdjacent && !isSelf) return state;

  const targetChar = state.board.flat().find((c) => c.id === targetId);
  const targetName = targetChar?.name ?? targetId;

  const caughtSpyIndex = state.spies.findIndex(
    (s) => s.id !== activeSpy.id && s.secretId === targetId,
  );

  let newBoard = state.board;
  let newSpies = [...state.spies];
  let newDeck = [...state.evidenceDeck];
  let logMsg = "";
  let winner: Role | null = null;
  let justCaughtSpyId: string | undefined = undefined;

  if (caughtSpyIndex !== -1) {
    const caughtSpy = newSpies[caughtSpyIndex];

    newBoard = state.board.map((row) =>
      row.map((c) => (c.id === targetId ? { ...c, isAlive: false } : c)),
    );

    const newTrophies = activeSpy.trophies + 1;
    newSpies[state.activeSpyIndex] = {
      ...activeSpy,
      trophies: newTrophies,
    };

    const availableLivingIds = newBoard
      .flat()
      .filter(
        (c) =>
          c.isAlive &&
          c.id !== targetId &&
          !newSpies.some((s) => s.secretId === c.id),
      )
      .map((c) => c.id);

    newDeck = newDeck.filter((id) => availableLivingIds.includes(id));
    if (newDeck.length === 0) {
      newDeck = shuffle([...availableLivingIds]);
    }

    const nextSecretId = newDeck.shift() ?? availableLivingIds[0];
    newSpies[caughtSpyIndex] = { ...caughtSpy, secretId: nextSecretId };
    justCaughtSpyId = caughtSpy.id;

    logMsg = `🎯 Поимка! ${activeSpy.name} разоблачил резидента соперника (${targetName})! Трофей получен (${newTrophies}/${state.spyTargetTrophies ?? 4}).`;

    if (newTrophies >= (state.spyTargetTrophies ?? 4)) {
      winner = activeSpy.isAI ? "KILLER" : "DETECTIVE";
      logMsg += ` 🏆 ${activeSpy.name} собрал все трофеи и победил!`;
    } else {
      justCaughtSpyId = caughtSpy.id;
      logMsg += ` Пойманный сменил прикрытие.`;
    }
  } else {
    logMsg = `🔍 Промах: ${activeSpy.name} объявил подозрение на ${targetName}. Никто из агентов не признал эту личность.`;
  }

  const nextIndex = (state.activeSpyIndex + 1) % state.spies.length;

  return {
    ...state,
    board: newBoard,
    spies: newSpies,
    evidenceDeck: newDeck,
    winner,
    activeSpyIndex: nextIndex,
    detectiveSecretId: newSpies[nextIndex].secretId,
    blockedShift: null,
    lastSpyInterrogation: null,
    justCaughtSpyId,
    log: [...state.log, logMsg],
  };
}

export function spyInterrogate(state: GameState, targetId: string): GameState {
  if (
    state.winner ||
    state.mode !== "SECRET_SERVICE" ||
    !state.spies ||
    state.activeSpyIndex === undefined
  )
    return state;

  const activeSpy = state.spies[state.activeSpyIndex];
  const isAdjacent = areAdjacent(state.board, activeSpy.secretId, targetId);
  const isSelf = activeSpy.secretId === targetId;

  if (!isAdjacent && !isSelf) return state;

  const targetChar = state.board.flat().find((c) => c.id === targetId);
  const targetName = targetChar?.name ?? targetId;

  const raisedHands: string[] = [];
  for (const spy of state.spies) {
    const isNear = areAdjacent(state.board, spy.secretId, targetId);
    const isTarget = spy.secretId === targetId;
    if (isNear || isTarget) {
      raisedHands.push(spy.name);
    }
  }

  const nextIndex = (state.activeSpyIndex + 1) % state.spies.length;

  const logDetail =
    raisedHands.length > 0
      ? `Контакт подтвердили: ${raisedHands.join(", ")}.`
      : "Ни один агент не находится рядом.";

  return {
    ...state,
    activeSpyIndex: nextIndex,
    blockedShift: null,
    interrogationRadar: {
      targetId,
      interrogatorIndex: state.activeSpyIndex,
    },
    lastSpyInterrogation: {
      interrogatorName: activeSpy.name,
      targetName,
      raisedHandsPlayerNames: raisedHands,
    },
    log: [
      ...state.log,
      `📡 Допрос: ${activeSpy.name} опросил окружение ${targetName}. ${logDetail}`,
    ],
  };
}

export function escapeManiac(state: GameState): GameState {
  if (
    state.winner ||
    state.mode !== "MANIAC_VS_OPERATIVE" ||
    state.evidenceDeck.length < 2
  ) {
    return state;
  }

  const nextDeck = [...state.evidenceDeck];
  const drawnId = nextDeck.shift();

  if (!drawnId) return state;

  const drawnChar = state.board.flat().find((c) => c.id === drawnId);
  const isAlive = drawnChar?.isAlive ?? false;

  if (isAlive) {
    nextDeck.push(state.killerSecretId);
    const newVictimId = nextDeck.shift();

    if (!newVictimId) return state;

    return {
      ...state,
      killerSecretId: drawnId,
      evidenceDeck: nextDeck,
      victimList: [...state.victimList, newVictimId],
      currentTurn: "DETECTIVE",
      blockedShift: null,
      lastInterrogation: null,
      log: [
        ...state.log,
        "Маньяк успешно сбежал, сменил личность и добавил новую цель в список смертников!",
      ],
    };
  } else {
    return {
      ...state,
      evidenceDeck: nextDeck,
      currentTurn: "DETECTIVE",
      blockedShift: null,
      lastInterrogation: null,
      log: [
        ...state.log,
        "Провал побега: вытянута карта убитого. Маньяк остался в прежнем облике.",
      ],
    };
  }
}

export function fastDisguise(state: GameState, handCardId: string): GameState {
  if (state.winner || state.mode !== "THIEF_HUNT") return state;
  if (!state.killerHand?.includes(handCardId)) return state;

  const newHand = state.killerHand.filter((id) => id !== handCardId);
  newHand.push(state.killerSecretId);

  return {
    ...state,
    killerSecretId: handCardId,
    killerHand: newHand,
    currentTurn: "DETECTIVE",
    blockedShift: null,
    log: [...state.log, "Вор-виртуоз применил быструю маскировку."],
  };
}

export function swearInOfficer(
  state: GameState,
  oldOfficerId: string,
): GameState {
  if (state.winner || state.mode !== "THIEF_HUNT") return state;
  if (!state.uniformedOfficers?.includes(oldOfficerId)) return state;
  if (state.evidenceDeck.length === 0) return state;

  const nextDeck = [...state.evidenceDeck];
  const newOfficerId = nextDeck.shift()!;

  const newOfficers = state.uniformedOfficers.map((id) =>
    id === oldOfficerId ? newOfficerId : id,
  );

  const unrobbed = state.board.flat().filter((c) => !c.isRobbed);
  let newBoard = state.board;
  let newTrophies = state.trophiesKiller ?? 0;
  let isWin = false;

  if (unrobbed.length > 0) {
    const randomTarget = unrobbed[Math.floor(Math.random() * unrobbed.length)];
    newBoard = state.board.map((row) =>
      row.map((c) => (c.id === randomTarget.id ? { ...c, isRobbed: true } : c)),
    );
    newTrophies += 1;
    isWin = newTrophies >= 5;
  }

  return {
    ...state,
    board: newBoard,
    uniformedOfficers: newOfficers,
    evidenceDeck: nextDeck,
    trophiesKiller: newTrophies,
    winner: isWin ? "KILLER" : null,
    currentTurn: "KILLER",
    blockedShift: null,
    log: [
      ...state.log,
      `Полиция призвала к присяге нового офицера. Пользуясь суматохой, Вор украл сокровище! Добыча: ${newTrophies}/5.`,
    ],
  };
}
