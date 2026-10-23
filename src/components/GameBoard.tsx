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
  myCharacterId?: string | null;
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
  onShift,
  onSelectCharacter,
}: GameBoardProps) => {
  const isLineUp = mode === "LINE_UP";
  const numRows = board.length;
  const numCols = board[0]?.length || 5;
  const colsArray = Array.from({ length: numCols }, (_, i) => i);
  const rowsArray = Array.from({ length: numRows }, (_, i) => i);

  return (
    <div className="relative w-full max-w-[min(100vw,calc(100dvh-220px))] max-h-[calc(100dvh-220px)] md:max-w-[min(85vw,calc(100dvh-260px))] md:max-h-[calc(100dvh-260px)] landscape:max-w-[min(85vh,calc(100dvh-140px))] landscape:max-h-[min(85vh,calc(100dvh-140px))] flex flex-col items-center justify-center p-1 select-none mx-auto shrink-0">
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
        <div className="w-full flex items-center gap-0.5 sm:gap-1 mb-0.5 shrink-0">
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

              return (
                <button
                  key={`col-up-${colIdx}`}
                  disabled={isBlocked || isOpposite}
                  onClick={(e) => { e.currentTarget.blur(); onShift("COL", colIdx, "BACKWARD"); }}
                  className={`w-full h-3.5 sm:h-5 md:h-7 shrink-0 rounded text-[8px] sm:text-xs md:text-sm font-bold transition-transform duration-75 flex items-center justify-center border active:scale-90 p-0 ${
                    isOpposite
                      ? "invisible pointer-events-none"
                      : isBlocked
                        ? "bg-zinc-900/80 text-red-500 border-red-900/50 cursor-not-allowed"
                        : "bg-zinc-950/80 border-white/10 hover:border-white/20 focus:outline-none focus:bg-transparent active:bg-white/20 text-zinc-400 cursor-pointer shadow-inner touch-manipulation select-none"
                  }`}
                  title={
                    isBlocked ? "Патруль полиции блокирует сдвиг" : "Сдвиг вверх"
                  }
                >
                  {isBlocked ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> : "↑"}
                </button>
              );
            })}
          </div>
          <div className="w-4 sm:w-6 md:w-8 shrink-0" />
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

              return (
                <button
                  key={`row-left-${rIdx}`}
                  disabled={isRowBlocked || isOppositeLeft}
                  onClick={(e) => { e.currentTarget.blur(); onShift("ROW", rIdx, "BACKWARD"); }}
                  className={`w-full h-full rounded text-[8px] sm:text-xs md:text-sm font-bold transition-transform duration-75 flex items-center justify-center border active:scale-90 p-0 ${
                    isOppositeLeft
                      ? "invisible pointer-events-none"
                      : isRowBlocked
                        ? "bg-zinc-900/80 text-red-500 border-red-900/50 cursor-not-allowed"
                        : "bg-zinc-950/80 border-white/10 hover:border-white/20 focus:outline-none focus:bg-transparent active:bg-white/20 text-zinc-400 cursor-pointer shadow-inner touch-manipulation select-none"
                  }`}
                  title={
                    isRowBlocked
                      ? "Патруль полиции блокирует сдвиг"
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
        <div
          className="flex-1 aspect-square grid gap-0.5 sm:gap-1"
          style={{
            gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
          }}
        >
          {board.flat().map((character) => {
            const isSelected = selectedCharacterId === character.id;
            const isRadarCell = radarCellIds.includes(character.id);
            const isRadarTarget = character.id === radarTargetId;

            let neighborColor = null;
            if (showKillerHints && killerAdjacentIds.includes(character.id)) {
              neighborColor =
                "border-red-500 ring-1 ring-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.4)]";
            } else if (showDetectiveHints && detectiveAdjacentIds.includes(character.id)) {
              neighborColor =
                "border-blue-500 ring-1 ring-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.4)]";
            }

            const isRedRadar = Boolean(radarColorClass?.includes("red"));

            return (
              <motion.div
                key={character.id}
                layout
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="w-full h-full relative"
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
                  radarRingColor={null}
                  isError={character.id === errorCardId}
                  isMyCharacter={character.id === myCharacterId}
                  isOverlapZone={false}
                  onClick={() => onSelectCharacter(character.id)}
                />

                {(isRadarCell || isRadarTarget) && (
                  <div className="absolute inset-0 rounded-2xl pointer-events-none z-20 overflow-visible">
                    <div
                      className={`absolute inset-0 rounded-2xl mix-blend-screen transition-opacity duration-300 ${
                        isRadarTarget
                          ? isRedRadar ? "bg-red-500/20 shadow-[inset_0_0_15px_rgba(239,68,68,0.3)]" : "bg-amber-500/20 shadow-[inset_0_0_15px_rgba(245,158,11,0.3)]"
                          : isRedRadar ? "bg-red-500/10" : "bg-amber-500/10"
                      }`}
                    />

                    <svg className="absolute inset-0 w-full h-full overflow-visible">
                      <rect
                        x="1"
                        y="1"
                        width="calc(100% - 2px)"
                        height="calc(100% - 2px)"
                        rx="14"
                        fill="none"
                        stroke={isRedRadar ? "#f87171" : "#fbbf24"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="radar-marching-stroke"
                        style={{
                          filter: `drop-shadow(0 0 4px ${isRedRadar ? "rgba(239,68,68,0.6)" : "rgba(245,158,11,0.6)"})`,
                        }}
                      />
                    </svg>

                    {isRadarTarget && (
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-zinc-950/90 border border-amber-400 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.9)] z-30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

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

              return (
                <button
                  key={`row-right-${rIdx}`}
                  disabled={isRowBlocked || isOppositeRight}
                  onClick={(e) => { e.currentTarget.blur(); onShift("ROW", rIdx, "FORWARD"); }}
                  className={`w-full h-full rounded text-[8px] sm:text-xs md:text-sm font-bold transition-transform duration-75 flex items-center justify-center border active:scale-90 p-0 ${
                    isOppositeRight
                      ? "invisible pointer-events-none"
                      : isRowBlocked
                        ? "bg-zinc-900/80 text-red-500 border-red-900/50 cursor-not-allowed"
                        : "bg-zinc-950/80 border-white/10 hover:border-white/20 focus:outline-none focus:bg-transparent active:bg-white/20 text-zinc-400 cursor-pointer shadow-inner touch-manipulation select-none"
                  }`}
                  title={
                    isRowBlocked
                      ? "Патруль полиции блокирует сдвиг"
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
        <div className="w-full flex items-center gap-0.5 sm:gap-1 mt-0.5 shrink-0">
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

              return (
                <button
                  key={`col-down-${colIdx}`}
                  disabled={isBlocked || isOpposite}
                  onClick={(e) => { e.currentTarget.blur(); onShift("COL", colIdx, "FORWARD"); }}
                  className={`w-full h-3.5 sm:h-5 md:h-7 shrink-0 rounded text-[8px] sm:text-xs md:text-sm font-bold transition-transform duration-75 flex items-center justify-center border active:scale-90 p-0 ${
                    isOpposite
                      ? "invisible pointer-events-none"
                      : isBlocked
                        ? "bg-zinc-900/80 text-red-500 border-red-900/50 cursor-not-allowed"
                        : "bg-zinc-950/80 border-white/10 hover:border-white/20 focus:outline-none focus:bg-transparent active:bg-white/20 text-zinc-400 cursor-pointer shadow-inner touch-manipulation select-none"
                  }`}
                  title={
                    isBlocked ? "Патруль полиции блокирует сдвиг" : "Сдвиг вниз"
                  }
                >
                  {isBlocked ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> : "↓"}
                </button>
              );
            })}
          </div>
          <div className="w-4 sm:w-6 md:w-8 shrink-0" />
        </div>
      )}
    </div>
  );
};
