// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { LegalModal } from "../LegalModal";

vi.mock("../../../utils/audio", () => ({
  soundManager: {
    play: vi.fn(),
  },
}));

describe("LegalModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("рендерится корректно при isOpen={true} со всеми обязательными разделами", () => {
    render(<LegalModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Правовая информация")).toBeDefined();
    expect(screen.getByText(/1\. Вымышленность событий и персонажей/i)).toBeDefined();
    expect(screen.getByText(/2\. Внутриигровая валюта и статус проекта/i)).toBeDefined();
    expect(screen.getByText(/3\. Авторские права и материалы/i)).toBeDefined();
    expect(screen.getByText(/4\. Ограничение ответственности/i)).toBeDefined();

    // Проверка лицензий шрифтов и аудио
    expect(screen.getByText(/Pixabay Content License/i)).toBeDefined();
    expect(screen.getByText(/SIL Open Font License/i)).toBeDefined();
  });

  it("вызывает onClose при клике на кнопку 'Понятно'", () => {
    const onClose = vi.fn();
    render(<LegalModal isOpen={true} onClose={onClose} />);

    const button = screen.getByRole("button", { name: "Понятно" });
    fireEvent.click(button);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
