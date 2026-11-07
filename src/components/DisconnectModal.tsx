import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

export interface DisconnectModalProps {
  isOpen: boolean;
  onExitToMenu: () => void;
}

export const DisconnectModal: React.FC<DisconnectModalProps> = ({
  isOpen,
  onExitToMenu,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      maxWidth="max-w-sm"
      zIndexClass="z-[150]"
      className="items-center"
    >
      <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center text-red-500 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.3)] shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <h2 className="text-xl font-black uppercase tracking-wider text-[#f1f5f9] mb-2">
        Соперник покинул игру
      </h2>

      <p className="text-xs text-[#a1a1aa] mb-6 leading-relaxed">
        Связь потеряна. Партия завершена.
      </p>

      <Button
        variant="primary-danger"
        fullWidth
        onClick={onExitToMenu}
        className="uppercase tracking-wider"
      >
        В главное меню
      </Button>
    </Modal>
  );
};
