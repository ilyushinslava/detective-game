import type { GameState } from "../types/game";
import type { GameAction } from "../types/multiplayer";
import { DUEL_QUESTIONS } from "../constants/duelQuestions";
import { DUEL_CHARACTERS } from "../constants/duelCharacters";
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
    "MATCH_STARTED", "RESTART_GAME", "REQUEST_RESTART", 
    "CONFIRM_RESTART", "REJECT_RESTART", "SET_MATCH_POT", "PLAYER_READY", 
    "SET_INSPECTOR_ROLE", "CLEANUP"
  ];
  
  // Авторитетный сервер сам валидирует очередность. На клиентах блокировку не делаем.

  const computeNextState = (): GameState => {
    switch (action.type) {
    case "SHIFT_BOARD": {
      const { shiftType, index, direction } = action.payload;

      // Блокируем анти-отмену ТОЛЬКО для локальных ходов. Удаленные ходы применяются безусловно.
      if (
        !isRemote &&
        isOppositeShift(state.lastShift, shiftType, index, direction)
      ) {
        return state;
      }

      const newBoard = shiftBoard(state.board, shiftType, index, direction);
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
        log: [...state.log, actionText],
      };
    }

    case "KILL_CHARACTER":
      return killCharacter(state, action.payload.targetId);
    case "ROB_NEIGHBOR":
      return robNeighbor(state, action.payload.targetId);
    case "ACCUSE":
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
      const nextSecretId = (action.payload as any)?.nextSecretId;
      if (nextSecretId && result.justCaughtSpyId && nextSpies) {
        nextSpies = nextSpies.map((s) =>
          s.id === result.justCaughtSpyId ? { ...s, secretId: nextSecretId } : s
        );
      }

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
      const { targetId } = action.payload;
      const currentRole = state.currentTurn;
      const targetSecretId = currentRole === "DETECTIVE" ? state.killerSecretId : state.detectiveSecretId;
      const roleName = currentRole === "DETECTIVE" ? "Следователь" : "Подозреваемый";

      if (targetId === targetSecretId) {
        return {
          ...state,
          winner: currentRole,
          log: [
            ...state.log,
            `Точное обвинение! ${roleName} вычислил личность оппонента! Победа!`,
          ],
        };
      }

      const nextTurn = currentRole === "DETECTIVE" ? "KILLER" : "DETECTIVE";
      const currentPenalties = state.duelPenalties || { DETECTIVE: 0, KILLER: 0 };
      const currentAccused = state.accusedTargets || { DETECTIVE: [], KILLER: [] };

      return {
        ...state,
        duelPenalties: {
          ...currentPenalties,
          [currentRole]: currentPenalties[currentRole] + 1,
        },
        accusedTargets: {
          ...currentAccused,
          [currentRole]: [...(currentAccused[currentRole] || []), targetId],
        },
        currentTurn: nextTurn,
        log: [
          ...state.log,
          `Ложное обвинение! ${roleName} получает +1 штраф. Ход переходит оппоненту.`,
        ],
      };
    }

    case "REQUEST_RESTART":
      return { ...state, restartRequestedBy: action.payload.requestedBy };

    case "REJECT_RESTART":
      return { ...state, restartRequestedBy: null };

    case "CONFIRM_RESTART":
      return { ...state, restartRequestedBy: null };

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
