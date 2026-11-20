import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPY_COLORS } from "../../types/game";

interface CharacterStampsProps {
  isDead: boolean;
  isExonerated: boolean;
  isArrested: boolean;
  characterId: string;
  unmaskedSpyIndex?: number;
  isSecretService: boolean;
}

export const CharacterStamps: React.FC<CharacterStampsProps> = ({
  isDead,
  isExonerated,
  isArrested,
  characterId,
  unmaskedSpyIndex,
  isSecretService,
}) => {
  const spyMeta =
    unmaskedSpyIndex !== undefined
      ? SPY_COLORS[unmaskedSpyIndex % SPY_COLORS.length]
      : null;

  return (
    <AnimatePresence>
      {isDead && (
        <div className="absolute top-[34%] inset-x-0 -translate-y-1/2 flex items-center justify-center z-20 pointer-events-none px-1">
          <motion.div
            key={`dead_stamp_${characterId}`}
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
            initial={{ opacity: 0, scale: 0.6, rotate: -25 }}
            animate={{ opacity: 1, scale: 1, rotate: -12 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div
              className={`border whitespace-nowrap font-display font-black uppercase tracking-wider text-[8px] sm:text-[9px] md:text-xs px-1.5 py-0.5 rounded-sm select-none backdrop-blur-sm text-center ${
                spyMeta
                  ? `${spyMeta.border} bg-zinc-950/95 ${spyMeta.text} shadow-[0_0_15px_rgba(244,63,94,0.3)]`
                  : isSecretService || unmaskedSpyIndex !== undefined
                    ? "border-rose-600 bg-rose-950/90 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                    : isArrested
                      ? "border border-blue-500/80 bg-blue-950/95 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                      : "border-rose-600 bg-rose-950/90 text-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.4)]"
              }`}
            >
              {isSecretService || unmaskedSpyIndex !== undefined
                ? spyMeta?.name ? `РАСКРЫТ: ${spyMeta.name.toUpperCase()}` : "РАСКРЫТ"
                : isArrested
                  ? "АРЕСТОВАН"
                  : "УБИТ"}
            </div>
          </motion.div>
        </div>
      )}

      {isExonerated && !isDead && !isArrested && (
        <div className="absolute top-[34%] inset-x-0 -translate-y-1/2 flex items-center justify-center z-20 pointer-events-none px-1">
          <motion.div
            key={`alibi_stamp_${characterId}`}
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
            initial={{ opacity: 0, scale: 0.6, rotate: 18 }}
            animate={{ opacity: 1, scale: 1, rotate: 6 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="border border-blue-500/80 bg-zinc-900/95 text-blue-400 whitespace-nowrap font-display font-black uppercase tracking-wider text-[8px] sm:text-[9px] md:text-xs px-1.5 py-0.5 rounded-sm select-none shadow-[0_0_12px_rgba(59,130,246,0.3)] backdrop-blur-sm text-center">
              АЛИБИ
            </div>
          </motion.div>
        </div>
      )}

      {isArrested && !isDead && (
        <div className="absolute top-[34%] inset-x-0 -translate-y-1/2 flex items-center justify-center z-20 pointer-events-none px-1">
          <motion.div
            key={`arrest_stamp_${characterId}`}
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
            initial={{ opacity: 0, scale: 0.6, rotate: -25 }}
            animate={{ opacity: 1, scale: 1, rotate: -12 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="border border-blue-500/80 bg-blue-950/95 text-blue-300 whitespace-nowrap font-display font-black uppercase tracking-wider text-[8px] sm:text-[9px] md:text-xs px-1.5 py-0.5 rounded-sm select-none shadow-[0_0_12px_rgba(59,130,246,0.4)] backdrop-blur-sm text-center">
              АРЕСТОВАН
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const CoinIndicator: React.FC = () => (
  <div
    data-testid="coin-indicator"
    title="Золотая монета"
    className="flex items-center justify-center shrink-0 pointer-events-none"
  >
    <svg
      viewBox="0 0 24 24"
      className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] filter"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" fill="#EAB308" stroke="#FEF08A" strokeWidth="1.5" />
      <path
        d="M12 7v10M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0"
        stroke="#713F12"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);
