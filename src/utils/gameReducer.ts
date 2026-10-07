import type { GameState } from "../types/game";
import type { GameAction } from "../types/multiplayer";
import {
  shiftBoard,
  accuseCharacter,
  spyCatch,
  spyInterrogate,
  createInitialState,
  isOppositeShift,
} from "./gameLogic";

export function gameReducer(state: GameState, action: GameAction): GameState {
  // Валидация: если игра окончена, разрешаем только рестарт
  if (state.winner && action.type !== "RESTART_GAME") {
    return state;
  }

  switch (action.type) {
    case "SHIFT_BOARD": {
      const { shiftType, index, direction } = action.payload;

      // Валидация анти-отмены
      if (isOppositeShift(state.lastShift, shiftType, index, direction)) {
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

    case "ACCUSE": {
      return accuseCharacter(state, action.payload.targetId);
    }

    case "CAPTURE_SPY": {
      const nextState = spyCatch(state, action.payload.targetId);
      return {
        ...nextState,
        interrogationRadar: null,
        isHotseatCoverOpen: false,
      };
    }

    case "INTERROGATE": {
      const nextState = spyInterrogate(state, action.payload.targetId);
      return {
        ...nextState,
        isHotseatCoverOpen: false,
      };
    }

    case "RESTART_GAME": {
      const {
        modeId,
        opponent,
        playerRole,
        playerCount,
        targetTrophies,
        maxTurns,
      } = action.payload;
      return createInitialState(
        modeId,
        opponent,
        playerRole,
        playerCount,
        targetTrophies,
        maxTurns,
      );
    }

    default:
      return state;
  }
}
