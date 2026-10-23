import { useState, useEffect, Dispatch, SetStateAction } from "react";
import type { GameState } from "../types/game";
import { partyService } from "../utils/partyPeer";
import { soundManager } from "../utils/audio";
import {
  getKillerAIMove,
  getDetectiveAIMove,
  getSecretServiceAIMove,
  getThiefAIMove,
  getPoliceAIMove,
  getDuelAIMove,
} from "../utils/aiLogic";

interface UseAiTurnParams {
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState>>;
  isIntroPhase: boolean;
  isLobbyOpen: boolean;
  setSelectedId: (id: string | null) => void;
  setToastMessage: (msg: string | null) => void;
}

export function useAiTurn({
  gameState,
  setGameState,
  isIntroPhase,
  isLobbyOpen,
  setSelectedId,
  setToastMessage,
}: UseAiTurnParams) {
  const [isAIThinking, setIsAIThinking] = useState(false);

  useEffect(() => {
    if (
      isIntroPhase ||
      isLobbyOpen ||
      gameState.winner ||
      gameState.opponent === "ONLINE" ||
      gameState.opponent === "PVP" ||
      Boolean(partyService.roomCode)
    ) {
      return;
    }

    const isAITurn =
      gameState.mode === "SECRET_SERVICE"
        ? gameState.spies
          ? gameState.spies[gameState.activeSpyIndex ?? 0]?.isAI === true
          : false
        : gameState.currentTurn !== gameState.playerRole;

    if (isAITurn) {
      setIsAIThinking(true);
      const AI_TURN_DELAY_MS = 2200;
      const timer = setTimeout(() => {
        setGameState((prev) => {
          if (prev.winner) return prev;
          let nextState = prev;
          if (prev.mode === "LINE_UP") {
            nextState = getDuelAIMove(prev);
          } else if (prev.mode === "SECRET_SERVICE") {
            nextState = getSecretServiceAIMove(prev);
          } else if (prev.mode === "THIEF_HUNT") {
            nextState = prev.currentTurn === "KILLER" ? getThiefAIMove(prev) : getPoliceAIMove(prev);
          } else if (prev.currentTurn === "KILLER") {
            nextState = getKillerAIMove(prev);
          } else {
            nextState = getDetectiveAIMove(prev);
          }

          if (nextState.killCount > prev.killCount) {
            soundManager.play('kill');
          } else if ((nextState.trophiesKiller ?? 0) > (prev.trophiesKiller ?? 0)) {
            soundManager.play('steal');
          } else if (nextState.interrogationRadar !== prev.interrogationRadar || nextState.lastSpyInterrogation !== prev.lastSpyInterrogation) {
            soundManager.play('radar');
          } else if (nextState.blockedShift && nextState.blockedShift !== prev.blockedShift) {
            soundManager.play('patrol');
          } else if (nextState.killerSecretId !== prev.killerSecretId) {
            soundManager.play('disguise');
          } else if (nextState.lastShift !== prev.lastShift && nextState.lastShift !== null) {
            soundManager.play('slide');
          }

          if (nextState.log.length > prev.log.length) {
            const lastLog = nextState.log[nextState.log.length - 1];
            if (lastLog.includes("ошибочно") || lastLog.includes("Ложный") || lastLog.includes("мимо")) {
              setToastMessage(lastLog);
            }
          }

          return nextState;
        });
        setIsAIThinking(false);
        setSelectedId(null);
      }, AI_TURN_DELAY_MS);

      return () => clearTimeout(timer);
    }
  }, [
    isIntroPhase,
    isLobbyOpen,
    gameState.currentTurn,
    gameState.winner,
    gameState.opponent,
    gameState.playerRole,
    gameState.mode,
    gameState.activeSpyIndex,
    gameState.spies,
    setGameState,
    setSelectedId,
    setToastMessage,
  ]);

  return { isAIThinking };
}
