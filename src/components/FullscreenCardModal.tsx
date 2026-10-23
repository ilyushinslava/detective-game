import React from "react";

interface FullscreenCardModalProps {
  card: { id: string; name: string; url: string } | null;
  onClose: () => void;
}

export const FullscreenCardModal: React.FC<FullscreenCardModalProps> = ({ card, onClose }) => {
  if (!card) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 bg-zinc-900/80 border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer z-10"
      >
        ✕
      </button>
      <div
        className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={card.url}
          alt={card.name}
          className="w-full h-full object-cover grayscale contrast-125"
        />
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-6 pt-20 flex flex-col items-center text-center">
          <span className="text-xs font-mono text-zinc-400 mb-2">
            #{card.id.replace("c", "").padStart(2, "0")}
          </span>
          <h2 className="text-3xl font-black text-zinc-100 uppercase tracking-wider leading-tight">
            {card.name}
          </h2>
        </div>
      </div>
    </div>
  );
};
