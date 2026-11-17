import React from "react";

interface DevEconomySectionProps {
  onAddCash: (amount: number) => void;
  onResetCash?: () => void;
  onClearSession?: () => void;
  onResetToMenu: () => void;
  onClose: () => void;
}

export const DevEconomySection: React.FC<DevEconomySectionProps> = ({
  onAddCash,
  onResetCash,
  onClearSession,
  onResetToMenu,
  onClose,
}) => {
  return (
    <div className="p-3 pt-0 flex flex-col gap-2 text-[10px]">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onAddCash(1000)}
          className="py-2 px-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 rounded-xl text-emerald-200 font-bold text-left transition cursor-pointer"
        >
          💰 +1,000 CR
        </button>
        <button
          onClick={() => onAddCash(10000)}
          className="py-2 px-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 rounded-xl text-emerald-200 font-bold text-left transition cursor-pointer"
        >
          💎 +10,000 CR
        </button>
      </div>
      {onResetCash && (
        <button
          onClick={onResetCash}
          className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-300 font-bold text-left transition cursor-pointer"
        >
          🪙 Обнулить баланс CR
        </button>
      )}
      {onClearSession && (
        <button
          onClick={onClearSession}
          className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-300 font-bold text-left transition cursor-pointer"
        >
          🧹 Сброс сессии + F5
        </button>
      )}
      <button
        onClick={() => { onResetToMenu(); onClose(); }}
        className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-zinc-300 font-bold text-left transition cursor-pointer"
      >
        🏠 Сброс в главное меню
      </button>
    </div>
  );
};
