import { useEffect, useState, useRef } from "react";
import type { GameState, GameModeType, Role } from "../types/game";
import type { UserProfile } from "../types/profile";
import { partyService } from "./partyPeer";
import { soundManager } from "./audio";
import { safeLocalStorage, safeSessionStorage } from "./storage";

interface UseMultiplayerParams {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  profile: UserProfile;
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
    const isTvMode =
      typeof window !== "undefined" &&
      (window.location.search.includes("clientType") ||
        Boolean(safeLocalStorage.getItem("tv_session_party_state")));
    if (isTvMode || gameState.opponent !== "ONLINE") {
      return;
    }

    const subscribeOrAssign = (event: string, legacyProp: string, handler: any): (() => void) => {
      if (typeof partyService.subscribe === "function") {
        return partyService.subscribe(event, handler);
      }
      (partyService as any)[legacyProp] = handler;
      return () => {
        (partyService as any)[legacyProp] = null;
      };
    };

    const unsubSyncState = subscribeOrAssign("syncState", "onSyncState", (state: any, role?: Role, status?: string) => {
      if (state) {
        if (state.mode) {
          setActiveMode(state.mode);
        }
        setGameState((prev) => {
          if (state.lastShift && JSON.stringify(state.lastShift) !== JSON.stringify(prev.lastShift)) {
            soundManager.play("slide");
          } else if ((state.killCount ?? 0) > (prev.killCount ?? 0)) {
            soundManager.play("kill");
          } else if ((state.trophiesKiller ?? 0) > (prev.trophiesKiller ?? 0)) {
            soundManager.play("steal");
          }
          return {
            ...state,
            opponent: "ONLINE",
            playerRole: role || prev.playerRole,
          };
        });
      }
      if (status === "READY_TO_START") {
        soundManager.play("confirm");
        setIsLobbyOpen(false);
        setHasStartedEver(true);
        setIsIntroPhase(true);
      } else if (status === "PLAYING") {
        setIsLobbyOpen(false);
        setHasStartedEver(true);
        setIsIntroPhase(false);
      }
      if (status === "FINISHED" && state?.winner) {
        setToastMessage(`Матч завершен. Победил: ${state.winner}`);
      }
    });

    const unsubRoomStatus = subscribeOrAssign("roomStatus", "onRoomStatus", (data: any) => {
      const status = typeof data === "string" ? data : data?.status;
      if (status === "WAITING") {
        setIsOpponentConnected(true);
        setOpponentDisconnectedNotice(false);
        if (partyService.isHost === false) {
          // Гость подключен и ждет старта
        }
      } else if (status === "EMPTY") {
        safeSessionStorage.removeItem("mp_session");
        setIsLobbyOpen(true);
        setHasStartedEver(false);
      } else if (status === "READY_TO_START") {
        soundManager.play("confirm");
        setIsOpponentConnected(true);
        setOpponentDisconnectedNotice(false);
        setIsLobbyOpen(false);
        setHasStartedEver(true);
        setIsIntroPhase(true);
        setGameState((prev) => ({ ...prev, opponent: "ONLINE" }));
      } else if (status === "PLAYING") {
        setIsOpponentConnected(true);
        setOpponentDisconnectedNotice(false);
        setIsLobbyOpen(false);
        setHasStartedEver(true);
        setIsIntroPhase(false);
        setGameState((prev) => ({ ...prev, opponent: "ONLINE" }));
      }
    });

    const unsubAllPlayersReady = subscribeOrAssign("allPlayersReady", "onAllPlayersReady", () => {
      setIsLobbyOpen(false);
      setHasStartedEver(true);
      setIsIntroPhase(false);
    });

    const unsubPresenceChanged = subscribeOrAssign("presenceChanged", "onPresenceChanged", (connected: boolean) => {
      setIsOpponentConnected(connected);
      setOpponentDisconnectedNotice(!connected);
      if (connected) {
        soundManager.play("confirm");
      }
    });

    const unsubAction = subscribeOrAssign("action", "onAction", (action: any) => {
      if (!action) return;
      if (action.type === "ALL_PLAYERS_READY") {
        setIsLobbyOpen(false);
        setHasStartedEver(true);
        setIsIntroPhase(false);
        return;
      }
      if (action.type === "TURN_TIMEOUT") {
        setToastMessage("Время хода истекло. Ход передан оппоненту.");
        dispatchAction({ type: "TURN_TIMEOUT", senderId: "remote" });
        return;
      }
      if (action.type === "REQUEST_RESTART") {
        dispatchAction({ ...action, senderId: "remote" });
      } else if (action.type === "REJECT_RESTART") {
        dispatchAction({ ...action, senderId: "remote" });
        setToastMessage("Соперник отклонил предложение о реванше");
      } else if (action.type === "PLAYER_DISCONNECTED") {
        setOpponentDisconnectedNotice(true);
      } else if (action.type === "PLAYER_RECONNECTED") {
        setOpponentDisconnectedNotice(false);
      } else if (action.type === "MATCH_OVER") {
        if (action.reason === "OPPONENT_ABANDONED") {
          setToastMessage(action.message || "Соперник отключился. Техническая победа.");
          setGameState((prev) => ({
            ...prev,
            winner: action.winner,
            gameEndReason: "OPPONENT_ABANDONED",
          }));
        }
      } else if (action.type === "OPPONENT_LEFT") {
        setOpponentDisconnectedNotice(true);
      }
    });

    return () => {
      unsubSyncState();
      unsubRoomStatus();
      unsubAllPlayersReady();
      unsubPresenceChanged();
      unsubAction();
    };
  }, [gameState.opponent, setGameState, setToastMessage, setIsLobbyOpen, setHasStartedEver, setIsIntroPhase]);

  useEffect(() => {
    if (gameState.restartRequestedBy) {
      setRematchTimer(15);
      if (rematchIntervalRef.current) clearInterval(rematchIntervalRef.current);
      rematchIntervalRef.current = setInterval(() => {
        setRematchTimer((prev) => {
          if (prev <= 1) {
            if (rematchIntervalRef.current) clearInterval(rematchIntervalRef.current);
            dispatchAction({ type: "REJECT_RESTART", senderId: "local" });
            setGameState((state) => ({ ...state, restartRequestedBy: undefined }));
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

    const requestRematch = (mode: "SWAP" | "SAME" | "RANDOM" = "SWAP") => {
      const requestedBy = partyService.isHost ? "HOST" : "GUEST";
      dispatchAction({
        type: "REQUEST_RESTART",
        senderId: "local",
        payload: { rematchMode: mode, requestedBy },
      });
      setGameState((prev) => ({
        ...prev,
        restartRequestedBy: requestedBy,
      }));
    };

  const handleExitToMenu = () => {
    setOpponentDisconnectedNotice(false);
    partyService.disconnect();
    safeSessionStorage.removeItem("mp_session");
    setIsLobbyOpen(true);
    setHasStartedEver(false);
    setIsIntroPhase(false);
    matchResultRecordedRef.current = false;
    setGameState((prev) => ({
      ...prev,
      opponent: "AI",
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
      requestRematch,
      handleExitToMenu,
  };
}
