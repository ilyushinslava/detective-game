import { memo, useState } from "react";
import { motion } from "framer-motion";
import { type Character, type GameModeType, SPY_COLORS } from "../types/game";

// Автоматическая карта всех доступных изображений в папке
const characterImages = import.meta.glob<{ default: string }>(
  "../assets/characters/*.webp",
  { eager: true }
);

export interface CharacterCardProps {
  mode: GameModeType;
  character: Character;
  isSelected: boolean;
  neighborHighlightColor?: string | null;
  isUniformedOfficer?: boolean;
  isTargetVictim?: boolean;
  radarRingColor?: string | null;
  isRadarCenter?: boolean;
  isError?: boolean;
  onClick: () => void;
}

const renderSilhouette = (id: string) => {
  const num = parseInt(id.replace("c", ""), 10) || 0;
  const variant = num % 8;

  const svgClass = "w-full h-full opacity-25 text-zinc-400 fill-current pointer-events-none";

  switch (variant) {
    case 0: // Детектив в федоре
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M35 45 C40 20, 80 20, 85 45 Z" />
          <path d="M15 45 C45 35, 75 35, 105 45 C105 50, 15 50, 15 45 Z" />
          <path d="M45 50 L75 50 L70 75 C60 85, 50 80, 45 50 Z" opacity="0.6" />
          <path d="M25 110 L40 75 L50 90 L60 80 L70 90 L80 75 L95 110 Z" />
        </svg>
      );
    case 1: // Роковая женщина
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M30 30 C10 50, 20 90, 35 100 C35 70, 25 50, 45 35 C65 20, 90 30, 95 60 C100 90, 85 100, 85 100 C105 80, 105 40, 80 25 C55 10, 35 15, 30 30 Z" />
          <path d="M45 40 C75 40, 85 60, 75 80 C60 90, 45 80, 45 40 Z" opacity="0.5" />
          <path d="M55 85 C60 82, 65 82, 70 85 C65 88, 60 88, 55 85 Z" opacity="0.8" />
          <path d="M35 110 C45 95, 75 95, 85 110 Z" />
        </svg>
      );
    case 2: // Гангстер с сигарой
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M30 40 C40 15, 75 20, 85 45 Z" />
          <path d="M10 45 C40 30, 80 40, 110 55 C100 60, 20 55, 10 45 Z" />
          <path d="M40 50 L75 55 L70 80 C60 90, 45 85, 40 50 Z" opacity="0.6" />
          <path d="M65 80 L95 88 L93 92 L63 84 Z" />
          <circle cx="96" cy="90" r="3" opacity="0.8" />
          <path d="M20 110 L45 85 L60 100 L75 85 L100 110 Z" />
        </svg>
      );
    case 3: // Профессор в очках
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M35 45 C35 15, 85 15, 85 45 C85 75, 75 90, 60 90 C45 90, 35 75, 35 45 Z" opacity="0.4" />
          <circle cx="48" cy="55" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="72" cy="55" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M56 55 L64 55" stroke="currentColor" strokeWidth="3" />
          <path d="M30 110 L45 90 L60 105 L75 90 L90 110 Z" />
          <path d="M55 105 L65 105 L60 120 Z" opacity="0.7" />
        </svg>
      );
    case 4: // Офицер полиции
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M25 35 C40 10, 80 10, 95 35 L85 45 L35 45 Z" />
          <path d="M55 25 L65 25 L60 35 Z" opacity="0.8" />
          <path d="M20 45 C50 40, 70 40, 100 45 C90 55, 30 55, 20 45 Z" />
          <path d="M40 50 L80 50 L75 80 C60 90, 45 80, 40 50 Z" opacity="0.5" />
          <path d="M20 110 L40 85 L80 85 L100 110 Z" />
        </svg>
      );
    case 5: // Информатор в кепке
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M25 40 C40 25, 80 25, 95 45 C70 40, 40 45, 20 50 Z" />
          <path d="M35 48 C60 45, 80 48, 80 75 C60 85, 40 75, 35 48 Z" opacity="0.6" />
          <path d="M15 110 C25 80, 45 75, 60 75 C75 75, 95 80, 105 110 Z" />
          <path d="M30 110 L40 75 L50 95 L60 85 L70 95 L80 75 L90 110 Z" opacity="0.8" />
        </svg>
      );
    case 6: // Влиятельная дама
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M5 45 C40 15, 80 15, 115 45 C80 35, 40 35, 5 45 Z" />
          <path d="M40 35 C50 15, 70 15, 80 35 Z" />
          <path d="M45 45 C75 45, 80 65, 70 85 C60 95, 50 85, 45 45 Z" opacity="0.5" />
          <circle cx="50" cy="90" r="2" />
          <circle cx="56" cy="93" r="2" />
          <circle cx="64" cy="93" r="2" />
          <circle cx="70" cy="90" r="2" />
          <path d="M30 110 C45 95, 75 95, 90 110 Z" />
        </svg>
      );
    case 7: // Громила
    default:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M35 30 C35 10, 75 10, 85 30 C95 50, 90 80, 75 90 C50 100, 30 80, 35 30 Z" opacity="0.6" />
          <path d="M45 45 L75 45 L70 55 L50 55 Z" />
          <path d="M65 55 L60 70 L65 75" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M25 110 L35 80 C50 95, 70 95, 85 80 L95 110 Z" />
        </svg>
      );
  }
};

