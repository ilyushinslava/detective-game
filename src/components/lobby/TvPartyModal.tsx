import React from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export interface TvPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTvParty?: (role?: "TV_DISPLAY" | "CONTROLLER") => void;
}

export const TvPartyModal: React.FC<TvPartyModalProps> = ({
  isOpen,
  onClose,
  onStartTvParty,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      className="p-6 text-left"
    >
      <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <h3 className="text-xs font-black text-zinc-100 uppercase tracking-widest">
            ТВ ВЕЧЕРИНКА • РОЛЬ УСТРОЙСТВА
          </h3>
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          className="!h-8 !w-8 !p-0 text-zinc-400 hover:text-white"
          title="Закрыть"
        >
          ✕
        </Button>
      </div>

      <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
        Выберите, как использовать текущее устройство в партии:
      </p>

      <div className="space-y-3 mb-5">
        <button
          onClick={() => {
            onClose();
            if (onStartTvParty) {
              onStartTvParty("TV_DISPLAY");
            } else {
              const code = Math.floor(10000 + Math.random() * 90000).toString();
              window.location.href = `${window.location.pathname}?clientType=TV_DISPLAY&room=${code}`;
            }
          }}
          className="w-full p-4 rounded-2xl bg-zinc-950/70 border border-white/10 hover:border-red-500/60 hover:bg-zinc-900/90 transition-all text-left flex items-center gap-3.5 group cursor-pointer shadow-lg active:scale-[0.99]"
        >
          <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-red-500/30 group-hover:border-red-500/60 flex items-center justify-center text-red-500 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black uppercase tracking-wider text-zinc-100 group-hover:text-red-400 transition-colors">
              ЭКРАН ТЕЛЕВИЗОРА
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
              Общее игровое поле 5×5 для хоста (TV / Проектор)
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            onClose();
            if (onStartTvParty) {
              onStartTvParty("CONTROLLER");
            } else {
              window.location.href = `${window.location.pathname}?clientType=CONTROLLER`;
            }
          }}
          className="w-full p-4 rounded-2xl bg-zinc-950/70 border border-white/10 hover:border-blue-500/60 hover:bg-zinc-900/90 transition-all text-left flex items-center gap-3.5 group cursor-pointer shadow-lg active:scale-[0.99]"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-950/40 border border-blue-500/30 group-hover:border-blue-500/60 flex items-center justify-center text-blue-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black uppercase tracking-wider text-zinc-100 group-hover:text-blue-400 transition-colors">
              ПОДКЛЮЧИТЬСЯ К ТВ (ПУЛЬТ)
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
              Сканировать QR-код или ввести код Морзе для подключения
            </div>
          </div>
        </button>
      </div>

      <Button
        variant="secondary"
        fullWidth
        onClick={onClose}
        className="h-11 text-xs font-bold uppercase tracking-wider text-zinc-300"
      >
        Отмена
      </Button>
    </Modal>
  );
};
