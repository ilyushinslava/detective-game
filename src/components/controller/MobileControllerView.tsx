import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState, Role, Character } from '../../types/game';
import { SPY_COLORS } from '../../types/game';
import { getAdjacentCharacters, isOppositeShift } from '../../utils/gameLogic';
import { CharacterCard } from '../CharacterCard';
import { PassAndPlayModal } from './PassAndPlayModal';
import { InspectorChoiceModal } from '../InspectorChoiceModal';
import { ActionButtonsBar } from '../ui/ActionButtonsBar';
import { GameSheets } from '../GameSheets';
import { soundManager } from '../../utils/audio';
import { triggerHaptic } from '../../utils/haptics';
import { getAvailableActionDescriptors, type ActionDescriptor } from '../../hooks/useGameActions';
import { useDetectiveNotebook } from '../../hooks/useDetectiveNotebook';
import { DetectiveNotebookModal } from './DetectiveNotebookModal';

export interface MobileControllerViewProps {
  gameState: GameState;
  playerRole: Role;
  onDispatchAction: (action: any) => void;
  onSelectLinePreview?: (line: any) => void;
  onExit?: () => void;
  isPassAndPlay?: boolean;
  initialShiftStep?: ShiftWizardStep;
  initialSelectedAxis?: 'ROW' | 'COL';
  initialSelectedIndex?: number;
  initialIsAwaitingTurnEnd?: boolean;
}

export type ShiftWizardStep =
  | 'IDLE'          // 0: Основной экран хода
  | 'SELECT_LINE'   // Этап 1: Выбор типа линии (Ряды/Столбцы) и её номера (1–5) с подсветкой на ТВ
  | 'SELECT_DIR'    // Этап 2: Выбор направления (стрелка) и немедленное выполнение сдвига
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
};

