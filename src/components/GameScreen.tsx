import React, { memo, useCallback } from "react";
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
  GameActionButtons,
  GameProtocolCard,
  type TargetAction,
} from "./game";

export interface GameScreenProps {
  gameState: GameState;
  isHumanTurn: boolean;
  currentRoleName: string;
  actionPanelRoleName: string;
  pillClasses: string;
  dotClasses: string;
  secondsElapsed?: number;
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
  isKillerTurn: boolean;
  isHandSheetOpen: boolean;
  setIsHandSheetOpen: (val: boolean) => void;
  isEvidenceSheetOpen?: boolean;
  setIsEvidenceSheetOpen?: (val: boolean) => void;
  isDeckSheetOpen?: boolean;
  setIsDeckSheetOpen?: (val: boolean) => void;
  isVictimsSheetOpen?: boolean;
  setIsVictimsSheetOpen?: (val: boolean) => void;
  isHelpOpen?: boolean;
  setIsHelpOpen?: (val: boolean) => void;
  isLogOpen: boolean;
  setIsLogOpen: (val: boolean) => void;
  unreadLogCount: number;
  setUnreadLogCount: (val: number) => void;
  isNotebookOpen?: boolean;
  setIsNotebookOpen?: (val: boolean) => void;
  logContainerRef: React.RefObject<HTMLDivElement>;
  allChars?: Character[];
  characterImages?: Record<string, { default: string }>;
  handleReset: () => void;
  handleShift: (
    type: "ROW" | "COL",
    index: number,
    direction: "FORWARD" | "BACKWARD"
  ) => void;
  handleExonerateFromHand?: (id: string) => void;
  handleFastDisguise?: (id: string) => void;
  killerChar?: Character;
  detectiveChar?: Character;
  spyP1Char?: Character;
  spyP2Char?: Character;
  isCurtainActive?: boolean;
  nextPlayerName?: string;
  onConfirmTurnReady?: () => void;
  isOpponentConnected?: boolean;
  opponentDisconnectedNotice?: boolean | string | null;
  isInspectorPending?: boolean;
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
  isKillerTurn,
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
  allChars: externalAllChars,
  characterImages,
  handleReset,
  handleShift,
  handleExonerateFromHand,
  handleFastDisguise,
  killerChar,
  detectiveChar,
  spyP1Char,
  spyP2Char,
  isCurtainActive,
  nextPlayerName,
  isOpponentConnected,
  opponentDisconnectedNotice,
  isInspectorPending: _isInspectorPending,
  onConfirmTurnReady,
  setIsMenuOpen,
}) => {
  const allChars = React.useMemo(
    () => externalAllChars || gameState.board.flat(),
    [externalAllChars, gameState.board]
  );
  const selectedCharacter = React.useMemo(
    () => allChars.find((c) => c.id === selectedId) || null,
    [allChars, selectedId]
  );

  // MEM-RES-03: id таймера подсветки ошибки для очистки при размонтировании
  // и при повторном неверном выборе.
  const errorCardTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (errorCardTimeoutRef.current) {
        clearTimeout(errorCardTimeoutRef.current);
        errorCardTimeoutRef.current = null;
      }
    };
  }, []);

  const isInspectorChoosing =
    Boolean(gameState.inspectorChoices && gameState.inspectorChoices.length > 0) &&
    isDetectiveTurn &&
    gameState.opponent === "AI";

  const handleCardClick = useCallback((id: string) => {
    if (isInspectorChoosing) {
      soundManager.play("error");
      if (setErrorCardId) {
        if (errorCardTimeoutRef.current) {
          clearTimeout(errorCardTimeoutRef.current);
          errorCardTimeoutRef.current = null;
        }
        setErrorCardId(id);
        errorCardTimeoutRef.current = setTimeout(() => {
          setErrorCardId(null);
          errorCardTimeoutRef.current = null;
        }, 500);
      }
      return;
    }
    soundManager.play("click");
    setSelectedId((prev) => (prev === id ? null : id));
  }, [isInspectorChoosing, setErrorCardId, setSelectedId]);

  const isCurtainVisible = Boolean(isCurtainActive ?? gameState.isPrivacyScreenActive);

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
      {(isOpponentConnected === false || Boolean(opponentDisconnectedNotice)) && (
        <div className="w-full bg-zinc-900 border-b border-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest py-2 flex justify-center items-center gap-2 shadow-inner z-20">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-ping" />
          {typeof opponentDisconnectedNotice === "string"
            ? opponentDisconnectedNotice
            : "Соперник переподключается... (ожидание)"}
        </div>
      )}

      {/* Статус-бар режима и оперативные показания */}
      <GameStatusBar
        gameState={gameState}
        allChars={allChars}
      />

      {/* Игровое поле и панели */}
      <div className="flex-1 min-h-0 min-w-0 w-full flex flex-col landscape:flex-row items-center justify-between gap-2 sm:gap-4 lg:gap-6 px-2 sm:px-4 md:px-6 py-1 landscape:py-2 overflow-hidden">
        {/* Левая / центральная зона: Игровое поле на всю доступную высоту */}
        <main className="flex-1 min-h-0 min-w-0 w-full h-full flex flex-col items-center justify-center relative antialiased p-0.5 overflow-hidden">
          <div className="w-full h-auto max-w-full max-h-full aspect-square landscape:w-auto landscape:h-full flex items-center justify-center relative antialiased">
            <GameBoard
              mode={gameState.mode}
              board={gameState.board}
              selectedCharacterId={selectedId}
              onCardClick={handleCardClick}
              onShift={handleShift}
              lastShift={gameState.lastShift}
              killerAdjacentIds={killerAdjacentIds}
              detectiveAdjacentIds={detectiveAdjacentIds}
              activeAgentAdjacentIds={activeAgentAdjacentIds}
              showKillerHints={
                !isCurtainVisible && (
                  gameState.mode === "SECRET_SERVICE"
                    ? (showSpyP1Role || showKillerRole)
                    : showKillerRole
                )
              }
              showDetectiveHints={
                !isCurtainVisible && (
                  gameState.mode === "SECRET_SERVICE"
                    ? (showSpyP2Role || showDetectiveRole)
                    : showDetectiveRole
                )
              }
              killerSecretId={
                gameState.mode === "SECRET_SERVICE"
                  ? (gameState.spies?.[0]?.secretId ?? gameState.killerSecretId)
                  : gameState.killerSecretId
              }
              detectiveSecretId={
                gameState.mode === "SECRET_SERVICE"
                  ? (gameState.spies?.[1]?.secretId ?? gameState.detectiveSecretId)
                  : gameState.detectiveSecretId
              }
              lastRobbedId={gameState.lastRobbedId}
              uniformedOfficerIds={gameState.uniformedOfficers}
              targetVictimId={
                gameState.mode === "MANIAC_VS_OPERATIVE"
                  ? gameState.victimList?.[0]
                  : null
              }
              currentRole={gameState.currentTurn}
              isHumanTurn={isHumanTurn}
              evidenceDeck={gameState.evidenceDeck}
              highlightedSpyId={
                !isCurtainVisible && gameState.mode === "SECRET_SERVICE" && myCharacterId
                  ? myCharacterId
                  : undefined
              }
              radarTargetId={effectiveRadarTargetId}
              radarCellIds={effectiveRadarCellIds}
              radarPingIds={effectiveRadarCellIds}
              radarColorClass={effectiveRadarColorClass}
              isPVP={isPVP}
              myRoleColor={myRoleColor}
              myCharacterId={myCharacterId}
              errorCardId={errorCardId}
              isModalOpen={isHandSheetOpen || isLogOpen || isNotebookOpen || !isHumanTurn}
            />
          </div>
        </main>

        {/* Мобильная карточка роли (в портретной ориентации) */}
        <div className="w-full landscape:hidden max-w-md shrink-0 flex flex-col justify-center">
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
            showKillerRole={!isCurtainVisible && showKillerRole}
            setShowKillerRole={setShowKillerRole}
            showDetectiveRole={!isCurtainVisible && showDetectiveRole}
            setShowDetectiveRole={setShowDetectiveRole}
            showSpyP1Role={!isCurtainVisible && showSpyP1Role}
            setShowSpyP1Role={setShowSpyP1Role}
            showSpyP2Role={!isCurtainVisible && showSpyP2Role}
            setShowSpyP2Role={setShowSpyP2Role}
            canPeekKiller={!isCurtainVisible && canPeekKiller}
            canPeekDetective={!isCurtainVisible && canPeekDetective}
            isPVP={isPVP}
          />
        </div>

        {/* Правая колонка на ПК (десктоп / landscape): единый сайдбар на всю высоту */}
        <aside className="hidden landscape:flex w-72 lg:w-80 h-full shrink-0 flex-col gap-3 py-0.5 overflow-hidden z-20">
          {/* 1. Сверху: карточка роли */}
          <div className="shrink-0 w-full">
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
              showKillerRole={!isCurtainVisible && showKillerRole}
              setShowKillerRole={setShowKillerRole}
              showDetectiveRole={!isCurtainVisible && showDetectiveRole}
              setShowDetectiveRole={setShowDetectiveRole}
              showSpyP1Role={!isCurtainVisible && showSpyP1Role}
              setShowSpyP1Role={setShowSpyP1Role}
              showSpyP2Role={!isCurtainVisible && showSpyP2Role}
              setShowSpyP2Role={setShowSpyP2Role}
              canPeekKiller={!isCurtainVisible && canPeekKiller}
              canPeekDetective={!isCurtainVisible && canPeekDetective}
              isPVP={isPVP}
            />
          </div>

          {/* 2. Посередине: кнопки действий */}
          <div className="shrink-0 w-full">
            <GameActionButtons
              gameState={gameState}
              targetActions={targetActions}
              cleanupAction={cleanupAction}
              isCleanupAvailable={isCleanupAvailable}
              isDetectiveView={isDetectiveView}
              selectedCharacter={selectedCharacter}
              setIsHandSheetOpen={setIsHandSheetOpen}
              layout="grid"
            />
          </div>

          {/* 3. Снизу: Протокол событий на всю оставшуюся высоту */}
          <div className="flex-1 min-h-0 w-full flex flex-col">
            <GameProtocolCard
              log={gameState.log}
              logContainerRef={logContainerRef}
            />
          </div>
        </aside>
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

      {/* Шторка приватности для Pass & Play */}
      <BlindfoldCurtain
        isOpen={Boolean(isCurtainActive ?? gameState.isPrivacyScreenActive)}
        isActive={Boolean(isCurtainActive ?? gameState.isPrivacyScreenActive)}
        nextPlayerName={nextPlayerName || currentRoleName}
        gameState={gameState}
        onDismiss={onConfirmTurnReady}
        onConfirmTakeDevice={onConfirmTurnReady}
      />
    </div>
  );
});

GameScreen.displayName = "GameScreen";
