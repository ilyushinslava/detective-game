import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CharacterCard } from '../CharacterCard';
import { GameOverModal } from '../GameOverModal';
import { ActionIcons } from '../ui/ActionIcons';
import type { GameState, LastShift } from '../../types/game';
import { SPY_COLORS } from '../../types/game';
import { getGameModeTitle } from '../../constants/gameMeta';

export interface TvBoardViewProps {
  gameState: GameState;
  selectedLine?: LastShift | { type: 'ROW' | 'COL'; index: number; direction?: 'FORWARD' | 'BACKWARD' } | null;
  secondsLeft?: number;
  onExit?: () => void;
  onRestart?: () => void;
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
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Mask: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M2 18h20M4 18c0-2 2-3 4-4l2-6h4l2 6c2 1 4 2 4 4M9 13h6" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Question: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

export const TvBoardView: React.FC<TvBoardViewProps> = ({
  gameState,
  selectedLine = null,
  secondsLeft = 60,
  onExit,
  onRestart,
}) => {
  const [focusedControl, setFocusedControl] = React.useState<'NONE' | 'CONTINUE' | 'RESTART' | 'EXIT'>('NONE');
  const [isPauseOpen, setIsPauseOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape / Back (KEYCODE_BACK = 4, ESCAPE = 27)
      if (e.key === 'Escape' || e.keyCode === 27 || e.keyCode === 4) {
        e.preventDefault();
        // Прямой Android Back (keyCode 4)
        if (e.keyCode === 4) {
          if (onExit) onExit();
          return;
        }
        // Защита от случайного нажатия на пульте: открываем / закрываем меню паузы
        if (!isPauseOpen) {
          setIsPauseOpen(true);
          setFocusedControl(onRestart ? 'RESTART' : 'EXIT');
        } else {
          setIsPauseOpen(false);
          setFocusedControl('NONE');
        }
        return;
      }

      // Enter / Select (DPAD_CENTER = 23, ENTER = 66, Space = 32, Enter = 13)
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
        } else if (gameState?.winner) {
          if (onExit) onExit();
        }
        return;
      }

      // D-Pad Left / Up (ArrowLeft 37/21, ArrowUp 38/19) -> фокус на реванш/назад в меню
      if (e.key === 'ArrowLeft' || e.keyCode === 37 || e.keyCode === 21 || e.key === 'ArrowUp' || e.keyCode === 38 || e.keyCode === 19) {
        e.preventDefault();
        setIsPauseOpen(true);
        if (onRestart) {
          setFocusedControl('RESTART');
        } else if (onExit) {
          setFocusedControl('EXIT');
        }
        return;
      }

      // D-Pad Right / Down (ArrowRight 39/22, ArrowDown 40/20) -> фокус на выход
      if (e.key === 'ArrowRight' || e.keyCode === 39 || e.keyCode === 22 || e.key === 'ArrowDown' || e.keyCode === 40 || e.keyCode === 20) {
        e.preventDefault();
        setIsPauseOpen(true);
        if (onExit) {
          setFocusedControl('EXIT');
        } else if (onRestart) {
          setFocusedControl('RESTART');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedControl, isPauseOpen, onRestart, onExit, gameState?.winner]);

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

