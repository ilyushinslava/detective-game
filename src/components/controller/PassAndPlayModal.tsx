import React from "react";
import type { Role } from "../../types/game";

export interface PassAndPlayModalProps {
  isOpen: boolean;
  nextRole?: Role;
  nextPlayerName?: string;
  nextPlayerColor?: string;
  onConfirmTakeDevice: () => void;
}

export const PassAndPlayModal: React.FC<PassAndPlayModalProps> = ({
  isOpen,
  nextRole = "DETECTIVE",
  nextPlayerName,
  nextPlayerColor,
  onConfirmTakeDevice,
}) => {
  if (!isOpen) return null;

  const defaultRoleName = nextRole === "KILLER" ? "Бандит" : "Инспектор";
  const defaultRoleColor = nextRole === "KILLER" ? "text-red-500" : "text-blue-400";
  const defaultRoleBorder = nextRole === "KILLER" ? "border-red-500/50" : "border-blue-500/50";

  const displayName = nextPlayerName || defaultRoleName;
  const displayColor = nextPlayerColor || defaultRoleColor;
  const displayBorder = nextPlayerColor
    ? (nextPlayerColor.includes("red") ? "border-red-500/50" : "border-blue-500/50")
    : defaultRoleBorder;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#06070a] p-6 text-zinc-100 select-none animate-fadeIn font-sans">
      {/* Верхний статус безопасности */}
      <div className="w-full border-b border-zinc-800 pb-3 text-center">
        <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500">
          Смена игрока • Передача устройства
        </span>
      </div>

      {/* Центральный блок инструктажа */}
      <div className="flex flex-col items-center text-center max-w-xs my-auto">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/80 text-4xl shadow-2xl">
          📱
        </div>

        <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">
          Следующий ход
        </div>
        <div className={`text-2xl font-black uppercase tracking-wider ${displayColor}`}>
          {displayName}
        </div>

        <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
          Секретные данные предыдущего хода скрыты. Передайте телефон следующему игроку.
        </p>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-[11px] font-mono text-zinc-500">
          ⚠️ Убедитесь, что соперник не смотрит в экран
        </div>
      </div>

      {/* Кнопка подтверждения взятия телефона */}
      <div className="w-full">
        <button
          onClick={onConfirmTakeDevice}
          className={`w-full py-4 rounded-xl border ${displayBorder} bg-zinc-900 text-base font-black uppercase tracking-wider text-zinc-100 shadow-xl active:scale-98 transition-all hover:bg-zinc-800 cursor-pointer`}
        >
          Я взял телефон
        </button>
      </div>
    </div>
  );
};
