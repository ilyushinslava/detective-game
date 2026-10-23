import React from "react";

export interface RematchModalProps {
  status: "offer" | "waiting" | null;
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
  onAccept,
  onReject,
  onCancelWaiting,
}) => {
  if (status === null) return null;

  if (status === "offer") {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-4 select-none">
        <div className="w-full max-w-sm bg-zinc-900 border border-amber-500/50 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-500 mb-4 shadow-[0_0_20px_rgba(245,158,11,0.3)]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg></div>
          <h2 className="text-xl font-black text-zinc-100 mb-2">Реванш?</h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed flex items-center justify-center gap-1.5">
            <span>Соперник предлагает сыграть еще раз. Ставка:</span>
            <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-amber-400 shrink-0">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" />
              </svg>
              {matchBet}
            </span>
          </p>
          <div className="w-full flex gap-3">
            <button onClick={onReject} className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer">Отклонить</button>
            <button onClick={onAccept} className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer">Принять</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-4 select-none">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-amber-500 rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-black text-zinc-100 mb-2">Ожидание ответа... {timer} сек</h2>
        <p className="text-xs text-zinc-400 mb-6">Ждем, пока соперник примет вызов.</p>
        <button onClick={onCancelWaiting} className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer">Отменить вызов</button>
      </div>
    </div>
  );
};