import { memo } from "react";
import { motion } from "framer-motion";
import type { Character } from "../types/game";

export interface CharacterCardProps {
  character: Character;
  isSelected: boolean;
  isKillerAdjacent: boolean;
  isDetectiveAdjacent: boolean;
  showKillerHint: boolean;
  showDetectiveHint: boolean;
  isUniformedOfficer?: boolean;
  isTargetVictim?: boolean;
  radarRingColor?: string | null;
  isRadarCenter?: boolean;
  isError?: boolean;
  onClick: () => void;
}

// 4 векторных силуэта в нуарном стиле для фона карточки
const renderSilhouette = (id: string) => {
  const num = parseInt(id.replace("c", ""), 10) || 0;
  const variant = num % 4;

  switch (variant) {
    case 0:
      // Детектив /
      return (
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full opacity-20 text-zinc-400 fill-current pointer-events-none"
        >
          <path d="M12 48 C28 42, 92 42, 108 48 C98 43, 85 41, 60 41 C35 41, 22 43, 12 48 Z" />
          <path d="M34 43 C33 28, 38 18, 52 17 C58 14, 68 17, 72 20 C78 24, 82 32, 84 43 C74 40, 44 40, 34 43 Z" />
          <path
            d="M36 38 C48 36, 70 36, 82 38 L83 42 C71 40, 47 40, 35 42 Z"
            opacity="0.6"
          />
          <path
            d="M43 46 C43 58, 48 68, 60 70 C72 68, 77 58, 77 46 Z"
            opacity="0.5"
          />
          <path d="M30 110 L44 76 L52 86 L60 72 L68 86 L76 76 L90 110 Z" />
          <path d="M48 86 L60 110 L72 86 L60 88 Z" opacity="0.7" />
        </svg>
      );
    case 1:
      // Ретро-прическа / женский силуэт
      return (
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full opacity-20 text-zinc-400 fill-current pointer-events-none"
        >
          <path d="M36 46 C32 26, 42 16, 60 16 C78 16, 88 26, 84 46 C88 56, 84 72, 80 76 C76 68, 78 54, 76 46 C72 32, 48 32, 44 46 C42 54, 44 68, 40 76 C36 72, 32 56, 36 46 Z" />
          <path
            d="M45 42 C45 58, 50 68, 60 70 C70 68, 75 58, 75 42 Z"
            opacity="0.5"
          />
          <path d="M26 110 C28 88, 42 80, 52 80 C56 86, 64 86, 68 80 C78 80, 92 88, 94 110 Z" />
          <path d="M54 70 L54 82 L66 82 L66 70 Z" opacity="0.6" />
        </svg>
      );
    case 2:
      // Строгий агент в костюме с пробором
      return (
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full opacity-20 text-zinc-400 fill-current pointer-events-none"
        >
          <path d="M38 34 C38 20, 48 16, 62 16 C76 16, 82 22, 82 34 C76 26, 66 24, 58 26 C48 28, 42 30, 38 34 Z" />
          <path
            d="M42 32 C42 52, 46 66, 60 68 C74 66, 78 52, 78 32 Z"
            opacity="0.5"
          />
          <path d="M22 110 L38 72 L50 78 L52 110 Z" />
          <path d="M98 110 L82 72 L70 78 L68 110 Z" />
          <path d="M56 74 L64 74 L62 98 L60 104 L58 98 Z" opacity="0.8" />
        </svg>
      );
    case 3:
    default:
      // Кепка газетчика / воротник
      return (
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full opacity-20 text-zinc-400 fill-current pointer-events-none"
        >
          <path d="M30 38 C32 20, 50 14, 66 18 C78 22, 88 30, 88 40 C72 36, 48 36, 30 38 Z" />
          <path
            d="M26 40 C38 38, 76 38, 88 44 C74 42, 40 42, 26 40 Z"
            opacity="0.7"
          />
          <path
            d="M43 42 C43 56, 48 66, 59 67 C70 66, 75 56, 75 42 Z"
            opacity="0.5"
          />
          <path d="M24 110 C26 86, 36 76, 46 72 L52 82 L60 74 L68 82 L74 72 C84 76, 94 86, 96 110 Z" />
        </svg>
      );
  }
};

