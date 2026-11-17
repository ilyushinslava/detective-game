import React from "react";

interface DevModalsSectionProps {
  onTriggerIntro?: () => void;
  onTriggerRestartRequest?: () => void;
  onTriggerDisguiseModal?: () => void;
  onTriggerCaughtSpyModal?: () => void;
  onTriggerOpponentLeft?: () => void;
  onTriggerGameOver?: () => void;
  onClose: () => void;
}

export const DevModalsSection: React.FC<DevModalsSectionProps> = ({
  onTriggerIntro,
  onTriggerRestartRequest,
  onTriggerDisguiseModal,
  onTriggerCaughtSpyModal,
  onTriggerOpponentLeft,
  onTriggerGameOver,
  onClose,
}) => {
  return (
    <div className="p-3 pt-0 grid grid-cols-2 gap-2 text-[10px]">
      {onTriggerIntro && (
        <button
          onClick={() => { onTriggerIntro(); onClose(); }}
          className="py-2 px-2.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-200 font-bold text-left transition cursor-pointer"
        >
          👁️ Интро ролей
        </button>
      )}
      {onTriggerRestartRequest && (
        <button
          onClick={() => { onTriggerRestartRequest(); onClose(); }}
          className="py-2 px-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-200 font-bold text-left transition cursor-pointer"
        >
          🤝 Запрос реванша
        </button>
      )}
      {onTriggerDisguiseModal && (
        <button
          onClick={() => { onTriggerDisguiseModal(); onClose(); }}
          className="py-2 px-2.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-200 font-bold text-left transition cursor-pointer"
        >
          🎭 Смена лица
        </button>
      )}
      {onTriggerCaughtSpyModal && (
        <button
          onClick={() => { onTriggerCaughtSpyModal(); onClose(); }}
          className="py-2 px-2.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-200 font-bold text-left transition cursor-pointer"
        >
          🕵️ Раскрытие шпиона
        </button>
      )}
      {onTriggerOpponentLeft && (
        <button
          onClick={() => { onTriggerOpponentLeft(); onClose(); }}
          className="py-2 px-2.5 bg-red-950/60 hover:bg-red-900/80 border border-red-700/50 rounded-xl text-red-200 font-bold text-left transition cursor-pointer"
        >
          🚪 Уход соперника
        </button>
      )}
      {onTriggerGameOver && (
        <button
          onClick={() => { onTriggerGameOver(); onClose(); }}
          className="py-2 px-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 rounded-xl text-emerald-200 font-bold text-left transition cursor-pointer"
        >
          🏆 Окно финала (GameOver)
        </button>
      )}
    </div>
  );
};
