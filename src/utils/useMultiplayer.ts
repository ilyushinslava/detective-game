import { useEffect, useState, useRef } from "react";
import type { GameState, GameModeType, Role } from "../types/game";
import type { PlayerProfile } from "./usePlayerProfile";
import { partyService } from "./partyPeer";

interface UseMultiplayerParams {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  profile: PlayerProfile;
  setActiveMode: React.Dispatch<React.SetStateAction<GameModeType>>;
  setIsLobbyOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setHasStartedEver: React.Dispatch<React.SetStateAction<boolean>>;
  setIsIntroPhase: React.Dispatch<React.SetStateAction<boolean>>;
  setToastMessage: React.Dispatch<React.SetStateAction<string | null>>;
  dispatchAction: (action: any) => void;
  matchResultRecordedRef: React.MutableRefObject<boolean>;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedInspectorChoiceId: React.Dispatch<React.SetStateAction<string | null>>;
  setSecondsElapsed: React.Dispatch<React.SetStateAction<number>>;
  setIsPauseOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useMultiplayer({
  gameState,
  setGameState,
  profile,
  setActiveMode,
  setIsLobbyOpen,
  setHasStartedEver,
  setIsIntroPhase,
  setToastMessage,
  dispatchAction,
  matchResultRecordedRef,
  setSelectedId,
  setSelectedInspectorChoiceId,
  setSecondsElapsed,
  setIsPauseOpen,
}: UseMultiplayerParams) {
  const [isOpponentConnected, setIsOpponentConnected] = useState(true);
  const [opponentDisconnectedNotice, setOpponentDisconnectedNotice] = useState(false);
  const [rematchTimer, setRematchTimer] = useState(15);
  const rematchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handleResume = () => {
      if (document.visibilityState === "visible" && gameState.opponent === "ONLINE" && partyService.roomCode) {
        partyService.ensureConnection();
      }
    };

    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("focus", handleResume);

    return () => {
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("focus", handleResume);
    };
  }, [gameState.opponent]);

  useEffect(() => {
    if (gameState.opponent !== "ONLINE") return;

    partyService.onSyncState = (state: any, role?: Role, status?: string) => {
      if (state) {
        setGameState((prev) => ({
          ...state,
          opponent: "ONLINE",
          playerRole: role || prev.playerRole,
        }));
      }
      if (status === "FINISHED" && state?.winner) {
        setToastMessage(`Матч завершен. Победил: ${state.winner}`);
      }
    };

    partyService.onRoomStatus = (data: any) => {
      const status = typeof data === "string" ? data : data?.status;
      if (status === "WAITING") {
        setIsOpponentConnected(true);
        setOpponentDisconnectedNotice(false);
      }
    };

    partyService.onPresenceChanged = (connected: boolean) => {
      setIsOpponentConnected(connected);
      if (!connected) {
        setOpponentDisconnectedNotice(true);
      } else {
        setOpponentDisconnectedNotice(false);
      }
    };

    partyService.onAction = (action: any) => {
      if (!action) return;
      if (action.type === "REQUEST_RESTART") {
        setGameState((prev) => ({
          ...prev,
          restartRequestedBy: action.payload?.requestedBy || "GUEST",
        }));
      } else if (action.type === "REJECT_RESTART") {
        setGameState((prev) => ({ ...prev, restartRequestedBy: undefined }));
        setToastMessage("Соперник отклонил предложение о реванше");
      } else if (action.type === "OPPONENT_LEFT") {
        setOpponentDisconnectedNotice(true);
      }
    };

    return () => {
      partyService.onSyncState = null;
      partyService.onRoomStatus = null;
      partyService.onPresenceChanged = null;
      partyService.onAction = null;
    };
  }, [gameState.opponent, setGameState, setToastMessage]);

  useEffect(() => {
    if (gameState.restartRequestedBy) {
      setRematchTimer(15);
      if (rematchIntervalRef.current) clearInterval(rematchIntervalRef.current);
      rematchIntervalRef.current = setInterval(() => {
        setRematchTimer((prev) => {
          if (prev <= 1) {
            if (rematchIntervalRef.current) clearInterval(rematchIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (rematchIntervalRef.current) clearInterval(rematchIntervalRef.current);
    }
    return () => {
      if (rematchIntervalRef.current) clearInterval(rematchIntervalRef.current);
    };
  }, [gameState.restartRequestedBy]);

  const acceptRestart = () => {
    dispatchAction({ type: "CONFIRM_RESTART", senderId: "local" });
    setGameState((prev) => ({ ...prev, restartRequestedBy: undefined }));
  };

  const rejectRestart = () => {
    dispatchAction({ type: "REJECT_RESTART", senderId: "local" });
    setGameState((prev) => ({ ...prev, restartRequestedBy: undefined }));
  };

  const handleExitToMenu = () => {
    partyService.disconnect();
    setIsLobbyOpen(true);
    setHasStartedEver(false);
    setIsIntroPhase(false);
    matchResultRecordedRef.current = false;
    setGameState((prev) => ({
      ...prev,
      winner: null,
      restartRequestedBy: undefined,
    }));
  };

  return {
    isOpponentConnected,
    opponentDisconnectedNotice,
    setOpponentDisconnectedNotice,
    rematchTimer,
    acceptRestart,
    rejectRestart,
    handleExitToMenu,
  };
}
