import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Character, type GameModeType, SPY_COLORS } from "../types/game";
import { characterHasCoin, isSecretServiceMode, isThiefHuntMode, GAME_MODES } from "../constants/gameMeta";

const characterImages = import.meta.glob<{ default: string }>(
  "../assets/characters/*.webp",
  { eager: true }
);

export interface CharacterCardProps {
  mode: GameModeType;
  character: Character;
  isSelected: boolean;
  neighborRole?: "red" | "blue" | "purple" | null;
  neighborHighlightColor?: string | null;
  isUniformedOfficer?: boolean;
  isTargetVictim?: boolean;
  radarRingColor?: string | null;
  isRadarCenter?: boolean;
  isError?: boolean;
  isMyCharacter?: boolean;
  isOverlapZone?: boolean;
  isPVP?: boolean;
  myRoleColor?: "red" | "blue";
  isLastRobbed?: boolean;
  onClick: () => void;
}

export const renderSilhouette = (id: string) => {
  const num = parseInt(id.replace("c", ""), 10) || 0;
  const variant = num % 8;
  const svgClass = "w-full h-full opacity-25 text-zinc-400 fill-current pointer-events-none";

  switch (variant) {
    case 0:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M35 45 C40 20, 80 20, 85 45 Z" />
          <path d="M15 45 C45 35, 75 35, 105 45 C105 50, 15 50, 15 45 Z" />
          <path d="M45 50 L75 50 L70 75 C60 85, 50 80, 45 50 Z" opacity="0.6" />
          <path d="M25 110 L40 75 L50 90 L60 80 L70 90 L80 75 L95 110 Z" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M30 30 C10 50, 20 90, 35 100 C35 70, 25 50, 45 35 C65 20, 90 30, 95 60 C100 90, 85 100, 85 100 C105 80, 105 40, 80 25 C55 10, 35 15, 30 30 Z" />
          <path d="M45 40 C75 40, 85 60, 75 80 C60 90, 45 80, 45 40 Z" opacity="0.5" />
          <path d="M55 85 C60 82, 65 82, 70 85 C65 88, 60 88, 55 85 Z" opacity="0.8" />
          <path d="M35 110 C45 95, 75 95, 85 110 Z" />
        </svg>
      );
    case 2:
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
    case 3:
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
    case 4:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M25 35 C40 10, 80 10, 95 35 L85 45 L35 45 Z" />
          <path d="M55 25 L65 25 L60 35 Z" opacity="0.8" />
          <path d="M20 45 C50 40, 70 40, 100 45 C90 55, 30 55, 20 45 Z" />
          <path d="M40 50 L80 50 L75 80 C60 90, 45 80, 40 50 Z" opacity="0.5" />
          <path d="M20 110 L40 85 L80 85 L100 110 Z" />
        </svg>
      );
    case 5:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M25 40 C40 25, 80 25, 95 45 C70 40, 40 45, 20 50 Z" />
          <path d="M35 48 C60 45, 80 48, 80 75 C60 85, 40 75, 35 48 Z" opacity="0.6" />
          <path d="M15 110 C25 80, 45 75, 60 75 C75 75, 95 80, 105 110 Z" />
          <path d="M30 110 L40 75 L50 95 L60 85 L70 95 L80 75 L90 110 Z" opacity="0.8" />
        </svg>
      );
    case 6:
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
    case 7:
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

export const formatCompactName = (fullName: string): string => {
  return fullName || "";
};

