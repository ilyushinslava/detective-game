import React from "react";

export interface WaitingOpponentOverlayProps {
  afkSecondsLeft: number;
  onCancelMatch?: () => void;
}

export const WaitingOpponentOverlay: React.FC<WaitingOpponentOverlayProps> = ({
  afkSecondsLeft,
  onCancelMatch,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#080a0f]/95 backdrop-blur-xl p-4 select-none modal-backdrop touch-none"
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-md h-[90dvh] max-h-[760px] bg-zinc-950 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col justify-between text-center overflow-y-auto custom-scrollbar touch-pan-y">
        <div className="flex flex-col items-center justify-center flex-1 my-auto">
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-3">
            Сетевой протокол
          </div>
          <div className="w-12 h-12 border-2 border-zinc-800 border-t-zinc-200 rounded-full animate-spin mb-6" />
          <h2 className="text-lg font-black text-white uppercase tracking-wider mb-2">
            Ожидание соперника
          </h2>
          <p className="text-xs font-medium tracking-normal text-zinc-400 mb-6 leading-relaxed">
            Вы подтвердили готовность. Ждем подтверждения второго игрока...
          </p>
          <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 w-full flex items-center justify-between font-mono mb-6">
            <span className="text-[10px] text-zinc-400 uppercase">Автоотмена (АФК):</span>
            <span className="text-xs font-black text-zinc-200 font-mono">
              {afkSecondsLeft} сек
            </span>
          </div>
          {onCancelMatch && (
            <button
              onClick={onCancelMatch}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-white/5 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
            >
              Отменить матч
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
