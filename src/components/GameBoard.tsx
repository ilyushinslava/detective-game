// src/components/GameBoard.tsx
import { useRef } from "react";
import { motion, LayoutGroup } from "framer-motion";
import type { Character, LastShift, GameModeType } from "../types/game";
import { CharacterCard } from "./CharacterCard";
import { isOppositeShift } from "../utils/gameLogic";

interface GameBoardProps {
  mode: GameModeType;
  board: Character[][];
  selectedCharacterId: string | null;
  killerAdjacentIds: string[];
  detectiveAdjacentIds: string[];
  showKillerHints: boolean;
  showDetectiveHints: boolean;
  lastShift: LastShift | null;
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
  uniformedOfficerIds,
  targetVictimId,
  radarTargetId,
  radarCellIds = [],
  radarColorClass = null,
  errorCardId = null,
  myCharacterId = null,
  isPVP = false,
  myRoleColor,
  onShift,
  onSelectCharacter,
}: GameBoardProps) => {
  const isLineUp = mode === "LINE_UP";
  const numRows = board.length;
  const numCols = board[0]?.length || 5;
  const colsArray = Array.from({ length: numCols }, (_, i) => i);
  const rowsArray = Array.from({ length: numRows }, (_, i) => i);

  const touchStartRef = useRef<{
    x: number;
    y: number;
    row: number;
    col: number;
  } | null>(null);
  const hasSwipedRef = useRef(false);

  const handleTouchStart = (rIdx: number, cIdx: number, e: React.TouchEvent) => {
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
    if (!touchStartRef.current) return;
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
        const direction = deltaX > 0 ? "FORWARD" : "BACKWARD";
        const isRowBlocked =
          blockedShift?.type === "ROW" && blockedShift.index === startR;
        const isOpposite = isOppositeShift(lastShift, "ROW", startR, direction);
        if (!isRowBlocked && !isOpposite) {
          onShift("ROW", startR, direction);
        }
      } else {
        // Вертикальный свайп по колонке
        const direction = deltaY > 0 ? "FORWARD" : "BACKWARD";
        const isColBlocked =
          blockedShift?.type === "COL" && blockedShift.index === startC;
        const isOpposite = isOppositeShift(lastShift, "COL", startC, direction);
        if (!isColBlocked && !isOpposite) {
          onShift("COL", startC, direction);
        }
      }
    }
    touchStartRef.current = null;
  };

  const handleCardClick = (id: string) => {
    if (hasSwipedRef.current) {
      hasSwipedRef.current = false;
      return;
    }
    onSelectCharacter(id);
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-0.5 sm:p-1 select-none mx-auto w-full max-w-[min(100vw-1rem,calc(100dvh-13.5rem))] aspect-square shrink-0 touch-none">
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
        <div className="w-full h-3.5 sm:h-5 md:h-7 flex items-center gap-0.5 sm:gap-1 mb-0.5 shrink-0">
          <div className="w-3.5 sm:w-5 md:w-7 shrink-0" />
          <div
            className="grid gap-0.5 sm:gap-1 flex-1"
            style={{ gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))` }}
          >
            {colsArray.map((colIdx) => {
              const isBlocked =
                blockedShift?.type === "COL" && blockedShift.index === colIdx;
              const isOpposite = isOppositeShift(
                lastShift,
                "COL",
                colIdx,
                "BACKWARD",
              );
              const isLastShiftBtn =
                lastShift?.type === "COL" &&
                lastShift.index === colIdx &&
                lastShift.direction === "BACKWARD";

              return (
                <button
                  key={`col-up-${colIdx}`}
                  disabled={isBlocked || isOpposite}
                  onClick={(e) => { e.currentTarget.blur(); onShift("COL", colIdx, "BACKWARD"); }}
                  className={`w-full h-3.5 sm:h-5 md:h-7 shrink-0 rounded text-[8px] sm:text-xs md:text-sm font-bold transition-transform duration-75 flex items-center justify-center border active:scale-90 p-0 ${
                    isOpposite
                      ? "invisible pointer-events-none"
                      : isBlocked
                        ? "bg-zinc-900/40 text-zinc-600 border-zinc-800/50 cursor-not-allowed opacity-50"
                        : "bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shadow-inner touch-manipulation select-none"
                  }`}
                  title={
                    isBlocked
                      ? "Патруль полиции блокирует сдвиг"
                      : isLastShiftBtn
                        ? "Последний сдвиг"
                        : "Сдвиг вверх"
                  }
                >
                  {isBlocked ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> : "↑"}
                </button>
              );
            })}
          </div>
          <div className="w-3.5 sm:w-5 md:w-7 shrink-0" />
        </div>
      )}

      {/* ЦЕНТРАЛЬНАЯ ЧАСТЬ: Левые кнопки + Единый Grid Доски + Правые кнопки */}
      <div className="w-full flex items-stretch gap-0.5 sm:gap-1">
        {!isLineUp && (
          <div
            className="w-3.5 sm:w-5 md:w-7 shrink-0 grid gap-0.5 sm:gap-1"
            style={{ gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}
          >
            {rowsArray.map((rIdx) => {
              const isRowBlocked =
                blockedShift?.type === "ROW" && blockedShift.index === rIdx;
              const isOppositeLeft = isOppositeShift(
                lastShift,
                "ROW",
                rIdx,
                "BACKWARD",
              );
              const isLastShiftBtn =
                lastShift?.type === "ROW" &&
                lastShift.index === rIdx &&
                lastShift.direction === "BACKWARD";

              return (
                <button
                  key={`row-left-${rIdx}`}
                  disabled={isRowBlocked || isOppositeLeft}
                  onClick={(e) => { e.currentTarget.blur(); onShift("ROW", rIdx, "BACKWARD"); }}
                  className={`w-full h-full rounded text-[8px] sm:text-xs md:text-sm font-bold transition-transform duration-75 flex items-center justify-center border active:scale-90 p-0 ${
                    isOppositeLeft
                      ? "invisible pointer-events-none"
                      : isRowBlocked
                        ? "bg-zinc-900/40 text-zinc-600 border-zinc-800/50 cursor-not-allowed opacity-50"
                        : "bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shadow-inner touch-manipulation select-none"
                  }`}
                  title={
                    isRowBlocked
                      ? "Патруль полиции блокирует сдвиг"
                      : isLastShiftBtn
                        ? "Последний сдвиг"
                        : "Сдвиг влево"
                  }
                >
                  {isRowBlocked ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> : "←"}
                </button>
              );
            })}
          </div>
        )}

        {/* ЕДИНЫЙ GRID ИГРОВОГО ПОЛЯ */}
        <LayoutGroup id="game-board-grid">
        <div
          className="flex-1 aspect-square grid gap-0.5 sm:gap-1 touch-none select-none"
          style={{
            gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
            touchAction: "none",
          }}
        >
          {board.map((row, rIdx) =>
            row.map((character, cIdx) => {
              const isSelected = selectedCharacterId === character.id;
              const isRadarCell = radarCellIds.includes(character.id);
              const isRadarTarget = character.id === radarTargetId;
              const isLastShiftTrack = Boolean(
                lastShift &&
                  ((lastShift.type === "ROW" && lastShift.index === rIdx) ||
                    (lastShift.type === "COL" && lastShift.index === cIdx))
              );
              const isShiftEntryPoint = Boolean(
                lastShift &&
                  ((lastShift.type === "ROW" &&
                    lastShift.index === rIdx &&
                    ((lastShift.direction === "FORWARD" && cIdx === 0) ||
                      (lastShift.direction === "BACKWARD" && cIdx === numCols - 1))) ||
                    (lastShift.type === "COL" &&
                      lastShift.index === cIdx &&
                      ((lastShift.direction === "FORWARD" && rIdx === 0) ||
                        (lastShift.direction === "BACKWARD" && rIdx === numRows - 1))))
              );

              let neighborColor = null;
              if (showKillerHints && killerAdjacentIds.includes(character.id)) {
                neighborColor = "border-2 border-red-500 bg-red-950/25 shadow-[0_0_16px_rgba(239,68,68,0.8)]";
              } else if (showDetectiveHints && detectiveAdjacentIds.includes(character.id)) {
                neighborColor = "border-2 border-blue-500 bg-blue-950/25 shadow-[0_0_16px_rgba(59,130,246,0.8)]";
              }

              const isRedRadar = Boolean(radarColorClass?.includes("red"));

              return (
                <motion.div
                  key={character.id}
                  layoutId={character.id}
                  layout="position"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="w-full h-full aspect-square relative touch-none select-none"
                  onTouchStart={(e) => handleTouchStart(rIdx, cIdx, e)}
                  onTouchEnd={handleTouchEnd}
                >
                  <CharacterCard
                    mode={mode}
                    character={character}
                    isSelected={isSelected}
                    neighborHighlightColor={neighborColor}
                    isUniformedOfficer={uniformedOfficerIds?.includes(
                      character.id,
                    )}
                    isTargetVictim={character.id === targetVictimId}
                    isRadarCenter={isRadarTarget}
                    radarRingColor={isRadarCell ? radarColorClass : null}
                    isError={character.id === errorCardId}
                    isMyCharacter={character.id === myCharacterId}
                    isOverlapZone={false}
                    isPVP={isPVP}
                    myRoleColor={myRoleColor}
                    onClick={() => handleCardClick(character.id)}
                  />

                  {isLastShiftTrack && !isSelected && !isRadarCell && !isRadarTarget && (
                    <motion.div
                      key={`shift-pulse-${lastShift?.type}-${lastShift?.index}-${lastShift?.direction}`}
                      initial={{ opacity: 0.8, scale: 1.02 }}
                      animate={{ opacity: 0, scale: 1 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="pointer-events-none absolute inset-0 rounded-md sm:rounded-xl border-2 border-white/60 z-10"
                    />
                  )}
                  {false && (
                    <div
                      className={`pointer-events-none absolute inset-0 rounded-md sm:rounded-xl border border-dashed border-zinc-500/50 bg-zinc-400/[0.04] z-10 flex items-center justify-center overflow-hidden ${
                        isShiftEntryPoint
                          ? "ring-1 ring-zinc-300/60 shadow-[0_0_12px_rgba(255,255,255,0.2)] bg-white/[0.04]"
                          : ""
                      }`}
                    >
                      {isShiftEntryPoint && (
                        <span className="absolute top-0.5 left-0.5 text-[8px] font-mono text-zinc-300/80 bg-zinc-900/90 px-1 rounded-sm border border-white/10 select-none">
                          ⟳
                        </span>
                      )}
                      {lastShift?.type === "ROW" && lastShift.direction === "FORWARD" && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400/60 animate-pulse">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      )}
                      {lastShift?.type === "ROW" && lastShift.direction === "BACKWARD" && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400/60 animate-pulse">
                          <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                      )}
                      {lastShift?.type === "COL" && lastShift.direction === "FORWARD" && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400/60 animate-pulse">
                          <path d="M12 5v14M19 12l-7 7-7-7" />
                        </svg>
                      )}
                      {lastShift?.type === "COL" && lastShift.direction === "BACKWARD" && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400/60 animate-pulse">
                          <path d="M12 19V5M5 12l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  )}

                    {false && !character.isAlive && (
                      <div className="pointer-events-none absolute inset-0 rounded-md sm:rounded-xl border border-dashed border-red-900/50 bg-red-950/25 z-10 flex items-center justify-center">
                        <span className="text-[10px] sm:text-xs font-mono font-black text-red-500/40 tracking-widest uppercase select-none">
                          [L]
                        </span>
                      </div>
                    )}

                  {(isRadarCell || isRadarTarget) && (
                    <div className="absolute inset-0 rounded-lg sm:rounded-xl pointer-events-none z-35 overflow-visible">
                      <div
                        className={`absolute inset-0 rounded-lg sm:rounded-xl mix-blend-screen transition-opacity duration-300 ${
                          isRadarTarget
                            ? isRedRadar ? "bg-red-500/20 shadow-[inset_0_0_15px_rgba(239,68,68,0.3)]" : "bg-blue-500/20 shadow-[inset_0_0_15px_rgba(59,130,246,0.3)]"
                            : isRedRadar ? "bg-red-500/10" : "bg-blue-500/15"
                        }`}
                      />

                      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                        <rect
                          x="1"
                          y="1"
                          width="calc(100% - 2px)"
                          height="calc(100% - 2px)"
                          rx="10"
                          fill="none"
                          stroke={isRedRadar ? "#f87171" : "#3b82f6"}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          className="radar-marching-stroke rounded-lg sm:rounded-xl"
                          style={{
                            filter: `drop-shadow(0 0 4px ${isRedRadar ? "rgba(239,68,68,0.6)" : "rgba(59,130,246,0.6)"})`,
                          }}
                        />
                      </svg>

                      {isRadarTarget && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-zinc-950/90 border border-blue-400 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.9)] z-30">
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
            className="w-3.5 sm:w-5 md:w-7 shrink-0 grid gap-0.5 sm:gap-1"
            style={{ gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}
          >
            {rowsArray.map((rIdx) => {
              const isRowBlocked =
                blockedShift?.type === "ROW" && blockedShift.index === rIdx;
              const isOppositeRight = isOppositeShift(
                lastShift,
                "ROW",
                rIdx,
                "FORWARD",
              );
              const isLastShiftBtn =
                lastShift?.type === "ROW" &&
                lastShift.index === rIdx &&
                lastShift.direction === "FORWARD";

              return (
                <button
                  key={`row-right-${rIdx}`}
                  disabled={isRowBlocked || isOppositeRight}
                  onClick={(e) => { e.currentTarget.blur(); onShift("ROW", rIdx, "FORWARD"); }}
                  className={`w-full h-full rounded text-[8px] sm:text-xs md:text-sm font-bold transition-transform duration-75 flex items-center justify-center border active:scale-90 p-0 ${
                    isOppositeRight
                      ? "invisible pointer-events-none"
                      : isRowBlocked
                        ? "bg-zinc-900/40 text-zinc-600 border-zinc-800/50 cursor-not-allowed opacity-50"
                        : "bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shadow-inner touch-manipulation select-none"
                  }`}
                  title={
                    isRowBlocked
                      ? "Патруль полиции блокирует сдвиг"
                      : isLastShiftBtn
                        ? "Последний сдвиг"
                        : "Сдвиг вправо"
                  }
                >
                  {isRowBlocked ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> : "→"}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!isLineUp && (
        <div className="w-full h-3.5 sm:h-5 md:h-7 flex items-center gap-0.5 sm:gap-1 mt-0.5 shrink-0">
          <div className="w-3.5 sm:w-5 md:w-7 shrink-0" />
          <div
            className="grid gap-0.5 sm:gap-1 flex-1"
            style={{ gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))` }}
          >
            {colsArray.map((colIdx) => {
              const isBlocked =
                blockedShift?.type === "COL" && blockedShift.index === colIdx;
              const isOpposite = isOppositeShift(
                lastShift,
                "COL",
                colIdx,
                "FORWARD",
              );
              const isLastShiftBtn =
                lastShift?.type === "COL" &&
                lastShift.index === colIdx &&
                lastShift.direction === "FORWARD";

              return (
                <button
                  key={`col-down-${colIdx}`}
                  disabled={isBlocked || isOpposite}
                  onClick={(e) => { e.currentTarget.blur(); onShift("COL", colIdx, "FORWARD"); }}
                  className={`w-full h-3.5 sm:h-5 md:h-7 shrink-0 rounded text-[8px] sm:text-xs md:text-sm font-bold transition-transform duration-75 flex items-center justify-center border active:scale-90 p-0 ${
                    isOpposite
                      ? "invisible pointer-events-none"
                      : isBlocked
                        ? "bg-zinc-900/40 text-zinc-600 border-zinc-800/50 cursor-not-allowed opacity-50"
                        : "bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shadow-inner touch-manipulation select-none"
                  }`}
                  title={
                    isBlocked
                      ? "Патруль полиции блокирует сдвиг"
                      : isLastShiftBtn
                        ? "Последний сдвиг"
                        : "Сдвиг вниз"
                  }
                >
                  {isBlocked ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> : "↓"}
                </button>
              );
            })}
          </div>
          <div className="w-3.5 sm:w-5 md:w-7 shrink-0" />
        </div>
      )}
    </div>
  );
};
