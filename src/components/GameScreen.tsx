import React, { memo } from "react";
import type { Character, GameState } from "../types/game";
import { SPY_COLORS } from "../types/game";
import { GameBoard } from "./GameBoard";
import { RoleCards } from "./RoleCards";
import { GameSheets } from "./GameSheets";
import { soundManager } from "../utils/audio";

export interface GameScreenProps {
  gameState: GameState;
  isHumanTurn: boolean;
  currentRoleName: string;
  actionPanelRoleName: string;
  pillClasses: string;
  dotClasses: string;
  secondsElapsed: number;
  formatTimer: (totalSeconds: number) => string;
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  killerAdjacentIds: string[];
  detectiveAdjacentIds: string[];
  activeAgentAdjacentIds: string[];
  showKillerRole: boolean;
  setShowKillerRole: (val: boolean) => void;
  showDetectiveRole: boolean;
  setShowDetectiveRole: (val: boolean) => void;
  showSpyP1Role: boolean;
  setShowSpyP1Role: (val: boolean) => void;
  showSpyP2Role: boolean;
  setShowSpyP2Role: (val: boolean) => void;
  role1Name: string;
  role2Name: string;
  killerNameText: string;
  detectiveNameText: string;
  canPeekKiller: boolean;
  canPeekDetective: boolean;
  isPVP: boolean;
  myRoleColor: "red" | "blue";
  myCharacterId: string | null;
  effectiveRadarTargetId: string | null;
  effectiveRadarCellIds: string[];
  effectiveRadarColorClass: string | null;
  errorCardId: string | null;
  targetActions: Array<{
    id: string;
    label: string;
    disabled?: boolean;
    className: string;
    onClick: () => void;
  }>;
  cleanupAction?: {
    disabled?: boolean;
    onClick: () => void;
  } | null;
  isCleanupAvailable: boolean;
  isDetectiveView: boolean;
  isDetectiveTurn: boolean;
  isKillerTurn: boolean;
  isHandSheetOpen: boolean;
  setIsHandSheetOpen: (val: boolean) => void;
  isLogOpen: boolean;
  setIsLogOpen: (val: boolean) => void;
  unreadLogCount: number;
  setUnreadLogCount: (val: number) => void;
  logContainerRef: React.RefObject<HTMLDivElement>;
  allChars: Character[];
  characterImages: Record<string, { default: string }>;
  selectedCharacter: Character | null;
  handleReset: () => void;
  handleShift: (type: "ROW" | "COL", index: number, direction: "FORWARD" | "BACKWARD") => void;
  handleExonerateFromHand: (id: string) => void;
  handleFastDisguise: (id: string) => void;
  setIsPauseOpen: (val: boolean) => void;
  setIsNotebookOpen: (val: boolean) => void;
  isOpponentConnected: boolean;
  opponentDisconnectedNotice: boolean;
  isInspectorPending?: boolean;
}

