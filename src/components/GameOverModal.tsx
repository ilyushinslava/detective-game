import type { Role, Character, GameModeType } from '../types/game';

// --- ИКОНКИ (Inline SVG) ---
const Icons = {
  Skull: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>,
  Scales: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><path d="M12 3v18"/><path d="M3 10l4-4 4 4"/><path d="M15 10l4-4 4 4"/><path d="M7 6h10"/><path d="M3 10h8"/><path d="M15 10h8"/><path d="M3 10v4a4 4 0 0 0 8 0v-4"/><path d="M15 10v4a4 4 0 0 0 8 0v-4"/></svg>,
  ArrowRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
};

interface GameOverModalProps {
  winner: Role;
  mode: GameModeType;
  killer: Character | undefined;
  detective: Character | undefined;
  elapsedTime: string;
  onRestart: () => void;
}

export const GameOverModal = ({
  winner,
  mode,
  killer,
  detective,
  elapsedTime,
  onRestart,
}: GameOverModalProps) => {
  let killerTitle = 'Бандит';
  let detectiveTitle = 'Инспектор';

  if (mode === 'MANIAC_VS_OPERATIVE') {
    killerTitle = 'Маньяк';
    detectiveTitle = 'Оперативник';
  } else if (mode === 'SECRET_SERVICE') {
    killerTitle = 'Фантом';
    detectiveTitle = 'Призрак';
  }

  const isKillerWin = winner === 'KILLER';
  const winnerTitle = isKillerWin ? killerTitle : detectiveTitle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080a0f]/95 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 text-center flex flex-col items-center">
        
        <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-4">
          Протокол закрытия дела
        </div>

        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border shadow-lg ${
            isKillerWin
              ? 'bg-red-950/30 border-red-500/50 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
              : 'bg-cyan-950/30 border-cyan-500/50 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
          }`}
        >
          {isKillerWin ? <Icons.Skull /> : <Icons.Scales />}
        </div>

        <h3 className="text-2xl font-black uppercase tracking-widest text-zinc-100 mb-2">
          Победа: {winnerTitle}
        </h3>
        
        <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest mb-8">
          Время проведения операции: {elapsedTime}
        </p>

        <div className="w-full grid grid-cols-2 gap-3 mb-8 text-left">
          <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl flex flex-col justify-between">
            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-2">
              {killerTitle}
            </span>
            <span className="text-sm font-black text-zinc-100 block mb-2 uppercase tracking-wider truncate">
              {killer?.name ?? 'Неизвестно'}
            </span>
            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
              Статус: {killer?.isAlive ? 'Жив' : 'Ликвидирован'}
            </span>
          </div>

          <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl flex flex-col justify-between">
            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest block mb-2">
              {detectiveTitle}
            </span>
            <span className="text-sm font-black text-zinc-100 block mb-2 uppercase tracking-wider truncate">
              {detective?.name ?? 'Неизвестно'}
            </span>
            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
              Статус: {detective?.isAlive ? 'Жив' : 'Ликвидирован'}
            </span>
          </div>
        </div>

        <button
          onClick={onRestart}
          className={`w-full h-14 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition shadow-lg border-t border-white/25 ${
            isKillerWin
              ? 'bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white shadow-[0_10px_25px_rgba(220,38,38,0.5)]'
              : 'bg-gradient-to-r from-cyan-700 to-cyan-600 hover:from-cyan-600 hover:to-cyan-500 text-white shadow-[0_10px_25px_rgba(6,182,212,0.5)]'
          }`}
        >
          <span>Новое расследование</span>
          <Icons.ArrowRight />
        </button>
      </div>
    </div>
  );
};