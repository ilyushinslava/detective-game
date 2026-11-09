import { useRef, useState, useEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";
import type { Character, LastShift, GameModeType } from "../types/game";
import { CharacterCard } from "./CharacterCard";
import { isOppositeShift } from "../utils/gameLogic";

export type ShiftDirection = "up" | "down" | "left" | "right";

export interface ShiftIndicatorState {
  type: "col" | "row";
  index: number;
  direction: ShiftDirection;
}

export function getShiftIndicator(
  type: "ROW" | "COL",
  index: number,
  direction: "FORWARD" | "BACKWARD"
): ShiftIndicatorState {
  if (type === "COL") {
    return {
      type: "col",
      index,
      direction: direction === "BACKWARD" ? "up" : "down",
    };
  }
  return {
    type: "row",
    index,
    direction: direction === "FORWARD" ? "right" : "left",
  };
}

interface GameBoardProps {
  mode: GameModeType;
  board: Character[][];
  selectedCharacterId: string | null;
  killerAdjacentIds: string[];
  detectiveAdjacentIds: string[];
  showKillerHints: boolean;
  showDetectiveHints: boolean;
  lastShift: LastShift | null;
  lastRobbedId?: string | null;
  blockedShift?: { type: "ROW" | "COL"; index: number } | null;
  uniformedOfficerIds?: string[];
  targetVictimId?: string | null;
  radarTargetId?: string | null;
  radarCellIds?: string[];
  radarColorClass?: string | null;
  errorCardId?: string | null;
  myCharacterId?: string | null;
  isPVP?: boolean;
  myRoleColor?: "red" | "blue";
  isModalOpen?: boolean;
  onShift: (
    type: "ROW" | "COL",
    index: number,
    direction: "FORWARD" | "BACKWARD",
  ) => void;
  onSelectCharacter: (id: string) => void;
}

export const GameBoard = ({
  mode,
  board,
  selectedCharacterId,
  killerAdjacentIds,
  detectiveAdjacentIds,
  showKillerHints,
  showDetectiveHints,
  blockedShift,
  lastShift,
  lastRobbedId = null,
  uniformedOfficerIds,
  targetVictimId,
  radarTargetId,
  radarCellIds = [],
  radarColorClass = null,
  errorCardId = null,
  myCharacterId = null,
  isPVP = false,
  myRoleColor,
  isModalOpen = false,
  onShift,
  onSelectCharacter,
}: GameBoardProps) => {
  const isLineUp = mode === "LINE_UP";
  const numRows = board.length;
  const numCols = board[0]?.length || 5;
  const colsArray = Array.from({ length: numCols }, (_, i) => i);
  const rowsArray = Array.from({ length: numRows }, (_, i) => i);

  const [activeButtonId, setActiveButtonId] = useState<string | null>(null);
  const shiftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shiftTimeoutRef.current) {
        clearTimeout(shiftTimeoutRef.current);
      }
    };
  }, []);

  const handleArrowClick = (buttonId: string, shiftAction: () => void) => {
    if (shiftTimeoutRef.current) {
      clearTimeout(shiftTimeoutRef.current);
    }
    setActiveButtonId(buttonId);
    shiftTimeoutRef.current = setTimeout(() => {
      setActiveButtonId(null);
      shiftTimeoutRef.current = null;
    }, 250);
    shiftAction();
  };

  const handleShiftCol = (colIdx: number, direction: "up" | "down") => {
    const canonicalDir = direction === "up" ? "BACKWARD" : "FORWARD";
    onShift("COL", colIdx, canonicalDir);
  };

  const handleShiftRow = (rIdx: number, direction: "left" | "right") => {
    const canonicalDir = direction === "left" ? "BACKWARD" : "FORWARD";
    onShift("ROW", rIdx, canonicalDir);
  };

  const getArrowClassName = (
    isBlocked: boolean,
    isOpposite: boolean,
    isActive: boolean,
    baseSize: string
  ) => {
    if (isBlocked || isOpposite) {
      return `${baseSize} shrink-0 rounded text-[8px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-bold flex items-center justify-center border p-0 bg-zinc-950/40 text-zinc-600 border-zinc-800/40 cursor-not-allowed opacity-30 select-none`;
    }
    if (isActive) {
      return `${baseSize} shrink-0 rounded text-[8px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-bold flex items-center justify-center border p-0 bg-zinc-800 border-white/80 text-white shadow-[0_0_12px_rgba(255,255,255,0.5)] ring-1 ring-white/40 cursor-pointer select-none active:scale-95 outline-none focus:outline-none`;
    }
    return `${baseSize} shrink-0 rounded text-[8px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-bold flex items-center justify-center border p-0 bg-zinc-950/70 hover:bg-zinc-900/80 active:bg-zinc-800 border border-white/10 hover:border-white/30 text-zinc-400 group-hover:text-white hover:text-white active:text-white cursor-pointer shadow-sm active:scale-95 select-none touch-manipulation outline-none focus:outline-none group`;
  };

  const touchStartRef = useRef<{
    x: number;
    y: number;
    row: number;
    col: number;
  } | null>(null);
  const hasSwipedRef = useRef(false);

  const handleTouchStart = (rIdx: number, cIdx: number, e: React.TouchEvent) => {
    if (isModalOpen) {
      touchStartRef.current = null;
      return;
    }
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      row: rIdx,
      col: cIdx,
    };
    hasSwipedRef.current = false;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isModalOpen || !touchStartRef.current) {
      touchStartRef.current = null;
      return;
    }
    const touch = e.changedTouches[0];
    if (!touch) {
      touchStartRef.current = null;
      return;
    }

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const threshold = 35;

    if (!isLineUp && (absX >= threshold || absY >= threshold)) {
      hasSwipedRef.current = true;
      const startR = touchStartRef.current.row;
      const startC = touchStartRef.current.col;

      if (absX > absY) {
        // Горизонтальный свайп по строке
        const direction = deltaX > 0 ? "right" : "left";
        const canonicalDir = direction === "right" ? "FORWARD" : "BACKWARD";
        const isRowBlocked =
          blockedShift?.type === "ROW" && blockedShift.index === startR;
        const isOpposite = isOppositeShift(lastShift, "ROW", startR, canonicalDir);
        if (!isRowBlocked && !isOpposite) {
          const buttonId = `row-${direction}-${startR}`;
          handleArrowClick(buttonId, () => handleShiftRow(startR, direction));
        }
      } else {
        // Вертикальный свайп по колонке
        const direction = deltaY > 0 ? "down" : "up";
        const canonicalDir = direction === "down" ? "FORWARD" : "BACKWARD";
        const isColBlocked =
          blockedShift?.type === "COL" && blockedShift.index === startC;
        const isOpposite = isOppositeShift(lastShift, "COL", startC, canonicalDir);
        if (!isColBlocked && !isOpposite) {
          const buttonId = `col-${direction}-${startC}`;
          handleArrowClick(buttonId, () => handleShiftCol(startC, direction));
        }
      }
    }
    touchStartRef.current = null;
  };

  const handleCardClick = (id: string) => {
    if (isModalOpen) return;
    if (hasSwipedRef.current) {
      hasSwipedRef.current = false;
      return;
    }
    onSelectCharacter(id);
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-0.5 select-none mx-auto w-full max-w-[min(100vw-0.5rem,calc(100dvh-19.5rem))] landscape:max-w-[min(calc(100vw-22rem),calc(100dvh-7.5rem))] lg:landscape:max-w-[min(calc(100vw-26rem),calc(100dvh-8rem))] xl:landscape:max-w-[min(calc(100vw-30rem),calc(100dvh-8.5rem))] shrink-0 touch-none">
      <style>{`
        @keyframes radarMarch {
          from { stroke-dashoffset: 0; } 
          to { stroke-dashoffset: -20; }
        }
        .radar-marching-stroke {
          stroke-dasharray: 6 4;
          animation: radarMarch 1.4s linear infinite;
        }
      `}</style>
      {!isLineUp && (
        <div className="w-full h-4 sm:h-5 md:h-7 lg:h-8 xl:h-9 min-h-[16px] sm:min-h-[20px] lg:min-h-[32px] xl:min-h-[36px] flex items-center gap-0.5 sm:gap-1 mb-0.5 shrink-0">
          <div className="w-3.5 sm:w-5 md:w-7 lg:w-8 xl:w-9 shrink-0" />
          <div
            className="grid gap-0.5 sm:gap-1 flex-1"
            style={{ gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))` }}
          >
            {colsArray.map((colIdx) => {
              const buttonId = `col-up-${colIdx}`;
              const isBlocked =
                blockedShift?.type === "COL" && blockedShift.index === colIdx;
              const isOpposite = isOppositeShift(
                lastShift,
                "COL",
                colIdx,
                "BACKWARD",
              );
              const isActive = activeButtonId === buttonId;

              return (
                <button
                  key={buttonId}
                  data-testid={buttonId}
                  data-active-shift={isActive ? "true" : undefined}
                  disabled={isBlocked || isOpposite}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleArrowClick(buttonId, () => handleShiftCol(colIdx, "up"));
                  }}
                  className={getArrowClassName(
                    isBlocked,
                    isOpposite,
                    isActive,
                    "w-full h-4 sm:h-5 md:h-7 lg:h-8 xl:h-9 min-h-[16px] sm:min-h-[20px] lg:min-h-[32px] xl:min-h-[36px]"
                  )}
                  title={
                    isBlocked
                      ? "Патруль полиции блокирует маневр"
                      : isOpposite
                        ? "Отмена хода противника запрещена"
                        : "Маневр вверх"
                  }
                >
                  {isBlocked ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  ) : isOpposite ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 opacity-40"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  ) : "↑"}
                </button>
              );
            })}
          </div>
          <div className="w-3.5 sm:w-5 md:w-7 lg:w-8 xl:w-9 shrink-0" />
        </div>
      )}

      {/* ЦЕНТРАЛЬНАЯ ЧАСТЬ: Левые кнопки + Единый Grid Доски + Правые кнопки */}
      <div className="w-full flex items-stretch gap-0.5 sm:gap-1">
        {!isLineUp && (
          <div
            className="w-3.5 sm:w-5 md:w-7 lg:w-8 xl:w-9 shrink-0 grid gap-0.5 sm:gap-1"
            style={{ gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}
          >
            {rowsArray.map((rIdx) => {
              const buttonId = `row-left-${rIdx}`;
              const isRowBlocked =
                blockedShift?.type === "ROW" && blockedShift.index === rIdx;
              const isOppositeLeft = isOppositeShift(
                lastShift,
                "ROW",
                rIdx,
                "BACKWARD",
              );
              const isActive = activeButtonId === buttonId;

              return (
                <button
                  key={buttonId}
                  data-testid={buttonId}
                  data-active-shift={isActive ? "true" : undefined}
                  disabled={isRowBlocked || isOppositeLeft}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleArrowClick(buttonId, () => handleShiftRow(rIdx, "left"));
                  }}
                  className={getArrowClassName(
                    isRowBlocked,
                    isOppositeLeft,
                    isActive,
                    "w-full h-full"
                  )}
                  title={
                    isRowBlocked
                      ? "Патруль полиции блокирует маневр"
                      : isOppositeLeft
                        ? "Отмена хода противника запрещена"
                        : "Маневр влево"
                  }
                >
                  {isRowBlocked ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  ) : isOppositeLeft ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 opacity-40"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  ) : "←"}
                </button>
              );
            })}
          </div>
        )}

        {/* ЕДИНЫЙ GRID ИГРОВОГО ПОЛЯ */}
        <LayoutGroup id="game-board-grid">
        <div
          className="flex-1 aspect-square grid gap-0.5 sm:gap-1 touch-none select-none relative isolate"
          style={{
            gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
            touchAction: "none",
          }}
        >
          {board.flatMap((row, rIdx) =>
            row.map((character, cIdx) => {
              const isSelected = selectedCharacterId === character.id;
              const isRadarCell = radarCellIds.includes(character.id);
              const isRadarTarget = character.id === radarTargetId;

              const isWrappingCell = Boolean(
                lastShift &&
                  ((lastShift.type === "ROW" &&
                    lastShift.index === rIdx &&
                    (lastShift.direction === "FORWARD" ? cIdx === 0 : cIdx === numCols - 1)) ||
                   (lastShift.type === "COL" &&
                    lastShift.index === cIdx &&
                    (lastShift.direction === "FORWARD" ? rIdx === 0 : rIdx === numRows - 1)))
              );

              const cellZIndex = isSelected
                ? "z-40"
                : isRadarCell || isRadarTarget
                  ? "z-30"
                  : isWrappingCell
                    ? "z-0"
                    : "z-10";

              let neighborRole: "red" | "blue" | "purple" | null = null;
              const isKillerNeighbor = showKillerHints && killerAdjacentIds.includes(character.id);
              const isDetectiveNeighbor = showDetectiveHints && detectiveAdjacentIds.includes(character.id);

              if (isKillerNeighbor && isDetectiveNeighbor) {
                neighborRole = "purple";
              } else if (isKillerNeighbor) {
                neighborRole = "red";
              } else if (isDetectiveNeighbor) {
                neighborRole = "blue";
              }

              const isRedRadar = Boolean(radarColorClass?.includes("red"));

              return (
                <motion.div
                  key={character.id}
                  layout
                  animate={{
                    scale: character.isAlive ? 1 : 0.95,
                    opacity: character.isAlive ? 1 : 0.65,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 180,
                    damping: 24,
                  }}
                  className={`w-full h-full aspect-square relative touch-none select-none overflow-visible ${
                    character.isAlive ? "z-10" : "z-0"
                  } ${cellZIndex}`}
                  onTouchStart={(e) => handleTouchStart(rIdx, cIdx, e)}
                  onTouchEnd={handleTouchEnd}
                >
                  <CharacterCard
                    mode={mode}
                    character={character}
                    isSelected={isSelected}
                    neighborRole={neighborRole}
                    neighborHighlightColor={neighborRole ? `border-2 border-${neighborRole}-500` : null}
                    isUniformedOfficer={uniformedOfficerIds?.includes(
                      character.id,
                    )}
                    isTargetVictim={character.id === targetVictimId}
                    isLastRobbed={character.id === lastRobbedId}
                    isRadarCenter={isRadarTarget}
                    radarRingColor={isRadarCell ? (radarColorClass || "border-blue-500 ring-2 ring-blue-500/70") : null}
                    isError={character.id === errorCardId}
                    isMyCharacter={character.id === myCharacterId}
                    isOverlapZone={false}
                    isPVP={isPVP}
                    myRoleColor={myRoleColor}
                    onClick={() => handleCardClick(character.id)}
                  />

                  {(isRadarCell || isRadarTarget) && (
                    <div className="absolute inset-0 rounded-md sm:rounded-xl pointer-events-none z-30 overflow-hidden">
                      <div
                        className={`absolute inset-0 rounded-md sm:rounded-xl mix-blend-screen transition-opacity duration-300 ${
                          isRadarTarget
                            ? isRedRadar ? "bg-red-500/15 shadow-[inset_0_0_15px_rgba(239,68,68,0.25)]" : "bg-blue-500/15 shadow-[inset_0_0_15px_rgba(59,130,246,0.25)]"
                            : isRedRadar ? "bg-red-500/10" : "bg-blue-500/10"
                        }`}
                      />

                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <rect
                          x="1.5"
                          y="1.5"
                          width="calc(100% - 3px)"
                          height="calc(100% - 3px)"
                          rx="9"
                          fill="none"
                          stroke={isRedRadar ? "#f87171" : "#3b82f6"}
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="radar-marching-stroke"
                          style={{
                            filter: `drop-shadow(0 0 4px ${isRedRadar ? "rgba(239,68,68,0.7)" : "rgba(59,130,246,0.7)"})`,
                          }}
                        />
                      </svg>

                      {isRadarTarget && (
                        <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-zinc-950/90 border border-blue-400 flex items-center justify-center shadow-[0_0_8px_rgba(59,130,246,0.9)] z-30">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
        </LayoutGroup>

        {!isLineUp && (
          <div
            className="w-3.5 sm:w-5 md:w-7 lg:w-8 xl:w-9 shrink-0 grid gap-0.5 sm:gap-1"
            style={{ gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}
          >
            {rowsArray.map((rIdx) => {
              const buttonId = `row-right-${rIdx}`;
              const isRowBlocked =
                blockedShift?.type === "ROW" && blockedShift.index === rIdx;
              const isOppositeRight = isOppositeShift(
                lastShift,
                "ROW",
                rIdx,
                "FORWARD",
              );
              const isActive = activeButtonId === buttonId;

              return (
                <button
                  key={buttonId}
                  data-testid={buttonId}
                  data-active-shift={isActive ? "true" : undefined}
                  disabled={isRowBlocked || isOppositeRight}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleArrowClick(buttonId, () => handleShiftRow(rIdx, "right"));
                  }}
                  className={getArrowClassName(
                    isRowBlocked,
                    isOppositeRight,
                    isActive,
                    "w-full h-full"
                  )}
                  title={
                    isRowBlocked
                      ? "Патруль полиции блокирует маневр"
                      : isOppositeRight
                        ? "Отмена хода противника запрещена"
                        : "Маневр вправо"
                  }
                >
                  {isRowBlocked ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  ) : isOppositeRight ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 opacity-40"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  ) : "→"}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!isLineUp && (
        <div className="w-full h-4 sm:h-5 md:h-7 lg:h-8 xl:h-9 min-h-[16px] sm:min-h-[20px] lg:min-h-[32px] xl:min-h-[36px] flex items-center gap-0.5 sm:gap-1 mt-0.5 shrink-0">
          <div className="w-3.5 sm:w-5 md:w-7 lg:w-8 xl:w-9 shrink-0" />
          <div
            className="grid gap-0.5 sm:gap-1 flex-1"
            style={{ gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))` }}
          >
            {colsArray.map((colIdx) => {
              const buttonId = `col-down-${colIdx}`;
              const isBlocked =
                blockedShift?.type === "COL" && blockedShift.index === colIdx;
              const isOpposite = isOppositeShift(
                lastShift,
                "COL",
                colIdx,
                "FORWARD",
              );
              const isActive = activeButtonId === buttonId;

              return (
                <button
                  key={buttonId}
                  data-testid={buttonId}
                  data-active-shift={isActive ? "true" : undefined}
                  disabled={isBlocked || isOpposite}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleArrowClick(buttonId, () => handleShiftCol(colIdx, "down"));
                  }}
                  className={getArrowClassName(
                    isBlocked,
                    isOpposite,
                    isActive,
                    "w-full h-3.5 sm:h-5 md:h-7 lg:h-8 xl:h-9 min-h-[16px] sm:min-h-[20px] lg:min-h-[32px] xl:min-h-[36px]"
                  )}
                  title={
                    isBlocked
                      ? "Патруль полиции блокирует маневр"
                      : isOpposite
                        ? "Отмена хода противника запрещена"
                        : "Маневр вниз"
                  }
                >
                  {isBlocked ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  ) : isOpposite ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 opacity-40"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  ) : "↓"}
                </button>
              );
            })}
          </div>
          <div className="w-3.5 sm:w-5 md:w-7 lg:w-8 xl:w-9 shrink-0" />
        </div>
      )}
    </div>
  );
};
