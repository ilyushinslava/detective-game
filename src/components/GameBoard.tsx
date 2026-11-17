import React, { useRef, useState, useEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";
import type { Character, LastShift, GameModeType } from "../types/game";
import { CharacterCard } from "./CharacterCard";
import { isOppositeShift } from "../utils/gameLogic";
import { BOARD_GRID_SIZE } from "../constants/gameRules";
import {
  ColShiftBar,
  RowShiftBar,
  BoardCellOverlay,
  getShiftIndicator,
  type ShiftDirection,
  type ShiftIndicatorState,
} from "./board";

export type { ShiftDirection, ShiftIndicatorState };
export { getShiftIndicator };

interface GameBoardProps {
  mode?: GameModeType;
  board: Character[][];
  selectedCharacterId?: string | null;
  selectedId?: string | null;
  killerAdjacentIds?: string[];
  detectiveAdjacentIds?: string[];
  adjacentIds?: string[];
  showKillerHints?: boolean;
  showDetectiveHints?: boolean;
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
  currentRole?: any;
  alibiIds?: string[];
  radarPingIds?: string[];
  activeAgentId?: string | null;
  onShift: (
    type: "ROW" | "COL",
    index: number,
    direction: "FORWARD" | "BACKWARD",
  ) => void;
  onSelectCharacter?: (id: string) => void;
  onCardClick?: (id: string) => void;
}

export const GameBoard: React.FC<GameBoardProps> = (props) => {
  const {
    mode = "MANIAC_VS_OPERATIVE",
    board,
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
  } = props;

  const selectedCharacterId = props.selectedCharacterId ?? props.selectedId ?? null;
  const onSelectCharacter = props.onSelectCharacter ?? props.onCardClick ?? (() => {});
  const killerAdjacentIds = props.killerAdjacentIds ?? props.adjacentIds ?? [];
  const detectiveAdjacentIds = props.detectiveAdjacentIds ?? [];
  const showKillerHints = props.showKillerHints ?? Boolean(props.adjacentIds);
  const showDetectiveHints = props.showDetectiveHints ?? false;
  const isLineUp = mode === "LINE_UP";
  const numRows = board.length;
  const numCols = board[0]?.length || BOARD_GRID_SIZE;

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

  const onSelectCharacterRef = useRef(onSelectCharacter);
  onSelectCharacterRef.current = onSelectCharacter;

  const handleCardClick = (id: string) => {
    if (isModalOpen) return;
    if (hasSwipedRef.current) {
      hasSwipedRef.current = false;
      return;
    }
    if (typeof onSelectCharacterRef.current === "function") {
      onSelectCharacterRef.current(id);
    }
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

      {/* ВЕРХНИЙ РЯД СТРЕЛОК (ВВЕРХ) */}
      {!isLineUp && (
        <ColShiftBar
          direction="up"
          numCols={numCols}
          blockedShift={blockedShift}
          lastShift={lastShift}
          activeButtonId={activeButtonId}
          onArrowClick={handleArrowClick}
          onShiftCol={handleShiftCol}
        />
      )}

      {/* ЦЕНТРАЛЬНАЯ ЧАСТЬ: Левые стрелки + Доска + Правые стрелки */}
      <div className="w-full flex items-stretch gap-0.5 sm:gap-1">
        {!isLineUp && (
          <RowShiftBar
            direction="left"
            numRows={numRows}
            blockedShift={blockedShift}
            lastShift={lastShift}
            activeButtonId={activeButtonId}
            onArrowClick={handleArrowClick}
            onShiftRow={handleShiftRow}
          />
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
                    style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
                    animate={{
                      scale: character.isAlive ? 1 : 0.95,
                      opacity: character.isAlive ? 1 : 0.65,
                    }}
                    transition={{
                      type: "spring",
                      bounce: 0.2,
                      duration: 0.5,
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
                      isUniformedOfficer={uniformedOfficerIds?.includes(character.id)}
                      isTargetVictim={character.id === targetVictimId}
                      isLastRobbed={character.id === lastRobbedId}
                      isRadarCenter={isRadarTarget}
                      radarRingColor={isRadarCell ? (radarColorClass || "border-blue-500 ring-2 ring-blue-500/70") : null}
                      isError={character.id === errorCardId}
                      isMyCharacter={character.id === myCharacterId}
                      isOverlapZone={false}
                      isPVP={isPVP}
                      myRoleColor={myRoleColor}
                      onClick={() => handleCardClick(character.id, rIdx, cIdx)}
                    />

                    {(isRadarCell || isRadarTarget) && (
                      <BoardCellOverlay
                        isRadarTarget={isRadarTarget}
                        isRedRadar={isRedRadar}
                      />
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </LayoutGroup>

        {!isLineUp && (
          <RowShiftBar
            direction="right"
            numRows={numRows}
            blockedShift={blockedShift}
            lastShift={lastShift}
            activeButtonId={activeButtonId}
            onArrowClick={handleArrowClick}
            onShiftRow={handleShiftRow}
          />
        )}
      </div>

      {/* НИЖНИЙ РЯД СТРЕЛОК (ВНИЗ) */}
      {!isLineUp && (
        <ColShiftBar
          direction="down"
          numCols={numCols}
          blockedShift={blockedShift}
          lastShift={lastShift}
          activeButtonId={activeButtonId}
          onArrowClick={handleArrowClick}
          onShiftCol={handleShiftCol}
        />
      )}
    </div>
  );
};
