import React from "react";
import type { Character, Role } from "../types/game";
import { CharacterCard } from "./CharacterCard";

export interface Board5x5Props {
  board: Character[][];
  onRevealCell?: (cellId: string, row: number, col: number) => void;
  onSelectCharacter?: (id: string) => void;
  selectedCharacterId?: string | null;
  currentTurn?: Role;
  actionPoints?: number;
  maxActionPoints?: number;
  className?: string;
  isInteractive?: boolean;
}

export const Board5x5: React.FC<Board5x5Props> = ({
  board,
  onRevealCell,
  onSelectCharacter,
  selectedCharacterId = null,
  currentTurn = "DETECTIVE",
  actionPoints = 3,
  maxActionPoints = 3,
  className = "",
  isInteractive = true,
}) => {
  return (
    <div className={`w-full flex flex-col items-center select-none ${className}`}>
      {/* Верхний статус-бар стейт-машины ходов (SSOT Header) */}
      <div className="w-full max-w-2xl mb-3 px-3 py-2 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md flex items-center justify-between text-xs font-mono shadow-[inset_0_1px_15px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-widest text-zinc-500 uppercase">СЕТКА:</span>
          <span className="text-zinc-200 font-bold tracking-wider">5×5 [25 КЛЕТОК]</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-widest text-zinc-500 uppercase">ОЧЕРЕДЬ:</span>
          <span
            className={`font-black tracking-widest uppercase px-2 py-0.5 rounded text-[10px] border ${
              currentTurn === "KILLER"
                ? "text-red-400 bg-red-950/40 border-red-500/40"
                : "text-blue-400 bg-blue-950/40 border-blue-500/40"
            }`}
          >
            {currentTurn === "KILLER" ? "МАНЬЯК" : "ДЕТЕКТИВ"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-widest text-zinc-500 uppercase">ОД:</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: maxActionPoints }).map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                  i < actionPoints
                    ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                    : "bg-zinc-800 border border-white/10"
                }`}
              />
            ))}
            <span className="text-cyan-400 font-black ml-1 text-xs">
              {actionPoints}/{maxActionPoints}
            </span>
          </div>
        </div>
      </div>

      {/* Сетка 5x5 без локальных стейтов (Pure SSOT Rendering) */}
      <div
        data-testid="board-5x5-grid"
        className="w-full max-w-2xl grid grid-cols-5 gap-1.5 sm:gap-2 md:gap-2.5 p-2 sm:p-3 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.9)]"
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isHidden = cell.status === "HIDDEN";
            const isBlocked = cell.status === "BLOCKED";
            const cellType = cell.cellType || "SUSPECT";

            // 1. СКРЫТАЯ КЛЕТКА (Туман войны / Неисследованный сектор)
            if (isHidden) {
              const canClick = isInteractive && actionPoints > 0;
              return (
                <button
                  key={cell.id || `cell_${r}_${c}`}
                  type="button"
                  data-testid={`cell-${r}-${c}`}
                  data-cell-id={cell.id}
                  data-cell-status="HIDDEN"
                  disabled={!canClick}
                  onClick={() => onRevealCell?.(cell.id, r, c)}
                  className={`aspect-square w-full rounded-xl border border-white/15 bg-black/60 p-1.5 flex flex-col justify-between items-center text-center transition-all duration-200 group relative overflow-hidden ${
                    canClick
                      ? "hover:border-cyan-400/60 hover:bg-zinc-900/80 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] cursor-pointer active:scale-95"
                      : "opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="w-full flex justify-between items-center text-[8px] font-mono text-zinc-600 group-hover:text-cyan-400 transition-colors">
                    <span>{r + 1}:{c + 1}</span>
                    <span className="opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity">-1 ОД</span>
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-zinc-900/60 border border-white/10 flex items-center justify-center text-zinc-500 group-hover:text-cyan-400 group-hover:border-cyan-500/40 transition-all shadow-inner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                    </svg>
                  </div>

                  <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-500 group-hover:text-zinc-200 transition-colors">
                    РАЗВЕДКА
                  </span>
                </button>
              );
            }

            // 2. ЗАБЛОКИРОВАННАЯ КЛЕТКА
            if (isBlocked) {
              return (
                <div
                  key={cell.id || `cell_${r}_${c}`}
                  data-testid={`cell-${r}-${c}`}
                  data-cell-id={cell.id}
                  data-cell-status="BLOCKED"
                  className="aspect-square w-full rounded-xl border border-red-500/30 bg-red-950/20 p-1.5 flex flex-col justify-between items-center text-center cursor-not-allowed select-none opacity-80"
                >
                  <span className="text-[8px] font-mono text-red-500/60 self-start">{r + 1}:{c + 1}</span>
                  <div className="w-7 h-7 rounded-lg bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-red-400">
                    БЛОК
                  </span>
                </div>
              );
            }

            // 3. ОТКРЫТАЯ КЛЕТКА: УЛИКА (CLUE)
            if (cellType === "CLUE") {
              return (
                <div
                  key={cell.id || `cell_${r}_${c}`}
                  data-testid={`cell-${r}-${c}`}
                  data-cell-id={cell.id}
                  data-cell-type="CLUE"
                  data-cell-status="REVEALED"
                  className="aspect-square w-full rounded-xl border border-amber-500/40 bg-zinc-950/90 p-1.5 flex flex-col justify-between text-left shadow-[0_0_12px_rgba(245,158,11,0.15)] relative overflow-hidden"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-mono text-amber-500/70">{r + 1}:{c + 1}</span>
                    <span className="text-[8px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/50 border border-amber-500/30 px-1 rounded">
                      УЛИКА
                    </span>
                  </div>

                  <div className="my-auto">
                    <div className="text-[10px] font-bold text-zinc-100 line-clamp-1 leading-tight">
                      {cell.name}
                    </div>
                    {cell.clueData?.description && (
                      <div className="text-[8px] text-zinc-400 line-clamp-2 mt-0.5 leading-tight">
                        {cell.clueData.description}
                      </div>
                    )}
                  </div>

                  <div className="h-1 w-full bg-amber-500/30 rounded-full" />
                </div>
              );
            }

            // 4. ОТКРЫТАЯ КЛЕТКА: ПУСТОЙ СЕКТОР (EMPTY)
            if (cellType === "EMPTY") {
              return (
                <div
                  key={cell.id || `cell_${r}_${c}`}
                  data-testid={`cell-${r}-${c}`}
                  data-cell-id={cell.id}
                  data-cell-type="EMPTY"
                  data-cell-status="REVEALED"
                  className="aspect-square w-full rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-1.5 flex flex-col justify-between items-center text-center opacity-60"
                >
                  <span className="text-[8px] font-mono text-zinc-600 self-start">{r + 1}:{c + 1}</span>
                  <div className="w-6 h-6 rounded-md border border-white/5 flex items-center justify-center text-zinc-600">
                    ✕
                  </div>
                  <span className="text-[8px] font-mono tracking-wider uppercase text-zinc-600">
                    ПУСТО
                  </span>
                </div>
              );
            }

            // 5. ОТКРЫТАЯ КЛЕТКА: ПОДОЗРЕВАЕМЫЙ (SUSPECT) / КЛАССИЧЕСКИЙ ПЕРСОНАЖ
            return (
              <div
                key={cell.id || `cell_${r}_${c}`}
                data-testid={`cell-${r}-${c}`}
                data-cell-id={cell.id}
                data-cell-type="SUSPECT"
                data-cell-status="REVEALED"
                className="aspect-square w-full"
              >
                <CharacterCard
                  character={cell}
                  isSelected={selectedCharacterId === cell.id}
                  onClick={() => onSelectCharacter?.(cell.id)}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
