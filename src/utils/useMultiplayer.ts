import { useState, useEffect, type Dispatch, type SetStateAction, type MutableRefObject } from "react";
import { partyService } from "./partyPeer";
import { createInitialState } from "./gameLogic";
import { gameReducer } from "./gameReducer";
import { soundManager } from "./audio";
import type { GameState, Role, GameModeType } from "../types/game";
import type { GameAction } from "../types/multiplayer";
import type { UserProfile } from "../types/profile";

interface UseMultiplayerParams {
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState>>;
  profile: UserProfile;
  setActiveMode: Dispatch<SetStateAction<GameModeType>>;
  setIsLobbyOpen: Dispatch<SetStateAction<boolean>>;
  setHasStartedEver: Dispatch<SetStateAction<boolean>>;
  setIsIntroPhase: Dispatch<SetStateAction<boolean>>;
  setToastMessage: Dispatch<SetStateAction<string | null>>;
  dispatchAction: (action: GameAction) => void;
  matchResultRecordedRef: MutableRefObject<boolean>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setSelectedInspectorChoiceId: Dispatch<SetStateAction<string | null>>;
  setSecondsElapsed: Dispatch<SetStateAction<number>>;
  setIsPauseOpen: Dispatch<SetStateAction<boolean>>;
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

  useEffect(() => {
    // Предотвращение ложного автозапуска игры при F5
    // Сессия не восстанавливается вслепую, пользователь всегда встречает главное меню
    const saved = sessionStorage.getItem("mp_session");
    if (saved) {
      try {
        const { mode: savedMode } = JSON.parse(saved);
        if (savedMode) {
          setActiveMode(savedMode);
        }
      } catch (e) {
        sessionStorage.removeItem("mp_session");
      }
    }
  }, []);

