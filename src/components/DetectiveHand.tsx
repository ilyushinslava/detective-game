import React from "react";
import type { Character } from "../types/game";

export interface DetectiveHandProps {
  handIds: string[];
  allCharacters?: Character[];
  isDetectiveTurn: boolean;
  onExonerateFromHand: (id: string) => void;
  characterImages?: Record<string, { default: string }>;
}

export const DetectiveHand: React.FC<DetectiveHandProps> = ({
  handIds,
  allCharacters = [],
  isDetectiveTurn,
  onExonerateFromHand,
  characterImages,
}) => {
  const canView = isDetectiveTurn;
  const safeList = handIds ?? [];

  return (
    <div
      data-testid="detective-hand"
      className="w-full neo-card border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black uppercase tracking-widest text-blue-400">
          Досье доказательств ({safeList.length} карт)
        </span>
        {!canView && (
          <span
            data-testid="dossier-closed-badge"
            className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400 bg-zinc-900/90 px-2 py-1 rounded-lg border border-white/10"
          >
            Закрыто (чужой ход)
          </span>
        )}
      </div>

      {canView && (
        <div className="pt-2 border-t border-white/10">
          <div className="text-[10px] text-zinc-400 mb-3 font-mono uppercase tracking-wider">
            Нажмите на карту подозреваемого для проверки алиби:
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {safeList.map((id) => {
              const char = allCharacters.find((c) => c.id === id);
              const img = characterImages
                ? characterImages[`./assets/characters/${id}.webp`]?.default ||
                  characterImages[`../assets/characters/${id}.webp`]?.default
                : null;
              return (
                <button
                  type="button"
                  key={id}
                  data-testid={`dossier-card-${id}`}
                  onClick={() => onExonerateFromHand(id)}
                  className="relative overflow-hidden p-3 rounded-xl bg-zinc-900/80 hover:bg-blue-950/40 border border-white/10 hover:border-blue-500/70 text-blue-400 cursor-pointer transition-all flex flex-col justify-between min-h-[90px] shadow-md select-none group active:scale-[0.98] text-left"
                >
                  {img && (
                    <img
                      src={img}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 transition pointer-events-none"
                    />
                  )}
                  <div className="relative z-10 flex items-center justify-between text-[8px] font-mono text-zinc-400 w-full">
                    <span>#{id.replace("c", "").padStart(2, "0")}</span>
                    <span className="text-blue-300 font-black uppercase tracking-wider text-[7px] px-1.5 py-0.5 bg-blue-950/80 rounded-md border border-blue-500/30">
                      Алиби
                    </span>
                  </div>

                  <div className="relative z-10 text-xs font-black text-zinc-100 group-hover:text-blue-200 uppercase tracking-wider my-1.5 break-words">
                    {char?.name ?? id}
                  </div>

                  <div className="relative z-10 text-[9px] text-zinc-400 group-hover:text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>Проверить алиби</span>
                    <span>➔</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
