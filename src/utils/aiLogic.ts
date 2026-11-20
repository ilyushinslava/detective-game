import type { GameState, LastShift, Character, Role } from "../types/game";
import { DUEL_QUESTIONS } from "../constants/duelQuestions";
import { DUEL_CHARACTERS } from "../constants/duelCharacters";
import { filterCandidates } from "./duelLogic";
import {
  getAdjacentCharacters,
  getCharacterCoords,
  isOppositeShift,
  killCharacter,
  accuseCharacter,
  exonerateFromHand,
  disguiseKiller,
  shiftBoard,
  spyCatch,
  spyInterrogate,
  robNeighbor,
  fastDisguise,
  swearInOfficer,
  areAdjacent,
} from "./gameLogic";

// ============================================================================
// Вспомогательные функции геометрии доски и валидации сдвигов
// ============================================================================

export interface ValidShift {
  type: "ROW" | "COL";
  index: number;
  direction: "FORWARD" | "BACKWARD";
}

/**
 * Возвращает все легальные сдвиги с учётом Anti-Undo и блокировок.
 */
export function getAllValidShifts(
  board: Character[][],
  lastShift: LastShift | null,
  blockedShift?: { type: "ROW" | "COL"; index: number } | null,
): ValidShift[] {
  const shifts: ValidShift[] = [];
  const numRows = board.length;
  if (numRows === 0) return shifts;
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

/**
 * Расстояние Чебышёва (число ходов короля) между двумя клетками доски 5x5.
 */
function getChebyshevDist(
  p1: { r: number; c: number } | null,
  p2: { r: number; c: number } | null,
): number {
  if (!p1 || !p2) return 99;
  return Math.max(Math.abs(p1.r - p2.r), Math.abs(p1.c - p2.c));
}

// ============================================================================
// МОДУЛЬ ДЕДУКЦИИ SOLO AI v2 (Кандидатные пулы и отсечение)
// ============================================================================

/**
 * Дедукция оперативника в MANIAC_VS_OPERATIVE / SKHVATKA:
 * Вычисляет список всех живых персонажей, которые потенциально могут быть маньяком.
 */
export function getManiacCandidates(state: GameState): Set<string> {
  const candidates = new Set<string>();
  const flatBoard = state.board.flat();
  const detHand = new Set(state.detectiveHand || []);

  for (const c of flatBoard) {
    if (!c.isAlive) continue;
    if (c.isExonerated) continue;
    if (c.id === state.detectiveSecretId) continue;
    if (detHand.has(c.id)) continue;
    candidates.add(c.id);
  }

  return candidates;
}

/**
 * Дедукция полиции в THIEF_HUNT:
 * Вычисляет список подозреваемых в грабеже (живые, не офицеры, не детектив).
 */
export function getThiefCandidates(state: GameState): Set<string> {
  const candidates = new Set<string>();
  const flatBoard = state.board.flat();
  const officers = new Set(state.uniformedOfficers || []);

  for (const c of flatBoard) {
    if (!c.isAlive) continue;
    if (c.id === state.detectiveSecretId) continue;
    if (officers.has(c.id)) continue;
    candidates.add(c.id);
  }

  return candidates;
}

/**
 * Дедукция шпионов в SECRET_SERVICE:
 * Вычисляет кандидатов во вражеские шпионы для активного агента.
 */
export function getSecretServiceEnemyCandidates(
  state: GameState,
  activeSpyId: string,
  activeSpySecretId: string,
): Set<string> {
  const candidates = new Set<string>();
  const flatBoard = state.board.flat();

  for (const c of flatBoard) {
    if (!c.isAlive) continue;
    if (c.id === activeSpySecretId) continue;
    candidates.add(c.id);
  }

  // Анализируем исторический протокол допросов и ложных арестов
  for (const entry of state.log) {
    if (entry.includes("Ни один агент не находится рядом")) {
      const match = entry.match(/опросил окружение ([^.]+)\./);
      if (match && match[1]) {
        const targetName = match[1].trim();
        const targetChar = flatBoard.find((c) => c.name === targetName);
        if (targetChar) {
          const neighbors = getAdjacentCharacters(state.board, targetChar.id);
          candidates.delete(targetChar.id);
          for (const n of neighbors) {
            candidates.delete(n.id);
          }
        }
      }
    } else if (entry.includes("объявил подозрение на")) {
      const match = entry.match(/объявил подозрение на ([^.]+)\./);
      if (match && match[1]) {
        const targetName = match[1].trim();
        const targetChar = flatBoard.find((c) => c.name === targetName);
        if (targetChar) {
          candidates.delete(targetChar.id);
        }
      }
    }
  }

  // Если был опрос свидетелей с подтверждением контакта
  if (state.lastSpyInterrogation && state.interrogationRadar) {
    const targetId = state.interrogationRadar.targetId;
    const targetNeighbors = getAdjacentCharacters(state.board, targetId);
    const radarZoneIds = new Set([targetId, ...targetNeighbors.map((n) => n.id)]);

    const raised = state.lastSpyInterrogation.raisedHandsPlayerNames || [];
    const otherSpies = (state.spies || []).filter((s) => s.id !== activeSpyId);
    const hasEnemyInRadar = otherSpies.some((s) => raised.includes(s.name));

    // Если враг точно поднял руку в зоне радара, отдаём высший приоритет кандидатам из этой зоны
    if (hasEnemyInRadar) {
      const refined = new Set<string>();
      for (const id of candidates) {
        if (radarZoneIds.has(id)) {
          refined.add(id);
        }
      }
      if (refined.size > 0) return refined;
    } else if (raised.length === 0) {
      // Ни один шпион не поднял руку: в зоне радара 3х3 вражеских резидентов нет!
      for (const id of radarZoneIds) {
        candidates.delete(id);
      }
    }
  }

  return candidates;
}

// ============================================================================
// 1. РЕЖИМ «ПОЧЕРК УБИЙЦЫ» / SKHVATKA (Solo AI v2)
// ============================================================================

export function getKillerAIMove(state: GameState): GameState {
  if (state.winner) return state;

  const killerNeighbors = getAdjacentCharacters(
    state.board,
    state.killerSecretId,
  );

  // 1. ПРИОРИТЕТ АТАКИ (Летальный удар)
  if (state.mode === "MANIAC_VS_OPERATIVE") {
    // Если детектив оказался в соседях — решающий удар (мгновенная победа)
    const detectiveTarget = killerNeighbors.find(
      (c) => c.isAlive && c.id === state.detectiveSecretId,
    );
    if (detectiveTarget) {
      return killCharacter(state, detectiveTarget.id);
    }

    // Если текущая жертва в соседях — ликвидируем по контракту
    const currentVictimId = state.victimList?.[0];
    const victimTarget = killerNeighbors.find(
      (c) => c.isAlive && c.id === currentVictimId,
    );
    if (victimTarget) {
      return killCharacter(state, victimTarget.id);
    }
  } else if (state.mode === "SKHVATKA") {
    const validTargets = killerNeighbors.filter(
      (c) => c.isAlive && !c.isExonerated,
    );
    if (validTargets.length > 0) {
      // Бьём по цели с наименьшим числом оставшихся алиби
      const chosen = validTargets[0];
      return killCharacter(state, chosen.id);
    }

    // Маскировка при скоплении оправданных свидетелей
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

  // 2. ТАКТИЧЕСКИЙ СДВИГ МАНЬЯКА (Позиционная оценка на 1-2 хода вперёд)
  const validShifts = getAllValidShifts(
    state.board,
    state.lastShift,
    state.blockedShift,
  );

  if (validShifts.length > 0) {
    const targetVictimId = state.victimList?.[0];
    const currentKillerCoords = getCharacterCoords(state.board, state.killerSecretId);
    const currentVictimCoords = targetVictimId ? getCharacterCoords(state.board, targetVictimId) : null;
    let bestShift: ValidShift = validShifts[0];
    let bestScore = -Infinity;

    for (const shift of validShifts) {
      const simBoard = shiftBoard(
        state.board,
        shift.type,
        shift.index,
        shift.direction,
      );
      let score = 0;

      const simKillerCoords = getCharacterCoords(simBoard, state.killerSecretId);
      const simDetCoords = getCharacterCoords(simBoard, state.detectiveSecretId);

      // А. Сближение с целью контракта
      if (targetVictimId && currentKillerCoords && currentVictimCoords) {
        const simVictimCoords = getCharacterCoords(simBoard, targetVictimId);
        if (areAdjacent(simBoard, state.killerSecretId, targetVictimId)) {
          // Сдвиг ставит жертву в упор: на следующем ходу гарантированное убийство!
          score += 200;
        } else {
          const distBefore = getChebyshevDist(currentKillerCoords, currentVictimCoords);
          const distAfter = getChebyshevDist(simKillerCoords, simVictimCoords);
          const delta = distBefore - distAfter;
          score += delta * 50;
          score += (5 - distAfter) * 15;
        }
      } else if (state.mode === "SKHVATKA") {
        const simNeighbors = getAdjacentCharacters(simBoard, state.killerSecretId);
        const lethalCount = simNeighbors.filter((c) => c.isAlive && !c.isExonerated).length;
        score += lethalCount * 25;
      }

      // Б. Взаимодействие с детективом
      if (simDetCoords && simKillerCoords) {
        const detDist = getChebyshevDist(simKillerCoords, simDetCoords);
        if (state.mode === "MANIAC_VS_OPERATIVE") {
          // В дуэли маньяк знает детектива в лицо. Если маньяк может оказаться рядом,
          // он может нанести летальный удар.
          if (detDist <= 1) {
            // Если у маньяка мало ходов до победы или затяжная партия - агрессивная атака детектива
            score += 120;
          }
        } else {
          if (detDist <= 1) {
            score -= 20;
          } else {
            score += 5;
          }
        }
      }

      // Анти-осцилляция: подавление повторного сдвига той же линии своим предыдущим ходом
      const prevOwnLog = state.log[state.log.length - 2];
      if (prevOwnLog) {
        const lineDesc = shift.type === "ROW" ? `ряд ${shift.index + 1}` : `колонку ${shift.index + 1}`;
        if (prevOwnLog.includes(lineDesc)) {
          score -= 35;
        }
      }

      // Небольшой стохастический вес для непредсказуемости и разрыва детерминированных циклов
      score += Math.random() * 12;

      if (score > bestScore) {
        bestScore = score;
        bestShift = shift;
      }
    }

    const newBoard = shiftBoard(
      state.board,
      bestShift.type,
      bestShift.index,
      bestShift.direction,
    );

    return {
      ...state,
      board: newBoard,
      currentTurn: "DETECTIVE",
      lastShift: bestShift,
      interrogationRadar: null,
      log: [
        ...state.log,
        `Бот сдвинул ${bestShift.type === "ROW" ? `ряд ${bestShift.index + 1}` : `колонку ${bestShift.index + 1}`}.`,
      ],
    };
  }

  // Фолбэк передачи хода
  return {
    ...state,
    currentTurn: "DETECTIVE",
    interrogationRadar: null,
    log: [...state.log, "Бот-преступник пропустил ход."],
  };
}

export function getDetectiveAIMove(state: GameState): GameState {
  if (state.winner) return state;

  const candidates = getManiacCandidates(state);
  const detectiveNeighbors = getAdjacentCharacters(
    state.board,
    state.detectiveSecretId,
  );

  // Кандидаты в маньяки в зоне досягаемости ареста
  const reachableCandidates = detectiveNeighbors.filter((c) => candidates.has(c.id));

  // 1. ВЫВЕРЕННЫЙ ТАЙМИНГ АРЕСТА
  // Арестуем строго тогда, когда:
  // - Среди соседей ровно 1 кандидат, и общий круг подозреваемых сузился до <= 3, ИЛИ
  // - Жертв осталось всего 1 (маньяк на грани победы, риск необходим), ИЛИ
  // - Круг кандидатов сократился (<= 6) или партия затянулась (> 15 записей в протоколе)
  const isEndgameThreat = (state.victimList?.length ?? 3) <= 1;
  const isHighConfidence = reachableCandidates.length === 1 && candidates.size <= 3;
  const isSoleSurvivor = candidates.size === 1 && reachableCandidates.length === 1;
  const isStalemateOrTight = candidates.size <= 6 || state.log.length > 10;
  const isOvertimeForced = state.log.length > 25 && reachableCandidates.length > 0;

  if (
    isSoleSurvivor ||
    isHighConfidence ||
    isOvertimeForced ||
    (isEndgameThreat && reachableCandidates.length > 0) ||
    (isStalemateOrTight && reachableCandidates.length > 0 && Math.random() < 0.75)
  ) {
    const target = reachableCandidates[0];
    return accuseCharacter(state, target.id);
  }

  // 2. ОПРАВДАНИЕ ИЗ РУКИ (Сужение круга алиби)
  if (state.detectiveHand && state.detectiveHand.length > 0) {
    const cardToExonerate = state.detectiveHand.find((id) => {
      const c = state.board.flat().find((ch) => ch.id === id);
      return c && c.isAlive && !c.isExonerated;
    });
    if (cardToExonerate) {
      return exonerateFromHand(state, cardToExonerate);
    }
  }

  // 3. ТАКТИЧЕСКИЙ СДВИГ ОПЕРАТИВНИКА
  const validShifts = getAllValidShifts(
    state.board,
    state.lastShift,
    state.blockedShift,
  );

  if (validShifts.length > 0) {
    const targetVictimId = state.victimList?.[0];
    const currentDetCoords = getCharacterCoords(state.board, state.detectiveSecretId);
    let bestShift: ValidShift = validShifts[0];
    let bestScore = -Infinity;

    for (const shift of validShifts) {
      const simBoard = shiftBoard(
        state.board,
        shift.type,
        shift.index,
        shift.direction,
      );
      let score = 0;

      const simDetCoords = getCharacterCoords(simBoard, state.detectiveSecretId);
      const simNeighbors = getAdjacentCharacters(simBoard, state.detectiveSecretId);

      // А. Сближение с оставшимися кандидатами в маньяки
      const simReachableCandidates = simNeighbors.filter((c) => candidates.has(c.id));
      if (simReachableCandidates.length > 0) {
        // Если сдвиг выводит на дистанцию ареста к кандидату
        score += 150;
        if (candidates.size <= 4) {
          score += 50; // Чем меньше подозреваемых, тем важнее контакт
        }
      } else if (currentDetCoords) {
        // Оцениваем, насколько сдвиг реально сокращает дистанцию к кандидатам
        let bestDelta = -99;
        let minAfter = 99;
        for (const candId of candidates) {
          const curCand = getCharacterCoords(state.board, candId);
          const simCand = getCharacterCoords(simBoard, candId);
          if (curCand && simCand) {
            const before = getChebyshevDist(currentDetCoords, curCand);
            const after = getChebyshevDist(simDetCoords, simCand);
            const delta = before - after;
            if (delta > bestDelta) bestDelta = delta;
            if (after < minAfter) minAfter = after;
          }
        }
        score += bestDelta * 40;
        score += (5 - minAfter) * 15;
      }

      // Б. Защита текущей жертвы контракта
      if (targetVictimId && candidates.size > 8) {
        const simVictimCoords = getCharacterCoords(simBoard, targetVictimId);
        const distToVictim = getChebyshevDist(simDetCoords, simVictimCoords);
        if (distToVictim <= 1) {
          score += 15;
        }
      }

      // Анти-осцилляция: подавление повторного сдвига той же линии своим предыдущим ходом
      const prevOwnLog = state.log[state.log.length - 2];
      if (prevOwnLog) {
        const lineDesc = shift.type === "ROW" ? `ряд ${shift.index + 1}` : `колонку ${shift.index + 1}`;
        if (prevOwnLog.includes(lineDesc)) {
          score -= 35;
        }
      }

      // Небольшой стохастический вес для непредсказуемости и разрыва детерминированных циклов
      score += Math.random() * 12;

      if (score > bestScore) {
        bestScore = score;
        bestShift = shift;
      }
    }

    const newBoard = shiftBoard(
      state.board,
      bestShift.type,
      bestShift.index,
      bestShift.direction,
    );

    return {
      ...state,
      board: newBoard,
      currentTurn: "KILLER",
      lastShift: bestShift,
      interrogationRadar: null,
      log: [
        ...state.log,
        `Бот сдвинул ${bestShift.type === "ROW" ? `ряд ${bestShift.index + 1}` : `колонку ${bestShift.index + 1}`}.`,
      ],
    };
  }

  return {
    ...state,
    currentTurn: "KILLER",
    interrogationRadar: null,
    log: [...state.log, "Бот-инспектор пропустил ход."],
  };
}

// ============================================================================
// 2. РЕЖИМ «ОХОТА НА ВОРА» (Solo AI v2)
// ============================================================================

export function getThiefAIMove(state: GameState): GameState {
  if (state.winner) return state;

  const neighbors = getAdjacentCharacters(state.board, state.killerSecretId);
  const unrobbedNeighbors = neighbors.filter((c) => c.isAlive && !c.isRobbed);

  // 1. ПРИОРИТЕТ ОГРАБЛЕНИЯ
  if (unrobbedNeighbors.length > 0) {
    const target = unrobbedNeighbors[0];
    return robNeighbor(state, target.id);
  }

  // Если все соседи ограблены, а сам вор ещё не ограблен — грабит самого себя
  const selfChar = state.board.flat().find((c) => c.id === state.killerSecretId);
  if (selfChar && selfChar.isAlive && !selfChar.isRobbed) {
    return robNeighbor(state, selfChar.id);
  }

  // 2. МАСКИРОВКА ПРИ УГРОЗЕ АРЕСТА
  const officers = new Set(state.uniformedOfficers || []);
  const isNearPolice = neighbors.some(
    (c) => c.id === state.detectiveSecretId || officers.has(c.id),
  );

  if (isNearPolice && state.killerHand && state.killerHand.length > 0) {
    const maskId = state.killerHand[0];
    const disguisedState = fastDisguise(state, maskId);
    return {
      ...disguisedState,
      currentTurn: "DETECTIVE",
    };
  }

  // 3. ТАКТИЧЕСКИЙ СДВИГ ВОРА
  const validShifts = getAllValidShifts(
    state.board,
    state.lastShift,
    state.blockedShift,
  );

  if (validShifts.length > 0) {
    let bestShift: ValidShift = validShifts[0];
    let bestScore = -Infinity;

    for (const shift of validShifts) {
      const simBoard = shiftBoard(
        state.board,
        shift.type,
        shift.index,
        shift.direction,
      );
      let score = 0;

      const simThiefCoords = getCharacterCoords(simBoard, state.killerSecretId);
      const simDetCoords = getCharacterCoords(simBoard, state.detectiveSecretId);
      const simNeighbors = getAdjacentCharacters(simBoard, state.killerSecretId);

      // А. Наличие неограбленных целей на следующий ход
      const simUnrobbedCount = simNeighbors.filter((c) => c.isAlive && !c.isRobbed).length;
      score += simUnrobbedCount * 30;

      // Б. Уклонение от зоны полиции
      const isSimNearDet = simNeighbors.some((c) => c.id === state.detectiveSecretId);
      const isSimNearOfficer = simNeighbors.some((c) => officers.has(c.id));

      if (isSimNearDet || isSimNearOfficer) {
        score -= 90; // Фатальная ошибка — подставиться под облаву
      } else {
        const detDist = getChebyshevDist(simThiefCoords, simDetCoords);
        score += Math.min(detDist, 4) * 10;
      }

      // Анти-осцилляция
      const prevOwnLog = state.log[state.log.length - 2];
      if (prevOwnLog) {
        const lineDesc = shift.type === "ROW" ? `ряд ${shift.index + 1}` : `колонку ${shift.index + 1}`;
        if (prevOwnLog.includes(lineDesc)) {
          score -= 35;
        }
      }

      score += Math.random() * 12;

      if (score > bestScore) {
        bestScore = score;
        bestShift = shift;
      }
    }

    const newBoard = shiftBoard(
      state.board,
      bestShift.type,
      bestShift.index,
      bestShift.direction,
    );

    return {
      ...state,
      board: newBoard,
      currentTurn: "DETECTIVE",
      lastShift: bestShift,
      interrogationRadar: null,
      log: [
        ...state.log,
        `Вор сдвинул ${bestShift.type === "ROW" ? `ряд ${bestShift.index + 1}` : `колонку ${bestShift.index + 1}`}.`,
      ],
    };
  }

  return {
    ...state,
    currentTurn: "DETECTIVE",
    interrogationRadar: null,
    log: [...state.log, "Вор затаился и пропустил ход."],
  };
}

export function getPoliceAIMove(state: GameState): GameState {
  if (state.winner) return state;

  const candidates = getThiefCandidates(state);
  const zoneIds = new Set<string>();

  // Зона контроля детектива
  const detNeighbors = getAdjacentCharacters(state.board, state.detectiveSecretId);
  detNeighbors.forEach((c) => zoneIds.add(c.id));

  // Зона контроля патрульных офицеров
  if (state.uniformedOfficers) {
    state.uniformedOfficers.forEach((offId) => {
      const offNeighbors = getAdjacentCharacters(state.board, offId);
      offNeighbors.forEach((c) => zoneIds.add(c.id));
    });
  }

  const suspectsInZone = state.board
    .flat()
    .filter((c) => c.isAlive && zoneIds.has(c.id) && candidates.has(c.id));

  // 1. АРЕСТ ВОРА
  // Арестуем при высокой дедуктивной уверенности или критическом запасе монет вора
  const thiefCoins = state.trophiesKiller ?? 0;
  const isEmergency = thiefCoins >= 4; // Вор на грани победы

  if ((suspectsInZone.length === 1 && candidates.size <= 4) || (isEmergency && suspectsInZone.length > 0)) {
    const target = suspectsInZone[0];
    const resultState = accuseCharacter(state, target.id);
    if (resultState !== state) {
      return {
        ...resultState,
        currentTurn: "KILLER",
      };
    }
  }

  // 2. ПРИСЯГА НОВОГО ПАТРУЛЬНОГО ОФИЦЕРА
  if (
    state.uniformedOfficers &&
    state.uniformedOfficers.length > 0 &&
    state.evidenceDeck.length > 0 &&
    (state.uniformedOfficers.length < 2 || Math.random() < 0.4)
  ) {
    const officerId = state.uniformedOfficers[0];
    const resultState = swearInOfficer(state, officerId);
    if (resultState !== state) {
      return {
        ...resultState,
        currentTurn: "KILLER",
      };
    }
  }

  // 3. ТАКТИЧЕСКИЙ СДВИГ ПОЛИЦИИ (Стягивание кольца оцепления)
  const validShifts = getAllValidShifts(
    state.board,
    state.lastShift,
    state.blockedShift,
  );

  if (validShifts.length > 0) {
    let bestShift: ValidShift = validShifts[0];
    let bestScore = -Infinity;

    for (const shift of validShifts) {
      const simBoard = shiftBoard(
        state.board,
        shift.type,
        shift.index,
        shift.direction,
      );
      let score = 0;

      const simDetCoords = getCharacterCoords(simBoard, state.detectiveSecretId);
      const simZoneIds = new Set<string>();

      const simDetNeighbors = getAdjacentCharacters(simBoard, state.detectiveSecretId);
      simDetNeighbors.forEach((c) => simZoneIds.add(c.id));

      if (state.uniformedOfficers) {
        state.uniformedOfficers.forEach((offId) => {
          const offNeighbors = getAdjacentCharacters(simBoard, offId);
          offNeighbors.forEach((c) => simZoneIds.add(c.id));
        });
      }

      // Число подозреваемых в новой зоне контроля
      const simSuspectsCount = simBoard
        .flat()
        .filter((c) => c.isAlive && simZoneIds.has(c.id) && candidates.has(c.id)).length;

      score += simSuspectsCount * 25;

      // Стягивание к центру подозреваемых
      let avgDist = 0;
      let count = 0;
      for (const candId of candidates) {
        const cCoords = getCharacterCoords(simBoard, candId);
        if (cCoords && simDetCoords) {
          avgDist += getChebyshevDist(simDetCoords, cCoords);
          count++;
        }
      }
      if (count > 0) {
        score += (5 - avgDist / count) * 6;
      }

      // Анти-осцилляция
      const prevOwnLog = state.log[state.log.length - 2];
      if (prevOwnLog) {
        const lineDesc = shift.type === "ROW" ? `ряд ${shift.index + 1}` : `колонку ${shift.index + 1}`;
        if (prevOwnLog.includes(lineDesc)) {
          score -= 35;
        }
      }

      score += Math.random() * 12;

      if (score > bestScore) {
        bestScore = score;
        bestShift = shift;
      }
    }

    const newBoard = shiftBoard(
      state.board,
      bestShift.type,
      bestShift.index,
      bestShift.direction,
    );

    return {
      ...state,
      board: newBoard,
      currentTurn: "KILLER",
      lastShift: bestShift,
      interrogationRadar: null,
      log: [
        ...state.log,
        `Полиция сдвинула ${bestShift.type === "ROW" ? `ряд ${bestShift.index + 1}` : `колонку ${bestShift.index + 1}`}.`,
      ],
    };
  }

  return {
    ...state,
    currentTurn: "KILLER",
    interrogationRadar: null,
    log: [...state.log, "Полиция пропустила ход."],
  };
}

// ============================================================================
// 3. РЕЖИМ «СЕКРЕТНАЯ СЛУЖБА» (Solo AI v2)
// ============================================================================

export function getSecretServiceAIMove(state: GameState): GameState {
  if (state.winner || !state.spies || state.activeSpyIndex === undefined) {
    return state;
  }

  const activeSpy = state.spies[state.activeSpyIndex];
  if (!activeSpy || !activeSpy.isAI) return state;

  const candidates = getSecretServiceEnemyCandidates(
    state,
    activeSpy.id,
    activeSpy.secretId,
  );

  const neighbors = getAdjacentCharacters(state.board, activeSpy.secretId).filter(
    (c) => c.isAlive,
  );
  const selfChar = state.board
    .flat()
    .find((c) => c.id === activeSpy.secretId && c.isAlive);

  const validTargets = [...neighbors, ...(selfChar ? [selfChar] : [])];
  const reachableCandidates = validTargets.filter((c) => candidates.has(c.id));

  // 1. ЗАДЕРЖАНИЕ ШПИОНА (spyCatch)
  if (reachableCandidates.length > 0 && (candidates.size <= 8 || Math.random() < 0.5)) {
    const target = reachableCandidates[Math.floor(Math.random() * reachableCandidates.length)];
    const resultState = spyCatch(state, target.id);
    if (resultState !== state) return resultState;
  }

  // 2. ОПРОС СВИДЕТЕЛЕЙ (spyInterrogate)
  // Опрашиваем свидетелей с умеренной вероятностью, отдавая приоритет ещё неопрошенным целям
  if (validTargets.length > 0 && Math.random() < 0.35) {
    const unqueried = validTargets.filter(
      (t) => !state.log.some((l) => l.includes(`опросил окружение ${t.name}`))
    );
    const target = unqueried.length > 0 ? unqueried[0] : validTargets[0];
    const resultState = spyInterrogate(state, target.id);
    if (resultState !== state) return resultState;
  }

  // 3. ТАКТИЧЕСКИЙ СДВИГ ШПИОНА
  const validShifts = getAllValidShifts(
    state.board,
    state.lastShift,
    state.blockedShift,
  );

  if (validShifts.length > 0) {
    let bestShift: ValidShift = validShifts[0];
    let bestScore = -Infinity;

    for (const shift of validShifts) {
      const simBoard = shiftBoard(
        state.board,
        shift.type,
        shift.index,
        shift.direction,
      );
      let score = 0;

      const simSpyCoords = getCharacterCoords(simBoard, activeSpy.secretId);
      const simNeighbors = getAdjacentCharacters(simBoard, activeSpy.secretId);

      // Контакт с кандидатами во вражеские шпионы
      const simCandidatesCount = simNeighbors.filter((c) => candidates.has(c.id)).length;
      score += simCandidatesCount * 25;

      // Сближение с ближайшим кандидатом
      let minDist = 99;
      for (const candId of candidates) {
        const candCoords = getCharacterCoords(simBoard, candId);
        const d = getChebyshevDist(simSpyCoords, candCoords);
        if (d < minDist) minDist = d;
      }
      score += (5 - minDist) * 10;

      // Анти-осцилляция
      const prevOwnLog = state.log[state.log.length - (state.spies?.length || 4)];
      if (prevOwnLog) {
        const lineDesc = shift.type === "ROW" ? `ряд ${shift.index + 1}` : `колонку ${shift.index + 1}`;
        if (prevOwnLog.includes(lineDesc)) {
          score -= 35;
        }
      }

      score += Math.random() * 12;

      if (score > bestScore) {
        bestScore = score;
        bestShift = shift;
      }
    }

    const newBoard = shiftBoard(
      state.board,
      bestShift.type,
      bestShift.index,
      bestShift.direction,
    );
    const nextIndex = (state.activeSpyIndex + 1) % state.spies.length;

    return {
      ...state,
      board: newBoard,
      activeSpyIndex: nextIndex,
      lastShift: bestShift,
      lastSpyInterrogation: null,
      interrogationRadar: null,
      log: [
        ...state.log,
        `${activeSpy.name} сдвинул ${bestShift.type === "ROW" ? `ряд ${bestShift.index + 1}` : `колонку ${bestShift.index + 1}`}.`,
      ],
    };
  }

  // 4. Гарантированный фолбэк передачи хода
  const nextIndex = (state.activeSpyIndex + 1) % state.spies.length;
  return {
    ...state,
    activeSpyIndex: nextIndex,
    interrogationRadar: null,
    log: [...state.log, `${activeSpy.name} пропустил ход.`],
  };
}

// ============================================================================
// 4. РЕЖИМ «ОЧНАЯ СТАВКА» (LINE_UP — СТРОГО БЕЗ ИЗМЕНЕНИЙ ПО AGENTS.MD)
// ============================================================================

export function getDuelAIMove(state: GameState): GameState {
  if (state.winner || state.mode !== "LINE_UP") return state;

  const botRole = state.currentTurn;
  const history = state.duelHistory || [];
  const candidates = filterCandidates(DUEL_CHARACTERS, history, botRole);
  const alreadyAccused = state.accusedTargets?.[botRole] || [];

  // Если остался 1 кандидат или среди кандидатов есть единственный не обвиненный - обвиняем
  const unaccusedCandidates = candidates.filter(
    (c) => !alreadyAccused.includes(c.id),
  );
  if (unaccusedCandidates.length === 1 && Math.random() < 0.85) {
    const targetId = unaccusedCandidates[0].id;
    const targetSecretId =
      botRole === "DETECTIVE" ? state.killerSecretId : state.detectiveSecretId;
    const nextTurn = botRole === "DETECTIVE" ? "KILLER" : "DETECTIVE";

    if (targetId === targetSecretId) {
      return {
        ...state,
        winner: botRole,
        log: [
          ...state.log,
          `Бот (${botRole === "DETECTIVE" ? "Следователь" : "Подозреваемый"}) выдвинул точное обвинение против #${targetId.replace("c", "")}! Победа!`,
        ],
      };
    } else {
      const nextPenalties = {
        ...(state.duelPenalties || { DETECTIVE: 0, KILLER: 0 }),
        [botRole]: (state.duelPenalties?.[botRole] ?? 0) + 1,
      };
      const nextAccused = {
        ...(state.accusedTargets || { DETECTIVE: [], KILLER: [] }),
        [botRole]: [...alreadyAccused, targetId],
      };
      return {
        ...state,
        duelPenalties: nextPenalties,
        accusedTargets: nextAccused,
        currentTurn: nextTurn,
        log: [
          ...state.log,
          `Бот (${botRole === "DETECTIVE" ? "Следователь" : "Подозреваемый"}) ошибся с обвинением (+1 штраф). Ход переходит оппоненту.`,
        ],
      };
    }
  }

  // Иначе бот выбирает незаданный вопрос
  const askedQuestionIds = new Set(
    history.filter((h) => h.askerRole === botRole).map((h) => h.questionId),
  );
  const availableQuestions = DUEL_QUESTIONS.filter(
    (q) => !askedQuestionIds.has(q.id),
  );
  const chosenQuestion =
    availableQuestions.length > 0
      ? availableQuestions[Math.floor(Math.random() * availableQuestions.length)]
      : DUEL_QUESTIONS[Math.floor(Math.random() * DUEL_QUESTIONS.length)];

  const targetSecretId =
    botRole === "DETECTIVE" ? state.killerSecretId : state.detectiveSecretId;
  const targetChar = DUEL_CHARACTERS.find((c) => c.id === targetSecretId);
  const answer = targetChar ? chosenQuestion.check(targetChar.attributes) : false;

  const entry = {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    askerRole: botRole,
    questionId: chosenQuestion.id,
    questionText: chosenQuestion.text,
    answer,
    timestamp: Date.now(),
  };

  const nextTurn = botRole === "DETECTIVE" ? "KILLER" : "DETECTIVE";
  return {
    ...state,
    duelHistory: [...history, entry],
    currentTurn: nextTurn,
    log: [
      ...state.log,
      `Бот задал вопрос: "${chosenQuestion.text}". Ответ: ${answer ? "ДА" : "НЕТ"}.`,
    ],
  };
}

// ============================================================================
// 5. Единая точка входа Solo AI v2
// ============================================================================

/**
 * Единая точка входа для вычисления следующего хода AI-бота во всех 4-х режимах игры.
 * Автоматически маршрутизирует ход в зависимости от текущего режима и активной роли.
 */
export function calculateNextAIMove(state: GameState): GameState {
  if (state.winner) return state;

  if (state.mode === "LINE_UP") {
    return getDuelAIMove(state);
  }
  if (state.mode === "SECRET_SERVICE") {
    return getSecretServiceAIMove(state);
  }
  if (state.mode === "THIEF_HUNT") {
    return state.currentTurn === "KILLER"
      ? getThiefAIMove(state)
      : getPoliceAIMove(state);
  }
  if (state.currentTurn === "KILLER") {
    return getKillerAIMove(state);
  }
  return getDetectiveAIMove(state);
}
