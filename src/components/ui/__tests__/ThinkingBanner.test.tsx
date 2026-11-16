// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThinkingBanner } from "../ThinkingBanner";

describe("ThinkingBanner Component (UI-отклик 'Бот Думает')", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("рендерит Neo-Noir плашку раздумий с акцидентным текстом и бейджем AI", () => {
    render(<ThinkingBanner label="СИСТЕМА АНАЛИЗИРУЕТ" />);

    const banner = screen.getByTestId("ai-thinking-banner");
    expect(banner).toBeDefined();
    expect(screen.getByText(/СИСТЕМА АНАЛИЗИРУЕТ/i)).toBeDefined();
    expect(screen.getByText(/\[AI_PROCESSING\]/i)).toBeDefined();
  });

  it("анимирует эффект точек печатной машинки по таймеру", () => {
    render(<ThinkingBanner label="ХОД ПРОТИВНИКА" />);

    expect(screen.getByText(/ХОД ПРОТИВНИКА/i)).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(450);
    });

    expect(screen.getByText(".")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(450);
    });

    expect(screen.getByText("..")).toBeDefined();
  });
});
