import { useEffect, MutableRefObject } from "react";
import { soundManager } from "../utils/audio";
import { triggerHaptic } from "../utils/haptics";
import { partyService } from "../utils/partyPeer";
import type { GameState } from "../types/game";

interface UseMatchEndHandlerParams {
  gameState: GameState;
  matchResultRecordedRef: MutableRefObject<boolean>;
  awardPrize: (amount: number) => void;
  recordMatchResult: (isWin: boolean) => void;
}

export function useMatchEndHandler({
  gameState,
  matchResultRecordedRef,
  awardPrize,
  recordMatchResult,
}: UseMatchEndHandlerParams) {
  useEffect(() => {
    if (gameState.winner && !matchResultRecordedRef.current) {
      soundManager.play(gameState.winner === gameState.playerRole ? "win" : "lose");
      triggerHaptic("success");

      let isLocalWin = false;
      if (gameState.mode === "SECRET_SERVICE") {
        const mySpyIndex =
          gameState.opponent === "ONLINE"
            ? partyService.isHost
              ? 0
              : 1
            : (gameState.activeSpyIndex ?? 0);
        const mySpy = gameState.spies?.[mySpyIndex];
        isLocalWin =
          (mySpy?.trophies ?? 0) >= (gameState.spyTargetTrophies ?? 3);
      } else {
        isLocalWin = gameState.winner === gameState.playerRole;
      }

      if (gameState.opponent === "ONLINE") {
        if (isLocalWin) {
          awardPrize(gameState.matchPot || 0);
        }
        recordMatchResult(isLocalWin);
      } else {
        recordMatchResult(isLocalWin);
      }
      matchResultRecordedRef.current = true;
    }
  }, [
    gameState.winner,
    gameState.opponent,
    gameState.mode,
    gameState.playerRole,
    gameState.spies,
    gameState.spyTargetTrophies,
    awardPrize,
    recordMatchResult,
    matchResultRecordedRef,
  ]);
}
