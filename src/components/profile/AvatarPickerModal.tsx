import React from 'react';
import { Button } from '../ui/Button';
import { getCharacterPortraitPath } from '../../constants/characterImages';

export const AGENT_AVATARS = Array.from({ length: 50 }, (_, i) => ({ id: `c${i + 1}` }));

export interface AvatarPickerModalProps {
  isOpen: boolean;
  currentAvatarId: string;
  onSelectAvatar: (avatarId: string) => void;
  onClose: () => void;
  title?: string;
  closeLabel?: string;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  currentAvatarId,
  onSelectAvatar,
  onClose,
  title = 'ВЫБЕРИТЕ АВАТАР',
  closeLabel = 'Закрыть',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0e14] border border-white/20 rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-base font-black uppercase tracking-wider text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 text-sm font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 overflow-y-auto max-h-[60vh] custom-scrollbar p-1">
          {AGENT_AVATARS.map((agent) => {
            const isSelected = currentAvatarId === agent.id;
            const portrait = getCharacterPortraitPath(agent.id);
            return (
              <button
                key={agent.id}
                onClick={() => onSelectAvatar(agent.id)}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-lg'
                    : 'border-white/10 hover:border-white/30 bg-zinc-900'
                }`}
              >
                <img src={portrait} alt="" className="w-full h-full object-cover filter contrast-110" />
              </button>
            );
          })}
        </div>

        <Button
          variant="secondary"
          onClick={onClose}
          className="w-full h-9 text-xs font-bold uppercase tracking-wider mt-1"
        >
          {closeLabel}
        </Button>
      </div>
    </div>
  );
};