  useEffect(() => {
    if (gameState.opponent === "ONLINE" && partyService.roomCode) {
      sessionStorage.setItem(
        "mp_session",
        JSON.stringify({
          roomCode: partyService.roomCode,
          myClientId: partyService.myClientId,
          isHost: partyService.isHost,
          playerRole: gameState.playerRole,
          mode: gameState.mode,
          nickname: profile.nickname,
        })
      );
    }
  }, [gameState.opponent, gameState.playerRole, gameState.mode, profile.nickname]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const isHost = partyService.isHost;
    if (gameState.restartRequestedBy === (isHost ? "HOST" : "GUEST")) {
      setRematchTimer(15);
      timer = setInterval(() => {
        setRematchTimer((prev) => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            dispatchAction({ type: "REJECT_RESTART", senderId: "local" });
            setGameState((s) => ({ ...s, restartRequestedBy: undefined }));
            setToastMessage("Время ожидания реванша истекло");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setRematchTimer(15);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState.restartRequestedBy]);

  useEffect(() => {
    partyService.onSyncState = (serverGameState: any, role?: Role, status?: string) => {
      if (!serverGameState) return;
      partyService.lastSyncedState = serverGameState;

      const confirmedRole =
        role ||
        (partyService as any).role ||
        serverGameState.playerRole ||
        (partyService.isHost ? "KILLER" : "DETECTIVE");
      (partyService as any).role = confirmedRole;

      if (serverGameState.mode) {
        setActiveMode(serverGameState.mode);
      }

      setGameState((prev) => ({
        ...serverGameState,
        mode: serverGameState.mode || prev.mode,
        opponent: "ONLINE",
        playerRole: confirmedRole,
        inspectorChoices: serverGameState.inspectorChoices || prev.inspectorChoices,
      }));

      setIsOpponentConnected(true);
      setOpponentDisconnectedNotice(false);
      const effectiveStatus = status || serverGameState.status;
      setIsLobbyOpen(false);
      setHasStartedEver(true);
      if (effectiveStatus === "PLAYING") {
        setIsIntroPhase(false);
      } else {
        setIsIntroPhase(true);
      }
    };

    partyService.onRoomStatus = (statusData: any) => {
      const status = typeof statusData === "string" ? statusData : statusData?.status;
      if (status === "PLAYING") {
        setIsIntroPhase(false);
      }
    };

    partyService.onAllPlayersReady = () => {
      setIsIntroPhase(false);
    };

    partyService.onAction = (action: any) => {
      if (!action) return;
      if (action.type === "OPPONENT_LEFT") {
        setIsOpponentConnected(false);
        if (gameState.opponent === "ONLINE" && Boolean(partyService.roomCode)) {
          setOpponentDisconnectedNotice(true);
        }
        return;
      }
      if (action.type === "MATCH_STARTED" || action.type === "RESTART_GAME") {
        matchResultRecordedRef.current = false;
        const incomingState = action.payload?.state || action.payload;
        if (incomingState && incomingState.board) {
          setGameState((prev) => ({
            ...incomingState,
            mode: incomingState.mode || prev.mode,
            opponent: "ONLINE",
            playerRole: (partyService as any).role || prev.playerRole,
            winner: null,
            restartRequestedBy: undefined,
          }));
          if (incomingState.mode) {
            setActiveMode(incomingState.mode);
          }
        }
        setIsIntroPhase(false);
        setSelectedId(null);
        setSelectedInspectorChoiceId(null);
        setSecondsElapsed(0);
        return;
      }
      if (action.type === "ALL_PLAYERS_READY") {
        setIsIntroPhase(false);
        return;
      }
      if (action.type === "PLAYER_READY" || action.type === "PLAYER_READY_UPDATE") {
        return;
      }

      switch (action.type) {
        case "KILL_CHARACTER":
          soundManager.play("kill");
          break;
        case "ACCUSE":
          soundManager.play("arrest");
          break;
        case "SHIFT_BOARD":
          soundManager.play("shift");
          break;
        case "DISGUISE":
        case "FAST_DISGUISE":
          soundManager.play("disguise");
          setToastMessage("Личность успешно изменена");
          break;
        case "ROB_NEIGHBOR":
          soundManager.play("interrogate");
          break;
        case "CAPTURE_SPY":
          soundManager.play("arrest");
          break;
        default:
          break;
      }

      setGameState((prev) => gameReducer(prev, { ...action, senderId: "remote" }));
    };

    partyService.onPresenceChanged = (connected: boolean) => {
      setIsOpponentConnected(connected);
      if (connected) {
        setOpponentDisconnectedNotice(false);
      } else {
        if (gameState.opponent === "ONLINE" && Boolean(partyService.roomCode)) {
          setOpponentDisconnectedNotice(true);
        }
      }
    };

    return () => {};
  }, [gameState.opponent]);

  const acceptRestart = () => {
    if (gameState.opponent === "ONLINE") {
      partyService.sendAction({ type: "CONFIRM_RESTART", senderId: partyService.myClientId } as any);
      setGameState((prev) => ({ ...prev, restartRequestedBy: undefined }));
      setSelectedId(null);
      return;
    }
    dispatchAction({ type: "CONFIRM_RESTART", senderId: "local" });
  };

  const rejectRestart = () => {
    if (gameState.opponent === "ONLINE") {
      partyService.sendAction({ type: "REJECT_RESTART", senderId: partyService.myClientId } as any);
    } else {
      dispatchAction({ type: "REJECT_RESTART", senderId: "local" });
    }
    setGameState((prev) => ({ ...prev, restartRequestedBy: undefined }));
  };

  const handleExitToMenu = async () => {
    setOpponentDisconnectedNotice(false);
    partyService.disconnect();
    sessionStorage.removeItem("mp_session");
    setGameState(createInitialState("SKHVATKA", "AI", "DETECTIVE", 3, 3, 16, profile.nickname));
    setHasStartedEver(false);
    setIsPauseOpen(false);
    setIsLobbyOpen(true);
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
