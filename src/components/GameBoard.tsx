// src/components/GameBoard.tsx
import { motion } from "framer-motion";
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
  onShift,
  onSelectCharacter,
}: GameBoardProps) => {
  const numRows = board.length;
  const numCols = board[0]?.length || 5;
  const colsArray = Array.from({ length: numCols }, (_, i) => i);
  const rowsArray = Array.from({ length: numRows }, (_, i) => i);

  return (
    <div className="relative w-full aspect-square max-h-[calc(100vh-180px)] max-w-[min(100%,calc(100vh-180px))] flex flex-col items-center justify-center p-1 sm:p-2 select-none mx-auto">
      {/* ВЕРХНИЕ КНОПКИ (Сдвиг колонок вверх) */}
      <div className="w-full flex items-center gap-0.5 sm:gap-1 mb-0.5 shrink-0">
        <div className="w-4 sm:w-6 shrink-0" />
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

            return (
              <button
                key={`col-up-${colIdx}`}
                disabled={isBlocked || isOpposite}
                onClick={() => onShift("COL", colIdx, "BACKWARD")}
                className={`w-full h-5 sm:h-6 shrink-0 rounded text-[9px] sm:text-xs font-bold transition flex items-center justify-center border active:scale-90 opacity-60 hover:opacity-100 p-0 ${
                  isOpposite
                    ? "invisible pointer-events-none"
                    : isBlocked
                      ? "bg-blue-950/80 text-blue-300 border-blue-500 cursor-not-allowed"
                      : "bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-800 cursor-pointer"
                }`}
                title={
                  isBlocked ? "Патруль полиции блокирует сдвиг" : "Сдвиг вверх"
                }
              >
                {isBlocked ? "🚔" : "↑"}
              </button>
            );
          })}
        </div>
        <div className="w-5 sm:w-7 shrink-0" />
      </div>

      {/* ЦЕНТРАЛЬНАЯ ЧАСТЬ: Левые кнопки + Единый Grid Доски + Правые кнопки */}
      <div className="w-full flex items-stretch gap-0.5 sm:gap-1">
        {/* ЛЕВЫЕ КНОПКИ (Сдвиг рядов влево) */}
        <div
          className="w-4 sm:w-6 shrink-0 grid gap-0.5 sm:gap-1"
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

            return (
              <button
                key={`row-left-${rIdx}`}
                disabled={isRowBlocked || isOppositeLeft}
                onClick={() => onShift("ROW", rIdx, "BACKWARD")}
                className={`w-full h-full rounded text-[9px] sm:text-xs font-bold transition flex items-center justify-center border active:scale-90 opacity-60 hover:opacity-100 p-0 ${
                  isOppositeLeft
                    ? "invisible pointer-events-none"
                    : isRowBlocked
                      ? "bg-blue-950/80 text-blue-300 border-blue-500 cursor-not-allowed"
                      : "bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-800 cursor-pointer"
                }`}
                title={
                  isRowBlocked
                    ? "Патруль полиции блокирует сдвиг"
                    : "Сдвиг влево"
                }
              >
                {isRowBlocked ? "🚔" : "←"}
              </button>
            );
          })}
        </div>

        {/* ЕДИНЫЙ GRID ИГРОВОГО ПОЛЯ */}
        <div
          className="flex-1 aspect-square grid gap-0.5 sm:gap-1"
          style={{
            gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
          }}
        >
          {board.flat().map((character) => {
            let neighborColor = null;
            if (showKillerHints && killerAdjacentIds.includes(character.id)) {
              neighborColor =
                "border-red-500 ring-2 ring-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.5)]";
            } else if (
              showDetectiveHints &&
              detectiveAdjacentIds.includes(character.id)
            ) {
              neighborColor =
                "border-blue-500 ring-2 ring-blue-500/80 shadow-[0_0_12px_rgba(59,130,246,0.5)]";
            }

            return (
              <motion.div
                key={character.id}
                layout
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="w-full h-full"
              >
                <CharacterCard
                  mode={mode}
                  character={character}
                  isSelected={selectedCharacterId === character.id}
                  neighborHighlightColor={neighborColor}
                  isUniformedOfficer={uniformedOfficerIds?.includes(
                    character.id,
                  )}
                  isTargetVictim={character.id === targetVictimId}
                  isRadarCenter={character.id === radarTargetId}
                  radarRingColor={
                    radarCellIds.includes(character.id) ? radarColorClass : null
                  }
                  isError={character.id === errorCardId}
                  onClick={() => onSelectCharacter(character.id)}
                />
              </motion.div>
            );
          })}
        </div>

        {/* ПРАВЫЕ КНОПКИ (Сдвиг рядов вправо) */}
        <div
          className="w-4 sm:w-6 shrink-0 grid gap-0.5 sm:gap-1"
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

            return (
              <button
                key={`row-right-${rIdx}`}
                disabled={isRowBlocked || isOppositeRight}
                onClick={() => onShift("ROW", rIdx, "FORWARD")}
                className={`w-full h-full rounded text-[9px] sm:text-xs font-bold transition flex items-center justify-center border active:scale-90 opacity-60 hover:opacity-100 p-0 ${
                  isOppositeRight
                    ? "invisible pointer-events-none"
                    : isRowBlocked
                      ? "bg-blue-950/80 text-blue-300 border-blue-500 cursor-not-allowed"
                      : "bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-800 cursor-pointer"
                }`}
                title={
                  isRowBlocked
                    ? "Патруль полиции блокирует сдвиг"
                    : "Сдвиг вправо"
                }
              >
                {isRowBlocked ? "🚔" : "→"}
              </button>
            );
          })}
        </div>
      </div>

      {/* НИЖНИЕ КНОПКИ (Сдвиг колонок вниз) */}
      <div className="w-full flex items-center gap-0.5 sm:gap-1 mt-0.5 shrink-0">
        <div className="w-4 sm:w-6 shrink-0" />
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

            return (
              <button
                key={`col-down-${colIdx}`}
                disabled={isBlocked || isOpposite}
                onClick={() => onShift("COL", colIdx, "FORWARD")}
                className={`w-full h-5 sm:h-6 shrink-0 rounded text-[9px] sm:text-xs font-bold transition flex items-center justify-center border active:scale-90 opacity-60 hover:opacity-100 p-0 ${
                  isOpposite
                    ? "invisible pointer-events-none"
                    : isBlocked
                      ? "bg-blue-950/80 text-blue-300 border-blue-500 cursor-not-allowed"
                      : "bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-800 cursor-pointer"
                }`}
                title={
                  isBlocked ? "Патруль полиции блокирует сдвиг" : "Сдвиг вниз"
                }
              >
                {isBlocked ? "🚔" : "↓"}
              </button>
            );
          })}
        </div>
        <div className="w-5 sm:w-7 shrink-0" />
      </div>
    </div>
  );
};
