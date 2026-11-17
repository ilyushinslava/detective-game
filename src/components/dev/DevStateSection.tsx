import React from "react";

interface DevStateSectionProps {
  onToggleTurn?: () => void;
  onTogglePlayerRole?: () => void;
  onAddKill?: () => void;
  onTriggerInspectorChoice: () => void;
  onClose: () => void;
}

export const DevStateSection: React.FC<DevStateSectionProps> = ({
  onToggleTurn,
  onTogglePlayerRole,
  onAddKill,
  onTriggerInspectorChoice,
  onClose,
}) => {
  return (
    <div className="p-3 pt-0 flex flex-col gap-2 text-[10px]">
      {onToggleTurn && (
        <button
          onClick={onToggleTurn}
          className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-200 font-bold text-left transition cursor-pointer"
        >
          🔄 Сменить чей ход (Killer ⇄ Detective)
        </button>
      )}
      {onTogglePlayerRole && (
        <button
          onClick={onTogglePlayerRole}
          className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-200 font-bold text-left transition cursor-pointer"
        >
          🔄 Сменить свою роль (KILLER ⇄ DETECTIVE)
        </button>
      )}
      {onAddKill && (
        <button
          onClick={onAddKill}
          className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-200 font-bold text-left transition cursor-pointer"
        >
          🎯 +1 к убийствам / кражам
        </button>
      )}
      <button
        onClick={() => { onTriggerInspectorChoice(); onClose(); }}
        className="w-full py-2 px-3 bg-blue-950/60 hover:bg-blue-900/80 border border-blue-700/50 rounded-xl text-blue-200 font-bold text-left transition cursor-pointer"
      >
        🔍 Открыть выбор роли Инспектора (4 карты)
      </button>
    </div>
  );
};
