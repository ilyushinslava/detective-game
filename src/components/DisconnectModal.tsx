import React from "react";

type DisconnectModalProps = {
  isOpen: boolean;
  onExitToMenu: () => void;
};

export function DisconnectModal({
  isOpen,
  onExitToMenu,
}: DisconnectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 p-4 select-none">
      <div className="w-full max-w-sm bg-zinc-900 border border-red-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-red-950 border border-red-700 flex items-center justify-center text-red-500 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.3)]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
        <h2 className="text-xl font-black text-zinc-100 mb-2">
          Соперник покинул игру
        </h2>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Связь потеряна. Партия завершена.
        </p>
        <button
          onClick={onExitToMenu}
          className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
        >
          В главное меню
        </button>
      </div>
    </div>
  );
}
