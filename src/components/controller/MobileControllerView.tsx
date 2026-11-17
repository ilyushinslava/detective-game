import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState, Role, Character } from '../../types/game';
import { SPY_COLORS } from '../../types/game';
import { getAdjacentCharacters, isOppositeShift } from '../../utils/gameLogic';
import { CharacterCard } from '../CharacterCard';
import { BlindfoldCurtain } from '../ui/BlindfoldCurtain';
import { InspectorChoiceModal } from '../InspectorChoiceModal';
import { ActionButtonsBar } from '../ui/ActionButtonsBar';
import { ThinkingBanner } from '../ui/ThinkingBanner';
import { GameSheets } from '../GameSheets';
import { soundManager } from '../../utils/audio';
import { triggerHaptic } from '../../utils/haptics';
import { useWakeLock } from '../../hooks/useWakeLock';
import { getAvailableActionDescriptors, type ActionDescriptor } from '../../hooks/useGameActions';
import { useDetectiveNotebook } from '../../hooks/useDetectiveNotebook';
import { DetectiveNotebookModal } from './DetectiveNotebookModal';
import { partyService } from '../../utils/partyPeer';
import { BOARD_GRID_SIZE, TURN_GRACE_PERIOD_SECONDS } from '../../constants/gameRules';
import {
  getKillerRoleName,
  getDetectiveRoleName,
  getRoleName,
  isThiefHuntMode,
  isSecretServiceMode,
  isManiacMode,
  characterHasCoin,
  GAME_MODES,
} from '../../constants/gameMeta';

export interface MobileControllerViewProps {
  gameState: GameState;
  playerRole: Role;
  onDispatchAction: (action: any) => void;
  onSelectLinePreview?: (line: any) => void;
  onExit?: () => void;
  isPassAndPlay?: boolean;
  isLocalDisconnected?: boolean;
  reconnectAttempt?: number;
  disconnectedOpponent?: { role?: Role; graceTimeoutSec: number } | null;
  onForceReconnect?: () => void;
  roomStatus?: string;
  onLeaveLobby?: () => void;
  isAIThinking?: boolean;
}

export type ShiftWizardStep =
  | 'IDLE'          // 0: Основной экран хода
  | 'SELECT_LINE'   // Этап 1: Выбор типа линии (Ряды/Столбцы) и её номера (1–5) с подсветкой на ТВ
  | 'SELECT_DIR'    // Этап 2: Выбор направления (стрелка) и немедленное выполнение маневра
  | 'SELECT_AXIS'   // Совместимость: выбор оси
  | 'SELECT_INDEX'  // Совместимость: выбор индекса
  | 'CONFIRM';      // Совместимость: подтверждение

type ActionDef = ActionDescriptor;

const Icons = {
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  ArrowDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  ),
  ArrowUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  ),
  Notebook: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  Radar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <circle cx="12" cy="12" r="3" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
    </svg>
  ),
};

