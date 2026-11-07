import React, { memo } from "react";
import type { GameState, Character } from "../types/game";
import { RoleRevealModal } from "./RoleRevealModal";
import { GameOverModal } from "./GameOverModal";
import { IdentityRevealModal } from "./IdentityRevealModal";
import { InspectorChoiceModal } from "./InspectorChoiceModal";
import { partyService } from "../utils/partyPeer";

export interface GameLifecycleModalsProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  isIntroPhase: boolean;
  setIsIntroPhase: (val: boolean) => void;
  isLobbyOpen: boolean;
  hasStartedEver: boolean;
  isOpponentConnected: boolean;
  isDetectiveView: boolean;
  isDetectiveTurn: boolean;
  profileNickname?: string;
  killerChar?: Character;
  detectiveChar?: Character;
  allChars: Character[];
  inspectorChoices: Character[];
  selectedInspectorChoiceId: string | null;
  setSelectedInspectorChoiceId: (id: string | null) => void;
  isRevealConfirmed: boolean;
  setIsRevealConfirmed: (val: boolean) => void;
  characterImages: Record<string, { default: string }>;
  secondsElapsed: number;
  formatTimer: (seconds: number) => string;
  handleExitToMenu: () => void;
  handleReset: () => void;
  handleSelectInspectorRole: (id: string) => void;
  requestRematch: (type: "SWAP" | "RANDOM" | "SAME") => void;
  setFullscreenImage: (img: { url: string; name: string; id: string } | null) => void;
}

