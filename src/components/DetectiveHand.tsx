import type { Character } from "../types/game";

interface DetectiveHandProps {
  handIds: string[];
  allCharacters: Character[];
  isDetectiveTurn: boolean;
  onExonerateFromHand: (id: string) => void;
}

export const DetectiveHand = ({
  handIds,
  allCharacters,
  isDetectiveTurn,
  onExonerateFromHand,
}: DetectiveHandProps) => {
  const canView = isDetectiveTurn;

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-blue-400">
            Досье алиби ({handIds.length} карт)
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
            Нажмите на карту, чтобы применить действие «Проверка алиби»:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {" "}
            {handIds.map((id) => {
              const char = allCharacters.find((c) => c.id === id);
              return (
                <div
                  key={id}
                  onClick={() => onExonerateFromHand(id)}
                  className="p-2.5 rounded-xl bg-zinc-950 hover:bg-blue-950/40 border border-zinc-800 hover:border-blue-500/80 cursor-pointer transition flex flex-col justify-between min-h-[90px] shadow select-none group"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                    <span>#{id}</span>
                    <span className="text-blue-400 font-bold uppercase tracking-wider text-[8px] px-1 py-0.2 bg-blue-950 rounded border border-blue-900">
                      Алиби
                    </span>
                  </div>

                  <div className="text-xs font-black text-zinc-100 group-hover:text-blue-200 leading-tight my-1 break-words">
                    {char?.name ?? id}
                  </div>

                  <div className="text-[9px] text-zinc-400 group-hover:text-zinc-300 font-semibold">
                    Проверка алиби →
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
