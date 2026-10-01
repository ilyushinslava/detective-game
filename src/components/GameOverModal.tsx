import type { Role, Character, GameModeType } from '../types/game';

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
    killerTitle = 'Агент «Восток»';
    detectiveTitle = 'Агент «Запад»';
  }

  const isKillerWin = winner === 'KILLER';
  const winnerTitle = isKillerWin ? killerTitle : detectiveTitle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-center flex flex-col items-center">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black mb-4 border ${
            isKillerWin
              ? 'bg-red-950/80 border-red-700 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
              : 'bg-blue-950/80 border-blue-700 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
          }`}
        >
          {isKillerWin ? '☠' : '⚖'}
        </div>

        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-zinc-100">
          Победа стороны: {winnerTitle}!
        </h3>
        
        <p className="text-xs text-zinc-400 mt-1 font-mono">
          Время проведения операции: {elapsedTime}
        </p>

        {/* Раскрытие личностей с четким читаемым шрифтом */}
        <div className="w-full grid grid-cols-2 gap-3 my-6 text-left">
          <div className="p-3 bg-zinc-950 border border-red-950/80 rounded-xl">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
              {killerTitle}
            </span>
            <span className="text-sm font-bold text-zinc-100 block mt-1 tracking-normal">
              {killer?.name ?? 'Неизвестно'}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono mt-0.5 block">
              Статус: {killer?.isAlive ? 'Жив' : 'Ликвидирован'}
            </span>
          </div>

          <div className="p-3 bg-zinc-950 border border-blue-950/80 rounded-xl">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
              {detectiveTitle}
            </span>
            <span className="text-sm font-bold text-zinc-100 block mt-1 tracking-normal">
              {detective?.name ?? 'Неизвестно'}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono mt-0.5 block">
              Статус: {detective?.isAlive ? 'Жив' : 'Ликвидирован'}
            </span>
          </div>
        </div>

        {/* Кнопка с крупной, четко видимой стрелкой */}
        <button
          onClick={onRestart}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
        >
          <span>Новая операция</span>
          <span className="text-base leading-none">➔</span>
        </button>
      </div>
    </div>
  );
};
