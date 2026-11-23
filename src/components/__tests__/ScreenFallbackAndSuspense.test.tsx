/**
 * @vitest-environment jsdom
 */
import React, { Suspense, lazy } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { ScreenFallback } from "../ui/ScreenFallback";

describe("ScreenFallback & Suspense Integration (Поток 1 & 3 — Code-Splitting)", () => {
  afterEach(() => {
    cleanup();
  });

  it("рендерит ScreenFallback со спиннером и сапфировым акцентом", () => {
    render(<ScreenFallback />);

    const statusEl = screen.getByRole("status");
    expect(statusEl).toBeDefined();
    expect(screen.getByText("Загрузка модуля...")).toBeDefined();

    const spinner = statusEl.querySelector(".animate-spin");
    expect(spinner).toBeDefined();
    expect(spinner?.className).toContain("border-t-blue-500");
  });

  it("поддерживает кастомный лейбл загрузки", () => {
    render(<ScreenFallback label="Инициализация связи с ТВ..." />);
    expect(screen.getByText("Инициализация связи с ТВ...")).toBeDefined();
  });

  it("не содержит системных эмодзи", () => {
    const { container } = render(<ScreenFallback />);
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(container.textContent || "")).toBe(false);
  });

  it("корректно отображает fallback во время загрузки React.lazy и заменяет его при резолве", async () => {
    let resolvePromise: (value: { default: React.FC }) => void;
    const lazyPromise = new Promise<{ default: React.FC }>((resolve) => {
      resolvePromise = resolve;
    });

    const MockLazyComponent = lazy(() => lazyPromise);

    render(
      <Suspense fallback={<ScreenFallback label="Загрузка тестового экрана..." />}>
        <MockLazyComponent />
      </Suspense>
    );

    // В фазе Pending отображается fallback
    expect(screen.getByText("Загрузка тестового экрана...")).toBeDefined();

    // Разрешаем промис
    const TargetScreen: React.FC = () => <div data-testid="target-screen">Экран загружен</div>;
    await act(async () => {
      resolvePromise!({ default: TargetScreen });
    });

    // В фазе Resolved fallback исчез, отрендерился целевой компонент
    expect(screen.queryByText("Загрузка тестового экрана...")).toBeNull();
    expect(screen.getByTestId("target-screen")).toBeDefined();
    expect(screen.getByText("Экран загружен")).toBeDefined();
  });
});
