import React from "react";
import type { GameModeType } from "../../types/game";
import { GAME_MODES_META } from "../../constants/gameMeta";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMode: GameModeType;
  onSelectMode: (mode: GameModeType) => void;
  isPrivate: boolean;
  onTogglePrivate: (isPrivate: boolean) => void;
  onConfirm: () => void;
  isCreating: boolean;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  selectedMode,
  onSelectMode,
  isPrivate,
  onTogglePrivate,
  onConfirm,
  isCreating,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Протокол: Новая операция"
      maxWidth="max-w-sm"
      showCloseButton={true}
      zIndexClass="z-[60]"
    >
      <div className="space-y-4 text-left mt-3">
        <div>
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">
            Сценарий
          </label>
          <select
            value={selectedMode}
            onChange={(e) => onSelectMode(e.target.value as GameModeType)}
            className="w-full bg-zinc-950/80 border border-white/15 rounded-xl px-4 py-3 text-xs font-black tracking-widest text-zinc-200 focus:border-blue-500 outline-none appearance-none transition uppercase shadow-inner cursor-pointer"
          >
            <option value="LINE_UP">{GAME_MODES_META.LINE_UP.title.ru}</option>
            <option value="SECRET_SERVICE">{GAME_MODES_META.SECRET_SERVICE.title.ru}</option>
            <option value="MANIAC_VS_OPERATIVE">{GAME_MODES_META.MANIAC_VS_OPERATIVE.title.ru}</option>
            <option value="THIEF_HUNT">{GAME_MODES_META.THIEF_HUNT.title.ru}</option>
          </select>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/10 flex items-center justify-between shadow-inner">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Финансирование</span>
            <span className="text-[10px] text-zinc-300 font-mono mt-0.5">Без списания средств</span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 border border-zinc-700 rounded px-2 py-0.5">Free</span>
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-1">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => onTogglePrivate(e.target.checked)}
            className="w-4 h-4 accent-blue-500 bg-zinc-900 border-zinc-700 rounded-sm"
          />
          <span className="text-[10px] font-black tracking-widest text-zinc-300 uppercase">Закрытый канал (по шифру)</span>
        </label>

        <div className="flex gap-3 pt-3 border-t border-white/10">
          <Button variant="secondary" onClick={onClose} className="flex-1 text-[10px] font-black tracking-widest uppercase">
            Отмена
          </Button>
          <Button variant="primary-info" onClick={onConfirm} disabled={isCreating} className="flex-1 text-[10px] font-black tracking-widest uppercase">
            {isCreating ? "Инициализация..." : "Создать"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
