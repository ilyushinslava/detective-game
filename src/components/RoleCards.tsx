interface RoleCardsProps {
  role1Name: string;
  role2Name: string;
  killerNameText: string;
  detectiveNameText: string;
  canPeekKiller: boolean;
  canPeekDetective: boolean;
  onPeekKillerStart: () => void;
  onPeekKillerEnd: () => void;
  onPeekKillerLeave?: () => void;
  onPeekDetectiveStart: () => void;
  onPeekDetectiveEnd: () => void;
  onPeekDetectiveLeave?: () => void;
  className?: string;
}

export const RoleCards = ({
  role1Name,
  role2Name,
  killerNameText,
  detectiveNameText,
  canPeekKiller,
  canPeekDetective,
  onPeekKillerStart,
  onPeekKillerEnd,
  onPeekKillerLeave,
  onPeekDetectiveStart,
  onPeekDetectiveEnd,
  onPeekDetectiveLeave,
  className = "",
}: RoleCardsProps) => {
  return (
    <div className={className}>
      <div className="flex-1 p-2 bg-zinc-950 rounded-lg border border-red-950/60 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold text-red-400">{role1Name}</div>
          <div className="text-[11px] font-mono font-bold text-zinc-300">
            {killerNameText}
          </div>
        </div>
        <button
          type="button"
          onMouseDown={onPeekKillerStart}
          onMouseUp={onPeekKillerEnd}
          onMouseLeave={onPeekKillerLeave}
          onTouchStart={onPeekKillerStart}
          onTouchEnd={onPeekKillerEnd}
          disabled={!canPeekKiller}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
            !canPeekKiller
              ? "bg-zinc-900 text-zinc-600 border-zinc-800 opacity-40 cursor-not-allowed"
              : "bg-red-950/80 hover:bg-red-900 active:bg-red-800 text-red-300 border-red-700 cursor-pointer"
          }`}
        >
          Зажать
        </button>
      </div>

      <div className="flex-1 p-2 bg-zinc-950 rounded-lg border border-blue-950/60 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold text-blue-400">{role2Name}</div>
          <div className="text-[11px] font-mono font-bold text-zinc-300">
            {detectiveNameText}
          </div>
        </div>
        <button
          type="button"
          onMouseDown={onPeekDetectiveStart}
          onMouseUp={onPeekDetectiveEnd}
          onMouseLeave={onPeekDetectiveLeave}
          onTouchStart={onPeekDetectiveStart}
          onTouchEnd={onPeekDetectiveEnd}
          disabled={!canPeekDetective}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
            !canPeekDetective
              ? "bg-zinc-900 text-zinc-600 border-zinc-800 opacity-40 cursor-not-allowed"
              : "bg-blue-950/80 hover:bg-blue-900 active:bg-blue-800 text-blue-300 border-blue-700 cursor-pointer"
          }`}
        >
          Зажать
        </button>
      </div>
    </div>
  );
};
