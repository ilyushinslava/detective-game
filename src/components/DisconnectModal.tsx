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
      <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/60 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.3)] shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <h2 className="text-xl font-black uppercase tracking-wider text-zinc-100 mb-2">
        Соперник покинул игру
      </h2>

      <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
        Связь потеряна. Партия завершена.
      </p>

      <Button
        variant="danger"
        fullWidth
        onClick={onExitToMenu}
        className="uppercase tracking-wider font-black text-xs h-12"
      >
        В главное меню
      </Button>
    </Modal>
  );
};
