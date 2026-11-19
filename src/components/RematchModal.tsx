import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { DEFAULT_BET } from "../constants/gameRules";

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
  matchBet = DEFAULT_BET,
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
        <div className="w-16 h-16 rounded-2xl bg-blue-950/60 border border-blue-500/60 text-blue-400 mb-4 shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </div>

        <h2 className="text-xl font-black uppercase tracking-wider text-zinc-100 mb-2">
          Реванш?
        </h2>

        <p className="text-xs text-zinc-400 mb-6 leading-relaxed flex items-center justify-center gap-1.5 flex-wrap">
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
            className="uppercase tracking-wider text-xs font-black h-12"
          >
            Отклонить
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={onAccept}
            className="uppercase tracking-wider text-xs font-black h-12"
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
      <div className="w-12 h-12 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin mb-4" />
      <h2 className="text-lg font-black uppercase tracking-wider text-zinc-100 mb-2">
        Ожидание ответа... {timer} сек
      </h2>
      <p className="text-xs text-zinc-400 mb-6">Ждем, пока соперник примет вызов.</p>
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