export const CharacterCard = memo(
  ({
    mode,
    character,
    isSelected,
    neighborHighlightColor,
    isUniformedOfficer,
    isTargetVictim,
    radarRingColor,
    onClick,
    isRadarCenter,
    isError = false,
  }: CharacterCardProps) => {
    const [imgError, setImgError] = useState(false);
    const isDead = !character.isAlive;
    const isExonerated = character.isExonerated && !isDead;
    const isSecretService = mode === "SECRET_SERVICE";
    const unmaskedColor =
      character.unmaskedSpyIndex !== undefined
        ? SPY_COLORS[character.unmaskedSpyIndex % SPY_COLORS.length]
        : null;

    return (
      <motion.div
        onClick={onClick}
        animate={
          isError
            ? { rotate: [-4, 4, -4, 4, 0], scale: [1, 1.05, 0.95, 1] }
            : {}
        }
        transition={{ duration: 0.4 }}
        className={`relative w-full aspect-square rounded-md sm:rounded-xl p-0.5 sm:p-1.5 flex flex-col justify-between border select-none transition-all duration-150 cursor-pointer overflow-hidden ${
          isError
            ? "bg-zinc-800/90 border-zinc-500 ring-2 ring-zinc-500/50 shadow-[0_0_12px_rgba(113,113,122,0.4)] z-30"
            : character.isVault
              ? character.isVaultCracked
                ? "bg-amber-950/40 border-amber-500 shadow-[inset_0_0_12px_rgba(245,158,11,0.25)]"
                : character.isVaultLocked
                  ? "bg-red-950/40 border-red-700/80"
                  : "bg-zinc-900 border-amber-600/60"
              : isDead
                ? isSecretService
                  ? "bg-zinc-950/95 border-amber-900/40 opacity-70 shadow-inner"
                  : "bg-zinc-950/95 border-zinc-900 opacity-50 shadow-inner"
                : isTargetVictim
                  ? "bg-red-950/30 border-red-600 shadow-[0_0_12px_rgba(220,38,38,0.35)] animate-pulse"
                  : isExonerated
                    ? "bg-gradient-to-b from-blue-950/50 to-zinc-900 border-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.25)]"
                    : "bg-zinc-900/95 border-zinc-800 hover:border-zinc-700 shadow-sm"
        } ${
          isSelected
            ? "ring-2 ring-white border-white shadow-[0_0_15px_rgba(255,255,255,0.8)] scale-95 z-30"
            : (isRadarCenter || radarRingColor) && neighborHighlightColor
              ? `${neighborHighlightColor} !border-white ring-2 ring-offset-1 ring-offset-zinc-950 ${radarRingColor} ${isRadarCenter ? "shadow-[0_0_15px_currentColor]" : "animate-pulse"} z-20`
              : isRadarCenter && radarRingColor
                ? `ring-2 ring-offset-1 ring-offset-zinc-950 ${radarRingColor} shadow-[0_0_15px_currentColor] z-10`
                : radarRingColor
                  ? `ring-2 ring-offset-1 ring-offset-zinc-950 ${radarRingColor} opacity-80 animate-pulse z-10`
                  : neighborHighlightColor
                    ? `${neighborHighlightColor} z-10`
                    : ""
        }`}
      >
        {/* Фоновый силуэт / Портрет */}
        {!character.isVault && !isDead && (() => {
          const imageAsset = characterImages[`../assets/characters/${character.id}.webp`]?.default;

          return (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              {imageAsset && !imgError ? (
                <img
                  src={imageAsset}
                  alt={character.name}
                  className="w-full h-full object-cover rounded-md opacity-75 grayscale contrast-125 pointer-events-none"
                  onError={() => setImgError(true)}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-40">
                  {renderSilhouette(character.id)}
                </div>
              )}
            </div>
          );
        })()}

        {/* Номер дела и иконки */}
        <div className="flex items-center justify-between gap-0.5 z-10 w-full leading-none px-1 pt-1">
          <span
            className={`text-[8px] font-mono font-bold tracking-widest ${
              isDead
                ? "text-zinc-600 line-through"
                : isExonerated
                  ? "text-cyan-400"
                  : "text-zinc-500"
            }`}
          >
            {character.isVault
              ? "[СЕЙФ]"
              : `#${character.id.replace("c", "").padStart(2, "0")}`}
          </span>

          <div className="flex items-center gap-1 leading-none">
            {isTargetVictim && !isDead && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 text-red-500 animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
            )}
            {isUniformedOfficer && !isDead && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 text-cyan-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M8 11l4 3 4-3"/></svg>
            )}
            {isRadarCenter && !isDead && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 text-cyan-400 animate-pulse drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]"><path d="M12 20v-8"/><path d="M8 12a4 4 0 0 1 8 0"/><path d="M4 12a8 8 0 0 1 16 0"/></svg>
            )}
            {character.isVault && (
              <span>
                {character.isVaultCracked
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 text-emerald-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                  : character.isVaultLocked
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 text-red-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 text-amber-500"><rect x="4" y="10" width="16" height="10"/><polygon points="12 2 20 10 4 10"/></svg>}
              </span>
            )}
            {character.isShielded && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 text-zinc-300"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
            {character.hasBomb && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]"><circle cx="11" cy="13" r="7"/><path d="M16 8l3-3"/><path d="M19 5a2 2 0 0 1 2 2"/></svg>}
            {character.isRobbed && <span className="text-[7px] font-black text-amber-400 border border-amber-400/50 px-0.5 rounded-sm bg-amber-950/50">CR</span>}
          </div>
        </div>

        {/* Диагональные штампы */}
        {isDead && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="transform -rotate-12 border border-red-600 bg-red-950/90 text-red-500 font-black text-[9px] sm:text-[11px] uppercase px-2 py-0.5 tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.4)] rounded-sm backdrop-blur-sm">
              {isSecretService ? "РАСКРЫТ" : "УБИТ"}
            </div>
          </div>
        )}

        {isExonerated && !isDead && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="transform rotate-6 border border-cyan-500 bg-cyan-950/90 text-cyan-400 font-black text-[8px] sm:text-[10px] uppercase px-2 py-0.5 tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.4)] rounded-sm backdrop-blur-sm">
              АЛИБИ
            </div>
          </div>
        )}

        {/* Имя (внизу с градиентом) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#080a0f] via-[#080a0f]/80 to-transparent pt-5 pb-1.5 px-1 z-10 flex items-end justify-center">
          <span
            className={`block text-[8.5px] xs:text-[9.5px] sm:text-xs font-black tracking-wider break-normal whitespace-normal hyphens-none text-center uppercase ${
              isDead
                ? isSecretService
                  ? `${character.unmaskedSpyIndex === 0 ? "text-red-600 decoration-red-900" : character.unmaskedSpyIndex === 1 ? "text-cyan-600 decoration-cyan-900" : "text-zinc-600 decoration-zinc-800"} line-through`
                  : "text-zinc-600 line-through decoration-red-900/70"
                : isTargetVictim
                  ? "text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]"
                  : isExonerated
                    ? "text-cyan-300 drop-shadow-[0_0_5px_rgba(103,232,249,0.5)]"
                    : "text-zinc-200"
            }`}
          >
            {character.name}
          </span>
        </div>
      </motion.div>
    );
  },
);
