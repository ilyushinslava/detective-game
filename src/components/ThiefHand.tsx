import React from "react";
import { ALL_CHARACTERS } from "../constants/characters";

export interface ThiefHandProps {
  handIds: string[];
  isThiefTurn: boolean;
  onFastDisguise: (id: string) => void;
  characterImages?: Record<string, { default: string }>;
}

export const ThiefHand: React.FC<ThiefHandProps> = ({
  handIds,
  isThiefTurn,
  onFastDisguise,
  characterImages,
}) => {
  const canView = isThiefTurn;

  // Безопасный список карт
  const validCards = (handIds ?? []).map((id) => {
    const char = ALL_CHARACTERS.find((c) => c.id === id);
    const num = id?.replace("c", "").padStart(2, "0") ?? "--";
    return {
      id,
      name: char?.name ?? id ?? "Неизвестный",
      num,
    };
  });

  return (
    <div
      data-testid="thief-hand"
      className="w-full neo-card border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black uppercase tracking-widest text-red-400">
          Маски вора ({validCards.length} карт)
        </span>
        {!canView && (
          <span
            data-testid="thief-closed-badge"
            className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400 bg-zinc-900/90 px-2 py-1 rounded-lg border border-white/10"
          >
            Закрыто (чужой ход)
          </span>
        )}
      </div>

      {canView && (
        <div className="pt-2 border-t border-white/10">
          <div className="text-[10px] text-zinc-400 mb-3 font-mono uppercase tracking-wider">
            Нажмите на карту, чтобы применить действие «Конспирация»:
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {validCards.map((card) => {
              const img = characterImages
                ? characterImages[`./assets/characters/${card.id}.webp`]?.default ||
                  characterImages[`../assets/characters/${card.id}.webp`]?.default
                : null;
              return (
                <button
                  type="button"
                  key={card.id}
                  data-testid={`thief-mask-card-${card.id}`}
                  onClick={() => onFastDisguise(card.id)}
                  className="relative overflow-hidden p-3 rounded-xl bg-zinc-900/80 hover:bg-red-950/40 border border-white/10 hover:border-red-500/70 text-red-400 cursor-pointer transition-all flex flex-col justify-between min-h-[90px] shadow-md select-none group active:scale-[0.98] text-left"
                >
                  {img && (
                    <img
                      src={img}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 transition pointer-events-none"
                    />
                  )}
                  <div className="relative z-10 flex items-center justify-between text-[8px] font-mono text-zinc-400 w-full">
                    <span>#{card.num}</span>
                    <span className="text-red-300 font-black uppercase tracking-wider text-[7px] px-1.5 py-0.5 bg-red-950/80 rounded-md border border-red-500/30">
                      Маска
                    </span>
                  </div>

                  <div className="relative z-10 text-xs font-black text-zinc-100 group-hover:text-red-200 uppercase tracking-wider my-1.5 break-words">
                    {card.name}
                  </div>

                  <div className="relative z-10 text-[9px] text-zinc-400 group-hover:text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>Сменить маску</span>
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
