import React, { memo } from "react";
import type { Character, GameState } from "../types/game";
import { GameBoard } from "./GameBoard";
import { RoleCards } from "./RoleCards";
import { GameSheets } from "./GameSheets";
import { BlindfoldCurtain } from "./ui/BlindfoldCurtain";
import { soundManager } from "../utils/audio";
import {
  GameTopHeader,
  GameStatusBar,
  GameActionDock,
  type TargetAction,
} from "./game";

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
  setErrorCardId?: (id: string | null) => void;
  targetActions: TargetAction[];
  cleanupAction?: {
    disabled?: boolean;
    onClick: () => void;
  } | null;
  isCleanupAvailable: boolean;
  isDetectiveView: boolean;
  isDetectiveTurn: boolean;
  isHandSheetOpen: boolean;
  setIsHandSheetOpen: (val: boolean) => void;
  isEvidenceSheetOpen: boolean;
  setIsEvidenceSheetOpen: (val: boolean) => void;
  isDeckSheetOpen: boolean;
  setIsDeckSheetOpen: (val: boolean) => void;
  isVictimsSheetOpen: boolean;
  setIsVictimsSheetOpen: (val: boolean) => void;
  isHelpOpen: boolean;
  setIsHelpOpen: (val: boolean) => void;
  isLogOpen: boolean;
  setIsLogOpen: (val: boolean) => void;
  unreadLogCount: number;
  setUnreadLogCount: (val: number) => void;
  isNotebookOpen: boolean;
  setIsNotebookOpen: (val: boolean) => void;
  logContainerRef: React.RefObject<HTMLDivElement | null>;
  handleReset: () => void;
  handleShift: (
    type: "ROW" | "COL",
    index: number,
    direction: "FORWARD" | "BACKWARD"
  ) => void;
  killerChar?: Character;
  detectiveChar?: Character;
  spyP1Char?: Character;
  spyP2Char?: Character;
  isCurtainActive?: boolean;
  nextPlayerName?: string;
  onConfirmTurnReady?: () => void;
  setIsMenuOpen: (val: boolean) => void;
}

