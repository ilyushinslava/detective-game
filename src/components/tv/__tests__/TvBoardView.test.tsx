// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TvBoardView } from "../TvBoardView";
import { createInitialState } from "../../../utils/gameLogic";

describe("TvBoardView Component", () => {
  it("отрисовывает 25 персонажей доски и статус текущего хода", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
    state.currentTurn = "KILLER";

    render(<TvBoardView gameState={state} />);

    const killerElements = screen.getAllByText("Маньяк");
    expect(killerElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/МЕНЮ ПАУЗЫ/i).length).toBeGreaterThanOrEqual(1);
  });

  it("отображает блок выбранной линии, если она передана", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");

    render(
      <TvBoardView
        gameState={state}
        selectedLine={{ type: "ROW", index: 2, direction: "FORWARD" }}
      />
    );

    expect(screen.getByText(/ВЫБРАННАЯ ЛИНИЯ/i)).toBeDefined();
    expect(screen.getByText(/РЯД #3/i)).toBeDefined();
    expect(screen.getByText(/ВПРАВО/i)).toBeDefined();
  });

  it("TV-01: изолирует вызов паузы по Escape/Back и поддерживает D-Pad навигацию", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
    const onExit = vi.fn();
    const onRestart = vi.fn();

    render(
      <TvBoardView
        gameState={state}
        onExit={onExit}
        onRestart={onRestart}
      />
    );

    const restartBtn = screen.getByTestId("tv-restart-btn");
    const exitBtn = screen.getByTestId("tv-exit-btn");

    // 1. При закрытой паузе стрелки не должны открывать меню или вызывать действия
    fireEvent.keyDown(window, { key: "ArrowLeft", keyCode: 37 });
    expect(restartBtn.className).not.toContain("ring-white");
    expect(onRestart).not.toHaveBeenCalled();

    // 2. Escape открывает меню паузы
    fireEvent.keyDown(window, { key: "Escape", keyCode: 27 });

    // D-Pad Left -> переключение фокуса на Сброс (НАЧАТЬ ЗАНОВО)
    fireEvent.keyDown(window, { key: "ArrowLeft", keyCode: 37 });
    expect(restartBtn.className).toContain("ring-white");

    // Enter вызывает onRestart
    fireEvent.keyDown(window, { key: "Enter", keyCode: 13 });
    expect(onRestart).toHaveBeenCalledTimes(1);

    // 3. Android Back (keyCode 4) открывает меню паузы вместо прямого вылета
    fireEvent.keyDown(window, { key: "Escape", keyCode: 4 });

    // D-Pad Right -> переключение фокуса на Выход
    fireEvent.keyDown(window, { key: "ArrowRight", keyCode: 39 });
    expect(exitBtn.className).toContain("ring-red-500");

    // DPAD_CENTER (keyCode 23) вызывает onExit
    fireEvent.keyDown(window, { key: "Enter", keyCode: 23 });
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
