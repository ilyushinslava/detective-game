import React, { useRef, useState, useEffect, useMemo } from "react";
import { motion, LayoutGroup } from "framer-motion";
import type { Character, LastShift, GameModeType } from "../types/game";
import { CharacterCard } from "./CharacterCard";
import { isOppositeShift, getAdjacentCharacters } from "../utils/gameLogic";
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
  activeAgentAdjacentIds?: string[];
  adjacentIds?: string[];
  showKillerHints?: boolean;
  showDetectiveHints?: boolean;
  killerSecretId?: string | null;
  detectiveSecretId?: string | null;
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
  isHumanTurn?: boolean;
  evidenceDeck?: string[] | Character[];
  highlightedSpyId?: string;
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

export const GameBoard: React.FC<GameBoardProps> = React.memo((props) => {
  const {
    mode = "MANIAC_VS_OPERATIVE",
    board,
    blockedShift,
    lastShift,
    lastRobbedId = null,
    uniformedOfficerIds,
    targetVictimId,
    radarTargetId,
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
  const radarCellIds = props.radarCellIds ?? props.radarPingIds ?? [];
  const killerSecretId = props.killerSecretId ?? null;
  const detectiveSecretId = props.detectiveSecretId ?? null;
  const isLineUp = mode === "LINE_UP";
  const numRows = board.length;
  const numCols = board[0]?.length || BOARD_GRID_SIZE;

  // Определение активной подсвечиваемой роли и её секретного персонажа
  const activeRole = showKillerHints ? "red" : showDetectiveHints ? "blue" : null;
  const activeSecretId =
    activeRole === "red"
      ? killerSecretId
      : activeRole === "blue"
      ? detectiveSecretId
      : null;

  const effectiveMyCharacterId = activeSecretId ?? myCharacterId;
  const effectiveRoleColor = activeRole ?? myRoleColor;

  // Динамический пересчёт соседей строго по ТЕКУЩЕМУ положению персонажа на доске board
  const dynamicKillerAdjacentIds = useMemo(() => {
    if (killerSecretId) {
      return getAdjacentCharacters(board, killerSecretId).map((c) => c.id);
    }
    return killerAdjacentIds;
  }, [board, killerSecretId, killerAdjacentIds]);

  const dynamicDetectiveAdjacentIds = useMemo(() => {
    if (detectiveSecretId) {
      return getAdjacentCharacters(board, detectiveSecretId).map((c) => c.id);
    }
    return detectiveAdjacentIds;
  }, [board, detectiveSecretId, detectiveAdjacentIds]);

  // Быстрые Set-коллекции для O(1) проверки в 25 ячейках (P0 Performance)
  const radarSet = useMemo(() => new Set(radarCellIds), [radarCellIds]);
  const killerAdjacentSet = useMemo(() => new Set(dynamicKillerAdjacentIds), [dynamicKillerAdjacentIds]);
  const detectiveAdjacentSet = useMemo(() => new Set(dynamicDetectiveAdjacentIds), [dynamicDetectiveAdjacentIds]);
  const uniformedOfficerSet = useMemo(() => new Set(uniformedOfficerIds || []), [uniformedOfficerIds]);

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
    <div className="relative flex flex-col items-center justify-between p-0.5 select-none mx-auto w-full h-auto max-w-full max-h-full aspect-square landscape:w-auto landscape:h-full shrink-0 touch-none">
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
      <div className="w-full flex-1 min-h-0 flex items-stretch justify-center gap-0.5 sm:gap-1">
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
            className="h-full aspect-square grid gap-0.5 sm:gap-1 touch-none select-none relative isolate"
            style={{
              gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
              touchAction: "none",
            }}
          >
            {board.flatMap((row, rIdx) =>
              row.map((character, cIdx) => {
                const isSelected = selectedCharacterId === character.id;
                const isRadarCell = radarSet.has(character.id);
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

                const isMyChar = Boolean(
                  (activeSecretId && character.id === activeSecretId) ||
                  (!activeRole && myCharacterId && character.id === myCharacterId)
                );

                let neighborRole: "red" | "blue" | "purple" | null = null;
                if (!isMyChar) {
                  const isKillerNeighbor = showKillerHints && killerAdjacentSet.has(character.id);
                  const isDetectiveNeighbor = showDetectiveHints && detectiveAdjacentSet.has(character.id);

                  if (isKillerNeighbor && isDetectiveNeighbor) {
                    neighborRole = "purple";
                  } else if (isKillerNeighbor) {
                    neighborRole = "red";
                  } else if (isDetectiveNeighbor) {
                    neighborRole = "blue";
                  }
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
                      isUniformedOfficer={uniformedOfficerSet.has(character.id)}
                      isTargetVictim={character.id === targetVictimId}
                      isLastRobbed={character.id === lastRobbedId}
                      isRadarCenter={isRadarTarget}
                      radarRingColor={isRadarCell ? (radarColorClass || "border-blue-500 ring-2 ring-blue-500/70") : null}
                      isError={character.id === errorCardId}
                      isMyCharacter={isMyChar}
                      isOverlapZone={false}
                      isPVP={isPVP}
                      myRoleColor={effectiveRoleColor}
                      onClick={() => handleCardClick(character.id)}
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
});

GameBoard.displayName = "GameBoard";
