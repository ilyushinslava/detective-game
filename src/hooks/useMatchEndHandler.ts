import { useEffect, useRef, type MutableRefObject } from "react";
import { soundManager } from "../utils/audio";
import { triggerHaptic } from "../utils/haptics";
import { partyService } from "../utils/partyPeer";
import { createMatchId } from "../utils/matchRewards";
import type { GameState } from "../types/game";

export interface MatchDetails {
  mode?: string;
  winnerRole?: string;
  role?: string;
  durationSeconds?: number;
  mmrDelta?: number;
  isOnline?: boolean;
  isTvParty?: boolean;
  isFlawless?: boolean;
  shiftsCount?: number;
  /** UUID матча — ключ идемпотентности награды/MMR */
  matchId?: string;
}

export interface UseMatchEndHandlerParams {
  gameState: GameState;
  matchResultRecordedRef: MutableRefObject<boolean>;
  awardPrize?: (amount: number) => void;
  recordMatchResult: (
    isWin: boolean,
    details?: MatchDetails
  ) => Promise<{ newMmr?: number; mmrDelta: number } | void> | void;
  secondsElapsed?: number;
  onRatingCalculated?: (ratingInfo: { newMmr?: number; mmrDelta: number; isWin: boolean }) => void;
}

export function useMatchEndHandler({
  gameState,
  matchResultRecordedRef,
  awardPrize,
  recordMatchResult,
  secondsElapsed,
  onRatingCalculated,
}: UseMatchEndHandlerParams) {
  // Стабильный UUID текущего матча: генерируется один раз и служит ключом
  // идемпотентности для record_match_result (повтор не начислит награду).
  const matchIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Аннулированный матч (оба игрока оффлайн) не имеет победителя:
    // победа/поражение и запись результата в Supabase не выполняются.
    const isAnnulledMatch =
      gameState.gameEndReason === "MATCH_ANNULLED" ||
      gameState.gameResult?.reason === "DRAW_DISCONNECT";
    if (isAnnulledMatch) {
      return;
    }

    if (gameState.winner && !matchResultRecordedRef.current) {
      // Защита от повторной фиксации результата матча
      matchResultRecordedRef.current = true;
      if (!matchIdRef.current) {
        matchIdRef.current = createMatchId();
      }

      let isLocalWin = false;
      let localRole = gameState.playerRole || "DETECTIVE";

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
        localRole = "DETECTIVE";
      } else {
        isLocalWin =
          gameState.winner === gameState.playerRole ||
          (gameState.playerRole === "DETECTIVE" && gameState.winner === "DETECTIVE");
      }

      soundManager.play(isLocalWin ? "win" : "lose");
      triggerHaptic(isLocalWin ? "success" : "error");

      if (gameState.opponent === "ONLINE" && isLocalWin && awardPrize) {
        awardPrize(gameState.matchPot || 0);
      }

      // Расчет дельты рейтинга (+25 за победу, -20 за поражение)
      const mmrDelta = isLocalWin ? 25 : -20;

      const matchDetails: MatchDetails = {
        mode: gameState.mode,
        winnerRole: gameState.winner,
        role: localRole,
        // Фактическая длительность матча (без искусственного завышения)
        durationSeconds: secondsElapsed,
        mmrDelta,
        isOnline: gameState.opponent === "ONLINE",
        isTvParty: false,
        isFlawless: isLocalWin && (gameState.playerRole === "DETECTIVE" ? (gameState.killCount || 0) === 0 : true),
        // turnCount не входит в GameState, но может приходить из внешнего стора
        shiftsCount: (gameState as GameState & { turnCount?: number }).turnCount || 0,
        matchId: matchIdRef.current,
      };

      // Фиксация результатов матча (Supabase + локальный офлайн-кэш)
      const resPromise = recordMatchResult(isLocalWin, matchDetails);

      if (onRatingCalculated) {
        if (resPromise && typeof (resPromise as any).then === "function") {
          (resPromise as Promise<{ newMmr?: number; mmrDelta: number } | void>)
            .then((res) => {
              onRatingCalculated({
                newMmr: res?.newMmr,
                mmrDelta,
                isWin: isLocalWin,
              });
            })
            .catch(() => {
              onRatingCalculated({
                mmrDelta,
                isWin: isLocalWin,
              });
            });
        } else {
          onRatingCalculated({
            mmrDelta,
            isWin: isLocalWin,
          });
        }
      }
    }
  }, [
    gameState.winner,
    gameState.gameEndReason,
    gameState.gameResult,
    gameState.opponent,
    gameState.mode,
    gameState.playerRole,
    gameState.spies,
    gameState.spyTargetTrophies,
    secondsElapsed,
    awardPrize,
    recordMatchResult,
    matchResultRecordedRef,
    onRatingCalculated,
  ]);
}
