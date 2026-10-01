import type { Character, GameModeType, GameState, OpponentType, Role, LastShift } from '../types/game';

export const CHARACTERS_DATA: Omit<Character, 'isAlive' | 'isExonerated'>[] = [
  { id: 'c1', name: 'Артур Блэк' },
  { id: 'c2', name: 'Мария Козлова' },
  { id: 'c3', name: 'Елена Соколова' },
  { id: 'c4', name: 'Виктор Громов' },
  { id: 'c5', name: 'Анна Морозова' },
  { id: 'c6', name: 'Алексей Медведев' },
  { id: 'c7', name: 'Татьяна Павлова' },
  { id: 'c8', name: 'Павел Макаров' },
  { id: 'c9', name: 'Роман Орлов' },
  { id: 'c10', name: 'Илья Богданов' },
  { id: 'c11', name: 'София Романова' },
  { id: 'c12', name: 'Виктория Белова' },
  { id: 'c13', name: 'Ксения Тарасова' },
  { id: 'c14', name: 'Алиса Смирнова' },
  { id: 'c15', name: 'Андрей Семенов' },
  { id: 'c16', name: 'Дарья Кузнецова' },
  { id: 'c17', name: 'Ольга Зайцева' },
  { id: 'c18', name: 'Дмитрий Волков' },
  { id: 'c19', name: 'Сергей Степанов' },
  { id: 'c20', name: 'Максим Лебедев' },
  { id: 'c21', name: 'Игорь Новиков' },
  { id: 'c22', name: 'Наталья Николаева' },
  { id: 'c23', name: 'Марк Воронов' },
  { id: 'c24', name: 'Денис Попов' },
  { id: 'c25', name: 'Екатерина Ильина' },
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
  type: 'ROW' | 'COL',
  index: number,
  direction: 'FORWARD' | 'BACKWARD'
): boolean {
  if (!lastShift) return false;
  return (
    lastShift.type === type &&
    lastShift.index === index &&
    lastShift.direction !== direction
  );
}

export function getCharacterCoords(board: Character[][], characterId: string): { r: number; c: number } | null {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c].id === characterId) return { r, c };
    }
  }
  return null;
}

export function areAdjacent(board: Character[][], id1: string, id2: string): boolean {
  const p1 = getCharacterCoords(board, id1);
  const p2 = getCharacterCoords(board, id2);
  if (!p1 || !p2) return false;
  const dr = Math.abs(p1.r - p2.r);
  const dc = Math.abs(p1.c - p2.c);
  return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
}

export function getAdjacentCharacters(board: Character[][], characterId: string): Character[] {
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
  playerRole: Role = 'DETECTIVE'
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

  if (mode === 'SPANISH_HEIST') {
    board[0][0].isVault = true;
    board[0][4].isVault = true;
    board[4][0].isVault = true;
    board[4][4].isVault = true;
  }

  const deck = shuffledCharacters.slice(25).map((c) => c.id);

  const candidatePool = boardCharacters.filter((c) => !c.isVault);
  const killerIndex = Math.floor(Math.random() * candidatePool.length);
  const killerSecretId = candidatePool[killerIndex].id;

  const killerNeighbors = getAdjacentCharacters(board, killerSecretId).map((c) => c.id);
  const validDetectiveCandidates = candidatePool.filter(
    (c) => c.id !== killerSecretId && !killerNeighbors.includes(c.id)
  );

  let detectiveSecretId: string;
  let detectiveHand: string[] = [];
  let inspectorChoices: string[] = [];
  let victimList: string[] = [];

  if (mode === 'SKHVATKA') {
    const safeCandidates = shuffle(validDetectiveCandidates);
    const chosenChoices = safeCandidates.slice(0, 4);
    inspectorChoices = chosenChoices.map((c) => c.id);
    detectiveSecretId = inspectorChoices[0];
    detectiveHand = inspectorChoices.slice(1);
  } else if (mode === 'MANIAC_VS_OPERATIVE') {
    const chosenDet = validDetectiveCandidates[Math.floor(Math.random() * validDetectiveCandidates.length)];
    detectiveSecretId = chosenDet.id;
    const potentialVictims = boardCharacters
      .filter((c) => c.id !== killerSecretId && c.id !== detectiveSecretId)
      .map((c) => c.id);
    victimList = shuffle(potentialVictims).slice(0, 4);
  } else {
    const chosenDet = validDetectiveCandidates[Math.floor(Math.random() * validDetectiveCandidates.length)];
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
    currentTurn: 'KILLER',
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
      `Операция началась (${mode}). Режим: ${opponent === 'AI' ? 'Против бота' : 'Вдвоем'}.`,
      'Раунд 1: Первый ход за атакующей стороной.',
    ],
  };
}

