// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { TvPauseModal } from "../TvPauseModal";

describe("TvPauseModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    cleanup();
  });

  it("is hidden when isOpen is false", () => {
    const { container } = render(
      <TvPauseModal
        isOpen={false}
        onResume={vi.fn()}
        onRestart={vi.fn()}
        onExit={vi.fn()}
      />
    );

    const modalRoot = container.querySelector('[aria-hidden="true"]');
    expect(modalRoot).not.toBeNull();
    expect(modalRoot?.className).toContain("opacity-0");
  });

  it("renders standard pause menu when disconnectedPlayer is null", () => {
    const onResume = vi.fn();
    const onRestart = vi.fn();
    const onExit = vi.fn();

    render(
      <TvPauseModal
        isOpen={true}
        onResume={onResume}
        onRestart={onRestart}
        onExit={onExit}
        roomCode="ABCD"
      />
    );

    expect(screen.getByText(/Пауза матча/i)).toBeDefined();
    expect(screen.getByText(/#ABCD/i)).toBeDefined();
    expect(screen.getByText(/Матч временно приостановлен/i)).toBeDefined();

    const resumeBtn = screen.getByRole("button", { name: /ПРОДОЛЖИТЬ/i });
    fireEvent.click(resumeBtn);
    expect(onResume).toHaveBeenCalledTimes(1);

    const restartBtn = screen.getByRole("button", { name: /ПЕРЕЗАПУСТИТЬ МАТЧ/i });
    fireEvent.click(restartBtn);
    expect(onRestart).toHaveBeenCalledTimes(1);

    const exitBtn = screen.getByRole("button", { name: /ВЫЙТИ В ГЛАВНОЕ МЕНЮ/i });
    fireEvent.click(exitBtn);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("renders emergency reconnect terminal when disconnectedPlayer is present", () => {
    const { container } = render(
      <TvPauseModal
        isOpen={true}
        onResume={vi.fn()}
        onRestart={vi.fn()}
        onExit={vi.fn()}
        roomCode="WXYZ"
        morseCode=".- -... -.-."
        disconnectedPlayer={{
          playerId: "player-123",
          role: "criminal",
          name: "Криминальный Босс",
        }}
        gracePeriodSeconds={30}
      />
    );

    expect(screen.getByText(/ОЖИДАНИЕ ВОЗВРАЩЕНИЯ ИГРОКА В СЕТЬ/i)).toBeDefined();
    expect(screen.getByText(/Криминальный Босс/i)).toBeDefined();
    expect(screen.getByText(/Преступник/i)).toBeDefined();
    expect(screen.getByText(/00:30/i)).toBeDefined();

    // QR-код присутствует
    const qrSvg = container.querySelector("svg");
    expect(qrSvg).toBeDefined();

    // Проверяем отрисовку элементов кода Морзе
    expect(screen.getByText(/Резервный ввод \(код Морзе\)/i)).toBeDefined();
    expect(screen.getByText(".-")).toBeDefined();

    // Прокручиваем таймер на 10 секунд
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText(/00:20/i)).toBeDefined();
  });

  it("updates UI when grace period expires", () => {
    render(
      <TvPauseModal
        isOpen={true}
        onResume={vi.fn()}
        onRestart={vi.fn()}
        onExit={vi.fn()}
        roomCode="7788"
        disconnectedPlayer={{
          playerId: "p-detective",
          role: "detective",
          name: "Инспектор",
        }}
        gracePeriodSeconds={5}
      />
    );

    expect(screen.getByText(/00:05/i)).toBeDefined();

    // Прокручиваем все 5 секунд
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/00:00/i)).toBeDefined();
    expect(screen.getAllByText(/Время ожидания истекло/i).length).toBeGreaterThanOrEqual(1);
  });
});
