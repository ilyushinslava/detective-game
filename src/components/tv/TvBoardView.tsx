import React from "react";
import type { GameState } from "../../types/game";

interface TvBoardViewProps {
  gameState: GameState;
  secondsElapsed?: number;
}

export const TvBoardView: React.FC<TvBoardViewProps> = ({
  gameState,
  secondsElapsed = 0,
}) => {
  const { board, currentTurn, round, killCount, trophiesKiller, matchPot } = gameState;

  const turnLabel =
    currentTurn === "KILLER"
      ? "ХОД: УБИЙЦА"
      : currentTurn === "DETECTIVE"
      ? "ХОД: ДЕТЕКТИВ"
      : `ХОД: ${String(currentTurn).toUpperCase()}`;

  const turnColor =
    currentTurn === "KILLER"
      ? "text-red-500 border-red-500/40 bg-red-950/20"
      : "text-blue-500 border-blue-500/40 bg-blue-950/20";

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-between bg-[#080a0f] p-8 text-zinc-100 select-none">
      {/* Верхний статус-бар */}
      <div className="flex w-full max-w-7xl items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-6">
          <div className={`rounded-xl border px-6 py-2 text-2xl font-black tracking-widest uppercase ${turnColor}`}>
            {turnLabel}
          </div>
          <div className="text-xl font-mono text-zinc-400">
            Раунд: <span className="font-bold text-zinc-100">{round ?? 1}</span>
          </div>
        </div>

        <div className="flex items-center gap-8 font-mono text-2xl">
          <div>
            Жертвы: <span className="font-black text-red-500">{killCount ?? 0}</span>
          </div>
          {trophiesKiller !== undefined && (
            <div>
              Трофеи: <span className="font-black text-amber-500">{trophiesKiller}</span>
            </div>
          )}
          {matchPot ? (
            <div>
              Банк: <span className="font-black text-emerald-400">{matchPot}</span>
            </div>
          ) : null}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-1 text-zinc-300">
            ⏱ {Math.floor(secondsElapsed / 60)}:{(secondsElapsed % 60).toString().padStart(2, "0")}
          </div>
        </div>
      </div>

      {/* Центральное игровое поле 5x5 для ТВ (крупный масштаб) */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="grid grid-cols-5 gap-3 rounded-2xl border-2 border-zinc-800 bg-zinc-950/90 p-4 shadow-2xl">
          {board?.map((row, rIdx) =>
            row.map((card, cIdx) => {
              const isDead = !card.isAlive;
              return (
                <div
                  key={card.id || `${rIdx}-${cIdx}`}
                  className={`relative flex h-28 w-24 flex-col items-center justify-between rounded-xl border p-2 text-center transition-all ${
                    isDead
                      ? "border-red-950 bg-red-950/20 opacity-40 grayscale"
                      : "border-zinc-800 bg-zinc-900/80 shadow-md"
                  }`}
                >
                  <div className="text-xs font-mono text-zinc-500">
                    {rIdx + 1}:{cIdx + 1}
                  </div>
                  <div className="text-xs font-bold leading-tight text-zinc-200 line-clamp-2">
                    {card.name}
                  </div>
                  {isDead ? (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-red-600/80">
                      ✕
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-400 font-medium">
                      {card.role || "Житель"}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Нижняя информационная строка */}
      <div className="w-full max-w-7xl border-t border-zinc-800 pt-3 text-center text-sm font-mono text-zinc-500">
        Экран трансляции (TV Display) • Личные роли и карты скрыты на экранах смартфонов
      </div>
    </div>
  );
};
