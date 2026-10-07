import { motion } from "framer-motion";
import type { Character, LastShift } from "../types/game";
import { CharacterCard } from "./CharacterCard";
import { isOppositeShift } from "../utils/gameLogic";

interface GameBoardProps {
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
  radarCellIds = [],
  radarColorClass = null,
  errorCardId = null,
  onShift,
  onSelectCharacter,
}: GameBoardProps) => {
  const numRows = board.length;
  const numCols = board[0]?.length || 5;
  const colsArray = Array.from({ length: numCols }, (_, i) => i);

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Кнопки сдвига колонок ВВЕРХ */}
      <div className="w-full flex items-center gap-1 sm:gap-2 mb-1 sm:mb-1.5">
        <div className="w-4 sm:w-6 shrink-0" />

        <div
          className="grid gap-1 sm:gap-2 flex-1"
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
                className={`h-5 sm:h-7 rounded-md text-[11px] font-bold transition flex items-center justify-center border active:scale-90 ${
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

        <div className="w-4 sm:w-6 shrink-0" />
      </div>

      {/* Сетка со стрелками рядов */}
      <div className="w-full flex flex-col gap-1 sm:gap-2">
        {board.map((row, rIdx) => {
          const isRowBlocked =
            blockedShift?.type === "ROW" && blockedShift.index === rIdx;
          const isOppositeLeft = isOppositeShift(
            lastShift,
            "ROW",
            rIdx,
            "BACKWARD",
          );
          const isOppositeRight = isOppositeShift(
            lastShift,
            "ROW",
            rIdx,
            "FORWARD",
          );

          return (
            <div
              key={`row-${rIdx}`}
              className="flex items-center gap-1 sm:gap-2 w-full"
            >
              <button
                disabled={isRowBlocked || isOppositeLeft}
                onClick={() => onShift("ROW", rIdx, "BACKWARD")}
                className={`w-4 sm:w-6 h-10 sm:h-14 rounded-md text-[11px] font-bold transition flex items-center justify-center shrink-0 border active:scale-90 ${
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

              <div
                className="grid gap-1 sm:gap-2 flex-1"
                style={{
                  gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
                }}
              >
                {row.map((character) => (
                  <motion.div
                    key={character.id}
                    layout
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className="w-full h-full"
                  >
                    <CharacterCard
                      character={character}
                      isSelected={selectedCharacterId === character.id}
                      isKillerAdjacent={killerAdjacentIds.includes(
                        character.id,
                      )}
                      isDetectiveAdjacent={detectiveAdjacentIds.includes(
                        character.id,
                      )}
                      showKillerHint={showKillerHints}
                      showDetectiveHint={showDetectiveHints}
                      isUniformedOfficer={uniformedOfficerIds?.includes(
                        character.id,
                      )}
                      isTargetVictim={character.id === targetVictimId}
                      isRadarCenter={character.id === targetVictimId}
                      radarRingColor={
                        radarCellIds.includes(character.id)
                          ? radarColorClass
                          : null
                      }
                      isError={character.id === errorCardId}
                      onClick={() => onSelectCharacter(character.id)}
                    />
                  </motion.div>
                ))}
              </div>

              <button
                disabled={isRowBlocked || isOppositeRight}
                onClick={() => onShift("ROW", rIdx, "FORWARD")}
                className={`w-4 sm:w-6 h-10 sm:h-14 rounded-md text-[11px] font-bold transition flex items-center justify-center shrink-0 border active:scale-90 ${
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
            </div>
          );
        })}
      </div>

      {/* Кнопки сдвига колонок ВНИЗ */}
      <div className="w-full flex items-center gap-1 sm:gap-2 mt-1 sm:mt-1.5">
        <div className="w-4 sm:w-6 shrink-0" />

        <div
          className="grid gap-1 sm:gap-2 flex-1"
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
                className={`h-5 sm:h-7 rounded-md text-[11px] font-bold transition flex items-center justify-center border active:scale-90 ${
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

        <div className="w-4 sm:w-6 shrink-0" />
      </div>
    </div>
  );
};
