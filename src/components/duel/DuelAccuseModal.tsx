// src/components/duel/DuelAccuseModal.tsx
import type { DuelCharacter } from "../../types/duel";

const characterImages = import.meta.glob<{ default: string }>(
  "../../assets/characters/*.webp",
  { eager: true }
);

interface DuelAccuseModalProps {
  isOpen: boolean;
  targetCharacter: DuelCharacter | null;
  alreadyAccused: boolean;
  onClose: () => void;
  onConfirmAccusation: () => void;
}

const Icons = {
  Alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

export const DuelAccuseModal = ({
  isOpen,
  targetCharacter,
  alreadyAccused,
  onClose,
  onConfirmAccusation,
}: DuelAccuseModalProps) => {
  if (!isOpen || !targetCharacter) return null;

  const imageAsset = characterImages[`../../assets/characters/${targetCharacter.id}.webp`]?.default;
  const num = targetCharacter.id.replace("c", "").padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-red-900/50 rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        
        {/* Header Icon */}
        <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-500/50 flex items-center justify-center text-red-500 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
          <Icons.Shield />
        </div>

        <h2 className="text-xl font-black uppercase tracking-widest text-zinc-100 mb-1">
          Официальное обвинение
        </h2>
        <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-6">
          Подтвердите личность подозреваемого
        </p>

        {/* Target Character Card */}
        <div className="relative w-32 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-red-900/50 bg-zinc-900 mb-6 shadow-[0_0_30px_rgba(220,38,38,0.15)]">
          {imageAsset ? (
            <img
              src={imageAsset}
              alt={targetCharacter.name}
              className="absolute inset-0 w-full h-full object-cover opacity-75 grayscale contrast-125 pointer-events-none"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-700 font-mono text-xs">
              Нет фото
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none" />
          
          <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col items-center pointer-events-none">
            <span className="text-[10px] font-mono text-red-400 mb-0.5">
              #{num}
            </span>
            <span className="text-xs font-black text-zinc-100 uppercase tracking-wider leading-tight text-center">
              {targetCharacter.name}
            </span>
          </div>
        </div>

        {/* Warning / Error Block */}
        {alreadyAccused ? (
          <div className="w-full p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-700 flex items-start gap-3 mb-6 text-left">
            <div className="text-zinc-500 shrink-0 mt-0.5">
              <Icons.Alert />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-1">
                Обвинение отклонено
              </span>
              <span className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                Вы уже пытались обвинить этого подозреваемого. Повторное обвинение запрещено правилами.
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 flex items-start gap-3 mb-6 text-left">
            <div className="text-red-500 shrink-0 mt-0.5">
              <Icons.Alert />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">
                Внимание: Штраф за ошибку
              </span>
              <span className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                Если это не разыскиваемая цель, вы получите <b className="text-red-400">+1 штрафное очко</b>, потеряете ход, а игра продолжится.
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onConfirmAccusation}
            disabled={alreadyAccused}
            className="w-full py-4 bg-gradient-to-r from-red-700 via-red-600 to-red-800 disabled:from-zinc-800 disabled:to-zinc-900 disabled:text-zinc-600 disabled:shadow-none text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-[0_10px_25px_rgba(220,38,38,0.4)] hover:brightness-110 active:scale-[0.98] transition cursor-pointer disabled:cursor-not-allowed"
          >
            Выдвинуть обвинение
          </button>
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[10px] font-black tracking-widest uppercase rounded-xl transition cursor-pointer"
          >
            Отмена
          </button>
        </div>

      </div>
    </div>
  );
};