import React, { useState, useMemo, useEffect } from 'react';
import type { GameState, Role } from '../../types/game';
import { SPY_COLORS } from '../../types/game';
import { getAdjacentCharacters, isOppositeShift } from '../../utils/gameLogic';
import { CharacterCard } from '../CharacterCard';
import { PassAndPlayModal } from './PassAndPlayModal';
import { InspectorChoiceModal } from '../InspectorChoiceModal';
import { soundManager } from '../../utils/audio';
import { triggerHaptic } from '../../utils/haptics';

interface MobileControllerViewProps {
  gameState: GameState;
  playerRole: Role;
  onDispatchAction: (action: any) => void;
  onSelectLinePreview?: (line: any) => void;
  onExit?: () => void;
  isPassAndPlay?: boolean;
}

type ShiftStep = 'IDLE' | 'SELECT_AXIS' | 'SELECT_INDEX' | 'SELECT_DIR' | 'CONFIRM';

interface ActionDef {
  id: string;
  label: string;
  icon: string;
  isRed?: boolean;
  requiresTarget?: boolean;
}

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

  const isMyTurn = isSecretService
    ? gameState.activeSpyIndex === mySpyIndex
    : gameState.currentTurn === playerRole;

  const mySpy = gameState.spies?.[mySpyIndex];
  const mySecretId = isSecretService
    ? mySpy?.secretId
    : (isKiller ? gameState.killerSecretId : gameState.detectiveSecretId);

  const roleName = isSecretService
    ? (mySpy?.name || 'Агент')
    : (isKiller
      ? (gameState.mode === 'THIEF_HUNT' ? 'Грабитель' : gameState.mode === 'MANIAC_VS_OPERATIVE' ? 'Маньяк' : 'Бандит')
      : (gameState.mode === 'THIEF_HUNT' ? 'Полиция' : gameState.mode === 'MANIAC_VS_OPERATIVE' ? 'Оперативник' : 'Инспектор'));

  const roleColorClass = isSecretService
    ? (SPY_COLORS[mySpyIndex % SPY_COLORS.length]?.text || 'text-red-400')
    : (isKiller ? 'text-red-500' : 'text-blue-400');

  const [shiftStep, setShiftStep] = useState<ShiftStep>('IDLE');
  const [selectedAxis, setSelectedAxis] = useState<'ROW' | 'COL'>('ROW');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [selectedDir, setSelectedDir] = useState<'LEFT' | 'RIGHT' | 'UP' | 'DOWN'>('LEFT');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const isUndoMove = useMemo(() => {
    const dir = (selectedDir === 'LEFT' || selectedDir === 'UP') ? 'BACKWARD' : 'FORWARD';
    return isOppositeShift(gameState.lastShift, selectedAxis, selectedIndex, dir);
  }, [gameState.lastShift, selectedAxis, selectedIndex, selectedDir]);
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionDef | null>(null);
  const [isPeeking, setIsPeeking] = useState(false);

  useEffect(() => {
    setSelectedTargetId(null);
    setPendingAction(null);
    setShiftStep('IDLE');
    setIsDossierOpen(false);
    setIsPeeking(false);
  }, [gameState.currentTurn, gameState.activeSpyIndex]);

  const myCharacter = useMemo(() => {
    if (!mySecretId || !gameState.board || gameState.board.length === 0) return null;
    return gameState.board.flat().find((c) => c.id === mySecretId) || null;
  }, [gameState.board, mySecretId]);

  const targetBorderClass = isKiller
    ? 'border-red-500 bg-red-950/40 shadow-[0_0_14px_rgba(239,68,68,0.4)]'
    : 'border-blue-500 bg-blue-950/40 shadow-[0_0_14px_rgba(59,130,246,0.4)]';

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
        [ 1, -1], [ 1,  0], [ 1,  1]
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
    gameState.mode === 'SKHVATKA' &&
    Boolean(gameState.inspectorChoices && gameState.inspectorChoices.length > 0) &&
    !isKiller &&
    isMyTurn;

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

  const roleObjective = useMemo(() => {
    if (isSecretService) {
      return 'Разоблачите тайные личности агентов соперников действием «Разоблачение»';
    }
    if (gameState.mode === 'THIEF_HUNT') {
      return isKiller
        ? 'Совершите 10 успешных краж у соседних персонажей'
        : 'Задержите истинную личность Грабителя';
    }
    if (gameState.mode === 'MANIAC_VS_OPERATIVE') {
      return isKiller
        ? 'Ликвидируйте 4 цели из списка жертв или найдите Оперативника'
        : 'Раскройте личность Маньяка действием «Задержание»';
    }
    return isKiller
      ? 'Ликвидируйте Инспектора или устраните 14 любых подозреваемых'
      : 'Вычислите и задержите Бандита среди подозреваемых';
  }, [isSecretService, gameState.mode, isKiller]);

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

  const updateLinePreview = (line: any) => {
    triggerHaptic("light");
    onSelectLinePreview?.(line);
    onDispatchAction({
      type: 'LINE_PREVIEW',
      payload: { line },
    });
  };

  const handleResetShift = () => {
    setShiftStep('IDLE');
    updateLinePreview(null);
  };

  const handleConfirmShift = () => {
    soundManager.play("slide");
    triggerHaptic("medium");
    const direction = (selectedDir === 'LEFT' || selectedDir === 'UP') ? 'BACKWARD' : 'FORWARD';
    onDispatchAction({
      type: 'SHIFT_BOARD',
      payload: {
        shiftType: selectedAxis,
        index: selectedIndex,
        direction,
      },
    });
    handleResetShift();
    if (isPassAndPlay) {
      setIsCoverOpen(true);
    }
  };

  const getAvailableActions = (): ActionDef[] => {
    if (gameState.mode === 'LINE_UP') {
      return [
        { id: 'DUEL_ASK_QUESTION', label: 'Вопрос по досье', icon: '[?]' },
        { id: 'DUEL_ACCUSE', label: 'Обвинение', icon: '[TARGET]', isRed: true, requiresTarget: true },
      ];
    }

          const actions: ActionDef[] = [
        { id: 'SHIFT', label: 'Переместить ряд/столбец', icon: '[<->]' },
      ];

    if (isSecretService) {
      actions.push(
        { id: 'CAPTURE_SPY', label: 'Разоблачение', icon: '[TARGET]', isRed: true, requiresTarget: true },
        { id: 'INTERROGATE', label: 'Опрос свидетелей', icon: '[RADAR]', requiresTarget: true }
      );
    } else if (gameState.mode === 'THIEF_HUNT') {
      if (isKiller) {
        actions.push(
          { id: 'ROB_NEIGHBOR', label: 'Кража у соседа', icon: '[STEAL]', isRed: true, requiresTarget: true },
          { id: 'FAST_DISGUISE', label: 'Сменить маску', icon: '[MASK]' }
        );
      } else {
        actions.push(
          { id: 'ACCUSE', label: 'Задержание', icon: '[TARGET]', isRed: true, requiresTarget: true }
        );
      }
          } else if (gameState.mode === 'MANIAC_VS_OPERATIVE') {
        if (isKiller) {
          actions.push(
            { id: 'KILL_CHARACTER', label: 'Ликвидация цели', icon: '[TARGET]', isRed: true, requiresTarget: true },
            { id: 'ESCAPE_MANIAC', label: 'Сменить личность', icon: '[ESCAPE]' }
          );
        } else {
          actions.push(
            { id: 'ACCUSE', label: 'Задержание', icon: '[TARGET]', isRed: true, requiresTarget: true }
          );
        }
      } else {
        if (isKiller) {
          actions.push(
            { id: 'KILL_CHARACTER', label: 'Ликвидация цели', icon: '[TARGET]', isRed: true, requiresTarget: true },
            { id: 'DISGUISE', label: 'Конспирация', icon: '[MASK]' }
          );
        } else {
          actions.push(
            { id: 'ACCUSE', label: 'Задержание', icon: '[TARGET]', isRed: true, requiresTarget: true }
          );
        }
      }

    return actions;
  };

  const handleExecuteAction = (act: ActionDef) => {
    if (act.id === 'SHIFT') {
      setShiftStep('SELECT_AXIS');
      return;
    }
    if (act.id === 'DUEL_ASK_QUESTION') {
      onDispatchAction({ type: 'DUEL_ASK_QUESTION', payload: { questionId: 'q_gender' } });
      return;
    }
    if (act.id === 'FAST_DISGUISE') {
      if (handCards.length > 0) {
        soundManager.play("click");
        triggerHaptic("medium");
        onDispatchAction({ type: 'FAST_DISGUISE', payload: { targetId: handCards[0].id } });
        if (isPassAndPlay) {
          setIsCoverOpen(true);
        }
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
      soundManager.play("kill");
    } else if (pendingAction.id === 'ROB_NEIGHBOR') {
      soundManager.play("steal");
    } else {
      soundManager.play("click");
    }
    triggerHaptic("medium");

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

  const handleEndTurn = () => {
    triggerHaptic("heavy");
    if (isPassAndPlay) {
      setIsCoverOpen(true);
    }
    onDispatchAction({ type: 'END_TURN' });
  };

  const rawActions = getAvailableActions();
  const actions = useMemo(() => {
    const list = [...rawActions];
    if (gameState.mode !== 'THIEF_HUNT' && gameState.mode !== 'LINE_UP' && !list.some((a) => a.id === 'CLEANUP')) {
      list.push({ id: 'CLEANUP', label: 'Зачистить поле', icon: '🧹' });
    }
    if (gameState.mode === 'THIEF_HUNT' && !isKiller && !list.some((a) => a.id === 'SWEAR_IN_OFFICER')) {
      list.push({ id: 'SWEAR_IN_OFFICER', label: 'Вызов патруля', icon: '👮', requiresTarget: true });
    }
    return list;
  }, [rawActions, gameState.mode, isKiller]);

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

  // 1. Экран ожидания хода
  if (!isMyTurn) {
    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-center bg-[#080a0f] p-6 pb-8 text-center text-zinc-100 select-none font-sans">
        <div className="w-20 h-20 rounded-full border border-zinc-800 bg-zinc-900/80 flex items-center justify-center text-4xl mb-6 animate-pulse">
          ⏳
        </div>
        <h2 className="text-2xl font-black uppercase tracking-wider text-zinc-200 mb-2">
          Ожидание
        </h2>
        <p className="text-sm text-zinc-400 max-w-xs leading-relaxed mb-8">
          Сейчас ход другого игрока. Следите за происходящим на телевизоре.
        </p>
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 w-full max-w-xs text-left">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">ВАША РОЛЬ</div>
          <div
            onPointerDown={() => setIsPeeking(true)}
            onPointerUp={() => setIsPeeking(false)}
            onPointerLeave={() => setIsPeeking(false)}
            onPointerCancel={() => setIsPeeking(false)}
            onDoubleClick={() => setIsDossierOpen(true)}
            className="flex items-center gap-3 mt-1 cursor-pointer select-none"
            title="Нажмите для просмотра досье"
          >
                          {isPeeking && myCharacter ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0">
                  <CharacterCard
                    mode={gameState?.mode || 'SKHVATKA'}
                    character={myCharacter}
                    isSelected={false}
                    isPVP={true}
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl border border-zinc-800 bg-zinc-900/90 flex flex-col items-center justify-center text-xs font-mono text-zinc-500 shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-zinc-500">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
              )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm ${
                  isKiller ? 'bg-red-950/80 border-red-600/80 text-red-200' : 'bg-blue-950/80 border-blue-600/80 text-blue-200'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${isKiller ? 'bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.8)]'}`} />
                  {roleName}
                </span>
                {myCharacter && (
                  <span className="text-[10px] font-mono text-zinc-500">
                    #{myCharacter.id.replace('c', '')}
                  </span>
                )}
              </div>
                              <div className="text-sm font-black text-zinc-200 truncate mt-1">
                  {isPeeking && myCharacter ? myCharacter.name : '••••••••'}
                </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Мастер сдвига линии (4 шага)
  if (shiftStep !== 'IDLE') {
    return (
      <div className="flex h-[100dvh] w-screen flex-col justify-between bg-[#080a0f] p-6 pb-8 text-zinc-100 select-none font-sans">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            Перемещение линии
          </h3>
          <button onClick={handleResetShift} className="text-xs text-zinc-400 uppercase font-mono cursor-pointer">
            Отмена
          </button>
        </div>

        <div className="my-auto flex flex-col items-center justify-center w-full max-w-sm mx-auto">
          {shiftStep === 'SELECT_AXIS' && (
            <div className="w-full space-y-4">
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 text-center">
                Шаг 1 • Выберите ось
              </div>
              <div className="grid grid-cols-2 gap-4 w-full">
                <button
                  onClick={() => { setSelectedAxis('ROW'); setShiftStep('SELECT_INDEX'); }}
                  className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center hover:border-red-500 transition cursor-pointer"
                >
                                      <div className="text-xs font-mono font-bold text-zinc-400 mb-2">[ROW]</div>
                  <div className="text-sm font-bold uppercase">Горизонталь</div>
                  <div className="text-[11px] text-zinc-500 mt-1">5 рядов</div>
                </button>
                <button
                  onClick={() => { setSelectedAxis('COL'); setShiftStep('SELECT_INDEX'); }}
                  className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center hover:border-red-500 transition cursor-pointer"
                >
                                      <div className="text-xs font-mono font-bold text-zinc-400 mb-2">[COL]</div>
                  <div className="text-sm font-bold uppercase">Вертикаль</div>
                  <div className="text-[11px] text-zinc-500 mt-1">5 столбцов</div>
                </button>
              </div>
            </div>
          )}

          {shiftStep === 'SELECT_INDEX' && (
            <div className="space-y-3 w-full">
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 text-center mb-2">
                {selectedAxis === 'ROW' ? 'Шаг 2 • Выберите ряд' : 'Шаг 2 • Выберите столбец'}
              </div>
              {Array.from({ length: boardSize }, (_, i) => i).map((i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedIndex(i);
                    updateLinePreview({ type: selectedAxis, index: i });
                    setShiftStep('SELECT_DIR');
                  }}
                  className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-left flex items-center justify-between hover:border-red-500 transition cursor-pointer"
                >
                  <span className="text-sm font-bold uppercase">
                    {selectedAxis === 'ROW' ? `Ряд ${i + 1}` : `Столбец ${i + 1}`}
                  </span>
                  <span className="text-xs text-zinc-500">Выбрать →</span>
                </button>
              ))}
            </div>
          )}

          {shiftStep === 'SELECT_DIR' && (
            <div className="w-full space-y-4">
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 text-center">
                {`Шаг 3 • Направление для ${selectedAxis === 'ROW' ? `Ряда ${selectedIndex + 1}` : `Столбца ${selectedIndex + 1}`}`}
              </div>
              <div className="grid grid-cols-2 gap-4 w-full">
                {selectedAxis === 'ROW' ? (
                  <>
                    <button
                      onClick={() => { setSelectedDir('LEFT'); updateLinePreview({ type: selectedAxis, index: selectedIndex, direction: 'BACKWARD' }); setShiftStep('CONFIRM'); }}
                      className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center hover:border-red-500 transition cursor-pointer"
                    >
                      <div className="text-3xl mb-1">←</div>
                      <div className="text-sm font-bold uppercase">Влево</div>
                    </button>
                    <button
                      onClick={() => { setSelectedDir('RIGHT'); updateLinePreview({ type: selectedAxis, index: selectedIndex, direction: 'FORWARD' }); setShiftStep('CONFIRM'); }}
                      className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center hover:border-red-500 transition cursor-pointer"
                    >
                      <div className="text-3xl mb-1">→</div>
                      <div className="text-sm font-bold uppercase">Вправо</div>
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
                      className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center hover:border-red-500 transition cursor-pointer"
                    >
                      <div className="text-3xl mb-1">↑</div>
                      <div className="text-sm font-bold uppercase">Вверх</div>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDir('DOWN');
                        updateLinePreview({ type: selectedAxis, index: selectedIndex, direction: 'FORWARD' });
                        setShiftStep('CONFIRM');
                      }}
                      className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center hover:border-red-500 transition cursor-pointer"
                    >
                      <div className="text-3xl mb-1">↓</div>
                      <div className="text-sm font-bold uppercase">Вниз</div>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {shiftStep === 'CONFIRM' && (
            <div className="p-6 rounded-3xl bg-zinc-950/90 border border-zinc-800 w-full text-center space-y-4">
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Шаг 4 • Подтверждение
              </div>
              <div className="text-lg font-black text-zinc-100">
                {`Переместить ${selectedAxis === 'ROW' ? `ряд ${selectedIndex + 1}` : `столбец ${selectedIndex + 1}`} ${selectedDir === 'LEFT' ? 'влево' : selectedDir === 'RIGHT' ? 'вправо' : selectedDir === 'UP' ? 'вверх' : 'вниз'}?`}
              </div>
              {isUndoMove && (
                <div className="p-3 rounded-xl border border-red-900/60 bg-red-950/40 text-xs font-bold text-red-400">
                  Anti-Undo: ход отменяет предыдущее действие соперника
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleResetShift}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold uppercase text-zinc-400 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleConfirmShift}
                  disabled={isUndoMove}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black uppercase text-white shadow-lg cursor-pointer"
                >
                  Подтвердить
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleResetShift}
          className="w-full py-3 rounded-xl border border-zinc-800 text-xs font-bold uppercase text-zinc-500 cursor-pointer"
        >
          Назад к действиям
        </button>
      </div>
    );
  }

  // 3. Основной экран хода контроллера
  const _ignoredActions = (() => {
    const list = [...rawActions];
    if (gameState.mode !== 'THIEF_HUNT' && !list.some((a) => a.id === 'CLEANUP')) {
      list.push({ id: 'CLEANUP', label: 'Зачистить поле', icon: '🧹' });
    }
    if (gameState.mode === 'THIEF_HUNT' && !isKiller && !list.some((a) => a.id === 'SWEAR_IN_OFFICER')) {
      list.push({ id: 'SWEAR_IN_OFFICER', label: 'Вызов патруля', icon: '👮', requiresTarget: true });
    }
    return list;
  })();
  void _ignoredActions;

  return (
    <div className="flex h-[100dvh] w-screen flex-col justify-between bg-[#080a0f] p-5 pb-8 text-zinc-100 select-none overflow-y-auto font-sans">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">ВАША РОЛЬ</div>
          <div
            onPointerDown={() => setIsPeeking(true)}
            onPointerUp={() => setIsPeeking(false)}
            onPointerLeave={() => setIsPeeking(false)}
            onPointerCancel={() => setIsPeeking(false)}
            onDoubleClick={() => setIsDossierOpen(true)}
            className="flex items-center gap-3 mt-1 cursor-pointer select-none"
            title="Удерживайте для просмотра роли"
          >
            {isPeeking && myCharacter ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0">
                <CharacterCard
                  mode={gameState?.mode || 'SKHVATKA'}
                  character={myCharacter}
                  isSelected={false}
                  isPVP={true}
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl border border-zinc-800 bg-zinc-900/90 flex flex-col items-center justify-center text-xs font-mono text-zinc-500 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-zinc-500"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 ${roleColorClass}`}>
                  {roleName}
                </span>
                {isPeeking && myCharacter && (
                  <span className="text-[10px] font-mono text-zinc-500">
                    #{myCharacter.id.replace('c', '')}
                  </span>
                )}
              </div>
              <div className="text-base font-black text-zinc-100 truncate max-w-[170px] sm:max-w-xs mt-0.5">
                {isPeeking && myCharacter ? myCharacter.name : '••••••••'}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                Секретная личность игрока
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onExit}
          className="text-[11px] font-mono uppercase text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
        >
          Выйти
        </button>
      </div>

      {/* Рука игрока */}
      {handCards.length > 0 && (
        <div className="my-2 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 shadow-md">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center justify-between">
            <span>{isKiller ? 'КАРТЫ МАСОК (В РУКЕ)' : 'ДОСЬЕ АЛИБИ (В РУКЕ)'}</span>
            <span className="text-[10px] font-mono text-zinc-400">КАРТ: {handCards.length}</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {handCards.map((char) => (
              <div
                key={char.id}
                                  onClick={() => {
                    if (gameState.mode === 'THIEF_HUNT' && isKiller) {
                      setPendingAction({
                        id: 'FAST_DISGUISE',
                        label: 'Смена маски',
                        icon: '[MASK]',
                        requiresTarget: true,
                      });
                      setSelectedTargetId(char.id);
                    } else if (!isKiller) {
                      setPendingAction({
                        id: 'EXONERATE',
                        label: 'Проверка алиби',
                        icon: '[ALIBI]',
                        requiresTarget: true,
                      });
                      setSelectedTargetId(char.id);
                    }
                  }}
                className="w-20 sm:w-24 shrink-0 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/90 p-1.5 hover:border-zinc-600 active:scale-95 transition cursor-pointer"
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

      {/* Блок соседей */}
      <div className="my-3">
        <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
          {`Соседи (${neighbors.length})`}
        </div>
                  {locatorGrid.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 text-center">
              <span className="text-xs text-zinc-500 font-mono">
                [NO TARGETS AVAILABLE]
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-w-xs mx-auto w-full my-2">
                          {locatorGrid.map((cell, idx) => {
                if (cell.isOutOfBounds) {
                  return (
                    <div
                      key={`bound_${idx}`}
                      className="aspect-square rounded-xl border border-zinc-900/80 bg-zinc-950/30 flex items-center justify-center text-[8px] font-mono text-zinc-700 uppercase select-none"
                    >
                      ГРАНИЦА
                    </div>
                  );
                }
                const char = cell.char;
                if (!char) return <div key={`empty_${idx}`} className="aspect-square rounded-xl bg-zinc-950/20 border border-zinc-900" />;
                const isSelected = selectedTargetId === char.id;
                const isCenter = cell.isCenter;
                return (
                  <div
                    key={char.id}
                    onClick={() => setSelectedTargetId(char.id)}
                    className={`aspect-square rounded-xl border p-1 flex flex-col justify-between transition-all cursor-pointer relative ${
                      isSelected
                        ? `${targetBorderClass} scale-105 z-10`
                        : isCenter
                          ? 'border-zinc-700/80 bg-zinc-900/90 hover:border-zinc-600'
                          : 'border-zinc-800/80 bg-zinc-950/70 hover:border-zinc-700'
                    }`}
                  >
                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-900 relative">
                      <CharacterCard
                        mode={gameState?.mode || 'SKHVATKA'}
                        character={char}
                        isSelected={isSelected}
                        isPVP={true}
                        onClick={() => setSelectedTargetId(char.id)}
                      />
                      {isCenter && (
                        <span className="absolute top-0.5 right-0.5 px-1 py-0.2 rounded bg-zinc-950/90 border border-zinc-700 text-[8px] font-black uppercase text-zinc-300 pointer-events-none">
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

      {/* Доступные действия */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">ДОСТУПНЫЕ ДЕЙСТВИЯ</div>
        {actions.map((act) => (
          <button
            key={act.id}
            onClick={() => handleExecuteAction(act)}
            disabled={act.requiresTarget && neighbors.length === 0}
            className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] ${
              act.isRed
                ? 'bg-gradient-to-r from-red-950 via-red-900 to-red-950 hover:from-red-900 hover:via-red-800 hover:to-red-900 text-white border-red-600/70 shadow-[0_8px_20px_rgba(220,38,38,0.35)]'
                : act.id === 'SHIFT'
                  ? 'bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-950 hover:from-zinc-800 hover:via-zinc-700 hover:to-zinc-900 text-zinc-100 border-zinc-600/70 shadow-[0_8px_20px_rgba(0,0,0,0.5)]'
                  : 'bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 hover:from-blue-900 hover:via-blue-800 hover:to-blue-900 text-white border-blue-500/70 shadow-[0_8px_20px_rgba(37,99,235,0.35)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">{act.icon}</span>
              <span className={`text-xs font-bold uppercase tracking-wider ${act.isRed ? 'text-red-400' : 'text-zinc-200'}`}>
                {act.label}
              </span>
            </div>
            <span className="text-xs text-zinc-500">→</span>
          </button>
        ))}
      </div>

      {/* Завершить ход */}
      <button
        onClick={handleEndTurn}
        className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-sm font-black uppercase tracking-widest shadow-[0_0_25px_rgba(239,68,68,0.5)] cursor-pointer active:scale-[0.98] transition-all border border-red-400/30"
      >
        Завершить ход
      </button>

      {/* Шторка Pass-and-Play */}
      <PassAndPlayModal
        isOpen={isCoverOpen}
        nextRole={nextPlayerInfo.nextRole}
        nextPlayerName={nextPlayerInfo.nextPlayerName}
        nextPlayerColor={nextPlayerInfo.nextPlayerColor}
        onConfirmTakeDevice={() => setIsCoverOpen(false)}
      />

      {isDossierOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-6 flex flex-col items-center text-center shadow-2xl relative">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">
              СЕКРЕТНОЕ ДОСЬЕ
            </div>

            <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-zinc-700 bg-zinc-900 shadow-xl mb-4">
              {myCharacter ? (
                <CharacterCard
                  mode={gameState?.mode || 'SKHVATKA'}
                  character={myCharacter}
                  isSelected={false}
                  isPVP={true}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-mono text-zinc-600">
                  ?
                </div>
              )}
            </div>

            <div className={`text-xl font-black uppercase tracking-wider mb-1 ${roleColorClass}`}>
              {roleName}
            </div>

            <div className="text-sm font-bold text-zinc-100 mb-1">
              {myCharacter ? myCharacter.name : 'Личность засекречена'}
            </div>

            {myCharacter && (
              <div className="text-xs font-mono text-zinc-500 mb-4">
                #{myCharacter.id.replace('c', '').padStart(2, '0')}
              </div>
            )}

            <div className="w-full p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-left mb-6">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                ЦЕЛЬ ОПЕРАЦИИ
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {roleObjective}
              </p>
            </div>

            <button
              onClick={() => setIsDossierOpen(false)}
              className="w-full py-3.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-black uppercase tracking-wider text-zinc-100 transition cursor-pointer"
            >
              Закрыть досье
            </button>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-6 flex flex-col items-center text-center shadow-2xl relative">
            <div className="w-16 h-16 rounded-2xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-3xl mb-4 shadow-lg">
              {pendingAction.icon}
            </div>

            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
              ПОДТВЕРЖДЕНИЕ ДЕЙСТВИЯ
            </div>

            <h3 className={`text-lg font-black uppercase tracking-wide mb-3 ${pendingAction.isRed ? 'text-red-400' : 'text-blue-400'}`}>
              {pendingAction.label}
            </h3>

            {pendingAction.requiresTarget && pendingTargetCharacter && (
              <div className="w-full p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-3 text-left mb-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 shrink-0">
                  <CharacterCard
                    mode={gameState?.mode || 'SKHVATKA'}
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
                className="py-3.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmAction}
                className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-lg cursor-pointer transition active:scale-95 ${
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