export function setInspectorRole(state: GameState, chosenId: string): GameState {
  if (!state.inspectorChoices?.includes(chosenId)) return state;
  const remainingHand = state.inspectorChoices.filter((id) => id !== chosenId);
  return {
    ...state,
    detectiveSecretId: chosenId,
    detectiveHand: remainingHand,
    inspectorChoices: [],
    log: [...state.log, 'Инспектор определился с тайным досье прикрытия.'],
  };
}

export function shiftBoard(
  board: Character[][],
  type: 'ROW' | 'COL',
  index: number,
  direction: 'FORWARD' | 'BACKWARD'
): Character[][] {
  const newBoard = board.map((row) => [...row]);

  if (type === 'ROW') {
    const row = [...newBoard[index]];
    if (direction === 'FORWARD') {
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
    if (direction === 'FORWARD') {
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

export function killCharacter(state: GameState, targetId: string): GameState {
  if (state.winner) return state;

  const isAdjacent = areAdjacent(state.board, state.killerSecretId, targetId);
  if (!isAdjacent) return state;

  let isVictimValid = true;
  if (state.mode === 'MANIAC_VS_OPERATIVE') {
    isVictimValid = state.victimList.includes(targetId) || targetId === state.detectiveSecretId;
  }
  if (!isVictimValid) return state;

  const targetChar = state.board.flat().find((c) => c.id === targetId);

  if (targetChar?.isShielded) {
    const newBoard = state.board.map((row) =>
      row.map((c) => (c.id === targetId ? { ...c, isShielded: false } : c))
    );
    return {
      ...state,
      board: newBoard,
      currentTurn: 'DETECTIVE',
      blockedShift: null,
      log: [
        ...state.log,
        `Выстрел отражен! Бронежилет спас жизнь ${targetChar.name}! Защита снята.`,
      ],
    };
  }

  let killedName = '';
  const newBoard = state.board.map((row) =>
    row.map((c) => {
      if (c.id === targetId) {
        killedName = c.name;
        return { ...c, isAlive: false, hasBomb: false };
      }
      return c;
    })
  );

  const newKillCount = state.killCount + 1;
  let winner: Role | null = null;

  if (targetId === state.detectiveSecretId) {
    winner = 'KILLER';
  } else if (state.mode === 'MANIAC_VS_OPERATIVE' && newKillCount >= 4) {
    winner = 'KILLER';
  } else if (state.mode === 'EUROPOL_VS_OPG' && newKillCount >= 6) {
    winner = 'KILLER';
  } else if (state.mode === 'SKHVATKA' && newKillCount >= 14) {
    winner = 'KILLER';
  }

  return {
    ...state,
    board: newBoard,
    killCount: newKillCount,
    winner,
    currentTurn: 'DETECTIVE',
    blockedShift: null,
    log: [
      ...state.log,
      `Ликвидация: персонаж ${killedName} устранен.${winner ? ' Победа преступного мира!' : ''}`,
    ],
  };
}

export function crackVault(state: GameState, targetId: string): GameState {
  if (state.winner || state.mode !== 'SPANISH_HEIST') return state;
  if (!areAdjacent(state.board, state.killerSecretId, targetId)) return state;

  const target = state.board.flat().find((c) => c.id === targetId);
  if (!target || !target.isVault || target.isVaultCracked || target.isVaultLocked) return state;

  const crackedCount = (state.trophiesKiller ?? 0) + 1;
  const isWin = crackedCount >= 3;

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isVaultCracked: true } : c))
  );

  return {
    ...state,
    board: newBoard,
    trophiesKiller: crackedCount,
    winner: isWin ? 'KILLER' : null,
    currentTurn: 'DETECTIVE',
    blockedShift: null,
    log: [
      ...state.log,
      `Сейф ${target.name} взломан! Прогресс ограбления: ${crackedCount}/3.${
        isWin ? ' Хранилище казино полностью обчищено! Победа банды!' : ''
      }`,
    ],
  };
}

