import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface IdentityRevealModalProps {
  badge: string;
  badgeColor: "red" | "amber" | "blue";
  character: { id: string; name: string } | null;
  characterImage: string | null;
  isOpen: boolean;
  isPvpPassPhase: boolean;
  onConfirmPvpPass: () => void;
  onAcceptIdentity: () => void;
  onPreviewCard?: (card: { id: string; name: string; url: string }) => void;
  targetPlayerName?: string;
  title: string;
}

export const IdentityRevealModal: React.FC<IdentityRevealModalProps> = ({
  badge,
  badgeColor,
  character,
  characterImage,
  isOpen,
  isPvpPassPhase,
  onConfirmPvpPass,
  onAcceptIdentity,
  targetPlayerName,
  title,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen) return null;

  const isRed = badgeColor === "red" || badgeColor === "amber";
  const accent = isRed ? "text-red-400" : "text-blue-400";
  const accentBg = isRed
    ? "bg-red-950/60 border-red-600/70 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
    : "bg-blue-950/60 border-blue-500/70 shadow-[0_0_15px_rgba(59,130,246,0.3)]";
  const buttonBg = isRed
    ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]"
    : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 select-none">
      <AnimatePresence>
        {isFullscreen && character && characterImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 select-none cursor-pointer"
            onClick={() => setIsFullscreen(false)}
          >
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-zinc-900/80 border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer z-10"
            >
              ✕
            </motion.button>

            <motion.div
              layoutId={`identity-card-${character.id}`}
              transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
              className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.9)] bg-zinc-950"
              onClick={() => setIsFullscreen(false)}
            >
              <motion.img
                layoutId={`identity-img-${character.id}`}
                transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
                src={characterImage}
                alt={character.name}
                className="w-full h-full object-cover grayscale contrast-125"
              />
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25, delay: 0.1 }}
                className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-6 pt-20 flex flex-col items-center text-center"
              >
                <span className="text-xs font-mono text-zinc-400 mb-2">
                  #{character.id.replace("c", "").padStart(2, "0")}
                </span>
                <h2 className="text-3xl font-black text-zinc-100 uppercase tracking-wider leading-tight">
                  {character.name}
                </h2>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isPvpPassPhase ? (
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
          <div className={`w-16 h-16 rounded-full ${accentBg} border flex items-center justify-center ${accent} mb-4`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </div>
          <span className={`text-xs font-bold ${accent} uppercase tracking-widest block mb-1`}>
            {badge}
          </span>
          <h2 className="text-xl font-black text-zinc-100 mb-2">
            Передайте экран: {targetPlayerName}
          </h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Убедитесь, что соперник не смотрит на экран.
          </p>
          <button
            type="button"
            onClick={onConfirmPvpPass}
            className={`w-full py-3.5 ${buttonBg} text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer`}
          >
            Я держу телефон один
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
          <div className={`w-16 h-16 rounded-full ${accentBg} border flex items-center justify-center ${accent} mb-4`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
              <path d="M2 18h20M4 18c0-2 2-3 4-4l2-6h4l2 6c2 1 4 2 4 4M9 13h6" />
            </svg>
          </div>
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">
            {badge}
          </span>
          {false && (
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">
            {isRed ? "Вас раскрыли!" : "Конспирация успешна"}
          </span>
          )}
          <h3 className="text-xl font-black text-zinc-100 mb-2">{title}</h3>
          {character && (
            <motion.div
              layoutId={`identity-card-${character.id}`}
              transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
              className="relative w-full h-48 rounded-2xl overflow-hidden border border-zinc-700 my-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] cursor-pointer group bg-zinc-950"
              onClick={() => characterImage && setIsFullscreen(true)}
            >
              {characterImage ? (
                <motion.img
                  layoutId={`identity-img-${character.id}`}
                  transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
                  src={characterImage}
                  alt={character.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-75 grayscale contrast-125 group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-zinc-500">Нет фото</div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-3 pt-12 flex flex-col items-center">
                <span className="text-[10px] font-mono text-zinc-400 mb-1">#{character.id.replace("c", "").padStart(2, "0")}</span>
                <span className="text-xl font-black text-zinc-100 uppercase tracking-wider leading-tight text-center mb-1">{character.name}</span>
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-zinc-400">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">Тапните для полного фото</span>
                </div>
              </div>
            </motion.div>
          )}
          <button
            type="button"
            onClick={onAcceptIdentity}
            className={`w-full py-3.5 ${isRed ? "bg-red-600 hover:bg-red-500 shadow-[0_10px_25px_rgba(220,38,38,0.3)]" : "bg-blue-600 hover:bg-blue-500 shadow-[0_10px_25px_rgba(59,130,246,0.3)]"} text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer border-t border-white/25`}
          >
            Принять личность{isRed ? "" : " ➔"}
          </button>
        </div>
      )}
    </div>
  );
};
