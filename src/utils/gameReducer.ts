import type { GameState } from "../types/game";
import type { GameAction } from "../types/multiplayer";
import { DUEL_QUESTIONS } from "../constants/duelQuestions";
import { DUEL_CHARACTERS } from "../constants/duelCharacters";
import { filterCandidates } from "./duelLogic";
import {
  shiftBoard,
  accuseCharacter,
  spyCatch,
  spyInterrogate,
  isOppositeShift,
  killCharacter,
  robNeighbor,
  escapeManiac,
  fastDisguise,
  disguiseKiller,
  exonerateFromHand,
  cleanupDeadCharacters,
  swearInOfficer,
  setInspectorRole,
  generateBoard5x5,
} from "./gameLogic";

export function gameReducer(state: GameState, action: GameAction): GameState {
  const RESTART_CONTROL_ACTIONS = [
    "RESTART_GAME",
    "MATCH_STARTED",
    "REQUEST_RESTART",
    "CONFIRM_RESTART",
    "REJECT_RESTART"
  ];

  if (state.winner && !RESTART_CONTROL_ACTIONS.includes(action.type)) {
    return state;
  }

  const isRemote = action.senderId === "remote";

  const SYSTEM_ACTIONS = [
    "START_GAME", "MATCH_STARTED", "RESTART_GAME", "REQUEST_RESTART", 
    "CONFIRM_RESTART", "REJECT_RESTART", "SET_MATCH_POT", "PLAYER_READY", 
    "SET_INSPECTOR_ROLE", "CLEANUP", "CLEAR_DISGUISE_NOTIFICATION", "END_TURN",
    "TURN_TIMEOUT", "TIMEOUT_PASS", "DUEL_TIMEOUT_PASS", "RESTART_DUEL", "RESOLVE_DUEL_TIE_BREAK"
  ];
  
  // Авторитетный сервер сам валидирует очередность. На клиентах блокировку не делаем.

  const computeNextState = (): GameState => {
    switch (action.type) {
    case "START_GAME": {
      const mode = action.payload?.mode || state.mode || "MANIAC_VS_OPERATIVE";
      const procedural = action.payload?.procedural ?? true;
      const board = generateBoard5x5({
        mode,
        boardSize: 5,
        proceduralDistribution: procedural,
        defaultStatus: procedural ? "HIDDEN" : "REVEALED",
      });
      return {
        ...state,
        board,
        boardSize: 5,
        actionPoints: 3,
        maxActionPoints: 3,
        winner: null,
        log: [...state.log, "Матч начался. Сетка 5x5 сгенерирована."],
      };
    }

    case "REVEAL_CELL": {
      const { cellId, row, col } = (action as any).payload || {};
      const actionRole = (action as any).role || (action as any).senderRole || action.senderId;

      // 1. Проверка очереди хода (если роль явно передана и не совпадает с currentTurn)
      if (
        actionRole &&
        (actionRole === "KILLER" || actionRole === "DETECTIVE") &&
        actionRole !== state.currentTurn
      ) {
        return state;
      }

      // 2. Проверка очков действий (Action Points)
      const currentAP = state.actionPoints !== undefined ? state.actionPoints : 3;
      if (currentAP <= 0) {
        return state;
      }

      // 3. Поиск клетки на доске
      let targetCell: any = null;
      let targetR = -1;
      let targetC = -1;

      for (let r = 0; r < state.board.length; r++) {
        for (let c = 0; c < state.board[r].length; c++) {
          const cell = state.board[r][c];
          if ((cellId && cell.id === cellId) || (row === r && col === c)) {
            targetCell = cell;
            targetR = r;
            targetC = c;
            break;
          }
        }
        if (targetCell) break;
      }

      if (!targetCell || targetCell.status === "BLOCKED" || targetCell.status === "REVEALED") {
        return state;
      }

      // 4. Открытие клетки и списание AP
      const newBoard = state.board.map((rArr, rIdx) =>
        rArr.map((cell, cIdx) => {
          if (rIdx === targetR && cIdx === targetC) {
            return {
              ...cell,
              status: "REVEALED" as const,
            };
          }
          return cell;
        })
      );

      const nextAP = Math.max(0, currentAP - 1);
      const cellName = targetCell.name || targetCell.id;
      const typeLabel =
        targetCell.cellType === "CLUE"
          ? "Улика"
          : targetCell.cellType === "EMPTY"
          ? "Пустой сектор"
          : "Подозреваемый";

      return {
        ...state,
        board: newBoard,
        actionPoints: nextAP,
        log: [
          ...state.log,
          `[Сектор [${targetR + 1}, ${targetC + 1}]] Разведка завершена: ${typeLabel} (${cellName}). Осталось ОД: ${nextAP}.`,
        ],
      };
    }

    case "SHIFT_BOARD": {
      // В "Схватке" первый ход Бандита обязан быть ликвидацией (сдвиг запрещен для локального игрока)

      const { shiftType, index, direction } = action.payload;

      // Блокируем анти-отмену ТОЛЬКО для локальных ходов. Удаленные ходы применяются безусловно.
      if (
        !isRemote &&
        isOppositeShift(state.lastShift, shiftType, index, direction)
      ) {
        return state;
      }

      const newBoard = shiftBoard(state.board, shiftType, index, direction);
      if (newBoard === state.board) {
        return state;
      }
      const nextTurn = state.currentTurn === "KILLER" ? "DETECTIVE" : "KILLER";

      let nextSpyIndex = state.activeSpyIndex;
      let currentRoleName =
        state.currentTurn === "KILLER" ? "БАНДИТ" : "ИНСПЕКТОР";

      if (state.mode === "MANIAC_VS_OPERATIVE") {
        currentRoleName =
          state.currentTurn === "KILLER" ? "МАНЬЯК" : "ОПЕРАТИВНИК";
      } else if (state.mode === "THIEF_HUNT") {
        currentRoleName = state.currentTurn === "KILLER" ? "ГРАБИТЕЛЬ" : "ПОЛИЦИЯ";
      }

      if (
        state.mode === "SECRET_SERVICE" &&
        state.spies &&
        state.activeSpyIndex !== undefined
      ) {
        nextSpyIndex = (state.activeSpyIndex + 1) % state.spies.length;
        currentRoleName = state.spies[state.activeSpyIndex].name;
      }

      const actionText = `${currentRoleName} сдвинул ${
        shiftType === "ROW" ? `ряд ${index + 1}` : `колонку ${index + 1}`
      }.`;

      return {
        ...state,
        board: newBoard,
        currentTurn: nextTurn,
        activeSpyIndex: nextSpyIndex,
        lastShift: { type: shiftType, index, direction },
        lastInterrogation: null,
        lastSpyInterrogation: null,
        interrogationRadar: null,
        isHotseatCoverOpen: false,
        disguisedNotification: null,
        log: [...state.log, actionText],
      };
    }

    case "KILL_CHARACTER":
      return killCharacter(state, action.payload.targetId);
    case "ROB_NEIGHBOR":
      return robNeighbor(state, action.payload.targetId);
    case "ACCUSE":
      if (state.mode === "LINE_UP") {
        return gameReducer(state, { ...action, type: "DUEL_ACCUSE" as any });
      }
      return accuseCharacter(state, action.payload.targetId);

    case "CAPTURE_SPY": {
      const payload = action.payload as any;
      const targetId = payload?.targetCardId || payload?.targetId;
      const explicitHit = payload?.isHit === true || Boolean(payload?.caughtSpyId);
      const explicitMiss = payload?.isHit === false || payload?.isMiss === true;

      // Безоговорочное обновление при наличии явного результата в payload
      if (explicitHit && targetId) {
        const attackerIndex = payload?.attackerSpyIndex !== undefined
          ? payload.attackerSpyIndex
          : (state.activeSpyIndex ?? 0);
        const targetSpyId = payload?.caughtSpyId;
        const caughtIndex = state.spies
          ? state.spies.findIndex((s) => targetSpyId ? s.id === targetSpyId : s.id !== state.spies?.[attackerIndex]?.id)
          : -1;

        const targetTrophies = state.spyTargetTrophies ?? 4;
        let nextSpies = state.spies ? [...state.spies] : [];

        if (nextSpies[attackerIndex]) {
          nextSpies[attackerIndex] = {
            ...nextSpies[attackerIndex],
            trophies: Math.min(targetTrophies, nextSpies[attackerIndex].trophies + 1),
          };
        }

        const nextSecretId = payload?.nextSecretId;
        if (caughtIndex !== -1 && nextSpies[caughtIndex]) {
          if (nextSecretId) {
            nextSpies[caughtIndex] = {
              ...nextSpies[caughtIndex],
              secretId: nextSecretId,
            };
          }
        }

        const targetCharName = payload?.revealedRole || state.board.flat().find((c) => c.id === targetId)?.name || targetId;

        const newBoard = state.board.map((row) =>
          row.map((c) =>
            c.id === targetId
              ? { ...c, isAlive: false, unmaskedSpyIndex: caughtIndex !== -1 ? caughtIndex : 1 }
              : c
          )
        );

        const safeNext = payload?.nextSpyIndex !== undefined
          ? payload.nextSpyIndex
          : ((state.activeSpyIndex ?? 0) + 1) % (nextSpies.length || 1);

        const attacker = nextSpies[attackerIndex];
        const isWin = (attacker?.trophies ?? 0) >= targetTrophies;
        const winner = isWin ? (attackerIndex === 0 ? "KILLER" : "DETECTIVE") : (payload?.winner || state.winner);

        return {
          ...state,
          board: newBoard,
          spies: nextSpies,
          activeSpyIndex: safeNext,
          detectiveSecretId: nextSpies[safeNext]?.secretId ?? state.detectiveSecretId,
          winner,
          interrogationRadar: null,
          isHotseatCoverOpen: false,
          justCaughtSpyId: targetSpyId || (caughtIndex !== -1 ? nextSpies[caughtIndex]?.id : undefined),
          log: [
            ...state.log,
            `🎯 Разоблачение! ${attacker?.name || "Агент"} разоблачил резидента (${targetCharName})! Трофей получен (${attacker?.trophies}/${targetTrophies}).${isWin ? " 🏆 Победа!" : ""}`,
          ],
        };
      }

      if (explicitMiss && targetId) {
        const attackerIndex = payload?.attackerSpyIndex !== undefined
          ? payload.attackerSpyIndex
          : (state.activeSpyIndex ?? 0);
        const safeNext = payload?.nextSpyIndex !== undefined
          ? payload.nextSpyIndex
          : ((state.activeSpyIndex ?? 0) + 1) % (state.spies?.length || 1);
        const targetCharName = state.board.flat().find((c) => c.id === targetId)?.name || targetId;
        const attackerName = state.spies?.[attackerIndex]?.name || "Агент";

        return {
          ...state,
          activeSpyIndex: safeNext,
          detectiveSecretId: state.spies?.[safeNext]?.secretId ?? state.detectiveSecretId,
          interrogationRadar: null,
          isHotseatCoverOpen: false,
          log: [
            ...state.log,
            `🔍 Промах: ${attackerName} объявил подозрение на ${targetCharName}. Никто из агентов не признал эту личность.`,
          ],
        };
      }

      // Фолбэк на стандартный расчет для локального режима / ИИ
      const result = spyCatch(state, action.payload.targetId);

      const explicitNext = (action.payload as any).nextSpyIndex;
      const safeNext =
        explicitNext !== undefined
          ? explicitNext
          : ((state.activeSpyIndex ?? 0) + 1) % (state.spies?.length || 1);

      let nextSpies = result.spies;

      return {
        ...result,
        spies: nextSpies,
        activeSpyIndex: safeNext,
        detectiveSecretId:
          nextSpies?.[safeNext]?.secretId ?? result.detectiveSecretId,
        interrogationRadar: null,
        isHotseatCoverOpen: false,
      };
    }

    case "INTERROGATE":
      return {
        ...spyInterrogate(state, action.payload.targetId),
        isHotseatCoverOpen: false,
      };
    case "ESCAPE_MANIAC":
      return escapeManiac(state);
    case "FAST_DISGUISE":
      return fastDisguise(state, action.payload.targetId);
    case "DISGUISE":
      return disguiseKiller(state);
    case "EXONERATE":
      return exonerateFromHand(state, action.payload.targetId);
    case "CLEANUP":
      return cleanupDeadCharacters(state);
    case "SWEAR_IN_OFFICER":
      return swearInOfficer(state, action.payload.targetId);
    case "SET_INSPECTOR_ROLE":
      return setInspectorRole(state, action.payload.chosenId);
    case "CLEAR_DISGUISE_NOTIFICATION":
      return {
        ...state,
        disguisedNotification: null,
      };

    case "END_TURN": {
      const nextTurn = state.currentTurn === "KILLER" ? "DETECTIVE" : "KILLER";
      let nextSpyIndex = state.activeSpyIndex;
      let currentRoleName =
        state.currentTurn === "KILLER" ? "БАНДИТ" : "ИНСПЕКТОР";

      if (state.mode === "MANIAC_VS_OPERATIVE") {
        currentRoleName =
          state.currentTurn === "KILLER" ? "МАНЬЯК" : "ОПЕРАТИВНИК";
      } else if (state.mode === "THIEF_HUNT") {
        currentRoleName = state.currentTurn === "KILLER" ? "ГРАБИТЕЛЬ" : "ПОЛИЦИЯ";
      }

      if (
        state.mode === "SECRET_SERVICE" &&
        state.spies &&
        state.activeSpyIndex !== undefined
      ) {
        nextSpyIndex = (state.activeSpyIndex + 1) % state.spies.length;
        currentRoleName = state.spies[state.activeSpyIndex].name;
      }

      return {
        ...state,
        currentTurn: nextTurn,
        activeSpyIndex: nextSpyIndex,
        actionPoints: state.maxActionPoints ?? 3,
        detectiveSecretId:
          state.mode === "SECRET_SERVICE" && state.spies && nextSpyIndex !== undefined
            ? state.spies[nextSpyIndex]?.secretId ?? state.detectiveSecretId
            : state.detectiveSecretId,
        lastInterrogation: null,
        lastSpyInterrogation: null,
        interrogationRadar: null,
        disguisedNotification: null,
        isHotseatCoverOpen: false,
        log: [...state.log, `${currentRoleName} завершил ход.`],
      };
    }

    case "ASK_QUESTION":
    case "DUEL_ASK_QUESTION": {
      const { questionId } = action.payload;
      const q = DUEL_QUESTIONS.find((item) => item.id === questionId);
      if (!q) return state;

      const targetSecretId = state.currentTurn === "DETECTIVE" ? state.killerSecretId : state.detectiveSecretId;
      const targetChar = DUEL_CHARACTERS.find((c) => c.id === targetSecretId);
      if (!targetChar) return state;

      const answer = q.check(targetChar.attributes);
      const entry = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        askerRole: state.currentTurn,
        questionId: q.id,
        questionText: q.text,
        answer,
        timestamp: Date.now(),
      };

      const nextTurn = state.currentTurn === "DETECTIVE" ? "KILLER" : "DETECTIVE";
      const roleName = state.currentTurn === "DETECTIVE" ? "Следователь" : "Подозреваемый";

      return {
        ...state,
        duelHistory: [...(state.duelHistory || []), entry],
        currentTurn: nextTurn,
        log: [
          ...state.log,
          `Опрос: ${roleName} спросил: "${q.text}". Ответ: ${answer ? "ДА" : "НЕТ"}.`,
        ],
      };
    }

    case "DUEL_ACCUSE": {
      if (state.winner) return state;
      const { targetId } = action.payload;
      const currentRole = state.currentTurn;
      const currentAccused = state.accusedTargets || { DETECTIVE: [], KILLER: [] };
      const roleAccused = currentAccused[currentRole] || [];
      const maxAcc = state.maxAccusations ?? 3;

      if (roleAccused.includes(targetId) || roleAccused.length >= maxAcc) {
        return state;
      }

      const targetSecretId = currentRole === "DETECTIVE" ? state.killerSecretId : state.detectiveSecretId;
      const roleName = currentRole === "DETECTIVE" ? "Следователь" : "Подозреваемый";
      const targetChar = (state.board ? state.board.flat() : DUEL_CHARACTERS).find((c) => c.id === targetId);
      const targetName = targetChar ? targetChar.name : targetId;
      const isHit = targetId === targetSecretId;

      const record = {
        id: `accuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        accuserRole: currentRole,
        targetId,
        targetName,
        isHit,
        timestamp: Date.now(),
      };

      const nextAccusedList = [...roleAccused, targetId];
      const nextAccusedTargets = {
        ...currentAccused,
        [currentRole]: nextAccusedList,
      };
      const nextAccusations = [...(state.duelAccusations || []), record];

      if (isHit) {
        return {
          ...state,
          accusedTargets: nextAccusedTargets,
          duelAccusations: nextAccusations,
          winner: currentRole,
          winReason: "ACCUSATION",
          log: [
            ...state.log,
            `Точное обвинение! ${roleName} вычислил личность оппонента (${targetName})! Победа!`,
          ],
        };
      }

      const opponentRole: Role = currentRole === "DETECTIVE" ? "KILLER" : "DETECTIVE";
      const opponentName = opponentRole === "DETECTIVE" ? "Следователь" : "Подозреваемый";
      const currentPenalties = state.duelPenalties || { DETECTIVE: 0, KILLER: 0 };
      const nextPenalties = {
        ...currentPenalties,
        [currentRole]: currentPenalties[currentRole] + 1,
      };

      // Проверка исчерпания лимита обвинений
      if (nextAccusedList.length >= maxAcc) {
        return {
          ...state,
          duelPenalties: nextPenalties,
          accusedTargets: nextAccusedTargets,
          duelAccusations: nextAccusations,
          winner: opponentRole,
          winReason: "ACCUSATIONS_EXHAUSTED",
          log: [
            ...state.log,
            `Ложное обвинение! ${roleName} ошибся с фигурантом ${targetName}. Лимит обвинений (${maxAcc}/${maxAcc}) исчерпан! Победа: ${opponentName}!`,
          ],
        };
      }

      return {
        ...state,
        duelPenalties: nextPenalties,
        accusedTargets: nextAccusedTargets,
        duelAccusations: nextAccusations,
        currentTurn: opponentRole,
        log: [
          ...state.log,
          `Ложное обвинение! ${roleName} ошибся с фигурантом ${targetName} (+1 штраф). Попытка ${nextAccusedList.length}/${maxAcc}. Ход переходит оппоненту.`,
        ],
      };
    }

    case "TURN_TIMEOUT":
    case "TIMEOUT_PASS":
    case "DUEL_TIMEOUT_PASS": {
      if (state.winner) return state;
      if (state.mode === "SECRET_SERVICE" && state.spies && state.spies.length > 0) {
        const nextSpyIndex = ((state.activeSpyIndex ?? 0) + 1) % state.spies.length;
        const nextSpy = state.spies[nextSpyIndex];
        return {
          ...state,
          activeSpyIndex: nextSpyIndex,
          detectiveSecretId: nextSpy?.secretId || state.detectiveSecretId,
          blockedShift: null,
          lastSpyInterrogation: null,
          log: [
            ...state.log,
            `Время хода истекло. Ход переходит к агенту: ${nextSpy?.name || `Агент ${nextSpyIndex + 1}`}.`,
          ],
        };
      }
      const nextTurn: Role = state.currentTurn === "DETECTIVE" ? "KILLER" : "DETECTIVE";
      let roleName = "Соперник";
      if (state.mode === "LINE_UP") {
        roleName = nextTurn === "DETECTIVE" ? "Следователь" : "Подозреваемый";
      } else if (state.mode === "MANIAC_VS_OPERATIVE") {
        roleName = nextTurn === "DETECTIVE" ? "Оперативник" : "Маньяк";
      } else if (state.mode === "THIEF_HUNT") {
        roleName = nextTurn === "DETECTIVE" ? "Полиция" : "Грабитель";
      } else {
        roleName = nextTurn === "DETECTIVE" ? "Сыщик" : "Преступник";
      }
      return {
        ...state,
        currentTurn: nextTurn,
        blockedShift: null,
        log: [
          ...state.log,
          `Время хода истекло. Ход переходит к роли: ${roleName}.`,
        ],
      };
    }

    case "RESTART_DUEL": {
      if (state.mode === "LINE_UP") {
        const nextStarter = action.payload?.nextStarter || "DETECTIVE";
        return {
          ...state,
          currentTurn: nextStarter,
          winner: null,
          winReason: undefined,
          duelHistory: [],
          duelPenalties: { DETECTIVE: 0, KILLER: 0 },
          accusedTargets: { DETECTIVE: [], KILLER: [] },
          duelAccusations: [],
          log: [...state.log, "Матч перезапущен."],
        };
      }
      return state;
    }

    case "RESOLVE_DUEL_TIE_BREAK": {
      if (state.winner) return state;
      const penalties = state.duelPenalties || { DETECTIVE: 0, KILLER: 0 };
      if (penalties.DETECTIVE < penalties.KILLER) {
        return { ...state, winner: "DETECTIVE", winReason: "TIE_BREAK_PENALTIES" };
      }
      if (penalties.KILLER < penalties.DETECTIVE) {
        return { ...state, winner: "KILLER", winReason: "TIE_BREAK_PENALTIES" };
      }
      const history = state.duelHistory || [];
      const detCandidates = filterCandidates(DUEL_CHARACTERS, history as any, "DETECTIVE").length;
      const kilCandidates = filterCandidates(DUEL_CHARACTERS, history as any, "KILLER").length;
      if (detCandidates < kilCandidates) {
        return { ...state, winner: "DETECTIVE", winReason: "TIE_BREAK_CANDIDATES" };
      }
      if (kilCandidates < detCandidates) {
        return { ...state, winner: "KILLER", winReason: "TIE_BREAK_CANDIDATES" };
      }
      return { ...state, winner: "DRAW", winReason: "TIE_BREAK_DRAW" };
    }

    case "REQUEST_RESTART":
      return {
        ...state,
        restartRequestedBy: action.payload.requestedBy,
        pendingRematchMode: action.payload.rematchMode || "SWAP",
      };

    case "REJECT_RESTART":
      return { ...state, restartRequestedBy: undefined, pendingRematchMode: undefined };

    case "CONFIRM_RESTART":
      return { ...state, restartRequestedBy: undefined, pendingRematchMode: undefined };

    case "SET_MATCH_POT":
      return {
        ...state,
        matchPot: action.payload.pot,
        matchBet: action.payload.bet,
      };

    case "MATCH_STARTED":
    case "RESTART_GAME": {
      if (action.payload?.state) return action.payload.state;
      return state;
    }

    default:
        return state;
    }
  };

  const nextState = computeNextState();
  if (isRemote) {
    if (action.type === "MATCH_STARTED" || action.type === "RESTART_GAME") {
      return nextState;
    }
    const finalState = { ...nextState };
    if ((action as any).nextTurn) finalState.currentTurn = (action as any).nextTurn;
    if ((action as any).nextSpyIndex !== undefined) finalState.activeSpyIndex = (action as any).nextSpyIndex;
    return finalState;
  }
  return nextState;
}
