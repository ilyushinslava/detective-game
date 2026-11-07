// src/components/duel/DuelAccuseModal.tsx
import React from "react";
import type { DuelCharacter } from "../../types/duel";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
      className="items-center"
    >
      {/* Header Icon */}
      <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-500/50 flex items-center justify-center text-red-500 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.25)] shrink-0">
        <Icons.Shield />
      </div>

      <h2 className="text-xl font-black uppercase tracking-widest text-[#f1f5f9] mb-1">
        Официальное обвинение
      </h2>
      <p className="text-[10px] font-medium tracking-normal text-[#a1a1aa] uppercase mb-6">
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
            <span className="text-[10px] text-zinc-500 font-medium tracking-normal leading-relaxed">
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
            <span className="text-[10px] text-zinc-400 font-medium tracking-normal leading-relaxed">
              Если это не разыскиваемая цель, вы получите <b className="text-red-400">+1 штрафное очко</b>, потеряете ход, а игра продолжится.
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="w-full flex flex-col gap-3">
        <Button
          variant="primary-danger"
          fullWidth
          onClick={onConfirmAccusation}
          disabled={alreadyAccused}
          className="uppercase tracking-widest text-xs"
        >
          Выдвинуть обвинение
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={onClose}
          className="uppercase tracking-widest text-xs"
        >
          Отмена
        </Button>
      </div>
    </Modal>
  );
};
