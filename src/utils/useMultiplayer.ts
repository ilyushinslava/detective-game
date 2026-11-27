import { useEffect, useState, useRef } from "react";
import type { GameState, GameModeType, Role } from "../types/game";
import type { UserProfile } from "../types/profile";
import { partyService } from "./partyPeer";
import { soundManager } from "./audio";
import {
  getMatchAnnulledMessage,
  getServerRejectReasonText,
  getSyncErrorMessage,
  isActionRejectReason,
} from "./serverEvents";
import { safeLocalStorage, safeSessionStorage } from "./storage";

/** Сколько миллисекунд показывается неблокирующая плашка об отказе действия. */
const ACTION_REJECT_NOTICE_MS = 5000;

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
  setIsPauseOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * Основной экран (десктоп-онлайн): именно он проигрывает звук отказа.
   * Мобильный контроллер и ТВ реагируют на отказ инлайн, поэтому им звук не дублируем.
   */
  isPrimaryDisplay?: boolean;
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
  setIsPauseOpen,
  isPrimaryDisplay = true,
}: UseMultiplayerParams) {
  const [isOpponentConnected, setIsOpponentConnected] = useState(true);
  const [opponentDisconnectedNotice, setOpponentDisconnectedNotice] = useState<boolean | string>(false);
  const [isOpponentPermanentlyLeft, setIsOpponentPermanentlyLeft] = useState(false);
  const [rematchTimer, setRematchTimer] = useState(15);
  const rematchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Серверные события (пауза таймера, двойной дисконнект, аннулирование, ошибки) ---
  const [isTurnTimerPaused, setIsTurnTimerPaused] = useState(false);
  const [turnTimerRemainingMs, setTurnTimerRemainingMs] = useState<number | null>(null);
  const [isDualDisconnectPaused, setIsDualDisconnectPaused] = useState(false);
  const [dualDisconnectGraceMs, setDualDisconnectGraceMs] = useState<number | null>(null);
  const [isMatchAnnulled, setIsMatchAnnulled] = useState(false);
  const [matchAnnulledMessage, setMatchAnnulledMessage] = useState<string | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [actionRejectedMessage, setActionRejectedMessage] = useState<string | null>(null);
  const [actionRejectedReason, setActionRejectedReason] = useState<string | null>(null);
  const rejectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchAnnulledRef = useRef(false);
  const isTurnTimerPausedRef = useRef(false);
  const hasTurnTimerRef = useRef(false);

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
      // ВАЖНО: снапшот НЕ должен перетирать уведомление об отказе действия —
      // оно снимается только таймером, новым отказом или выходом в меню.
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
            playerRole: role || state.playerRole || partyService.myRole || prev.playerRole,
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
      if (status === "PLAYING" || status === "READY_TO_START") {
        // Матч идёт: сервер снял паузу двойного дисконнекта после возврата игрока.
        setIsDualDisconnectPaused(false);
        setDualDisconnectGraceMs(null);
      }
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
        // Соединение восстановлено — снимаем баннер паузы двойного дисконнекта.
        setIsDualDisconnectPaused(false);
        setDualDisconnectGraceMs(null);
        soundManager.play("confirm");
      }
    });

    const unsubAction = subscribeOrAssign("action", "onAction", (action: any) => {
      if (!action) return;

      // --- Серверные события пауз и финала ---
      if (action.type === "TURN_TIMER_PAUSED") {
        isTurnTimerPausedRef.current = true;
        hasTurnTimerRef.current = true;
        setIsTurnTimerPaused(true);
        setTurnTimerRemainingMs(
          typeof action.remainingMs === "number" && Number.isFinite(action.remainingMs)
            ? Math.max(0, action.remainingMs)
            : null
        );
        return;
      }
      if (action.type === "TURN_TIMER_RESUMED") {
        isTurnTimerPausedRef.current = false;
        hasTurnTimerRef.current = true;
        setIsTurnTimerPaused(false);
        setTurnTimerRemainingMs(
          typeof action.remainingMs === "number" && Number.isFinite(action.remainingMs)
            ? Math.max(0, action.remainingMs)
            : null
        );
        return;
      }
      if (action.type === "DUAL_DISCONNECT_PAUSE") {
        // Оба игрока оффлайн: показываем паузу матча, не объявляя ложный финал.
        setIsDualDisconnectPaused(true);
        setDualDisconnectGraceMs(
          typeof action.gracePeriodMs === "number" && Number.isFinite(action.gracePeriodMs)
            ? Math.max(0, action.gracePeriodMs)
            : null
        );
        setOpponentDisconnectedNotice(false);
        setIsOpponentPermanentlyLeft(false);
        return;
      }
      if (action.type === "MATCH_ANNULLED") {
        // Идемпотентность: повторное событие не должно дублировать финал или запись результата.
        if (!matchAnnulledRef.current) {
          matchAnnulledRef.current = true;
          matchResultRecordedRef.current = true; // результат не пишем в Supabase
          setMatchAnnulledMessage(getMatchAnnulledMessage(action.reason, action.message));
        }
        setIsMatchAnnulled(true);
        setIsTurnTimerPaused(false);
        isTurnTimerPausedRef.current = false;
        setTurnTimerRemainingMs(null);
        hasTurnTimerRef.current = false;
        setIsDualDisconnectPaused(false);
        setDualDisconnectGraceMs(null);
        setOpponentDisconnectedNotice(false);
        setIsOpponentPermanentlyLeft(false);
        setIsPauseOpen(false);
        setIsIntroPhase(false);
        setIsLobbyOpen(false);
        setGameState((prev) => ({
          ...prev,
          winner: null,
          gameResult: { winner: null, reason: action.reason || "DRAW_DISCONNECT" },
          gameEndReason: "MATCH_ANNULLED",
        }));
        return;
      }
      if (action.type === "SYNC_ERROR") {
        // Сервер шлёт SYNC_ERROR вместе с ACTION_REJECTED на один и тот же обычный
        // отказ действия. Для таких причин тяжёлую модалку десинка не показываем.
        if (!isActionRejectReason(action.reason)) {
          setSyncErrorMessage(getSyncErrorMessage(action.reason));
        }
        return;
      }
      if (action.type === "ACTION_REJECTED") {
        const reason = typeof action.reason === "string" ? action.reason : undefined;
        if (rejectTimerRef.current !== null) {
          clearTimeout(rejectTimerRef.current);
          rejectTimerRef.current = null;
        }
        setActionRejectedReason(reason ?? null);
        setActionRejectedMessage(getServerRejectReasonText(reason));
        rejectTimerRef.current = setTimeout(() => {
          setActionRejectedMessage(null);
          setActionRejectedReason(null);
          rejectTimerRef.current = null;
        }, ACTION_REJECT_NOTICE_MS);
        // Звук отказа — только на основном экране, чтобы не дублировать
        // инлайн-реакции мобильного контроллера и ТВ.
        if (isPrimaryDisplay) {
          soundManager.play("deny");
        }
        return;
      }

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
        setIsOpponentConnected(false);
        setOpponentDisconnectedNotice(true);
      } else if (action.type === "PLAYER_RECONNECTED") {
        setIsOpponentConnected(true);
        setOpponentDisconnectedNotice(false);
      } else if (action.type === "MATCH_OVER") {
        if (action.reason === "OPPONENT_ABANDONED") {
          setIsOpponentConnected(false);
          setIsOpponentPermanentlyLeft(true);
          setOpponentDisconnectedNotice(false);
          setToastMessage(action.message || "Соперник отключился. Техническая победа.");
          setGameState((prev) => ({
            ...prev,
            winner: action.winner,
            gameEndReason: "OPPONENT_ABANDONED",
          }));
        }
      } else if (action.type === "OPPONENT_LEFT") {
        setIsOpponentConnected(false);
        setIsOpponentPermanentlyLeft(true);
        setOpponentDisconnectedNotice(false);
      }
    });

    return () => {
      unsubSyncState();
      unsubRoomStatus();
      unsubAllPlayersReady();
      unsubPresenceChanged();
      unsubAction();
    };
  }, [gameState.opponent, setGameState, setToastMessage, setIsLobbyOpen, setHasStartedEver, setIsIntroPhase, isPrimaryDisplay]);

  // Таймер авто-скрытия отказа обязательно снимаем при размонтировании.
  useEffect(() => {
    return () => {
      if (rejectTimerRef.current !== null) {
        clearTimeout(rejectTimerRef.current);
        rejectTimerRef.current = null;
      }
    };
  }, []);

  // Локальный отсчёт времени хода: идёт только когда сервер не поставил таймер на паузу.
  // Остаток времени не сбрасывается — пауза просто замораживает значение.
  useEffect(() => {
    if (!hasTurnTimerRef.current || isTurnTimerPausedRef.current) return;
    const interval = setInterval(() => {
      setTurnTimerRemainingMs((prev) => (prev === null ? null : Math.max(0, prev - 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTurnTimerPaused, turnTimerRemainingMs !== null]);

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
    setIsOpponentPermanentlyLeft(false);
    partyService.disconnect();
    safeSessionStorage.removeItem("mp_session");
    setIsLobbyOpen(true);
    setHasStartedEver(false);
    setIsIntroPhase(false);
    matchResultRecordedRef.current = false;

    // Полный сброс серверных состояний, чтобы новый матч стартовал «с чистого листа».
    matchAnnulledRef.current = false;
    isTurnTimerPausedRef.current = false;
    hasTurnTimerRef.current = false;
    setIsMatchAnnulled(false);
    setMatchAnnulledMessage(null);
    setIsTurnTimerPaused(false);
    setTurnTimerRemainingMs(null);
    setIsDualDisconnectPaused(false);
    setDualDisconnectGraceMs(null);
    setSyncErrorMessage(null);
    if (rejectTimerRef.current !== null) {
      clearTimeout(rejectTimerRef.current);
      rejectTimerRef.current = null;
    }
    setActionRejectedMessage(null);
    setActionRejectedReason(null);

    setGameState((prev) => ({
      ...prev,
      opponent: "AI",
      winner: null,
      gameEndReason: undefined,
      gameResult: undefined,
      restartRequestedBy: undefined,
    }));
  };

  const reconnectToRoom = () => {
    partyService.ensureConnection();
  };

  const clearSyncError = () => setSyncErrorMessage(null);
  const clearActionRejected = () => {
    if (rejectTimerRef.current !== null) {
      clearTimeout(rejectTimerRef.current);
      rejectTimerRef.current = null;
    }
    setActionRejectedMessage(null);
    setActionRejectedReason(null);
  };

  return {
    isOpponentConnected,
    opponentDisconnectedNotice,
    setOpponentDisconnectedNotice,
    isOpponentPermanentlyLeft,
    rematchTimer,
    acceptRestart,
    rejectRestart,
    requestRematch,
    handleExitToMenu,
    // Серверные события
    isTurnTimerPaused,
    turnTimerRemainingMs,
    isDualDisconnectPaused,
    dualDisconnectGraceMs,
    isMatchAnnulled,
    matchAnnulledMessage,
    syncErrorMessage,
    actionRejectedMessage,
    actionRejectedReason,
    reconnectToRoom,
    clearSyncError,
    clearActionRejected,
  };
}
