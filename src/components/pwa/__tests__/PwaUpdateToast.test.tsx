/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PwaUpdateToast } from "../PwaUpdateToast";

// Мокаем virtual:pwa-register/react для дефолтного хука
let mockNeedRefreshState = false;
const mockSetNeedRefresh = vi.fn((val) => {
  mockNeedRefreshState = val;
});
const mockUpdateServiceWorker = vi.fn().mockResolvedValue(undefined);

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [mockNeedRefreshState, mockSetNeedRefresh],
    updateServiceWorker: mockUpdateServiceWorker,
  }),
}));

describe("PwaUpdateToast Component (Поток 2 — PWA-обновления)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNeedRefreshState = false;
  });

  afterEach(() => {
    cleanup();
  });

  it("не рендерит тост, если обновление отсутствует (needRefresh = false)", () => {
    const { container } = render(<PwaUpdateToast needRefreshOverride={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("рендерит Neo-Noir уведомление при наличии обновления", () => {
    render(<PwaUpdateToast needRefreshOverride={true} />);

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("ОБНОВЛЕНИЕ СИСТЕМЫ")).toBeDefined();
    expect(screen.getByText(/Доступна новая версия приложения/i)).toBeDefined();

    const updateBtn = screen.getByRole("button", { name: "Обновить" });
    const laterBtn = screen.getByRole("button", { name: "Позже" });
    const closeBtn = screen.getByLabelText("Отложить обновление");

    expect(updateBtn).toBeDefined();
    expect(laterBtn).toBeDefined();
    expect(closeBtn).toBeDefined();

    // Проверяем сенсорные цели Touch Targets ≥ 44px
    expect(updateBtn.className).toMatch(/min-h-\[44px\]/);
    expect(laterBtn.className).toMatch(/min-h-\[44px\]/);
    expect(closeBtn.className).toMatch(/w-11 h-11/);
  });

  it("вызывает updateServiceWorker(true) при нажатии кнопки 'Обновить'", async () => {
    const updateWorkerMock = vi.fn().mockResolvedValue(undefined);
    render(
      <PwaUpdateToast
        needRefreshOverride={true}
        updateServiceWorkerOverride={updateWorkerMock}
      />
    );

    const updateBtn = screen.getByRole("button", { name: "Обновить" });
    fireEvent.click(updateBtn);

    expect(updateWorkerMock).toHaveBeenCalledTimes(1);
    expect(updateWorkerMock).toHaveBeenCalledWith(true);
  });

  it("скрывает тост при клике на 'Позже' и вызывает onCloseOverride", () => {
    const closeMock = vi.fn();
    render(
      <PwaUpdateToast
        needRefreshOverride={true}
        onCloseOverride={closeMock}
      />
    );

    const laterBtn = screen.getByRole("button", { name: "Позже" });
    fireEvent.click(laterBtn);

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("скрывает тост при клике на крестик закрытия", () => {
    const closeMock = vi.fn();
    render(
      <PwaUpdateToast
        needRefreshOverride={true}
        onCloseOverride={closeMock}
      />
    );

    const closeBtn = screen.getByLabelText("Отложить обновление");
    fireEvent.click(closeBtn);

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("не содержит системных цветных эмодзи в разметке", () => {
    const { container } = render(<PwaUpdateToast needRefreshOverride={true} />);
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(container.textContent || "")).toBe(false);
  });
});
