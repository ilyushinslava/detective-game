import { useState } from "react";
import type { Role, GameModeType } from "../types/game";
import {
  DevOutcomesSection,
  DevStateSection,
  DevModalsSection,
  DevEconomySection,
} from "./dev";

export interface DevPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onForceWin: (winner: Role, mode?: GameModeType) => void;
  onTriggerInspectorChoice: () => void;
  onResetToMenu: () => void;
  onAddCash: (amount: number) => void;
  onResetCash?: () => void;
  onToggleTurn?: () => void;
  onTogglePlayerRole?: () => void;
  onAddKill?: () => void;
  onTriggerIntro?: () => void;
  onTriggerRestartRequest?: () => void;
  onTriggerOpponentLeft?: () => void;
  onTriggerDisguiseModal?: () => void;
  onTriggerCaughtSpyModal?: () => void;
  onTriggerGameOver?: () => void;
  onTriggerCluesWin?: () => void;
  onClearSession?: () => void;
}

export const DevPanel = ({
  isOpen,
  onClose,
  onForceWin,
  onTriggerInspectorChoice,
  onResetToMenu,
  onAddCash,
  onResetCash,
  onToggleTurn,
  onTogglePlayerRole,
  onAddKill,
  onTriggerIntro,
  onTriggerRestartRequest,
  onTriggerOpponentLeft,
  onTriggerDisguiseModal,
  onTriggerCaughtSpyModal,
  onTriggerGameOver,
  onTriggerCluesWin,
  onClearSession,
}: DevPanelProps) => {
  if (!isOpen || !import.meta.env.DEV) return null;

  const [activeSection, setActiveSection] = useState<number | null>(1);

  const toggleSection = (id: number) => {
    setActiveSection((prev) => (prev === id ? null : id));
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-zinc-950 border border-zinc-700 rounded-3xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-3 font-sans max-h-[88vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-300 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
              ⚡ QA / Dev Control Panel
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Аккордеон 1: Исходы матчей по режимам */}
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-zinc-900/40">
          <button
            onClick={() => toggleSection(1)}
            className="w-full p-3 flex justify-between items-center text-left text-xs font-black uppercase tracking-wider text-zinc-300 hover:text-white transition cursor-pointer"
          >
            <span>1. Исходы матчей по режимам</span>
            <span className="text-[10px] text-zinc-500">{activeSection === 1 ? "▲" : "▼"}</span>
          </button>
          {activeSection === 1 && (
            <DevOutcomesSection
              onForceWin={onForceWin}
              onTriggerCluesWin={onTriggerCluesWin}
              onClose={onClose}
            />
          )}
        </div>

        {/* Аккордеон 2: Управление состоянием и ходом */}
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-zinc-900/40">
          <button
            onClick={() => toggleSection(2)}
            className="w-full p-3 flex justify-between items-center text-left text-xs font-black uppercase tracking-wider text-zinc-300 hover:text-white transition cursor-pointer"
          >
            <span>2. Управление состоянием и ходом</span>
            <span className="text-[10px] text-zinc-500">{activeSection === 2 ? "▲" : "▼"}</span>
          </button>
          {activeSection === 2 && (
            <DevStateSection
              onToggleTurn={onToggleTurn}
              onTogglePlayerRole={onTogglePlayerRole}
              onAddKill={onAddKill}
              onTriggerInspectorChoice={onTriggerInspectorChoice}
              onClose={onClose}
            />
          )}
        </div>

        {/* Аккордеон 3: Модальные окна и экраны */}
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-zinc-900/40">
          <button
            onClick={() => toggleSection(3)}
            className="w-full p-3 flex justify-between items-center text-left text-xs font-black uppercase tracking-wider text-zinc-300 hover:text-white transition cursor-pointer"
          >
            <span>3. Модальные окна и экраны</span>
            <span className="text-[10px] text-zinc-500">{activeSection === 3 ? "▲" : "▼"}</span>
          </button>
          {activeSection === 3 && (
            <DevModalsSection
              onTriggerIntro={onTriggerIntro}
              onTriggerRestartRequest={onTriggerRestartRequest}
              onTriggerDisguiseModal={onTriggerDisguiseModal}
              onTriggerCaughtSpyModal={onTriggerCaughtSpyModal}
              onTriggerOpponentLeft={onTriggerOpponentLeft}
              onTriggerGameOver={onTriggerGameOver}
              onClose={onClose}
            />
          )}
        </div>

        {/* Аккордеон 4: Экономика и отладка */}
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-zinc-900/40">
          <button
            onClick={() => toggleSection(4)}
            className="w-full p-3 flex justify-between items-center text-left text-xs font-black uppercase tracking-wider text-zinc-300 hover:text-white transition cursor-pointer"
          >
            <span>4. Экономика и отладка</span>
            <span className="text-[10px] text-zinc-500">{activeSection === 4 ? "▲" : "▼"}</span>
          </button>
          {activeSection === 4 && (
            <DevEconomySection
              onAddCash={onAddCash}
              onResetCash={onResetCash}
              onClearSession={onClearSession}
              onResetToMenu={onResetToMenu}
              onClose={onClose}
            />
          )}
        </div>

        <span className="text-[9px] font-mono text-zinc-600 text-center mt-1">
          Нажмите [~] для быстрого закрытия
        </span>
      </div>
    </div>
  );
};
