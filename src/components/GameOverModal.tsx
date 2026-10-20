import type { Role, Character, GameModeType } from '../types/game';

const characterImages = import.meta.glob<{ default: string }>(
  '../assets/characters/*.webp',
  { eager: true }
);

const Icons = {
  Trophy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 4h12v6a6 6 0 0 1-12 0V4z" />
    </svg>
  ),
  Crosshair: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10">
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
};

interface GameOverModalProps {
  winner: Role;
  mode: GameModeType;
  killer?: Character | undefined;
  detective?: Character | undefined;
  elapsedTime: string;
  onRestart: () => void;
  onExitToMenu?: () => void;
  playerRole?: Role;
}

export const GameOverModal = ({
  winner,
  mode,
  killer,
  detective,
  elapsedTime,
  onRestart,
  onExitToMenu,
  playerRole,
}: GameOverModalProps) => {
  let killerTitle = 'Бандит';
  let detectiveTitle = 'Инспектор';

  if (mode === 'MANIAC_VS_OPERATIVE') {
    killerTitle = 'Маньяк';
    detectiveTitle = 'Оперативник';
  } else if (mode === 'SECRET_SERVICE') {
    killerTitle = 'Фантом';
    detectiveTitle = 'Призрак';
  } else if (mode === 'THIEF_HUNT') {
    killerTitle = 'Грабитель';
    detectiveTitle = 'Полиция';
  } else if (mode === 'LINE_UP') {
    killerTitle = 'Подозреваемый';
    detectiveTitle = 'Следователь';
  }

  const isKillerWin = winner === 'KILLER';
  const winnerTitle = isKillerWin ? killerTitle : detectiveTitle;
  const isVictory = playerRole ? winner === playerRole : true;

  const renderRoleCard = (char: Character | undefined, roleName: string, isRedTheme: boolean) => {
    const img = char?.id ? characterImages[`../assets/characters/${char.id}.webp`]?.default : null;

    return (
      <div className="relative overflow-hidden p-3.5 bg-zinc-900/60 border border-white/10 rounded-2xl flex flex-col justify-between min-h-[140px] shadow-lg">
        {img && (
          <img
            src={img}
            alt={char?.name || roleName}
            className="absolute inset-0 w-full h-full object-cover opacity-25 grayscale contrast-125 pointer-events-none"
          />
        )}
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <span
              className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${
                isRedTheme ? 'text-red-400' : 'text-cyan-400'
              }`}
            >
              {roleName}
            </span>
            <span className="text-sm font-black text-zinc-100 uppercase tracking-wider block">
              {char?.name ?? 'Неизвестно'}
            </span>
          </div>

          {char?.id && (
            <span className="text-[9px] font-mono text-zinc-500 uppercase mt-2">
              #{char.id.replace('c', '').padStart(2, '0')}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080a0f]/95 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] p-6 sm:p-8 text-center flex flex-col items-center">
        <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-4">
          Протокол закрытия дела
        </div>

        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 border shadow-lg ${
            isVictory
              ? 'bg-amber-950/30 border-amber-500/50 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
              : 'bg-red-950/30 border-red-500/50 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
          }`}
        >
          {isVictory ? <Icons.Trophy /> : <Icons.Crosshair />}
        </div>

        <h3 className="text-2xl font-black uppercase tracking-widest text-zinc-100 mb-1">
          {playerRole ? (isVictory ? 'Победа' : 'Поражение') : `Победа: ${winnerTitle}`}
        </h3>

        <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest mb-6">
          Время операции: {elapsedTime}
        </p>

        <div className="w-full grid grid-cols-2 gap-3 mb-6 text-left">
          {renderRoleCard(killer, killerTitle, true)}
          {renderRoleCard(detective, detectiveTitle, false)}
        </div>

        <button
          onClick={onRestart}
          className={`w-full h-14 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition shadow-lg border-t border-white/25 cursor-pointer ${
            isVictory
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-zinc-950 shadow-[0_10px_25px_rgba(245,158,11,0.4)]'
              : 'bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white shadow-[0_10px_25px_rgba(220,38,38,0.5)]'
          }`}
        >
          <span>Новое расследование</span>
          <Icons.ArrowRight />
        </button>

        <button
          onClick={onExitToMenu}
          className="w-full h-11 mt-2.5 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/10 transition cursor-pointer"
        >
          <span>В главное меню</span>
        </button>
      </div>
    </div>
  );
};
