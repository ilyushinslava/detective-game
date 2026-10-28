// src/components/duel/DuelCandidatesSheet.tsx
import { useMemo } from "react";
import type { DuelCharacter, DuelHistoryEntry } from "../../types/duel";
import type { Role } from "../../types/game";
import { filterCandidates } from "../../utils/duelLogic";

const characterImages = import.meta.glob<{ default: string }>(
  "../../assets/characters/*.webp",
  { eager: true }
);

interface DuelCandidatesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  allCharacters: DuelCharacter[];
  history: DuelHistoryEntry[];
  playerRole: Role;
  onSelectCandidate?: (characterId: string) => void;
}

const Icons = {
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

export const DuelCandidatesSheet = ({
  isOpen,
  onClose,
  allCharacters,
  history,
  playerRole,
  onSelectCandidate,
}: DuelCandidatesSheetProps) => {
  const candidates = useMemo(() => {
    return filterCandidates(allCharacters, history, playerRole);
  }, [allCharacters, history, playerRole]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end select-none">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-5 max-h-[85vh] flex flex-col z-10 shadow-2xl w-full max-w-2xl mx-auto animate-in slide-in-from-bottom-8 duration-300">
        {/* Swipe Indicator */}
        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black uppercase tracking-widest text-zinc-100">
              Досье
            </h2>
            <div className="bg-blue-950/80 border border-blue-500/40 text-blue-200 text-xs font-mono px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.2)]">
              Кандидаты: {candidates.length} из {allCharacters.length}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer p-1"
          >
            <Icons.X />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-red-900/50 rounded-2xl bg-red-950/20 mt-4">
              <div className="text-red-500 mb-3">
                <Icons.Alert />
              </div>
              <h3 className="text-sm font-black text-red-400 uppercase tracking-widest mb-2">
                Противоречие данных
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                Список кандидатов пуст. Проверьте историю ответов соперника — возможно, он допустил ошибку или намеренно солгал.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {candidates.map((char) => {
                const imageAsset = characterImages[`../../assets/characters/${char.id}.webp`]?.default;
                const num = char.id.replace("c", "").padStart(2, "0");

                return (
                  <div
                    key={char.id}
                    onClick={() => {
                      if (onSelectCandidate) {
                        onSelectCandidate(char.id);
                        onClose();
                      }
                    }}
                    className={`relative aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 flex flex-col justify-end p-2 shadow-md group ${
                      onSelectCandidate ? "cursor-pointer hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all" : ""
                    }`}
                  >
                    {imageAsset ? (
                      <img
                        src={imageAsset}
                        alt={char.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale contrast-125 group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-700 font-mono text-[10px]">
                        Нет фото
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col pointer-events-none">
                      <span className="text-[9px] font-mono text-blue-400/80 mb-0.5">
                        #{num}
                      </span>
                      <span className="text-[10px] font-black text-zinc-100 uppercase tracking-wider leading-tight line-clamp-2">
                        {char.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};