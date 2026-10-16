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
        <div className="flex-1 p-2 bg-zinc-900/60 backdrop-blur-md rounded-xl border border-white/10 flex flex-col justify-between gap-1.5 shadow-lg">
          <div className="flex items-start justify-between w-full gap-1.5">
            <span className="text-[8px] sm:text-[8.5px] font-black text-red-400 uppercase bg-red-950/50 border border-red-900/50 px-1.5 py-0.5 rounded-sm shrink-0 tracking-widest mt-0.5 max-w-[40%] truncate">
              {role1Name === "ОПЕРАТИВНИК" ? "ОПЕР" : role1Name}
            </span>
            <span className="text-[8.5px] sm:text-[9.5px] font-black text-zinc-100 text-right uppercase tracking-tight leading-[1.1] break-words line-clamp-2 flex-1 min-w-0">
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
            className={`w-full h-8 sm:h-[34px] rounded-lg text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider border transition flex items-center justify-center gap-1.5 ${
              !canPeekKiller
                ? "bg-zinc-950/50 text-zinc-600 border-white/5 cursor-not-allowed"
                : "bg-red-950/80 hover:bg-red-900 active:bg-red-800 text-red-200 border-red-700/50 cursor-pointer shadow-[0_0_10px_rgba(220,38,38,0.2)]"
            }`}
          >
            {!canPeekKiller ? (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> БЛОК</>
            ) : (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> РОЛЬ</>
            )}
          </button>
        </div>
      )}

      {showDetectiveCard && (
        <div className="flex-1 p-2 bg-zinc-900/60 backdrop-blur-md rounded-xl border border-white/10 flex flex-col justify-between gap-1.5 shadow-lg">
          <div className="flex items-start justify-between w-full gap-1.5">
            <span className="text-[8px] sm:text-[8.5px] font-black text-cyan-400 uppercase bg-cyan-950/50 border border-cyan-900/50 px-1.5 py-0.5 rounded-sm shrink-0 tracking-widest mt-0.5 max-w-[40%] truncate">
              {role2Name === "ОПЕРАТИВНИК" ? "ОПЕР" : role2Name}
            </span>
            <span className="text-[8.5px] sm:text-[9.5px] font-black text-zinc-100 text-right uppercase tracking-tight leading-[1.1] break-words line-clamp-2 flex-1 min-w-0">
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
            className={`w-full h-8 sm:h-[34px] rounded-lg text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider border transition flex items-center justify-center gap-1.5 ${
              !canPeekDetective
                ? "bg-zinc-950/50 text-zinc-600 border-white/5 cursor-not-allowed"
                : "bg-cyan-950/80 hover:bg-cyan-900 active:bg-cyan-800 text-cyan-200 border-cyan-700/50 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            }`}
          >
            {!canPeekDetective ? (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> БЛОК</>
            ) : (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> РОЛЬ</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
