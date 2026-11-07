import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

export interface RematchModalProps {
  status: "offer" | "waiting" | null;
  rematchMode?: "SWAP" | "SAME" | "RANDOM";
  matchBet?: number;
  timer?: number;
  onAccept: () => void;
  onReject: () => void;
  onCancelWaiting: () => void;
}

export const RematchModal: React.FC<RematchModalProps> = ({
  status,
  matchBet = 250,
  timer = 0,
  rematchMode = "SWAP",
  onAccept,
  onReject,
  onCancelWaiting,
}) => {
  if (status === null) return null;

  if (status === "offer") {
    return (
      <Modal
        isOpen={true}
        maxWidth="max-w-sm"
        zIndexClass="z-[80]"
        className="items-center"
      >
        <div className="w-16 h-16 rounded-full bg-cyan-950/60 border border-cyan-500/60 text-cyan-400 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </div>

        <h2 className="text-xl font-black uppercase tracking-wider text-[#f1f5f9] mb-2">
          Реванш?
        </h2>

        <p className="text-xs text-[#a1a1aa] mb-6 leading-relaxed flex items-center justify-center gap-1.5 flex-wrap">
          <span>
            {rematchMode === "SWAP"
              ? "Соперник предлагает поменяться ролями. Ставка:"
              : rematchMode === "SAME"
                ? "Соперник предлагает сыграть теми же ролями. Ставка:"
                : "Соперник предлагает определить роли случайно. Ставка:"}
          </span>
          <span className="inline-flex items-center gap-1 font-mono font-bold text-zinc-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-zinc-300 shrink-0">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" />
            </svg>
            {matchBet}
          </span>
        </p>

        <div className="w-full flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={onReject}
            className="uppercase tracking-wider text-xs"
          >
            Отклонить
          </Button>
          <Button
            variant="primary-info"
            fullWidth
            onClick={onAccept}
            className="uppercase tracking-wider text-xs"
          >
            Принять
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={true}
      maxWidth="max-w-sm"
      zIndexClass="z-[80]"
      className="items-center"
    >
      <div className="w-12 h-12 border-4 border-zinc-800 border-t-cyan-500 rounded-full animate-spin mb-4" />
      <h2 className="text-lg font-black uppercase tracking-wider text-[#f1f5f9] mb-2">
        Ожидание ответа... {timer} сек
      </h2>
      <p className="text-xs text-[#a1a1aa] mb-6">Ждем, пока соперник примет вызов.</p>
      <Button
        variant="secondary"
        fullWidth
        onClick={onCancelWaiting}
        className="uppercase tracking-wider text-xs"
      >
        Отменить вызов
      </Button>
    </Modal>
  );
};
