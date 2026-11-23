import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Character, type GameModeType } from "../types/game";
import { characterHasCoin, isSecretServiceMode, isThiefHuntMode } from "../constants/gameMeta";
import { renderSilhouette, CharacterStamps, CoinIndicator } from "./character";
import { characterImages } from "../constants/characterImages";

export { renderSilhouette };

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
  if (prevChar.isArrested !== nextChar.isArrested) return false;
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
  onClick,
  isRadarCenter,
  isError = false,
  isMyCharacter = false,
  isPVP = false,
  myRoleColor,
}: CharacterCardProps) => {
  const [imgError, setImgError] = useState(false);
  const isDead = !character.isAlive;
  const isExonerated = character.isExonerated && !isDead;
  const isSecretService = isSecretServiceMode(mode);
  const hasCoin = characterHasCoin(character, mode);
  const isArrested = Boolean(character.isArrested);

  return (
    <motion.div
      onClick={onClick}
      style={{ willChange: "transform", transform: "translateZ(0)" }}
      animate={isError ? { x: [-8, 8, -5, 5, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={`relative w-full aspect-square rounded-md sm:rounded-xl p-0.5 sm:p-1.5 flex flex-col justify-between border select-none transition-all duration-75 active:scale-95 touch-manipulation cursor-pointer overflow-hidden ${
        isError
          ? "bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/70 shadow-[0_0_20px_rgba(244,63,94,0.6)] z-30"
          : isDead
            ? isSecretService
              ? "bg-zinc-950/95 border-red-900/40 opacity-70 shadow-inner"
              : "bg-zinc-950/95 border-zinc-900 opacity-50 shadow-inner"
            : isTargetVictim
              ? "bg-red-950/40 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
              : isArrested
                ? "bg-blue-950/80 border-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-20"
                : isExonerated
                  ? "bg-gradient-to-b from-blue-950/50 to-zinc-900 border-zinc-800 shadow-[0_0_10px_rgba(59,130,246,0.25)]"
                  : "bg-gradient-to-b from-white/[0.08] via-zinc-900/90 to-black/95 border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
      } ${neighborHighlightColor ? `${neighborHighlightColor} z-10` : ""} ${
        isSelected
          ? `${neighborHighlightColor ? "" : "border-white "}ring-2 ring-white z-30 scale-[0.96]`
          : ""
      }`}
    >
      {/* Тонкий стеклянный блик на верхней кромке карточки (Glassmorphism Neo-Noir) */}
      <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white/[0.1] to-transparent pointer-events-none rounded-t-md sm:rounded-t-xl z-[1]" />

      {/* Подсветка зоны 3x3: соседи персонажа */}
      {neighborRole && (
        <div
          data-testid="neighbor-highlight"
          className={`absolute inset-0 rounded-md sm:rounded-xl pointer-events-none z-10 border-2 ${
            neighborRole === "red"
              ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
              : neighborRole === "blue"
                ? "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                : "border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
          }`}
        />
      )}

      {/* Подсветка центра зоны 3x3: секретный персонаж игрока */}
      {isMyCharacter && !isDead && (
        <div
          data-testid="my-character-highlight"
          className={`absolute inset-0 rounded-md sm:rounded-xl pointer-events-none z-20 border-2 ${
            myRoleColor === "red"
              ? "border-red-400 ring-2 ring-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.7)]"
              : "border-blue-400 ring-2 ring-blue-500/70 shadow-[0_0_15px_rgba(59,130,246,0.7)]"
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

      <div className="flex items-center justify-between gap-0.5 z-10 w-full leading-none px-0.5 sm:px-1 pt-0.5 sm:pt-1">
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 min-w-0">
          <span
            className={`text-[8.5px] sm:text-[10px] md:text-xs font-mono font-bold drop-shadow shrink-0 ${
              isDead
                ? "text-zinc-600 line-through"
                : isExonerated
                  ? "text-blue-400"
                  : "text-zinc-300"
            }`}
          >
            {`#${character.id.replace("c", "").padStart(2, "0")}`}
          </span>
          {isMyCharacter && !isDead && (() => {
            const isRed = myRoleColor
              ? myRoleColor === "red"
              : mode === "MANIAC_VS_OPERATIVE" || mode === "THIEF_HUNT";
            return (
              <span
                data-testid="my-character-badge"
                className={`text-[7px] sm:text-[7.5px] md:text-[9px] font-black uppercase px-0.5 sm:px-1 md:px-1.5 py-[0.5px] md:py-0.5 rounded tracking-tight sm:tracking-wider shadow-sm shrink-0 ${
                  isRed
                    ? "text-red-400 bg-red-950/90 border border-red-500/70 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    : "text-blue-300 bg-blue-950/90 border border-blue-500/70 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                }`}
              >
                ВЫ
              </span>
            );
          })()}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 leading-none shrink-0">
          {hasCoin && !isDead && <CoinIndicator />}
          {isTargetVictim && !isDead && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-red-500 animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="22" y1="12" x2="18" y2="12" />
              <line x1="6" y1="12" x2="2" y2="12" />
              <line x1="12" y1="6" x2="12" y2="2" />
              <line x1="12" y1="22" x2="12" y2="18" />
            </svg>
          )}
          {isUniformedOfficer && !isDead && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-blue-400">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M8 11l4 3 4-3" />
            </svg>
          )}
          {isRadarCenter && !isDead && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-blue-400 animate-pulse drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]"
            >
              <path d="M12 20v-8" />
              <path d="M8 12a4 4 0 0 1 8 0" />
              <path d="M4 12a8 8 0 0 1 16 0" />
            </svg>
          )}
        </div>
      </div>

      <CharacterStamps
        isDead={isDead}
        isExonerated={isExonerated}
        isArrested={isArrested}
        characterId={character.id}
        unmaskedSpyIndex={character.unmaskedSpyIndex}
        isSecretService={isSecretService}
      />

      <AnimatePresence>
        {isThiefHuntMode(mode) && character.isAlive && !character.isRobbed && (
          <motion.div
            key="active-coin-edge"
            style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
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

      <div className="absolute bottom-0.5 inset-x-0.5 z-10 flex flex-col items-center justify-end pointer-events-none transform-none">
        <span
          title={character.name}
          className={`w-full text-center flex flex-col items-center text-[7.5px] sm:text-[8.5px] md:text-[9.5px] xl:text-[10.5px] font-bold text-zinc-200 leading-[1.05] md:leading-tight tracking-tighter uppercase px-0.5 sm:px-1 py-0.5 rounded-sm bg-black/60 backdrop-blur-[1px] transform-none break-normal whitespace-pre-line hyphens-none ${
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
