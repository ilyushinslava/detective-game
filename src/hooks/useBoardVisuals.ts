import { useMemo } from "react";
import type { Character, GameState, Role, OpponentType } from "../types/game";
import { SPY_COLORS } from "../types/game";
import { CHARACTERS_DATA, canCleanupBoard, getAdjacentCharacters } from "../utils/gameLogic";
import { partyService } from "../utils/partyPeer";

export interface UseBoardVisualsParams {
  gameState: GameState;
  selectedInspectorChoiceId: string | null;
  showKillerRole: boolean;
  showDetectiveRole: boolean;
  showSpyP1Role: boolean;
  showSpyP2Role: boolean;
  isAIThinking: boolean;
}

export function useBoardVisuals({
  gameState,
  selectedInspectorChoiceId,
  showKillerRole,
  showDetectiveRole,
  showSpyP1Role,
  showSpyP2Role,
  isAIThinking,
}: UseBoardVisualsParams) {
  const allChars = useMemo(() => gameState.board.flat(), [gameState.board]);

  const rawKiller = useMemo(
    () => CHARACTERS_DATA.find((c) => c.id === gameState.killerSecretId),
    [gameState.killerSecretId]
  );
  const killerChar = useMemo(
    () =>
      allChars.find((c) => c.id === gameState.killerSecretId) ??
      (rawKiller
        ? ({ ...rawKiller, isAlive: true, isExonerated: false } as typeof allChars[0])
        : undefined),
    [allChars, gameState.killerSecretId, rawKiller]
  );

  const rawDetective = useMemo(
    () => CHARACTERS_DATA.find((c) => c.id === gameState.detectiveSecretId),
    [gameState.detectiveSecretId]
  );
  const detectiveChar = useMemo(
    () =>
      allChars.find((c) => c.id === gameState.detectiveSecretId) ??
      (rawDetective
        ? ({ ...rawDetective, isAlive: true, isExonerated: false } as typeof allChars[0])
        : undefined),
    [allChars, gameState.detectiveSecretId, rawDetective]
  );

  const inspectorChoices = useMemo(
    () =>
      (gameState.inspectorChoices ?? [])
        .map((id) => allChars.find((c) => c.id === id))
        .filter(Boolean) as typeof allChars,
    [gameState.inspectorChoices, allChars]
  );

  const isCleanupAvailable = useMemo(
    () => canCleanupBoard(gameState.board) && !gameState.winner,
    [gameState.board, gameState.winner]
  );

  const isFirstTurnKiller = useMemo(
    () =>
      gameState.mode === "SKHVATKA" &&
      gameState.killCount === 0 &&
      gameState.currentTurn === "KILLER",
    [gameState.mode, gameState.killCount, gameState.currentTurn]
  );

  const spy1Id = useMemo(
    () =>
      gameState.mode === "SECRET_SERVICE" && gameState.spies
        ? gameState.spies[0]?.secretId
        : null,
    [gameState.mode, gameState.spies]
  );

  const spy2Id = useMemo(
    () =>
      gameState.mode === "SECRET_SERVICE" &&
      gameState.spies &&
      gameState.spies.length > 1
        ? gameState.spies[1]?.secretId
        : null,
    [gameState.mode, gameState.spies]
  );

  const killerAdjacentIds = useMemo(
    () =>
      getAdjacentCharacters(
        gameState.board,
        gameState.mode === "SECRET_SERVICE"
          ? (spy1Id ?? gameState.killerSecretId)
          : (spy2Id ?? gameState.killerSecretId)
      ).map((c) => c.id),
    [gameState.board, gameState.mode, gameState.killerSecretId, spy1Id, spy2Id]
  );

  const detectiveAdjacentIds = useMemo(() => {
    const targetId =
      gameState.mode === "SECRET_SERVICE"
        ? (spy2Id ?? gameState.detectiveSecretId)
        : (spy1Id ?? gameState.detectiveSecretId);

    if (!targetId) return [];

    const baseNeighbors = getAdjacentCharacters(gameState.board, targetId).map(
      (c) => c.id
    );

    if (gameState.mode === "THIEF_HUNT" && gameState.uniformedOfficers) {
      const combined = new Set(baseNeighbors);
      gameState.uniformedOfficers.forEach((officerId) => {
        getAdjacentCharacters(gameState.board, officerId).forEach((c) =>
          combined.add(c.id)
        );
      });
      return Array.from(combined);
    }

    return baseNeighbors;
  }, [
    gameState.board,
    gameState.detectiveSecretId,
    gameState.uniformedOfficers,
    gameState.mode,
    spy1Id,
    spy2Id,
  ]);

  const radarTargetId = gameState.interrogationRadar?.targetId;
  const radarCellIds = useMemo(() => {
    if (!radarTargetId) return [];
    const neighbors = getAdjacentCharacters(gameState.board, radarTargetId).map(
      (c) => c.id
    );
    return [radarTargetId, ...neighbors];
  }, [gameState.board, radarTargetId]);

  const radarColorClass = useMemo(() => {
    if (!gameState.interrogationRadar) return null;
    return gameState.mode === "SECRET_SERVICE"
      ? `${SPY_COLORS[gameState.interrogationRadar.interrogatorIndex % SPY_COLORS.length].border} ring-2 ${SPY_COLORS[gameState.interrogationRadar.interrogatorIndex % SPY_COLORS.length].ring}`
      : "border-blue-500 ring-2 ring-blue-500/70";
  }, [gameState.interrogationRadar, gameState.mode]);

  const effectiveRadarTargetId =
    selectedInspectorChoiceId || gameState.interrogationRadar?.targetId || null;
  const effectiveRadarCellIds = selectedInspectorChoiceId
    ? [selectedInspectorChoiceId]
    : radarCellIds;
  const effectiveRadarColorClass = selectedInspectorChoiceId
    ? "ring-4 ring-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.9)] scale-105 z-20 border-blue-500"
    : radarColorClass;

  const isPVP = gameState.opponent === "PVP";
  const isKillerTurn = gameState.currentTurn === "KILLER";
  const isDetectiveTurn = gameState.currentTurn === "DETECTIVE";
  const isKillerView = isPVP ? isKillerTurn : gameState.playerRole === "KILLER";
  const isDetectiveView = isPVP ? isDetectiveTurn : gameState.playerRole === "DETECTIVE";

  const myCharacterId = useMemo(() => {
    if (isPVP) return null;
    if (gameState.mode === "SECRET_SERVICE" && gameState.spies) {
      if (gameState.opponent === "ONLINE") {
        return partyService.isHost
          ? gameState.spies[0].secretId
          : gameState.spies[1].secretId;
      } else if (gameState.opponent === "AI") {
        return gameState.spies[0].secretId;
      }
    } else {
      const isInspectorPending =
        gameState.mode === "SKHVATKA" &&
        gameState.playerRole === "DETECTIVE" &&
        Boolean(gameState.inspectorChoices && gameState.inspectorChoices.length > 0);
      if (!isInspectorPending) {
        return gameState.playerRole === "KILLER"
          ? gameState.killerSecretId
          : gameState.detectiveSecretId;
      }
    }
    return null;
  }, [isPVP, gameState]);

  const role1Name = useMemo(() => {
    if (gameState.mode === "MANIAC_VS_OPERATIVE") return "МАНЬЯК";
    if (gameState.mode === "SECRET_SERVICE")
      return gameState.spies?.[0]?.name ?? "Агент 1";
    if (gameState.mode === "THIEF_HUNT") return "ГРАБИТЕЛЬ";
    if (gameState.mode === "LINE_UP") return "ПОДОЗРЕВАЕМЫЙ";
    return "БАНДИТ";
  }, [gameState.mode, gameState.spies]);

  const role2Name = useMemo(() => {
    if (gameState.mode === "MANIAC_VS_OPERATIVE") return "ОПЕРАТИВНИК";
    if (gameState.mode === "SECRET_SERVICE")
      return gameState.spies?.[1]?.name ?? "Агент 2";
    if (gameState.mode === "THIEF_HUNT") return "ПОЛИЦИЯ";
    if (gameState.mode === "LINE_UP") return "СЛЕДОВАТЕЛЬ";
    return "ИНСПЕКТОР";
  }, [gameState.mode, gameState.spies]);

  const currentRoleName = useMemo(() => {
    if (gameState.mode === "SECRET_SERVICE" && gameState.spies) {
      return gameState.spies[gameState.activeSpyIndex ?? 0].name;
    }
    return isKillerTurn ? role1Name : role2Name;
  }, [gameState.mode, gameState.spies, gameState.activeSpyIndex, isKillerTurn, role1Name, role2Name]);

  const actionPanelRoleName = useMemo(() => {
    if (gameState.mode === "SECRET_SERVICE") {
      if (gameState.opponent === "ONLINE") {
        const mySpyIndex = partyService.isHost ? 0 : 1;
        return gameState.spies?.[mySpyIndex]?.name ?? currentRoleName;
      } else if (gameState.opponent === "AI") {
        return gameState.spies?.[0]?.name ?? currentRoleName;
      } else {
        return currentRoleName;
      }
    }
    return isKillerView ? role1Name : role2Name;
  }, [gameState.mode, gameState.opponent, gameState.spies, currentRoleName, isKillerView, role1Name, role2Name]);

  const isHumanTurn = useMemo(() => {
    if (gameState.opponent === "ONLINE") {
      if (gameState.mode === "SECRET_SERVICE") {
        const myIdx = partyService.isHost ? 0 : 1;
        return gameState.activeSpyIndex === myIdx;
      } else {
        return Boolean(
          gameState.playerRole && gameState.currentTurn === gameState.playerRole
        );
      }
    } else if (gameState.opponent === "PVP") {
      return true;
    } else {
      if (gameState.mode === "SECRET_SERVICE") {
        return gameState.spies
          ? gameState.spies[gameState.activeSpyIndex ?? 0]?.isAI === false
          : true;
      } else {
        return gameState.currentTurn === gameState.playerRole;
      }
    }
  }, [gameState.opponent, gameState.mode, gameState.activeSpyIndex, gameState.playerRole, gameState.currentTurn, gameState.spies]);

  const activeAgentAdjacentIds =
    isKillerTurn ? killerAdjacentIds : detectiveAdjacentIds;

  const canPeekKiller = useMemo(() => {
    if (gameState.mode === "SECRET_SERVICE") {
      if (gameState.opponent === "ONLINE") return partyService.isHost;
      if (isPVP) return gameState.activeSpyIndex === 0;
      return true;
    } else {
      if (gameState.opponent === "ONLINE" || gameState.opponent === "AI") {
        return gameState.playerRole === "KILLER";
      }
      return isKillerTurn;
    }
  }, [gameState.mode, gameState.opponent, isPVP, gameState.activeSpyIndex, gameState.playerRole, isKillerTurn]);

  const canPeekDetective = useMemo(() => {
    if (gameState.mode === "SECRET_SERVICE") {
      if (gameState.opponent === "ONLINE") return !partyService.isHost;
      if (isPVP) return gameState.activeSpyIndex === 1;
      return false;
    }

    if (
      gameState.mode === "SKHVATKA" &&
      Boolean(gameState.inspectorChoices && gameState.inspectorChoices.length > 0)
    ) {
      return false;
    }

    if (gameState.opponent === "ONLINE" || gameState.opponent === "AI") {
      return gameState.playerRole === "DETECTIVE";
    }

    return isDetectiveTurn;
  }, [
    gameState.mode,
    gameState.opponent,
    isPVP,
    gameState.activeSpyIndex,
    gameState.playerRole,
    gameState.inspectorChoices,
    isDetectiveTurn,
  ]);

  const killerNameText = useMemo(() => {
    if (showKillerRole || showSpyP1Role) {
      return gameState.mode === "SECRET_SERVICE"
        ? allChars.find((c) => c.id === gameState.spies?.[0]?.secretId)?.name ?? "Неизвестно"
        : killerChar?.name ?? "Неизвестно";
    }
    return "••••••••";
  }, [showKillerRole, showSpyP1Role, gameState.mode, allChars, gameState.spies, killerChar]);

  const isInspectorPending =
    gameState.mode === "SKHVATKA" &&
    Boolean(gameState.inspectorChoices && gameState.inspectorChoices.length > 0);

  const detectiveNameText = useMemo(() => {
    if (isInspectorPending) return "Не выбрана";
    if (showDetectiveRole || showSpyP2Role) {
      return gameState.mode === "SECRET_SERVICE"
        ? allChars.find((c) => c.id === gameState.spies?.[1]?.secretId)?.name ?? "Неизвестно"
        : detectiveChar?.name ?? "Неизвестно";
    }
    return "••••••••";
  }, [isInspectorPending, showDetectiveRole, showSpyP2Role, gameState.mode, allChars, gameState.spies, detectiveChar]);

  const pillClasses = useMemo(() => {
    if (isAIThinking) {
      return "bg-zinc-800/90 border-zinc-500 text-zinc-400 animate-pulse";
    }
    if (gameState.mode === "SECRET_SERVICE") {
      const isP1Turn = gameState.activeSpyIndex === 0;
              return isP1Turn
          ? "bg-red-950/90 border-red-600 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
          : "bg-blue-950/90 border-blue-600 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.3)]";
    }
    return isKillerTurn
      ? "bg-red-950/80 border-red-600 text-red-100"
      : "bg-blue-950/80 border-blue-600 text-blue-100";
  }, [isAIThinking, gameState.mode, gameState.activeSpyIndex, isKillerTurn]);

  const dotClasses = useMemo(() => {
    if (isAIThinking) return "bg-zinc-400 shadow-zinc-400/80";
    if (gameState.mode === "SECRET_SERVICE") {
      const isP1Turn = gameState.activeSpyIndex === 0;
              return isP1Turn
          ? "bg-red-500 shadow-red-500/80"
          : "bg-blue-500 shadow-blue-500/80";
    }
    return isKillerTurn
      ? "bg-red-500 shadow-red-500/80"
      : "bg-blue-500 shadow-blue-500/80";
  }, [isAIThinking, gameState.mode, gameState.activeSpyIndex, isKillerTurn]);

  return {
    allChars,
    killerChar,
    detectiveChar,
    inspectorChoices,
    isCleanupAvailable,
    isFirstTurnKiller,
    spy1Id,
    spy2Id,
    killerAdjacentIds,
    detectiveAdjacentIds,
    radarTargetId,
    radarCellIds,
    radarColorClass,
    effectiveRadarTargetId,
    effectiveRadarCellIds,
    effectiveRadarColorClass,
    isPVP,
    isKillerTurn,
    isDetectiveTurn,
    isKillerView,
    isDetectiveView,
    myCharacterId,
    role1Name,
    role2Name,
    currentRoleName,
    actionPanelRoleName,
    isHumanTurn,
    activeAgentAdjacentIds,
    canPeekKiller,
    canPeekDetective,
    killerNameText,
    isInspectorPending,
    detectiveNameText,
    pillClasses,
    dotClasses,
  };
}