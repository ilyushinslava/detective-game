import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { GameState, GameModeType, Role, OpponentType } from "../types/game";
import { SPY_COLORS } from "../types/game";
import type { GameAction } from "../utils/gameReducer";
import { createInitialState, isRoleChangeTrigger } from "../utils/gameLogic";
import { gameReducer } from "../utils/gameReducer";
import { calculateNextAIMove } from "../utils/aiLogic";
import {
  playShiftSound,
  playEliminateSound,
  playRadarPing,
  playClickSound,
} from "../utils/tvAudio";
import { triggerHaptic } from "../utils/haptics";

export type LocalGamePhase = "ACTION" | "INTERSTITIAL";

export interface UseLocalGameOptions {
  initialMode?: GameModeType;
  initialOpponent?: OpponentType;
  initialRole?: Role;
  betAmount?: number;
  targetTrophies?: number;
  maxTurns?: number;
  profileNickname?: string;
  isPassAndPlay?: boolean;
}

export interface NextPlayerInfo {
  nextRole: Role;
  nextPlayerName: string;
  nextPlayerColor: string;
}

export function resolveNextPlayerInfo(
  state: GameState,
  targetTurn?: Role,
  targetSpyIndex?: number
): NextPlayerInfo {
  const currentRole = targetTurn ?? state.currentTurn;

  if (state.mode === "SECRET_SERVICE" && state.spies && state.spies.length > 0) {
    const spyIdx = targetSpyIndex ?? state.activeSpyIndex ?? 0;
    const safeIdx = ((spyIdx % state.spies.length) + state.spies.length) % state.spies.length;
    const spy = state.spies[safeIdx];
    const color = SPY_COLORS[safeIdx % SPY_COLORS.length]?.text || "text-blue-400";

    return {
      nextRole: safeIdx === 0 ? "KILLER" : "DETECTIVE",
      nextPlayerName: spy?.name || `Агент ${safeIdx + 1}`,
      nextPlayerColor: color,
    };
  }

  if (state.mode === "MANIAC_VS_OPERATIVE") {
    return {
      nextRole: currentRole,
      nextPlayerName: currentRole === "KILLER" ? "Маньяк" : "Оперативник",
      nextPlayerColor: currentRole === "KILLER" ? "text-red-400" : "text-blue-400",
    };
  }

  if (state.mode === "THIEF_HUNT") {
    return {
      nextRole: currentRole,
      nextPlayerName: currentRole === "KILLER" ? "Грабитель" : "Полиция",
      nextPlayerColor: currentRole === "KILLER" ? "text-red-400" : "text-blue-400",
    };
  }

  if (state.mode === "LINE_UP") {
    return {
      nextRole: currentRole,
      nextPlayerName: currentRole === "KILLER" ? "Подозреваемый" : "Следователь",
      nextPlayerColor: currentRole === "KILLER" ? "text-red-400" : "text-blue-400",
    };
  }

  return {
    nextRole: currentRole,
    nextPlayerName: currentRole === "KILLER" ? "Бандит" : "Инспектор",
    nextPlayerColor: currentRole === "KILLER" ? "text-red-400" : "text-blue-400",
  };
}

