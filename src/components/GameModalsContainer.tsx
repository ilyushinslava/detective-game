import React from "react";
import type { GameModeType, Role, Character } from "../types/game";
import { DetectiveNotebookModal } from "./DetectiveNotebookModal";
import { DuelQuestionCatalogModal } from "./duel/DuelQuestionCatalogModal";
import { DuelCandidatesSheet } from "./duel/DuelCandidatesSheet";
import { DuelAccuseModal } from "./duel/DuelAccuseModal";
import { DUEL_CHARACTERS } from "../constants/duelCharacters";
import { Toast } from "./Toast";
import { PauseModal } from "./PauseModal";
import { RulesModal } from "./RulesModal";
import { FullscreenCardModal } from "./FullscreenCardModal";
import { DeviceOrientationOverlay } from "./DeviceOrientationOverlay";
import { DevPanel } from "./DevPanel";
import { RematchModal } from "./RematchModal";
import { DisconnectModal } from "./DisconnectModal";
import { partyService } from "../utils/partyPeer";

export interface GameModalsContainerProps {
  // Duel Modals
  isQuestionCatalogOpen: boolean;
  onCloseQuestionCatalog: () => void;
  onSelectDuelQuestion: (questionId: string) => void;
  isCandidatesSheetOpen: boolean;
  onCloseCandidatesSheet: () => void;
  duelHistory: any[];
  playerRole: Role;
  onSelectCandidate: (id: string) => void;
  isAccuseModalOpen: boolean;
  selectedId: string | null;
  accusedTargets?: Record<string, string[]>;
  currentTurn: Role;
  onCloseAccuseModal: () => void;
  onConfirmDuelAccusation: () => void;

  // Toast
  // Detective Notebook
  isNotebookOpen?: boolean;
  onCloseNotebook?: () => void;
  allCharacters?: Character[];
  characterImages?: Record<string, { default: string }>;

  // Toast
  toastMessage: string | null;
  onCloseToast: () => void;

  // Rematch & Disconnect
  restartRequestedBy?: "HOST" | "GUEST";
      matchBet: number;
    pendingRematchMode?: "SWAP" | "SAME" | "RANDOM";
    rematchTimer: number;
  onAcceptRestart: () => void;
  onRejectRestart: () => void;
  onCancelWaitingRestart: () => void;
  isOpponentDisconnectedNotice: boolean;
  onExitToMenu: () => void;

  // Pause & Rules
  isPauseOpen: boolean;
  onClosePause: () => void;
  onResumeGame: () => void;
  onOpenRules: () => void;
  onOpenDevPanel: () => void;
  isRulesOpen: boolean;
  onCloseRules: () => void;
  isSfxEnabled: boolean;
  isAmbientEnabled: boolean;
  isHapticsEnabled: boolean;
  onToggleSfx: () => void;
  onToggleAmbient: () => void;
  onToggleHaptics: () => void;

  // Fullscreen Card
  fullscreenCard: { url: string; name: string; id: string } | null;
  onCloseFullscreenCard: () => void;

  // DevPanel
  isDevPanelOpen: boolean;
  onCloseDevPanel: () => void;
  cash: number;
  onForceWin: (winner: Role, forcedMode?: GameModeType) => void;
  onTriggerInspectorChoice: () => void;
  onResetToMenu: () => void;
  onAddCash: (amount: number) => void;
  onResetCash: () => void;
  onToggleTurn: () => void;
  onAddKill: () => void;
  onTriggerIntro: () => void;
  onTriggerRestartRequest: () => void;
  onTriggerOpponentLeft: () => void;
  onTriggerDisguiseModal: () => void;
  onTriggerCaughtSpyModal: () => void;
  onTriggerGameOver: () => void;
  onClearSession: () => void;
}