export const areCharacterCardPropsEqual = (
  prev: CharacterCardProps,
  next: CharacterCardProps
): boolean => {
  if (prev.mode !== next.mode) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.neighborRole !== next.neighborRole) return false;
  if (prev.neighborHighlightColor !== next.neighborHighlightColor) return false;
  if (prev.isUniformedOfficer !== next.isUniformedOfficer) return false;
  if (prev.isTargetVictim !== next.isTargetVictim) return false;
  if (prev.radarRingColor !== next.radarRingColor) return false;
  if (prev.isRadarCenter !== next.isRadarCenter) return false;
  if (prev.isError !== next.isError) return false;
  if (prev.isMyCharacter !== next.isMyCharacter) return false;
  if (prev.isOverlapZone !== next.isOverlapZone) return false;
  if (prev.isPVP !== next.isPVP) return false;
  if (prev.myRoleColor !== next.myRoleColor) return false;
  if (prev.isLastRobbed !== next.isLastRobbed) return false;

  const prevChar = prev.character;
  const nextChar = next.character;

  if (prevChar.id !== nextChar.id) return false;
  if (prevChar.name !== nextChar.name) return false;
  if (prevChar.isAlive !== nextChar.isAlive) return false;
  if (prevChar.isExonerated !== nextChar.isExonerated) return false;
  if (prevChar.isRobbed !== nextChar.isRobbed) return false;
  if (characterHasCoin(prevChar, prev.mode) !== characterHasCoin(nextChar, next.mode)) return false;
  if (prevChar.unmaskedSpyIndex !== nextChar.unmaskedSpyIndex) return false;
  if ((prevChar as any).isArrested !== (nextChar as any).isArrested) return false;
  if ((prevChar as any).role !== (nextChar as any).role) return false;

  return true;
};

