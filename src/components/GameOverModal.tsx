import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  characterImages?: Record<string, { default: string }>;
  onRestart?: () => void;
  onExitToMenu?: () => void;
  onRematchSwap?: () => void;
  onRematchRandom?: () => void;
  onRematchSame?: () => void;
}

const localCharacterImages = import.meta.glob<{ default: string }>(
  '../assets/characters/*.webp',
  { eager: true }
);

const getCharacterImageUrl = (
  id?: string,
  customImages?: Record<string, { default: string }>
): string | undefined => {
  if (!id) return undefined;
  const filename = `${id}.webp`;

  if (customImages) {
    if (customImages[`./assets/characters/${filename}`]?.default) {
      return customImages[`./assets/characters/${filename}`].default;
    }
    if (customImages[`../assets/characters/${filename}`]?.default) {
      return customImages[`../assets/characters/${filename}`].default;
    }
    if (customImages[id]?.default) {
      return customImages[id].default;
    }
  }

  return localCharacterImages[`../assets/characters/${filename}`]?.default;
};

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
  Search: ({ className = "w-3 h-3" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
  characterImages,
  onRestart,
  onExitToMenu,
  onRematchSwap,
  onRematchRandom,
  onRematchSame,
}) => {
  const [selectedPhotoChar, setSelectedPhotoChar] = useState<Character | null>(null);

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
    const isCharWinner = isKillerSide ? winner === 'KILLER' : winner === 'DETECTIVE';
    const imgUrl = getCharacterImageUrl(char?.id, characterImages);
    const charNumber = char ? `#${char.id.replace('c', '').padStart(2, '0')}` : '??';

    return (
      <div
        onClick={() => {
          if (char && imgUrl) {
            setSelectedPhotoChar(char);
          }
        }}
        className={`group relative h-44 sm:h-48 overflow-hidden rounded-2xl flex flex-col justify-between p-3 select-none transition-all duration-200 ${
          isCharWinner
            ? 'border border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.12)] bg-zinc-950'
            : 'border border-white/5 bg-zinc-950/60'
        } ${char && imgUrl ? 'cursor-pointer active:scale-[0.98]' : ''}`}
      >
        {imgUrl ? (
          <>
            <img
              src={imgUrl}
              alt={char?.name || roleName}
              className={`absolute inset-0 w-full h-full object-cover contrast-125 transition-transform duration-300 group-hover:scale-105 ${
                isCharWinner ? 'grayscale opacity-100' : 'grayscale opacity-40'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-zinc-950/70" />
          </>
        ) : (
          <div className="absolute inset-0 bg-zinc-900/60 flex items-center justify-center">
            <span className="font-mono font-bold text-2xl text-zinc-700">{charNumber}</span>
          </div>
        )}

        <div className="relative z-10 flex items-center justify-between w-full">
          {isCharWinner ? (
            <span className="bg-white text-zinc-950 font-black font-mono text-[9px] uppercase px-2 py-0.5 rounded shadow-sm">
              ПОБЕДИТЕЛЬ
            </span>
          ) : (
            <span className="bg-zinc-900 text-zinc-500 border border-white/5 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded">
              ПОРАЖЕНИЕ
            </span>
          )}
          <span className="font-mono font-bold text-[10px] text-zinc-300 drop-shadow-sm">
            {charNumber}
          </span>
        </div>

        <div className="relative z-10 mt-auto pr-5">
          <span className="text-[10px] font-black tracking-widest text-zinc-300 uppercase block mb-1 drop-shadow-sm">
            {roleName}
          </span>
          <span className="text-xs sm:text-sm font-bold uppercase leading-tight drop-shadow-md text-white block break-words">
            {char ? char.name : 'Не раскрыт'}
          </span>
        </div>

        {char && imgUrl && (
          <div className="absolute bottom-2.5 right-2.5 z-10 w-5 h-5 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
            <Icons.Search className="w-3 h-3" />
          </div>
        )}
      </div>
    );
  };

  const selectedImgUrl = selectedPhotoChar
    ? getCharacterImageUrl(selectedPhotoChar.id, characterImages)
    : undefined;

  return (
    <>
      <AnimatePresence>
        {selectedPhotoChar && selectedImgUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 select-none cursor-pointer"
            onClick={() => setSelectedPhotoChar(null)}
          >
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedPhotoChar(null)}
              className="absolute top-6 right-6 w-10 h-10 bg-zinc-900/80 border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer z-10"
            >
              ✕
            </motion.button>

            <motion.div
              layoutId={`game-over-photo-${selectedPhotoChar.id}`}
              transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.8 }}
              className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.9)] bg-zinc-950"
              onClick={() => setSelectedPhotoChar(null)}
            >
              <img
                src={selectedImgUrl}
                alt={selectedPhotoChar.name}
                className="w-full h-full object-cover grayscale contrast-125"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-6 pt-20 flex flex-col items-center text-center">
                <span className="text-xs font-mono text-zinc-400 mb-2">
                  #{selectedPhotoChar.id.replace('c', '').padStart(2, '0')}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#f1f5f9] uppercase tracking-wider leading-tight">
                  {selectedPhotoChar.name}
                </h2>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

        <p className="text-[10px] font-medium tracking-normal text-[#a1a1aa] uppercase mb-5">
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
          <button
            type="button"
            onClick={onRestart}
            className="bg-zinc-100 hover:bg-white text-zinc-950 font-black tracking-wider uppercase rounded-2xl rounded-full h-12 w-full active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm shadow-lg cursor-pointer"
          >
            <span>НОВОЕ РАССЛЕДОВАНИЕ</span>
            <Icons.ArrowRight />
          </button>
        )}

        <button
          type="button"
          onClick={onExitToMenu}
          className="text-zinc-400 hover:text-zinc-200 text-xs font-bold uppercase tracking-wider py-3 mt-2.5 w-full transition-colors cursor-pointer"
        >
          <span>В главное меню</span>
        </button>
      </Modal>
    </>
  );
};
