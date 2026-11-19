import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Character, GameModeType, Role } from '../types/game';
import { getKillerRoleName, getDetectiveRoleName } from '../constants/gameMeta';
import { Modal } from './ui/Modal';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import { useTranslation } from '../i18n/context';
import {
  RatingDeltaBadge,
  GameOverRoleCard,
  GameOverActions,
} from './gameOver';

export interface GameOverModalProps {
  winner: Role;
  playerRole?: Role;
  mode?: GameModeType;
  killer?: Character;
  detective?: Character;
  elapsedTime: string;
  isMultiplayer?: boolean;
  characterImages?: Record<string, { default: string }>;
  rating?: number;
  ratingDelta?: number;
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
  rating,
  ratingDelta,
  onRestart,
  onExitToMenu,
  onRematchSwap,
  onRematchRandom,
  onRematchSame,
}) => {
  useSpatialNavigation({ initialFocusSelector: '[data-dpad-primary="true"]' });
  const { t } = useTranslation();
  const go = t?.gameOver || {
    protocol: "Протокол закрытия дела",
    victoryPrefix: "ПОБЕДА:",
    caseSolved: "ДЕЛО РАСКРЫТО",
    yourVictory: "ВАША ПОБЕДА",
    yourDefeat: "ВАШЕ ПОРАЖЕНИЕ",
    rating: "Рейтинг:",
    operationTime: "Время операции:",
    winner: "ПОБЕДИТЕЛЬ",
    defeat: "ПОРАЖЕНИЕ",
    unrevealed: "Не раскрыт",
    rematchSwap: "РЕВАНШ (СМЕНА РОЛЕЙ)",
    rematchRandom: "РЕВАНШ (СЛУЧАЙНЫЕ РОЛИ)",
    rematchSame: "РЕВАНШ (ТЕ ЖЕ РОЛИ)",
    restart: "Новое расследование",
    exitToMenu: "В главное меню",
  };
  const [selectedPhotoChar, setSelectedPhotoChar] = useState<Character | null>(null);

  const isVictory = playerRole ? winner === playerRole : true;
  const isKillerWinner = winner === 'KILLER';

  const killerTitle = getKillerRoleName(mode);
  const detectiveTitle = getDetectiveRoleName(mode);

  const headlineText = isKillerWinner
    ? `${go.victoryPrefix} ${killerTitle.toUpperCase()}`
    : go.caseSolved;

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
            className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none cursor-pointer"
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
                <h2 className="text-2xl sm:text-3xl font-black text-zinc-100 uppercase tracking-wider leading-tight">
                  {selectedPhotoChar.name}
                </h2>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={true}
        maxWidth="max-w-md sm:max-w-lg"
        overlayClassName="bg-black/90 backdrop-blur-3xl"
        className={`items-center p-6 sm:p-8 rounded-3xl border transition-all duration-500 ${
          isKillerWinner
            ? 'border-rose-500/30 bg-gradient-to-b from-red-950/30 via-zinc-950 to-black/95 shadow-[0_0_40px_rgba(244,63,94,0.2)]'
            : 'border-blue-500/30 bg-gradient-to-b from-blue-950/30 via-zinc-950 to-black/95 shadow-[0_0_40px_rgba(59,130,246,0.2)]'
        }`}
      >
        <div className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase mb-4">
          {go.protocol}
        </div>

        {/* Драматичное свечение победителю: рубиновое для маньяка, сапфировое для оперативника */}
        <div
          className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-4 border transition-all duration-500 ${
            isKillerWinner
              ? 'bg-gradient-to-br from-red-950/90 via-rose-900/50 to-black/90 border-rose-500/70 text-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.4)] ring-1 ring-rose-400/40'
              : 'bg-gradient-to-br from-blue-950/90 via-blue-900/40 to-black/90 border-blue-500/70 text-blue-300 shadow-[0_0_40px_rgba(59,130,246,0.4)] ring-1 ring-blue-400/40'
          }`}
        >
          {isKillerWinner ? <Icons.Crosshair /> : <Icons.Trophy />}
        </div>

        {/* Акцидентный заголовок Neo-Noir */}
        <h3
          className={`font-display text-4xl sm:text-5xl 2xl:text-6xl font-black uppercase tracking-wider mb-2 leading-tight text-center ${
            isKillerWinner
              ? 'text-rose-400 drop-shadow-[0_0_25px_rgba(244,63,94,0.5)]'
              : 'text-blue-400 drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]'
          }`}
        >
          {headlineText}
        </h3>

        {playerRole && (
          <div
            className={`text-[10px] sm:text-xs font-mono font-black uppercase tracking-widest px-3 py-1 rounded-full border mb-3 ${
              isVictory
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-red-950/80 text-red-300 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
            }`}
          >
            {isVictory ? go.yourVictory : go.yourDefeat}
          </div>
        )}

        <RatingDeltaBadge
          label={go.rating}
          rating={rating}
          ratingDelta={ratingDelta}
        />

        <p className="text-[10px] sm:text-xs font-medium tracking-normal text-zinc-400 uppercase mb-5">
          {go.operationTime} <span className="font-mono font-bold text-zinc-200">{elapsedTime}</span>
        </p>

        <div className="w-full grid grid-cols-2 gap-3 mb-6 text-left">
          <GameOverRoleCard
            char={killer}
            roleName={killerTitle}
            isKillerSide={true}
            isKillerWinner={isKillerWinner}
            imgUrl={getCharacterImageUrl(killer?.id, characterImages)}
            winnerLabel={go.winner}
            defeatLabel={go.defeat}
            unrevealedLabel={go.unrevealed}
            onSelectPhoto={setSelectedPhotoChar}
          />
          <GameOverRoleCard
            char={detective}
            roleName={detectiveTitle}
            isKillerSide={false}
            isKillerWinner={isKillerWinner}
            imgUrl={getCharacterImageUrl(detective?.id, characterImages)}
            winnerLabel={go.winner}
            defeatLabel={go.defeat}
            unrevealedLabel={go.unrevealed}
            onSelectPhoto={setSelectedPhotoChar}
          />
        </div>

        <GameOverActions
          isMultiplayer={isMultiplayer}
          onRestart={onRestart}
          onExitToMenu={onExitToMenu}
          onRematchSwap={onRematchSwap}
          onRematchRandom={onRematchRandom}
          onRematchSame={onRematchSame}
          translations={go}
        />
      </Modal>
    </>
  );
};
