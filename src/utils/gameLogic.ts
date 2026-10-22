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
import { DUEL_CHARACTERS } from "../constants/duelCharacters";

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
  playerName?: string,
): GameState {
  let boardSize = 5;

  const totalCells = boardSize * boardSize;
  const sourcePool = mode === "LINE_UP" ? DUEL_CHARACTERS : ALL_CHARACTERS;
  const shuffledCharacters = shuffle(sourcePool);

  const boardCharacters = shuffledCharacters.slice(0, totalCells).map((c) => ({
    ...c,
    isAlive: true,
    isExonerated: false,
    isRobbed: false,
  }));

  const board: Character[][] = [];
  for (let i = 0; i < boardSize; i++) {
    board.push(boardCharacters.slice(i * boardSize, i * boardSize + boardSize));
  }

  // Изначально колода формируется СТРОГО из персонажей, присутствующих на поле
  let deck = shuffle(boardCharacters.map((c) => c.id));

  const candidatePool = boardCharacters;
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

    const boardIds = boardCharacters.map((c) => c.id);
    const excludedIds = new Set([killerSecretId, ...inspectorChoices]);
    deck = shuffle(boardIds.filter((id) => !excludedIds.has(id)));
  } else if (mode === "MANIAC_VS_OPERATIVE") {
    const safeCandidates = shuffle(validDetectiveCandidates);
    detectiveSecretId = safeCandidates[0].id;
    detectiveHand = [
      safeCandidates[1].id,
      safeCandidates[2].id,
      safeCandidates[3].id,
    ];
    inspectorChoices = []; // Строгая гарантия очистки для режима Маньяка
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

    // Очищаем колоду от секретных личностей перед выдачей масок и патрульных
    const excluded = new Set([killerSecretId, detectiveSecretId]);
    deck = shuffle(boardCharacters.map(c => c.id).filter(id => !excluded.has(id)));

    killerHand = [deck.shift()!, deck.shift()!, deck.shift()!].filter(Boolean);
    uniformedOfficers = [deck.shift()!, deck.shift()!].filter(Boolean);
  } else if (mode === "SECRET_SERVICE") {
    deck = shuffle(boardCharacters.map((c) => c.id));

    if (opponent === "PVP") {
      spies = [
        {
          id: "p1",
          name: "Фантом",
          secretId: deck.shift()!,
          trophies: 0,
          isAI: false,
        },
        {
          id: "p2",
          name: "Призрак",
          secretId: deck.shift()!,
          trophies: 0,
          isAI: false,
        },
      ];
      spyTargetTrophies = targetTrophies;
    } else if (opponent === "ONLINE") {
      spies = [
        {
          id: "p1",
          name: playerName ? `${playerName} (Агент 1)` : "Агент 1",
          secretId: deck.shift()!,
          trophies: 0,
          isAI: false,
        },
        {
          id: "p2",
          name: "Агент 2",
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
          name: playerName || "Агент",
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
  } else if (mode === "LINE_UP") {
    killerSecretId = shuffledCharacters[0].id;
    detectiveSecretId = shuffledCharacters[1].id;
  } else {
    const chosenDet =
      validDetectiveCandidates[
        Math.floor(Math.random() * validDetectiveCandidates.length)
      ];
    detectiveSecretId = chosenDet.id;
  }

  // Финальная фильтрация колоды: убираем все назначенные роли и карты на руках
  const finalExcluded = new Set([
    killerSecretId,
    detectiveSecretId,
    ...detectiveHand,
    ...inspectorChoices,
    ...victimList,
    ...killerHand,
    ...uniformedOfficers,
    ...(spies?.map(s => s.secretId) || [])
  ]);
  deck = deck.filter(id => !finalExcluded.has(id));

  let modeTitle = mode as string;
  if (mode === "SKHVATKA") modeTitle = "Схватка (Городская дуэль)";
  else if (mode === "MANIAC_VS_OPERATIVE") modeTitle = "Маньяк против оперативника (Спецоперация)";
  else if (mode === "THIEF_HUNT") modeTitle = "Охота на грабителя (План-перехват)";
  else if (mode === "SECRET_SERVICE") modeTitle = "Секретная служба";

  let formatDesc = "";
  if (mode === "SECRET_SERVICE") {
    if (opponent === "PVP") formatDesc = "Дуэль разведок (Локально: Фантом против Призрака, поле 5x5)";
    else if (opponent === "ONLINE") formatDesc = "Сетевая дуэль разведок (2 агента, поле 5x5)";
    else formatDesc = `Война разведок (${playerCount} агента, поле 5x5)`;
  } else {
    formatDesc = opponent === "AI" ? "Против бота" : opponent === "ONLINE" ? "Сетевая игра" : "Вдвоем";
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
    currentTurn: mode === "LINE_UP" ? "DETECTIVE" : "KILLER",
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
    lastInterrogation: null,
    lastSpyInterrogation: null,
    duelHistory: mode === "LINE_UP" ? [] : undefined,
    duelPenalties: mode === "LINE_UP" ? { DETECTIVE: 0, KILLER: 0 } : undefined,
    accusedTargets: mode === "LINE_UP" ? { DETECTIVE: [], KILLER: [] } : undefined,
    log: mode === "LINE_UP"
      ? ["Операция началась: Очная ставка (Line-Up). Сформировано досье подозреваемых."]
      : [
          `Операция началась: ${modeTitle}. Режим: ${formatDesc}.`,
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
    log: [...state.log, "Инспектор выбрал тайную личность. Карты сформировали досье алиби."],
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

  const isFirstTurnKiller = state.mode === "SKHVATKA" && state.killCount === 0 && state.currentTurn === "KILLER";
  const isAdjacent = areAdjacent(state.board, state.killerSecretId, targetId);
  if (!isAdjacent && !isFirstTurnKiller) return state;

  if (state.mode === "MANIAC_VS_OPERATIVE") {
    const isCurrentVictim =
      state.victimList.length > 0 && targetId === state.victimList[0];
    const isDetective = targetId === state.detectiveSecretId;
    if (!isCurrentVictim && !isDetective) {
      return state;
    }
  }

  const targetChar = state.board.flat().find((c) => c.id === targetId);

  let killedName = "";
  const newBoard = state.board.map((row) =>
    row.map((c) => {
      if (c.id === targetId) {
        killedName = c.name;
        return { ...c, isAlive: false };
      }
      return c;
    }),
  );

  let newVictimList = [...state.victimList];
  let newEvidenceDeck = [...state.evidenceDeck];
  let newInspectorChoices = state.inspectorChoices ? [...state.inspectorChoices] : [];
  const newKillCount = state.killCount + 1;

  if (newInspectorChoices.includes(targetId)) {
    newInspectorChoices = newInspectorChoices.filter((id) => id !== targetId);
    while (newInspectorChoices.length < 4 && newEvidenceDeck.length > 0) {
      const drawnId = newEvidenceDeck.shift()!;
      const drawnChar = newBoard.flat().find((c) => c.id === drawnId);
      if (
        drawnChar &&
        drawnChar.isAlive &&
        drawnId !== state.killerSecretId &&
        !newInspectorChoices.includes(drawnId)
      ) {
        newInspectorChoices.push(drawnId);
        break;
      }
    }
  }

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

    while (newVictimList.length < 4 && newEvidenceDeck.length > 0) {
      const drawnId = newEvidenceDeck.shift()!;
      const drawnChar = newBoard.flat().find((c) => c.id === drawnId);
      if (
        drawnChar &&
        drawnChar.isAlive &&
        drawnId !== state.detectiveSecretId &&
        drawnId !== state.killerSecretId &&
        !newVictimList.includes(drawnId)
      ) {
        newVictimList.push(drawnId);
      }
    }
  }

  let newDetectiveHand = [...state.detectiveHand];
  let newDetectiveSecretId = state.detectiveSecretId;
  let winner: Role | null = null;

  if (state.mode === "MANIAC_VS_OPERATIVE") {
    if (newDetectiveHand.includes(targetId)) {
      newDetectiveHand = newDetectiveHand.filter((id) => id !== targetId);
    }
    if (targetId === state.detectiveSecretId) {
      if (newDetectiveHand.length > 0) {
        newDetectiveSecretId = newDetectiveHand.shift()!;
      } else {
        winner = "KILLER";
      }
    }
  } else {
    if (targetId === state.detectiveSecretId) {
      winner = "KILLER";
    }
  }

  if (!winner) {
    if (state.mode === "MANIAC_VS_OPERATIVE") {
      if (newKillCount >= 4) {
        winner = "KILLER";
      } else if (newVictimList.length === 0) {
        winner = "DETECTIVE";
      }
    } else if (state.mode === "EUROPOL_VS_OPG" && newKillCount >= 6) {
      winner = "KILLER";
    } else if (state.mode === "SKHVATKA" && newKillCount >= 14) {
      winner = "KILLER";
    }
  }

  let lastInterrogation = null;
  let interrogationLog = "";

  if (state.mode === "SKHVATKA" && !winner) {
    const isNear = areAdjacent(state.board, newDetectiveSecretId, targetId);
    lastInterrogation = {
      interrogator: "KILLER" as Role,
      targetName: killedName,
      isNear,
    };
    interrogationLog = ` Опрос свидетелей: Инспектор ${isNear ? "находился" : "НЕ находился"} рядом с убитым.`;
  }

  return {
    ...state,
    board: newBoard,
    victimList: newVictimList,
    evidenceDeck: newEvidenceDeck,
    detectiveHand: newDetectiveHand,
    inspectorChoices: newInspectorChoices,
    detectiveSecretId: newDetectiveSecretId,
    killCount: newKillCount,
    winner,
    currentTurn: "DETECTIVE",
    blockedShift: null,
    lastInterrogation,
    interrogationRadar: null,
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
      `Грабитель похитил сокровище у ${targetChar.name}! Добыча: ${newTrophies}/5.${
        isWin ? " Грабитель украл всё и победил!" : ""
      }`,
    ],
  };
}

export function accuseCharacter(state: GameState, targetId: string): GameState {
  if (state.winner) return state;
  if (state.mode === "THIEF_HUNT" && state.uniformedOfficers?.includes(targetId)) {
    return state;
  }

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
  if (!targetChar || !targetChar.isAlive || targetChar.isExonerated) return state;

  const targetName = targetChar.name;

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

  let newBoard = state.board;
  let nextVictims = [...state.victimList];
  let nextDeck = [...state.evidenceDeck];
  let logMsg = `Ложная проверка: ${targetName} не преступник, подозрения сняты.`;
  let nextWinner: Role | null = null;

  if (state.mode === "THIEF_HUNT") {
    logMsg = `Ложная проверка: ${targetName} не грабитель.`;
  } else {
    newBoard = state.board.map((row) =>
      row.map((c) => (c.id === targetId ? { ...c, isExonerated: true } : c)),
    );
  }

  if (state.mode === "MANIAC_VS_OPERATIVE" && nextVictims.length > 0) {
    const returnedVictim = nextVictims.pop()!;
    nextDeck.push(returnedVictim);
    logMsg = `Ошибка следствия: одна из целей маньяка скрылась в колоде.`;

    while (nextVictims.length < 4 && nextDeck.length > 0) {
      const drawnId = nextDeck.shift()!;
      const drawnChar = newBoard.flat().find((c) => c.id === drawnId);
      if (
        drawnChar &&
        drawnChar.isAlive &&
        drawnId !== state.detectiveSecretId &&
        drawnId !== state.killerSecretId &&
        !nextVictims.includes(drawnId)
      ) {
        nextVictims.push(drawnId);
      }
    }

    if (nextVictims.length === 0 && state.killCount < 4) {
      nextWinner = "DETECTIVE";
      logMsg += " У маньяка не осталось целей. Победа Оперативника!";
    }
  }

  return {
    ...state,
    board: newBoard,
    victimList: nextVictims,
    evidenceDeck: nextDeck,
    winner: nextWinner,
    currentTurn: "KILLER",
    blockedShift: null,
    lastInterrogation: null,
    interrogationRadar: null,
    log: [...state.log, logMsg],
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
    interrogationRadar: {
      targetId: id,
      interrogatorIndex: 0,
    },
    lastInterrogation: {
      interrogator: "DETECTIVE",
      targetName: name,
      isNear,
    },
    log: [
      ...state.log,
      `Проверка алиби: с подозреваемого ${name} сняты обвинения.`,
      `Опрос свидетелей: Бандит ${isNear ? "находится" : "НЕ находится"} рядом.`,
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
  const isAvailable =
    drawnChar &&
    drawnChar.isAlive &&
    !drawnChar.isExonerated &&
    drawnId !== state.detectiveSecretId;

  if (isAvailable) {
    nextDeck.push(state.killerSecretId);
    return {
      ...state,
      killerSecretId: drawnId,
      evidenceDeck: nextDeck,
      currentTurn: "DETECTIVE",
      blockedShift: null,
      lastInterrogation: null,
      disguisedNotification: { roleName: "Бандит", newSecretId: drawnId },
      log: [...state.log, "Преступник успешно сменил облик и ушел в тень."],
    };
  }

  nextDeck.push(drawnId);
  return {
    ...state,
    evidenceDeck: nextDeck,
    currentTurn: "DETECTIVE",
    blockedShift: null,
    lastInterrogation: null,
    log: [
      ...state.log,
      "Провал конспирации: персонаж выбыл или недоступен для маскировки.",
    ],
  };
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
  const flatBoard = state.board.flat();

  const living = flatBoard.filter((c) => c.isAlive);
  const dead = flatBoard.filter((c) => !c.isAlive);

  if (dead.length === 0) return state;

  const reordered = [...living, ...dead];

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
    currentTurn: nextTurn,
    activeSpyIndex: nextSpyIndex,
    blockedShift: null,
    lastShift: null,
    lastInterrogation: null,
    lastSpyInterrogation: null,
    log: [
      ...state.log,
      `Зачистка поля: ликвидированные (${dead.length}) перемещены в конец сетки.`,
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
  let secretId = activeSpy.secretId;
  const isOnBoard = state.board.flat().some((c) => c.id === secretId && c.isAlive);
  if (!isOnBoard) {
    const firstAlive = state.board.flat().find((c) => c.isAlive);
    if (firstAlive) secretId = firstAlive.id;
  }

  const isAdjacent = areAdjacent(state.board, secretId, targetId);
  const isSelf = secretId === targetId;
  const nextIndex = (state.activeSpyIndex + 1) % state.spies.length;

  if (!isAdjacent && !isSelf) {
    return state;
  }

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
      row.map((c) =>
        c.id === targetId
          ? { ...c, isAlive: false, unmaskedSpyIndex: caughtSpyIndex }
          : c,
      ),
    );

    const targetTrophies = state.spyTargetTrophies ?? 4;
    const newTrophies = Math.min(targetTrophies, activeSpy.trophies + 1);

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

    logMsg = `🎯 Разоблачение! ${activeSpy.name} разоблачил резидента соперника (${targetName})! Трофей получен (${newTrophies}/${targetTrophies}).`;

    if (newTrophies >= targetTrophies) {
      winner = state.activeSpyIndex === 0 ? "KILLER" : "DETECTIVE";
      logMsg += ` 🏆 ${activeSpy.name} собрал все трофеи и победил!`;
    } else {
      justCaughtSpyId = caughtSpy.id;
      logMsg += ` Разоблаченный агент принял новую тайную личность из резерва.`;
    }
  } else {
    logMsg = `🔍 Промах: ${activeSpy.name} объявил подозрение на ${targetName}. Никто из агентов не признал эту личность.`;
  }

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
  let secretId = activeSpy.secretId;
  const isOnBoard = state.board.flat().some((c) => c.id === secretId && c.isAlive);
  if (!isOnBoard) {
    const firstAlive = state.board.flat().find((c) => c.isAlive);
    if (firstAlive) secretId = firstAlive.id;
  }

  const isAdjacent = areAdjacent(state.board, secretId, targetId);
  const isSelf = secretId === targetId;
  const nextIndex = (state.activeSpyIndex + 1) % state.spies.length;

  if (!isAdjacent && !isSelf) {
    return state;
  }

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
      `📡 Опрос свидетелей: ${activeSpy.name} опросил окружение ${targetName}. ${logDetail}`,
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
  const isAvailable = Boolean(drawnChar && drawnChar.isAlive && !drawnChar.isExonerated);

  if (isAvailable) {
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
      interrogationRadar: null,
      disguisedNotification: { roleName: "Маньяк", newSecretId: drawnId },
      log: [
        ...state.log,
        "Маньяк успешно сбежал, сменил личность и добавил новую цель в список смертников!",
      ],
    };
  } else {
    nextDeck.push(drawnId);
    return {
      ...state,
      evidenceDeck: nextDeck,
      currentTurn: "DETECTIVE",
      blockedShift: null,
      lastInterrogation: null,
      interrogationRadar: null,
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

  const isOnBoard = state.board.flat().some((c) => c.id === handCardId);
  if (!isOnBoard) {
    return {
      ...state,
      currentTurn: "DETECTIVE",
      blockedShift: null,
      log: [...state.log, "Провал конспирации: выбранной маски нет на поле."],
    };
  }

  const newHand = state.killerHand.filter((id) => id !== handCardId);
  newHand.push(state.killerSecretId);

  return {
    ...state,
    killerSecretId: handCardId,
    killerHand: newHand,
    currentTurn: "DETECTIVE",
    blockedShift: null,
    disguisedNotification: { roleName: "Грабитель", newSecretId: handCardId },
    log: [...state.log, "Грабитель-виртуоз применил быструю маскировку."],
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

  const newTrophies = (state.trophiesKiller ?? 0) + 1;
  const isWin = newTrophies >= 5;

  return {
    ...state,
    uniformedOfficers: newOfficers,
    evidenceDeck: nextDeck,
    trophiesKiller: newTrophies,
    winner: isWin ? "KILLER" : null,
    currentTurn: "KILLER",
    blockedShift: null,
    log: [
      ...state.log,
      `Полиция призвала к присяге нового офицера. Пользуясь суматохой, Грабитель украл сокровище! Добыча: ${newTrophies}/5.`,
    ],
  };
}
