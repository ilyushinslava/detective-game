import type { GameState } from "../types/game";
import type { GameAction } from "../types/multiplayer";
import {
  shiftBoard,
  accuseCharacter,
  spyCatch,
  spyInterrogate,
  createInitialState,
  isOppositeShift,
  killCharacter,
  robNeighbor,
  escapeManiac,
  fastDisguise,
  disguiseKiller,
  exonerateFromHand,
  cleanupDeadCharacters,
  swearInOfficer,
} from "./gameLogic";

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.winner && action.type !== "RESTART_GAME") {
    return state;
  }

  const isRemote = action.senderId === "remote";

  const computeNextState = (): GameState => {
    switch (action.type) {
      // Специальный экшен для подготовки анимации сдвига (только обновляет lastShift)
    case "PRE_SHIFT": {
      return {
        ...state,
        lastShift: {
          type: (action.payload as any).shiftType,
          index: (action.payload as any).index,
          direction: (action.payload as any).direction,
        },
      };
    }

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
        currentRoleName = state.currentTurn === "KILLER" ? "ВОР" : "СЫЩИК";
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
      const result = spyCatch(state, action.payload.targetId);

      // Жестко применяем переданный индекс или безопасно инкрементируем
      const explicitNext = (action.payload as any).nextSpyIndex;
      const safeNext =
        explicitNext !== undefined
          ? explicitNext
          : ((state.activeSpyIndex ?? 0) + 1) % (state.spies?.length || 1);

      return {
        ...result,
        activeSpyIndex: safeNext,
        detectiveSecretId:
          result.spies?.[safeNext]?.secretId ?? result.detectiveSecretId,
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

    case "RESTART_GAME": {
      if (action.payload.state) return action.payload.state;
    }

    default:
        return state;
    }
  };

  const nextState = computeNextState();
  if (isRemote) {
    const finalState = { ...nextState };
    if (action.nextTurn) finalState.currentTurn = action.nextTurn;
    if (action.nextSpyIndex !== undefined) finalState.activeSpyIndex = action.nextSpyIndex;
    return finalState;
  }
  return nextState;
}