export function lockVault(state: GameState, targetId: string): GameState {
  if (state.winner || state.mode !== 'SPANISH_HEIST') return state;
  if (!areAdjacent(state.board, state.detectiveSecretId, targetId)) return state;

  const target = state.board.flat().find((c) => c.id === targetId);
  if (!target || !target.isVault || target.isVaultCracked || target.isVaultLocked) return state;

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isVaultLocked: true } : c))
  );

  return {
    ...state,
    board: newBoard,
    currentTurn: 'KILLER',
    blockedShift: null,
    log: [...state.log, `Охрана включила протокол тревоги на сейфе ${target.name}!`],
  };
}

export function plantBomb(state: GameState, targetId: string): GameState {
  if (state.winner || state.mode !== 'EUROPOL_VS_OPG') return state;
  if (!areAdjacent(state.board, state.killerSecretId, targetId)) return state;

  const targetChar = state.board.flat().find((c) => c.id === targetId);
  if (!targetChar || targetChar.hasBomb) return state;

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, hasBomb: true } : c))
  );

  return {
    ...state,
    board: newBoard,
    currentTurn: 'DETECTIVE',
    blockedShift: null,
    log: [...state.log, `ОПГ заложила скрытый заряд взрывчатки в квартале ${targetChar.name}!`],
  };
}

export function applyShield(state: GameState, targetId: string): GameState {
  if (state.winner || state.mode !== 'EUROPOL_VS_OPG') return state;
  if (!areAdjacent(state.board, state.detectiveSecretId, targetId) && targetId !== state.detectiveSecretId) {
    return state;
  }

  const targetChar = state.board.flat().find((c) => c.id === targetId);
  if (!targetChar || targetChar.isShielded) return state;

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isShielded: true } : c))
  );

  return {
    ...state,
    board: newBoard,
    currentTurn: 'KILLER',
    blockedShift: null,
    log: [...state.log, `Европол экипировал защитным протоколом: ${targetChar.name}.`],
  };
}

export function sniperShot(state: GameState, targetId: string): GameState {
  if (state.winner || state.mode !== 'EUROPOL_VS_OPG') return state;

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
      winner: 'DETECTIVE',
      log: [...state.log, `Снайперский выстрел точно в цель! Глава ОПГ (${targetChar.name}) ликвидирован! Победа Европола!`],
    };
  }

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isAlive: false } : c))
  );

  return {
    ...state,
    board: newBoard,
    currentTurn: 'KILLER',
    blockedShift: null,
    log: [...state.log, `Снайпер Европола устранил ложную цель: ${targetChar.name}.`],
  };
}

export function robNeighbor(state: GameState, targetId: string): GameState {
  if (state.winner || state.mode !== 'THIEF_HUNT') return state;
  if (!areAdjacent(state.board, state.killerSecretId, targetId)) return state;

  const targetChar = state.board.flat().find((c) => c.id === targetId);
  if (!targetChar || targetChar.isRobbed) return state;

  const newTrophies = (state.trophiesKiller ?? 0) + 1;
  const isWin = newTrophies >= 5;

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isRobbed: true } : c))
  );

  let nextKillerSecretId = state.killerSecretId;
  const nextDeck = [...state.evidenceDeck];
  if (!isWin && nextDeck.length > 0) {
    nextKillerSecretId = nextDeck.shift()!;
  }

  return {
    ...state,
    board: newBoard,
    trophiesKiller: newTrophies,
    killerSecretId: nextKillerSecretId,
    evidenceDeck: nextDeck,
    winner: isWin ? 'KILLER' : null,
    currentTurn: 'DETECTIVE',
    blockedShift: null,
    log: [
      ...state.log,
      `Вор похитил сокровище у персонажа ${targetChar.name}! Добыча: ${newTrophies}/5.${
        isWin ? ' Вор скрылся со всеми сокровищами!' : ' Вор сменил прикрытие и растворился в толпе.'
      }`,
    ],
  };
}

