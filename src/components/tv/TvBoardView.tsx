import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { App as CapApp } from '@capacitor/app';
import { GameOverModal } from '../GameOverModal';
import { ActionIcons } from '../ui/ActionIcons';
import { renderSilhouette } from '../CharacterCard';
import { getCharacterPortraitPath } from '../../constants/characterImages';
import type { GameState, LastShift, GameModeType } from '../../types/game';
import { SPY_COLORS } from '../../types/game';
import { getGameModeTitle } from '../../constants/gameMeta';
import { partyService } from '../../utils/partyPeer';
import { useSpatialNavigation } from '../../hooks/useSpatialNavigation';

export interface TvBoardViewProps {
  gameState: GameState;
  selectedLine?: LastShift | { type: 'ROW' | 'COL'; index: number; direction?: 'FORWARD' | 'BACKWARD' } | null;
  secondsLeft?: number;
  onExit?: () => void;
  onRestart?: () => void;
  disconnectedPlayer?: { role?: string; graceTimeoutSec: number } | null;
  hideExit?: boolean;
}

const Icons = {
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Radar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  ArrowDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  ),
  ArrowUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),
  Terminal: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Crosshair: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  ),
};

interface TvCellProps {
  char: any;
  index: number;
  isLineActive: boolean;
  inRadarCenter: boolean;
  inRadarArea: boolean;
  isTargetVictim: boolean;
  isUniformedOfficer: boolean;
  mode: GameModeType;
  selectedLineDir?: 'FORWARD' | 'BACKWARD' | null;
  selectedLineType?: 'ROW' | 'COL' | null;
  boardSize: number;
  row: number;
  col: number;
}

const TvCell: React.FC<TvCellProps> = ({
  char,
  index,
  isLineActive,
  inRadarCenter,
  inRadarArea,
  isTargetVictim,
  isUniformedOfficer,
  mode,
  selectedLineDir,
  selectedLineType,
  boardSize,
  row,
  col,
}) => {
  const [imgError, setImgError] = useState(false);
  const isDead = !char.isAlive;
  const isExonerated = char.isExonerated && !isDead;
  const isSecretService = mode === 'SECRET_SERVICE';
  const portraitUrl = getCharacterPortraitPath(char.id);

  return (
    <motion.div
      layout="position"
      layoutId={`tv_card_${char.id}`}
      transition={{ type: 'spring', damping: 28, stiffness: 180, mass: 0.9 }}
      className={`relative w-full aspect-square rounded-xl sm:rounded-2xl overflow-hidden backdrop-blur-md border transition-all duration-300 flex flex-col justify-between select-none shadow-md ${
        isLineActive
          ? 'border-cyan-400 border-t-2 border-t-white bg-gradient-to-b from-cyan-950/70 via-blue-950/90 to-black shadow-[0_0_35px_rgba(6,182,212,0.7)] scale-[1.03] z-30 ring-2 ring-cyan-300/80'
          : inRadarCenter
            ? 'border-rose-500 border-t-2 border-t-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.65)] bg-gradient-to-b from-red-950/70 to-black z-20'
            : inRadarArea
              ? 'border-blue-400/80 border-t-2 border-t-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.45)] bg-gradient-to-b from-blue-950/50 to-black z-10'
              : 'border-white/15 bg-gradient-to-b from-white/[0.08] via-zinc-900/80 to-black/90 hover:border-white/30 shadow-[0_4px_16px_rgba(0,0,0,0.6)]'
      }`}
    >
      {/* 1. Фоновое изображение персонажа или силуэт (bg-cover bg-center) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {!imgError && portraitUrl ? (
          <img
            src={portraitUrl}
            alt={char.name}
            className={`w-full h-full object-cover object-center ${
              isDead ? 'grayscale opacity-35 brightness-75' : 'opacity-90 contrast-110'
            }`}
            onError={() => setImgError(true)}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-30">
            {renderSilhouette(char.id)}
          </div>
        )}
      </div>

      {/* 2. Тонкий стеклянный блик на верхней кромке карточки */}
      <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white/[0.1] to-transparent pointer-events-none rounded-t-xl z-[1]" />

      {/* 3. Верхняя сервисная строчка (Номер ячейки и статусы офицера/прицела) */}
      <div className="flex items-center justify-between p-1 sm:p-1.5 z-10 w-full pointer-events-none">
        <span
          className={`text-[9px] sm:text-[11px] 2xl:text-xs font-mono font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${
            isDead
              ? 'bg-black/70 text-zinc-500 line-through'
              : isExonerated
                ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                : 'bg-black/60 text-zinc-300 border border-white/10'
          }`}
        >
          #{char.id.replace('c', '').padStart(2, '0')}
        </span>

        <div className="flex items-center gap-1">
          {isTargetVictim && !isDead && (
            <span className="p-0.5 sm:p-1 rounded bg-red-950/90 border border-red-500/70 text-rose-400 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.7)]">
              <Icons.Crosshair />
            </span>
          )}
          {isUniformedOfficer && !isDead && (
            <span className="p-0.5 sm:p-1 rounded bg-blue-950/90 border border-blue-500/70 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]">
              <Icons.Shield />
            </span>
          )}
          {inRadarCenter && !isDead && (
            <span className="p-0.5 sm:p-1 rounded bg-blue-950/90 border border-blue-500/70 text-blue-300 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]">
              <Icons.Radar />
            </span>
          )}
        </div>
      </div>

      {/* 4. Центральные статус-штампы (УБИТ, РАСКРЫТ, АЛИБИ, АРЕСТОВАН) */}
      {isDead && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none px-1">
          <div className="transform -rotate-12 border border-red-600 bg-red-950/95 text-red-300 whitespace-nowrap font-black uppercase tracking-wider text-[9px] sm:text-xs 2xl:text-sm px-2 py-0.5 rounded shadow-[0_0_15px_rgba(220,38,38,0.7)] backdrop-blur-sm text-center">
            {isSecretService || char.unmaskedSpyIndex !== undefined ? 'РАСКРЫТ' : char.isArrested ? 'АРЕСТОВАН' : 'УБИТ'}
          </div>
        </div>
      )}

      {isExonerated && !isDead && !char.isArrested && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none px-1">
          <div className="transform rotate-6 border border-blue-500/80 bg-zinc-950/95 text-blue-400 whitespace-nowrap font-black uppercase tracking-wider text-[9px] sm:text-xs 2xl:text-sm px-2 py-0.5 rounded shadow-[0_0_12px_rgba(59,130,246,0.4)] backdrop-blur-sm text-center">
            АЛИБИ
          </div>
        </div>
      )}

      {char.isArrested && !isDead && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none px-1">
          <div className="transform -rotate-12 border border-blue-500/80 bg-blue-950/95 text-blue-300 whitespace-nowrap font-black uppercase tracking-wider text-[9px] sm:text-xs 2xl:text-sm px-2 py-0.5 rounded shadow-[0_0_12px_rgba(59,130,246,0.5)] backdrop-blur-sm text-center">
            АРЕСТОВАН
          </div>
        </div>
      )}

      {/* 5. Стрелки направления маневра на крайних карточках выбранной линии */}
      <AnimatePresence>
        {isLineActive && selectedLineDir && (
          ((selectedLineType === 'ROW' && ((selectedLineDir === 'FORWARD' && col === boardSize - 1) || (selectedLineDir === 'BACKWARD' && col === 0))) ||
           (selectedLineType === 'COL' && ((selectedLineDir === 'FORWARD' && row === boardSize - 1) || (selectedLineDir === 'BACKWARD' && row === 0)))) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-xs rounded-xl"
            >
              <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.9)] animate-pulse">
                {selectedLineType === 'ROW'
                  ? (selectedLineDir === 'FORWARD' ? <Icons.ArrowRight /> : <Icons.ArrowLeft />)
                  : (selectedLineDir === 'FORWARD' ? <Icons.ArrowDown /> : <Icons.ArrowUp />)}
              </span>
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* 6. Имя персонажа строго внизу с градиентной подложкой от черного к прозрачному */}
      <div className="absolute inset-x-0 bottom-0 z-10 pt-5 pb-1 sm:pb-1.5 px-1 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex items-end justify-center pointer-events-none">
        <span
          title={char.name}
          className="block w-full font-bold text-zinc-100 uppercase tracking-tight whitespace-normal text-center leading-[1.1] text-[10px] sm:text-[11px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] font-sans"
        >
          {char.name}
        </span>
      </div>
    </motion.div>
  );
};

