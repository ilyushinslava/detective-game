import { ALL_CHARACTERS } from "../constants/characters";

interface ThiefHandProps {
  handIds: string[];
  isThiefTurn: boolean;
  onFastDisguise: (id: string) => void;
  characterImages?: Record<string, { default: string }>;
}

export const ThiefHand = ({
  handIds,
  isThiefTurn,
  onFastDisguise,
  characterImages,
}: ThiefHandProps) => {
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
    <div className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-red-400">
            Маски вора ({validCards.length} карт)
          </span>
        </div>
        {!canView && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
            Закрыто (чужой ход)
          </span>
        )}
      </div>

      {canView && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80">
          <div className="text-[10px] text-zinc-400 mb-2 font-mono">
            Нажмите на карту, чтобы применить действие «Конспирация»:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {validCards.map((card) => {
              const img = characterImages
                ? characterImages[`./assets/characters/${card.id}.webp`]?.default ||
                  characterImages[`../assets/characters/${card.id}.webp`]?.default
                : null;
              return (
                <div
                  key={card.id}
                  onClick={() => onFastDisguise(card.id)}
                  className="relative overflow-hidden p-3 rounded-xl bg-zinc-900/60 hover:bg-red-950/30 border border-white/10 hover:border-red-500/60 cursor-pointer transition flex flex-col justify-between min-h-[85px] shadow select-none group"
                >
                  {img && (
                    <img
                      src={img}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
                    />
                  )}
                  <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                    <span>#{card.num}</span>
                    <span className="text-red-400 font-bold uppercase tracking-wider text-[8px] px-1.5 py-0.5 bg-red-950/80 rounded border border-red-800/60">
                      Маска
                    </span>
                  </div>

                  <div className="relative z-10 text-xs font-black text-zinc-100 group-hover:text-red-200 leading-tight my-1 break-words">
                    {card.name}
                  </div>

                  <div className="relative z-10 text-[9px] text-zinc-400 group-hover:text-zinc-200 font-semibold">
                    Конспирация →
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