export const GameLifecycleModals: React.FC<GameLifecycleModalsProps> = memo(({
  gameState,
  setGameState,
  isIntroPhase,
  setIsIntroPhase,
  isLobbyOpen,
  hasStartedEver,
  isOpponentConnected,
  isDetectiveView,
  isDetectiveTurn,
  profileNickname,
  killerChar,
  detectiveChar,
  allChars,
  inspectorChoices,
  selectedInspectorChoiceId,
  setSelectedInspectorChoiceId,
  isRevealConfirmed,
  setIsRevealConfirmed,
  characterImages,
  secondsElapsed,
  formatTimer,
  handleExitToMenu,
  handleReset,
  handleSelectInspectorRole,
  requestRematch,
  setFullscreenImage,
}) => {
  const [showGameOverModal, setShowGameOverModal] = React.useState(false);

  React.useEffect(() => {
    if (gameState.winner) {
      const timer = setTimeout(() => {
        setShowGameOverModal(true);
      }, 1300);
      return () => clearTimeout(timer);
    } else {
      setShowGameOverModal(false);
    }
  }, [gameState.winner]);

  return (
    <>
      {isIntroPhase && !isLobbyOpen && (
        <RoleRevealModal
          mode={gameState.mode}
          opponent={gameState.opponent}
          playerRole={gameState.playerRole}
          isOpponentConnected={isOpponentConnected}
          onCancelMatch={handleExitToMenu}
          role1Name={
            gameState.mode === "SECRET_SERVICE"
              ? (gameState.opponent === "PVP" ? "Фантом" : (gameState.spies?.[0]?.name || "Агент 1"))
                                    : gameState.playerRole === "KILLER"
                        ? profileNickname || "Бандит"
                : "Бандит"
          }
          role2Name={
            gameState.mode === "SECRET_SERVICE"
              ? (gameState.opponent === "PVP" ? "Призрак" : (gameState.spies?.[1]?.name || "Агент 2"))
                                    : gameState.playerRole === "DETECTIVE"
                        ? profileNickname || "Инспектор"
                : "Инспектор"
          }
          killer={
            gameState.mode === "SECRET_SERVICE"
              ? gameState.spies && gameState.spies.length > 1
                ? gameState.opponent === "ONLINE"
                  ? partyService.isHost
                    ? allChars.find((c) => c.id === gameState.spies![0].secretId)
                    : allChars.find((c) => c.id === gameState.spies![1].secretId)
                  : allChars.find((c) => c.id === gameState.spies![1].secretId)
                : undefined
              : (gameState.opponent === "AI" || gameState.opponent === "ONLINE") &&
                  gameState.playerRole === "DETECTIVE"
                ? undefined
                : killerChar
          }
          detective={
            gameState.mode === "SECRET_SERVICE"
              ? gameState.spies && gameState.spies.length > 0
                ? gameState.opponent === "ONLINE"
                  ? partyService.isHost
                    ? allChars.find((c) => c.id === gameState.spies![0].secretId)
                    : allChars.find((c) => c.id === gameState.spies![1].secretId)
                  : allChars.find((c) => c.id === gameState.spies![0].secretId)
                : undefined
              : (gameState.opponent === "AI" || gameState.opponent === "ONLINE") &&
                  gameState.playerRole === "KILLER"
                ? undefined
                : detectiveChar
          }
          inspectorChoices={inspectorChoices}
          onSelectDetectiveRole={handleSelectInspectorRole}
          onComplete={() => setIsIntroPhase(false)}
          onReady={() => {
            if (gameState.opponent === "ONLINE") {
              partyService.sendAction({ type: "PLAYER_READY", senderId: "local" });
            }
          }}
        />
      )}

      <InspectorChoiceModal
        isOpen={!isLobbyOpen && hasStartedEver && gameState.mode === "SKHVATKA" && Boolean(gameState.inspectorChoices && gameState.inspectorChoices.length > 0) && isDetectiveView && isDetectiveTurn && !gameState.winner && !isIntroPhase}
        isPVP={gameState.opponent === "PVP"}
        inspectorChoices={inspectorChoices}
        characterImages={characterImages}
        onSelectInspectorRole={handleSelectInspectorRole}
        selectedId={selectedInspectorChoiceId}
        onSelectId={setSelectedInspectorChoiceId}
      />

      {gameState.justCaughtSpyId &&
        !gameState.winner &&
        !isLobbyOpen &&
        gameState.spies?.find((s) => s.id === gameState.justCaughtSpyId)?.isAI === false &&
        (gameState.opponent !== "ONLINE" ||
          (partyService.isHost
            ? gameState.justCaughtSpyId === gameState.spies?.[0]?.id
            : gameState.justCaughtSpyId === gameState.spies?.[1]?.id)) && (
          <IdentityRevealModal
            isOpen={true}
            badge="Агент разоблачен!"
            badgeColor="red"
            title="Шпионская маскировка провалена. Ваша новая личность:"
            character={allChars.find(c => c.id === gameState.spies?.find(s => s.id === gameState.justCaughtSpyId)?.secretId) ?? null}
            characterImage={(() => { const character = allChars.find(c => c.id === gameState.spies?.find(s => s.id === gameState.justCaughtSpyId)?.secretId); return character ? characterImages[`./assets/characters/${character.id}.webp`]?.default ?? null : null; })()}
            isPvpPassPhase={!isRevealConfirmed && gameState.opponent === "PVP"}
            targetPlayerName={gameState.spies.find(s => s.id === gameState.justCaughtSpyId)?.name}
            onConfirmPvpPass={() => setIsRevealConfirmed(true)}
            onAcceptIdentity={() => { setIsRevealConfirmed(false); setGameState((prev) => ({ ...prev, justCaughtSpyId: undefined })); }}
            onPreviewCard={(character) => { const image = characterImages[`./assets/characters/${character.id}.webp`]?.default; if (image) setFullscreenImage({ url: image, name: character.name, id: character.id }); }}
          />
        )}

      {gameState.disguisedNotification &&
        !gameState.winner &&
        !isLobbyOpen &&
        (gameState.opponent !== "ONLINE" || gameState.playerRole === "KILLER") && (
          <IdentityRevealModal
            isOpen={true}
            badge="Смена личности!"
            badgeColor={gameState.mode === "THIEF_HUNT" ? "cyan" : "red"}
            title="Ваша новая личность:"
            character={allChars.find(c => c.id === gameState.disguisedNotification?.newSecretId) ?? null}
            characterImage={(() => { const character = allChars.find(c => c.id === gameState.disguisedNotification?.newSecretId); return character ? characterImages[`./assets/characters/${character.id}.webp`]?.default ?? null : null; })()}
            isPvpPassPhase={!isRevealConfirmed && gameState.opponent === "PVP"}
            targetPlayerName={gameState.disguisedNotification.roleName}
            onConfirmPvpPass={() => setIsRevealConfirmed(true)}
            onAcceptIdentity={() => {
              setIsRevealConfirmed(false);
              if (gameState.opponent === "ONLINE") {
                partyService.sendAction({
                  type: "CLEAR_DISGUISE_NOTIFICATION",
                  senderId: "local",
                } as any);
              }
              setGameState((prev) => ({ ...prev, disguisedNotification: null }));
            }}
            onPreviewCard={(character) => { const image = characterImages[`./assets/characters/${character.id}.webp`]?.default; if (image) setFullscreenImage({ url: image, name: character.name, id: character.id }); }}
          />
        )}

      {showGameOverModal && gameState.winner && !gameState.restartRequestedBy && (
        <GameOverModal
          winner={gameState.winner}
          mode={gameState.mode}
          killer={killerChar}
          detective={detectiveChar}
          elapsedTime={formatTimer(secondsElapsed)}
          onRestart={handleReset}
          onExitToMenu={handleExitToMenu}
          playerRole={gameState.opponent === "PVP" ? undefined : gameState.playerRole}
          isMultiplayer={gameState.opponent === "ONLINE"}
          onRematchSwap={() => requestRematch("SWAP")}
          onRematchRandom={() => requestRematch("RANDOM")}
          onRematchSame={() => requestRematch("SAME")}
        />
      )}
    </>
  );
});