export const TvBoardView: React.FC<TvBoardViewProps> = ({
  gameState,
  selectedLine = null,
  secondsLeft = 60,
  onExit,
  onRestart,
  disconnectedPlayer,
  hideExit = false,
}) => {
  useSpatialNavigation({ initialFocusSelector: '[data-tv-focus-primary="true"]' });

  const [focusedControl, setFocusedControl] = useState<'NONE' | 'CONTINUE' | 'RESTART' | 'EXIT'>('NONE');
  const [isPauseOpen, setIsPauseOpen] = useState<boolean>(false);
  const [internalDisconnected, setInternalDisconnected] = useState<{ role?: string; graceTimeoutSec: number } | null>(null);
  const [tvGraceLeft, setTvGraceLeft] = useState(60);

  const activeDisconnected = disconnectedPlayer ?? internalDisconnected;

  // Слушатель событий дисконнекта игроков
  useEffect(() => {
    const handleDisc = (info: { role?: string; graceTimeoutSec: number }) => {
      setInternalDisconnected(info);
      setTvGraceLeft(info.graceTimeoutSec || 60);
    };
    const handleRec = () => {
      setInternalDisconnected(null);
    };

    const prevDisc = partyService.onPlayerDisconnected;
    const prevRec = partyService.onPlayerReconnected;

    partyService.onPlayerDisconnected = (info: any) => {
      handleDisc(info);
      prevDisc?.(info);
    };
    partyService.onPlayerReconnected = (info: any) => {
      handleRec();
      prevRec?.(info);
    };

    return () => {
      partyService.onPlayerDisconnected = prevDisc;
      partyService.onPlayerReconnected = prevRec;
    };
  }, []);

  // Таймер грейс-периода связи
  useEffect(() => {
    if (!activeDisconnected) return;
    const interval = setInterval(() => {
      setTvGraceLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeDisconnected]);

  // Перехват аппаратной кнопки Назад на Android TV через Capacitor App API
  useEffect(() => {
    let listenerHandle: any = null;
    let isMounted = true;

    try {
      CapApp.addListener('backButton', () => {
        setIsPauseOpen((prev) => {
          const next = !prev;
          setFocusedControl(next ? 'CONTINUE' : 'NONE');
          return next;
        });
      }).then((handle) => {
        if (isMounted) {
          listenerHandle = handle;
        } else {
          handle?.remove?.();
        }
      }).catch(() => {
        // Окружение без Capacitor App плагина (браузер / тесты)
      });
    } catch {
      // Защитный fallback
    }

    const handleDomBackButton = (e: Event) => {
      e.preventDefault();
      setIsPauseOpen((prev) => {
        const next = !prev;
        setFocusedControl(next ? 'CONTINUE' : 'NONE');
        return next;
      });
    };
    document.addEventListener('backbutton', handleDomBackButton);

    return () => {
      isMounted = false;
      document.removeEventListener('backbutton', handleDomBackButton);
      try {
        listenerHandle?.remove?.();
      } catch {
        // Защитный fallback
      }
    };
  }, []);

  // Обработчик клавиатуры и ТВ-пульта: изоляция паузы и навигации
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape / Back (ESCAPE = 27, KEYCODE_BACK = 4, Backspace, BrowserBack)
      if (
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.key === 'BrowserBack' ||
        e.keyCode === 27 ||
        e.keyCode === 4 ||
        e.keyCode === 8
      ) {
        e.preventDefault();
        e.stopPropagation();
        setIsPauseOpen((prev) => {
          const next = !prev;
          setFocusedControl(next ? 'CONTINUE' : 'NONE');
          return next;
        });
        return;
      }

      // Если модалка паузы ЗАКРЫТА: стрелки D-Pad НЕ открывают паузу!
      if (!isPauseOpen) {
        if (gameState?.winner && (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32 || e.keyCode === 23 || e.keyCode === 66)) {
          e.preventDefault();
          if (onExit) onExit();
        }
        return;
      }

      // Модалка паузы ОТКРЫТА: управляем фокусом контролов с пульта
      // D-Pad Left: фокус на Реванш (НАЧАТЬ ЗАНОВО)
      if (e.key === 'ArrowLeft' || e.keyCode === 37 || e.keyCode === 21) {
        e.preventDefault();
        if (onRestart) setFocusedControl('RESTART');
        return;
      }

      // D-Pad Right: фокус на Выход
      if (e.key === 'ArrowRight' || e.keyCode === 39 || e.keyCode === 22) {
        e.preventDefault();
        if (onExit && !hideExit) setFocusedControl('EXIT');
        return;
      }

      // D-Pad Up: фокус на Продолжить
      if (e.key === 'ArrowUp' || e.keyCode === 38 || e.keyCode === 19) {
        e.preventDefault();
        setFocusedControl('CONTINUE');
        return;
      }

      // D-Pad Down: фокус на Выход (или Реванш)
      if (e.key === 'ArrowDown' || e.keyCode === 40 || e.keyCode === 20) {
        e.preventDefault();
        if (onExit && !hideExit) setFocusedControl('EXIT');
        else if (onRestart) setFocusedControl('RESTART');
        return;
      }

      // Enter / Select (DPAD_CENTER = 23, ENTER = 66, Space = 32, Enter = 13) -> выполнение действия
      if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32 || e.keyCode === 23 || e.keyCode === 66) {
        e.preventDefault();
        if (focusedControl === 'RESTART' && onRestart) {
          setIsPauseOpen(false);
          setFocusedControl('NONE');
          onRestart();
        } else if (focusedControl === 'EXIT' && onExit) {
          setIsPauseOpen(false);
          setFocusedControl('NONE');
          onExit();
        } else if (focusedControl === 'CONTINUE') {
          setIsPauseOpen(false);
          setFocusedControl('NONE');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedControl, isPauseOpen, onRestart, onExit, hideExit, gameState?.winner]);

  const isSecretService = gameState?.mode === 'SECRET_SERVICE';
  const spies = gameState?.spies || [];
  const activeSpyIndex = gameState?.activeSpyIndex ?? 0;
  const activeSpy = spies[activeSpyIndex];
  const currentTurn = gameState?.currentTurn || 'KILLER';
  const isKillerTurn = currentTurn === 'KILLER';

  let killerScore = 0;
  let killerTarget = 4;
  let detectiveScore = 0;
  let detectiveTarget = 1;

  if (isSecretService) {
    killerTarget = gameState?.spyTargetTrophies ?? 3;
    detectiveTarget = killerTarget;
  } else if (gameState?.mode === 'LINE_UP') {
    killerScore = gameState?.duelPenalties?.KILLER ?? 0;
    detectiveScore = gameState?.duelPenalties?.DETECTIVE ?? 0;
    killerTarget = 3;
    detectiveTarget = 3;
  } else if (gameState?.mode === 'THIEF_HUNT') {
    killerScore = gameState?.trophiesKiller ?? 0;
    killerTarget = 10;
    detectiveScore = gameState?.winner === 'DETECTIVE' ? 1 : 0;
    detectiveTarget = 1;
  } else if (gameState?.mode === 'MANIAC_VS_OPERATIVE') {
    killerScore = gameState?.killCount ?? 0;
    killerTarget = 4;
    detectiveScore = gameState?.winner === 'DETECTIVE' ? 1 : 0;
    detectiveTarget = 1;
  }

  const activeTurnName = useMemo(() => {
    if (isSecretService) return activeSpy?.name || 'Агент';
    if (gameState?.mode === 'THIEF_HUNT') return isKillerTurn ? 'Грабитель' : 'Полиция';
    if (gameState?.mode === 'MANIAC_VS_OPERATIVE') return isKillerTurn ? 'Маньяк' : 'Оперативник';
    if (gameState?.mode === 'LINE_UP') return isKillerTurn ? 'Подозреваемый' : 'Следователь';
    return isKillerTurn ? 'Преступник' : 'Закон';
  }, [isSecretService, activeSpy, gameState?.mode, isKillerTurn]);

  const killerRoleName = gameState?.mode === 'THIEF_HUNT' ? 'Грабитель' : gameState?.mode === 'LINE_UP' ? 'Подозреваемый' : 'Маньяк';
  const detectiveRoleName = gameState?.mode === 'THIEF_HUNT' ? 'Полиция' : gameState?.mode === 'LINE_UP' ? 'Следователь' : 'Оперативник';

  const boardSize = gameState?.board?.length || 5;
  const flatCards = (gameState?.board || []).flat();

  const radarTargetId = gameState?.interrogationRadar?.targetId;
  const radarCoords = useMemo(() => {
    if (!radarTargetId || !gameState?.board) return null;
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (gameState.board[r]?.[c]?.id === radarTargetId) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }, [radarTargetId, gameState?.board, boardSize]);

  const isRadarCell = (row: number, col: number) => {
    if (!radarCoords) return false;
    return Math.abs(radarCoords.row - row) <= 1 && Math.abs(radarCoords.col - col) <= 1;
  };

  const isRadarCenter = (row: number, col: number) => {
    if (!radarCoords) return false;
    return radarCoords.row === row && radarCoords.col === col;
  };

  const isLineSelected = (row: number, col: number) => {
    if (!selectedLine) return false;
    if (selectedLine.type === 'ROW' && selectedLine.index === row) return true;
    if (selectedLine.type === 'COL' && selectedLine.index === col) return true;
    return false;
  };

  const selectedLineType = selectedLine?.type || null;
  const selectedLineIdx = selectedLine ? selectedLine.index + 1 : 0;
  const selectedLineDir = (selectedLine as any)?.direction || null;

  const roleSpecificActions = useMemo(() => {
    if (gameState?.mode === 'THIEF_HUNT') {
      if (isKillerTurn) {
        return [
          { name: 'КРАЖА', desc: 'Кража трофея у соседа в радиусе 3×3', badge: 'ДОСТУПНО', icon: <ActionIcons.Rob className="w-3.5 h-3.5 text-amber-400" />, tone: 'amber' as const },
          { name: 'КОНСПИРАЦИЯ', desc: 'Смена маскировки на новую', badge: 'ДОСТУПНО', icon: <ActionIcons.Disguise className="w-3.5 h-3.5 text-zinc-300" />, tone: 'neutral' as const },
        ];
      }
      return [
        { name: 'ВЫЗОВ ПАТРУЛЯ', desc: 'Оцепление сектора и допрос жителей', badge: 'ДОСТУПНО', icon: <ActionIcons.Patrol className="w-3.5 h-3.5 text-blue-400" />, tone: 'blue' as const },
        { name: 'ЗАДЕРЖАНИЕ', desc: 'Поимка грабителя с поличным', badge: '1 ПОПЫТКА', icon: <ActionIcons.Arrest className="w-3.5 h-3.5 text-blue-400" />, tone: 'blue' as const },
      ];
    }
    if (gameState?.mode === 'SECRET_SERVICE') {
      return [
        { name: 'РАЗОБЛАЧЕНИЕ', desc: 'Проверка принадлежности к спецслужбам', badge: 'ДОСТУПНО', icon: <ActionIcons.Kill className="w-3.5 h-3.5 text-rose-400" />, tone: 'red' as const },
        { name: 'ОПРОС СВИДЕТЕЛЕЙ', desc: 'Сбор агентурных данных в секторе', badge: 'ДОСТУПНО', icon: <ActionIcons.Interrogate className="w-3.5 h-3.5 text-blue-400" />, tone: 'blue' as const },
        { name: 'ЗАЧИСТКА', desc: 'Устранение раскрытого агента', badge: 'ДОСТУПНО', icon: <ActionIcons.Cleanup className="w-3.5 h-3.5 text-zinc-300" />, tone: 'neutral' as const },
      ];
    }
    if (gameState?.mode === 'LINE_UP') {
      return [
        { name: 'ВОПРОС', desc: 'Выяснение примет подозреваемого', badge: 'ДОСТУПНО', icon: <ActionIcons.Interrogate className="w-3.5 h-3.5 text-blue-400" />, tone: 'blue' as const },
        { name: 'ОБВИНЕНИЕ', desc: 'Окончательное задержание на очной ставке', badge: '1 ПОПЫТКА', icon: <ActionIcons.Arrest className="w-3.5 h-3.5 text-blue-400" />, tone: 'blue' as const },
      ];
    }
    if (isKillerTurn) {
      return [
        { name: 'ЛИКВИДАЦИЯ', desc: 'Устранение цели в радиусе 3×3', badge: 'ДОСТУПНО', icon: <ActionIcons.Kill className="w-3.5 h-3.5 text-rose-400" />, tone: 'red' as const },
        { name: 'ЗАЧИСТКА', desc: 'Уничтожение улик на месте преступления', badge: 'ДОСТУПНО', icon: <ActionIcons.Cleanup className="w-3.5 h-3.5 text-zinc-300" />, tone: 'neutral' as const },
        { name: 'КОНСПИРАЦИЯ', desc: 'Экстренная смена маскировки и уход от слежки', badge: 'ДОСТУПНО', icon: <ActionIcons.Disguise className="w-3.5 h-3.5 text-zinc-300" />, tone: 'neutral' as const },
      ];
    }
    return [
      { name: 'ПРОВЕРКА АЛИБИ', desc: 'Опрос свидетеля в радиусе 3×3', badge: 'ДОСТУПНО', icon: <ActionIcons.Exonerate className="w-3.5 h-3.5 text-blue-400" />, tone: 'blue' as const },
      { name: 'ЗАДЕРЖАНИЕ', desc: 'Задержание подозреваемого маньяка', badge: '1 ПОПЫТКА', icon: <ActionIcons.Arrest className="w-3.5 h-3.5 text-blue-400" />, tone: 'blue' as const },
    ];
  }, [gameState?.mode, isKillerTurn]);

  if (gameState?.winner) {
    const winningSpy = isSecretService
      ? (spies.find((s) => s.id === gameState.winner) ||
         (gameState.winner === 'KILLER' ? spies[0] : gameState.winner === 'DETECTIVE' ? spies[1] : null))
      : null;
    const isKillerWinner = gameState.winner === 'KILLER' || Boolean(winningSpy && spies[0]?.id === winningSpy.id);
    const finalKillerChar = flatCards.find((c) => c.id === (winningSpy?.secretId || gameState.killerSecretId));
    const finalDetectiveChar = flatCards.find((c) => c.id === gameState.detectiveSecretId);

    return (
      <div className="relative h-screen w-screen bg-[#08090e] overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,#2d0814_0%,#120c16_45%,#07080d_100%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(225,29,72,0.1),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent_50%)] pointer-events-none" />

        <GameOverModal
          winner={isKillerWinner ? 'KILLER' : 'DETECTIVE'}
          mode={gameState.mode}
          killer={finalKillerChar}
          detective={finalDetectiveChar}
          elapsedTime="--:--"
          isMultiplayer={true}
          onRestart={onRestart || (() => {})}
          onExitToMenu={onExit || (() => {})}
        />
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-white/10 border-t-2 border-t-rose-500/50 bg-white/[0.04] shadow-2xl backdrop-blur-2xl">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
          <span className="text-xs 2xl:text-sm font-mono uppercase tracking-widest text-zinc-300">
            Ожидание выбора реванша на контроллерах
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="tv-root flex h-screen w-screen flex-col bg-[#08090e] text-zinc-100 select-none overflow-hidden p-3 sm:p-4 lg:p-5 gap-2.5 sm:gap-3 font-sans relative">
      {/* Кинематографичный радиальный градиент Neo-Noir */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,#2d0814_0%,#120c16_45%,#07080d_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(225,29,72,0.1),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent_50%)] pointer-events-none" />

      {/* Верхний компактный хедер телевизора */}
      <div className="flex items-center justify-between px-6 py-2 rounded-2xl bg-white/[0.04] border border-white/10 border-t-2 border-t-rose-500/50 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)] shrink-0 z-10">
        {/* Статусы и счета участников */}
        <div className="flex items-center gap-6 lg:gap-8">
          {isSecretService && spies.length > 0 ? (
            spies.map((spy, idx) => {
              const color = SPY_COLORS[idx % SPY_COLORS.length];
              return (
                <div key={spy.id || idx} className="flex items-center gap-2.5">
                  <span className={`h-3 w-3 rounded-full ${color.bg} border ${color.border} shadow-[0_0_8px_rgba(255,255,255,0.4)]`} />
                  <span className="text-sm sm:text-base font-bold tracking-wide text-zinc-300">
                    {spy.name}: <span className={`${color.text} font-mono font-black text-base sm:text-lg`}>{spy.trophies}/{killerTarget}</span>
                  </span>
                </div>
              );
            })
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[#E11D48] shadow-[0_0_10px_rgba(225,29,72,0.9)] shrink-0" />
                <div className="leading-tight">
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-zinc-400 block font-bold">{killerRoleName}</span>
                  <span className="text-base sm:text-xl font-mono font-black text-rose-400">
                    {killerScore} <span className="text-xs text-zinc-400 font-semibold">/ {killerTarget} ЖЕРТВ</span>
                  </span>
                </div>
              </div>
              <div className="h-7 w-px bg-white/10" />
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[#2563EB] shadow-[0_0_10px_rgba(37,99,235,0.9)] shrink-0" />
                <div className="leading-tight">
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-zinc-400 block font-bold">{detectiveRoleName}</span>
                  <span className="text-base sm:text-xl font-mono font-black text-blue-400">
                    {detectiveScore} <span className="text-xs text-zinc-400 font-semibold">/ {detectiveTarget} ОПРАВДАНО</span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Кнопка вызова меню паузы */}
        <div className="flex items-center gap-3">
          <button
            tabIndex={0}
            onClick={() => {
              setIsPauseOpen(true);
              setFocusedControl('CONTINUE');
            }}
            className="px-4 py-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-zinc-200 transition-all cursor-pointer flex items-center gap-2 shadow-sm active:scale-95 focus:outline-none focus:scale-105 focus:border-white focus:bg-white/20 focus:shadow-[0_0_20px_rgba(255,255,255,0.35)]"
          >
            <Icons.Settings />
            <span>МЕНЮ ПАУЗЫ [ESC]</span>
          </button>
        </div>
      </div>

      {/* Основная рабочая зона экрана ТВ: строго 2 зоны (~68% Игровое поле | ~32% Инфо-панель) */}
      <div className="flex-1 flex gap-3 sm:gap-4 lg:gap-5 min-h-0 overflow-hidden z-10">
        {/* ЛЕВАЯ ЗОНА (~68%): Primary Stage (Поле 5×5 с монолитной тактической плитой) */}
        <div className="w-[66%] lg:w-[68%] h-full flex items-center justify-center min-w-0">
          <div className="relative w-full h-full max-w-[min(100%,calc(100vh-80px))] aspect-square p-2.5 sm:p-3 2xl:p-4 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 border-t-2 border-t-rose-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.1)] backdrop-blur-2xl flex items-center justify-center">
            <div
              className="grid gap-1.5 sm:gap-2 2xl:gap-2.5 w-full h-full"
              style={{
                gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`,
              }}
            >
              {flatCards.map((char, index) => {
                const row = Math.floor(index / boardSize);
                const col = index % boardSize;
                const isLineActive = isLineSelected(row, col);
                const inRadarArea = isRadarCell(row, col);
                const inRadarCenter = isRadarCenter(row, col);

                return (
                  <TvCell
                    key={char.id || `cell_${index}`}
                    char={char}
                    index={index}
                    isLineActive={isLineActive}
                    inRadarCenter={inRadarCenter}
                    inRadarArea={inRadarArea}
                    isTargetVictim={Boolean(gameState?.mode === 'MANIAC_VS_OPERATIVE' && gameState?.victimList?.[0] === char.id)}
                    isUniformedOfficer={Boolean(gameState?.uniformedOfficers?.includes(char.id))}
                    mode={gameState?.mode || 'MANIAC_VS_OPERATIVE'}
                    selectedLineDir={selectedLineDir}
                    selectedLineType={selectedLineType}
                    boardSize={boardSize}
                    row={row}
                    col={col}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ПРАВАЯ ЗОНА (~32%): Терминал хода и хроники расследования */}
        <div className="w-[34%] lg:w-[32%] h-full flex flex-col gap-2 sm:gap-2.5 min-w-0 min-h-0 overflow-hidden">
          
          {/* БЛОК 1: ТЕКУЩИЙ АКТИВНЫЙ ХОД (МАКСИМАЛЬНО КОМПАКТНЫЙ) */}
          <div className={`p-2.5 sm:p-3 rounded-2xl border border-white/10 border-t-2 backdrop-blur-2xl transition-all duration-500 shadow-xl relative overflow-hidden shrink-0 ${
            isKillerTurn
              ? 'border-t-rose-500/80 bg-gradient-to-br from-red-950/45 via-white/[0.04] to-black/80 shadow-[0_8px_30px_rgba(225,29,72,0.25)]'
              : 'border-t-blue-500/80 bg-gradient-to-br from-blue-950/45 via-white/[0.04] to-black/80 shadow-[0_8px_30px_rgba(37,99,235,0.25)]'
          }`}>
            <div className="flex items-center mb-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest border shadow-xs ${
                isKillerTurn
                  ? 'bg-red-950/80 border-red-500/40 text-red-200'
                  : 'bg-blue-950/80 border-blue-500/40 text-blue-200'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isKillerTurn ? 'bg-rose-400' : 'bg-blue-400'} animate-pulse`} />
                {getGameModeTitle(gameState?.mode || 'MANIAC_VS_OPERATIVE', 'ru')}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center font-mono text-xl sm:text-2xl font-black text-white shrink-0 shadow-md ${
                isKillerTurn
                  ? 'bg-gradient-to-br from-red-600 to-rose-700 border-white/30 shadow-[0_0_15px_rgba(225,29,72,0.5)]'
                  : 'bg-gradient-to-br from-blue-600 to-indigo-700 border-white/30 shadow-[0_0_15px_rgba(37,99,235,0.5)]'
              }`}>
                {activeTurnName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold leading-none mb-0.5">
                  АКТИВНЫЙ ИГРОК
                </div>
                <div className="text-base sm:text-lg 2xl:text-xl font-black tracking-wider uppercase truncate text-white drop-shadow leading-tight">
                  {activeTurnName.toUpperCase()}
                </div>
                <div className="text-white/50 text-xs font-mono truncate leading-tight">
                  {getGameModeTitle(gameState?.mode || 'MANIAC_VS_OPERATIVE', 'ru')}
                </div>
              </div>
            </div>
          </div>

          {/* БЛОК 2: ДОСТУПНЫЕ ДЕЙСТВИЯ ТЕКУЩЕЙ РОЛИ (FLEX-1 СО СКРОЛЛОМ) */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.04] border border-white/10 border-t-2 border-t-cyan-500/50 backdrop-blur-2xl shadow-xl flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
            {/* Блок «Выбранная линия» */}
            {selectedLine ? (
              <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.25)] space-y-0.5 shrink-0">
                <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-cyan-300 flex items-center gap-1 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
                  ВЫБРАННАЯ ЛИНИЯ
                </div>
                <div className="text-sm sm:text-base font-black text-white tracking-wide flex items-center justify-between">
                  <span>{selectedLineType === 'ROW' ? `РЯД #${selectedLineIdx}` : `СТОЛБЕЦ #${selectedLineIdx}`}</span>
                  {selectedLineDir && (
                    <span className="text-[10px] sm:text-xs font-mono uppercase text-cyan-100 font-black px-2 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-400/60 shadow-xs">
                      {selectedLineType === 'ROW'
                        ? (selectedLineDir === 'FORWARD' ? 'ВПРАВО →' : '← ВЛЕВО')
                        : (selectedLineDir === 'FORWARD' ? 'ВНИЗ ↓' : '↑ ВВЕРХ')}
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {/* Заголовок блока действий */}
            <div className="flex items-center text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-zinc-300 shrink-0">
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isKillerTurn ? 'bg-rose-500' : 'bg-blue-500'}`} />
                ДЕЙСТВИЯ: {activeTurnName.toUpperCase()}
              </span>
            </div>

            {/* Список действий со скроллом */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1">
              {/* Маневр поля */}
              <div className={`p-1.5 sm:py-2 sm:px-2.5 rounded-xl border flex items-center justify-between transition-all ${
                selectedLine
                  ? 'bg-gradient-to-r from-cyan-900/80 via-blue-950/90 to-zinc-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                  : 'bg-white/[0.04] border-white/10 hover:border-white/20'
              }`}>
                <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                  <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-cyan-600/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
                    <ActionIcons.Shift className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-xs sm:text-sm font-black uppercase text-white tracking-wide truncate">МАНЕВР ПОЛЯ</div>
                    <div className="text-[10px] leading-tight text-white/50 truncate">
                      {selectedLine ? 'Маневр линии активен' : 'Сдвиг ряда или столбца'}
                    </div>
                  </div>
                </div>
                {selectedLine && (
                  <span className="shrink-0 text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-cyan-600 text-white border-cyan-400 animate-pulse">
                    В ПРОЦЕССЕ
                  </span>
                )}
              </div>

              {/* Специфические действия роли */}
              {roleSpecificActions.map((act, i) => {
                const borderClass = act.tone === 'red'
                  ? 'border-rose-600/35 bg-gradient-to-r from-red-950/50 via-zinc-900/60 to-black/60'
                  : act.tone === 'blue'
                  ? 'border-blue-500/35 bg-gradient-to-r from-blue-950/50 via-zinc-900/60 to-black/60'
                  : act.tone === 'amber'
                  ? 'border-amber-500/35 bg-gradient-to-r from-amber-950/50 via-zinc-900/60 to-black/60'
                  : 'border-white/10 bg-white/[0.04]';

                return (
                  <div key={i} className={`p-1.5 sm:py-2 sm:px-2.5 rounded-xl border flex items-center justify-between transition-all ${borderClass}`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                      <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                        {act.icon}
                      </span>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-xs sm:text-sm font-black uppercase text-white tracking-wide truncate">{act.name}</div>
                        <div className="text-[10px] leading-tight text-white/50 truncate">{act.desc}</div>
                      </div>
                    </div>
                    {act.badge && act.badge !== 'ДОСТУПНО' && (
                      <span className="shrink-0 text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-amber-950/80 text-amber-300 border-amber-500/50 font-black">
                        {act.badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* БЛОК 3: ХРОНИКА РАССЛЕДОВАНИЯ (КОМПАКТНЫЙ СНИЗУ) */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.04] border border-white/10 border-t-2 border-t-amber-500/50 backdrop-blur-2xl shadow-xl h-[130px] sm:h-[150px] 2xl:h-[180px] shrink-0 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center text-[11px] sm:text-xs font-mono uppercase tracking-widest text-zinc-300 mb-1.5 font-bold shrink-0">
              <span className="flex items-center gap-1.5">
                <Icons.Terminal />
                ХРОНИКА РАССЛЕДОВАНИЯ
              </span>
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto min-h-0 pr-1 text-xs font-sans">
              {gameState?.log && gameState.log.length > 0 ? (
                gameState.log.slice(-8).map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 sm:p-2 rounded-lg bg-white/[0.03] border border-white/5 text-zinc-200 flex items-start gap-1.5 shadow-xs backdrop-blur-sm font-sans leading-relaxed"
                  >
                    <span className="text-amber-400 font-mono font-bold shrink-0">›</span>
                    <span className="flex-1 text-xs">{entry}</span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 italic text-center my-auto font-sans text-xs">
                  Ожидание тактических действий...
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* МОДАЛЬНОЕ МЕНЮ ПАУЗЫ (SYSTEM PAUSE MODAL) */}
      <div
        aria-hidden={!isPauseOpen && focusedControl === 'NONE'}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-6 select-none transition-all duration-300 ${
          isPauseOpen || focusedControl !== 'NONE' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-zinc-950/90 border border-white/15 border-t-2 border-t-rose-500/60 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.15)] space-y-6 text-center">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-rose-400 text-xl">
                <Icons.Settings />
              </span>
              <span className="text-xl sm:text-2xl font-display font-black uppercase text-white tracking-wider">
                МЕНЮ ПАУЗЫ МАТЧА
              </span>
            </div>
            <button
              tabIndex={0}
              onClick={() => {
                setIsPauseOpen(false);
                setFocusedControl('NONE');
              }}
              className="text-xs sm:text-sm font-mono text-zinc-400 hover:text-white transition cursor-pointer px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 focus:outline-none focus:scale-105"
            >
              [ESC] ЗАКРЫТЬ
            </button>
          </div>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed text-left font-sans">
            Игра приостановлена на телевизоре. Выберите действие с помощью ТВ-пульта:
          </p>

          <div className="space-y-3.5">
            <button
              data-tv-focus-primary="true"
              tabIndex={0}
              onClick={() => {
                setIsPauseOpen(false);
                setFocusedControl('NONE');
              }}
              className={`w-full p-4 sm:p-5 rounded-2xl font-display font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-between cursor-pointer transition-all active:scale-95 focus:outline-none focus:scale-105 focus:border-white focus:shadow-[0_0_40px_rgba(59,130,246,0.7)] ${
                focusedControl === 'CONTINUE'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 border-2 border-white ring-2 ring-white text-white scale-105 shadow-[0_0_35px_rgba(59,130,246,0.65)]'
                  : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 border border-blue-400/50 text-white'
              }`}
            >
              <span className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">ПРОДОЛЖИТЬ МАТЧ</span>
              <span className="font-mono text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-black/40 border border-white/20 text-white/90 shadow-inner">
                OK / ENTER ➔
              </span>
            </button>

            {onRestart && (
              <button
                tabIndex={0}
                onClick={() => {
                  setIsPauseOpen(false);
                  setFocusedControl('NONE');
                  onRestart();
                }}
                data-testid="tv-restart-btn"
                className={`w-full p-4 sm:p-5 rounded-2xl border font-display font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer focus:outline-none focus:scale-105 focus:border-white focus:bg-white/20 focus:shadow-[0_0_35px_rgba(255,255,255,0.35)] ${
                  focusedControl === 'RESTART'
                    ? 'border-2 border-white ring-2 ring-white bg-white/20 text-white scale-105 shadow-[0_0_30px_rgba(255,255,255,0.45)]'
                    : 'border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white/80'
                }`}
              >
                <span>НАЧАТЬ ЗАНОВО (РЕВАНШ)</span>
                <span className="text-[10px] sm:text-xs font-mono text-zinc-400 px-2.5 py-1 rounded-md bg-black/40 border border-white/10">
                  ТРЕБУЕТ СОГЛАСИЯ
                </span>
              </button>
            )}

            {!hideExit && onExit && (
              <button
                tabIndex={0}
                onClick={() => {
                  setIsPauseOpen(false);
                  setFocusedControl('NONE');
                  onExit();
                }}
                data-testid="tv-exit-btn"
                className={`w-full p-4 sm:p-5 rounded-2xl border font-display font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer focus:outline-none focus:scale-105 focus:border-rose-300 focus:shadow-[0_0_40px_rgba(244,63,94,0.7)] ${
                  focusedControl === 'EXIT'
                    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 border-2 border-white ring-2 ring-red-500 text-white scale-105 shadow-[0_0_35px_rgba(244,63,94,0.7)]'
                    : 'bg-gradient-to-r from-red-800 via-rose-800 to-red-900 border border-rose-500/50 hover:from-red-700 hover:to-rose-700 text-white'
                }`}
              >
                <span className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">ВЫЙТИ В ГЛАВНОЕ МЕНЮ</span>
                <span className="text-[10px] sm:text-xs font-mono text-rose-200 px-2.5 py-1 rounded-md bg-black/40 border border-white/20">
                  ЗАВЕРШИТЬ СЕССИЮ
                </span>
              </button>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 text-xs sm:text-sm font-mono text-zinc-300 text-left">
            Защита от случайного нажатия: выход в меню подтверждается через паузу.
          </div>
        </div>
      </div>

      {/* Оверлей грейс-периода и временной паузы связи */}
      <AnimatePresence>
        {activeDisconnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-8 bg-black/85 backdrop-blur-2xl select-none font-sans"
            data-testid="tv-player-disconnected-banner"
          >
            <div className="w-full max-w-2xl rounded-3xl bg-zinc-950/90 border border-white/15 border-t-2 border-t-blue-500/60 backdrop-blur-2xl p-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col items-center">
              <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-blue-950/90 border border-blue-500/50 text-sm font-mono uppercase tracking-wider text-blue-300 font-bold mb-6">
                <span>ВРЕМЕННАЯ ПАУЗА СВЯЗИ • ТАЙМЕР ХОДА ЗАМОРОЖЕН</span>
              </div>

              <div className="text-7xl font-mono font-black text-white tracking-widest mb-4">
                00:{tvGraceLeft.toString().padStart(2, '0')}
              </div>

              <h2 className="text-3xl font-black uppercase tracking-wider text-zinc-100 mb-3">
                ОЖИДАНИЕ ВОЗВРАЩЕНИЯ СВЯЗНОГО В СЕТЬ
              </h2>

              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden my-5 max-w-lg">
                <div
                  className="h-full bg-blue-500 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, (tvGraceLeft / 60) * 100))}%` }}
                />
              </div>

              <p className="text-base text-zinc-300 max-w-lg leading-relaxed mb-3">
                Один из игроков временно вне зоны эфира. Ход матча приостановлен на время грейс-периода (60 сек).
              </p>
              <p className="text-sm text-zinc-400 font-mono">
                При невозврате по истечении таймера будет зафиксировано техническое поражение.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
