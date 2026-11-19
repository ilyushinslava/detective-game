import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Character, GameState } from "../types/game";
import { DetectiveHand } from "./DetectiveHand";
import { ThiefHand } from "./ThiefHand";

export interface GameSheetsProps {
  gameState: GameState;
  allChars: Character[];
  characterImages: Record<string, { default: string }>;
  isHumanTurn: boolean;
  isDetectiveTurn: boolean;
  isKillerTurn: boolean;
  isHandSheetOpen: boolean;
  setIsHandSheetOpen: (val: boolean) => void;
  isLogOpen: boolean;
  setIsLogOpen: (val: boolean) => void;
  logContainerRef: React.RefObject<HTMLDivElement>;
  handleExonerateFromHand: (id: string) => void;
  handleFastDisguise: (id: string) => void;
}

export const GameSheets: React.FC<GameSheetsProps> = memo(({
  gameState,
  allChars,
  characterImages,
  isHumanTurn,
  isDetectiveTurn,
  isKillerTurn,
  isHandSheetOpen,
  setIsHandSheetOpen,
  isLogOpen,
  setIsLogOpen,
  logContainerRef,
  handleExonerateFromHand,
  handleFastDisguise,
}) => {
  return (
    <>
      <AnimatePresence>
        {isHandSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end"
          >
            <div
              className="absolute inset-0"
              onClick={() => setIsHandSheetOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative neo-card border-t border-white/10 rounded-t-3xl p-4 max-h-[70vh] flex flex-col z-10 shadow-2xl"
            >
              <div className="w-12 h-1 bg-zinc-700/80 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wider">
                  {gameState.mode === "THIEF_HUNT"
                    ? "Маски вора"
                    : "Досье доказательств (Алиби)"}
                </h3>
                <button
                  onClick={() => setIsHandSheetOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-800/90 text-zinc-400 hover:text-white font-bold flex items-center justify-center text-xs cursor-pointer border border-white/10"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto custom-scrollbar space-y-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] pr-1">
                {(gameState.mode === "SKHVATKA" ||
                  gameState.mode === "MANIAC_VS_OPERATIVE") && (
                  <DetectiveHand
                    handIds={gameState.detectiveHand}
                    allCharacters={allChars}
                    isDetectiveTurn={
                      isHumanTurn && isDetectiveTurn && !gameState.winner
                    }
                    characterImages={characterImages}
                    onExonerateFromHand={(id) => {
                      handleExonerateFromHand(id);
                      setIsHandSheetOpen(false);
                    }}
                  />
                )}

                {gameState.mode === "THIEF_HUNT" && (
                  <ThiefHand
                    handIds={gameState.killerHand ?? []}
                    isThiefTurn={
                      isHumanTurn && isKillerTurn && !gameState.winner
                    }
                    characterImages={characterImages}
                    onFastDisguise={(id) => {
                      handleFastDisguise(id);
                      setIsHandSheetOpen(false);
                    }}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end"
          >
            <div
              className="absolute inset-0"
              onClick={() => setIsLogOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative neo-card border-t border-white/10 rounded-t-3xl p-4 max-h-[75vh] flex flex-col z-10 shadow-2xl"
            >
              <div className="w-12 h-1 bg-zinc-700/80 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-zinc-400 shrink-0">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  </svg>
                  <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wider">
                    Блокнот расследования ({gameState.log.length})
                  </h3>
                </div>
                <button
                  onClick={() => setIsLogOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-800/90 text-zinc-400 hover:text-white font-bold flex items-center justify-center text-xs cursor-pointer border border-white/10"
                >
                  ✕
                </button>
              </div>

              <div
                ref={logContainerRef}
                className="overflow-y-auto custom-scrollbar space-y-2 text-xs font-mono text-zinc-300 pr-1 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
              >
                {gameState.log.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 leading-relaxed"
                  >
                    • {entry}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
