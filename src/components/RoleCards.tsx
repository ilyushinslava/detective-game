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
  const containerClass = isSecretService
    ? "flex flex-col gap-2 w-full"
    : "flex flex-row gap-2 w-full";

  const showKillerCard = isPVP || canPeekKiller;
  const showDetectiveCard = isPVP || canPeekDetective;

  return (
    <div className={containerClass}>
      {showKillerCard && (
        <div className="flex-1 p-2 bg-zinc-950 rounded-lg border border-red-950/60 grid grid-cols-[1fr_88px] items-center gap-1.5">
          <div className="flex flex-col min-w-0">
            <div className="text-[10px] font-bold text-red-400 truncate uppercase">
              {isSecretService ? `ДОСЬЕ: ${role1Name}` : role1Name}
            </div>
            <div className="text-[11px] font-mono font-bold text-zinc-300 truncate h-4 mt-0.5">
              {killerNameText}
            </div>
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
            className={`w-[88px] shrink-0 h-8 rounded-lg text-[10px] font-bold border transition ${
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
        <div className="flex-1 p-2 bg-zinc-950 rounded-lg border border-blue-950/60 grid grid-cols-[1fr_88px] items-center gap-1.5">
          <div className="flex flex-col min-w-0">
            <div className="text-[10px] font-bold text-blue-400 truncate uppercase">
              {isSecretService ? `ДОСЬЕ: ${role2Name}` : role2Name}
            </div>
            <div className="text-[11px] font-mono font-bold text-zinc-300 truncate h-4 mt-0.5">
              {detectiveNameText}
            </div>
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
            className={`w-[88px] shrink-0 h-8 rounded-lg text-[10px] font-bold border transition ${
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
