import React, { useState, useMemo, useEffect, useRef } from 'react';
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

export interface MobileControllerViewProps {
  gameState: GameState;
  playerRole: Role;
  onDispatchAction: (action: any) => void;
  onSelectLinePreview?: (line: any) => void;
  onExit?: () => void;
  isPassAndPlay?: boolean;
}

export type ShiftWizardStep =
  | 'IDLE'          // 0: Основной экран хода
  | 'SELECT_AXIS'   // Шаг 1: Выбор оси (Горизонталь / Вертикаль)
  | 'SELECT_INDEX'  // Шаг 2: Выбор линии (1–5) с отправкой PREVIEW_SHIFT
  | 'SELECT_DIR'    // Шаг 3: Выбор направления (Влево/Вправо или Вверх/Вниз)
  | 'CONFIRM';      // Шаг 4: Подтверждение действия -> Шаг 5: SHIFT_BOARD -> Шаг 6: Ожидание

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
};

export const MobileControllerView: React.FC<MobileControllerViewProps> = ({
  gameState,
  playerRole,
  onDispatchAction,
  onSelectLinePreview,
  onExit,
  isPassAndPlay = false,
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
  const [shiftStep, setShiftStep] = useState<ShiftWizardStep>('IDLE');
  const [selectedAxis, setSelectedAxis] = useState<'ROW' | 'COL'>('ROW');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [selectedDir, setSelectedDir] = useState<'LEFT' | 'RIGHT' | 'UP' | 'DOWN'>('LEFT');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isAwaitingTurnEnd, setIsAwaitingTurnEnd] = useState<boolean>(false);

  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isHandSheetOpen, setIsHandSheetOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [pendingAction, setPendingAction] = useState<ActionDef | null>(null);
  const [isPeeking, setIsPeeking] = useState(false);

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

  // Шаг 5: Выполнение действия (отправка SHIFT_BOARD) -> Шаг 6: Автоматический переход в ожидание
  const handleConfirmShift = () => {
    soundManager.play('slide');
    triggerHaptic('medium');
    const direction = (selectedDir === 'LEFT' || selectedDir === 'UP') ? 'BACKWARD' : 'FORWARD';

    onDispatchAction({
      type: 'SHIFT_BOARD',
      payload: {
        shiftType: selectedAxis,
        index: selectedIndex,
        direction,
      },
    });

    // Очистка предпросмотра линии
    updateLinePreview(null);
    setShiftStep('IDLE');

    // Шаг 6: Мгновенная блокировка экрана до подтверждения сервером смены хода
    setIsAwaitingTurnEnd(true);

    if (isPassAndPlay) {
      setIsCoverOpen(true);
    }
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
      setShiftStep('SELECT_AXIS');
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
    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-between bg-[#080a0f] p-5 pb-8 text-center text-zinc-100 select-none font-sans">
        {/* Верхняя статусная строка */}
        <div className="w-full flex justify-between items-center border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">КОНТРОЛЛЕР</span>
          </div>
          {onExit && (
            <button
              onClick={onExit}
              className="text-xs font-mono uppercase text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
            >
              Выйти
            </button>
          )}
        </div>

        {/* Центральный блок: Экран ожидания (по мастер-макетам ТВ1.jpg и ТВ2.jpg) */}
        <div className="my-auto flex flex-col items-center max-w-sm w-full px-2">
          <div className="w-20 h-20 rounded-3xl border border-white/10 bg-zinc-950/80 flex items-center justify-center text-zinc-300 mb-5 shadow-2xl backdrop-blur-xl animate-pulse">
            <Icons.Clock />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white mb-2">
            ОЖИДАНИЕ
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xs mb-6">
            Сейчас ход другого игрока. Следите за происходящим на телевизоре.
          </p>

          {/* Карточка досье игрока */}
          <div className="p-4 rounded-3xl bg-zinc-950/80 border border-white/10 w-full text-left shadow-lg backdrop-blur-xl mb-3">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-2">
              ВАША РОЛЬ • ВАШЕ ДОСЬЕ
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
                <div className="text-sm font-black text-zinc-200 truncate mt-1 font-mono">
                  {isPeeking && myCharacter ? myCharacter.name : '•••••••• (Удерживайте)'}
                </div>
              </div>
            </div>
          </div>

          {/* Сводка соседей персонажа (как в референсе ТВ2.jpg) */}
          {neighbors.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/10 w-full text-left shadow-md backdrop-blur-md">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center justify-between">
                <span>ВАШИ СОСЕДИ</span>
                <span className="text-zinc-400">({neighbors.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {neighbors.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900/80 border border-white/5 text-[11px] font-mono text-zinc-300"
                  >
                    <span className="text-zinc-500">#{c.id.replace('c', '').padStart(2, '0')}</span>
                    <span className="truncate max-w-[120px] font-sans font-semibold">{c.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Нижний статус-индикатор ожидания */}
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse" />
          Дождитесь своего хода
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. ПОШАГОВЫЙ ВИЗАРД СДВИГА ПОЛЯ (6 ШАГОВ)
  // =========================================================================
  if (shiftStep !== 'IDLE') {
    return (
      <div className="flex h-[100dvh] w-screen flex-col justify-between bg-[#080a0f] p-5 pb-8 text-zinc-100 select-none font-sans">
        {/* Шапка визарда */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-white">
              МАНЕВР СДВИГА
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/50 text-blue-300 font-bold">
              {shiftStep === 'SELECT_AXIS' && 'ШАГ 1/5'}
              {shiftStep === 'SELECT_INDEX' && 'ШАГ 2/5'}
              {shiftStep === 'SELECT_DIR' && 'ШАГ 3/5'}
              {shiftStep === 'CONFIRM' && 'ШАГ 4/5'}
            </span>
          </div>
          <button
            onClick={handleResetShift}
            className="text-xs text-zinc-400 uppercase font-mono cursor-pointer hover:text-white transition"
          >
            Отмена
          </button>
        </div>

        {/* Тело активного шага визарда */}
        <div className="my-auto flex flex-col items-center justify-center w-full max-w-sm mx-auto">
          {/* ШАГ 1: ВЫБОР ОСИ (ГОРИЗОНТАЛЬ / ВЕРТИКАЛЬ) */}
          {shiftStep === 'SELECT_AXIS' && (
            <div className="w-full space-y-4">
              <div className="text-center space-y-1">
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
                  ШАГ 1 • ВЫБЕРИТЕ ОСЬ
                </div>
                <div className="text-xs text-zinc-500">
                  Выберите, какую линию переместить на поле
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full pt-2">
                <button
                  onClick={() => {
                    setSelectedAxis('ROW');
                    setShiftStep('SELECT_INDEX');
                  }}
                  className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 text-center hover:border-blue-500 hover:bg-blue-950/20 transition cursor-pointer shadow-xl active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:border-blue-400 group-hover:text-blue-300">
                    <span className="font-mono text-sm font-black">↔</span>
                  </div>
                  <div className="text-sm font-black uppercase tracking-wider text-white">Горизонталь</div>
                  <div className="text-[11px] font-mono text-zinc-500 mt-1">Ряды 1–5</div>
                </button>

                <button
                  onClick={() => {
                    setSelectedAxis('COL');
                    setShiftStep('SELECT_INDEX');
                  }}
                  className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 text-center hover:border-blue-500 hover:bg-blue-950/20 transition cursor-pointer shadow-xl active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:border-blue-400 group-hover:text-blue-300">
                    <span className="font-mono text-sm font-black">↕</span>
                  </div>
                  <div className="text-sm font-black uppercase tracking-wider text-white">Вертикаль</div>
                  <div className="text-[11px] font-mono text-zinc-500 mt-1">Столбцы 1–5</div>
                </button>
              </div>
            </div>
          )}

          {/* ШАГ 2: ВЫБОР ЛИНИИ (1–5) С ОТПРАВКОЙ PREVIEW_SHIFT НА ТВ */}
          {shiftStep === 'SELECT_INDEX' && (
            <div className="space-y-3 w-full">
              <div className="text-center space-y-1 mb-2">
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
                  {selectedAxis === 'ROW' ? 'ШАГ 2 • ВЫБЕРИТЕ ГОРИЗОНТАЛЬНЫЙ РЯД' : 'ШАГ 2 • ВЫБЕРИТЕ ВЕРТИКАЛЬНЫЙ СТОЛБЕЦ'}
                </div>
                <div className="text-[11px] font-mono text-blue-400">
                  Линия сразу подсвечивается на телевизоре
                </div>
              </div>

              {selectedAxis === 'ROW' ? (
                /* Схема из 5 горизонтальных полос (рядов) */
                <div className="flex flex-col gap-2 w-full">
                  {Array.from({ length: boardSize }, (_, i) => i).map((i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedIndex(i);
                        updateLinePreview({ type: 'ROW', index: i });
                        setShiftStep('SELECT_DIR');
                      }}
                      className="w-full h-12 rounded-2xl bg-zinc-950/90 border border-white/10 hover:border-blue-400 hover:bg-blue-950/30 flex items-center justify-between px-4 transition cursor-pointer active:scale-[0.98] shadow-md group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center font-mono text-xs font-black text-zinc-300 group-hover:border-blue-400 group-hover:text-blue-300">
                          {i + 1}
                        </span>
                        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                          РЯД #{i + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500 group-hover:text-blue-400">
                        <span className="text-xs font-mono font-bold">Выбрать →</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                /* Схема из 5 вертикальных столбиков */
                <div className="flex flex-col gap-2 w-full">
                  {Array.from({ length: boardSize }, (_, i) => i).map((i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedIndex(i);
                        updateLinePreview({ type: 'COL', index: i });
                        setShiftStep('SELECT_DIR');
                      }}
                      className="w-full h-12 rounded-2xl bg-zinc-950/90 border border-white/10 hover:border-blue-400 hover:bg-blue-950/30 flex items-center justify-between px-4 transition cursor-pointer active:scale-[0.98] shadow-md group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center font-mono text-xs font-black text-zinc-300 group-hover:border-blue-400 group-hover:text-blue-300">
                          {i + 1}
                        </span>
                        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                          СТОЛБЕЦ #{i + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500 group-hover:text-blue-400">
                        <span className="text-xs font-mono font-bold">Выбрать →</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ШАГ 3: ВЫБОР НАПРАВЛЕНИЯ (ВЛЕВО/ВПРАВО ИЛИ ВВЕРХ/ВНИЗ) */}
          {shiftStep === 'SELECT_DIR' && (
            <div className="w-full space-y-4">
              <div className="text-center space-y-1">
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
                  {`ШАГ 3 • НАПРАВЛЕНИЕ ДЛЯ ${selectedAxis === 'ROW' ? `РЯДА #${selectedIndex + 1}` : `СТОЛБЦА #${selectedIndex + 1}`}`}
                </div>
                <div className="text-xs text-zinc-500">
                  Укажите вектор перемещения карточек
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full pt-2">
                {selectedAxis === 'ROW' ? (
                  <>
                    <button
                      onClick={() => {
                        setSelectedDir('LEFT');
                        updateLinePreview({ type: selectedAxis, index: selectedIndex, direction: 'BACKWARD' });
                        setShiftStep('CONFIRM');
                      }}
                      className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 text-center hover:border-blue-400 hover:bg-blue-950/20 transition cursor-pointer flex flex-col items-center justify-center gap-2 active:scale-95 shadow-xl"
                    >
                      <Icons.ArrowLeft />
                      <div className="text-xs font-black uppercase tracking-wider text-white">ВЛЕВО</div>
                      <span className="text-[10px] font-mono text-zinc-500">← Сдвиг</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDir('RIGHT');
                        updateLinePreview({ type: selectedAxis, index: selectedIndex, direction: 'FORWARD' });
                        setShiftStep('CONFIRM');
                      }}
                      className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 text-center hover:border-blue-400 hover:bg-blue-950/20 transition cursor-pointer flex flex-col items-center justify-center gap-2 active:scale-95 shadow-xl"
                    >
                      <Icons.ArrowRight />
                      <div className="text-xs font-black uppercase tracking-wider text-white">ВПРАВО</div>
                      <span className="text-[10px] font-mono text-zinc-500">Сдвиг →</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedDir('UP');
                        updateLinePreview({ type: selectedAxis, index: selectedIndex, direction: 'BACKWARD' });
                        setShiftStep('CONFIRM');
                      }}
                      className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 text-center hover:border-blue-400 hover:bg-blue-950/20 transition cursor-pointer flex flex-col items-center justify-center gap-2 active:scale-95 shadow-xl"
                    >
                      <Icons.ArrowUp />
                      <div className="text-xs font-black uppercase tracking-wider text-white">ВВЕРХ</div>
                      <span className="text-[10px] font-mono text-zinc-500">↑ Сдвиг</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDir('DOWN');
                        updateLinePreview({ type: selectedAxis, index: selectedIndex, direction: 'FORWARD' });
                        setShiftStep('CONFIRM');
                      }}
                      className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 text-center hover:border-blue-400 hover:bg-blue-950/20 transition cursor-pointer flex flex-col items-center justify-center gap-2 active:scale-95 shadow-xl"
                    >
                      <Icons.ArrowDown />
                      <div className="text-xs font-black uppercase tracking-wider text-white">ВНИЗ</div>
                      <span className="text-[10px] font-mono text-zinc-500">↓ Сдвиг</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ШАГ 4: ЭКРАН ПОДТВЕРЖДЕНИЯ ДЕЙСТВИЯ */}
          {shiftStep === 'CONFIRM' && (
            <div className="p-6 rounded-3xl bg-zinc-950/90 border border-white/10 w-full text-center space-y-4 shadow-2xl backdrop-blur-xl">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
                ШАГ 4 • ПОДТВЕРДИТЕ ДЕЙСТВИЕ
              </div>

              <div className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                {`Переместить ${selectedAxis === 'ROW' ? `ряд #${selectedIndex + 1}` : `столбец #${selectedIndex + 1}`} ${
                  selectedDir === 'LEFT' ? 'влево' : selectedDir === 'RIGHT' ? 'вправо' : selectedDir === 'UP' ? 'вверх' : 'вниз'
                }?`}
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 font-mono text-xs text-zinc-300">
                <span>{selectedAxis === 'ROW' ? `РЯД ${selectedIndex + 1}` : `СТОЛБЕЦ ${selectedIndex + 1}`}</span>
                <span className="text-blue-400 font-bold">
                  {selectedDir === 'LEFT' && '← ВЛЕВО'}
                  {selectedDir === 'RIGHT' && 'ВПРАВО →'}
                  {selectedDir === 'UP' && '↑ ВВЕРХ'}
                  {selectedDir === 'DOWN' && 'ВНИЗ ↓'}
                </span>
              </div>

              {isUndoMove && (
                <div className="p-3 rounded-2xl border border-red-900/60 bg-red-950/40 text-xs font-bold text-red-400 font-mono">
                  Anti-Undo: ход отменяет предыдущий сдвиг соперника
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShiftStep('SELECT_DIR')}
                  className="py-3.5 rounded-2xl bg-zinc-900 border border-white/10 text-xs font-bold uppercase text-zinc-400 hover:text-white cursor-pointer transition"
                >
                  Отмена
                </button>
                <button
                  onClick={handleConfirmShift}
                  disabled={isUndoMove}
                  className="py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black uppercase text-white shadow-lg cursor-pointer transition active:scale-95"
                >
                  Подтвердить
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Кнопка возврата на предыдущий шаг или отмены */}
        <div className="pt-2">
          {shiftStep === 'SELECT_INDEX' && (
            <button
              onClick={() => {
                setShiftStep('SELECT_AXIS');
                updateLinePreview(null);
              }}
              className="w-full py-3 rounded-2xl border border-white/10 text-xs font-mono uppercase text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              ← Назад к выбору оси
            </button>
          )}
          {shiftStep === 'SELECT_DIR' && (
            <button
              onClick={() => {
                setShiftStep('SELECT_INDEX');
                updateLinePreview({ type: selectedAxis, index: selectedIndex });
              }}
              className="w-full py-3 rounded-2xl border border-white/10 text-xs font-mono uppercase text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              ← Назад к выбору линии
            </button>
          )}
          {shiftStep === 'CONFIRM' && (
            <button
              onClick={() => setShiftStep('SELECT_DIR')}
              className="w-full py-3 rounded-2xl border border-white/10 text-xs font-mono uppercase text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              ← Назад к выбору направления
            </button>
          )}
          {shiftStep === 'SELECT_AXIS' && (
            <button
              onClick={handleResetShift}
              className="w-full py-3 rounded-2xl border border-white/10 text-xs font-mono uppercase text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
            >
              Отмена и возврат к пульту
            </button>
          )}
        </div>
      </div>
    );
  }

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
            <span className="text-xs sm:text-sm font-black text-zinc-100 truncate">
              {myCharacter?.name || '••••••••'}
            </span>
          </div>
        </div>
        {onExit && (
          <button
            onClick={onExit}
            className="text-[11px] font-mono uppercase text-zinc-500 hover:text-zinc-300 transition cursor-pointer shrink-0 self-start mt-1"
          >
            Выйти
          </button>
        )}
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
                      label: 'Смена маски',
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
                className="w-20 sm:w-24 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-zinc-900/90 p-1.5 hover:border-zinc-500 active:scale-95 transition cursor-pointer"
              >
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-950 mb-1">
                  <CharacterCard
                    mode={gameState.mode}
                    character={char}
                    isSelected={selectedTargetId === char.id}
                    isPVP={true}
                  />
                </div>
                <div className="text-[9px] font-bold text-zinc-200 truncate">{char.name}</div>
                <div className="text-[8px] font-mono text-zinc-500">#{char.id.replace('c', '').padStart(2, '0')}</div>
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
                  className={`aspect-square rounded-2xl border p-1 flex flex-col justify-between transition-all relative ${
                    isSelected
                      ? `${targetBorderClass} scale-105 z-10 cursor-pointer`
                      : isCenter
                        ? 'border-white/30 bg-zinc-900/90 shadow-inner hover:border-white/50 cursor-pointer'
                        : 'border-white/10 bg-zinc-950/70 hover:border-zinc-500 cursor-pointer'
                  }`}
                >
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 relative">
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
                  <div className="flex items-center justify-between gap-0.5 mt-0.5">
                    <span className="text-[10px] font-bold text-zinc-100 truncate">{char.name}</span>
                    <span className="text-[9px] font-mono font-bold text-zinc-400">#{char.id.replace('c', '').padStart(2, '0')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Доступные действия (SSOT ActionButtonsBar) */}
      <div className="space-y-2 mb-2">
        <div className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 mb-1">
          ДОСТУПНЫЕ ДЕЙСТВИЯ
        </div>
        <ActionButtonsBar
          actions={[
            ...(gameState.mode === 'LINE_UP' ? [] : [{ id: 'SHIFT', label: 'Переместить ряд/столбец', isRed: false, requiresTarget: false }]),
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

      {/* Кнопка явного завершения хода */}
      <div className="pt-2 pb-1">
        <button
          onClick={() => {
            onDispatchAction({ type: 'END_TURN' });
            setIsAwaitingTurnEnd(true);
            if (isPassAndPlay) {
              setIsCoverOpen(true);
            }
          }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs sm:text-sm uppercase tracking-widest shadow-[0_4px_20px_rgba(220,38,38,0.4)] transition cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>Завершить ход</span>
          <span className="text-red-200 font-mono">➔</span>
        </button>
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
                  <div className="text-sm font-black text-zinc-100 truncate">
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
    </div>
  );
};