export const MobileControllerView: React.FC<MobileControllerViewProps> = ({
  gameState,
  playerRole,
  onDispatchAction,
  onSelectLinePreview,
  onExit,
  isPassAndPlay = false,
  isLocalDisconnected: propIsLocalDisconnected,
  reconnectAttempt: propReconnectAttempt,
  disconnectedOpponent: propDisconnectedOpponent,
  onForceReconnect,
  roomStatus,
  onLeaveLobby,
  isAIThinking: propIsAIThinking,
}) => {
  const boardSize = gameState?.board?.length || BOARD_GRID_SIZE;
  const isSecretService = gameState.mode === 'SECRET_SERVICE';
  const isKiller = playerRole === 'KILLER';
  const mySpyIndex = playerRole === 'KILLER' ? 0 : 1;

  // Очередь хода по каноническим правилам
  const isTurnActuallyMine = isSecretService
    ? gameState.activeSpyIndex === mySpyIndex
    : gameState.currentTurn === playerRole;

  const isAITurn =
    gameState.opponent === 'AI' &&
    !gameState.winner &&
    (isSecretService
      ? gameState.spies?.[gameState.activeSpyIndex ?? 0]?.isAI === true
      : gameState.currentTurn !== playerRole);
  const activeAIThinking = Boolean(propIsAIThinking ?? isAITurn);

  const mySpy = gameState.spies?.[mySpyIndex];
  const mySecretId = isSecretService
    ? mySpy?.secretId
    : isKiller
      ? gameState.killerSecretId
      : gameState.detectiveSecretId;

  const roleName = isSecretService
    ? (mySpy?.name || 'Агент')
    : getRoleName(gameState.mode, playerRole);

  // Удержание экрана активным на мобильном устройстве (Wake Lock API)
  useWakeLock({ enabled: true });

  // Тактильный отклик при передаче хода данному игроку
  const prevTurnRef = useRef(isTurnActuallyMine);
  useEffect(() => {
    if (!prevTurnRef.current && isTurnActuallyMine) {
      triggerHaptic('turn');
    }
    prevTurnRef.current = isTurnActuallyMine;
  }, [isTurnActuallyMine]);

  // Локальные состояния визарда маневра и блокировки ожидания
  const [shiftStep, setShiftStep] = useState<ShiftWizardStep>('IDLE');
  const [selectedAxis, setSelectedAxis] = useState<'ROW' | 'COL'>('ROW');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [selectedDir, setSelectedDir] = useState<'LEFT' | 'RIGHT' | 'UP' | 'DOWN'>('LEFT');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [errorTargetId, setErrorTargetId] = useState<string | null>(null);
  const [isAwaitingTurnEnd, setIsAwaitingTurnEnd] = useState<boolean>(false);

  // Сетевые состояния потери связи и грейс-периода
  const [internalLocalDisconnected, setInternalLocalDisconnected] = useState(false);
  const [internalReconnectAttempt, setInternalReconnectAttempt] = useState(0);
  const [internalDisconnectedOpponent, setInternalDisconnectedOpponent] = useState<{ role?: Role; graceTimeoutSec: number } | null>(null);
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(TURN_GRACE_PERIOD_SECONDS);

  const activeLocalDisconnected = propIsLocalDisconnected ?? internalLocalDisconnected;

  // Тактильный отклик при потере связи (ошибка)
  const prevDisconnectRef = useRef(activeLocalDisconnected);
  useEffect(() => {
    if (!prevDisconnectRef.current && activeLocalDisconnected) {
      triggerHaptic('error');
    }
    prevDisconnectRef.current = activeLocalDisconnected;
  }, [activeLocalDisconnected]);
  const activeReconnectAttempt = propReconnectAttempt ?? internalReconnectAttempt;
  const activeDisconnectedOpponent = propDisconnectedOpponent ?? internalDisconnectedOpponent;

  useEffect(() => {
    const handleConn = (st: { isConnected: boolean; isReconnecting: boolean; attempt: number }) => {
      setInternalLocalDisconnected(!st.isConnected && st.isReconnecting);
      setInternalReconnectAttempt(st.attempt);
    };
    const handleDisc = (info: { role?: Role; graceTimeoutSec: number }) => {
      setInternalDisconnectedOpponent(info);
      setGraceSecondsLeft(info.graceTimeoutSec || TURN_GRACE_PERIOD_SECONDS);
    };
    const handleRec = () => {
      setInternalDisconnectedOpponent(null);
    };
    const handleRestored = () => {
      setInternalLocalDisconnected(false);
    };

    const prevConn = partyService.onConnectionStateChange;
    const prevDisc = partyService.onPlayerDisconnected;
    const prevRec = partyService.onPlayerReconnected;
    const prevRestored = partyService.onSessionRestored;
    const prevAction = partyService.onAction;

    partyService.onConnectionStateChange = (st) => {
      handleConn(st);
      prevConn?.(st);
    };
    partyService.onPlayerDisconnected = (info) => {
      handleDisc(info);
      prevDisc?.(info);
    };
    partyService.onPlayerReconnected = (info) => {
      handleRec();
      prevRec?.(info);
    };
    partyService.onSessionRestored = (data) => {
      handleRestored();
      prevRestored?.(data);
    };
    partyService.onAction = (action) => {
      if (action?.type === 'ACTION_REJECTED' || action?.type === 'ERROR' || action?.type === 'SYNC_ERROR') {
        setIsAwaitingTurnEnd(false);
        soundManager.play('deny');
        triggerHaptic('error');
        const errId = action.payload?.errorCardId || action.payload?.targetId || selectedTargetId;
        if (errId) {
          setErrorTargetId(errId);
          setTimeout(() => setErrorTargetId(null), 500);
        }
      }
      prevAction?.(action);
    };

    return () => {
      partyService.onConnectionStateChange = prevConn;
      partyService.onPlayerDisconnected = prevDisc;
      partyService.onPlayerReconnected = prevRec;
      partyService.onSessionRestored = prevRestored;
      partyService.onAction = prevAction;
    };
  }, []);

  useEffect(() => {
    if (!activeDisconnectedOpponent) return;
    const interval = setInterval(() => {
      setGraceSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeDisconnectedOpponent]);

  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isHandSheetOpen, setIsHandSheetOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [pendingAction, setPendingAction] = useState<ActionDef | null>(null);
  const [isPeeking, setIsPeeking] = useState(false);

  // Личный блокнот расследования (IndexedDB / 0 WebSocket / 0 GameState)
  const { notes, marks, cycleMark, setMark, setNotesText, clearNotebook } = useDetectiveNotebook(gameState, playerRole);
  const currentMatchCharacters = useMemo<Character[]>(() => {
    if (gameState?.board && Array.isArray(gameState.board) && gameState.board.length > 0) {
      const flat = gameState.board.flat().filter(Boolean);
      if (flat.length > 0) return flat;
    }
    if (Array.isArray((gameState as any)?.players) && (gameState as any).players.length > 0) {
      const fromPlayers = (gameState as any).players
        .map((p: any) => p.character || (p.id && p.name ? p : null))
        .filter(Boolean);
      if (fromPlayers.length > 0) return fromPlayers;
    }
    if (Array.isArray((gameState as any)?.allCharacters) && (gameState as any).allCharacters.length > 0) {
      return (gameState as any).allCharacters;
    }
    return [];
  }, [gameState?.board, (gameState as any)?.players, (gameState as any)?.allCharacters]);
  const flatBoardCards = currentMatchCharacters;

  // Проверка Anti-Undo для маневра
  const isUndoMove = useMemo(() => {
    const dir = (selectedDir === 'LEFT' || selectedDir === 'UP') ? 'BACKWARD' : 'FORWARD';
    return isOppositeShift(gameState.lastShift, selectedAxis, selectedIndex, dir);
  }, [gameState.lastShift, selectedAxis, selectedIndex, selectedDir]);

  // Сброс при смене активного хода на сервере или обновлении лога/маневра
  useEffect(() => {
    setSelectedTargetId(null);
    setPendingAction(null);
    setShiftStep('IDLE');
    setIsDossierOpen(false);
    setIsPeeking(false);
    setIsAwaitingTurnEnd(false);
  }, [gameState.currentTurn, gameState.activeSpyIndex, gameState.lastShift, gameState.log?.length]);

  // Карточка персонажа текущего игрока
  const myCharacter = useMemo(() => {
    if (!mySecretId || !gameState.board || gameState.board.length === 0) return null;
    return gameState.board.flat().find((c) => c.id === mySecretId) || null;
  }, [gameState.board, mySecretId]);

  const targetBorderClass = isKiller
    ? 'border-rose-500 bg-rose-950/40 shadow-[0_0_15px_rgba(225,29,72,0.35)]'
    : 'border-blue-500 bg-blue-950/40 shadow-[0_0_15px_rgba(37,99,235,0.35)]';

  // Соседи персонажа (вырезка 3x3)
  const neighbors = useMemo(() => {
    if (!gameState.board || gameState.board.length === 0) return [];
    const all = gameState.board.flat();
    const map = new Map<string, Character>();

    if (mySecretId) {
      const selfChar = all.find((c) => c.id === mySecretId);
      if (selfChar) map.set(selfChar.id, selfChar);
      const adj = getAdjacentCharacters(gameState.board, mySecretId);
      adj.forEach((c) => map.set(c.id, c));
    }

    if (gameState.mode === 'THIEF_HUNT' && !isKiller && gameState.uniformedOfficers) {
      gameState.uniformedOfficers.forEach((offId) => {
        const offChar = all.find((c) => c.id === offId);
        if (offChar) map.set(offChar.id, offChar);
        const offAdj = getAdjacentCharacters(gameState.board, offId);
        offAdj.forEach((c) => map.set(c.id, c));
      });
    }

    return Array.from(map.values());
  }, [gameState.board, gameState.mode, mySecretId, isKiller, gameState.uniformedOfficers]);

  // Сетка 3x3 локатора вокруг игрока
  const locatorGrid = useMemo(() => {
    if (!mySecretId || !gameState.board || gameState.board.length === 0) return [];
    const board = gameState.board;
    const boardRows = board.length;
    const boardCols = board[0].length;

    let centerR = -1;
    let centerC = -1;
    for (let r = 0; r < boardRows; r++) {
      for (let c = 0; c < boardCols; c++) {
        if (board[r][c]?.id === mySecretId) {
          centerR = r;
          centerC = c;
          break;
        }
      }
      if (centerR !== -1) break;
    }

    if (centerR === -1 || centerC === -1) return [];

    const OFFSETS = [
      [-1, -1], [-1,  0], [-1,  1],
      [ 0, -1], [ 0,  0], [ 0,  1],
      [ 1, -1], [ 1,  0], [ 1,  1],
    ];

    return OFFSETS.map(([dr, dc]) => {
      const nr = centerR + dr;
      const nc = centerC + dc;
      const isOutOfBounds = nr < 0 || nr >= boardRows || nc < 0 || nc >= boardCols;
      const isCenter = dr === 0 && dc === 0;
      const char = isOutOfBounds ? null : board[nr][nc];
      return { dr, dc, nr, nc, isOutOfBounds, isCenter, char };
    });
  }, [mySecretId, gameState.board]);

  const handCards = useMemo(() => {
    const handIds = isKiller ? (gameState.killerHand || []) : (gameState.detectiveHand || []);
    if (!handIds || handIds.length === 0 || !gameState.board) return [];
    const all = gameState.board.flat();
    return handIds.map((id) => all.find((c) => c.id === id)).filter(Boolean) as Character[];
  }, [isKiller, gameState.killerHand, gameState.detectiveHand, gameState.board]);

  const characterImages = useMemo(() => {
    return import.meta.glob<{ default: string }>('../../assets/characters/*.webp', { eager: true });
  }, []);

  const isInspectorPending =
    gameState.mode === ('SKHVATKA' as any) &&
    Boolean(gameState.inspectorChoices && gameState.inspectorChoices.length > 0) &&
    !isKiller &&
    isTurnActuallyMine;

  const inspectorChoiceCharacters = useMemo(() => {
    if (!isInspectorPending || !gameState.inspectorChoices || !gameState.board) return [];
    const all = gameState.board.flat();
    return gameState.inspectorChoices.map((id) => all.find((c) => c.id === id)).filter(Boolean) as Character[];
  }, [isInspectorPending, gameState.inspectorChoices, gameState.board]);

  const pendingTargetCharacter = useMemo(() => {
    const targetId = selectedTargetId || neighbors[0]?.id || null;
    if (!targetId || !gameState.board) return null;
    return gameState.board.flat().find((c) => c.id === targetId) || null;
  }, [selectedTargetId, neighbors, gameState.board]);

  const nextPlayerInfo = useMemo(() => {
    if (isSecretService && gameState.spies && gameState.spies.length > 0) {
      const nextIndex = ((gameState.activeSpyIndex ?? 0) + 1) % gameState.spies.length;
      const nextSpy = gameState.spies[nextIndex];
      return {
        nextPlayerName: nextSpy?.name || 'Агент',
        nextPlayerColor: SPY_COLORS[nextIndex % SPY_COLORS.length]?.text || 'text-red-400',
        nextRole: undefined,
      };
    }

    const nextRole: Role = gameState.currentTurn === 'KILLER' ? 'DETECTIVE' : 'KILLER';
    const name = getRoleName(gameState.mode, nextRole);
    const color = nextRole === 'KILLER' ? 'text-red-500' : 'text-blue-400';

    return {
      nextPlayerName: name,
      nextPlayerColor: color,
      nextRole,
    };
  }, [gameState.mode, gameState.spies, gameState.activeSpyIndex, gameState.currentTurn, isSecretService]);

  // Обновление и трансляция подсветки линии на ТВ
  const updateLinePreview = (line: { type: 'ROW' | 'COL'; index: number; direction?: 'FORWARD' | 'BACKWARD' } | null) => {
    triggerHaptic('light');
    onSelectLinePreview?.(line);
    onDispatchAction({
      type: 'LINE_PREVIEW',
      payload: { line },
    });
    onDispatchAction({
      type: 'PREVIEW_SHIFT',
      payload: line ? { type: line.type, index: line.index, direction: line.direction } : null,
    });
  };

  const handleResetShift = () => {
    setShiftStep('IDLE');
    updateLinePreview(null);
  };

  // Проверка правила Anti-Undo для конкретного направления
  const isDirUndo = (dir: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
    if (!gameState.lastShift) return false;
    const direction = (dir === 'LEFT' || dir === 'UP') ? 'BACKWARD' : 'FORWARD';
    return (
      gameState.lastShift.type === selectedAxis &&
      gameState.lastShift.index === selectedIndex &&
      gameState.lastShift.direction !== direction
    );
  };

  // Немедленное выполнение маневра по нажатию стрелки направления (Этап 2)
  const handleExecuteShift = (dir: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
    // Проверка очков действий (AP)
    if (gameState.actionPoints !== undefined && gameState.actionPoints <= 0) {
      soundManager.play('deny');
      triggerHaptic('error');
      return;
    }

    soundManager.play('slide');
    triggerHaptic('success');
    const direction = (dir === 'LEFT' || dir === 'UP') ? 'BACKWARD' : 'FORWARD';

    onDispatchAction({
      type: 'SHIFT_BOARD',
      payload: {
        shiftType: selectedAxis,
        index: selectedIndex,
        direction,
      },
    });

    // Очистка предпросмотра линии и мгновенный переход в ожидание
    updateLinePreview(null);
    setShiftStep('IDLE');
    setIsAwaitingTurnEnd(true);

    if (isPassAndPlay) {
      setIsCoverOpen(true);
    }
  };

  // Подтверждение для совместимости с окном подтверждения
  const handleConfirmShift = () => {
    handleExecuteShift(selectedDir);
  };

  const handleFastDisguise = (id: string) => {
    soundManager.play('click');
    triggerHaptic('success');
    onDispatchAction({ type: 'FAST_DISGUISE', payload: { targetId: id } });
    setIsHandSheetOpen(false);
    if (isPassAndPlay) setIsCoverOpen(true);
  };

  const handleExonerateFromHand = (id: string) => {
    soundManager.play('click');
    triggerHaptic('success');
    onDispatchAction({ type: 'EXONERATE', payload: { targetId: id } });
    setIsHandSheetOpen(false);
    if (isPassAndPlay) setIsCoverOpen(true);
  };

  const handleExecuteAction = (act: ActionDef) => {
    if (activeAIThinking) return;
    if (gameState.actionPoints !== undefined && gameState.actionPoints <= 0 && act.id !== 'END_TURN') {
      soundManager.play('deny');
      triggerHaptic('error');
      return;
    }
    if (act.id === 'SHIFT') {
      triggerHaptic('light');
      setSelectedAxis('ROW');
      setShiftStep('SELECT_LINE');
      return;
    }
    if (act.id === 'END_TURN') {
      triggerHaptic('success');
      onDispatchAction({ type: 'END_TURN' });
      setIsAwaitingTurnEnd(true);
      if (isPassAndPlay) {
        setIsCoverOpen(true);
      }
      return;
    }
    triggerHaptic('light');
    if (act.id === 'DUEL_ASK_QUESTION') {
      onDispatchAction({ type: 'DUEL_ASK_QUESTION', payload: { questionId: 'q_gender' } });
      return;
    }
    if (act.id === 'FAST_DISGUISE') {
      if (handCards.length > 0) {
        handleFastDisguise(handCards[0].id);
      }
      return;
    }
    if (act.requiresTarget && !selectedTargetId && neighbors.length > 0) {
      setSelectedTargetId(neighbors[0].id);
    }
    setPendingAction(act);
  };

  const handleConfirmAction = () => {
    if (activeAIThinking || !pendingAction) return;
    if (gameState.actionPoints !== undefined && gameState.actionPoints <= 0) {
      soundManager.play('deny');
      triggerHaptic('error');
      return;
    }
    const targetId = selectedTargetId || neighbors[0]?.id || '';

    if (pendingAction.id === 'KILL_CHARACTER') {
      soundManager.play('kill');
    } else if (pendingAction.id === 'ROB_NEIGHBOR') {
      soundManager.play('steal');
    } else {
      soundManager.play('click');
    }
    triggerHaptic('success');

    if (pendingAction.id === 'CLEANUP') {
      onDispatchAction({ type: 'CLEANUP' });
    } else if (pendingAction.id === 'DUEL_ACCUSE') {
      onDispatchAction({
        type: 'DUEL_ACCUSE',
        payload: { targetId },
      });
    } else if (pendingAction.id === 'SWEAR_IN_OFFICER') {
      if (!selectedTargetId || !gameState.uniformedOfficers?.includes(selectedTargetId)) {
        return;
      }
      onDispatchAction({
        type: 'SWEAR_IN_OFFICER',
        payload: { targetId: selectedTargetId },
      });
    } else {
      onDispatchAction({
        type: pendingAction.id,
        payload: { targetId },
      });
    }
    setPendingAction(null);
    setIsAwaitingTurnEnd(true);
    const isRoleChange = ['KILL_CHARACTER', 'TARGET_KILL', 'ARREST', 'ESCAPE_MANIAC', 'DISGUISE', 'CHANGE_IDENTITY'].includes(pendingAction.id);
    if (isPassAndPlay && isRoleChange) {
      setIsCoverOpen(true);
    }
  };

  if (isCoverOpen) {
    return (
      <BlindfoldCurtain
        isOpen={true}
        nextRole={nextPlayerInfo.nextRole}
        nextPlayerName={nextPlayerInfo.nextPlayerName}
        nextPlayerColor={nextPlayerInfo.nextPlayerColor}
        onConfirmTakeDevice={() => setIsCoverOpen(false)}
      />
    );
  }

  if (isInspectorPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080a0f] p-4 select-none font-sans">
        <InspectorChoiceModal
          isOpen={true}
          isPVP={false}
          inspectorChoices={inspectorChoiceCharacters}
          characterImages={characterImages as any}
          onSelectInspectorRole={(chosenId) => {
            onDispatchAction({ type: 'SET_INSPECTOR_ROLE', payload: { chosenId } });
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // ОВЕРЛЕИ СЕТЕВОЙ СВЯЗИ И ГРЕЙС-ПЕРИОДА (QUIET NEO-NOIR, Z-INDEX 65/70)
  // =========================================================================
  const renderConnectionLossOverlay = () => (
    <AnimatePresence>
      {activeLocalDisconnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-between bg-[#07090e]/95 p-6 backdrop-blur-xl select-none font-sans"
          data-testid="connection-loss-overlay"
        >
          <div className="w-full flex justify-between items-center border-b border-white/10 pb-3">
            <span className="text-xs font-mono font-bold tracking-widest text-zinc-400">ПОД ПОДОЗРЕНИЕМ</span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 font-bold">
              РАДИОКАНАЛ: ОФФЛАЙН
            </span>
          </div>

          <div className="my-auto flex flex-col items-center max-w-sm w-full text-center px-4">
            <div className="w-24 h-24 rounded-full border border-white/10 bg-zinc-950 flex items-center justify-center text-blue-400 mb-6 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
              <Icons.Radar />
            </div>

            <h2 className="font-display text-2xl font-black uppercase tracking-wider text-white mb-2">
              ПОТЕРЯ РАДИОСВЯЗИ
            </h2>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-300 mb-4">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>
                {activeReconnectAttempt > 0
                  ? `ВОССТАНОВЛЕНИЕ СИГНАЛА (${activeReconnectAttempt}/3)...`
                  : 'ПОИСК РАДИОЧАСТОТЫ...'}
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Резервный канал удерживается 60 секунд. Ваша позиция на поле и текущий статус маневра сохранены.
            </p>

            <button
              onClick={() => {
                triggerHaptic('light');
                if (onForceReconnect) {
                  onForceReconnect();
                } else {
                  partyService.ensureConnection();
                }
              }}
              className="w-full min-h-[44px] py-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/20 text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 hover:text-white transition cursor-pointer active:scale-95 shadow-md font-display"
            >
              Повторить подключение сейчас
            </button>

            {/* Аварийный выход при недоступности сервера PartyKit */}
            <button
              type="button"
              data-testid="connection-loss-cancel-btn"
              onClick={() => {
                triggerHaptic('medium');
                partyService.disconnect();
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.search = '';
                  window.history.replaceState({}, '', url.pathname);
                }
                if (onExit) {
                  onExit();
                } else if (onLeaveLobby) {
                  onLeaveLobby();
                }
              }}
              className="w-full min-h-[44px] mt-2.5 py-3 rounded-2xl border border-rose-500/40 hover:border-rose-500/80 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 hover:text-rose-100 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-sm font-display flex items-center justify-center gap-2"
            >
              <span>✕</span>
              <span>ВЕРНУТЬСЯ В ШТАБ (ОТМЕНА)</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-zinc-600 uppercase tracking-widest">
            СЕССИЯ ЗАЩИЩЕНА • ПРИНУДИТЕЛЬНЫЙ РАЗРЫВ ДОСТУПЕН
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderOpponentReconnectingBanner = () => (
    <AnimatePresence>
      {activeDisconnectedOpponent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-sans"
          data-testid="opponent-reconnecting-banner"
        >
          <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-950/98 via-zinc-950/98 to-black/98 border border-white/15 p-6 text-center shadow-[0_25px_50px_rgba(0,0,0,0.9)] flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/40 text-[10px] font-mono uppercase tracking-wider text-blue-300 font-bold mb-4">
              <span>ВРЕМЕННАЯ ПАУЗА СВЯЗИ • ТАЙМЕР ЗАМОРОЖЕН</span>
            </div>

            <div className="text-4xl font-mono font-black text-white tracking-widest mb-2">
              00:{graceSecondsLeft.toString().padStart(2, '0')}
            </div>

            <h3 className="font-display text-base font-black uppercase tracking-wider text-zinc-100 mb-2">
              ОЖИДАНИЕ ВОЗВРАЩЕНИЯ СВЯЗНОГО
            </h3>

            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden my-3">
              <div
                className="h-full bg-blue-500 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, (graceSecondsLeft / 60) * 100))}%` }}
              />
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed mt-2 mb-1">
              Связной временно вне зоны эфира. Ход матча приостановлен.
            </p>
            <p className="text-[11px] text-zinc-500 leading-relaxed font-mono">
              При невозврате в течение 60 секунд будет зафиксировано техническое поражение.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // =========================================================================
  // 0. ЭКРАН ОЖИДАНИЯ ЛОББИ (LOBBY / WAITING)
  // =========================================================================
  if (
    (gameState as any)?.status === 'LOBBY' ||
    (gameState as any)?.status === 'WAITING' ||
    (gameState as any)?.status === 'EMPTY' ||
    roomStatus === 'LOBBY' ||
    roomStatus === 'WAITING'
  ) {
    return (
      <div
        className="flex h-[100dvh] w-full max-w-full flex-col items-center justify-between bg-[#07090e] p-5 pb-8 text-center text-zinc-100 select-none font-sans overflow-y-auto overflow-x-hidden relative overscroll-none touch-manipulation touch-pan-y"
        style={{ overscrollBehavior: 'none', touchAction: 'manipulation' }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-transparent to-black/90 pointer-events-none" />

        <div className="w-full flex justify-between items-center border-b border-white/10 pb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-300 font-bold">ПОДКЛЮЧЕНО К ЭФИРУ</span>
          </div>
        </div>

        <div className="my-auto flex flex-col items-center max-w-sm w-full space-y-5 relative z-10">
          <div className="relative w-24 h-24 rounded-3xl border border-white/10 bg-zinc-950/70 flex items-center justify-center shadow-2xl text-blue-400">
            <Icons.Radar />
          </div>
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
              ВЫ В ЛОББИ
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
              Ожидайте запуска игры на телевизоре.
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm relative z-10 space-y-2">
          <button
            onClick={() => {
              triggerHaptic('medium');
              if (onLeaveLobby) {
                onLeaveLobby();
              } else if (onExit) {
                onExit();
              }
            }}
            className="w-full min-h-[48px] rounded-2xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 hover:border-rose-500/80 text-rose-200 active:scale-95 transition font-display text-xs font-bold uppercase tracking-wider flex items-center justify-center shadow-lg cursor-pointer"
          >
            ПОКИНУТЬ ЛОББИ
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 1. РЕЖИМ «ОЖИДАНИЕ» (Глухая блокировка при !isTurnActuallyMine или после хода)
  // =========================================================================
  if (!isTurnActuallyMine || isAwaitingTurnEnd) {
    const activePlayerTitle = nextPlayerInfo.nextRole
      ? getRoleName(gameState.mode, nextPlayerInfo.nextRole)
      : 'Соперник';

    return (
      <div
        className="flex h-[100dvh] w-full max-w-full flex-col items-center justify-between bg-[#07090e] p-4 sm:p-5 pb-6 sm:pb-8 text-center text-zinc-100 select-none font-sans overflow-y-auto overflow-x-hidden relative overscroll-none touch-manipulation touch-pan-y"
        style={{ overscrollBehavior: 'none', touchAction: 'manipulation' }}
      >
        {/* Мягкая контровая подсветка нео-нуара */}
        <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${
          isKiller ? 'from-rose-950/20' : 'from-blue-950/25'
        } via-transparent to-black/90 pointer-events-none`} />

        {/* Верхняя статусная строка синхронизации */}
        <div className="w-full flex justify-between items-center border-b border-white/10 pb-3 gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isKiller ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]' : 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]'}`} />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-300 font-bold">ТВ-ЭФИР СИНХРОНИЗИРОВАН</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsNotebookOpen(true);
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/15 text-xs font-mono text-zinc-200 hover:border-blue-400 hover:text-white transition shadow-sm active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <Icons.Notebook />
              <span>БЛОКНОТ</span>
            </button>
            {onExit && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onExit();
                }}
                className="inline-flex min-h-[44px] items-center text-xs font-mono uppercase text-zinc-500 hover:text-zinc-300 transition cursor-pointer px-3 py-2 rounded-lg hover:bg-zinc-900/50"
              >
                Выйти
              </button>
            )}
          </div>
        </div>

        {/* Центральный блок: Атмосферный тактический радар ожидания */}
        <div className="my-auto flex flex-col items-center max-w-sm w-full px-2 py-4 relative z-10">
          
          {/* Круговой сканер радиоперехвата */}
          <div className="relative w-36 h-36 rounded-full border border-white/10 bg-zinc-950/60 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] mb-5">
            <div className="absolute inset-2 rounded-full border border-white/5" />
            <div className="absolute inset-6 rounded-full border border-white/5" />
            <div className="absolute inset-12 rounded-full border border-white/5" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-px bg-white/5" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-px bg-white/5" />
            </div>
            
            {/* Лаконичный векторный маяк (Zero Emoji) */}
            <div className={`w-14 h-14 rounded-2xl bg-zinc-950 border border-white/15 flex flex-col items-center justify-center z-10 shadow-2xl ${isKiller ? 'text-rose-400' : 'text-blue-400'}`}>
              <Icons.Radar />
              <span className="text-[8px] font-mono text-zinc-400 font-bold uppercase mt-0.5">РАДАР</span>
            </div>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-wider text-white mb-1.5">
            {activeAIThinking ? 'ХОД ПРОТИВНИКА' : 'ОЖИДАНИЕ'}
          </h2>

          {/* Индикатор текущего активного игрока или раздумий бота */}
          {activeAIThinking ? (
            <div className="w-full my-3">
              <ThinkingBanner label="СИСТЕМА АНАЛИЗИРУЕТ" />
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-white/10 shadow-sm mb-3">
              <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${isKiller ? 'bg-rose-400' : 'bg-blue-400'}`} />
              <span className="font-display text-xs font-bold text-zinc-300 uppercase tracking-wider">
                СЕЙЧАС ХОД СОПЕРНИКА
              </span>
            </div>
          )}

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xs mb-6">
            {activeAIThinking
              ? 'Искусственный интеллект рассчитывает оптимальные векторы маневра и цели.'
              : 'Сейчас ход другого игрока. Следите за происходящим на телевизоре.'}
          </p>

          {/* Карточка досье игрока с защитой приватности (Удерживайте) */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900/60 via-zinc-950/90 to-slate-950/80 border border-white/10 w-full text-left shadow-xl backdrop-blur-xl mb-3">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center justify-between">
              <span>ВАША РОЛЬ • ВАШЕ ДОСЬЕ</span>
              <span className="text-emerald-400 font-mono text-[9px] font-bold">ПРИВАТНО</span>
            </div>
            <div
              onPointerDown={() => setIsPeeking(true)}
              onPointerUp={() => setIsPeeking(false)}
              onPointerLeave={() => setIsPeeking(false)}
              onPointerCancel={() => setIsPeeking(false)}
              className="flex items-center gap-3.5 cursor-pointer select-none"
              title="Удерживайте для просмотра"
            >
              {isPeeking && myCharacter ? (
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/20 bg-zinc-900 shrink-0 shadow-md">
                  <CharacterCard
                    mode={gameState?.mode || 'MANIAC_VS_OPERATIVE'}
                    character={myCharacter}
                    isSelected={false}
                    isPVP={true}
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl border border-white/10 bg-zinc-900/90 flex flex-col items-center justify-center text-zinc-400 shrink-0 shadow-inner">
                  <Icons.Eye />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm ${
                    isKiller
                      ? 'bg-rose-950/80 border-rose-600/60 text-rose-200 shadow-rose-950/40'
                      : (roleName === 'Полиция' || roleName === 'ПОЛИЦИЯ')
                      ? 'bg-blue-900/40 border-blue-700/50 text-blue-300'
                      : 'bg-blue-950/80 border-blue-600/60 text-blue-200 shadow-blue-950/40'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isKiller ? 'bg-rose-400' : 'bg-blue-400'}`} />
                    {roleName}
                  </span>
                  {myCharacter && (
                    <span className="text-[10px] font-mono text-zinc-500">
                      #{myCharacter.id.replace('c', '').padStart(2, '0')}
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-zinc-100 leading-tight break-words mt-1 font-sans">
                  {isPeeking && myCharacter ? myCharacter.name : '•••••••• (Удерживайте)'}
                </div>
              </div>
            </div>
          </div>

          {/* Сводка соседей персонажа с полными именами */}
          {neighbors.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/40 via-zinc-950/70 to-slate-950/70 border border-white/10 w-full text-left shadow-lg backdrop-blur-md">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center justify-between">
                <span>ВАШИ СОСЕДИ</span>
                <span className="text-zinc-400 font-mono">({neighbors.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {neighbors.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-white/10 text-[11px] font-mono text-zinc-300 shadow-xs"
                  >
                    <span className="text-blue-400/80 font-bold">#{c.id.replace('c', '').padStart(2, '0')}</span>
                    <span className="font-sans font-semibold text-zinc-200">{c.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Нижний статус-индикатор ожидания */}
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2 relative z-10">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          Дождитесь своего хода • Смотрите на ТВ
        </div>

        {/* Личный блокнот расследования (открывается в любой момент ожидания) */}
        <DetectiveNotebookModal
          isOpen={isNotebookOpen}
          onClose={() => setIsNotebookOpen(false)}
          characters={currentMatchCharacters}
          marks={marks}
          notes={notes}
          onCycleMark={cycleMark}
          onSetMark={setMark}
          onSetNotesText={setNotesText}
          onUpdateNote={setNotesText}
          onClearNotebook={clearNotebook}
          onClear={clearNotebook}
        />

        {/* Оверлеи потери связи и ожидания соперника (Z-Index 65/70) */}
        {renderConnectionLossOverlay()}
        {renderOpponentReconnectingBanner()}
      </div>
    );
  }

  // =========================================================================
  // 3. КОМПАКТНАЯ ПАНЕЛЬ МАНЕВРА ПОЛЯ (ВАРИАНТ Б ЧЕРЕЗ FLOATING DOCK)
  // =========================================================================
  const renderCompactShiftPanel = () => {
    if (shiftStep === 'IDLE') return null;

    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm select-none">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="w-full h-[390px] p-4 bg-gradient-to-b from-slate-950/98 via-zinc-950/98 to-black/98 border-t border-white/15 rounded-t-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md flex flex-col justify-between"
        >
          {/* Шапка панели маневра — фиксированная высота (Zero Layout Shift) */}
          <div className="h-8 flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-white">
                МАНЕВР ПОЛЯ
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-300 font-medium">
                {shiftStep === 'SELECT_DIR' ? 'ЭТАП 2/2' : shiftStep === 'CONFIRM' ? 'ПОДТВЕРЖДЕНИЕ' : 'ЭТАП 1/2'}
              </span>
            </div>
            <button
              onClick={handleResetShift}
              className="min-h-[32px] text-xs text-zinc-400 uppercase font-mono cursor-pointer hover:text-white transition px-2.5 py-1 rounded-xl border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 active:scale-95"
            >
              ✕ Отмена
            </button>
          </div>

          {/* Центральная зона с плавной анимацией шагов без скачков высоты */}
          <div className="flex-1 min-h-0 flex flex-col justify-center py-2 relative overflow-hidden">
            {/* ЭТАП 1: ВЫБОР ТИПА ЛИНИИ И ЕЁ НОМЕРА (1–5) С ПОДСВЕТКОЙ НА ТВ */}
            {(shiftStep === 'SELECT_LINE' || shiftStep === 'SELECT_AXIS' || shiftStep === 'SELECT_INDEX') && (
              <div className="w-full space-y-2.5">
                <div className="text-center space-y-0.5">
                  <div className="font-display text-xs uppercase tracking-wider text-zinc-400 font-bold">
                    ЭТАП 1 • ВЫБЕРИТЕ ЛИНИЮ ДЛЯ МАНЕВРА
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400">
                    Линия сразу подсвечивается на телевизоре
                  </div>
                </div>

                {/* Переключатель оси: Горизонталь (Ряды) / Вертикаль (Столбцы) */}
                <div className="grid grid-cols-2 gap-2 w-full max-w-xs mx-auto">
                  <button
                    onClick={() => {
                      setSelectedAxis('ROW');
                      updateLinePreview({ type: 'ROW', index: selectedIndex });
                    }}
                    className={`min-h-[44px] py-2.5 px-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition duration-75 active:scale-95 touch-manipulation cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedAxis === 'ROW'
                        ? 'bg-blue-600 text-white shadow-md border border-blue-400/50'
                        : 'bg-zinc-900/90 text-zinc-400 border border-white/10 hover:text-white hover:border-zinc-500 active:bg-zinc-800'
                    }`}
                  >
                    <span>↔</span>
                    <span>Горизонталь</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAxis('COL');
                      updateLinePreview({ type: 'COL', index: selectedIndex });
                    }}
                    className={`min-h-[44px] py-2.5 px-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition duration-75 active:scale-95 touch-manipulation cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedAxis === 'COL'
                        ? 'bg-blue-600 text-white shadow-md border border-blue-400/50'
                        : 'bg-zinc-900/90 text-zinc-400 border border-white/10 hover:text-white hover:border-zinc-500 active:bg-zinc-800'
                    }`}
                  >
                    <span>↕</span>
                    <span>Вертикаль</span>
                  </button>
                </div>

                {/* Выбор номера линии 1–5 */}
                <div className="flex flex-col gap-1.5 w-full max-w-xs mx-auto">
                  {Array.from({ length: boardSize }, (_, i) => i).map((i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedIndex(i);
                        updateLinePreview({ type: selectedAxis, index: i });
                        setShiftStep('SELECT_DIR');
                      }}
                      className="w-full min-h-[44px] h-11 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-blue-400 hover:bg-zinc-800/80 flex items-center justify-between px-3 transition duration-75 cursor-pointer active:scale-[0.98] active:bg-zinc-800 touch-manipulation shadow-sm group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-zinc-950 border border-white/10 flex items-center justify-center font-mono text-[11px] font-bold text-zinc-300 group-hover:border-blue-400 group-hover:text-blue-300">
                          {i + 1}
                        </span>
                        <span className="font-display text-xs font-bold uppercase tracking-wider text-white">
                          {selectedAxis === 'ROW' ? `РЯД #${i + 1}` : `СТОЛБЕЦ #${i + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-500 group-hover:text-blue-400">
                        <span className="text-[10px] font-mono font-bold">Выбрать →</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ЭТАП 2: ВЫБОР НАПРАВЛЕНИЯ С МГНОВЕННЫМ ВЫПОЛНЕНИЕМ ХОДА */}
            {shiftStep === 'SELECT_DIR' && (
              <div className="w-full space-y-3">
                <div className="text-center space-y-0.5">
                  <div className="font-display text-xs uppercase tracking-wider text-zinc-400 font-bold">
                    {`ЭТАП 2 • НАПРАВЛЕНИЕ ДЛЯ ${selectedAxis === 'ROW' ? `РЯДА #${selectedIndex + 1}` : `СТОЛБЦА #${selectedIndex + 1}`}`}
                  </div>
                  <div className="font-display text-xs text-emerald-400 font-bold uppercase tracking-wider">
                    Нажатие стрелки сразу завершает ход
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full pt-1 max-w-xs mx-auto">
                  {selectedAxis === 'ROW' ? (
                    <>
                      <button
                        onClick={() => handleExecuteShift('LEFT')}
                        disabled={isDirUndo('LEFT')}
                        className={`min-h-[80px] p-4 rounded-2xl text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-md duration-75 touch-manipulation ${
                          isDirUndo('LEFT')
                            ? 'bg-zinc-950/80 border border-rose-950/50 text-zinc-600 opacity-40 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 border border-blue-400/50 text-white active:scale-95 active:bg-blue-700 shadow-lg'
                        }`}
                      >
                        <Icons.ArrowLeft />
                        <div className="font-display text-xs font-bold uppercase tracking-wider text-white">ВЛЕВО</div>
                        <span className="text-[9px] font-mono text-blue-200">
                          {isDirUndo('LEFT') ? '⊘ Anti-Undo' : 'Ход в 1 касание'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleExecuteShift('RIGHT')}
                        disabled={isDirUndo('RIGHT')}
                        className={`min-h-[80px] p-4 rounded-2xl text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-md duration-75 touch-manipulation ${
                          isDirUndo('RIGHT')
                            ? 'bg-zinc-950/80 border border-rose-950/50 text-zinc-600 opacity-40 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 border border-blue-400/50 text-white active:scale-95 active:bg-blue-700 shadow-lg'
                        }`}
                      >
                        <Icons.ArrowRight />
                        <div className="font-display text-xs font-bold uppercase tracking-wider text-white">ВПРАВО</div>
                        <span className="text-[9px] font-mono text-blue-200">
                          {isDirUndo('RIGHT') ? '⊘ Anti-Undo' : 'Ход в 1 касание'}
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleExecuteShift('UP')}
                        disabled={isDirUndo('UP')}
                        className={`min-h-[80px] p-4 rounded-2xl text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-md duration-75 touch-manipulation ${
                          isDirUndo('UP')
                            ? 'bg-zinc-950/80 border border-rose-950/50 text-zinc-600 opacity-40 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 border border-blue-400/50 text-white active:scale-95 active:bg-blue-700 shadow-lg'
                        }`}
                      >
                        <Icons.ArrowUp />
                        <div className="font-display text-xs font-bold uppercase tracking-wider text-white">ВВЕРХ</div>
                        <span className="text-[9px] font-mono text-blue-200">
                          {isDirUndo('UP') ? '⊘ Anti-Undo' : 'Ход в 1 касание'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleExecuteShift('DOWN')}
                        disabled={isDirUndo('DOWN')}
                        className={`min-h-[80px] p-4 rounded-2xl text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-md duration-75 touch-manipulation ${
                          isDirUndo('DOWN')
                            ? 'bg-zinc-950/80 border border-rose-950/50 text-zinc-600 opacity-40 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 border border-blue-400/50 text-white active:scale-95 active:bg-blue-700 shadow-lg'
                        }`}
                      >
                        <Icons.ArrowDown />
                        <div className="font-display text-xs font-bold uppercase tracking-wider text-white">ВНИЗ</div>
                        <span className="text-[9px] font-mono text-blue-200">
                          {isDirUndo('DOWN') ? '⊘ Anti-Undo' : 'Ход в 1 касание'}
                        </span>
                      </button>
                    </>
                  )}
                </div>

                {(isDirUndo('LEFT') || isDirUndo('RIGHT') || isDirUndo('UP') || isDirUndo('DOWN')) && (
                  <div className="p-2 rounded-xl border border-rose-900/50 bg-rose-950/40 text-[11px] font-bold text-rose-300 font-mono text-center max-w-xs mx-auto">
                    Anti-Undo: ход отменяет предыдущий маневр соперника
                  </div>
                )}
              </div>
            )}

            {/* ШАГ 4: ЭКРАН ПОДТВЕРЖДЕНИЯ ДЕЙСТВИЯ (СОВМЕСТИМОСТЬ) */}
            {shiftStep === 'CONFIRM' && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 w-full text-center space-y-3 shadow-lg">
                <div className="font-display text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                  ПОДТВЕРДИТЕ ДЕЙСТВИЕ
                </div>

                <div className="font-display text-sm font-black text-white uppercase tracking-wider">
                  {`Выполнить маневр: ${selectedAxis === 'ROW' ? `ряд #${selectedIndex + 1}` : `столбец #${selectedIndex + 1}`} ${
                    selectedDir === 'LEFT' ? 'влево' : selectedDir === 'RIGHT' ? 'вправо' : selectedDir === 'UP' ? 'вверх' : 'вниз'
                  }?`}
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-950 border border-white/10 font-mono text-xs text-zinc-300">
                  <span>{selectedAxis === 'ROW' ? `РЯД ${selectedIndex + 1}` : `СТОЛБЕЦ ${selectedIndex + 1}`}</span>
                  <span className="text-blue-400 font-bold font-display uppercase tracking-wider">
                    {selectedDir === 'LEFT' && '← ВЛЕВО'}
                    {selectedDir === 'RIGHT' && 'ВПРАВО →'}
                    {selectedDir === 'UP' && '↑ ВВЕРХ'}
                    {selectedDir === 'DOWN' && 'ВНИЗ ↓'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Фиксированная нижняя панель навигации */}
          <div className="h-14 flex items-center gap-2 pt-2 border-t border-zinc-800/60 shrink-0">
            {(shiftStep === 'SELECT_LINE' || shiftStep === 'SELECT_AXIS' || shiftStep === 'SELECT_INDEX') && (
              <button
                onClick={handleResetShift}
                className="w-full min-h-[44px] py-2.5 rounded-xl border border-white/10 text-xs font-mono uppercase text-zinc-400 hover:text-zinc-200 transition cursor-pointer bg-zinc-900/50"
              >
                Отмена и возврат к пульту
              </button>
            )}

            {shiftStep === 'SELECT_DIR' && (
              <button
                onClick={() => {
                  setShiftStep('SELECT_LINE');
                  updateLinePreview({ type: selectedAxis, index: selectedIndex });
                }}
                className="w-full min-h-[44px] py-2.5 rounded-xl border border-white/10 text-xs font-mono uppercase text-zinc-400 hover:text-zinc-200 transition cursor-pointer bg-zinc-900/50"
              >
                ← Назад к выбору линии
              </button>
            )}

            {shiftStep === 'CONFIRM' && (
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <button
                  onClick={() => setShiftStep('SELECT_DIR')}
                  className="min-h-[44px] py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs font-bold uppercase text-zinc-400 hover:text-white cursor-pointer transition font-display tracking-wider"
                >
                  Отмена
                </button>
                <button
                  onClick={handleConfirmShift}
                  disabled={isUndoMove}
                  className="min-h-[44px] py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black uppercase text-white shadow-lg cursor-pointer transition active:scale-95 font-display tracking-wider"
                >
                  Подтвердить
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  // =========================================================================
  // 3. ОСНОВНОЙ ЭКРАН ХОДА КОНТРОЛЛЕРА
  // =========================================================================
  return (
    <div
      className="flex h-[100dvh] w-full max-w-full flex-col justify-between bg-[#07090e] p-4 sm:p-5 pb-6 sm:pb-8 text-zinc-100 select-none overflow-y-auto overflow-x-hidden font-sans relative overscroll-none touch-manipulation touch-pan-y"
      style={{ overscrollBehavior: 'none', touchAction: 'manipulation' }}
    >
      {/* Мягкая контровая подсветка нео-нуара */}
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${
        isKiller ? 'from-rose-950/25' : 'from-blue-950/30'
      } via-transparent to-black/90 pointer-events-none`} />

      {/* Верхний статус роли */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-3 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gradient-to-r from-slate-900/80 via-zinc-950/80 to-slate-900/80 border border-white/10 shadow-lg backdrop-blur-xl">
            <span
              className={`font-display text-[10px] sm:text-xs font-bold uppercase px-2.5 py-1 rounded-lg tracking-wider shrink-0 shadow-sm ${
                isKiller
                  ? 'bg-rose-950/80 border border-rose-600/60 text-rose-200 shadow-rose-950/40'
                  : roleName === 'Полиция' || roleName === 'ПОЛИЦИЯ'
                    ? 'bg-blue-900/40 border border-blue-700/50 text-blue-300'
                    : 'bg-blue-950/80 border border-blue-600/60 text-blue-200 shadow-blue-950/40'
              }`}
            >
              {roleName}
            </span>
            <span className="text-xs sm:text-sm font-bold text-zinc-100 whitespace-normal break-words leading-tight">
              {myCharacter?.name || '••••••••'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start mt-1">
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsNotebookOpen(true);
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/20 text-xs font-mono text-zinc-200 hover:border-blue-400 hover:text-white transition shadow-sm active:scale-95 cursor-pointer backdrop-blur-md"
          >
            <Icons.Notebook />
            <span>БЛОКНОТ</span>
          </button>
          {onExit && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onExit();
              }}
              className="inline-flex min-h-[44px] items-center text-[11px] font-mono uppercase text-zinc-500 hover:text-zinc-300 transition cursor-pointer px-3 py-2 rounded-lg hover:bg-zinc-900/40"
            >
              Выйти
            </button>
          )}
        </div>
      </div>

      {/* Рука игрока (маски / алиби) */}
      {handCards.length > 0 && (
        <div
          onClick={() => {
            triggerHaptic('light');
            setIsHandSheetOpen(true);
          }}
          className="my-2 p-3 rounded-2xl bg-gradient-to-br from-slate-900/40 via-zinc-950/80 to-slate-950/80 border border-white/10 shadow-xl cursor-pointer active:scale-[0.99] transition-transform backdrop-blur-xl relative z-10"
        >
          <div className="font-display text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center justify-between">
            <span>{isKiller ? 'КАРТЫ МАСОК (В РУКЕ)' : 'ДОСЬЕ АЛИБИ (В РУКЕ)'}</span>
            <span className="text-[10px] text-zinc-400 font-mono">КАРТ: {handCards.length}</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {handCards.map((char) => (
              <div
                key={char.id}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  if (isThiefHuntMode(gameState.mode) && isKiller) {
                    setPendingAction({
                      id: 'FAST_DISGUISE',
                      label: 'Конспирация',
                      requiresTarget: true,
                    });
                    setSelectedTargetId(char.id);
                  } else if (!isKiller) {
                    setPendingAction({
                      id: 'EXONERATE',
                      label: 'Проверка алиби',
                      requiresTarget: true,
                    });
                    setSelectedTargetId(char.id);
                  }
                }}
                className="w-20 sm:w-24 shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/90 p-1 hover:border-zinc-500 active:scale-95 transition cursor-pointer"
              >
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-950">
                  <CharacterCard
                    mode={gameState.mode}
                    character={char}
                    isSelected={selectedTargetId === char.id}
                    isError={char.id === errorTargetId}
                    isPVP={true}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Пространственная вырезка 3x3 игрового поля (Соседи) */}
      <div className="my-2 relative z-10">
        <div className="flex items-center justify-between font-display text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
          <span>{`ВАШИ СОСЕДИ (ВЫРЕЗКА 3×3)`}</span>
          <span className="text-[10px] text-zinc-500 font-mono font-normal">ЦЕЛЕЙ: {neighbors.length}</span>
        </div>
        {locatorGrid.length === 0 ? (
          <div className="p-4 rounded-2xl border border-dashed border-white/10 bg-zinc-950/40 text-center">
            <span className="text-xs text-zinc-500 font-mono">[НЕТ ДОСТУПНЫХ ЦЕЛЕЙ]</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 grid-rows-3 gap-1.5 sm:gap-2 w-full max-w-[280px] sm:max-w-xs aspect-square mx-auto my-2">
            {locatorGrid.map((cell, idx) => {
              if (cell.isOutOfBounds) {
                return (
                  <div
                    key={`bound_${idx}`}
                    className="aspect-square rounded-2xl border border-dashed border-white/10 bg-zinc-950/30 flex flex-col items-center justify-center pointer-events-none select-none text-[8px] font-mono text-zinc-600 tracking-wider"
                  >
                    <span>КРАЙ</span>
                    <span>ПОЛЯ</span>
                  </div>
                );
              }
              const char = cell.char;
              if (!char) return <div key={`empty_${idx}`} className="aspect-square rounded-2xl bg-zinc-950/20 border border-white/5" />;
              const isSelected = selectedTargetId === char.id;
              const isCenter = cell.isCenter;
              return (
                <div
                  key={char.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedTargetId(char.id);
                  }}
                  className={`aspect-square rounded-2xl border p-1 transition-all duration-75 touch-manipulation relative ${
                    isSelected
                      ? `${targetBorderClass} scale-105 z-10 cursor-pointer`
                      : isCenter
                        ? 'border-blue-500/40 bg-blue-950/20 shadow-[0_0_12px_rgba(59,130,246,0.2)] hover:border-blue-400/60 cursor-pointer active:scale-95'
                        : 'border-white/10 bg-zinc-950/70 hover:border-zinc-400 cursor-pointer active:scale-95'
                  }`}
                >
                  <div className="w-full h-full rounded-xl overflow-hidden bg-zinc-900 relative">
                    <CharacterCard
                      mode={gameState?.mode || 'MANIAC_VS_OPERATIVE'}
                      character={char}
                      isSelected={isSelected}
                      isError={char.id === errorTargetId}
                      isPVP={true}
                      onClick={() => {
                        if (activeAIThinking) return;
                        if (!char.isAlive) {
                          soundManager.play('deny');
                          triggerHaptic('error');
                          setErrorTargetId(char.id);
                          setTimeout(() => setErrorTargetId(null), 500);
                          return;
                        }
                        triggerHaptic('light');
                        setSelectedTargetId(char.id);
                      }}
                    />
                    {isCenter && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-zinc-950/90 border border-blue-500/40 text-[8px] font-black uppercase text-blue-300 pointer-events-none shadow-sm font-display tracking-wider">
                        ВЫ
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Компактная панель маневра (Вариант Б) */}
      {renderCompactShiftPanel()}

      {/* Доступные действия (SSOT ActionButtonsBar) */}
      <div className="space-y-2 mb-2 relative z-10">
        <div className="font-display text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center justify-between">
          <span>ДОСТУПНЫЕ ДЕЙСТВИЯ</span>
          {activeAIThinking && (
            <span className="text-[10px] font-mono text-cyan-400 font-bold animate-pulse">
              [ХОД БОТА...]
            </span>
          )}
        </div>
        {activeAIThinking && (
          <ThinkingBanner label="ХОД ПРОТИВНИКА" className="mb-2" />
        )}
        <ActionButtonsBar
          actions={[
            ...(gameState.mode === 'LINE_UP' ? [] : [{ id: 'SHIFT', label: 'Маневр', isRed: false, requiresTarget: false }]),
            ...getAvailableActionDescriptors(gameState, playerRole),
          ].map((act) => ({
            id: act.id,
            label: act.label,
            isRed: act.isRed,
            disabled:
              activeAIThinking ||
              (act.requiresTarget && neighbors.length === 0) ||
              (act.id === 'SWEAR_IN_OFFICER' &&
                (!selectedTargetId ||
                  !gameState.uniformedOfficers?.includes(selectedTargetId) ||
                  gameState.evidenceDeck?.length === 0)),
            onClick: () => handleExecuteAction(act),
          }))}
        />
      </div>

      {/* Шторка Pass-and-Play */}
      <BlindfoldCurtain
        isOpen={isCoverOpen}
        nextRole={nextPlayerInfo.nextRole}
        nextPlayerName={nextPlayerInfo.nextPlayerName}
        nextPlayerColor={nextPlayerInfo.nextPlayerColor}
        onConfirmTakeDevice={() => setIsCoverOpen(false)}
      />

      <GameSheets
        gameState={gameState}
        allChars={gameState.board ? gameState.board.flat() : []}
        characterImages={characterImages as any}
        isHumanTurn={isTurnActuallyMine}
        isDetectiveTurn={!isKiller}
        isKillerTurn={isKiller}
        isHandSheetOpen={isHandSheetOpen || isDossierOpen}
        setIsHandSheetOpen={(val) => {
          setIsHandSheetOpen(val);
          if (!val) setIsDossierOpen(false);
        }}
        isLogOpen={isLogOpen}
        setIsLogOpen={setIsLogOpen}
        logContainerRef={logContainerRef}
        handleExonerateFromHand={handleExonerateFromHand}
        handleFastDisguise={handleFastDisguise}
      />

      {/* Модальное окно подтверждения действия */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans">
          <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-950/95 via-zinc-950/95 to-black/95 border border-white/15 p-6 flex flex-col items-center text-center shadow-[0_25px_50px_rgba(0,0,0,0.9)] relative backdrop-blur-md">
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-3 shadow-lg ${
              pendingAction.isRed
                ? 'border-red-500/40 bg-red-950/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                : 'border-blue-500/40 bg-blue-950/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
            }`}>
              <Icons.Target />
            </div>

            <div className="font-display text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              ПОДТВЕРЖДЕНИЕ ДЕЙСТВИЯ
            </div>

            <h3 className={`font-display text-lg font-black uppercase tracking-wider mb-3 ${pendingAction.isRed ? 'text-red-400' : 'text-blue-400'}`}>
              {pendingAction.label}
            </h3>

            {pendingAction.requiresTarget && pendingTargetCharacter && (
              <div className="w-full p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 flex items-center gap-3 text-left mb-4 shadow-inner">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 bg-zinc-950 shrink-0">
                  <CharacterCard
                    mode={gameState?.mode || 'MANIAC_VS_OPERATIVE'}
                    character={pendingTargetCharacter}
                    isSelected={false}
                    isError={pendingTargetCharacter.id === errorTargetId}
                    isPVP={true}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono text-zinc-500">
                    ЦЕЛЬ #{pendingTargetCharacter.id.replace('c', '').padStart(2, '0')}
                  </div>
                  <div className="text-sm font-bold text-zinc-100 whitespace-normal break-words leading-tight">
                    {pendingTargetCharacter.name}
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              {pendingAction.requiresTarget && pendingTargetCharacter
                ? `Применить действие к цели ${pendingTargetCharacter.name}?`
                : `Подтвердите применение действия ${pendingAction.label}?`}
            </p>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setPendingAction(null);
                }}
                className="min-h-[44px] py-3.5 rounded-2xl border border-white/10 bg-zinc-900/90 text-xs font-display font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition duration-75 cursor-pointer active:scale-95 active:bg-zinc-800 touch-manipulation"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmAction}
                className={`min-h-[44px] py-3.5 rounded-2xl text-xs font-display font-bold uppercase tracking-wider text-white shadow-lg cursor-pointer transition duration-75 active:scale-95 touch-manipulation ${
                  pendingAction.isRed
                    ? 'bg-rose-700 hover:bg-rose-600 border border-rose-500/40 shadow-rose-950/50 active:bg-rose-800'
                    : 'bg-blue-600 hover:bg-blue-500 border border-blue-400/50 shadow-blue-950/50 active:bg-blue-700'
                }`}
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Личный блокнот расследования */}
      <DetectiveNotebookModal
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
        characters={currentMatchCharacters}
        marks={marks}
        notes={notes}
        onCycleMark={cycleMark}
        onSetMark={setMark}
        onSetNotesText={setNotesText}
        onUpdateNote={setNotesText}
        onClearNotebook={clearNotebook}
        onClear={clearNotebook}
      />

      {/* Оверлеи потери связи и ожидания соперника (Z-Index 65/70) */}
      {renderConnectionLossOverlay()}
      {renderOpponentReconnectingBanner()}
    </div>
  );
};
