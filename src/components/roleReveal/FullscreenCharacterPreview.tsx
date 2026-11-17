import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface FullscreenCharacterPreviewProps {
  character: { id: string; name: string; url: string } | null;
  onClose: () => void;
}

export const FullscreenCharacterPreview: React.FC<FullscreenCharacterPreviewProps> = ({
  character,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {character && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 select-none cursor-pointer"
          onClick={onClose}
        >
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-zinc-900/80 border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer z-10"
          >
            ✕
          </motion.button>
          <motion.div
            layoutId={`role-card-${character.id}`}
            transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
            className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.9)] bg-zinc-950"
            onClick={onClose}
          >
            <motion.img
              layoutId={`role-img-${character.id}`}
              transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
              src={character.url}
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
  );
};
