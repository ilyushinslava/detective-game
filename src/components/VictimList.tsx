import type { Character } from '../types/game';

interface VictimListProps {
  victimIds: string[];
  allCharacters: Character[];
}

export const VictimList = ({ victimIds, allCharacters }: VictimListProps) => {
  if (!victimIds || victimIds.length === 0) return null;

  return (
    <div className="w-full bg-zinc-900/90 border border-red-950/80 rounded-xl p-3 shadow-xl mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          Список смертников (Открытые цели маньяка)
        </span>
        <span className="text-[9px] font-mono text-zinc-500 uppercase">
          Маньяк убивает только их
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {victimIds.map((id) => {
          const char = allCharacters.find((c) => c.id === id);
          return (
            <div
              key={id}
              className="p-2 rounded-lg bg-zinc-950 border border-red-900/40 flex flex-col justify-between"
            >
              <span className="text-[9px] font-mono text-red-500/70 block">
                #{id}
              </span>
              <span className="text-xs font-black text-zinc-200 truncate mt-0.5">
                {char?.name ?? id}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
