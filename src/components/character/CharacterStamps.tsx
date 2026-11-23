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
        <div className="absolute bottom-[18px] sm:bottom-[22px] inset-x-0.5 flex items-center justify-center z-20 pointer-events-none">
          <motion.div
            key={`dead_stamp_${characterId}`}
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {spyMeta ? (
              <div
                className={`border ${spyMeta.border} bg-black/80 ${spyMeta.text} whitespace-nowrap font-display font-bold uppercase tracking-wider text-[8px] sm:text-[9px] px-1 py-[1px] rounded-sm select-none backdrop-blur-sm text-center flex items-center gap-1 shadow-sm`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${spyMeta.bg || "bg-rose-500"}`} />
                <span>РАСКРЫТ</span>
                <span className="sr-only">{spyMeta.name.toUpperCase()}</span>
              </div>
            ) : isSecretService || unmaskedSpyIndex !== undefined ? (
              <div className="border border-rose-600/80 bg-black/80 text-rose-400 whitespace-nowrap font-display font-bold uppercase tracking-wider text-[8px] sm:text-[9px] px-1 py-[1px] rounded-sm select-none backdrop-blur-sm text-center">
                РАСКРЫТ
              </div>
            ) : isArrested ? (
              <div className="border border-blue-500/80 bg-black/80 text-blue-300 whitespace-nowrap font-display font-bold uppercase tracking-wider text-[8px] sm:text-[9px] px-1 py-[1px] rounded-sm select-none backdrop-blur-sm text-center">
                АРЕСТОВАН
              </div>
            ) : (
              <div className="border border-rose-600/80 bg-black/80 text-rose-500 whitespace-nowrap font-display font-bold uppercase tracking-wider text-[8px] sm:text-[9px] px-1 py-[1px] rounded-sm select-none backdrop-blur-sm text-center">
                УБИТ
              </div>
            )}
          </motion.div>
        </div>
      )}

      {isExonerated && !isDead && !isArrested && (
        <div className="absolute bottom-[18px] sm:bottom-[22px] inset-x-0.5 flex items-center justify-center z-20 pointer-events-none">
          <motion.div
            key={`alibi_stamp_${characterId}`}
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="border border-blue-500/80 bg-black/80 text-blue-400 whitespace-nowrap font-display font-bold uppercase tracking-wider text-[8px] sm:text-[9px] px-1 py-[1px] rounded-sm select-none backdrop-blur-sm text-center">
              АЛИБИ
            </div>
          </motion.div>
        </div>
      )}

      {isArrested && !isDead && (
        <div className="absolute bottom-[18px] sm:bottom-[22px] inset-x-0.5 flex items-center justify-center z-20 pointer-events-none">
          <motion.div
            key={`arrest_stamp_${characterId}`}
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="border border-blue-500/80 bg-black/80 text-blue-300 whitespace-nowrap font-display font-bold uppercase tracking-wider text-[8px] sm:text-[9px] px-1 py-[1px] rounded-sm select-none backdrop-blur-sm text-center">
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
      className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] filter"
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