export function setPolicePatrol(state: GameState, type: 'ROW' | 'COL', index: number): GameState {
  if (state.winner || state.mode !== 'THIEF_HUNT') return state;

  return {
    ...state,
    blockedShift: { type, index },
    currentTurn: 'KILLER',
    log: [
      ...state.log,
      `Полиция выставила оцепление на ${type === 'ROW' ? `ряд ${index + 1}` : `колонку ${index + 1}`}. Сдвиг заблокирован на 1 ход!`,
    ],
  };
}

export function accuseCharacter(state: GameState, targetId: string): GameState {
  if (state.winner) return state;

  const isAdjacent = areAdjacent(state.board, state.detectiveSecretId, targetId);
  const isSelf = targetId === state.detectiveSecretId;
  if (!isAdjacent && !isSelf) return state;

  let targetName = '';
  let targetChar: Character | undefined;
  state.board.forEach((r) =>
    r.forEach((c) => {
      if (c.id === targetId) {
        targetName = c.name;
        targetChar = c;
      }
    })
  );

  if (targetChar?.hasBomb) {
    const isDetKilled = targetId === state.detectiveSecretId;
    const newBoard = state.board.map((row) =>
      row.map((c) => (c.id === targetId ? { ...c, isAlive: false, hasBomb: false } : c))
    );

    return {
      ...state,
      board: newBoard,
      currentTurn: 'KILLER',
      winner: isDetKilled ? 'KILLER' : null,
      blockedShift: null,
      log: [
        ...state.log,
        `💥 ЛОВУШКА! При проверке сдетонировала скрытая бомба ОПГ! ${targetName} ликвидирован!${
          isDetKilled ? ' Командир Европола погиб при взрыве!' : ''
        }`,
      ],
    };
  }

  if (targetId === state.killerSecretId) {
    return {
      ...state,
      winner: 'DETECTIVE',
      blockedShift: null,
      log: [
        ...state.log,
        `Точное задержание! ${targetName} оказался преступником. Победа Закона!`,
      ],
    };
  }

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isExonerated: true } : c))
  );

  return {
    ...state,
    board: newBoard,
    currentTurn: 'KILLER',
    blockedShift: null,
    log: [
      ...state.log,
      `Ложная проверка: ${targetName} не преступник. Получено алиби.`,
    ],
  };
}

export function exonerateFromHand(state: GameState, id: string): GameState {
  if (!state.detectiveHand.includes(id)) return state;

  let name = '';
  const newBoard = state.board.map((row) =>
    row.map((c) => {
      if (c.id === id) {
        name = c.name;
        return { ...c, isExonerated: true };
      }
      return c;
    })
  );

  const nextHand = state.detectiveHand.filter((cardId) => cardId !== id);
  const nextDeck = [...state.evidenceDeck];
  if (nextDeck.length > 0) nextHand.push(nextDeck.shift()!);

  return {
    ...state,
    board: newBoard,
    detectiveHand: nextHand,
    evidenceDeck: nextDeck,
    currentTurn: 'KILLER',
    blockedShift: null,
    log: [...state.log, `Из досье сыщика подтверждено алиби для: ${name}.`],
  };
}

export function disguiseKiller(state: GameState): GameState {
  if (state.evidenceDeck.length === 0) return state;

  const nextDeck = [...state.evidenceDeck];
  const newSecretId = nextDeck.shift()!;
  nextDeck.push(state.killerSecretId);

  return {
    ...state,
    killerSecretId: newSecretId,
    evidenceDeck: nextDeck,
    currentTurn: 'DETECTIVE',
    blockedShift: null,
    log: [...state.log, 'Преступник сменил облик и ушел в тень.'],
  };
}

