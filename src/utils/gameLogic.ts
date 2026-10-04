import type {
  Character,
  GameModeType,
  GameState,
  OpponentType,
  Role,
  LastShift,
} from "../types/game";

export const CHARACTERS_DATA: Omit<Character, "isAlive" | "isExonerated">[] = [
  { id: "c1", name: "Артур Блэк" },
  { id: "c2", name: "Мария Козлова" },
  { id: "c3", name: "Елена Соколова" },
  { id: "c4", name: "Виктор Громов" },
  { id: "c5", name: "Анна Морозова" },
  { id: "c6", name: "Алексей Медведев" },
  { id: "c7", name: "Татьяна Павлова" },
  { id: "c8", name: "Павел Макаров" },
  { id: "c9", name: "Роман Орлов" },
  { id: "c10", name: "Илья Богданов" },
  { id: "c11", name: "София Романова" },
  { id: "c12", name: "Виктория Белова" },
  { id: "c13", name: "Ксения Тарасова" },
  { id: "c14", name: "Алиса Смирнова" },
  { id: "c15", name: "Андрей Семенов" },
  { id: "c16", name: "Дарья Кузнецова" },
  { id: "c17", name: "Ольга Зайцева" },
  { id: "c18", name: "Дмитрий Волков" },
  { id: "c19", name: "Сергей Степанов" },
  { id: "c20", name: "Максим Лебедев" },
  { id: "c21", name: "Игорь Новиков" },
  { id: "c22", name: "Наталья Николаева" },
  { id: "c23", name: "Марк Воронов" },
  { id: "c24", name: "Денис Попов" },
  { id: "c25", name: "Екатерина Ильина" },
];

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
): GameState {
  const shuffledCharacters = shuffle(CHARACTERS_DATA);
  const boardCharacters = shuffledCharacters.slice(0, 25).map((c) => ({
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
  for (let i = 0; i < 5; i++) {
    board.push(boardCharacters.slice(i * 5, i * 5 + 5));
  }

  if (mode === "SPANISH_HEIST") {
    board[0][0].isVault = true;
    board[0][4].isVault = true;
    board[4][0].isVault = true;
    board[4][4].isVault = true;
  }

  const deck = shuffledCharacters.slice(25).map((c) => c.id);

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

  let detectiveSecretId: string;
  let detectiveHand: string[] = [];
  let inspectorChoices: string[] = [];
  let victimList: string[] = [];
  let killerHand: string[] = [];
  let uniformedOfficers: string[] = [];

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
    // КАНОН: Раздаем роли прямо из перемешанной колоды улик (deck)
    killerSecretId = deck.shift()!;
    killerHand = [deck.shift()!, deck.shift()!, deck.shift()!];

    detectiveSecretId = deck.shift()!;
    uniformedOfficers = [deck.shift()!, deck.shift()!];
  } else {
    const chosenDet =
      validDetectiveCandidates[
        Math.floor(Math.random() * validDetectiveCandidates.length)
      ];
    detectiveSecretId = chosenDet.id;
  }

  return {
    board,
    evidenceDeck: deck,
    killerSecretId,
    detectiveSecretId,
    detectiveHand,
    inspectorChoices,
    victimList,
    killerHand, // Добавлено для Вора
    uniformedOfficers, // Добавлено для Полиции
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
    log: [
      `Операция началась (${mode}). Режим: ${opponent === "AI" ? "Против бота" : "Вдвоем"}.`,
      "Раунд 1: Первый ход за атакующей стороной.",
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
    for (let r = 0; r < 5; r++) col.push(newBoard[r][index]);
    if (direction === "FORWARD") {
      const last = col.pop()!;
      col.unshift(last);
    } else {
      const first = col.shift()!;
      col.push(first);
    }
    for (let r = 0; r < 5; r++) newBoard[r][index] = col[r];
  }

  return newBoard;
}

// src/utils/gameLogic.ts

export function killCharacter(state: GameState, targetId: string): GameState {
  if (state.winner) return state;

  const isAdjacent = areAdjacent(state.board, state.killerSecretId, targetId);
  if (!isAdjacent) return state;

  // Ограничение для режима Маньяка: цель должна быть текущей открытой жертвой или Оперативником
  if (state.mode === "MANIAC_VS_OPERATIVE") {
    const isCurrentVictim =
      state.victimList.length > 0 && targetId === state.victimList[0];
    const isDetective = targetId === state.detectiveSecretId;
    if (!isCurrentVictim && !isDetective) {
      return state;
    }
  }

  const targetChar = state.board.flat().find((c) => c.id === targetId);
  // ... оставшаяся логика функции
  // Обработка бронежилета (режим EUROPOL_VS_OPG)
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

  // Обновляем список жертв для режима маньяка
  let newVictimList = [...state.victimList];
  if (state.mode === "MANIAC_VS_OPERATIVE" && targetId === newVictimList[0]) {
    newVictimList.shift();

    // Если следующая цель в очереди уже мертва — сбрасываем ее
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

  // НОВОЕ: Если убитый был в руке Оперативника (досье алиби), карта сбрасывается
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

  // Восстановленный блок допроса
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
    detectiveHand: newDetectiveHand, // Применяем обновленную руку
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

  // КАНОН: Вор может обокрасть соседа ИЛИ самого себя
  const isAdjacent = areAdjacent(state.board, state.killerSecretId, targetId);
  const isSelf = targetId === state.killerSecretId;
  if (!isAdjacent && !isSelf) return state;

  const targetChar = state.board.flat().find((c) => c.id === targetId);
  if (!targetChar || targetChar.isRobbed) return state;

  const newTrophies = (state.trophiesKiller ?? 0) + 1;
  const isWin = newTrophies >= 25; // КАНОН: 25 сокровищ для победы

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
      `Вор похитил сокровище у ${targetChar.name}! Добыча: ${newTrophies}/25.${
        isWin ? " Вор украл всё и победил!" : ""
      }`,
    ],
  };
}

export function accuseCharacter(state: GameState, targetId: string): GameState {
  if (state.winner) return state;

  let isAdjacent = areAdjacent(state.board, state.detectiveSecretId, targetId);
  let isSelf = targetId === state.detectiveSecretId;

  // КАНОН: В Охоте на грабителя обвинять можно и от лица Офицеров в форме
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

  // ... (дальше код функции остается без изменений)

  // Логика ловушки-бомбы (режим EUROPOL_VS_OPG)
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

  // 1. Точное обвинение: цель — преступник
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

  // 2. Ложное обвинение: персонаж получает алиби (isExonerated = true)
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

  // ДОПРОС: Инспектор оправдывает подозреваемого
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
    state.evidenceDeck.length === 0 // Защита уже есть, но усилим логику
  ) {
    return state;
  }

  const nextDeck = [...state.evidenceDeck];
  const drawnId = nextDeck.shift();

  if (!drawnId) return state; // Безопасный выход, если shift() вернул undefined

  // Проверяем, жив ли вытянутый персонаж
  const drawnChar = state.board.flat().find((c) => c.id === drawnId);
  const isAlive = drawnChar?.isAlive ?? false;

  if (isAlive) {
    // Успешная маскировка
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
    // Провал маскировки (персонаж мертв)
    // Карта уходит в сброс, личность не меняется
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
      // Живой персонаж стоит после мертвого — требуется очистка/сдвиг
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

  const nextDeck = [...state.evidenceDeck];
  const newCharacters: Character[] = [];

  // Добираем карты из колоды улик на замену убитым
  let drawnCount = 0;
  while (
    living.length + newCharacters.length < totalCells &&
    nextDeck.length > 0
  ) {
    const newId = nextDeck.shift()!;
    const baseChar = CHARACTERS_DATA.find((c) => c.id === newId);

    newCharacters.push({
      id: newId,
      name: baseChar?.name ?? newId,
      isAlive: true,
      isExonerated: false,
      isRobbed: false,
      isShielded: false,
      hasBomb: false,
      isVault: false,
      isVaultCracked: false,
      isVaultLocked: false,
    });
    drawnCount++;
  }

  // Если карт в колоде не хватило, оставшиеся слоты добираем из остатка мертвых
  const remainingDead = dead.slice(drawnCount);
  const reordered = [...living, ...newCharacters, ...remainingDead];

  // Восстанавливаем геометрию сетки
  const updatedBoard: Character[][] = [];
  for (let r = 0; r < numRows; r++) {
    updatedBoard.push(reordered.slice(r * numCols, r * numCols + numCols));
  }

  const nextTurn: Role =
    state.currentTurn === "KILLER" ? "DETECTIVE" : "KILLER";

  return {
    ...state,
    board: updatedBoard,
    evidenceDeck: nextDeck,
    currentTurn: nextTurn,
    blockedShift: null,
    lastShift: null,
    lastInterrogation: null,
    log: [
      ...state.log,
      `Обновление поля: убрано тел — ${dead.length}. Прибыло новых подозреваемых из резерва: ${drawnCount}.`,
    ],
  };
}

export function captureSpy(state: GameState, targetId: string): GameState {
  if (state.winner) return state;

  const isAgent1 = state.currentTurn === "KILLER";
  const mySecretId = isAgent1 ? state.killerSecretId : state.detectiveSecretId;
  const enemySecretId = isAgent1
    ? state.detectiveSecretId
    : state.killerSecretId;

  if (!areAdjacent(state.board, mySecretId, targetId)) return state;

  // Успешный захват вражеского шпиона (победа активного игрока)
  if (targetId === enemySecretId) {
    const winner: Role = isAgent1 ? "KILLER" : "DETECTIVE";
    return {
      ...state,
      winner,
      blockedShift: null,
      log: [
        ...state.log,
        `Вражеский резидент разоблачен на месте! Победа ${winner === "KILLER" ? "Востока" : "Запада"}!`,
      ],
    };
  }

  // Ошибочный захват (устранение невиновного)
  const nextTrophiesKiller = isAgent1
    ? (state.trophiesKiller ?? 0) + 1
    : (state.trophiesKiller ?? 0);
  const nextTrophiesDetective = !isAgent1
    ? (state.trophiesDetective ?? 0) + 1
    : (state.trophiesDetective ?? 0);

  let winner: Role | null = null;

  // ИНВЕРСИЯ ПОБЕДЫ: если игрок устранил 2 невиновных, он дисквалифицируется, побеждает оппонент
  if (nextTrophiesKiller >= 2) winner = "DETECTIVE";
  if (nextTrophiesDetective >= 2) winner = "KILLER";

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isAlive: false } : c)),
  );

  return {
    ...state,
    board: newBoard,
    trophiesKiller: nextTrophiesKiller,
    trophiesDetective: nextTrophiesDetective,
    winner,
    currentTurn: isAgent1 ? "DETECTIVE" : "KILLER",
    blockedShift: null,
    log: [
      ...state.log,
      `Захвачен невиновный гражданский. Получен штрафной трофей (+1).${
        winner
          ? " Устранено 2 невиновных — провал операции! Победа оппонента."
          : ""
      }`,
    ],
  };
}