  const activeTurnName = React.useMemo(() => {
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
  const radarCoords = React.useMemo(() => {
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

  // Реальные объективные метрики расследования (вместо фиктивного процента)
  const unexoneratedCount = React.useMemo(() => {
    return flatCards.filter((c) => c.isAlive && !c.isExonerated).length;
  }, [flatCards]);

  const roleSpecificActions = React.useMemo(() => {
    if (gameState?.mode === 'THIEF_HUNT') {
      if (isKillerTurn) {
        return [
          { name: 'КРАЖА', desc: 'Кража трофея у соседа в радиусе 3×3', badge: 'ДОСТУПНО', icon: <ActionIcons.Rob className="w-4 h-4 text-amber-400" />, tone: 'amber' as const },
          { name: 'КОНСПИРАЦИЯ', desc: 'Смена маскировки на новую', badge: 'ДОСТУПНО', icon: <ActionIcons.Disguise className="w-4 h-4 text-zinc-300" />, tone: 'neutral' as const },
        ];
      }
      return [
        { name: 'ВЫЗОВ ПАТРУЛЯ', desc: 'Оцепление сектора и допрос жителей', badge: 'ДОСТУПНО', icon: <ActionIcons.Patrol className="w-4 h-4 text-blue-400" />, tone: 'blue' as const },
        { name: 'ЗАДЕРЖАНИЕ', desc: 'Поимка грабителя с поличным', badge: '1 ПОПЫТКА', icon: <ActionIcons.Arrest className="w-4 h-4 text-blue-400" />, tone: 'blue' as const },
      ];
    }
    if (gameState?.mode === 'SECRET_SERVICE') {
      return [
        { name: 'РАЗОБЛАЧЕНИЕ', desc: 'Проверка принадлежности к спецслужбам', badge: 'ДОСТУПНО', icon: <ActionIcons.Kill className="w-4 h-4 text-rose-400" />, tone: 'red' as const },
        { name: 'ОПРОС СВИДЕТЕЛЕЙ', desc: 'Сбор агентурных данных в секторе', badge: 'ДОСТУПНО', icon: <ActionIcons.Interrogate className="w-4 h-4 text-blue-400" />, tone: 'blue' as const },
        { name: 'ЗАЧИСТКА', desc: 'Устранение раскрытого агента', badge: 'ДОСТУПНО', icon: <ActionIcons.Cleanup className="w-4 h-4 text-zinc-300" />, tone: 'neutral' as const },
      ];
    }
    if (gameState?.mode === 'LINE_UP') {
      return [
        { name: 'ВОПРОС', desc: 'Выяснение примет подозреваемого', badge: 'ДОСТУПНО', icon: <ActionIcons.Interrogate className="w-4 h-4 text-blue-400" />, tone: 'blue' as const },
        { name: 'ОБВИНЕНИЕ', desc: 'Окончательное задержание на очной ставке', badge: '1 ПОПЫТКА', icon: <ActionIcons.Arrest className="w-4 h-4 text-blue-400" />, tone: 'blue' as const },
      ];
    }
    if (isKillerTurn) {
      return [
        { name: 'ЛИКВИДАЦИЯ', desc: 'Устранение цели в радиусе 3×3', badge: 'ДОСТУПНО', icon: <ActionIcons.Kill className="w-4 h-4 text-rose-400" />, tone: 'red' as const },
        { name: 'ЗАЧИСТКА', desc: 'Уничтожение улик на месте преступления', badge: 'ДОСТУПНО', icon: <ActionIcons.Cleanup className="w-4 h-4 text-zinc-300" />, tone: 'neutral' as const },
        { name: 'ПОБЕГ', desc: 'Экстренная смена сектора при угрозе', badge: 'ДОСТУПНО', icon: <ActionIcons.Disguise className="w-4 h-4 text-zinc-300" />, tone: 'neutral' as const },
      ];
    }
    return [
      { name: 'ПРОВЕРКА АЛИБИ', desc: 'Опрос свидетеля в радиусе 3×3', badge: 'ДОСТУПНО', icon: <ActionIcons.Exonerate className="w-4 h-4 text-blue-400" />, tone: 'blue' as const },
      { name: 'ЗАДЕРЖАНИЕ', desc: 'Задержание подозреваемого маньяка', badge: '1 ПОПЫТКА', icon: <ActionIcons.Arrest className="w-4 h-4 text-blue-400" />, tone: 'blue' as const },
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
      <div className="relative h-screen w-screen bg-[#080a0f] overflow-hidden select-none">
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
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-zinc-800/80 bg-zinc-950/80 shadow-2xl backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
          <span className="text-xs 2xl:text-sm font-mono uppercase tracking-widest text-zinc-300">
            Ожидание выбора реванша на контроллерах
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="tv-root flex h-screen w-screen flex-col bg-[radial-gradient(ellipse_95%_75%_at_40%_45%,#131a28_0%,#090d16_55%,#040508_100%)] text-zinc-100 select-none overflow-hidden p-4 sm:p-5 lg:p-6 gap-3 sm:gap-4 font-sans relative">
      {/* Атмосферные фоновые световые акценты (Нео-нуар виньетка) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-96 h-96 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />

      {/* Верхняя статусная планка (Шапка ТВ) по кинематографичному стандарту TV Party */}
      <div className="flex items-center justify-between px-6 py-3 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(37,99,235,0.08)] shrink-0 z-10">
        {/* Левая группа: Статусы и счета участников с яркими маяками */}
        <div className="flex items-center gap-6 sm:gap-8">
          {isSecretService && spies.length > 0 ? (
            spies.map((spy, idx) => {
              const color = SPY_COLORS[idx % SPY_COLORS.length];
              return (
                <div key={spy.id || idx} className="flex items-center gap-2.5">
                  <span className={`h-3 w-3 rounded-full ${color.bg} border ${color.border} shadow-[0_0_10px_rgba(255,255,255,0.4)]`} />
                  <span className="text-xs sm:text-sm 2xl:text-base font-bold tracking-wide text-zinc-300">
                    {spy.name}: <span className={`${color.text} font-mono font-black text-sm sm:text-base`}>{spy.trophies}/{killerTarget}</span>
                  </span>
                </div>
              );
            })
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-[#E11D48] shadow-[0_0_12px_rgba(225,29,72,0.9)] shrink-0" />
                <div className="leading-tight">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block font-bold">{killerRoleName}</span>
                  <span className="text-base sm:text-lg 2xl:text-xl font-mono font-black text-rose-400">
                    {killerScore} <span className="text-xs text-zinc-500 font-normal">/ {killerTarget} ЖЕРТВ</span>
                  </span>
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-[#2563EB] shadow-[0_0_12px_rgba(37,99,235,0.9)] shrink-0" />
                <div className="leading-tight">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block font-bold">{detectiveRoleName}</span>
                  <span className="text-base sm:text-lg 2xl:text-xl font-mono font-black text-blue-400">
                    {detectiveScore} <span className="text-xs text-zinc-500 font-normal">/ {detectiveTarget} ОПРАВДАНО</span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Центральный индикатор глобальной фазы матча */}
        <div className="hidden md:flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/10 bg-zinc-900/60 backdrop-blur-md shadow-inner">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-xs 2xl:text-sm font-mono uppercase tracking-widest text-zinc-200 font-bold">
            {getGameModeTitle(gameState?.mode || 'MANIAC_VS_OPERATIVE', 'ru')}
          </span>
        </div>

        {/* Правый блок: Кнопка вызова меню паузы ТВ */}
        <div className="flex items-center gap-3">
          {(onRestart || onExit) && (
            <button
              onClick={() => {
                setIsPauseOpen(true);
                setFocusedControl(onRestart ? 'RESTART' : 'EXIT');
              }}
              className="px-4 py-2 rounded-xl border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-xs sm:text-sm font-mono uppercase tracking-wider text-zinc-300 transition cursor-pointer flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Icons.Settings />
              <span>МЕНЮ ПАУЗЫ [ESC]</span>
            </button>
          )}
        </div>
      </div>

      {/* Основная рабочая зона экрана ТВ: строго 2 зоны (~68% Игровое поле | ~32% Инфо-панель) */}
      <div className="flex-1 flex gap-4 lg:gap-6 min-h-0 overflow-hidden z-10">
        {/* ЛЕВАЯ ЗОНА (~68%): Primary Stage (Поле 5×5 с монолитной тактической плитой) */}
        <div className="w-[66%] lg:w-[68%] h-full flex items-center justify-center min-w-0">
          <div className="relative w-full h-full max-w-[min(100%,calc(100vh-120px))] aspect-square p-3 sm:p-4 2xl:p-5 rounded-3xl bg-gradient-to-br from-slate-900/90 via-zinc-950/95 to-slate-950/95 border border-blue-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(37,99,235,0.15)] backdrop-blur-2xl flex items-center justify-center">
            <div
              className="grid gap-2 sm:gap-2.5 2xl:gap-3 w-full h-full"
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
                  <motion.div
                    key={char.id || `cell_${index}`}
                    layout="position"
                    transition={{ type: 'spring', damping: 26, stiffness: 220, mass: 0.8 }}
                    className={`relative w-full h-full rounded-xl sm:rounded-2xl transition-all duration-300 overflow-hidden bg-zinc-950/60 backdrop-blur-md border ${
                      isLineActive
                        ? 'border-white/90 ring-2 ring-white/60 shadow-[0_0_25px_rgba(255,255,255,0.45)] bg-white/5 scale-[1.01] z-20'
                        : inRadarCenter
                          ? 'border-red-500/90 ring-2 ring-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.5)] bg-red-950/30 z-10'
                          : inRadarArea
                            ? 'border-blue-500/80 ring-1 ring-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.35)] bg-blue-950/20 z-0'
                            : 'border-white/10 hover:border-zinc-500/50 shadow-[0_4px_16px_rgba(0,0,0,0.6)]'
                    } ${!char.isAlive ? 'grayscale opacity-35' : ''}`}
                  >
                    {/* Тактический номер ячейки #01–#25 */}
                    <span className="absolute top-1 left-1.5 z-20 font-mono text-xs sm:text-sm 2xl:text-base font-black text-zinc-300 bg-black/90 px-2 py-0.5 rounded border border-zinc-800/80 pointer-events-none shadow">
                      #{String(index + 1).padStart(2, '0')}
                    </span>

                    {/* Карточка персонажа */}
                    <CharacterCard
                      mode={gameState?.mode || 'MANIAC_VS_OPERATIVE'}
                      character={char}
                      isSelected={isLineActive}
                      isUniformedOfficer={Boolean(gameState?.uniformedOfficers?.includes(char.id))}
                      isTargetVictim={Boolean(gameState?.mode === 'MANIAC_VS_OPERATIVE' && gameState?.victimList?.[0] === char.id)}
                      isRadarCenter={inRadarCenter}
                      isPVP={true}
                      onClick={() => {}}
                    />

                    {/* Индикатор направления сдвига на крайних карточках выбранной линии */}
                    <AnimatePresence>
                      {isLineActive && selectedLineDir && (
                        ((selectedLineType === 'ROW' && ((selectedLineDir === 'FORWARD' && col === boardSize - 1) || (selectedLineDir === 'BACKWARD' && col === 0))) ||
                         (selectedLineType === 'COL' && ((selectedLineDir === 'FORWARD' && row === boardSize - 1) || (selectedLineDir === 'BACKWARD' && row === 0)))) && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-xs rounded-xl sm:rounded-2xl"
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

                    {/* Состояние ликвидации: затемнение и красный глитч-маркер */}
                    <AnimatePresence>
                      {!char.isAlive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/50 backdrop-blur-xs"
                        >
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-red-500/60 bg-red-950/80 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-wider text-red-200">
                              ВЫБЫЛ
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ПРАВАЯ ЗОНА (~32%): Неоново-стеклянный терминал хода (считываемость с 3-4 метров) */}
        <div className="w-[34%] lg:w-[32%] h-full flex flex-col gap-3 sm:gap-4 min-w-0 justify-between">
          
          {/* СУПЕР-ДОМИНАНТА: ТЕКУЩИЙ АКТИВНЫЙ ХОД (ВИДНО С ДИВАНА) */}
          <div className={`p-4 sm:p-5 rounded-3xl border-2 transition-all duration-500 shadow-2xl relative overflow-hidden shrink-0 ${
            isKillerTurn
              ? 'border-rose-600/90 bg-gradient-to-br from-red-950/85 via-zinc-900/95 to-zinc-950 shadow-[0_0_40px_rgba(225,29,72,0.35)]'
              : 'border-blue-500/90 bg-gradient-to-br from-blue-950/85 via-zinc-900/95 to-zinc-950 shadow-[0_0_40px_rgba(37,99,235,0.35)]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] 2xl:text-xs font-mono font-bold uppercase tracking-widest border shadow-sm ${
                isKillerTurn
                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                  : 'bg-blue-950/80 border-blue-500/50 text-blue-300'
              }`}>
                <span className={`h-2 w-2 rounded-full animate-ping ${isKillerTurn ? 'bg-rose-400' : 'bg-blue-400'}`} />
                ТЕКУЩИЙ ХОД
              </span>
              <span className="text-xs font-mono text-zinc-400 font-bold uppercase">ФАЗА ДЕЙСТВИЯ</span>
            </div>

            {/* Карточка активного хода */}
            <div className="flex items-center gap-3.5 my-1">
              <div className={`w-14 h-14 2xl:w-16 2xl:h-16 rounded-2xl border-2 flex items-center justify-center font-mono text-2xl 2xl:text-3xl font-black text-white shrink-0 shadow-2xl ${
                isKillerTurn
                  ? 'bg-red-600 border-white/40 shadow-[0_0_20px_rgba(225,29,72,0.6)]'
                  : 'bg-blue-600 border-white/40 shadow-[0_0_20px_rgba(37,99,235,0.6)]'
              }`}>
                {activeTurnName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] 2xl:text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
                  АКТИВНЫЙ ИГРОК
                </div>
                <div className="text-xl sm:text-2xl 2xl:text-3xl font-black tracking-wider uppercase truncate text-white drop-shadow">
                  ХОД: {activeTurnName.toUpperCase()}
                </div>
                <div className="text-xs 2xl:text-sm text-zinc-300 font-medium truncate mt-0.5">
                  Управление с мобильного контроллера
                </div>
              </div>
            </div>

            {/* Таймер хода */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 text-zinc-400 uppercase tracking-wider">
                <Icons.Clock />
                ТАЙМЕР ХОДА
              </span>
              <span className="text-xs 2xl:text-sm font-bold text-zinc-300 bg-black/60 px-2.5 py-0.5 rounded-lg border border-white/10">
                БЕЗ ЛИМИТА (DEV)
              </span>
            </div>
          </div>

          {/* ВИДЖЕТ 2: БЛОК ДОСТУПНЫХ ДЕЙСТВИЙ ТЕКУЩЕЙ РОЛИ И ВЫБРАННАЯ ЛИНИЯ */}
          <div className="p-4 sm:p-5 rounded-3xl bg-zinc-950/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col gap-3 shrink-0">
            {/* Блок «Выбранная линия» (живой предпросмотр тактического сдвига) */}
            {selectedLine ? (
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-blue-400/50 shadow-[0_0_25px_rgba(37,99,235,0.25)] space-y-1.5">
                <div className="text-[10px] 2xl:text-xs font-mono uppercase tracking-widest text-blue-300 flex items-center gap-2 font-bold">
                  <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  ВЫБРАННАЯ ЛИНИЯ (МАНЕВР С ПУЛЬТА)
                </div>
                <div className="text-base sm:text-lg 2xl:text-xl font-black text-white tracking-wide flex items-center justify-between">
                  <span>{selectedLineType === 'ROW' ? `РЯД #${selectedLineIdx}` : `СТОЛБЕЦ #${selectedLineIdx}`}</span>
                  {selectedLineDir && (
                    <span className="text-xs 2xl:text-sm font-mono uppercase text-blue-200 font-black px-3 py-1 rounded-xl bg-blue-950/90 border border-blue-400/60 shadow-[0_0_12px_rgba(37,99,235,0.4)]">
                      {selectedLineType === 'ROW'
                        ? (selectedLineDir === 'FORWARD' ? 'ВПРАВО →' : '← ВЛЕВО')
                        : (selectedLineDir === 'FORWARD' ? 'ВНИЗ ↓' : '↑ ВВЕРХ')}
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {/* Публичный список действий роли */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs 2xl:text-sm font-mono font-bold uppercase tracking-widest text-zinc-400">
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${isKillerTurn ? 'bg-rose-500' : 'bg-blue-500'}`} />
                  ДЕЙСТВИЯ РОЛИ: {activeTurnName.toUpperCase()}
                </span>
                <span className="text-[10px] 2xl:text-xs text-zinc-500 font-mono">ОБЩИЙ ОБЗОР</span>
              </div>

              {/* Действие 1: Сдвиг поля */}
              <div className={`p-2.5 2xl:p-3 rounded-2xl border flex items-center justify-between transition-all ${
                selectedLine
                  ? 'bg-gradient-to-r from-blue-900/80 via-blue-950/90 to-zinc-950 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                  : 'bg-gradient-to-r from-blue-950/40 via-zinc-900/60 to-zinc-950 border-blue-500/30'
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-400/50 flex items-center justify-center text-blue-300">
                    <ActionIcons.Shift className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-xs 2xl:text-sm font-black uppercase text-white tracking-wide">СДВИГ ПОЛЯ</div>
                    <div className="text-[10px] 2xl:text-xs font-mono text-zinc-400">
                      {selectedLine ? 'Манёвр перемещения линии активен' : 'Перемещение ряда или столбца'}
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                  selectedLine
                    ? 'bg-blue-600 text-white border-blue-400 animate-pulse shadow-md shadow-blue-500/50'
                    : 'bg-zinc-900 text-zinc-300 border-white/10'
                }`}>
                  {selectedLine ? 'В ПРОЦЕССЕ' : 'ДОСТУПНО'}
                </span>
              </div>

              {/* Специфические действия роли */}
              {roleSpecificActions.map((act, i) => {
                const borderClass = act.tone === 'red'
                  ? 'border-rose-600/40 bg-gradient-to-r from-red-950/60 via-zinc-900/70 to-zinc-950 shadow-md shadow-red-950/20'
                  : act.tone === 'blue'
                  ? 'border-blue-500/40 bg-gradient-to-r from-blue-950/60 via-zinc-900/70 to-zinc-950 shadow-md shadow-blue-950/20'
                  : act.tone === 'amber'
                  ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-zinc-900/70 to-zinc-950 shadow-md shadow-amber-950/20'
                  : 'border-zinc-700/60 bg-gradient-to-r from-zinc-900/80 via-zinc-900/60 to-zinc-950';

                return (
                  <div key={i} className={`p-2.5 2xl:p-3 rounded-2xl border flex items-center justify-between transition-all ${borderClass}`}>
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center">
                        {act.icon}
                      </span>
                      <div>
                        <div className="text-xs 2xl:text-sm font-black uppercase text-white tracking-wide">{act.name}</div>
                        <div className="text-[10px] 2xl:text-xs font-mono text-zinc-400">{act.desc}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                      act.badge === '1 ПОПЫТКА'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 font-black'
                        : 'bg-zinc-900 text-zinc-300 border-white/10'
                    }`}>
                      {act.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ХРОНИКА РАССЛЕДОВАНИЯ (ПОЛНОЦЕННЫЙ ЖУРНАЛ СОБЫТИЙ) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-zinc-950/80 border border-white/10 backdrop-blur-xl shadow-xl flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between text-xs 2xl:text-sm font-mono uppercase tracking-widest text-zinc-400 mb-2.5 font-bold shrink-0">
              <span className="flex items-center gap-2">
                <Icons.Terminal />
                ХРОНИКА РАССЛЕДОВАНИЯ
              </span>
              <span className="text-[10px] 2xl:text-xs font-mono uppercase tracking-wider text-zinc-500">ПРОТОКОЛ</span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto min-h-0 pr-1 text-xs md:text-sm font-sans">
              {gameState?.log && gameState.log.length > 0 ? (
                gameState.log.slice(-8).map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 text-zinc-200 flex items-start gap-2.5 shadow-xs backdrop-blur-xs font-sans leading-relaxed"
                  >
                    <span className="text-blue-400 font-mono font-bold shrink-0">›</span>
                    <span className="flex-1 text-xs 2xl:text-sm">{entry}</span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 italic text-center my-auto font-sans text-xs sm:text-sm">
                  Ожидание тактических действий...
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* НИЖНЯЯ СТРОКА: D-PAD ПОДСКАЗКИ ДЛЯ ПУЛЬТА */}
      <div className="flex items-center justify-between px-6 py-2.5 rounded-2xl bg-black/70 border border-white/10 text-xs 2xl:text-sm font-mono text-zinc-400 shrink-0 shadow-lg z-10">
        <span className="flex items-center gap-2 text-blue-400 font-bold">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          ТВ-ПУЛЬТ: [ESC / Меню] Управление паузой • [Стрелки / OK] Выбор действия
        </span>
        <span className="text-zinc-500 font-medium hidden sm:inline">AUTONOMOUS WEBSOCKET • SECURE SERVER MASKING ACTIVE</span>
      </div>

      {/* МОДАЛЬНОЕ МЕНЮ ПАУЗЫ (SYSTEM PAUSE MODAL С ПОЛНОЙ D-PAD ПОДДЕРЖКОЙ) */}
      <div
        aria-hidden={!isPauseOpen && focusedControl === 'NONE'}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 select-none transition-all duration-300 ${
          isPauseOpen || focusedControl !== 'NONE' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-zinc-950 border-2 border-white/20 shadow-2xl space-y-6 text-center">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-zinc-300">
                <Icons.Settings />
              </span>
              <span className="text-base sm:text-lg font-black uppercase text-white tracking-wider">
                МЕНЮ ПАУЗЫ МАТЧА
              </span>
            </div>
            <button
              onClick={() => {
                setIsPauseOpen(false);
                setFocusedControl('NONE');
              }}
              className="text-xs font-mono text-zinc-400 hover:text-white transition cursor-pointer"
            >
              [ESC] ЗАКРЫТЬ
            </button>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed text-left font-sans">
            Игра приостановлена на телевизоре. Выберите действие с помощью ТВ-пульта:
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setIsPauseOpen(false);
                setFocusedControl('NONE');
              }}
              className={`w-full p-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between shadow-lg cursor-pointer transition active:scale-95 ${
                focusedControl === 'CONTINUE'
                  ? 'bg-blue-500 border border-white ring-2 ring-white text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <span>ПРОДОЛЖИТЬ МАТЧ</span>
              <span className="font-mono text-xs">OK / ENTER ➔</span>
            </button>

            {onRestart && (
              <button
                onClick={() => {
                  setIsPauseOpen(false);
                  setFocusedControl('NONE');
                  onRestart();
                }}
                data-testid="tv-restart-btn"
                className={`w-full p-4 rounded-2xl border font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between transition cursor-pointer ${
                  focusedControl === 'RESTART'
                    ? 'border-white/90 ring-2 ring-white bg-zinc-800 text-white shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                    : 'border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                <span>НАЧАТЬ ЗАНОВО (РЕВАНШ)</span>
                <span className="text-[10px] font-mono text-zinc-400">ТРЕБУЕТ СОГЛАСИЯ</span>
              </button>
            )}

            {onExit && (
              <button
                onClick={() => {
                  setIsPauseOpen(false);
                  setFocusedControl('NONE');
                  onExit();
                }}
                data-testid="tv-exit-btn"
                className={`w-full p-4 rounded-2xl border font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between transition cursor-pointer ${
                  focusedControl === 'EXIT'
                    ? 'border-red-500/90 ring-2 ring-red-500 bg-red-950/80 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                    : 'border-red-900/60 bg-red-950/40 hover:bg-red-900/60 text-red-300'
                }`}
              >
                <span>ВЫЙТИ В ГЛАВНОЕ МЕНЮ</span>
                <span className="text-[10px] font-mono text-red-400">ЗАВЕРШИТЬ СЕССИЮ</span>
              </button>
            )}
          </div>

          <div className="p-3 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-zinc-400 text-left">
            Защита от случайного нажатия: выход подтверждается через меню.
          </div>
        </div>
      </div>
    </div>
  );
};
