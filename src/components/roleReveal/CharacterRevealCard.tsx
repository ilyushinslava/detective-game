import React from "react";
import { motion } from "framer-motion";
import type { Character } from "../../types/game";
import { renderSilhouetteSvg } from "./RoleRevealIcons";

const characterImages = import.meta.glob<{ default: string }>(
  "../../assets/characters/*.webp",
  { eager: true }
);

export interface CharacterRevealCardProps {
  character: Character | undefined;
  titleLabel: string;
  isRed: boolean;
  onOpenFullscreen: (preview: { url: string; name: string; id: string }) => void;
}

export const CharacterRevealCard: React.FC<CharacterRevealCardProps> = ({
  character,
  titleLabel,
  isRed,
  onOpenFullscreen,
}) => {
  const imageAsset = character?.id
    ? characterImages[`../../assets/characters/${character.id}.webp`]?.default
    : null;
  const gradient = isRed
    ? "from-red-950 via-zinc-950/80 to-transparent"
    : "from-blue-950 via-zinc-950/80 to-transparent";
  const border = isRed
    ? "border-rose-500/50 shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
    : "border-blue-500/50 shadow-[0_8px_24px_rgba(0,0,0,0.6)]";

  return (
    <motion.div
      layoutId={character?.id ? `role-card-${character.id}` : "role-card-default"}
      transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
      className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border ${border} bg-zinc-950 h-[140px] sm:h-[175px] md:h-[195px] flex flex-col justify-between p-3.5 sm:p-5 mb-2 sm:mb-3 select-none shrink-0 shadow-2xl cursor-pointer group`}
      onClick={() =>
        imageAsset &&
        character &&
        onOpenFullscreen({ url: imageAsset, name: character.name, id: character.id })
      }
    >
      {imageAsset ? (
        <motion.img
          layoutId={character?.id ? `role-img-${character.id}` : "role-img-default"}
          transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
          src={imageAsset}
          alt={character?.name || "Личность"}
          className="absolute inset-0 w-full h-full object-cover object-center pt-4 opacity-60 grayscale contrast-125 group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-6 pt-10">
          {renderSilhouetteSvg(character?.id || "c0")}
        </div>
      )}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t ${gradient} pointer-events-none`}
      />

      <div className="relative z-10 flex items-center justify-between pointer-events-none">
        <span
          className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
            isRed
              ? "bg-red-950/90 text-red-300 border-red-700/60"
              : titleLabel === "ПОЛИЦИЯ" || titleLabel === "Полиция"
              ? "bg-blue-900/40 border border-blue-800/50 text-blue-400"
              : "bg-blue-950/90 text-blue-300 border-blue-700/60"
          }`}
        >
          {titleLabel}
        </span>
        <span className="text-xs font-mono font-bold text-zinc-400">
          {character?.id ? `#${character.id.replace("c", "").padStart(2, "0")}` : ""}
        </span>
      </div>

      <div className="relative z-10 text-left pointer-events-none flex flex-col justify-end h-full">
        <div className="flex items-center gap-1.5 mb-2 opacity-80">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-3 h-3 text-zinc-300"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">
            Нажмите для просмотра полного фото
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider leading-none drop-shadow-md">
          {character?.name ?? "Неизвестно"}
        </h2>
      </div>
    </motion.div>
  );
};
