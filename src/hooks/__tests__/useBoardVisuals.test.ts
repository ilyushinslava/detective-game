// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBoardVisuals } from "../useBoardVisuals";
import { createInitialState, getAdjacentCharacters } from "../../utils/gameLogic";
import { partyService } from "../../utils/partyPeer";
import { SPY_COLORS } from "../../types/game";

describe("useBoardVisuals: Регрессионное тестирование визуальных производных", () => {
  it("1. Геометрия соседей: корректный расчет killerAdjacentIds и detectiveAdjacentIds для сетки 5x5", () => {
    const gameState = createInitialState("SKHVATKA", "AI", "DETECTIVE", 2, 3, 16);
    gameState.killerSecretId = gameState.board[2][2].id;
    gameState.detectiveSecretId = gameState.board[0][0].id;

    const { result } = renderHook(() =>
      useBoardVisuals({
        gameState,
        selectedInspectorChoiceId: null,
        showKillerRole: false,
        showDetectiveRole: false,
        showSpyP1Role: false,
        showSpyP2Role: false,
        isAIThinking: false,
      })
    );

    const expectedKillerNeighbors = getAdjacentCharacters(gameState.board, gameState.killerSecretId).map((c) => c.id);
    const expectedDetectiveNeighbors = getAdjacentCharacters(gameState.board, gameState.detectiveSecretId).map((c) => c.id);

    expect(result.current.killerAdjacentIds).toEqual(expectedKillerNeighbors);
    expect(result.current.killerAdjacentIds.length).toBe(8);

    expect(result.current.detectiveAdjacentIds).toEqual(expectedDetectiveNeighbors);
    expect(result.current.detectiveAdjacentIds.length).toBe(3);
  });

  it("2. Патрульные в THIEF_HUNT: в detectiveAdjacentIds попадают соседи всех патрульных одновременно", () => {
    const gameState = createInitialState("THIEF_HUNT", "AI", "DETECTIVE", 2, 3, 16);
    const officer1Id = gameState.board[0][0].id;
    const officer2Id = gameState.board[4][4].id;
    gameState.uniformedOfficers = [officer1Id, officer2Id];

    const { result } = renderHook(() =>
      useBoardVisuals({
        gameState,
        selectedInspectorChoiceId: null,
        showKillerRole: false,
        showDetectiveRole: false,
        showSpyP1Role: false,
        showSpyP2Role: false,
        isAIThinking: false,
      })
    );

    const off1Neighbors = getAdjacentCharacters(gameState.board, officer1Id).map((c) => c.id);
    const off2Neighbors = getAdjacentCharacters(gameState.board, officer2Id).map((c) => c.id);

    off1Neighbors.forEach((id) => {
      expect(result.current.detectiveAdjacentIds).toContain(id);
    });
    off2Neighbors.forEach((id) => {
      expect(result.current.detectiveAdjacentIds).toContain(id);
    });
  });

  it("3. Радар опроса свидетелей: формирование effectiveRadarCellIds и цвет рамки радара", () => {
    const gameState = createInitialState("SKHVATKA", "AI", "DETECTIVE", 2, 3, 16);
    const radarTarget = gameState.board[2][2].id;
    gameState.interrogationRadar = {
      targetId: radarTarget,
      isNear: true,
      interrogator: "DETECTIVE",
      interrogatorIndex: 0,
      targetName: "Тест",
    };

    const { result, rerender } = renderHook(
      ({ selectedChoiceId }: { selectedChoiceId: string | null }) =>
        useBoardVisuals({
          gameState,
          selectedInspectorChoiceId: selectedChoiceId,
          showKillerRole: false,
          showDetectiveRole: false,
          showSpyP1Role: false,
          showSpyP2Role: false,
          isAIThinking: false,
        }),
      { initialProps: { selectedChoiceId: null } }
    );

    const expectedRadarCells = [radarTarget, ...getAdjacentCharacters(gameState.board, radarTarget).map((c) => c.id)];
    expect(result.current.effectiveRadarTargetId).toBe(radarTarget);
    expect(result.current.effectiveRadarCellIds).toEqual(expectedRadarCells);
    expect(result.current.effectiveRadarColorClass).toBe("border-blue-500 ring-2 ring-blue-500/70");

    const forcedChoiceId = gameState.board[1][1].id;
    rerender({ selectedChoiceId: forcedChoiceId });
    expect(result.current.effectiveRadarTargetId).toBe(forcedChoiceId);
    expect(result.current.effectiveRadarCellIds).toEqual([forcedChoiceId]);
    expect(result.current.effectiveRadarColorClass).toContain("ring-blue-500");

    const ssState = createInitialState("SECRET_SERVICE", "AI", "DETECTIVE", 2, 3, 16);
    ssState.interrogationRadar = {
      targetId: radarTarget,
      isNear: true,
      interrogator: "DETECTIVE",
      interrogatorIndex: 1,
      targetName: "Шпион",
    };

    const { result: ssResult } = renderHook(() =>
      useBoardVisuals({
        gameState: ssState,
        selectedInspectorChoiceId: null,
        showKillerRole: false,
        showDetectiveRole: false,
        showSpyP1Role: false,
        showSpyP2Role: false,
        isAIThinking: false,
      })
    );

    const expectedSpyColor = SPY_COLORS[1 % SPY_COLORS.length];
    expect(ssResult.current.effectiveRadarColorClass).toContain(expectedSpyColor.border);
    expect(ssResult.current.effectiveRadarColorClass).toContain(expectedSpyColor.ring);
  });

  it("4. Права подглядывания (Peek): блокировка при невыбранном инспекторе (AI и PVP) и распределение ролей в SECRET_SERVICE ONLINE", () => {
    // 4.1 Проверка блокировки canPeekDetective для AI режима при невыбранном инспекторе
    const skhvatkaAiState = createInitialState("SKHVATKA", "AI", "DETECTIVE", 2, 3, 16);
    skhvatkaAiState.inspectorChoices = ["c1", "c2", "c3", "c4"];

    const { result: skhvatkaAiResult } = renderHook(() =>
      useBoardVisuals({
        gameState: skhvatkaAiState,
        selectedInspectorChoiceId: null,
        showKillerRole: false,
        showDetectiveRole: false,
        showSpyP1Role: false,
        showSpyP2Role: false,
        isAIThinking: false,
      })
    );
    expect(skhvatkaAiResult.current.canPeekDetective).toBe(false);

    // 4.2 Проверка блокировки canPeekDetective для PVP режима при невыбранном инспекторе
    const skhvatkaPvpState = createInitialState("SKHVATKA", "PVP", "DETECTIVE", 2, 3, 16);
    skhvatkaPvpState.inspectorChoices = ["c1", "c2", "c3", "c4"];
    skhvatkaPvpState.currentTurn = "DETECTIVE";

    const { result: skhvatkaPvpResult } = renderHook(() =>
      useBoardVisuals({
        gameState: skhvatkaPvpState,
        selectedInspectorChoiceId: null,
        showKillerRole: false,
        showDetectiveRole: false,
        showSpyP1Role: false,
        showSpyP2Role: false,
        isAIThinking: false,
      })
    );
    expect(skhvatkaPvpResult.current.canPeekDetective).toBe(false);

    // 4.3 Проверка прав подглядывания в SECRET_SERVICE ONLINE
    const ssOnlineState = createInitialState("SECRET_SERVICE", "ONLINE", "KILLER", 2, 3, 16);
    partyService.isHost = true;

    const { result: hostResult } = renderHook(() =>
      useBoardVisuals({
        gameState: ssOnlineState,
        selectedInspectorChoiceId: null,
        showKillerRole: false,
        showDetectiveRole: false,
        showSpyP1Role: false,
        showSpyP2Role: false,
        isAIThinking: false,
      })
    );
    expect(hostResult.current.canPeekKiller).toBe(true);
    expect(hostResult.current.canPeekDetective).toBe(false);

    partyService.isHost = false;
    const { result: guestResult } = renderHook(() =>
      useBoardVisuals({
        gameState: ssOnlineState,
        selectedInspectorChoiceId: null,
        showKillerRole: false,
        showDetectiveRole: false,
        showSpyP1Role: false,
        showSpyP2Role: false,
        isAIThinking: false,
      })
    );
    expect(guestResult.current.canPeekKiller).toBe(false);
    expect(guestResult.current.canPeekDetective).toBe(true);
  });

  it("5. Определение чьего-либо хода (isHumanTurn): для AI, PVP и ONLINE", () => {
    const aiState = createInitialState("SKHVATKA", "AI", "DETECTIVE", 2, 3, 16);
    aiState.currentTurn = "DETECTIVE";
    const { result: aiResultTurn } = renderHook(() =>
      useBoardVisuals({
        gameState: aiState,
        selectedInspectorChoiceId: null,
        showKillerRole: false,
        showDetectiveRole: false,
        showSpyP1Role: false,
        showSpyP2Role: false,
        isAIThinking: false,
      })
    );
    expect(aiResultTurn.current.isHumanTurn).toBe(true);

    aiState.currentTurn = "KILLER";
    const { result: aiResultAITurn } = renderHook(() =>
      useBoardVisuals({
        gameState: aiState,
        selectedInspectorChoiceId: null,
        showKillerRole: false,
        showDetectiveRole: false,
        showSpyP1Role: false,
        showSpyP2Role: false,
        isAIThinking: false,
      })
    );
    expect(aiResultAITurn.current.isHumanTurn).toBe(false);

    const pvpState = createInitialState("SKHVATKA", "PVP", "KILLER", 2, 3, 16);
    const { result: pvpResult } = renderHook(() =>
      useBoardVisuals({
        gameState: pvpState,
        selectedInspectorChoiceId: null,
        showKillerRole: false,
        showDetectiveRole: false,
        showSpyP1Role: false,
        showSpyP2Role: false,
        isAIThinking: false,
      })
    );
    expect(pvpResult.current.isHumanTurn).toBe(true);

    const ssOnlineState = createInitialState("SECRET_SERVICE", "ONLINE", "KILLER", 2, 3, 16);
    partyService.isHost = true;
    ssOnlineState.activeSpyIndex = 0;
    const { result: ssHostTurn } = renderHook(() =>
      useBoardVisuals({
        gameState: ssOnlineState,
        selectedInspectorChoiceId: null,
        showKillerRole: false,
        showDetectiveRole: false,
        showSpyP1Role: false,
        showSpyP2Role: false,
        isAIThinking: false,
      })
    );
    expect(ssHostTurn.current.isHumanTurn).toBe(true);

    ssOnlineState.activeSpyIndex = 1;
    const { result: ssGuestTurn } = renderHook(() =>
      useBoardVisuals({
        gameState: ssOnlineState,
        selectedInspectorChoiceId: null,
        showKillerRole: false,
        showDetectiveRole: false,
        showSpyP1Role: false,
        showSpyP2Role: false,
        isAIThinking: false,
      })
    );
    expect(ssGuestTurn.current.isHumanTurn).toBe(false);
  });
});