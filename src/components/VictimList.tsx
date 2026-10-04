import type { Character } from "../types/game";

interface VictimListProps {
  victimIds: string[];
  allCharacters: Character[];
}

export const VictimList = ({ victimIds, allCharacters }: VictimListProps) => {
  if (!victimIds || victimIds.length === 0) return null;

  const activeTargetId = victimIds[0];
  const activeChar = allCharacters.find((c) => c.id === activeTargetId);
  const remainingCount = victimIds.length - 1;

  return (
    <div className="w-full bg-zinc-900/90 border border-red-950/80 rounded-xl p-3 shadow-xl mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          Текущая цель маньяка
        </span>
        <span className="text-[9px] font-mono text-zinc-500 uppercase">
          Осталось в списке: {remainingCount}
        </span>
      </div>

      <div className="p-3 rounded-lg bg-zinc-950 border border-red-900/40 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono text-red-500/70 block mb-0.5">
            #{activeTargetId.replace("c", "").padStart(2, "0")}
          </span>
          <span className="text-sm font-black text-zinc-200">
            {activeChar?.name ?? activeTargetId}
          </span>
        </div>
        <div className="text-[9px] font-bold text-red-900/80 uppercase border border-red-900/30 px-2 py-1 rounded">
          Открытая жертва
        </div>
      </div>
    </div>
  );
};
