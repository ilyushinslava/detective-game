import React, { useState, useRef } from "react";
import type { Character, GameState } from "../types/game";

export interface RoleCardsProps {
  mode?: string;
  role1Name: string;
  role2Name: string;
  killerNameText: string;
  detectiveNameText: string;
  canPeekKiller: boolean;
  canPeekDetective: boolean;
  onPeekKillerStart?: () => void;
  onPeekKillerEnd?: () => void;
  onPeekDetectiveStart?: () => void;
  onPeekDetectiveEnd?: () => void;
  showKillerRole?: boolean;
  setShowKillerRole?: (val: boolean | ((prev: boolean) => boolean)) => void;
  showDetectiveRole?: boolean;
  setShowDetectiveRole?: (val: boolean | ((prev: boolean) => boolean)) => void;
  isPVP: boolean;
  gameState?: GameState;
  killerChar?: Character;
  detectiveChar?: Character;
  spyP1Char?: Character;
  spyP2Char?: Character;
  showSpyP1Role?: boolean;
  setShowSpyP1Role?: (val: boolean) => void;
  showSpyP2Role?: boolean;
  setShowSpyP2Role?: (val: boolean) => void;
}

export const RoleCards: React.FC<RoleCardsProps> = ({
  mode: _mode,
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
  showKillerRole,
  setShowKillerRole,
  showDetectiveRole,
  setShowDetectiveRole,
  isPVP,
  killerChar,
  detectiveChar,
}) => {
  const [localKillerPeeking, setLocalKillerPeeking] = useState(false);
  const [localDetectivePeeking, setLocalDetectivePeeking] = useState(false);

  const isKillerActive = Boolean(showKillerRole || localKillerPeeking);
  const isDetectiveActive = Boolean(showDetectiveRole || localDetectivePeeking);

  const killerPressTimeRef = useRef(0);
  const detectivePressTimeRef = useRef(0);

  const showKillerCard = isPVP || canPeekKiller;
  const showDetectiveCard = isPVP || canPeekDetective;
  const singleCard = (showKillerCard && !showDetectiveCard) || (!showKillerCard && showDetectiveCard);
  const containerClass = singleCard
    ? "grid grid-cols-1 w-full"
    : "grid grid-cols-2 gap-1.5 w-full";

  const displayedKillerName = isKillerActive
    ? (killerNameText !== "••••••••" ? killerNameText : killerChar?.name ?? "Засекречено")
    : killerNameText;

  const displayedDetectiveName = isDetectiveActive
    ? (detectiveNameText !== "••••••••" ? detectiveNameText : detectiveChar?.name ?? "Засекречено")
    : detectiveNameText;

  // Обработчики для Киллера / Преступника
  const handleKillerPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!canPeekKiller) return;
    killerPressTimeRef.current = Date.now();
    setLocalKillerPeeking(true);
    setShowKillerRole?.(true);
    onPeekKillerStart?.();
  };

  const handleKillerPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!canPeekKiller) return;
    const duration = Date.now() - killerPressTimeRef.current;
    setLocalKillerPeeking(false);
    if (duration > 300) {
      setShowKillerRole?.(false);
      onPeekKillerEnd?.();
    }
  };

  const handleKillerPointerLeave = () => {
    if (localKillerPeeking) {
      setLocalKillerPeeking(false);
      setShowKillerRole?.(false);
      onPeekKillerEnd?.();
    }
  };

  const handleKillerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!canPeekKiller) return;
    const duration = Date.now() - killerPressTimeRef.current;
    if (duration <= 300) {
      setShowKillerRole?.((prev) => !prev);
    }
  };

  // Обработчики для Детектива / Оперативника
  const handleDetectivePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!canPeekDetective) return;
    detectivePressTimeRef.current = Date.now();
    setLocalDetectivePeeking(true);
    setShowDetectiveRole?.(true);
    onPeekDetectiveStart?.();
  };

  const handleDetectivePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!canPeekDetective) return;
    const duration = Date.now() - detectivePressTimeRef.current;
    setLocalDetectivePeeking(false);
    if (duration > 300) {
      setShowDetectiveRole?.(false);
      onPeekDetectiveEnd?.();
    }
  };

  const handleDetectivePointerLeave = () => {
    if (localDetectivePeeking) {
      setLocalDetectivePeeking(false);
      setShowDetectiveRole?.(false);
      onPeekDetectiveEnd?.();
    }
  };

  const handleDetectiveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!canPeekDetective) return;
    const duration = Date.now() - detectivePressTimeRef.current;
    if (duration <= 300) {
      setShowDetectiveRole?.((prev) => !prev);
    }
  };

  return (
    <div className={containerClass}>
      {showKillerCard && (
        <div className="flex-1 p-2.5 md:p-3 neo-card rounded-2xl border-t-white/20 flex flex-col justify-between gap-2 shadow-xl">
          <div className="flex items-center justify-between w-full gap-1.5 min-h-[30px]">
            <span className="text-[8.5px] sm:text-[9px] md:text-[10px] font-black text-rose-200 uppercase bg-rose-950/80 border border-rose-700/60 px-2 py-0.5 rounded-md shrink-0 tracking-widest whitespace-nowrap shadow-sm">
              {role1Name === "ОПЕРАТИВНИК" ? "ОПЕР" : role1Name}
            </span>
            <span
              title={displayedKillerName}
              className="text-[8.5px] sm:text-[9.5px] md:text-[11px] font-black text-zinc-100 text-right uppercase tracking-tight leading-[1.15] break-words line-clamp-2 flex-1 min-w-0"
            >
              {displayedKillerName}
            </span>
          </div>
          <button
            type="button"
            onPointerDown={handleKillerPointerDown}
            onPointerUp={handleKillerPointerUp}
            onPointerLeave={handleKillerPointerLeave}
            onPointerCancel={handleKillerPointerLeave}
            onClick={handleKillerClick}
            onContextMenu={(e) => e.preventDefault()}
            disabled={!canPeekKiller}
            className={`w-full h-9 sm:h-10 md:h-11 rounded-xl text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 select-none pointer-events-auto cursor-pointer ${
              !canPeekKiller
                ? "bg-zinc-950/60 text-zinc-600 border border-white/5 cursor-not-allowed opacity-50"
                : isKillerActive
                  ? "neo-button-danger scale-[0.98] shadow-[0_0_15px_rgba(244,63,94,0.5)] ring-1 ring-rose-400/50"
                  : "neo-button-danger shadow-md"
            }`}
          >
            {!canPeekKiller ? (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> БЛОК</>
            ) : (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> РОЛЬ</>
            )}
          </button>
        </div>
      )}

      {showDetectiveCard && (
        <div className="flex-1 p-2.5 md:p-3 neo-card rounded-2xl border-t-white/20 flex flex-col justify-between gap-2 shadow-xl">
          <div className="flex items-center justify-between w-full gap-1.5 min-h-[30px]">
            <span className={`text-[8.5px] sm:text-[9px] md:text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 tracking-widest whitespace-nowrap shadow-sm ${
              role2Name === "ПОЛИЦИЯ" || role2Name === "Полиция"
                ? "bg-blue-900/50 border border-blue-700/60 text-blue-200"
                : "text-blue-200 bg-blue-950/80 border border-blue-700/60"
            }`}>
              {role2Name === "ОПЕРАТИВНИК" ? "ОПЕР" : role2Name}
            </span>
            <span
              title={displayedDetectiveName}
              className="text-[8.5px] sm:text-[9.5px] md:text-[11px] font-black text-zinc-100 text-right uppercase tracking-tight leading-[1.15] break-words line-clamp-2 flex-1 min-w-0"
            >
              {displayedDetectiveName}
            </span>
          </div>
          <button
            type="button"
            onPointerDown={handleDetectivePointerDown}
            onPointerUp={handleDetectivePointerUp}
            onPointerLeave={handleDetectivePointerLeave}
            onPointerCancel={handleDetectivePointerLeave}
            onClick={handleDetectiveClick}
            onContextMenu={(e) => e.preventDefault()}
            disabled={!canPeekDetective}
            className={`w-full h-9 sm:h-10 md:h-11 rounded-xl text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 select-none pointer-events-auto cursor-pointer ${
              !canPeekDetective
                ? "bg-zinc-950/60 text-zinc-600 border border-white/5 cursor-not-allowed opacity-50"
                : isDetectiveActive
                  ? "neo-button-primary scale-[0.98] shadow-[0_0_15px_rgba(59,130,246,0.5)] ring-1 ring-blue-400/50"
                  : "neo-button-primary shadow-md"
            }`}
          >
            {!canPeekDetective ? (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> БЛОК</>
            ) : (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> РОЛЬ</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