export const GameScreen: React.FC<GameScreenProps> = memo(({
  gameState,
  isHumanTurn,
  currentRoleName,
  actionPanelRoleName,
  pillClasses,
  dotClasses,
  secondsElapsed,
  formatTimer,
  selectedId,
  setSelectedId,
  killerAdjacentIds,
  detectiveAdjacentIds,
  showKillerRole,
  setShowKillerRole,
  showDetectiveRole,
  setShowDetectiveRole,
  showSpyP1Role,
  setShowSpyP1Role,
  showSpyP2Role,
  setShowSpyP2Role,
  role1Name,
  role2Name,
  killerNameText,
  detectiveNameText,
  canPeekKiller,
  canPeekDetective,
  isPVP,
  myRoleColor,
  myCharacterId,
  effectiveRadarTargetId,
  effectiveRadarCellIds,
  effectiveRadarColorClass,
  errorCardId,
  targetActions,
  cleanupAction,
  isCleanupAvailable,
  isDetectiveView,
  isDetectiveTurn,
  isKillerTurn,
  isHandSheetOpen,
  setIsHandSheetOpen,
  isLogOpen,
  setIsLogOpen,
  unreadLogCount,
  setUnreadLogCount,
  logContainerRef,
  allChars,
  characterImages,
  selectedCharacter,
  handleReset,
  handleShift,
  handleExonerateFromHand,
  handleFastDisguise,
  setIsPauseOpen,
  setIsNotebookOpen,
  isOpponentConnected,
  opponentDisconnectedNotice,
  isInspectorPending,
}) => {
  const hideFooter = isInspectorPending ?? Boolean(
    gameState.mode === "SKHVATKA" &&
    gameState.inspectorChoices &&
    gameState.inspectorChoices.length > 0 &&
    isDetectiveView &&
    isDetectiveTurn &&
    !gameState.winner
  );

  return (
    <>
      <header className="w-full px-4 sm:px-6 pb-2.5 bg-zinc-950 border-b border-zinc-800 shrink-0 relative flex items-center justify-between z-50 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPauseOpen(true)}
            className="w-8 h-8 md:w-11 md:h-11 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer"
            title="Пауза и меню"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 md:w-5 md:h-5">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          </button>
          <button
            onClick={() => setIsNotebookOpen(true)}
            className="w-8 h-8 md:w-11 md:h-11 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer"
            title="Блокнот подозреваемых"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 md:w-5 md:h-5">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </button>
          <button
            onClick={() => {
              setIsLogOpen(true);
              setUnreadLogCount(0);
            }}
            className="relative w-8 h-8 md:w-11 md:h-11 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center font-bold text-xs md:text-sm shrink-0 cursor-pointer lg:hidden"
            title="Блокнот расследования"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 md:w-5 md:h-5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            {unreadLogCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                {unreadLogCount}
              </span>
            )}
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex justify-center shrink-0">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5 rounded-full border text-[10px] md:text-xs font-black tracking-wider uppercase transition-all shadow max-w-[140px] sm:max-w-[200px] truncate ${gameState.winner === "KILLER" ? "bg-red-950/90 border-red-600 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : gameState.winner === "DETECTIVE" ? "bg-blue-950/90 border-blue-600 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : pillClasses}`}
          >
            {gameState.winner === null && (
              <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${dotClasses}`}
                />
              </span>
            )}
            <span className="whitespace-nowrap truncate">
              {gameState.winner !== null ? (gameState.winner === "KILLER" ? "ПОБЕДА КРИМИНАЛА" : "ПОБЕДА ЗАКОНА") : gameState.opponent === "ONLINE"
                ? isHumanTurn
                  ? "Ваш ход"
                  : "Ход врага"
                : currentRoleName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded-lg px-3 h-9 md:h-11 text-xs md:text-sm font-mono text-zinc-400">
            {formatTimer(secondsElapsed)}
          </div>
          <button
            onClick={handleReset}
            className="px-3 h-7 md:h-11 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center justify-center text-[10px] md:text-sm font-bold cursor-pointer shrink-0"
          >
            Заново
          </button>
        </div>
      </header>

      {!isOpponentConnected && !opponentDisconnectedNotice && gameState.opponent === "ONLINE" && (
        <div className="w-full bg-zinc-900 border-b border-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest py-2 flex justify-center items-center gap-2 shadow-inner z-20">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-ping" />
          Соперник переподключается... (ожидание)
        </div>
      )}

      <div className="w-full px-3 md:px-6 py-1.5 md:py-2 bg-zinc-950/90 border-b border-zinc-900 flex items-center justify-between text-[10px] md:text-xs text-zinc-400 shrink-0">
        {gameState.mode === "SECRET_SERVICE" ? (
          <div className="flex items-center gap-3 truncate">
            {gameState.spies?.map((spy, idx) => {
              const color = SPY_COLORS[idx % SPY_COLORS.length];
              return (
                <span
                  key={spy.id}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${color.bg} border ${color.border}`}
                  />
                  <span className="text-zinc-300 font-medium">
                    {spy.name}:
                  </span>
                  <b className={`${color.text} font-black`}>
                    {spy.trophies}/{gameState.spyTargetTrophies}
                  </b>
                </span>
              );
            })}
          </div>
        ) : gameState.mode === "LINE_UP" ? (
          <div className="flex items-center gap-3">
            <span className="text-red-400 font-bold">Штрафы:</span>
            <span>Следствие: <b className="text-zinc-200">{gameState.duelPenalties?.DETECTIVE ?? 0}</b></span>
            <span>Подозреваемый: <b className="text-zinc-200">{gameState.duelPenalties?.KILLER ?? 0}</b></span>
            <span className="ml-2">| Вопросов: {(gameState.duelHistory || []).length}</span>
          </div>
        ) : gameState.mode === "THIEF_HUNT" ? (
          <div className="flex items-center gap-1.5">
            <span>Добыча:</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-amber-400 shrink-0">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" />
            </svg>
            <b className="text-amber-300 font-bold">
              {gameState.trophiesKiller ?? 0}/10
            </b>
            <span className="ml-1">| Улики: {gameState.evidenceDeck.length}</span>
          </div>
        ) : (
          <div className="flex items-center flex-wrap gap-x-1">
            <span>Жертвы:</span>
            <b className="text-red-400">
              {gameState.killCount}/{gameState.mode === "MANIAC_VS_OPERATIVE" ? 4 : 14}
            </b>
            <span className="ml-1">| Улики: {gameState.evidenceDeck.length}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
          <span className="hidden md:inline">Режим:</span>
          <span>
            {gameState.opponent === "ONLINE"
              ? "онлайн"
              : gameState.opponent === "AI"
                ? "против бота"
                : "вдвоем"}
          </span>
        </div>
      </div>

      <div className="w-full px-3 h-8 md:h-12 shrink-0 flex items-center justify-center">
        {gameState.lastInterrogation && !gameState.winner ? (
          <div
            className={`w-full h-full px-2.5 rounded-lg border flex items-center justify-between text-[10px] md:text-sm shadow-sm ${gameState.lastInterrogation.isNear ? "bg-red-950/80 border-red-700 text-red-200" : "bg-zinc-900/90 border-zinc-800 text-zinc-300"}`}
          >
            <span className="font-semibold truncate mr-2">
              {gameState.lastInterrogation.interrogator === "DETECTIVE"
                ? `Алиби (${gameState.lastInterrogation.targetName}): враг рядом?`
                : `Жертва (${gameState.lastInterrogation.targetName}): законник рядом?`}
            </span>
            <span
              className={`shrink-0 px-2 py-0.5 rounded text-[9px] md:text-xs font-black uppercase border ${gameState.lastInterrogation.isNear ? "bg-red-900 text-red-100 border-red-500 animate-pulse" : "bg-blue-950 text-blue-300 border-blue-700"}`}
            >
              {gameState.lastInterrogation.isNear ? "Враг рядом" : "Вне зоны"}
            </span>
          </div>
        ) : gameState.lastSpyInterrogation && !gameState.winner ? (
          <div className="w-full h-full px-2.5 rounded-lg border border-zinc-800 bg-zinc-900/90 flex items-center justify-between text-[10px] md:text-sm shadow-sm">
            <span className="font-bold text-zinc-300 truncate mr-2">
              Допрос:{" "}
              <b className="text-zinc-100">
                {gameState.lastSpyInterrogation.targetName}
              </b>
            </span>
            <div className="flex gap-1.5 shrink-0">
              {gameState.spies?.map((spy) => {
                const hasContact =
                  gameState.lastSpyInterrogation?.raisedHandsPlayerNames.includes(
                    spy.name
                  );
                return (
                  <span
                    key={spy.id}
                    className={`px-1.5 py-0.5 rounded text-[8.5px] md:text-[10px] font-black uppercase border ${hasContact ? "bg-red-950 text-red-400 border-red-700 animate-pulse" : "bg-zinc-950 text-zinc-500 border-zinc-800"}`}
                  >
                    {spy.name.replace("Агент «", "").replace("»", "")}:{" "}
                    {hasContact ? "РЯДОМ" : "НЕТ"}
                  </span>
                );
              })}
            </div>
          </div>
        ) : gameState.mode === "MANIAC_VS_OPERATIVE" && gameState.victimList.length > 0 && !gameState.winner ? (
          <div className="w-full h-full px-2.5 rounded-lg border border-red-900/60 bg-red-950/40 flex items-center justify-between text-[10px] md:text-sm shadow-sm">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-red-400 font-bold uppercase tracking-wider shrink-0 text-[9px] md:text-xs">Цель:</span>
              <span className="text-zinc-100 font-black truncate">
                {allChars.find((c) => c.id === gameState.victimList[0])?.name ?? gameState.victimList[0]}
              </span>
              <span className="text-[9px] md:text-xs font-semibold tracking-normal text-red-400/90 shrink-0">
                (#{gameState.victimList[0].replace("c", "").padStart(2, "0")})
              </span>
            </div>
            <div className="shrink-0 font-medium tracking-normal text-[9px] sm:text-[10px] md:text-xs text-zinc-400 ml-2 flex items-center gap-1">
              <span>В очереди:</span> <b className="font-bold tabular-nums text-red-400">{gameState.victimList.length}</b>
            </div>
          </div>
        ) : (
          <div className="w-full h-full px-2.5 rounded-lg border border-dashed border-zinc-900 flex items-center justify-center text-[10px] md:text-sm text-zinc-600 font-medium">
            Оперативные показания: ожидание допроса
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 w-full flex flex-col landscape:flex-row items-center justify-between gap-1 sm:gap-2 md:gap-6 px-2 sm:px-4 md:px-6 py-1 md:py-3 overflow-hidden">
        <main className="flex-1 min-h-0 w-full max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl landscape:max-w-none flex flex-col items-center justify-center relative antialiased">
          <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center overflow-hidden relative antialiased">
            <GameBoard
              mode={gameState.mode}
              board={gameState.board}
              selectedCharacterId={selectedId}
              killerAdjacentIds={killerAdjacentIds}
              detectiveAdjacentIds={detectiveAdjacentIds}
              showKillerHints={
                gameState.mode === "SECRET_SERVICE"
                  ? showSpyP1Role
                  : showKillerRole
              }
              showDetectiveHints={
                gameState.mode === "SECRET_SERVICE"
                  ? showSpyP2Role
                  : showDetectiveRole
              }
              lastShift={gameState.lastShift}
              lastRobbedId={gameState.lastRobbedId}
              uniformedOfficerIds={gameState.uniformedOfficers}
              targetVictimId={
                gameState.mode === "MANIAC_VS_OPERATIVE"
                  ? gameState.victimList[0]
                  : null
              }
              radarTargetId={effectiveRadarTargetId}
              radarCellIds={effectiveRadarCellIds}
              radarColorClass={effectiveRadarColorClass}
              errorCardId={errorCardId}
              myCharacterId={myCharacterId}
              isPVP={isPVP}
              myRoleColor={myRoleColor}
              isModalOpen={isHandSheetOpen || isLogOpen || !isHumanTurn}
              onShift={handleShift}
              onSelectCharacter={(id) => {
                soundManager.play('click');
                setSelectedId((prev) => (prev === id ? null : id));
              }}
            />
          </div>
        </main>

        <footer className={`w-full max-w-md md:max-w-2xl landscape:w-80 landscape:xl:w-96 shrink-0 flex flex-col justify-end gap-1.5 sm:gap-2 z-20 pb-[max(0.5rem,env(safe-area-inset-bottom))] landscape:pb-0 px-1 md:px-4 landscape:px-0 landscape:my-auto ${hideFooter ? "hidden" : ""}`}>
          <RoleCards
            mode={gameState.mode}
            role1Name={role1Name}
            role2Name={role2Name}
            killerNameText={killerNameText}
            detectiveNameText={detectiveNameText}
            canPeekKiller={canPeekKiller}
            canPeekDetective={canPeekDetective}
            onPeekKillerStart={() => {
              if (canPeekKiller) {
                if (gameState.mode === "SECRET_SERVICE")
                  setShowSpyP1Role(true);
                else setShowKillerRole(true);
              }
            }}
            onPeekKillerEnd={() => {
              setShowSpyP1Role(false);
              setShowKillerRole(false);
            }}
            onPeekDetectiveStart={() => {
              if (canPeekDetective) {
                if (gameState.mode === "SECRET_SERVICE")
                  setShowSpyP2Role(true);
                else setShowDetectiveRole(true);
              }
            }}
            onPeekDetectiveEnd={() => {
              setShowSpyP2Role(false);
              setShowDetectiveRole(false);
            }}
            isPVP={gameState.opponent === "PVP"}
          />

          <div className="w-full max-w-md md:max-w-xl h-7 sm:h-8 px-3 bg-zinc-900/90 border border-zinc-800 rounded-lg text-[10px] sm:text-xs font-medium tracking-normal text-zinc-300 text-center shadow-sm shrink-0 flex items-center justify-center overflow-hidden">
            <span className="truncate w-full">
              {gameState.log.length > 0 ? gameState.log[gameState.log.length - 1] : "Операция в процессе..."}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:gap-1.5 w-full lg:bg-zinc-900/50 lg:border lg:border-zinc-800 lg:p-4 lg:rounded-2xl">
            <div className="hidden md:block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Действия ({actionPanelRoleName})
            </div>
            <div className="grid grid-cols-2 landscape:grid-cols-1 gap-1.5 sm:gap-2 w-full">
              {targetActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`${action.className.replace(/py-2 sm:py-2.5 md:py-3.5/g, "h-9 sm:h-10 md:h-11")} ${
                    targetActions.length === 1 && !((gameState.mode === "SKHVATKA" || gameState.mode === "MANIAC_VS_OPERATIVE") && isDetectiveView)
                      ? "col-span-2 md:col-span-1"
                      : "col-span-1"
                  }`}
                >
                  {(action.id === 'kill_basic' || action.id === 'capture_spy') && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>
                  )}
                  {(action.id === 'accuse_basic' || action.id === 'patrol_call') && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  )}
                  {action.id === 'interrogate_spy' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 shrink-0"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                  )}
                  {(action.id === 'disguise_skhvatka' || action.id === 'escape_maniac' || action.id === 'disguise_thief') && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 shrink-0"><path d="M2 18h20M4 18c0-2 2-3 4-4l2-6h4l2 6c2 1 4 2 4 4M9 13h6"></path></svg>
                  )}
                  {action.id === 'rob_basic' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 shrink-0"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                  )}
                  <span>{selectedCharacter && !action.disabled ? `${action.label}` : action.label}</span>
                </button>
              ))}
              {((gameState.mode === "SKHVATKA" || gameState.mode === "MANIAC_VS_OPERATIVE") && isDetectiveView) && (
                <button
                  onClick={() => setIsHandSheetOpen(true)}
                  disabled={Boolean(gameState.inspectorChoices && gameState.inspectorChoices.length > 0)}
                  className="col-span-1 h-9 sm:h-10 md:h-11 bg-gradient-to-r from-blue-950 via-zinc-900 to-blue-950 hover:from-blue-900 hover:via-zinc-800 hover:to-blue-900 text-blue-200 hover:text-white border border-blue-500/70 rounded-xl text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.25)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 text-blue-400 shrink-0">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 1-2.5-2.5z" />
                    <path d="M6 6h10M6 10h10M6 14h6" />
                  </svg>
                  <span>Досье ({gameState.detectiveHand.length})</span>
                </button>
              )}
              {cleanupAction && isCleanupAvailable && (
                <button
                  onClick={cleanupAction.onClick}
                  disabled={cleanupAction.disabled}
                  className={`h-9 sm:h-10 md:h-11 bg-gradient-to-r from-red-950 via-zinc-900 to-red-950 hover:from-red-900 hover:via-zinc-800 hover:to-red-900 disabled:opacity-40 text-red-200 hover:text-white text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-wider rounded-xl border border-red-600/70 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.35)] active:scale-[0.98] ${
                    ((gameState.mode === "SKHVATKA" || gameState.mode === "MANIAC_VS_OPERATIVE") && isDetectiveView)
                      ? "col-span-2 landscape:col-span-1"
                      : "col-span-1"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 text-red-400 shrink-0">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9 10h.01M15 10h.01M10 15h4" />
                  </svg>
                  <span>Зачистить</span>
                </button>
              )}
            </div>

            {false && (
            <div className="grid grid-cols-2 gap-1.5 w-full mt-1">
                <button
                  onClick={cleanupAction.onClick}
                  disabled={cleanupAction.disabled}
                  className="col-span-2 h-10 sm:h-11 bg-gradient-to-r from-red-950 via-zinc-900 to-red-950 hover:from-red-900 hover:via-zinc-800 hover:to-red-900 disabled:opacity-40 text-red-200 hover:text-white text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-wider rounded-xl border border-red-600/70 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.35)] active:scale-[0.98]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5 text-red-400 shrink-0">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9 10h.01M15 10h.01M10 15h4" />
                  </svg>
                  <span>Зачистить</span>
                </button>
            </div>
            )}
          </div>

          <div className="hidden landscape:lg:flex flex-col flex-1 min-h-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Протокол событий ({gameState.log.length})
              </span>
              <span className="text-xs">📋</span>
            </div>
            <div
              ref={logContainerRef}
              className="flex-1 overflow-y-auto space-y-2 text-[10px] font-medium tracking-normal text-zinc-300 pr-2 custom-scrollbar"
            >
              {gameState.log.map((entry, idx) => (
                <div key={idx} className="leading-relaxed break-words">
                  • {entry}
                </div>
              ))}
            </div>
          </div>
        </footer>
      </div>

      <GameSheets
        gameState={gameState}
        allChars={allChars}
        characterImages={characterImages}
        isHumanTurn={isHumanTurn}
        isDetectiveTurn={isDetectiveTurn}
        isKillerTurn={isKillerTurn}
        isHandSheetOpen={isHandSheetOpen}
        setIsHandSheetOpen={setIsHandSheetOpen}
        isLogOpen={isLogOpen}
        setIsLogOpen={setIsLogOpen}
        logContainerRef={logContainerRef}
        handleExonerateFromHand={handleExonerateFromHand}
        handleFastDisguise={handleFastDisguise}
      />
    </>
  );
});