export const MobileControllerView: React.FC<MobileControllerViewProps> = ({
  gameState,
  playerRole,
  onDispatchAction,
  onSelectLinePreview,
  onExit,
  isPassAndPlay = false,
  initialShiftStep,
  initialSelectedAxis,
  initialSelectedIndex,
  initialIsAwaitingTurnEnd,
}) => {
  const boardSize = gameState?.board?.length || 5;
  const isSecretService = gameState.mode === 'SECRET_SERVICE';
  const isKiller = playerRole === 'KILLER';
  const mySpyIndex = playerRole === 'KILLER' ? 0 : 1;

  // Очередь хода по каноническим правилам
  const isTurnActuallyMine = isSecretService
    ? gameState.activeSpyIndex === mySpyIndex
    : gameState.currentTurn === playerRole;

  const mySpy = gameState.spies?.[mySpyIndex];
  const mySecretId = isSecretService
    ? mySpy?.secretId
    : isKiller
      ? gameState.killerSecretId
      : gameState.detectiveSecretId;

  const roleName = isSecretService
    ? (mySpy?.name || 'Агент')
    : isKiller
      ? (gameState.mode === 'THIEF_HUNT' ? 'Грабитель' : gameState.mode === 'MANIAC_VS_OPERATIVE' ? 'Маньяк' : 'Бандит')
      : (gameState.mode === 'THIEF_HUNT' ? 'Полиция' : gameState.mode === 'MANIAC_VS_OPERATIVE' ? 'Оперативник' : 'Инспектор');

  // Локальные состояния визарда сдвига и блокировки ожидания
  const [shiftStep, setShiftStep] = useState<ShiftWizardStep>(initialShiftStep ?? 'IDLE');
  const [selectedAxis, setSelectedAxis] = useState<'ROW' | 'COL'>(initialSelectedAxis ?? 'ROW');
  const [selectedIndex, setSelectedIndex] = useState<number>(initialSelectedIndex ?? 0);
  const [selectedDir, setSelectedDir] = useState<'LEFT' | 'RIGHT' | 'UP' | 'DOWN'>('LEFT');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isAwaitingTurnEnd, setIsAwaitingTurnEnd] = useState<boolean>(initialIsAwaitingTurnEnd ?? false);

  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isHandSheetOpen, setIsHandSheetOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [pendingAction, setPendingAction] = useState<ActionDef | null>(null);
  const [isPeeking, setIsPeeking] = useState(false);

  // Личный блокнот расследования (IndexedDB / 0 WebSocket / 0 GameState)
  const { notes, marks, setMark, updateNote, clearNotebook } = useDetectiveNotebook(gameState, playerRole);
  const flatBoardCards = useMemo(() => (gameState?.board ? gameState.board.flat() : []), [gameState.board]);

  // Проверка Anti-Undo для сдвига
  const isUndoMove = useMemo(() => {
    const dir = (selectedDir === 'LEFT' || selectedDir === 'UP') ? 'BACKWARD' : 'FORWARD';
    return isOppositeShift(gameState.lastShift, selectedAxis, selectedIndex, dir);
  }, [gameState.lastShift, selectedAxis, selectedIndex, selectedDir]);

  // Сброс при смене активного хода на сервере
  useEffect(() => {
    setSelectedTargetId(null);
    setPendingAction(null);
    setShiftStep('IDLE');
    setIsDossierOpen(false);
    setIsPeeking(false);
    setIsAwaitingTurnEnd(false);
  }, [gameState.currentTurn, gameState.activeSpyIndex]);

  // Карточка персонажа текущего игрока
  const myCharacter = useMemo(() => {
    if (!mySecretId || !gameState.board || gameState.board.length === 0) return null;
    return gameState.board.flat().find((c) => c.id === mySecretId) || null;
  }, [gameState.board, mySecretId]);

  const targetBorderClass = isKiller
    ? 'border-red-500 bg-red-950/40 shadow-[0_0_14px_rgba(239,68,68,0.4)]'
    : 'border-blue-500 bg-blue-950/40 shadow-[0_0_14px_rgba(59,130,246,0.4)]';

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
    const name = nextRole === 'KILLER'
      ? (gameState.mode === 'THIEF_HUNT' ? 'Грабитель' : gameState.mode === 'MANIAC_VS_OPERATIVE' ? 'Маньяк' : 'Бандит')
      : (gameState.mode === 'THIEF_HUNT' ? 'Полиция' : gameState.mode === 'MANIAC_VS_OPERATIVE' ? 'Оперативник' : 'Инспектор');
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

  // Немедленное выполнение сдвига по нажатию стрелки направления (Этап 2)
  const handleExecuteShift = (dir: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
    soundManager.play('slide');
    triggerHaptic('medium');
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
    triggerHaptic('medium');
    onDispatchAction({ type: 'FAST_DISGUISE', payload: { targetId: id } });
    setIsHandSheetOpen(false);
    if (isPassAndPlay) setIsCoverOpen(true);
  };

  const handleExonerateFromHand = (id: string) => {
    soundManager.play('click');
    triggerHaptic('medium');
    onDispatchAction({ type: 'EXONERATE', payload: { targetId: id } });
    setIsHandSheetOpen(false);
    if (isPassAndPlay) setIsCoverOpen(true);
  };

  const handleExecuteAction = (act: ActionDef) => {
    if (act.id === 'SHIFT') {
      setSelectedAxis('ROW');
      setShiftStep('SELECT_LINE');
      return;
    }
    if (act.id === 'END_TURN') {
      onDispatchAction({ type: 'END_TURN' });
      setIsAwaitingTurnEnd(true);
      if (isPassAndPlay) {
        setIsCoverOpen(true);
      }
      return;
    }
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
    if (!pendingAction) return;
    const targetId = selectedTargetId || neighbors[0]?.id || '';

    if (pendingAction.id === 'KILL_CHARACTER') {
      soundManager.play('kill');
    } else if (pendingAction.id === 'ROB_NEIGHBOR') {
      soundManager.play('steal');
    } else {
      soundManager.play('click');
    }
    triggerHaptic('medium');

    if (pendingAction.id === 'CLEANUP') {
      onDispatchAction({ type: 'CLEANUP' });
    } else if (pendingAction.id === 'DUEL_ACCUSE') {
      onDispatchAction({
        type: 'DUEL_ACCUSE',
        payload: { targetId },
      });
    } else {
      onDispatchAction({
        type: pendingAction.id,
        payload: { targetId },
      });
    }
    setPendingAction(null);
    setIsAwaitingTurnEnd(true);
    if (isPassAndPlay) {
      setIsCoverOpen(true);
    }
  };

  if (isCoverOpen) {
    return (
      <PassAndPlayModal
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
  // 1. РЕЖИМ «ОЖИДАНИЕ» (Глухая блокировка при !isTurnActuallyMine или после хода)
  // =========================================================================
  if (!isTurnActuallyMine || isAwaitingTurnEnd) {
    const activePlayerTitle = nextPlayerInfo.nextRole === 'KILLER'
      ? (gameState.mode === 'THIEF_HUNT' ? 'Полиция' : gameState.mode === 'MANIAC_VS_OPERATIVE' ? 'Оперативник' : 'Инспектор')
      : (gameState.mode === 'THIEF_HUNT' ? 'Грабитель' : gameState.mode === 'MANIAC_VS_OPERATIVE' ? 'Маньяк' : 'Бандит');

    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-between bg-gradient-to-b from-[#090d16] via-[#06080e] to-[#040508] p-5 pb-8 text-center text-zinc-100 select-none font-sans overflow-y-auto">
        {/* Верхняя статусная строка синхронизации */}
        <div className="w-full flex justify-between items-center border-b border-zinc-800/80 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-ping shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            <span className="text-xs font-mono uppercase tracking-widest text-blue-400 font-bold">ТВ-ЭФИР СИНХРОНИЗИРОВАН</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNotebookOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/20 text-xs font-mono text-zinc-200 hover:border-blue-400 hover:text-white transition shadow-sm active:scale-95 cursor-pointer"
            >
              <Icons.Notebook />
              <span>БЛОКНОТ</span>
            </button>
            {onExit && (
              <button
                onClick={onExit}
                className="text-xs font-mono uppercase text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                Выйти
              </button>
            )}
          </div>
        </div>

        {/* Центральный блок: Атмосферный тактический радар ожидания */}
        <div className="my-auto flex flex-col items-center max-w-sm w-full px-2 py-4">
          
          {/* Круговой сканер радиоперехвата с динамическим лучом */}
          <div className="relative w-36 h-36 rounded-full border border-blue-500/30 bg-blue-950/20 flex items-center justify-center overflow-hidden shadow-[0_0_40px_rgba(37,99,235,0.25)] mb-5">
            <div className="absolute inset-2 rounded-full border border-blue-500/20" />
            <div className="absolute inset-6 rounded-full border border-blue-500/20" />
            <div className="absolute inset-12 rounded-full border border-blue-500/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-px bg-blue-500/20" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-px bg-blue-500/20" />
            </div>
            
            {/* Анимированный световой маяк */}
            <div className="w-14 h-14 rounded-2xl bg-zinc-950/90 border border-white/20 flex flex-col items-center justify-center z-10 shadow-2xl">
              <span className="text-xl animate-pulse">📡</span>
              <span className="text-[7.5px] font-mono text-blue-400 font-black uppercase mt-0.5">РАДАР</span>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white mb-1.5">
            ОЖИДАНИЕ
          </h2>

          {/* Индикатор текущего активного игрока */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/70 border border-blue-500/40 shadow-sm mb-3">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-blue-200 uppercase tracking-wide">
              СЕЙЧАС ХОД СОПЕРНИКА
            </span>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xs mb-6">
            Сейчас ход другого игрока. Следите за происходящим на телевизоре.
          </p>

          {/* Карточка досье игрока с защитой приватности (Удерживайте) */}
          <div className="p-4 rounded-3xl bg-zinc-950/90 border border-white/10 w-full text-left shadow-xl backdrop-blur-xl mb-3">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center justify-between">
              <span>ВАША РОЛЬ • ВАШЕ ДОСЬЕ</span>
              <span className="text-emerald-400 font-mono text-[9px] font-black">ПРИВАТНО</span>
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
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm ${
                    isKiller
                      ? 'bg-red-950/80 border-red-600/80 text-red-200'
                      : (roleName === 'Полиция' || roleName === 'ПОЛИЦИЯ')
                      ? 'bg-blue-900/40 border-blue-800/50 text-blue-400'
                      : 'bg-blue-950/80 border-blue-600/80 text-blue-200'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${isKiller ? 'bg-red-400' : 'bg-blue-400'}`} />
                    {roleName}
                  </span>
                  {myCharacter && (
                    <span className="text-[10px] font-mono text-zinc-500">
                      #{myCharacter.id.replace('c', '').padStart(2, '0')}
                    </span>
                  )}
                </div>
                <div className="text-sm font-black text-zinc-100 leading-tight break-words mt-1 font-sans">
                  {isPeeking && myCharacter ? myCharacter.name : '•••••••• (Удерживайте)'}
                </div>
              </div>
            </div>
          </div>

          {/* Сводка соседей персонажа с полными именами */}
          {neighbors.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/10 w-full text-left shadow-md backdrop-blur-md">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center justify-between">
                <span>ВАШИ СОСЕДИ</span>
                <span className="text-zinc-400">({neighbors.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {neighbors.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-white/5 text-[11px] font-mono text-zinc-300"
                  >
                    <span className="text-zinc-500 font-bold">#{c.id.replace('c', '').padStart(2, '0')}</span>
                    <span className="font-sans font-semibold text-zinc-200">{c.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Нижний статус-индикатор ожидания */}
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          Дождитесь своего хода • Смотрите на ТВ
        </div>

        {/* Личный блокнот расследования (открывается в любой момент ожидания) */}
        <DetectiveNotebookModal
          isOpen={isNotebookOpen}
          onClose={() => setIsNotebookOpen(false)}
          characters={flatBoardCards}
          marks={marks}
          notes={notes}
          onSetMark={setMark}
          onUpdateNote={updateNote}
          onClear={clearNotebook}
        />
      </div>
    );
  }

  // =========================================================================
  // 2. КОМПАКТНАЯ ПАНЕЛЬ СДВИГА ПОЛЯ (ВАРИАНТ Б ЧЕРЕЗ FLOATING DOCK)
  // =========================================================================
  const renderCompactShiftPanel = () => {
    if (shiftStep === 'IDLE') return null;

    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs select-none">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="w-full h-[390px] p-4 bg-zinc-950 border-t-2 border-blue-500 rounded-t-3xl shadow-2xl backdrop-blur-2xl flex flex-col justify-between"
        >
          {/* Шапка панели сдвига — фиксированная высота */}
          <div className="h-8 flex items-center justify-between border-b border-zinc-800/80 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-white">
                СДВИГ ПОЛЯ
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/50 text-blue-300 font-bold">
                {shiftStep === 'SELECT_DIR' ? 'ЭТАП 2/2' : shiftStep === 'CONFIRM' ? 'ПОДТВЕРЖДЕНИЕ' : 'ЭТАП 1/2'}
              </span>
            </div>
            <button
              onClick={handleResetShift}
              className="text-xs text-zinc-400 uppercase font-mono cursor-pointer hover:text-white transition px-2.5 py-1 rounded-lg border border-white/10 bg-zinc-900 active:scale-95"
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
                  <div className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
                    ЭТАП 1 • ВЫБЕРИТЕ ЛИНИЮ ДЛЯ СДВИГА
                  </div>
                  <div className="text-[10px] font-mono text-blue-400">
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
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedAxis === 'ROW'
                        ? 'bg-blue-600 text-white shadow-lg border border-blue-400'
                        : 'bg-zinc-900 text-zinc-400 border border-white/10 hover:text-white hover:border-zinc-500'
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
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedAxis === 'COL'
                        ? 'bg-blue-600 text-white shadow-lg border border-blue-400'
                        : 'bg-zinc-900 text-zinc-400 border border-white/10 hover:text-white hover:border-zinc-500'
                    }`}
                  >
                    <span>↕</span>
                    <span>Вертикаль</span>
                  </button>
                </div>

                {/* Выбор номера линии 1–5 */}
                <div className="flex flex-col gap-1 w-full max-w-xs mx-auto">
                  {Array.from({ length: boardSize }, (_, i) => i).map((i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedIndex(i);
                        updateLinePreview({ type: selectedAxis, index: i });
                        setShiftStep('SELECT_DIR');
                      }}
                      className="w-full h-8 rounded-xl bg-zinc-900 border border-white/10 hover:border-blue-400 hover:bg-blue-950/30 flex items-center justify-between px-3 transition cursor-pointer active:scale-[0.98] shadow-sm group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded bg-zinc-950 border border-white/10 flex items-center justify-center font-mono text-[10px] font-black text-zinc-300 group-hover:border-blue-400 group-hover:text-blue-300">
                          {i + 1}
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-white">
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
                  <div className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
                    {`ЭТАП 2 • НАПРАВЛЕНИЕ ДЛЯ ${selectedAxis === 'ROW' ? `РЯДА #${selectedIndex + 1}` : `СТОЛБЦА #${selectedIndex + 1}`}`}
                  </div>
                  <div className="text-xs text-emerald-400 font-bold">
                    Нажатие стрелки сразу завершает ход
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full pt-1 max-w-xs mx-auto">
                  {selectedAxis === 'ROW' ? (
                    <>
                      <button
                        onClick={() => handleExecuteShift('LEFT')}
                        disabled={isDirUndo('LEFT')}
                        className={`p-4 rounded-2xl text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-md ${
                          isDirUndo('LEFT')
                            ? 'bg-zinc-950/70 border border-red-900/40 opacity-40 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-600 border border-blue-400 text-white active:scale-95'
                        }`}
                      >
                        <Icons.ArrowLeft />
                        <div className="text-xs font-black uppercase tracking-wider text-white">ВЛЕВО</div>
                        <span className="text-[9px] font-mono text-blue-200">
                          {isDirUndo('LEFT') ? '⊘ Anti-Undo' : 'Ход в 1 касание'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleExecuteShift('RIGHT')}
                        disabled={isDirUndo('RIGHT')}
                        className={`p-4 rounded-2xl text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-md ${
                          isDirUndo('RIGHT')
                            ? 'bg-zinc-950/70 border border-red-900/40 opacity-40 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-600 border border-blue-400 text-white active:scale-95'
                        }`}
                      >
                        <Icons.ArrowRight />
                        <div className="text-xs font-black uppercase tracking-wider text-white">ВПРАВО</div>
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
                        className={`p-4 rounded-2xl text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-md ${
                          isDirUndo('UP')
                            ? 'bg-zinc-950/70 border border-red-900/40 opacity-40 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-600 border border-blue-400 text-white active:scale-95'
                        }`}
                      >
                        <Icons.ArrowUp />
                        <div className="text-xs font-black uppercase tracking-wider text-white">ВВЕРХ</div>
                        <span className="text-[9px] font-mono text-blue-200">
                          {isDirUndo('UP') ? '⊘ Anti-Undo' : 'Ход в 1 касание'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleExecuteShift('DOWN')}
                        disabled={isDirUndo('DOWN')}
                        className={`p-4 rounded-2xl text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-md ${
                          isDirUndo('DOWN')
                            ? 'bg-zinc-950/70 border border-red-900/40 opacity-40 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-600 border border-blue-400 text-white active:scale-95'
                        }`}
                      >
                        <Icons.ArrowDown />
                        <div className="text-xs font-black uppercase tracking-wider text-white">ВНИЗ</div>
                        <span className="text-[9px] font-mono text-blue-200">
                          {isDirUndo('DOWN') ? '⊘ Anti-Undo' : 'Ход в 1 касание'}
                        </span>
                      </button>
                    </>
                  )}
                </div>

                {(isDirUndo('LEFT') || isDirUndo('RIGHT') || isDirUndo('UP') || isDirUndo('DOWN')) && (
                  <div className="p-2 rounded-xl border border-red-900/60 bg-red-950/40 text-[11px] font-bold text-red-400 font-mono text-center max-w-xs mx-auto">
                    Anti-Undo: ход отменяет предыдущий сдвиг соперника
                  </div>
                )}
              </div>
            )}

            {/* ШАГ 4: ЭКРАН ПОДТВЕРЖДЕНИЯ ДЕЙСТВИЯ (СОВМЕСТИМОСТЬ) */}
            {shiftStep === 'CONFIRM' && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 w-full text-center space-y-3 shadow-lg">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
                  ПОДТВЕРДИТЕ ДЕЙСТВИЕ
                </div>

                <div className="text-sm font-black text-white uppercase tracking-wider">
                  {`Переместить ${selectedAxis === 'ROW' ? `ряд #${selectedIndex + 1}` : `столбец #${selectedIndex + 1}`} ${
                    selectedDir === 'LEFT' ? 'влево' : selectedDir === 'RIGHT' ? 'вправо' : selectedDir === 'UP' ? 'вверх' : 'вниз'
                  }?`}
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-950 border border-white/10 font-mono text-xs text-zinc-300">
                  <span>{selectedAxis === 'ROW' ? `РЯД ${selectedIndex + 1}` : `СТОЛБЕЦ ${selectedIndex + 1}`}</span>
                  <span className="text-blue-400 font-bold">
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
          <div className="h-12 flex items-center gap-2 pt-2 border-t border-zinc-800/60 shrink-0">
            {(shiftStep === 'SELECT_LINE' || shiftStep === 'SELECT_AXIS' || shiftStep === 'SELECT_INDEX') && (
              <button
                onClick={handleResetShift}
                className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-mono uppercase text-zinc-400 hover:text-zinc-200 transition cursor-pointer bg-zinc-900/50"
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
                className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-mono uppercase text-zinc-400 hover:text-zinc-200 transition cursor-pointer bg-zinc-900/50"
              >
                ← Назад к выбору линии
              </button>
            )}

            {shiftStep === 'CONFIRM' && (
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <button
                  onClick={() => setShiftStep('SELECT_DIR')}
                  className="py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs font-bold uppercase text-zinc-400 hover:text-white cursor-pointer transition"
                >
                  Отмена
                </button>
                <button
                  onClick={handleConfirmShift}
                  disabled={isUndoMove}
                  className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black uppercase text-white shadow-lg cursor-pointer transition active:scale-95"
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
    <div className="flex h-[100dvh] w-screen flex-col justify-between bg-[#080a0f] p-5 pb-8 text-zinc-100 select-none overflow-y-auto font-sans">
      {/* Верхний статус роли */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/70 border border-white/10 shadow-sm backdrop-blur-md">
            <span
              className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider shrink-0 ${
                isKiller
                  ? 'bg-red-950/80 border border-red-600/80 text-red-200'
                  : roleName === 'Полиция' || roleName === 'ПОЛИЦИЯ'
                    ? 'bg-blue-900/40 border border-blue-800/50 text-blue-400'
                    : 'bg-blue-950/80 border border-blue-600/80 text-blue-200'
              }`}
            >
              {roleName}
            </span>
            <span className="text-xs sm:text-sm font-black text-zinc-100 whitespace-normal break-words leading-tight">
              {myCharacter?.name || '••••••••'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start mt-1">
          <button
            onClick={() => setIsNotebookOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/20 text-xs font-mono text-zinc-200 hover:border-blue-400 hover:text-white transition shadow-sm active:scale-95 cursor-pointer"
          >
            <Icons.Notebook />
            <span>БЛОКНОТ</span>
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="text-[11px] font-mono uppercase text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
            >
              Выйти
            </button>
          )}
        </div>
      </div>

      {/* Рука игрока (маски / алиби) */}
      {handCards.length > 0 && (
        <div
          onClick={() => setIsHandSheetOpen(true)}
          className="my-2 p-3 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-md cursor-pointer active:scale-[0.99] transition-transform backdrop-blur-md"
        >
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center justify-between">
            <span>{isKiller ? 'КАРТЫ МАСОК (В РУКЕ)' : 'ДОСЬЕ АЛИБИ (В РУКЕ)'}</span>
            <span className="text-[10px] text-zinc-400 font-mono">КАРТ: {handCards.length}</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {handCards.map((char) => (
              <div
                key={char.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (gameState.mode === 'THIEF_HUNT' && isKiller) {
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
                    isPVP={true}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Пространственная вырезка 3x3 игрового поля (Соседи) */}
      <div className="my-2">
        <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 mb-2">
          <span>{`ВАШИ СОСЕДИ (ВЫРЕЗКА 3×3)`}</span>
          <span className="text-[10px] text-zinc-500 font-normal">ЦЕЛЕЙ: {neighbors.length}</span>
        </div>
        {locatorGrid.length === 0 ? (
          <div className="p-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 text-center">
            <span className="text-xs text-zinc-500 font-mono">[НЕТ ДОСТУПНЫХ ЦЕЛЕЙ]</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 grid-rows-3 gap-1.5 sm:gap-2 w-full max-w-[280px] sm:max-w-xs aspect-square mx-auto my-2">
            {locatorGrid.map((cell, idx) => {
              if (cell.isOutOfBounds) {
                return (
                  <div
                    key={`bound_${idx}`}
                    className="aspect-square rounded-2xl border border-dashed border-zinc-900 bg-zinc-950/30 flex flex-col items-center justify-center pointer-events-none select-none text-[8px] font-mono text-zinc-700 tracking-wider"
                  >
                    <span>КРАЙ</span>
                    <span>ПОЛЯ</span>
                  </div>
                );
              }
              const char = cell.char;
              if (!char) return <div key={`empty_${idx}`} className="aspect-square rounded-2xl bg-zinc-950/20 border border-zinc-900" />;
              const isSelected = selectedTargetId === char.id;
              const isCenter = cell.isCenter;
              return (
                <div
                  key={char.id}
                  onClick={() => setSelectedTargetId(char.id)}
                  className={`aspect-square rounded-2xl border p-1 transition-all relative ${
                    isSelected
                      ? `${targetBorderClass} scale-105 z-10 cursor-pointer`
                      : isCenter
                        ? 'border-white/30 bg-zinc-900/90 shadow-inner hover:border-white/50 cursor-pointer'
                        : 'border-white/10 bg-zinc-950/70 hover:border-zinc-500 cursor-pointer'
                  }`}
                >
                  <div className="w-full h-full rounded-xl overflow-hidden bg-zinc-900 relative">
                    <CharacterCard
                      mode={gameState?.mode || 'MANIAC_VS_OPERATIVE'}
                      character={char}
                      isSelected={isSelected}
                      isPVP={true}
                      onClick={() => setSelectedTargetId(char.id)}
                    />
                    {isCenter && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-zinc-950/90 border border-white/20 text-[8px] font-black uppercase text-zinc-300 pointer-events-none">
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

      {/* Компактная панель сдвига (Вариант Б) */}
      {renderCompactShiftPanel()}

      {/* Доступные действия (SSOT ActionButtonsBar) */}
      <div className="space-y-2 mb-2">
        <div className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 mb-1">
          ДОСТУПНЫЕ ДЕЙСТВИЯ
        </div>
        <ActionButtonsBar
          actions={[
            ...(gameState.mode === 'LINE_UP' ? [] : [{ id: 'SHIFT', label: 'Сдвиг поля', isRed: false, requiresTarget: false }]),
            ...getAvailableActionDescriptors(gameState, playerRole),
          ].map((act) => ({
            id: act.id,
            label: act.label,
            isRed: act.isRed,
            disabled: act.requiresTarget && neighbors.length === 0,
            onClick: () => handleExecuteAction(act),
          }))}
        />
      </div>

      {/* Шторка Pass-and-Play */}
      <PassAndPlayModal
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
          <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-white/10 p-6 flex flex-col items-center text-center shadow-2xl relative">
            <div className="w-14 h-14 rounded-2xl border border-white/10 bg-zinc-900 flex items-center justify-center text-white mb-3 shadow-lg">
              <Icons.Target />
            </div>

            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-1">
              ПОДТВЕРЖДЕНИЕ ДЕЙСТВИЯ
            </div>

            <h3 className={`text-base font-black uppercase tracking-wide mb-3 ${pendingAction.isRed ? 'text-red-400' : 'text-blue-400'}`}>
              {pendingAction.label}
            </h3>

            {pendingAction.requiresTarget && pendingTargetCharacter && (
              <div className="w-full p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 flex items-center gap-3 text-left mb-4 shadow-inner">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 bg-zinc-950 shrink-0">
                  <CharacterCard
                    mode={gameState?.mode || 'MANIAC_VS_OPERATIVE'}
                    character={pendingTargetCharacter}
                    isSelected={false}
                    isPVP={true}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono text-zinc-500">
                    ЦЕЛЬ #{pendingTargetCharacter.id.replace('c', '').padStart(2, '0')}
                  </div>
                  <div className="text-sm font-black text-zinc-100 whitespace-normal break-words leading-tight">
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
                onClick={() => setPendingAction(null)}
                className="py-3.5 rounded-2xl border border-white/10 bg-zinc-900 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmAction}
                className={`py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-lg cursor-pointer transition active:scale-95 ${
                  pendingAction.isRed
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
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
        characters={flatBoardCards}
        marks={marks}
        notes={notes}
        onSetMark={setMark}
        onUpdateNote={updateNote}
        onClear={clearNotebook}
      />
    </div>
  );
};
