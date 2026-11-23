import React from "react";
import type { LastShift } from "../../types/game";
import { isOppositeShift } from "../../utils/gameLogic";

interface ColShiftControlsProps {
  direction: "up" | "down";
  numCols: number;
  blockedShift?: { type: "ROW" | "COL"; index: number } | null;
  lastShift: LastShift | null;
  activeButtonId: string | null;
  highlightedArrowId?: string | null;
  onArrowClick: (buttonId: string, shiftAction: () => void) => void;
  onShiftCol: (colIdx: number, direction: "up" | "down") => void;
}

interface RowShiftControlsProps {
  direction: "left" | "right";
  numRows: number;
  blockedShift?: { type: "ROW" | "COL"; index: number } | null;
  lastShift: LastShift | null;
  activeButtonId: string | null;
  highlightedArrowId?: string | null;
  onArrowClick: (buttonId: string, shiftAction: () => void) => void;
  onShiftRow: (rowIdx: number, direction: "left" | "right") => void;
}

function getArrowClassName(
  isBlocked: boolean,
  isOpposite: boolean,
  isActive: boolean,
  isHighlighted: boolean,
  hasAnyHighlight: boolean,
  baseSize: string
) {
  if (isBlocked || isOpposite) {
    return `${baseSize} shrink-0 rounded text-[8px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-bold flex items-center justify-center border p-0 bg-zinc-950/40 text-zinc-600 border-zinc-800/40 cursor-not-allowed opacity-30 select-none`;
  }
  if (isHighlighted) {
    return `${baseSize} shrink-0 rounded text-[8px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-bold flex items-center justify-center border-2 p-0 bg-blue-600/30 border-blue-400 text-blue-200 shadow-[0_0_15px_rgba(37,99,235,0.6)] ring-2 ring-blue-400/80 cursor-pointer select-none active:scale-95 outline-none`;
  }
  if (isActive) {
    return `${baseSize} shrink-0 rounded text-[8px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-bold flex items-center justify-center border p-0 bg-zinc-800 border-white/80 text-white shadow-[0_0_12px_rgba(255,255,255,0.5)] ring-1 ring-white/40 cursor-pointer select-none active:scale-95 outline-none focus:outline-none`;
  }
  const dimmedClass = hasAnyHighlight ? "opacity-35" : "";
  return `${baseSize} shrink-0 rounded text-[8px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-bold flex items-center justify-center border p-0 bg-zinc-950/70 hover:bg-zinc-900/80 active:bg-zinc-800 border-white/10 hover:border-white/30 text-zinc-400 group-hover:text-white hover:text-white active:text-white cursor-pointer shadow-sm active:scale-95 select-none touch-manipulation outline-none focus:outline-none group ${dimmedClass}`;
}

