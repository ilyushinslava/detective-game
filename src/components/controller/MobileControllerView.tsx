import React, { useState } from "react";
import type { GameState, Role } from "../../types/game";

interface MobileControllerViewProps {
  gameState: GameState;
  playerRole?: Role;
  onDispatchAction: (action: any) => void;
  onExit: () => void;
}

export const MobileControllerView: React.FC<MobileControllerViewProps> = ({
  gameState,
  playerRole,
  onDispatchAction,
  onExit,
}) => {
  const [showIdentity, setShowIdentity] = useState(false);
  const [shiftType, setShiftType] = useState<"ROW" | "COL">("ROW");
  const [shiftIndex, setShiftIndex] = useState<number>(0);
  const [shiftDirection, setShiftDirection] = useState<"LEFT" | "RIGHT" | "UP" | "DOWN">("LEFT");

  const isMyTurn = gameState.currentTurn === playerRole;

  // Поиск секретной карты в колоде/доске
  const secretId =
    playerRole === "KILLER"
      ? gameState.killerSecretId
      : gameState.detectiveSecretId;

  const secretCard = gameState.board?.flat().find((c) => c.id === secretId);

  const handleApplyShift = () => {
    if (!isMyTurn) return;
    onDispatchAction({
      type: "SHIFT_BOARD",
      payload: {
        type: shiftType,
        index: shiftIndex,
        direction: shiftDirection,
      },
      senderId: "local",
    });
  };

  return (
    <div className="flex h-screen w-screen flex-col justify-between bg-[#080a0f] p-4 text-zinc-100 select-none pb-8">
      {/* Верхний бар статуса */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <button
          onClick={onExit}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 active:scale-95"
        >
          Выйти
        </button>
        <div
          className={`rounded-full px-4 py-1 text-xs font-black uppercase tracking-wider ${
            isMyTurn
              ? "bg-emerald-500/20 border border-emerald-500 text-emerald-400 animate-pulse"
              : "bg-zinc-900 border border-zinc-800 text-zinc-500"
          }`}
        >
          {isMyTurn ? "Ваш ход" : "Ожидание хода..."}
        </div>
        <div className="text-xs font-mono text-zinc-400">
          Роль: <span className="font-bold text-zinc-200">{playerRole || "Игрок"}</span>
        </div>
      </div>

      {/* Зона секретного досье */}
      <div className="my-2 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase text-zinc-400">Секретная личность</span>
          <button
            onPointerDown={() => setShowIdentity(true)}
            onPointerUp={() => setShowIdentity(false)}
            onPointerLeave={() => setShowIdentity(false)}
            className="rounded-lg bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-200 active:bg-zinc-700"
          >
            {showIdentity ? "Отпустите, чтобы скрыть" : "Зажмите для просмотра"}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-4 min-h-[60px]">
          {showIdentity ? (
            <div className="flex items-center gap-3 animate-fadeIn">
              <div className="h-12 w-12 rounded-lg bg-red-950/60 border border-red-500 flex items-center justify-center text-xl font-black text-red-400">
                👤
              </div>
              <div>
                <div className="text-base font-bold text-zinc-100">
                  {secretCard?.name || "Личность засекречена"}
                </div>
                <div className="text-xs text-zinc-400">
                  {secretCard?.role || "Не раскрыт"}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center text-xs text-zinc-600 font-mono italic">
              [Информация скрыта от чужих глаз]
            </div>
          )}
        </div>
      </div>

      {/* Тактический D-Pad (Сдвиг доски) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-lg">
        <div className="text-xs font-mono uppercase text-zinc-400 mb-3 text-center">
          Тактический сдвиг поля
        </div>

        {/* Выбор: Ряд или Колонка */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => {
              setShiftType("ROW");
              setShiftDirection("LEFT");
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              shiftType === "ROW"
                ? "bg-zinc-100 text-zinc-900"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400"
            }`}
          >
            Ряд (Горизонталь)
          </button>
          <button
            onClick={() => {
              setShiftType("COL");
              setShiftDirection("UP");
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              shiftType === "COL"
                ? "bg-zinc-100 text-zinc-900"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400"
            }`}
          >
            Колонка (Вертикаль)
          </button>
        </div>

        {/* Выбор индекса 1–5 */}
        <div className="flex justify-between gap-1 mb-4">
          {[0, 1, 2, 3, 4].map((idx) => (
            <button
              key={idx}
              onClick={() => setShiftIndex(idx)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-mono font-bold transition-all ${
                shiftIndex === idx
                  ? "bg-red-600 text-white shadow-md shadow-red-900/40"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Выбор направления и кнопка подтверждения */}
        <div className="grid grid-cols-2 gap-3">
          {shiftType === "ROW" ? (
            <>
              <button
                onClick={() => setShiftDirection("LEFT")}
                className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                  shiftDirection === "LEFT"
                    ? "bg-zinc-800 border-zinc-500 text-white"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-500"
                }`}
              >
                ◀ Влево
              </button>
              <button
                onClick={() => setShiftDirection("RIGHT")}
                className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                  shiftDirection === "RIGHT"
                    ? "bg-zinc-800 border-zinc-500 text-white"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-500"
                }`}
              >
                Вправо ▶
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShiftDirection("UP")}
                className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                  shiftDirection === "UP"
                    ? "bg-zinc-800 border-zinc-500 text-white"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-500"
                }`}
              >
                ▲ Вверх
              </button>
              <button
                onClick={() => setShiftDirection("DOWN")}
                className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                  shiftDirection === "DOWN"
                    ? "bg-zinc-800 border-zinc-500 text-white"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-500"
                }`}
              >
                Вниз ▼
              </button>
            </>
          )}
        </div>

        {/* Кнопка отправки хода */}
        <button
          disabled={!isMyTurn}
          onClick={handleApplyShift}
          className={`mt-4 w-full py-4 rounded-xl text-base font-black uppercase tracking-wider transition-all shadow-lg ${
            isMyTurn
              ? "bg-red-600 text-white hover:bg-red-500 active:scale-98 shadow-red-900/40"
              : "bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed"
          }`}
        >
          {isMyTurn ? "Выполнить сдвиг" : "Ход соперника"}
        </button>
      </div>

      {/* Нижняя плашка подсказки */}
      <div className="text-center text-[11px] font-mono text-zinc-500">
        Смотрите на общий экран телевизора для оценки позиции
      </div>
    </div>
  );
};
