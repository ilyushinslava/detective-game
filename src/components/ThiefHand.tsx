import { useState } from "react";
import { ALL_CHARACTERS } from "../constants/characters";

interface ThiefHandProps {
  handIds: string[];
  isThiefTurn: boolean;
  onFastDisguise: (id: string) => void;
}

export const ThiefHand = ({
  handIds,
  isThiefTurn,
  onFastDisguise,
}: ThiefHandProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // В чужой ход маски принудительно скрыты
  const canView = isThiefTurn;
  const showContent = isOpen && canView;

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-amber-500">
            Маски Вора ({handIds.length} карт)
          </span>
          {!canView && (
            <span className="block text-[10px] text-zinc-500 font-mono">
              Закрыто (чужой ход)
            </span>
          )}
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={!canView}
          className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition select-none ${
            canView
              ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700 cursor-pointer active:scale-95"
              : "bg-zinc-950 text-zinc-600 border-zinc-900 cursor-not-allowed opacity-40"
          }`}
        >
          {showContent ? "Скрыть карты" : "Показать карты"}
        </button>
      </div>

      {showContent && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80">
          <div className="text-[10px] text-zinc-400 mb-2 font-mono">
            Нажмите на карту, чтобы применить быструю маскировку:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {handIds.map((id) => {
              const char = ALL_CHARACTERS.find((c) => c.id === id);
              return (
                <div
                  key={id}
                  onClick={() => onFastDisguise(id)}
                  className="p-2.5 rounded-xl bg-zinc-950 hover:bg-amber-950/40 border border-zinc-800 hover:border-amber-500/80 cursor-pointer transition flex flex-col justify-between min-h-[90px] shadow select-none group"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                    <span>#{id.replace("c", "").padStart(2, "0")}</span>
                    <span className="text-amber-500 font-bold uppercase tracking-wider text-[8px] px-1 py-0.2 bg-amber-950 rounded border border-amber-900">
                      Маска
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm font-black text-zinc-100 group-hover:text-amber-200 leading-snug my-1.5">
                    {char?.name ?? id}
                  </div>

                  <div className="text-[9px] text-zinc-400 group-hover:text-zinc-300 font-semibold">
                    Сменить маску →
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
