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
    <div className="w-full bg-zinc-950 border border-red-900/50 rounded-lg px-2.5 py-1.5 shadow-md mb-2 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
        <span className="text-[9px] font-black uppercase tracking-wider text-red-400 shrink-0">
          Цель:
        </span>
        <span className="text-xs font-black text-zinc-100 truncate">
          {activeChar?.name ?? activeTargetId}
        </span>
        <span className="text-[9px] font-mono text-red-500/80 shrink-0">
          (#{activeTargetId.replace("c", "").padStart(2, "0")})
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className="text-[8.5px] font-mono text-zinc-400 uppercase">
          Осталось: <b className="text-zinc-200">{remainingCount}</b>
        </span>
      </div>
    </div>
  );
};
