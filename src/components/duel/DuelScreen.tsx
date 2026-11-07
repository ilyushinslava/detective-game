import { useReducer, useEffect, useState, useMemo } from "react";
import { createInitialDuelState, duelReducer } from "../../utils/duelLogic";
import type { DuelCharacter } from "../../types/duel";
import type { Role, GameState, Character } from "../../types/game";
import { GameBoard } from "../GameBoard";
import { DUEL_CHARACTERS } from "../../constants/duelCharacters";
import { DuelQuestionCatalogModal } from "./DuelQuestionCatalogModal";
import { DuelCandidatesSheet } from "./DuelCandidatesSheet";
import { DuelAccuseModal } from "./DuelAccuseModal";
import { PauseModal } from "../PauseModal";

const characterImages = import.meta.glob<{ default: string }>(
  "../../assets/characters/*.webp",
  { eager: true }
);

interface DuelScreenProps {
  onBackToMenu: () => void;
  playerRole?: Role;
  gameState?: GameState;
  isOnline?: boolean;
  onDispatchAction?: (action: any) => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const Icons = {
  Back: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  Question: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Folder: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

export const DuelScreen = ({
  onBackToMenu,
  playerRole = "DETECTIVE",
  gameState,
  isOnline = false,
  onDispatchAction,
}: DuelScreenProps) => {
  const [localState, localDispatch] = useReducer(duelReducer, undefined, createInitialDuelState);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isCandidatesOpen, setIsCandidatesOpen] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [accuseTarget, setAccuseTarget] = useState<DuelCharacter | null>(null);

  const state = (
    isOnline && gameState
      ? {
          board: DUEL_CHARACTERS.map((char) => {
            const flat = gameState.board ? gameState.board.flat() : [];
            const found = flat.find((c) => c.id === char.id);
            return { ...char, ...(found || {}), attributes: char.attributes };
          }),
          killerSecretId: gameState.killerSecretId,
          detectiveSecretId: gameState.detectiveSecretId,
          currentTurn: gameState.currentTurn || "DETECTIVE",
          turnTimeRemaining: localState.turnTimeRemaining,
          matchTimeRemaining: localState.matchTimeRemaining,
          penalties: gameState.duelPenalties || { DETECTIVE: 0, KILLER: 0 },
          accusedTargets: gameState.accusedTargets || { DETECTIVE: [], KILLER: [] },
          history: (gameState.duelHistory as any) || [],
          winner: gameState.winner,
          winReason: gameState.winReason,
        }
      : localState
  ) as typeof localState;

  const dispatch = (action: any) => {
    if (isOnline && onDispatchAction) {
      if (action.type === "ASK_QUESTION") {
        onDispatchAction({ type: "DUEL_ASK_QUESTION", payload: action.payload });
      } else if (action.type === "ACCUSE") {
        onDispatchAction({ type: "DUEL_ACCUSE", payload: action.payload });
      } else if (action.type === "TIMEOUT_PASS") {
        onDispatchAction({ type: "DUEL_TIMEOUT_PASS" });
      } else if (action.type === "RESTART_DUEL") {
        onDispatchAction({ type: "RESTART_DUEL" });
      } else {
        localDispatch(action);
      }
    } else {
      localDispatch(action);
    }
  };

  useEffect(() => {
    if (state.winner) return;

    const interval = setInterval(() => {
      dispatch({ type: "TICK_TIMER" });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.winner]);

  const mySecretId = playerRole === "DETECTIVE" ? state.detectiveSecretId : state.killerSecretId;
  const isAlreadyAccused = accuseTarget
    ? state.accusedTargets[state.currentTurn].includes(accuseTarget.id)
    : false;

  const boardMatrix = useMemo<Character[][]>(() => {
    const flat = state.board || [];
    const accused = state.accusedTargets?.[state.currentTurn] || [];
    const matrix: Character[][] = [];
    for (let r = 0; r < 5; r++) {
      matrix.push(
        flat.slice(r * 5, r * 5 + 5).map((c) => ({
          id: c.id,
          name: c.name,
          isAlive: !accused.includes(c.id),
          isExonerated: accused.includes(c.id),
        }))
      );
    }
    return matrix;
  }, [state.board, state.accusedTargets, state.currentTurn]);

  const isTurnUrgent = state.turnTimeRemaining <= 5;

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-black text-zinc-100 flex flex-col justify-between p-3 select-none overflow-hidden relative">
      {/* Top Header Bar */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-zinc-900">
        <button
          onClick={() => setIsPauseOpen(true)}
          className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs font-semibold uppercase tracking-wider transition cursor-pointer shrink-0"
        >
          <Icons.Back />
          <span>Меню</span>
        </button>

        {/* Turn & Penalty Indicators */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                state.currentTurn === "DETECTIVE"
                  ? "text-blue-400 bg-blue-950/60 border-blue-900/60"
                  : "text-red-400 bg-red-950/60 border-red-900/60"
              }`}
            >
              {state.currentTurn === "DETECTIVE" ? "Ход: Следователь" : "Ход: Подозреваемый"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 mt-1">
            <span className="text-blue-400/80">СЛ: {state.penalties.DETECTIVE}</span>
            <span>|</span>
            <span className="text-red-400/80">ПОД: {state.penalties.KILLER}</span>
          </div>
        </div>

        {/* Timers */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-xl text-xs font-mono tabular-nums text-zinc-300">
            <Icons.Clock />
            <span>{formatTime(state.matchTimeRemaining)}</span>
          </div>
          <div
            className={`px-2 py-1 rounded-xl text-xs font-mono font-bold tabular-nums border ${
              isTurnUrgent
                ? "bg-red-950/70 border-red-500 text-red-300 animate-pulse"
                : "bg-zinc-900 border-zinc-800 text-zinc-300"
            }`}
          >
            {state.turnTimeRemaining}s
          </div>
        </div>
      </header>

      {/* 5x5 Character Board */}
      <main className="flex-1 min-h-0 flex items-center justify-center my-1 sm:my-2 overflow-hidden">
        <div className="w-full max-w-xl max-h-[50vh] aspect-square mx-auto flex items-center justify-center">
          <GameBoard
            mode="LINE_UP"
            board={boardMatrix}
            selectedCharacterId={accuseTarget?.id || null}
            onSelectCharacter={(id) => {
              if (state.winner) return;
              const found = state.board.find((c) => c.id === id);
              if (found) setAccuseTarget(found);
            }}
            myCharacterId={mySecretId}
            myRoleColor={playerRole === "KILLER" ? "red" : "blue"}
            onShift={() => {}}
            killerAdjacentIds={[]}
            detectiveAdjacentIds={[]}
            showKillerHints={false}
            showDetectiveHints={false}
            lastShift={null}
          />
        </div>
      </main>

      {/* Bottom Action Bar Slot */}
      <footer className="w-full max-w-xl mx-auto flex items-center gap-2 shrink-0 pt-2 border-t border-zinc-900 z-20 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => setIsCatalogOpen(true)}
          disabled={Boolean(state.winner)}
          className="flex-1 h-11 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 border border-blue-500/50 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.25)] transition cursor-pointer disabled:cursor-not-allowed"
        >
          <Icons.Question />
          <span>Задать вопрос</span>
        </button>

        <button
          onClick={() => setIsCandidatesOpen(true)}
          className="h-11 px-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
        >
          <Icons.Folder />
          <span>Досье</span>
        </button>

        <button
          onClick={() => dispatch({ type: "TIMEOUT_PASS" })}
          disabled={Boolean(state.winner)}
          className="h-11 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center transition cursor-pointer shrink-0 disabled:cursor-not-allowed"
        >
          Пропуск
        </button>
      </footer>

      {/* Winner Overlay Banner */}
      {state.winner && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black mb-3 border ${
                state.winner === "DETECTIVE"
                  ? "bg-blue-950/60 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  : state.winner === "KILLER"
                  ? "bg-red-950/60 border-red-500 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                  : "bg-zinc-900 border-zinc-600 text-zinc-300"
              }`}
            >
              {state.winner === "DRAW" ? "=" : "VS"}
            </div>

            <h2 className="text-lg font-black uppercase tracking-widest text-zinc-100 mb-1">
              {state.winner === "DETECTIVE"
                ? "Победа Следователя!"
                : state.winner === "KILLER"
                ? "Победа Подозреваемого!"
                : "Ничья в раунде!"}
            </h2>

            <p className="text-xs text-zinc-400 font-medium mb-6 leading-relaxed">
              {state.winReason === "ACCUSATION"
                ? "Точное разоблачение личности"
                : state.winReason === "TIE_BREAK_PENALTIES"
                ? "Победа по наименьшему числу штрафов"
                : state.winReason === "TIE_BREAK_CANDIDATES"
                ? "Победа по числу оставшихся кандидатов"
                : "Равенство всех показателей тай-брейка"}
            </p>

            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => dispatch({ type: "RESTART_DUEL" })}
                className="w-full h-11 bg-zinc-100 hover:bg-white text-zinc-950 font-black text-xs uppercase tracking-widest rounded-xl transition cursor-pointer shadow-lg"
              >
                Реванш
              </button>
              <button
                onClick={onBackToMenu}
                className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                В меню
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <DuelQuestionCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectQuestion={(questionId) => {
          dispatch({ type: "ASK_QUESTION", payload: { questionId } });
        }}
      />

      <DuelCandidatesSheet
        isOpen={isCandidatesOpen}
        onClose={() => setIsCandidatesOpen(false)}
        allCharacters={state.board}
        history={state.history}
        playerRole={state.currentTurn}
        onSelectCandidate={(charId) => {
          const found = state.board.find((c) => c.id === charId);
          if (found) setAccuseTarget(found);
        }}
      />

      <DuelAccuseModal
        isOpen={Boolean(accuseTarget)}
        targetCharacter={accuseTarget}
        alreadyAccused={isAlreadyAccused}
        onClose={() => setAccuseTarget(null)}
        onConfirmAccusation={() => {
          if (accuseTarget) {
            dispatch({ type: "ACCUSE", payload: { targetId: accuseTarget.id } });
            setAccuseTarget(null);
          }
        }}
      />

      <PauseModal
        isOpen={isPauseOpen}
        onClose={() => setIsPauseOpen(false)}
        onResume={() => setIsPauseOpen(false)}
        onRemindRole={() => setIsCandidatesOpen(true)}
        onLeaveGame={onBackToMenu}
      />
    </div>
  );
};