export const CharacterCard = memo(
  ({
    character,
    isSelected,
    isKillerAdjacent,
    isDetectiveAdjacent,
    showKillerHint,
    showDetectiveHint,
    isUniformedOfficer,
    isTargetVictim,
    radarRingColor,
    onClick,
    isRadarCenter,
    isError = false,
  }: CharacterCardProps) => {
    const isDead = !character.isAlive;
    const isExonerated = character.isExonerated && !isDead;

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
                ? "bg-zinc-950/95 border-zinc-900 opacity-50 shadow-inner"
                : isTargetVictim
                  ? "bg-red-950/30 border-red-600 shadow-[0_0_12px_rgba(220,38,38,0.35)] animate-pulse"
                  : isExonerated
                    ? "bg-gradient-to-b from-blue-950/50 to-zinc-900 border-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.25)]"
                    : "bg-zinc-900/95 border-zinc-800 hover:border-zinc-700 shadow-sm"
        } ${
          isSelected
            ? "ring-1 sm:ring-2 ring-amber-400 border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.4)] scale-[1.02] z-20"
            : ""
        } ${
          showKillerHint && isKillerAdjacent
            ? "ring-1 ring-red-500/80 border-red-500"
            : ""
        } ${
          showDetectiveHint && isDetectiveAdjacent
            ? "ring-1 ring-blue-500/80 border-blue-500"
            : ""
        } ${
          isRadarCenter && radarRingColor
            ? `ring-2 ring-offset-1 ring-offset-zinc-950 ${radarRingColor} shadow-[0_0_15px_currentColor] z-10`
            : radarRingColor
              ? `ring-1 ${radarRingColor} opacity-70 animate-pulse`
              : ""
        }`}
      >
        {/* Фоновый силуэт */}
        {!character.isVault && !isDead && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            {renderSilhouette(character.id)}
          </div>
        )}

        {/* Номер дела и иконки */}
        <div className="flex items-center justify-between gap-0.5 z-10 w-full leading-none px-0.5">
          <span
            className={`text-[7px] sm:text-[9px] font-mono font-bold tracking-tight ${
              isDead
                ? "text-zinc-600 line-through"
                : isExonerated
                  ? "text-blue-400"
                  : "text-zinc-500"
            }`}
          >
            {character.isVault
              ? "СЕЙФ"
              : `#${character.id.replace("c", "").padStart(2, "0")}`}
          </span>

          <div className="flex items-center gap-0.5 text-[8px] sm:text-[10px] leading-none">
            {isDead && (
              <span className="text-red-500 font-bold" title="Ликвидирован">
                ☠
              </span>
            )}
            {isTargetVictim && !isDead && (
              <span className="text-red-400 font-bold" title="Текущая цель">
                🎯
              </span>
            )}
            {isUniformedOfficer && !isDead && (
              <span title="Офицер в форме">👮</span>
            )}
            {isRadarCenter && !isDead && (
              <span
                className="text-zinc-100 font-bold animate-bounce"
                title="Центр допроса"
              >
                📡
              </span>
            )}
            {character.isVault && (
              <span>
                {character.isVaultCracked
                  ? "🔓"
                  : character.isVaultLocked
                    ? "🔒"
                    : "🏦"}
              </span>
            )}
            {character.isShielded && <span title="Бронежилет">🛡️</span>}
            {character.hasBomb && <span title="Мина">💣</span>}
            {character.isRobbed && <span title="Ограблен">💰</span>}
          </div>
        </div>

        {/* Имя */}
        <div className="text-center my-auto px-0.5 z-10 w-full flex items-center justify-center">
          <span
            className={`block text-[8.5px] xs:text-[9.5px] sm:text-xs font-bold leading-[1.1] tracking-tight break-normal whitespace-normal hyphens-none ${
              isDead
                ? "text-zinc-600 line-through decoration-red-900/70"
                : isTargetVictim
                  ? "text-red-200 font-black"
                  : isExonerated
                    ? "text-blue-100 font-extrabold"
                    : "text-zinc-100"
            }`}
          >
            {character.name}
          </span>
        </div>

        {/* Нижний бейдж */}
        <div className="z-10 flex items-center justify-center w-full leading-none pb-0.5">
          {character.isVault ? (
            <span
              className={`text-[6px] xs:text-[7px] sm:text-[8px] font-mono font-bold tracking-wider px-1 py-0.5 rounded border ${
                character.isVaultCracked
                  ? "text-amber-300 bg-amber-950/70 border-amber-700/60"
                  : character.isVaultLocked
                    ? "text-red-300 bg-red-950/70 border-red-700/60"
                    : "text-zinc-400 bg-zinc-950 border-zinc-800"
              }`}
            >
              {character.isVaultCracked
                ? "ВЗЛОМАН"
                : character.isVaultLocked
                  ? "ТРЕВОГА"
                  : "СЕЙФ"}
            </span>
          ) : isDead ? (
            <span className="text-[5.5px] xs:text-[6.5px] sm:text-[7.5px] font-mono font-bold tracking-wider text-red-400 bg-red-950/60 border border-red-900/60 px-1 py-0.5 rounded">
              МЕРТВ
            </span>
          ) : isTargetVictim ? (
            <span className="text-[5.5px] xs:text-[6.5px] sm:text-[7.5px] font-mono font-bold tracking-wider text-red-200 bg-red-950/90 border border-red-600 px-1 py-0.5 rounded shadow">
              ЦЕЛЬ
            </span>
          ) : isExonerated ? (
            <span className="text-[5.5px] xs:text-[6.5px] sm:text-[7.5px] font-mono font-bold tracking-wider text-blue-300 bg-blue-950/80 border border-blue-600/70 px-1 py-0.5 rounded shadow-sm">
              АЛИБИ
            </span>
          ) : (
            <span className="text-[5.5px] xs:text-[6.5px] sm:text-[7.5px] font-mono text-zinc-500 uppercase tracking-tighter">
              ПОДОЗРЕВАЕМЫЙ
            </span>
          )}
        </div>
      </motion.div>
    );
  },
);
