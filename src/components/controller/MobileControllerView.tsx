import React, { useState, useMemo } from 'react';
import type { GameState, Role } from '../../types/game';
import { SPY_COLORS } from '../../types/game';
import { getAdjacentCharacters } from '../../utils/gameLogic';
import { CharacterCard } from '../CharacterCard';

interface MobileControllerViewProps {
  gameState: GameState;
  playerRole: Role;
  onDispatchAction: (action: any) => void;
  onSelectLinePreview?: (line: any) => void;
  onExit?: () => void;
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
}) => {
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

  const neighbors = useMemo(() => {
    if (!mySecretId || !gameState.board || gameState.board.length === 0) return [];
    return getAdjacentCharacters(gameState.board, mySecretId);
  }, [gameState.board, mySecretId]);

  const handleResetShift = () => {
    setShiftStep('IDLE');
    onSelectLinePreview?.(null);
  };

  const handleConfirmShift = () => {
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
  };

  const getAvailableActions = (): ActionDef[] => {
    const actions: ActionDef[] = [
      { id: 'SHIFT', label: 'Переместить ряд/столбец', icon: '⇄' },
    ];

    if (isSecretService) {
      actions.push(
        { id: 'CAPTURE_SPY', label: 'Разоблачение цели', icon: '🎯', isRed: true, requiresTarget: true },
        { id: 'INTERROGATE', label: 'Опрос свидетелей', icon: '🔍', requiresTarget: true }
      );
    } else if (gameState.mode === 'THIEF_HUNT') {
      if (isKiller) {
        actions.push(
          { id: 'ROB_NEIGHBOR', label: 'Кража у соседа', icon: '💰', isRed: true, requiresTarget: true },
          { id: 'FAST_DISGUISE', label: 'Сменить маску', icon: '🎭' }
        );
      } else {
        actions.push(
          { id: 'ACCUSE', label: 'Задержание', icon: '🎯', isRed: true, requiresTarget: true }
        );
      }
    } else if (gameState.mode === 'MANIAC_VS_OPERATIVE') {
      if (isKiller) {
        actions.push(
          { id: 'KILL_CHARACTER', label: 'Ликвидация цели', icon: '🎯', isRed: true, requiresTarget: true },
          { id: 'ESCAPE_MANIAC', label: 'Сменить личность', icon: '🎭' }
        );
      } else {
        actions.push(
          { id: 'ACCUSE', label: 'Задержание', icon: '🎯', isRed: true, requiresTarget: true }
        );
      }
    } else {
      if (isKiller) {
        actions.push(
          { id: 'KILL_CHARACTER', label: 'Ликвидация цели', icon: '🎯', isRed: true, requiresTarget: true },
          { id: 'DISGUISE', label: 'Конспирация', icon: '🎭' }
        );
      } else {
        actions.push(
          { id: 'ACCUSE', label: 'Задержание', icon: '🎯', isRed: true, requiresTarget: true }
        );
      }
    }

    return actions;
  };

  const handleExecuteAction = (actionId: string) => {
    if (actionId === 'SHIFT') {
      setShiftStep('SELECT_AXIS');
      return;
    }
    const targetId = selectedTargetId || neighbors[0]?.id || '';
    onDispatchAction({
      type: actionId,
      payload: { targetId },
    });
  };

  // 1. Экран ожидания хода
  if (!isMyTurn) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#080a0f] p-6 text-center text-zinc-100 select-none font-sans">
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
          <div className={`text-base font-black ${roleColorClass}`}>
            {roleName}
          </div>
        </div>
      </div>
    );
  }

  // 2. Мастер сдвига линии (4 шага)
  if (shiftStep !== 'IDLE') {
    return (
      <div className="flex h-screen w-screen flex-col justify-between bg-[#080a0f] p-6 text-zinc-100 select-none font-sans">
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
                  <div className="text-2xl mb-2">☰</div>
                  <div className="text-sm font-bold uppercase">Горизонталь</div>
                  <div className="text-[11px] text-zinc-500 mt-1">5 рядов</div>
                </button>
                <button
                  onClick={() => { setSelectedAxis('COL'); setShiftStep('SELECT_INDEX'); }}
                  className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center hover:border-red-500 transition cursor-pointer"
                >
                  <div className="text-2xl mb-2">☱</div>
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
              {[0, 1, 2, 3, 4].map((i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedIndex(i);
                    onSelectLinePreview?.({ type: selectedAxis, index: i });
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
                      onClick={() => { setSelectedDir('LEFT'); setShiftStep('CONFIRM'); }}
                      className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center hover:border-red-500 transition cursor-pointer"
                    >
                      <div className="text-3xl mb-1">←</div>
                      <div className="text-sm font-bold uppercase">Влево</div>
                    </button>
                    <button
                      onClick={() => { setSelectedDir('RIGHT'); setShiftStep('CONFIRM'); }}
                      className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center hover:border-red-500 transition cursor-pointer"
                    >
                      <div className="text-3xl mb-1">→</div>
                      <div className="text-sm font-bold uppercase">Вправо</div>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setSelectedDir('UP'); setShiftStep('CONFIRM'); }}
                      className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center hover:border-red-500 transition cursor-pointer"
                    >
                      <div className="text-3xl mb-1">↑</div>
                      <div className="text-sm font-bold uppercase">Вверх</div>
                    </button>
                    <button
                      onClick={() => { setSelectedDir('DOWN'); setShiftStep('CONFIRM'); }}
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
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleResetShift}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold uppercase text-zinc-400 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleConfirmShift}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-black uppercase text-white shadow-lg cursor-pointer"
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
  const actions = getAvailableActions();

  return (
    <div className="flex h-screen w-screen flex-col justify-between bg-[#080a0f] p-5 text-zinc-100 select-none overflow-y-auto font-sans">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">ВАША РОЛЬ</div>
          <div className={`text-xl font-black ${roleColorClass}`}>
            {roleName}
          </div>
        </div>
        <button
          onClick={onExit}
          className="text-[11px] font-mono uppercase text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
        >
          Выйти
        </button>
      </div>

      {/* Блок соседей */}
      <div className="my-3">
        <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
          {`Соседи (${neighbors.length})`}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {neighbors.map((char) => {
            const isSelected = selectedTargetId === char.id;
            return (
              <div
                key={char.id}
                onClick={() => setSelectedTargetId(char.id)}
                className={`w-24 shrink-0 rounded-xl overflow-hidden border p-1.5 shadow-md cursor-pointer transition-all ${
                  isSelected
                    ? 'border-red-500 bg-red-950/40 shadow-[0_0_12px_rgba(239,68,68,0.4)] scale-105'
                    : 'border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700'
                }`}
              >
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-900 mb-1.5">
                  <CharacterCard
                    mode={gameState?.mode || 'SKHVATKA'}
                    character={char}
                    isSelected={isSelected}
                    isPVP={true}
                    onClick={() => setSelectedTargetId(char.id)}
                  />
                </div>
                <div className="text-[10px] font-bold text-zinc-200 truncate">{char.name}</div>
                <div className="text-[9px] font-mono text-zinc-500">#{char.id.replace('c', '')}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Доступные действия */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">ДОСТУПНЫЕ ДЕЙСТВИЯ</div>
        {actions.map((act) => (
          <button
            key={act.id}
            onClick={() => handleExecuteAction(act.id)}
            disabled={act.requiresTarget && neighbors.length === 0}
            className="w-full p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-left flex items-center justify-between hover:border-zinc-700 transition cursor-pointer disabled:opacity-40"
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
        onClick={() => onDispatchAction({ type: 'END_TURN' })}
        className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer active:scale-98 transition"
      >
        Завершить ход
      </button>
    </div>
  );
};