export function interrogateNeighbor(
  state: GameState,
  targetId: string,
): GameState {
  const isAgent1 = state.currentTurn === "KILLER";
  const mySecretId = isAgent1 ? state.killerSecretId : state.detectiveSecretId;
  const enemySecretId = isAgent1
    ? state.detectiveSecretId
    : state.killerSecretId;

  if (!areAdjacent(state.board, mySecretId, targetId)) return state;

  const isNear = areAdjacent(state.board, targetId, enemySecretId);
  const targetChar = state.board.flat().find((c) => c.id === targetId);

  return {
    ...state,
    lastInterrogation: {
      interrogator: isAgent1 ? "KILLER" : "DETECTIVE",
      targetName: targetChar?.name ?? "Свидетель",
      isNear,
    },
    currentTurn: isAgent1 ? "DETECTIVE" : "KILLER",
    blockedShift: null,
    log: [
      ...state.log,
      `Допрос свидетеля (${targetChar?.name}): ${isNear ? "«Да, подозрительный субъект рядом!»" : "«Никого рядом не видел»"}.`,
    ],
  };
}
export function escapeManiac(state: GameState): GameState {
  // Для побега нужно минимум 2 карты в колоде
  if (
    state.winner ||
    state.mode !== "MANIAC_VS_OPERATIVE" ||
    state.evidenceDeck.length < 2
  ) {
    return state;
  }

  const nextDeck = [...state.evidenceDeck];
  const drawnId = nextDeck.shift();

  if (!drawnId) return state; // Безопасность

  const drawnChar = state.board.flat().find((c) => c.id === drawnId);
  const isAlive = drawnChar?.isAlive ?? false;

  if (isAlive) {
    nextDeck.push(state.killerSecretId);
    const newVictimId = nextDeck.shift();

    if (!newVictimId) return state; // Безопасность

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

  // Меняем текущую личность на выбранную из руки
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

  // КАНОН: При присяге Вор бесплатно забирает 1 сокровище с поля
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
    isWin = newTrophies >= 25;
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
      `Полиция призвала к присяге нового офицера. Пользуясь суматохой, Вор украл сокровище! Добыча: ${newTrophies}/25.`,
    ],
  };
}
