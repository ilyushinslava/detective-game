import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

export interface PauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: () => void;
  onOpenRules: () => void;
  onLeaveGame: () => void;
  onOpenDevPanel?: () => void;
  isSfxEnabled: boolean;
  isAmbientEnabled: boolean;
  isHapticsEnabled: boolean;
  onToggleSfx: () => void;
  onToggleAmbient: () => void;
  onToggleHaptics: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onClose,
  onResume,
  onOpenRules,
  onLeaveGame,
  onOpenDevPanel,
  isSfxEnabled,
  isAmbientEnabled,
  isHapticsEnabled,
  onToggleSfx,
  onToggleAmbient,
  onToggleHaptics,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Пауза"
      maxWidth="max-w-sm"
      className="gap-3"
    >
      <Button
        variant="secondary"
        fullWidth
        onClick={onResume}
        className="!text-zinc-100 !bg-zinc-800/80 hover:!bg-zinc-700 uppercase tracking-wider"
      >
        Продолжить
      </Button>

      <Button
        variant="secondary"
        fullWidth
        onClick={onOpenRules}
        className="uppercase tracking-wider"
      >
        Справочник правил
      </Button>

      {onOpenDevPanel && (
        <Button
          variant="ghost"
          fullWidth
          onClick={() => {
            onClose();
            onOpenDevPanel();
          }}
          className="border border-zinc-700/60 font-mono text-xs uppercase tracking-wider"
        >
          Панель разработчика (DEV)
        </Button>
      )}

      <Button
        variant="primary-danger"
        fullWidth
        onClick={onLeaveGame}
        className="uppercase tracking-wider"
      >
        Покинуть игру
      </Button>

      <div className="w-full flex items-center gap-3 my-1 opacity-50">
        <div className="h-px bg-white/20 flex-1" />
        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
          Параметры связи
        </span>
        <div className="h-px bg-white/20 flex-1" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-white/5">
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
            Звуки (SFX)
          </span>
          <button
            type="button"
            onClick={onToggleSfx}
            className={`w-10 h-5 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
              isSfxEnabled ? "bg-red-600" : "bg-zinc-700"
            }`}
          >
            <div
              className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                isSfxEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-white/5">
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
            Эмбиент
          </span>
          <button
            type="button"
            onClick={onToggleAmbient}
            className={`w-10 h-5 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
              isAmbientEnabled ? "bg-red-600" : "bg-zinc-700"
            }`}
          >
            <div
              className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                isAmbientEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-white/5">
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
            Вибрация
          </span>
          <button
            type="button"
            onClick={onToggleHaptics}
            className={`w-10 h-5 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
              isHapticsEnabled ? "bg-red-600" : "bg-zinc-700"
            }`}
          >
            <div
              className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                isHapticsEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </Modal>
  );
};