export function canCleanupBoard(board: Character[][] | Character[]): boolean {
  if (!board || board.length === 0) return false;
  const flat = Array.isArray(board[0]) ? (board as Character[][]).flat() : (board as Character[]);

  const firstDeadIdx = flat.findIndex((c) => !c.isAlive);
  if (firstDeadIdx === -1) return false;

  let lastAliveIdx = -1;
  for (let i = flat.length - 1; i >= 0; i--) {
    if (flat[i].isAlive) {
      lastAliveIdx = i;
      break;
    }
  }

  return firstDeadIdx < lastAliveIdx;
}

export function cleanupDeadCharacters(state: GameState): GameState {
  if (state.winner || !canCleanupBoard(state.board)) return state;

  const numRows = state.board.length;
  const numCols = state.board[0].length;

  const living = state.board.flat().filter((c) => c.isAlive);
  const dead = state.board.flat().filter((c) => !c.isAlive);
  const reordered = [...living, ...dead];

  const updatedBoard: Character[][] = [];
  for (let r = 0; r < numRows; r++) {
    updatedBoard.push(reordered.slice(r * numCols, r * numCols + numCols));
  }

  const nextTurn = state.currentTurn === 'KILLER' ? 'DETECTIVE' : 'KILLER';

  return {
    ...state,
    board: updatedBoard,
    currentTurn: nextTurn,
    blockedShift: null,
    log: [...state.log, 'Морг очищен: тела смещены в нижнюю часть квартала.'],
  };
}

export function captureSpy(state: GameState, targetId: string): GameState {
  if (state.winner) return state;

  const isAgent1 = state.currentTurn === 'KILLER';
  const mySecretId = isAgent1 ? state.killerSecretId : state.detectiveSecretId;
  const enemySecretId = isAgent1 ? state.detectiveSecretId : state.killerSecretId;

  if (!areAdjacent(state.board, mySecretId, targetId)) return state;

  if (targetId === enemySecretId) {
    const winner: Role = isAgent1 ? 'KILLER' : 'DETECTIVE';
    return {
      ...state,
      winner,
      blockedShift: null,
      log: [...state.log, `Вражеский резидент разоблачен на месте! Победа ${winner === 'KILLER' ? 'Востока' : 'Запада'}!`],
    };
  }

  const nextTrophiesKiller = isAgent1 ? (state.trophiesKiller ?? 0) + 1 : state.trophiesKiller ?? 0;
  const nextTrophiesDetective = !isAgent1 ? (state.trophiesDetective ?? 0) + 1 : state.trophiesDetective ?? 0;

  let winner: Role | null = null;
  if (nextTrophiesKiller >= 2) winner = 'KILLER';
  if (nextTrophiesDetective >= 2) winner = 'DETECTIVE';

  const newBoard = state.board.map((row) =>
    row.map((c) => (c.id === targetId ? { ...c, isAlive: false } : c))
  );

  return {
    ...state,
    board: newBoard,
    trophiesKiller: nextTrophiesKiller,
    trophiesDetective: nextTrophiesDetective,
    winner,
    currentTurn: isAgent1 ? 'DETECTIVE' : 'KILLER',
    blockedShift: null,
    log: [
      ...state.log,
      `Захвачен агент связного. Получен трофей (+1).${winner ? ' Собрано 2 трофея — победа!' : ''}`,
    ],
  };
}

export function interrogateNeighbor(state: GameState, targetId: string): GameState {
  const isAgent1 = state.currentTurn === 'KILLER';
  const mySecretId = isAgent1 ? state.killerSecretId : state.detectiveSecretId;
  const enemySecretId = isAgent1 ? state.detectiveSecretId : state.killerSecretId;

  if (!areAdjacent(state.board, mySecretId, targetId)) return state;

  const isNear = areAdjacent(state.board, targetId, enemySecretId);
  const targetChar = state.board.flat().find((c) => c.id === targetId);

  return {
    ...state,
    lastInterrogation: {
      interrogator: isAgent1 ? 'KILLER' : 'DETECTIVE',
      targetName: targetChar?.name ?? 'Свидетель',
      isNear,
    },
    currentTurn: isAgent1 ? 'DETECTIVE' : 'KILLER',
    blockedShift: null,
    log: [
      ...state.log,
      `Допрос свидетеля (${targetChar?.name}): ${isNear ? '«Да, подозрительный субъект рядом!»' : '«Никого рядом не видел»'}.`,
    ],
  };
}