export const ColShiftBar: React.FC<ColShiftControlsProps> = ({
  direction,
  numCols,
  blockedShift,
  lastShift,
  activeButtonId,
  highlightedArrowId,
  onArrowClick,
  onShiftCol,
}) => {
  const isUp = direction === "up";
  const canonicalDir = isUp ? "BACKWARD" : "FORWARD";
  const prefix = isUp ? "col-up" : "col-down";
  const arrowSymbol = isUp ? "↑" : "↓";
  const titleText = isUp ? "Маневр вверх" : "Маневр вниз";

  const colsArray = Array.from({ length: numCols }, (_, i) => i);
  const hasAnyHighlight = Boolean(highlightedArrowId);

  return (
    <div className={`w-full h-4 sm:h-5 md:h-7 lg:h-8 xl:h-9 min-h-[16px] sm:min-h-[20px] lg:min-h-[32px] xl:min-h-[36px] flex items-center gap-0.5 sm:gap-1 ${isUp ? "mb-0.5" : "mt-0.5"} shrink-0`}>
      <div className="w-3.5 sm:w-5 md:w-7 lg:w-8 xl:w-9 shrink-0" />
      <div
        className="grid gap-0.5 sm:gap-1 flex-1"
        style={{ gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))` }}
      >
        {colsArray.map((colIdx) => {
          const buttonId = `${prefix}-${colIdx}`;
          const isBlocked = blockedShift?.type === "COL" && blockedShift.index === colIdx;
          const isOpposite = isOppositeShift(lastShift, "COL", colIdx, canonicalDir);
          const isActive = activeButtonId === buttonId;
          const isHighlighted = highlightedArrowId === buttonId;

          return (
            <button
              key={buttonId}
              data-testid={buttonId}
              data-active-shift={isActive ? "true" : undefined}
              data-tutorial-highlight={isHighlighted ? "true" : undefined}
              disabled={isBlocked || isOpposite}
              onClick={(e) => {
                e.currentTarget.blur();
                onArrowClick(buttonId, () => onShiftCol(colIdx, direction));
              }}
              className={getArrowClassName(
                isBlocked,
                isOpposite,
                isActive,
                isHighlighted,
                hasAnyHighlight,
                "w-full h-4 sm:h-5 md:h-7 lg:h-8 xl:h-9 min-h-[16px] sm:min-h-[20px] lg:min-h-[32px] xl:min-h-[36px]"
              )}
              title={
                isBlocked
                  ? "Патруль полиции блокирует маневр"
                  : isOpposite
                    ? "Отмена хода противника запрещена"
                    : titleText
              }
            >
              {isBlocked ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              ) : isOpposite ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 opacity-40">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              ) : (
                arrowSymbol
              )}
            </button>
          );
        })}
      </div>
      <div className="w-3.5 sm:w-5 md:w-7 lg:w-8 xl:w-9 shrink-0" />
    </div>
  );
};

export const RowShiftBar: React.FC<RowShiftControlsProps> = ({
  direction,
  numRows,
  blockedShift,
  lastShift,
  activeButtonId,
  highlightedArrowId,
  onArrowClick,
  onShiftRow,
}) => {
  const isLeft = direction === "left";
  const canonicalDir = isLeft ? "BACKWARD" : "FORWARD";
  const prefix = isLeft ? "row-left" : "row-right";
  const arrowSymbol = isLeft ? "←" : "→";
  const titleText = isLeft ? "Маневр влево" : "Маневр вправо";

  const rowsArray = Array.from({ length: numRows }, (_, i) => i);
  const hasAnyHighlight = Boolean(highlightedArrowId);

  return (
    <div
      className="w-3.5 sm:w-5 md:w-7 lg:w-8 xl:w-9 shrink-0 grid gap-0.5 sm:gap-1"
      style={{ gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}
    >
      {rowsArray.map((rIdx) => {
        const buttonId = `${prefix}-${rIdx}`;
        const isRowBlocked = blockedShift?.type === "ROW" && blockedShift.index === rIdx;
        const isOpposite = isOppositeShift(lastShift, "ROW", rIdx, canonicalDir);
        const isActive = activeButtonId === buttonId;
        const isHighlighted = highlightedArrowId === buttonId;

        return (
          <button
            key={buttonId}
            data-testid={buttonId}
            data-active-shift={isActive ? "true" : undefined}
            data-tutorial-highlight={isHighlighted ? "true" : undefined}
            disabled={isRowBlocked || isOpposite}
            onClick={(e) => {
              e.currentTarget.blur();
              onArrowClick(buttonId, () => onShiftRow(rIdx, direction));
            }}
            className={getArrowClassName(
              isRowBlocked,
              isOpposite,
              isActive,
              isHighlighted,
              hasAnyHighlight,
              "w-full h-full"
            )}
            title={
              isRowBlocked
                ? "Патруль полиции блокирует маневр"
                : isOpposite
                  ? "Отмена хода противника запрещена"
                  : titleText
            }
          >
            {isRowBlocked ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            ) : isOpposite ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 opacity-40">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
            ) : (
              arrowSymbol
            )}
          </button>
        );
      })}
    </div>
  );
};
