// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GameBoard } from "../GameBoard";
import { soundManager } from "../../utils/audio";
import {
  createInitialState,
  getAdjacentCharacters,
  getCharacterCoords,
  shiftBoard,
} from "../../utils/gameLogic";
import {
  playShiftSound,
  playEliminateSound,
  playRadarPing,
} from "../../utils/tvAudio";

describe("Защита от регрессий: Радар, подсветка роли 3x3 и аудио-дебаунс", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Тест 1 (Подсветка роли Детектива 3x3): при показе роли детектив получает контур 'ВЫ', а его соседи — синий контур", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "AI", "DETECTIVE", 3, 3, 16);
    const detectiveId = state.detectiveSecretId!;
    const adjacentIds = getAdjacentCharacters(state.board, detectiveId).map((c) => c.id);

    render(
      <GameBoard
        mode="MANIAC_VS_OPERATIVE"
        board={state.board}
        selectedCharacterId={null}
        detectiveSecretId={detectiveId}
        detectiveAdjacentIds={adjacentIds}
        showDetectiveHints={true}
        lastShift={null}
        myRoleColor="blue"
        onShift={vi.fn()}
      />
    );

    // Персонаж игрока обязан иметь визуальную подсветку центра 3x3 и бейдж 'ВЫ'
    const myCharHighlight = screen.getByTestId("my-character-highlight");
    expect(myCharHighlight).not.toBeNull();
    expect(myCharHighlight.className).toContain("border-blue-400");

    const myCharBadge = screen.getByTestId("my-character-badge");
    expect(myCharBadge).not.toBeNull();
    expect(myCharBadge.textContent).toBe("ВЫ");

    // Соседи 3x3 (все 8 вокруг или граничные) обязаны получить подсветку neighbor-highlight
    const neighborHighlights = screen.getAllByTestId("neighbor-highlight");
    expect(neighborHighlights.length).toBe(adjacentIds.length);
    neighborHighlights.forEach((el) => {
      expect(el.className).toContain("border-blue-500");
    });

    // Проверка геометрии координат: соседи строго |dr| <= 1 && |dc| <= 1
    const centerCoords = getCharacterCoords(state.board, detectiveId)!;
    expect(centerCoords).not.toBeNull();

    adjacentIds.forEach((adjId) => {
      const adjCoords = getCharacterCoords(state.board, adjId)!;
      const dr = Math.abs(adjCoords.r - centerCoords.r);
      const dc = Math.abs(adjCoords.c - centerCoords.c);
      expect(dr).toBeLessThanOrEqual(1);
      expect(dc).toBeLessThanOrEqual(1);
      expect(dr === 0 && dc === 0).toBe(false);
    });
  });

  it("Тест 2 (Геометрия 3x3 после сдвига поля): карточка 'ВЫ' и её соседи синхронно смещаются, 'ВЫ' остаётся строго в центре", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "AI", "KILLER", 3, 3, 16);
    const killerId = state.killerSecretId!;
    const initialCoords = getCharacterCoords(state.board, killerId)!;

    // Сдвигаем строку, в которой находится киллер, вперед на 1 позицию
    const shiftedBoard = shiftBoard(state.board, "ROW", initialCoords.r, "FORWARD");
    const newCoords = getCharacterCoords(shiftedBoard, killerId)!;

    // Убеждаемся, что киллер действительно переместился
    const expectedC = (initialCoords.c + 1) % shiftedBoard[0].length;
    expect(newCoords.r).toBe(initialCoords.r);
    expect(newCoords.c).toBe(expectedC);

    const { rerender } = render(
      <GameBoard
        mode="MANIAC_VS_OPERATIVE"
        board={shiftedBoard}
        selectedCharacterId={null}
        killerSecretId={killerId}
        showKillerHints={true}
        lastShift={{ type: "ROW", index: initialCoords.r, direction: "FORWARD" }}
        myRoleColor="red"
        onShift={vi.fn()}
      />
    );

    // Центр 'ВЫ' существует
    const myCharHighlight = screen.getByTestId("my-character-highlight");
    expect(myCharHighlight).not.toBeNull();
    expect(myCharHighlight.className).toContain("border-red-400");

    const myCharBadge = screen.getByTestId("my-character-badge");
    expect(myCharBadge).not.toBeNull();
    expect(myCharBadge.textContent).toBe("ВЫ");

    // Вычисляем ожидаемых соседей на новой доске
    const newExpectedNeighbors = getAdjacentCharacters(shiftedBoard, killerId).map((c) => c.id);
    const neighborHighlights = screen.getAllByTestId("neighbor-highlight");
    expect(neighborHighlights.length).toBe(newExpectedNeighbors.length);

    // Геометрическая валидация: каждый подсвеченный сосед на shiftedBoard обязан быть в радиусе |dr|<=1, |dc|<=1 от newCoords
    newExpectedNeighbors.forEach((neighborId) => {
      const neighborCoords = getCharacterCoords(shiftedBoard, neighborId)!;
      const dr = Math.abs(neighborCoords.r - newCoords.r);
      const dc = Math.abs(neighborCoords.c - newCoords.c);
      expect(dr).toBeLessThanOrEqual(1);
      expect(dc).toBeLessThanOrEqual(1);
      expect(dr === 0 && dc === 0).toBe(false);
    });
  });

  it("Тест 3 (Подсветка радара): все 9 клеток зоны радара получают оверлей, а центр — маркер пинга", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "AI", "DETECTIVE", 3, 3, 16);
    const radarTarget = state.board[1][1].id;
    const radarCells = [
      state.board[0][0].id, state.board[0][1].id, state.board[0][2].id,
      state.board[1][0].id, state.board[1][1].id, state.board[1][2].id,
      state.board[2][0].id, state.board[2][1].id, state.board[2][2].id,
    ];

    const { container } = render(
      <GameBoard
        mode="MANIAC_VS_OPERATIVE"
        board={state.board}
        selectedCharacterId={null}
        radarTargetId={radarTarget}
        radarCellIds={radarCells}
        radarColorClass="border-blue-500 ring-2 ring-blue-500/70"
        lastShift={null}
        onShift={vi.fn()}
      />
    );

    const radarOverlays = container.querySelectorAll(".radar-marching-stroke");
    expect(radarOverlays.length).toBe(9);

    const pingIndicator = container.querySelector(".animate-ping");
    expect(pingIndicator).not.toBeNull();
  });

  it("Тест 4 (Звук: отсутствие процедурного синтеза и один звук на действие): процедуры tvAudio безопасны, click подавляется при action", () => {
    if (!soundManager.getSfxEnabled()) {
      soundManager.toggleSfx();
    }

    // Процедурные хелперы tvAudio не должны выбрасывать ошибок
    expect(() => playShiftSound()).not.toThrow();
    expect(() => playEliminateSound()).not.toThrow();
    expect(() => playRadarPing()).not.toThrow();

    const lastPlayTime = (soundManager as any).lastPlayTime as Map<string, number>;
    lastPlayTime.clear();

    // 1. Действие на доске (например, сдвиг slide)
    const baseTime = 1000000;
    const realDateNow = Date.now;
    Date.now = vi.fn(() => baseTime);

    soundManager.play("slide");
    expect(lastPlayTime.get("slide")).toBe(baseTime);

    // 2. Сразу же (через 20мс) срабатывает общий click (например, от клика кнопки действия)
    Date.now = vi.fn(() => baseTime + 20);
    soundManager.play("click");

    // Общий клик должен быть подавлен механизмом lastActionSoundTime (не должен добавиться в lastPlayTime)
    expect(lastPlayTime.has("click")).toBe(false);

    // 3. Через 150мс общий клик вне действия снова разрешен
    Date.now = vi.fn(() => baseTime + 150);
    soundManager.play("click");
    expect(lastPlayTime.get("click")).toBe(baseTime + 150);

    Date.now = realDateNow;
  });
});