export const GameScreen: React.FC<GameScreenProps> = memo(({
  gameState,
  isHumanTurn,
  currentRoleName,
  actionPanelRoleName: _actionPanelRoleName,
  pillClasses,
  dotClasses,
  secondsElapsed,
  formatTimer,
  selectedId,
  setSelectedId,
  killerAdjacentIds,
  detectiveAdjacentIds,
  activeAgentAdjacentIds,
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
  setErrorCardId,
  targetActions,
  cleanupAction,
  isCleanupAvailable,
  isDetectiveView,
  isDetectiveTurn,
  isHandSheetOpen,
  setIsHandSheetOpen,
  isEvidenceSheetOpen,
  setIsEvidenceSheetOpen,
  isDeckSheetOpen,
  setIsDeckSheetOpen,
  isVictimsSheetOpen,
  setIsVictimsSheetOpen,
  isHelpOpen,
  setIsHelpOpen,
  isLogOpen,
  setIsLogOpen,
  unreadLogCount,
  setUnreadLogCount,
  isNotebookOpen,
  setIsNotebookOpen,
  logContainerRef,
  handleReset,
  handleShift,
  killerChar,
  detectiveChar,
  spyP1Char,
  spyP2Char,
  isCurtainActive,
  nextPlayerName,
  onConfirmTurnReady,
  setIsMenuOpen,
}) => {
  const allChars = React.useMemo(() => gameState.board.flat(), [gameState.board]);
  const selectedCharacter = React.useMemo(
    () => allChars.find((c) => c.id === selectedId) || null,
    [allChars, selectedId]
  );

  const isInspectorChoosing =
    Boolean(gameState.inspectorChoices && gameState.inspectorChoices.length > 0) &&
    isDetectiveTurn &&
    gameState.opponent === "AI";

  return (
    <div className="relative w-screen h-[100dvh] flex flex-col justify-between overflow-hidden bg-background-main text-zinc-100 select-none">
      {/* Шапка экрана */}
      <GameTopHeader
        gameState={gameState}
        isHumanTurn={isHumanTurn}
        currentRoleName={currentRoleName}
        pillClasses={pillClasses}
        dotClasses={dotClasses}
        secondsElapsed={secondsElapsed}
        formatTimer={formatTimer}
        unreadLogCount={unreadLogCount}
        setIsLogOpen={setIsLogOpen}
        setUnreadLogCount={setUnreadLogCount}
        setIsNotebookOpen={setIsNotebookOpen}
        setIsMenuOpen={setIsMenuOpen}
        onReset={handleReset}
      />

      {/* Ожидание переподключения */}
      {gameState.isOpponentDisconnected && (
        <div className="w-full bg-zinc-900 border-b border-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest py-2 flex justify-center items-center gap-2 shadow-inner z-20">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-ping" />
          Соперник переподключается... (ожидание)
        </div>
      )}

      {/* Статус-бар режима и оперативные показания */}
      <GameStatusBar
        gameState={gameState}
        allChars={allChars}
      />

      {/* Игровое поле и панели */}
      <div className="flex-1 min-h-0 w-full flex flex-col landscape:flex-row items-center justify-between gap-1 sm:gap-2 md:gap-6 px-2 sm:px-4 md:px-6 py-1 md:py-3 overflow-hidden">
        <main className="flex-1 min-h-0 w-full max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl landscape:max-w-none flex flex-col items-center justify-center relative antialiased">
          <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center overflow-hidden relative antialiased">
            <GameBoard
              mode={gameState.mode}
              board={gameState.board}
              selectedCharacterId={selectedId}
              onCardClick={(id) => {
                if (isInspectorChoosing) {
                  soundManager.play("error");
                  if (setErrorCardId) {
                    setErrorCardId(id);
                    setTimeout(() => setErrorCardId(null), 500);
                  }
                  return;
                }
                soundManager.play("click");
                setSelectedId((prev) => (prev === id ? null : id));
              }}
              onShift={handleShift}
              lastShift={gameState.lastShift}
              killerAdjacentIds={killerAdjacentIds}
              detectiveAdjacentIds={detectiveAdjacentIds}
              activeAgentAdjacentIds={activeAgentAdjacentIds}
              currentRole={gameState.currentTurn}
              isHumanTurn={isHumanTurn}
              evidenceDeck={gameState.evidenceDeck}
              highlightedSpyId={
                gameState.mode === "SECRET_SERVICE" && myCharacterId
                  ? myCharacterId
                  : undefined
              }
              radarPingIds={effectiveRadarCellIds}
              radarTargetId={effectiveRadarTargetId}
              radarColorClass={effectiveRadarColorClass}
              isPVP={isPVP}
              myRoleColor={myRoleColor}
              errorCardId={errorCardId}
            />
          </div>
        </main>

        {/* Боковые карточки ролей */}
        <RoleCards
          gameState={gameState}
          killerChar={killerChar}
          detectiveChar={detectiveChar}
          spyP1Char={spyP1Char}
          spyP2Char={spyP2Char}
          role1Name={role1Name}
          role2Name={role2Name}
          killerNameText={killerNameText}
          detectiveNameText={detectiveNameText}
          showKillerRole={showKillerRole}
          setShowKillerRole={setShowKillerRole}
          showDetectiveRole={showDetectiveRole}
          setShowDetectiveRole={setShowDetectiveRole}
          showSpyP1Role={showSpyP1Role}
          setShowSpyP1Role={setShowSpyP1Role}
          showSpyP2Role={showSpyP2Role}
          setShowSpyP2Role={setShowSpyP2Role}
          canPeekKiller={canPeekKiller}
          canPeekDetective={canPeekDetective}
          isPVP={isPVP}
        />
      </div>

      {/* Нижняя панель действий */}
      <GameActionDock
        gameState={gameState}
        targetActions={targetActions}
        cleanupAction={cleanupAction}
        isCleanupAvailable={isCleanupAvailable}
        isDetectiveView={isDetectiveView}
        selectedCharacter={selectedCharacter}
        setIsHandSheetOpen={setIsHandSheetOpen}
        logContainerRef={logContainerRef}
      />

      {/* Модальные шторки и досье */}
      <GameSheets
        gameState={gameState}
        isHandSheetOpen={isHandSheetOpen}
        setIsHandSheetOpen={setIsHandSheetOpen}
        isEvidenceSheetOpen={isEvidenceSheetOpen}
        setIsEvidenceSheetOpen={setIsEvidenceSheetOpen}
        isDeckSheetOpen={isDeckSheetOpen}
        setIsDeckSheetOpen={setIsDeckSheetOpen}
        isVictimsSheetOpen={isVictimsSheetOpen}
        setIsVictimsSheetOpen={setIsVictimsSheetOpen}
        isHelpOpen={isHelpOpen}
        setIsHelpOpen={setIsHelpOpen}
        isLogOpen={isLogOpen}
        setIsLogOpen={setIsLogOpen}
        isNotebookOpen={isNotebookOpen}
        setIsNotebookOpen={setIsNotebookOpen}
        logContainerRef={logContainerRef}
        isHumanTurn={isHumanTurn}
      />

      {/* Шторка приватности для Pass & Play */}
      <BlindfoldCurtain
        isActive={Boolean(isCurtainActive)}
        nextPlayerName={nextPlayerName || currentRoleName}
        onConfirmTurnReady={() => {
          if (onConfirmTurnReady) {
            onConfirmTurnReady();
          }
        }}
      />
    </div>
  );
});

GameScreen.displayName = "GameScreen";