export function useLocalGame({
  initialMode = "MANIAC_VS_OPERATIVE",
  initialOpponent = "PVP",
  initialRole = "KILLER",
  betAmount = 0,
  targetTrophies,
  maxTurns,
  profileNickname,
  isPassAndPlay = true,
}: UseLocalGameOptions = {}) {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialState(
      initialMode,
      initialOpponent,
      initialRole,
      betAmount,
      targetTrophies,
      maxTurns,
      profileNickname
    )
  );

  const [localPhase, setLocalPhase] = useState<LocalGamePhase>("ACTION");
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const isAITurn = useMemo(() => {
    if (gameState.opponent !== "AI" || gameState.winner) return false;
    if (gameState.mode === "SECRET_SERVICE") {
      const activeSpy = gameState.spies?.[gameState.activeSpyIndex ?? 0];
      return activeSpy?.isAI === true;
    }
    return gameState.currentTurn !== gameState.playerRole;
  }, [
    gameState.opponent,
    gameState.winner,
    gameState.mode,
    gameState.spies,
    gameState.activeSpyIndex,
    gameState.currentTurn,
    gameState.playerRole,
  ]);

  // Слушатель хода искусственного интеллекта (Solo AI Mode)
  useEffect(() => {
    if (!isAITurn) {
      setIsAIThinking(false);
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
      return;
    }

    setIsAIThinking(true);
    // Имитация раздумий бота (1.5 - 2.5 сек)
    const thinkingDelay = 1500 + Math.floor(Math.random() * 800);
    aiTimerRef.current = setTimeout(() => {
      setGameState((prev) => {
        if (prev.winner) return prev;
        const nextState = calculateNextAIMove(prev);

        // Процедурные звуковые эффекты для хода бота
        try {
          if (nextState.killCount > prev.killCount) {
            playEliminateSound();
          } else if ((nextState.trophiesKiller ?? 0) > (prev.trophiesKiller ?? 0)) {
            playEliminateSound();
          } else if (
            nextState.interrogationRadar !== prev.interrogationRadar ||
            nextState.lastSpyInterrogation !== prev.lastSpyInterrogation
          ) {
            playRadarPing();
          } else if (nextState.lastShift !== prev.lastShift && nextState.lastShift !== null) {
            playShiftSound();
          }
        } catch {}

        return nextState;
      });
      setIsAIThinking(false);
    }, thinkingDelay);

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [
    isAITurn,
    gameState.currentTurn,
    gameState.activeSpyIndex,
    gameState.winner,
  ]);

  const nextPlayerInfo = useMemo<NextPlayerInfo>(() => {
    return resolveNextPlayerInfo(gameState);
  }, [gameState]);

  const dispatchLocalAction = useCallback(
    (action: GameAction) => {
      // Блокировка действий живого игрока во время раздумий бота
      if (isAIThinking) return;

      // 1. Процедурное аудио из tvAudio.ts для оффлайн режима
      try {
        switch (action.type) {
          case "SHIFT_BOARD":
            playShiftSound();
            break;
          case "KILL_CHARACTER":
          case "TARGET_KILL":
          case "CAPTURE_SPY":
          case "ARREST":
            playEliminateSound();
            break;
          case "INTERROGATE":
          case "INTERROGATE_SPY":
          case "CHECK_ALIBI":
          case "ASK_QUESTION":
          case "DUEL_ASK_QUESTION":
            playRadarPing();
            break;
          case "END_TURN":
            playClickSound();
            break;
        }
      } catch {}

      // 2. Чистое локальное выполнение редьюсера
      setGameState((prev) => {
        const nextState = gameReducer(prev, action);

        // 3. Проверка передачи хода для фазы INTERSTITIAL (только при триггерах смены роли: убийство, арест, конспирация)
        const isPassMode = isPassAndPlay && prev.opponent === "PVP";
        const turnChanged = nextState.currentTurn !== prev.currentTurn;
        const spyChanged =
          nextState.mode === "SECRET_SERVICE" &&
          nextState.activeSpyIndex !== prev.activeSpyIndex;
        const isRoleChange = isRoleChangeTrigger(prev, nextState, action);

        if (isPassMode && (turnChanged || spyChanged) && isRoleChange && !nextState.winner) {
          setLocalPhase("INTERSTITIAL");
        } else if (nextState.winner) {
          setLocalPhase("ACTION");
        }

        return nextState;
      });
    },
    [isPassAndPlay, isAIThinking]
  );

  const dismissInterstitial = useCallback(() => {
    try {
      triggerHaptic("medium");
    } catch {}
    try {
      playClickSound();
    } catch {}
    setLocalPhase("ACTION");
  }, []);

  const resetLocalGame = useCallback(
    (
      mode: GameModeType = initialMode,
      opponent: OpponentType = initialOpponent,
      role: Role = initialRole
    ) => {
      setGameState(
        createInitialState(
          mode,
          opponent,
          role,
          betAmount,
          targetTrophies,
          maxTurns,
          profileNickname
        )
      );
      setLocalPhase("ACTION");
    },
    [initialMode, initialOpponent, initialRole, betAmount, targetTrophies, maxTurns, profileNickname]
  );

  return {
    gameState,
    setGameState,
    localPhase,
    setLocalPhase,
    isBlindfoldOpen: localPhase === "INTERSTITIAL",
    isAIThinking,
    nextPlayerInfo,
    dispatchLocalAction,
    dismissInterstitial,
    resetLocalGame,
  };
}
