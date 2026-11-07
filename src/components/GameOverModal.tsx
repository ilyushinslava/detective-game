import React from 'react';
import type { Character, GameModeType, Role } from '../types/game';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

export interface GameOverModalProps {
  winner: Role;
  playerRole?: Role;
  mode?: GameModeType;
  killer?: Character;
  detective?: Character;
  elapsedTime: string;
  isMultiplayer?: boolean;
  onRestart?: () => void;
  onExitToMenu?: () => void;
  onRematchSwap?: () => void;
  onRematchRandom?: () => void;
  onRematchSame?: () => void;
}

const Icons = {
  Trophy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 4h12v7a6 6 0 0 1-12 0V4z" />
    </svg>
  ),
  Crosshair: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
};

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  playerRole,
  mode = 'MANIAC_VS_OPERATIVE',
  killer,
  detective,
  elapsedTime,
  isMultiplayer = false,
  onRestart,
  onExitToMenu,
  onRematchSwap,
  onRematchRandom,
  onRematchSame,
}) => {
  const isVictory = playerRole ? winner === playerRole : true;

  const killerTitle =
    mode === 'THIEF_HUNT' ? 'Грабитель' :
    mode === 'SECRET_SERVICE' ? 'Фантом' :
    mode === 'LINE_UP' ? 'Подозреваемый' : 'Маньяк';

  const detectiveTitle =
    mode === 'THIEF_HUNT' ? 'Полиция' :
    mode === 'SECRET_SERVICE' ? 'Призрак' :
    mode === 'LINE_UP' ? 'Следователь' : 'Оперативник';

  const winnerTitle = winner === 'KILLER' ? killerTitle : detectiveTitle;

  const renderRoleCard = (char?: Character, roleName?: string, isKillerSide?: boolean) => {
    return (
      <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-2.5 flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 border ${
            isKillerSide
              ? 'bg-red-950/40 border-red-500/40 text-red-400'
              : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-400'
          }`}
        >
          {char ? `#${char.id.replace('c', '').padStart(2, '0')}` : '??'}
        </div>
        <div className="overflow-hidden">
          <span className="text-[9px] font-black tracking-widest text-[#a1a1aa] uppercase block">
            {roleName}
          </span>
          <span className="text-xs font-black tracking-wider text-[#f1f5f9] uppercase truncate block">
            {char ? char.name : 'Не раскрыт'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={true}
      maxWidth="max-w-md"
      className="items-center p-6 sm:p-8"
    >
      <div className="text-[10px] font-semibold tracking-wider text-[#a1a1aa] uppercase mb-4">
        Протокол закрытия дела
      </div>

      <div
        className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 border shadow-lg ${
          isVictory
            ? 'bg-zinc-900/60 border-zinc-400/50 text-zinc-100 shadow-[0_0_30px_rgba(255,255,255,0.1)]'
            : 'bg-red-950/30 border-red-500/50 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
        }`}
      >
        {isVictory ? <Icons.Trophy /> : <Icons.Crosshair />}
      </div>

      <h3 className="text-2xl font-black uppercase tracking-widest text-[#f1f5f9] mb-1">
        {playerRole ? (isVictory ? 'Победа' : 'Поражение') : `Победа: ${winnerTitle}`}
      </h3>

      <p className="text-[10px] font-medium tracking-normal text-[#a1a1aa] uppercase mb-6">
        Время операции: <span className="font-mono font-bold text-zinc-200">{elapsedTime}</span>
      </p>

      <div className="w-full grid grid-cols-2 gap-3 mb-6 text-left">
        {renderRoleCard(killer, killerTitle, true)}
        {renderRoleCard(detective, detectiveTitle, false)}
      </div>

      {isMultiplayer ? (
        <div className="flex flex-col gap-2.5 w-full">
          <Button
            variant="primary-danger"
            fullWidth
            onClick={onRematchSwap}
            className="from-red-950 text-[10px] sm:text-xs uppercase tracking-wider gap-2 !h-12"
          >
            <span>⇄</span> РЕВАНШ (СМЕНА РОЛЕЙ)
          </Button>

          <Button
            variant="primary-info"
            fullWidth
            onClick={onRematchRandom}
            className="from-blue-950 text-[10px] sm:text-xs uppercase tracking-wider gap-2 !h-12"
          >
            <span className="font-mono font-bold text-[10px] text-cyan-300">[RND]</span> РЕВАНШ (СЛУЧАЙНЫЕ РОЛИ)
          </Button>

          <Button
            variant="secondary"
            fullWidth
            onClick={onRematchSame}
            className="text-[10px] sm:text-xs uppercase tracking-wider gap-2 !h-12"
          >
            <span>↻</span> РЕВАНШ (ТЕ ЖЕ РОЛИ)
          </Button>
        </div>
      ) : (
        <Button
          variant={isVictory ? 'secondary' : 'primary-danger'}
          fullWidth
          onClick={onRestart}
          className="rounded-full font-black text-[10px] uppercase tracking-widest gap-3 shadow-lg"
        >
          <span>Новое расследование</span>
          <Icons.ArrowRight />
        </Button>
      )}

      <Button
        variant="ghost"
        fullWidth
        onClick={onExitToMenu}
        className="mt-2.5 rounded-full font-black text-[10px] uppercase tracking-widest gap-2 text-zinc-400 hover:text-zinc-200"
      >
        <span>В главное меню</span>
      </Button>
    </Modal>
  );
};
