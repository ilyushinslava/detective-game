import React from "react";
import type { Role, GameModeType } from "../../types/game";

interface DevOutcomesSectionProps {
  onForceWin: (winner: Role, mode?: GameModeType) => void;
  onTriggerCluesWin?: () => void;
  onClose: () => void;
}

export const DevOutcomesSection: React.FC<DevOutcomesSectionProps> = ({
  onForceWin,
  onTriggerCluesWin,
  onClose,
}) => {
  return (
    <div className="p-3 pt-0 grid grid-cols-2 gap-2 text-[10px]">
      <button
        onClick={() => { onForceWin("KILLER", "SKHVATKA"); onClose(); }}
        className="py-2 px-2.5 bg-red-950/60 hover:bg-red-900/80 border border-red-700/50 rounded-xl text-red-200 font-bold text-left transition cursor-pointer"
      >
        💀 Схватка: Бандит
      </button>
      <button
        onClick={() => { onForceWin("DETECTIVE", "SKHVATKA"); onClose(); }}
        className="py-2 px-2.5 bg-blue-950/50 hover:bg-blue-900/70 border border-blue-700/40 rounded-xl text-blue-200 font-bold text-left transition cursor-pointer"
      >
        🛡️ Схватка: Инспектор
      </button>
      <button
        onClick={() => { onForceWin("KILLER", "MANIAC_VS_OPERATIVE"); onClose(); }}
        className="py-2 px-2.5 bg-red-950/60 hover:bg-red-900/80 border border-red-700/50 rounded-xl text-red-200 font-bold text-left transition cursor-pointer"
      >
        🩸 Маньяк: Победа
      </button>
      <button
        onClick={() => { onForceWin("DETECTIVE", "MANIAC_VS_OPERATIVE"); onClose(); }}
        className="py-2 px-2.5 bg-blue-950/50 hover:bg-blue-900/70 border border-blue-700/40 rounded-xl text-blue-200 font-bold text-left transition cursor-pointer"
      >
        🚨 Оперативник: Победа
      </button>
      <button
        onClick={() => { onForceWin("KILLER", "THIEF_HUNT"); onClose(); }}
        className="py-2 px-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-200 font-bold text-left transition cursor-pointer"
      >
        💰 Вор: 5 краж
      </button>
      <button
        onClick={() => { onForceWin("DETECTIVE", "THIEF_HUNT"); onClose(); }}
        className="py-2 px-2.5 bg-blue-950/60 hover:bg-blue-900/80 border border-blue-700/50 rounded-xl text-blue-200 font-bold text-left transition cursor-pointer"
      >
        👮 Полиция: Арест
      </button>
      <button
        onClick={() => { onForceWin("KILLER", "SECRET_SERVICE"); onClose(); }}
        className="py-2 px-2.5 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/50 rounded-xl text-purple-200 font-bold text-left transition cursor-pointer"
      >
        🕶️ Служба: Фантом (Восток)
      </button>
      <button
        onClick={() => { onForceWin("DETECTIVE", "SECRET_SERVICE"); onClose(); }}
        className="py-2 px-2.5 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 rounded-xl text-indigo-200 font-bold text-left transition cursor-pointer"
      >
        👤 Служба: Призрак (Запад)
      </button>
      {onTriggerCluesWin && (
        <button
          onClick={() => { onTriggerCluesWin(); onClose(); }}
          className="py-2 px-2.5 col-span-2 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/50 rounded-xl text-amber-200 font-bold text-left transition cursor-pointer"
        >
          🏆 4 Улики: Победа Сыщика (Сетка 5×5)
        </button>
      )}
    </div>
  );
};