export const GameModalsContainer: React.FC<GameModalsContainerProps> = ({
  isQuestionCatalogOpen,
  onCloseQuestionCatalog,
  onSelectDuelQuestion,
  isCandidatesSheetOpen,
  onCloseCandidatesSheet,
  duelHistory,
  playerRole,
  onSelectCandidate,
  isAccuseModalOpen,
  selectedId,
  accusedTargets,
  currentTurn,
  onCloseAccuseModal,
  onConfirmDuelAccusation,
  isNotebookOpen,
  onCloseNotebook,
  allCharacters,
  characterImages,
  toastMessage,
  onCloseToast,
  restartRequestedBy,
      matchBet,
    pendingRematchMode,
    rematchTimer,
  onAcceptRestart,
  onRejectRestart,
  onCancelWaitingRestart,
  isOpponentDisconnectedNotice,
  onExitToMenu,
  isPauseOpen,
  onClosePause,
  onResumeGame,
  onOpenRules,
  onOpenDevPanel,
  isRulesOpen,
  onCloseRules,
  isSfxEnabled,
  isAmbientEnabled,
  isHapticsEnabled,
  onToggleSfx,
  onToggleAmbient,
  onToggleHaptics,
  fullscreenCard,
  onCloseFullscreenCard,
  isDevPanelOpen,
  onCloseDevPanel,
  cash,
  onForceWin,
  onTriggerInspectorChoice,
  onResetToMenu,
  onAddCash,
  onResetCash,
  onToggleTurn,
  onAddKill,
  onTriggerIntro,
  onTriggerRestartRequest,
  onTriggerOpponentLeft,
  onTriggerDisguiseModal,
  onTriggerCaughtSpyModal,
  onTriggerGameOver,
  onClearSession,
}) => {
  return (
    <>
      <DuelQuestionCatalogModal
        isOpen={isQuestionCatalogOpen}
        onClose={onCloseQuestionCatalog}
        onSelectQuestion={onSelectDuelQuestion}
      />

      <DuelCandidatesSheet
        isOpen={isCandidatesSheetOpen}
        onClose={onCloseCandidatesSheet}
        allCharacters={DUEL_CHARACTERS}
        history={duelHistory}
        playerRole={playerRole}
        onSelectCandidate={onSelectCandidate}
      />

      <DuelAccuseModal
        isOpen={isAccuseModalOpen}
        targetCharacter={DUEL_CHARACTERS.find((c) => c.id === selectedId) ?? null}
        alreadyAccused={Boolean(
          selectedId &&
            (accusedTargets?.[currentTurn] || []).includes(selectedId)
        )}
        onClose={onCloseAccuseModal}
        onConfirmAccusation={onConfirmDuelAccusation}
      />

      <DetectiveNotebookModal
        isOpen={Boolean(isNotebookOpen)}
        onClose={onCloseNotebook || (() => {})}
        characters={allCharacters || []}
        characterImages={characterImages}
      />

      <Toast message={toastMessage} type="info" onClose={onCloseToast} />

            <RematchModal
          rematchMode={pendingRematchMode}
          status={
          restartRequestedBy
            ? restartRequestedBy !== (partyService.isHost ? "HOST" : "GUEST")
              ? "offer"
              : "waiting"
            : null
        }
        matchBet={matchBet}
        timer={rematchTimer}
        onAccept={onAcceptRestart}
        onReject={onRejectRestart}
        onCancelWaiting={onCancelWaitingRestart}
      />

      <DisconnectModal
        isOpen={isOpponentDisconnectedNotice}
        onExitToMenu={onExitToMenu}
      />

      <PauseModal
        isOpen={isPauseOpen}
        onClose={onClosePause}
        onResume={onResumeGame}
        onOpenRules={onOpenRules}
        onLeaveGame={onExitToMenu}
        onOpenDevPanel={onOpenDevPanel}
        isSfxEnabled={isSfxEnabled}
        isAmbientEnabled={isAmbientEnabled}
        isHapticsEnabled={isHapticsEnabled}
        onToggleSfx={onToggleSfx}
        onToggleAmbient={onToggleAmbient}
        onToggleHaptics={onToggleHaptics}
      />

      <RulesModal isOpen={isRulesOpen} onClose={onCloseRules} />

      <FullscreenCardModal
        card={fullscreenCard}
        onClose={onCloseFullscreenCard}
      />

      <DeviceOrientationOverlay />

      <DevPanel
        isOpen={isDevPanelOpen}
        onClose={onCloseDevPanel}
        cash={cash}
        onForceWin={onForceWin}
        onTriggerInspectorChoice={onTriggerInspectorChoice}
        onResetToMenu={onResetToMenu}
        onAddCash={onAddCash}
        onResetCash={onResetCash}
        onToggleTurn={onToggleTurn}
        onAddKill={onAddKill}
        onTriggerIntro={onTriggerIntro}
        onTriggerRestartRequest={onTriggerRestartRequest}
        onTriggerOpponentLeft={onTriggerOpponentLeft}
        onTriggerDisguiseModal={onTriggerDisguiseModal}
        onTriggerCaughtSpyModal={onTriggerCaughtSpyModal}
        onTriggerGameOver={onTriggerGameOver}
        onClearSession={onClearSession}
      />
    </>
  );
};
