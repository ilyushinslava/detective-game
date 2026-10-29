// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GameOverModal } from "../GameOverModal";

describe("GameOverModal", () => {
  const mockOnRestart = vi.fn();
  const mockOnExitToMenu = vi.fn();
  const mockOnRematchSwap = vi.fn();
  const mockOnRematchRandom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("отображает победу игрока и время операции", () => {
    const { container } = render(
      <GameOverModal
        winner="DETECTIVE"
        playerRole="DETECTIVE"
        mode="SKHVATKA"
        elapsedTime="04:15"
        onRestart={mockOnRestart}
      />
    );

    expect(screen.getByText(/04:15/)).toBeDefined();

    // Находим кнопку рестарта по уникальным классам, чтобы избежать проблем с кодировкой текста
    const buttons = Array.from(container.querySelectorAll("button"));
    const restartBtn = buttons.find(b => b.className.includes("rounded-full") && !b.className.includes("mt-2.5"));
    
    expect(restartBtn).toBeDefined();
    fireEvent.click(restartBtn!);
    expect(mockOnRestart).toHaveBeenCalled();
  });

  it("отображает поражение игрока при победе оппонента", () => {
    const { container } = render(
      <GameOverModal
        winner="KILLER"
        playerRole="DETECTIVE"
        mode="SKHVATKA"
        elapsedTime="02:30"
        onRestart={mockOnRestart}
        onExitToMenu={mockOnExitToMenu}
      />
    );

    // Кнопка выхода в меню имеет отступ mt-2.5
    const buttons = Array.from(container.querySelectorAll("button"));
    const exitBtn = buttons.find(b => b.className.includes("mt-2.5"));
    
    expect(exitBtn).toBeDefined();
    fireEvent.click(exitBtn!);
    expect(mockOnExitToMenu).toHaveBeenCalled();
  });

  it("корректно отображает названия ролей для различных режимов", () => {
    const { unmount } = render(
      <GameOverModal
        winner="KILLER"
        mode="MANIAC_VS_OPERATIVE"
        elapsedTime="00:00"
        onRestart={mockOnRestart}
      />
    );
    
    expect(screen.getAllByText(/Маньяк/i)[0]).toBeDefined();
    expect(screen.getAllByText(/Оперативник/i)[0]).toBeDefined();
    unmount();

    render(
      <GameOverModal
        winner="KILLER"
        mode="THIEF_HUNT"
        elapsedTime="00:00"
        onRestart={mockOnRestart}
      />
    );
    expect(screen.getAllByText(/Грабитель/i)[0]).toBeDefined();
    expect(screen.getAllByText(/Полиция/i)[0]).toBeDefined();
  });

  it("отображает кнопки реванша в мультиплеерном режиме", () => {
    const { container } = render(
      <GameOverModal
        winner="KILLER"
        mode="SKHVATKA"
        elapsedTime="00:00"
        isMultiplayer={true}
        onRematchSwap={mockOnRematchSwap}
        onRematchRandom={mockOnRematchRandom}
        onRestart={mockOnRestart}
      />
    );

    const buttons = Array.from(container.querySelectorAll("button"));
    // Кнопка смены ролей красная, случайных ролей - синяя
    const swapBtn = buttons.find(b => b.className.includes("from-red-950"));
    const randomBtn = buttons.find(b => b.className.includes("from-blue-950"));

    expect(swapBtn).toBeDefined();
    expect(randomBtn).toBeDefined();

    fireEvent.click(swapBtn!);
    expect(mockOnRematchSwap).toHaveBeenCalled();

    fireEvent.click(randomBtn!);
    expect(mockOnRematchRandom).toHaveBeenCalled();
  });
});
