interface RoleCardsProps {
  mode: string;
  role1Name: string;
  role2Name: string;
  killerNameText: string;
  detectiveNameText: string;
  canPeekKiller: boolean;
  canPeekDetective: boolean;
  onPeekKillerStart: () => void;
  onPeekKillerEnd: () => void;
  onPeekDetectiveStart: () => void;
  onPeekDetectiveEnd: () => void;
  isPVP: boolean;
}

export const RoleCards = ({
  mode,
  role1Name,
  role2Name,
  killerNameText,
  detectiveNameText,
  canPeekKiller,
  canPeekDetective,
  onPeekKillerStart,
  onPeekKillerEnd,
  onPeekDetectiveStart,
  onPeekDetectiveEnd,
  isPVP,
}: RoleCardsProps) => {
  const isSecretService = mode === "SECRET_SERVICE";
  const showKillerCard = isPVP || canPeekKiller;
  const showDetectiveCard = isPVP || canPeekDetective;
  const singleCard = (showKillerCard && !showDetectiveCard) || (!showKillerCard && showDetectiveCard);
  const containerClass = singleCard
    ? "grid grid-cols-1 w-full"
    : "grid grid-cols-2 gap-1.5 w-full";

  return (
    <div className={containerClass}>
      {showKillerCard && (
        <div className="flex-1 p-1.5 sm:p-2 bg-zinc-950 rounded-lg border border-red-950/60 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between w-full min-w-0 gap-1">
            <span className="text-[8.5px] font-black text-red-400 uppercase bg-red-950/70 border border-red-900/50 px-1 py-0.5 rounded shrink-0">
              {role1Name === "ОПЕРАТИВНИК" ? "ОПЕР" : role1Name}
            </span>
            <span className="text-[11px] font-mono font-bold text-zinc-300 truncate text-right flex-1 min-w-0">
              {killerNameText}
            </span>
          </div>
          <button
            type="button"
            onMouseDown={onPeekKillerStart}
            onMouseUp={onPeekKillerEnd}
            onMouseLeave={onPeekKillerEnd}
            onTouchStart={onPeekKillerStart}
            onTouchEnd={onPeekKillerEnd}
            onContextMenu={(e) => e.preventDefault()}
            disabled={!canPeekKiller}
            className={`w-full h-6 sm:h-7 rounded text-[9px] sm:text-[10px] font-bold border transition flex items-center justify-center ${
              !canPeekKiller
                ? "bg-zinc-900 text-zinc-600 border-zinc-800 opacity-40 cursor-not-allowed"
                : "bg-red-950/80 hover:bg-red-900 active:bg-red-800 text-red-300 border-red-700 cursor-pointer"
            }`}
          >
            {canPeekKiller ? "Зажать" : "Чужой ход"}
          </button>
        </div>
      )}

      {showDetectiveCard && (
        <div className="flex-1 p-1.5 sm:p-2 bg-zinc-950 rounded-lg border border-blue-950/60 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between w-full min-w-0 gap-1">
            <span className="text-[8.5px] font-black text-blue-400 uppercase bg-blue-950/70 border border-blue-900/50 px-1 py-0.5 rounded shrink-0">
              {role2Name === "ОПЕРАТИВНИК" ? "ОПЕР" : role2Name}
            </span>
            <span className="text-[11px] font-mono font-bold text-zinc-300 truncate text-right flex-1 min-w-0">
              {detectiveNameText}
            </span>
          </div>
          <button
            type="button"
            onMouseDown={onPeekDetectiveStart}
            onMouseUp={onPeekDetectiveEnd}
            onMouseLeave={onPeekDetectiveEnd}
            onTouchStart={onPeekDetectiveStart}
            onTouchEnd={onPeekDetectiveEnd}
            onContextMenu={(e) => e.preventDefault()}
            disabled={!canPeekDetective}
            className={`w-full h-6 sm:h-7 rounded text-[9px] sm:text-[10px] font-bold border transition flex items-center justify-center ${
              !canPeekDetective
                ? "bg-zinc-900 text-zinc-600 border-zinc-800 opacity-40 cursor-not-allowed"
                : "bg-blue-950/80 hover:bg-blue-900 active:bg-blue-800 text-blue-300 border-blue-700 cursor-pointer"
            }`}
          >
            {canPeekDetective ? "Зажать" : "Чужой ход"}
          </button>
        </div>
      )}
    </div>
  );
};
