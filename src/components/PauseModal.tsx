import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

export interface PauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: () => void;
  onOpenRules?: () => void;
  onRemindRole?: () => void;
  onLeaveGame: () => void;
  onOpenDevPanel?: () => void;
  isSfxEnabled?: boolean;
  isAmbientEnabled?: boolean;
  isHapticsEnabled?: boolean;
  onToggleSfx?: () => void;
  onToggleAmbient?: () => void;
  onToggleHaptics?: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onClose,
  onResume,
  onOpenRules,
  onRemindRole,
  onLeaveGame,
  onOpenDevPanel,
  isSfxEnabled = true,
  isAmbientEnabled = true,
  isHapticsEnabled = true,
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
        variant="primary"
        fullWidth
        onClick={onResume}
        className="uppercase tracking-wider font-black text-xs"
      >
        Продолжить
      </Button>

      {onRemindRole && (
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            onClose();
            onRemindRole();
          }}
          className="uppercase tracking-wider font-black text-xs"
        >
          Напомнить роль
        </Button>
      )}

      {onOpenRules && (
        <Button
          variant="secondary"
          fullWidth
          onClick={onOpenRules}
          className="uppercase tracking-wider font-black text-xs"
        >
          Справочник правил
        </Button>
      )}

      {import.meta.env.DEV && onOpenDevPanel && (
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
        variant="danger"
        fullWidth
        onClick={onLeaveGame}
        className="uppercase tracking-wider font-black text-xs"
      >
        Покинуть игру
      </Button>

      {(onToggleSfx || onToggleAmbient || onToggleHaptics) && (
        <>
          <div className="w-full flex items-center gap-3 my-1 opacity-50">
            <div className="h-px bg-white/20 flex-1" />
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
              Параметры связи
            </span>
            <div className="h-px bg-white/20 flex-1" />
          </div>

          <div className="flex flex-col gap-2">
            {onToggleSfx && (
              <div className="neo-card border-t-white/15 p-3 rounded-xl flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">
                    Звуки (SFX)
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
                    Звуковые эффекты игры
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isSfxEnabled}
                  onClick={onToggleSfx}
                  className={`w-12 h-6 rounded-full px-1 flex items-center transition-all duration-200 cursor-pointer ${
                    isSfxEnabled
                      ? "bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 border border-white/40 border-t-white/70 shadow-inner"
                      : "bg-zinc-900 border border-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full shadow-md transition-transform duration-200 ${
                      isSfxEnabled
                        ? "translate-x-6 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                        : "translate-x-0 bg-zinc-500"
                    }`}
                  />
                </button>
              </div>
            )}

            {onToggleAmbient && (
              <div className="neo-card border-t-white/15 p-3 rounded-xl flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">
                    Эмбиент
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
                    Фоновая музыка матча
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAmbientEnabled}
                  onClick={onToggleAmbient}
                  className={`w-12 h-6 rounded-full px-1 flex items-center transition-all duration-200 cursor-pointer ${
                    isAmbientEnabled
                      ? "bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 border border-white/40 border-t-white/70 shadow-inner"
                      : "bg-zinc-900 border border-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full shadow-md transition-transform duration-200 ${
                      isAmbientEnabled
                        ? "translate-x-6 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                        : "translate-x-0 bg-zinc-500"
                    }`}
                  />
                </button>
              </div>
            )}

            {onToggleHaptics && (
              <div className="neo-card border-t-white/15 p-3 rounded-xl flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">
                    Вибрация
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
                    Тактильный отклик
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isHapticsEnabled}
                  onClick={onToggleHaptics}
                  className={`w-12 h-6 rounded-full px-1 flex items-center transition-all duration-200 cursor-pointer ${
                    isHapticsEnabled
                      ? "bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 border border-white/40 border-t-white/70 shadow-inner"
                      : "bg-zinc-900 border border-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full shadow-md transition-transform duration-200 ${
                      isHapticsEnabled
                        ? "translate-x-6 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                        : "translate-x-0 bg-zinc-500"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  );
};