const CharacterCardComponent = ({
  mode,
  character,
  isSelected,
  neighborRole,
  neighborHighlightColor,
  isUniformedOfficer,
  isTargetVictim,
  radarRingColor,
  onClick,
  isRadarCenter,
  isError = false,
  isMyCharacter = false,
  isPVP = false,
  myRoleColor,
  isLastRobbed = false,
}: CharacterCardProps) => {
    const [imgError, setImgError] = useState(false);
    const isDead = !character.isAlive;
    const isExonerated = character.isExonerated && !isDead;
    const isSecretService = isSecretServiceMode(mode);
    const hasCoin = characterHasCoin(character, mode);
    const spyMeta = character.unmaskedSpyIndex !== undefined ? SPY_COLORS[character.unmaskedSpyIndex] : null;

    if (character.status === "HIDDEN") {
      return (
        <motion.div
          onClick={onClick}
          className="relative w-full aspect-square rounded-md sm:rounded-xl p-1 flex flex-col justify-between items-center text-center border border-white/15 bg-black/60 hover:border-cyan-400/50 hover:bg-zinc-900/80 transition-all select-none cursor-pointer group shadow-inner"
        >
          <span className="text-[8px] font-mono text-zinc-600 self-start group-hover:text-cyan-400 transition-colors">
            #{character.id.replace("c", "")}
          </span>
          <div className="w-6 h-6 rounded-md bg-zinc-900/60 border border-white/10 flex items-center justify-center text-zinc-500 group-hover:text-cyan-400 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </div>
          <span className="text-[7.5px] font-mono tracking-widest text-zinc-500 group-hover:text-zinc-200 uppercase">
            РАЗВЕДКА
          </span>
        </motion.div>
      );
    }

    if (character.cellType === "CLUE") {
      return (
        <motion.div
          onClick={onClick}
          className="relative w-full aspect-square rounded-md sm:rounded-xl p-1 flex flex-col justify-between border border-amber-500/40 bg-zinc-950/90 text-amber-300 select-none shadow-[0_0_10px_rgba(245,158,11,0.15)] cursor-pointer"
        >
          <div className="flex justify-between items-center text-[7.5px] font-mono text-amber-500/80">
            <span>#{character.id.replace("clue_", "")}</span>
            <span className="bg-amber-950/60 border border-amber-500/40 px-1 rounded uppercase font-black">УЛИКА</span>
          </div>
          <div className="my-auto text-[9px] font-bold text-zinc-100 line-clamp-2 leading-tight">
            {character.name}
          </div>
          <div className="h-0.5 w-full bg-amber-500/30 rounded-full" />
        </motion.div>
      );
    }

    if (character.cellType === "EMPTY") {
      return (
        <motion.div
          onClick={onClick}
          className="relative w-full aspect-square rounded-md sm:rounded-xl p-1 flex flex-col justify-between items-center text-center border border-zinc-800 bg-zinc-950/40 text-zinc-600 select-none opacity-60"
        >
          <span className="text-[7.5px] font-mono text-zinc-600 self-start">ПУСТО</span>
          <div className="text-zinc-700 font-mono text-xs">✕</div>
          <span className="text-[7px] font-mono text-zinc-600 uppercase">СЕКТОР</span>
        </motion.div>
      );
    }

    return (
      <motion.div
        onClick={onClick}
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        animate={
          isError
            ? { x: [-8, 8, -5, 5, 0] }
            : {}
        }
        transition={{ duration: 0.4 }}
        className={`relative w-full aspect-square rounded-md sm:rounded-xl p-0.5 sm:p-1.5 flex flex-col justify-between border select-none transition-all duration-200 cursor-pointer overflow-hidden ${
          isError
            ? "bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/70 shadow-[0_0_20px_rgba(244,63,94,0.6)] z-30"
            : isDead
              ? isSecretService
                ? "bg-zinc-950/95 border-red-900/40 opacity-70 shadow-inner"
                : "bg-zinc-950/95 border-zinc-900 opacity-50 shadow-inner"
              : isTargetVictim
                ? "bg-red-950/40 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                : (character as any).isArrested
                  ? "bg-blue-950/80 border-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-20"
                  : isExonerated
                    ? "bg-gradient-to-b from-blue-950/50 to-zinc-900 border-zinc-800 shadow-[0_0_10px_rgba(59,130,246,0.25)]"
                    : "bg-gradient-to-b from-white/[0.08] via-zinc-900/90 to-black/95 border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
        } ${
          neighborHighlightColor ? `${neighborHighlightColor} z-10` : ""
        } ${
          isSelected
            ? `${neighborHighlightColor ? "" : "border-white "}ring-2 ring-white z-30 scale-[0.96]`
            : ""
        }`}
      >
        {/* Тонкий стеклянный блик на верхней кромке карточки (Glassmorphism Neo-Noir) */}
        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white/[0.1] to-transparent pointer-events-none rounded-t-md sm:rounded-t-xl z-[1]" />

        {neighborRole && (
          <div
            className={`absolute inset-0 rounded-md sm:rounded-xl pointer-events-none z-10 border-2 ${
              neighborRole === "red"
                ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                : neighborRole === "blue"
                  ? "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  : "border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
            }`}
          />
        )}

        {!isDead && (() => {
          const imageAsset = characterImages[`../assets/characters/${character.id}.webp`]?.default;
          return (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              {imageAsset && !imgError ? (
                <img
                  src={imageAsset}
                  alt={character.name}
                  className="w-full h-full object-cover rounded-md opacity-75 grayscale contrast-125 pointer-events-none"
                  onError={() => setImgError(true)}
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-40">
                  {renderSilhouette(character.id)}
                </div>
              )}
            </div>
          );
        })()}

        <div className="flex items-center justify-between gap-1 z-10 w-full leading-none px-1 pt-1">
          <div className="flex items-center gap-1 shrink-0 min-w-0">
            <span
              className={`text-[9px] sm:text-[10px] md:text-xs font-mono font-bold drop-shadow shrink-0 ${
                isDead
                  ? "text-zinc-600 line-through"
                  : isExonerated
                    ? "text-blue-400"
                    : "text-zinc-300"
              }`}
            >
              {`#${character.id.replace("c", "").padStart(2, "0")}`}
            </span>
            {isMyCharacter && !isDead && !isPVP && (() => {
              const isRed = myRoleColor ? myRoleColor === "red" : (mode === "SKHVATKA" || mode === "MANIAC_VS_OPERATIVE" || mode === "THIEF_HUNT");
              return (
                <span className={`text-[7.5px] md:text-[9px] font-black uppercase px-1 md:px-1.5 py-[1px] md:py-0.5 rounded tracking-wider shadow-sm shrink-0 ${
                  isRed
                    ? "text-red-400 bg-red-950/90 border border-red-500/70 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    : "text-blue-300 bg-blue-950/90 border border-blue-500/70 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                }`}>
                  ВЫ
                </span>
              );
            })()}
          </div>

          <div className="flex items-center gap-1 leading-none shrink-0">
            {isTargetVictim && !isDead && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-red-500 animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>
            )}
            {isUniformedOfficer && !isDead && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-blue-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M8 11l4 3 4-3"/></svg>
            )}
            {isRadarCenter && !isDead && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-blue-400 animate-pulse drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]"><path d="M12 20v-8"/><path d="M8 12a4 4 0 0 1 8 0"/><path d="M4 12a8 8 0 0 1 16 0"/></svg>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isDead && (
            <div className="absolute top-[34%] inset-x-0 -translate-y-1/2 flex items-center justify-center z-20 pointer-events-none px-1">
              <motion.div
                key={`dead_stamp_${character.id}`}
                style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
                initial={{ opacity: 0, scale: 0.6, rotate: -25 }}
                animate={{ opacity: 1, scale: 1, rotate: -12 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className={`border whitespace-nowrap font-display font-black uppercase tracking-wider text-[8px] sm:text-[9px] md:text-xs px-1.5 py-0.5 rounded-sm select-none backdrop-blur-sm text-center ${
                  spyMeta
                    ? `border-${spyMeta.border} bg-zinc-950/95 text-${spyMeta.text} shadow-[0_0_15px_rgba(239,68,68,0.5)]`
                    : isSecretService || character.unmaskedSpyIndex !== undefined
                      ? "border-red-600 bg-red-950/90 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                      : (character as any).isArrested
                        ? "border border-blue-500/80 bg-blue-950/95 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                        : "border-red-600 bg-red-950/90 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                }`}>
                  {isSecretService || character.unmaskedSpyIndex !== undefined
                    ? (spyMeta ? `РАСКРЫТ: ${spyMeta.name.toUpperCase()}` : "РАСКРЫТ")
                    : (character as any).isArrested
                      ? "АРЕСТОВАН"
                      : "УБИТ"}
                </div>
              </motion.div>
            </div>
          )}

          {isExonerated && !isDead && !(character as any).isArrested && (
            <div className="absolute top-[34%] inset-x-0 -translate-y-1/2 flex items-center justify-center z-20 pointer-events-none px-1">
              <motion.div
                key={`alibi_stamp_${character.id}`}
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

          {(character as any).isArrested && !isDead && (
            <div className="absolute top-[34%] inset-x-0 -translate-y-1/2 flex items-center justify-center z-20 pointer-events-none px-1">
              <motion.div
                key={`arrest_stamp_${character.id}`}
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

        <AnimatePresence>
          {isThiefHuntMode(mode) && character.isAlive && !character.isRobbed && (
            <motion.div
              key="active-coin-edge"
              style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{
                scale: [1, 1.3, 0],
                opacity: [1, 0.8, 0],
                transition: { duration: 0.25, ease: "easeOut" },
              }}
              className="absolute bottom-0 inset-x-0 h-[2px] z-20 pointer-events-none bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_rgba(245,158,11,0.7)]"
            />
          )}
        </AnimatePresence>

        {character.isRobbed && (
          <div
            title="Ограблен"
            className="absolute bottom-0 inset-x-0 h-[2px] z-20 pointer-events-none bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent"
          />
        )}
        {false && (
          <div className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 z-20 pointer-events-none flex items-center">
            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-zinc-950/85 backdrop-blur-sm border border-zinc-700/50 shadow-sm text-zinc-500" title="Ограблен">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" />
              </svg>
            </span>
          </div>
        )}

        {hasCoin && !isDead && (
          <div
            data-testid="coin-indicator"
            title="Золотая монета"
            className="absolute bottom-1 right-1 z-20 pointer-events-none flex items-center justify-center"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] filter"
              fill="none"
            >
              <circle cx="12" cy="12" r="9" fill="#EAB308" stroke="#FEF08A" strokeWidth="1.5" />
              <path d="M12 7v10M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" stroke="#713F12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        <div className="absolute bottom-0.5 inset-x-0.5 z-10 flex items-end justify-center pointer-events-none transform-none">
          <span
            title={character.name}
            className={`block w-full text-[7.5px] sm:text-[8.5px] md:text-[11px] font-bold text-zinc-200 leading-[1.05] md:leading-tight tracking-tight uppercase text-center px-1 py-0.5 rounded-sm bg-black/60 backdrop-blur-[1px] transform-none break-normal whitespace-pre-line hyphens-none ${
              hasCoin && !isDead ? "pr-4 sm:pr-5" : ""
            } ${
              isDead
                ? isSecretService
                  ? "text-red-400 line-through"
                  : "text-zinc-400 line-through"
                : isTargetVictim
                  ? "text-red-300"
                  : isExonerated
                    ? "text-blue-200"
                    : ""
            }`}
          >
            {character.name.includes(" ") ? character.name.replace(" ", "\n") : character.name}
          </span>
        </div>
      </motion.div>
    );
};

export const CharacterCard = memo(CharacterCardComponent, areCharacterCardPropsEqual);
