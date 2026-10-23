import type { Character } from "../types/game";

interface DetectiveHandProps {
  handIds: string[];
  allCharacters: Character[];
  isDetectiveTurn: boolean;
  onExonerateFromHand: (id: string) => void;
  characterImages?: Record<string, { default: string }>;
}

export const DetectiveHand = ({
  handIds,
  allCharacters,
  isDetectiveTurn,
  onExonerateFromHand,
  characterImages,
}: DetectiveHandProps) => {
  const canView = isDetectiveTurn;

  return (
    <div className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
          Досье доказательств ({handIds.length} карт)
        </span>
        {!canView && (
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-white/5">
            Закрыто (чужой ход)
          </span>
        )}
      </div>

      {canView && (
        <div className="pt-2 border-t border-white/5">
          <div className="text-[9px] text-zinc-500 mb-3 font-mono uppercase tracking-wider">
            Нажмите на карту подозреваемого для проверки алиби:
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {handIds.map((id) => {
              const char = allCharacters.find((c) => c.id === id);
              const img = characterImages
                ? characterImages[`./assets/characters/${id}.webp`]?.default ||
                  characterImages[`../assets/characters/${id}.webp`]?.default
                : null;
              return (
                <div
                  key={id}
                  onClick={() => onExonerateFromHand(id)}
                  className="relative overflow-hidden p-3 rounded-xl bg-zinc-900/60 hover:bg-blue-950/30 border border-white/10 hover:border-blue-500/60 text-blue-400 cursor-pointer transition-all flex flex-col justify-between min-h-[85px] shadow-md select-none group active:scale-98"
                >
                  {img && (
                    <img
                      src={img}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
                    />
                  )}
                  <div className="relative z-10 flex items-center justify-between text-[8px] font-mono text-zinc-400">
                    <span>#{id.replace("c", "").padStart(2, "0")}</span>
                    <span className="text-blue-400 font-black uppercase tracking-wider text-[7px] px-1 py-0.5 bg-blue-950/60 rounded border border-blue-800/50">
                      Алиби
                    </span>
                  </div>

                  <div className="relative z-10 text-xs font-black text-zinc-200 group-hover:text-blue-200 uppercase tracking-wider my-1 truncate">
                    {char?.name ?? id}
                  </div>

                  <div className="relative z-10 text-[9px] text-zinc-400 group-hover:text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>Проверить</span>
                    <span>➔</span>
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