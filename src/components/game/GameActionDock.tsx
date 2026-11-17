import React from "react";
import type { Character, GameState } from "../../types/game";

export interface TargetAction {
  id: string;
  label: string;
  disabled?: boolean;
  className: string;
  onClick: () => void;
}

export interface GameActionDockProps {
  gameState: GameState;
  targetActions: TargetAction[];
  cleanupAction?: {
    disabled?: boolean;
    onClick: () => void;
  } | null;
  isCleanupAvailable: boolean;
  isDetectiveView: boolean;
  selectedCharacter: Character | null;
  setIsHandSheetOpen: (open: boolean) => void;
  logContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const GameActionDock: React.FC<GameActionDockProps> = ({
  gameState,
  targetActions,
  cleanupAction,
  isCleanupAvailable,
  isDetectiveView,
  selectedCharacter,
  setIsHandSheetOpen,
  logContainerRef,
}) => {
  return (
    <footer className="w-full shrink-0 flex items-stretch gap-4 border-t border-zinc-800 bg-[#080a0f] p-2 sm:p-3 md:px-6 md:py-3 z-30">
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 w-full">
          {targetActions.map((action) => {
            const isRed = action.id === "kill_basic" || action.id === "capture_spy";
            const isAmber = action.id === "rob_basic";
            const isBlue =
              action.id === "accuse_basic" ||
              action.id === "patrol_call" ||
              action.id === "interrogate_spy";
            const isDisguise =
              action.id === "disguise_skhvatka" ||
              action.id === "escape_maniac" ||
              action.id === "disguise_thief" ||
              action.id === "DISGUISE" ||
              action.id === "FAST_DISGUISE" ||
              action.id.includes("disguise") ||
              action.id.includes("escape");

            const colorClasses = isRed
              ? "bg-gradient-to-r from-red-700 via-red-600 to-rose-600 hover:from-red-650 hover:to-rose-550 text-white font-black shadow-lg shadow-red-950/50 border border-red-400/40 active:scale-[0.97]"
              : isBlue
              ? "bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white font-black shadow-lg shadow-blue-950/50 border border-blue-400/40 active:scale-[0.97]"
              : isAmber
              ? "bg-gradient-to-r from-amber-600 to-yellow-500 text-zinc-950 font-black shadow-lg shadow-amber-950/50 border border-amber-300/50 active:scale-[0.97]"
              : isDisguise
              ? "bg-gradient-to-b from-zinc-900 via-zinc-950 to-black hover:from-zinc-800 hover:to-zinc-950 text-zinc-100 font-black tracking-wider uppercase border border-zinc-500/60 hover:border-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_12px_rgba(0,0,0,0.8)] active:scale-[0.97]"
              : "bg-zinc-800 hover:bg-zinc-700 text-white font-bold border border-white/20 active:scale-[0.97]";

            return (
              <button
                key={action.id}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`flex-1 min-w-0 h-10 sm:h-11 md:h-12 px-1.5 sm:px-2 text-[10px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer select-none transition-all disabled:opacity-40 disabled:cursor-not-allowed rounded-xl ${colorClasses}`}
              >
                {(action.id === "kill_basic" || action.id === "capture_spy") && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-4 h-4 md:w-5 md:h-5 shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="22" y1="12" x2="18" y2="12" />
                    <line x1="6" y1="12" x2="2" y2="12" />
                    <line x1="12" y1="6" x2="12" y2="2" />
                    <line x1="12" y1="22" x2="12" y2="18" />
                  </svg>
                )}
                {(action.id === "accuse_basic" || action.id === "patrol_call") && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-4 h-4 md:w-5 md:h-5 shrink-0"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                )}
                {action.id === "interrogate_spy" && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-4 h-4 md:w-5 md:h-5 shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                )}
                {(action.id === "disguise_skhvatka" ||
                  action.id === "escape_maniac" ||
                  action.id === "disguise_thief") && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-4 h-4 md:w-5 md:h-5 shrink-0"
                  >
                    <path d="M2 18h20M4 18c0-2 2-3 4-4l2-6h4l2 6c2 1 4 2 4 4M9 13h6" />
                  </svg>
                )}
                {action.id === "rob_basic" && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-4 h-4 md:w-5 md:h-5 shrink-0"
                  >
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                )}
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                  {selectedCharacter && !action.disabled ? `${action.label}` : action.label}
                </span>
              </button>
            );
          })}
          {gameState.mode === "MANIAC_VS_OPERATIVE" && isDetectiveView && (
            <button
              onClick={() => setIsHandSheetOpen(true)}
              disabled={Boolean(
                gameState.inspectorChoices && gameState.inspectorChoices.length > 0
              )}
              className="flex-1 min-w-0 h-10 sm:h-11 md:h-12 px-1.5 sm:px-2 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white font-black shadow-lg shadow-blue-950/50 border border-blue-400/40 active:scale-[0.97] rounded-xl text-[10px] sm:text-xs uppercase tracking-tight sm:tracking-wider flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer select-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-4 h-4 md:w-5 md:h-5 text-blue-200 shrink-0"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 1-2.5-2.5z" />
                <path d="M6 6h10M6 10h10M6 14h6" />
              </svg>
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                Досье ({gameState.detectiveHand.length})
              </span>
            </button>
          )}
          {cleanupAction && isCleanupAvailable && (
            <button
              onClick={cleanupAction.onClick}
              disabled={cleanupAction.disabled}
              className="flex-1 min-w-0 h-10 sm:h-11 md:h-12 px-1.5 sm:px-2 bg-gradient-to-r from-red-700 via-red-600 to-rose-600 hover:from-red-650 hover:to-rose-550 text-white font-black shadow-lg shadow-red-950/50 border border-red-400/40 active:scale-[0.97] text-[10px] sm:text-xs uppercase tracking-tight sm:tracking-wider rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-1 sm:gap-1.5 select-none"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-4 h-4 md:w-5 md:h-5 text-red-200 shrink-0"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M9 10h.01M15 10h.01M10 15h4" />
              </svg>
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">Зачистка</span>
            </button>
          )}
        </div>
      </div>

      <div className="hidden landscape:lg:flex flex-col flex-1 min-h-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Протокол событий ({gameState.log.length})
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 text-zinc-500"
          >
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
        </div>
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto space-y-2 text-[10px] font-medium tracking-normal text-zinc-300 pr-2 custom-scrollbar"
        >
          {gameState.log.map((entry, idx) => (
            <div key={idx} className="leading-relaxed break-words">
              • {entry}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};
