import React from "react";
import type { Character } from "../../types/game";
import { RoleRevealIcons } from "./RoleRevealIcons";

const characterImages = import.meta.glob<{ default: string }>(
  "../../assets/characters/*.webp",
  { eager: true }
);

export interface DetectiveChoiceStepProps {
  inspectorChoices: Character[];
  selectedInspectorId: string | null;
  onSelectInspectorId: (id: string) => void;
  onConfirmChoices: () => void;
}

export const DetectiveChoiceStep: React.FC<DetectiveChoiceStepProps> = ({
  inspectorChoices,
  selectedInspectorId,
  onSelectInspectorId,
  onConfirmChoices,
}) => {
  return (
    <>
      <div className="flex flex-col items-center flex-1 justify-start w-full">
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
          Выбор личности (1 из 4)
        </span>
        <p className="text-[10px] font-mono text-zinc-500 mb-5 uppercase tracking-widest">
          Остальные 3 карты составят твою начальную руку доказательств.
        </p>

        <div className="grid grid-cols-2 gap-3 w-full">
          {inspectorChoices.map((char) => {
            const isSelected = selectedInspectorId === char.id;
            const img = char.id
              ? characterImages[`../../assets/characters/${char.id}.webp`]?.default
              : null;
            return (
              <div
                key={char.id}
                onClick={() => onSelectInspectorId(char.id)}
                className={`relative flex flex-col justify-between p-4 rounded-2xl border text-left cursor-pointer transition select-none min-h-[105px] overflow-hidden ${
                  isSelected
                    ? "bg-blue-950/40 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.35)] scale-[1.02]"
                    : "bg-zinc-900/50 border-white/5 hover:border-white/20 text-zinc-400"
                }`}
              >
                {img && (
                  <img
                    src={img}
                    alt={char.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
                  />
                )}
                <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                  <span>#{char.id.replace("c", "").padStart(2, "0")}</span>
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.9)]" />
                  )}
                </div>
                <div
                  className={`relative z-10 text-xs font-black uppercase tracking-wider mt-3 ${
                    isSelected ? "text-blue-100" : "text-zinc-200"
                  }`}
                >
                  {char.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <button
        onClick={onConfirmChoices}
        disabled={!selectedInspectorId}
        className="w-full h-14 mt-4 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 hover:from-blue-600 hover:to-blue-500 disabled:from-zinc-800 disabled:to-zinc-900 disabled:text-zinc-600 disabled:shadow-none text-white text-[10px] font-black uppercase tracking-widest rounded-full transition cursor-pointer disabled:cursor-not-allowed shadow-[0_10px_25px_rgba(59,130,246,0.5)] border-t border-white/25 flex items-center justify-center gap-2 shrink-0"
      >
        <span>Подтвердить личность</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
      </button>
    </>
  );
};
