import React from "react";

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
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-black uppercase tracking-wider text-zinc-100 mb-2">
          Пауза
        </h2>

        <button
          onClick={onResume}
          className="w-full py-3.5 bg-zinc-100 hover:bg-white text-zinc-950 shadow-[0_10px_20px_rgba(255,255,255,0.15)] font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
        >
          Продолжить
        </button>

        <button
          onClick={onOpenRules}
          className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
        >
          Справочник правил
        </button>

        {onOpenDevPanel && (
          <button
            onClick={() => {
              onClose();
              onOpenDevPanel();
            }}
            className="w-full py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/50 text-zinc-300 font-mono text-xs font-bold uppercase tracking-wider hover:bg-zinc-700/60 transition cursor-pointer"
          >
            Панель разработчика (DEV)
          </button>
        )}

        <button
          onClick={onLeaveGame}
          className="w-full py-3.5 bg-red-950/80 hover:bg-red-900 text-red-400 font-bold uppercase tracking-wider rounded-xl border border-red-900/50 transition cursor-pointer"
        >
          Покинуть игру
        </button>

        <div className="w-full flex items-center gap-3 my-2 opacity-50">
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
      </div>
    </div>
  );
};
