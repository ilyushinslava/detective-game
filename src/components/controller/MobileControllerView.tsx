import React, { useState, useMemo } from 'react';
import { type GameState, type Role } from '../../types/game';
import { getCharacterNeighbors } from '../../utils/tvPartyLogic';
import { CharacterCard } from '../CharacterCard';

interface MobileControllerViewProps {
  gameState: GameState;
  playerRole: Role;
  onDispatchAction: (action: any) => void;
  onSelectLinePreview?: (line: any) => void;
  onExit?: () => void;
}

type ShiftStep = 'IDLE' | 'SELECT_AXIS' | 'SELECT_INDEX' | 'SELECT_DIR' | 'CONFIRM';

export const MobileControllerView: React.FC<MobileControllerViewProps> = ({
  gameState,
  playerRole,
  onDispatchAction,
  onSelectLinePreview,
  onExit,
}) => {
  const isMyTurn = gameState.currentTurn === playerRole;
  const isKiller = playerRole === 'KILLER';

  const [shiftStep, setShiftStep] = useState<ShiftStep>('IDLE');
  const [selectedAxis, setSelectedAxis] = useState<'ROW' | 'COL'>('ROW');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [selectedDir, setSelectedDir] = useState<'LEFT' | 'RIGHT' | 'UP' | 'DOWN'>('LEFT');

  // Построение 2D матрицы доски (5x5)
  const board2D = useMemo(() => {
    if (gameState?.board && gameState.board.length === 5) return gameState.board;
    if (gameState?.grid && gameState.grid.length === 25) {
      const matrix: any[][] = [];
      for (let r = 0; r < 5; r++) {
        matrix.push(gameState.grid.slice(r * 5, (r + 1) * 5));
      }
      return matrix;
    }
    return [];
  }, [gameState?.board, gameState?.grid]);

  const myCharId =
    (isKiller ? (gameState as any)?.killerSecretId || gameState?.killerCharacterId : (gameState as any)?.detectiveSecretId || gameState?.detectiveCharacterId) ||
    board2D[2]?.[2]?.id ||
    '';

  const neighbors = useMemo(() => {
    if (!myCharId || board2D.length === 0) return [];
    return getCharacterNeighbors(board2D, myCharId);
  }, [board2D, myCharId]);

  const handleResetShift = () => {
    setShiftStep('IDLE');
    onSelectLinePreview?.(null);
  };

  const handleConfirmShift = () => {
    onDispatchAction({
      type: 'SHIFT_BOARD',
      payload: {
        type: selectedAxis,
        index: selectedIndex,
        direction: selectedDir,
      },
    });
    handleResetShift();
  };

  // 1. Экран ожидания
  if (!isMyTurn) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#080a0f] p-6 text-center text-zinc-100 select-none">
        <div className="w-20 h-20 rounded-full border border-zinc-800 bg-zinc-900/80 flex items-center justify-center text-4xl mb-6 animate-pulse">
          ⏳
        </div>
        <h2 className="text-2xl font-black uppercase tracking-wider text-zinc-200 mb-2">
          Ожидание
        </h2>
        <p className="text-sm text-zinc-400 max-w-xs leading-relaxed mb-8">
          <span>Сейчас ход другого игрока</span>. Следите за происходящим на телевизоре.
        </p>
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 w-full max-w-xs text-left">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">ВАША РОЛЬ</div>
          <div className={`text-base font-black ${isKiller ? 'text-red-500' : 'text-cyan-400'}`}>
            {isKiller ? 'Агент Фантом' : 'Агент Призрак'}
          </div>
        </div>
      </div>
    );
  }

  // 2. Мастер сдвига (4 шага)
  if (shiftStep !== 'IDLE') {
    return (
      <div className="flex h-screen w-screen flex-col justify-between bg-[#080a0f] p-6 text-zinc-100 select-none">
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
                    onSelectLinePreview?.({ type: selectedAxis, axis: selectedAxis, index: i });
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

  // 3. Основной экран хода
  return (
    <div className="flex h-screen w-screen flex-col justify-between bg-[#080a0f] p-5 text-zinc-100 select-none overflow-y-auto font-sans">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">ВАША РОЛЬ</div>
          <div className={`text-xl font-black ${isKiller ? 'text-red-500' : 'text-cyan-400'}`}>
            <span>{isKiller ? 'Агент Фантом' : 'Агент Призрак'}</span>
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
          {neighbors.map((char) => (
            <div key={char.id} className="w-24 shrink-0 rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-950/60 p-1.5 shadow-md">
              <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-900 mb-1.5">
                <CharacterCard
                  mode={gameState?.gameMode || 'SKHVATKA'}
                  character={char}
                  isSelected={false}
                  isPVP={true}
                  onClick={() => {}}
                />
              </div>
              <div className="text-[10px] font-bold text-zinc-200 truncate">{char.name}</div>
              <div className="text-[9px] font-mono text-zinc-500">#{char.id.replace('c', '')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Доступные действия */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">ДОСТУПНЫЕ ДЕЙСТВИЯ</div>
        <button
          onClick={() => setShiftStep('SELECT_AXIS')}
          className="w-full p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-left flex items-center justify-between hover:border-zinc-700 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">⇄</span>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">Переместить ряд/столбец</span>
          </div>
          <span className="text-xs text-zinc-500">→</span>
        </button>

        <button
          onClick={() => onDispatchAction({ type: 'INTERROGATE', targetId: neighbors[0]?.id || '' })}
          disabled={neighbors.length === 0}
          className="w-full p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-left flex items-center justify-between hover:border-zinc-700 transition cursor-pointer disabled:opacity-40"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">🔍</span>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">Опрос свидетелей</span>
          </div>
          <span className="text-xs text-zinc-500">→</span>
        </button>

        <button
          onClick={() => onDispatchAction({ type: 'ELIMINATE', targetId: neighbors[0]?.id || '' })}
          disabled={neighbors.length === 0}
          className="w-full p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-left flex items-center justify-between hover:border-zinc-700 transition cursor-pointer disabled:opacity-40"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">🎯</span>
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">Ликвидация цели</span>
          </div>
          <span className="text-xs text-zinc-500">→</span>
        </button>
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
