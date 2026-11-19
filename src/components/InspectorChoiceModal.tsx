import React, { useState } from "react";
import type { Character } from "../types/game";

export interface InspectorChoiceModalProps {
  isOpen: boolean;
  isPVP: boolean;
  inspectorChoices: Character[];
  characterImages: Record<string, { default: string }>;
  onSelectInspectorRole: (id: string) => void;
  selectedId?: string | null;
  onSelectId?: (id: string | null) => void;
}

export const InspectorChoiceModal: React.FC<InspectorChoiceModalProps> = ({
  isOpen,
  isPVP,
  inspectorChoices,
  characterImages,
  onSelectInspectorRole,
  selectedId: controlledSelectedId,
  onSelectId,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPassConfirmed, setIsPassConfirmed] = useState(false);

  const selectedId = controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId;
  const setSelectedId = (id: string | null) => {
    if (onSelectId) onSelectId(id);
    else setInternalSelectedId(id);
  };

  if (!isOpen || !inspectorChoices || inspectorChoices.length === 0) {
    return null;
  }

  const handleConfirm = () => {
    if (!selectedId) return;
    onSelectInspectorRole(selectedId);
    setSelectedId(null);
    setIsMinimized(false);
    setIsPassConfirmed(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end sm:justify-center p-4 select-none pointer-events-none overflow-hidden pt-16">
      {isPVP && !isPassConfirmed ? (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-sm neo-card border-t-white/20 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-950/60 border border-blue-500/60 flex items-center justify-center text-blue-400 font-black text-2xl mb-6 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
              Секретные данные
            </span>
            <h2 className="text-xl font-black text-zinc-100 uppercase tracking-wider mb-2">
              Передайте экран Инспектору
            </h2>
            <p className="text-[10px] font-medium tracking-normal text-zinc-400 mb-6 uppercase leading-relaxed">
              Убедитесь, что Бандит не смотрит на экран перед выбором личности.
            </p>
            <button
              onClick={() => setIsPassConfirmed(true)}
              className="w-full h-12 neo-button-primary text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-lg"
            >
              <span>Я держу телефон один</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-500 ease-out pointer-events-auto ${
              isMinimized ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
            onClick={() => setIsMinimized(true)}
          />

          <div
            className={`absolute bottom-8 transition-all duration-500 ease-out transform pointer-events-auto flex items-center gap-2 ${
              isMinimized ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
            }`}
          >
            <button
              onClick={() => setIsMinimized(false)}
              className="h-10 px-4 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl shadow-lg flex items-center justify-center gap-2 text-zinc-300 font-bold uppercase tracking-wider text-[10px] hover:bg-zinc-800 transition cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>Выбор личности</span>
            </button>
            {selectedId && (
              <button
                onClick={handleConfirm}
                className="h-10 px-4 neo-button-primary text-white font-black uppercase tracking-wider text-[10px] rounded-xl shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <span>Подтвердить</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          <div
            className={`relative w-full max-w-md neo-card border-t-white/20 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col text-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform pointer-events-auto ${
              isMinimized ? "translate-y-[110%] opacity-0" : "translate-y-0 opacity-100"
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                Оперативное назначение
              </span>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-[9px] font-black text-zinc-400 hover:text-white uppercase tracking-widest flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-white/5 transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Осмотреть поле
              </button>
            </div>
            <h2 className="text-xl font-black text-zinc-100 uppercase tracking-wider mb-2">
              Выберите тайную личность (1 из 4)
            </h2>
            <p className="text-[10px] font-medium tracking-normal text-zinc-400 mb-6 uppercase">
              Остальные 3 карты составят ваше досье алиби.
            </p>
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              {inspectorChoices.map((char) => {
                const isSelected = selectedId === char.id;
                const img =
                  characterImages[`../assets/characters/${char.id}.webp`]?.default ||
                  characterImages[`./assets/characters/${char.id}.webp`]?.default;

                return (
                  <div
                    key={char.id}
                    onClick={() => setSelectedId(char.id)}
                    className={`relative flex flex-col justify-between p-4 rounded-2xl border text-left cursor-pointer transition select-none min-h-[110px] overflow-hidden ${
                      isSelected
                        ? "bg-blue-950/50 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.35)] scale-[1.02]"
                        : "bg-zinc-900/60 backdrop-blur-md border-white/5 hover:border-white/20 text-zinc-400"
                    }`}
                  >
                    {img && (
                      <img
                        src={img}
                        alt={char.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
                      />
                    )}
                    <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                      <span>#{char.id.replace("c", "").padStart(2, "0")}</span>
                      {isSelected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.9)]" />
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
            <button
              onClick={handleConfirm}
              disabled={!selectedId || !inspectorChoices.some((c) => c.id === selectedId)}
              className="w-full h-12 neo-button-primary disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-2 shrink-0"
            >
              <span>Подтвердить личность</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
