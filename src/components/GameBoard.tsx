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
  onShift,
  onSelectCharacter,
}: GameBoardProps) => {
  return (
    <div className="w-full max-w-[520px] flex flex-col items-center select-none">
      {/* Кнопки сдвига колонок ВВЕРХ */}
      <div className="w-full flex items-center gap-1.5 sm:gap-2 mb-1.5">
        {/* Пустая заглушка под ширину левой кнопки ряда */}
        <div className="w-5 sm:w-6 shrink-0" />

        {/* 5 кнопок для 5 колонок */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 flex-1">
          {[0, 1, 2, 3, 4].map((colIdx) => {
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
                className={`h-6 sm:h-7 rounded-md text-[11px] font-bold transition flex items-center justify-center border ${
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

        {/* Пустая заглушка под ширину правой кнопки ряда */}
        <div className="w-5 sm:w-6 shrink-0" />
      </div>

      {/* Сетка 5x5 со стрелками рядов */}
      <div className="w-full flex flex-col gap-1.5 sm:gap-2">
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
              className="flex items-center gap-1.5 sm:gap-2 w-full"
            >
              {/* Сдвиг ряда влево */}
              <button
                disabled={isRowBlocked || isOppositeLeft}
                onClick={() => onShift("ROW", rIdx, "BACKWARD")}
                className={`w-5 sm:w-6 h-12 sm:h-14 rounded-md text-[11px] font-bold transition flex items-center justify-center shrink-0 border ${
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

              {/* 5 карт в ряду */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 flex-1">
                {row.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    isSelected={selectedCharacterId === character.id}
                    isKillerAdjacent={killerAdjacentIds.includes(character.id)}
                    isDetectiveAdjacent={detectiveAdjacentIds.includes(
                      character.id,
                    )}
                    showKillerHint={showKillerHints}
                    showDetectiveHint={showDetectiveHints}
                    onClick={() => onSelectCharacter(character.id)}
                  />
                ))}
              </div>

              {/* Сдвиг ряда вправо */}
              <button
                disabled={isRowBlocked || isOppositeRight}
                onClick={() => onShift("ROW", rIdx, "FORWARD")}
                className={`w-5 sm:w-6 h-12 sm:h-14 rounded-md text-[11px] font-bold transition flex items-center justify-center shrink-0 border ${
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
      <div className="w-full flex items-center gap-1.5 sm:gap-2 mt-1.5">
        {/* Пустая заглушка под ширину левой кнопки ряда */}
        <div className="w-5 sm:w-6 shrink-0" />

        {/* 5 кнопок для 5 колонок */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 flex-1">
          {[0, 1, 2, 3, 4].map((colIdx) => {
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
                className={`h-6 sm:h-7 rounded-md text-[11px] font-bold transition flex items-center justify-center border ${
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

        {/* Пустая заглушка под ширину правой кнопки ряда */}
        <div className="w-5 sm:w-6 shrink-0" />
      </div>
    </div>
  );
};
