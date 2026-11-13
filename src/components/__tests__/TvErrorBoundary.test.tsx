// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";
import { TvErrorBoundary } from "../TvErrorBoundary";

const BuggyComponent: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({
  shouldThrow = true,
  errorMessage = "Тестовый сбой рендера",
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="buggy-ok">Работает штатно</div>;
};

describe("TvErrorBoundary (Защита от белого экрана смерти)", () => {
  let originalLocation: Location;
  let originalError: typeof console.error;

  beforeEach(() => {
    vi.useFakeTimers();
    originalError = console.error;
    console.error = vi.fn(); // Подавляем вывод React ErrorBoundary в консоль тестов

    originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      reload: vi.fn(),
      href: "http://localhost:5173",
      search: "",
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    console.error = originalError;
    window.location = originalLocation;
  });

  it("рендерит дочерние компоненты в штатном режиме без ошибок", () => {
    render(
      <TvErrorBoundary>
        <BuggyComponent shouldThrow={false} />
      </TvErrorBoundary>
    );

    expect(screen.getByTestId("buggy-ok").textContent).toContain("Работает штатно");
    expect(screen.queryByText(/КРИТИЧЕСКАЯ ОШИБКА СИСТЕМЫ/i)).toBeNull();
  });

  it("перехватывает ошибку рендера и отображает кинематографичный экран сбоя", () => {
    render(
      <TvErrorBoundary>
        <BuggyComponent shouldThrow={true} errorMessage="Критический сбой игрового поля" />
      </TvErrorBoundary>
    );

    // Заголовок ошибки
    expect(screen.getByText("КРИТИЧЕСКАЯ ОШИБКА СИСТЕМЫ")).toBeDefined();
    // Сообщение об ошибке в моноширинном контейнере
    expect(screen.getByText("Критический сбой игрового поля")).toBeDefined();
    // Начальный отсчет 5 секунд
    expect(screen.getByText(/АВТОМАТИЧЕСКАЯ ПЕРЕЗАГРУЗКА ЧЕРЕЗ/i)).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
  });

  it("уменьшает таймер обратного отсчета каждую секунду и вызывает window.location.reload() по истечении", () => {
    render(
      <TvErrorBoundary autoReloadSeconds={3}>
        <BuggyComponent shouldThrow={true} />
      </TvErrorBoundary>
    );

    expect(screen.getByText("3")).toBeDefined();
    expect(window.location.reload).not.toHaveBeenCalled();

    // 1 секунда
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("2")).toBeDefined();
    expect(window.location.reload).not.toHaveBeenCalled();

    // 2 секунда
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("1")).toBeDefined();
    expect(window.location.reload).not.toHaveBeenCalled();

    // 3 секунда -> срабатывает перезагрузка
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it("вызывает немедленную перезагрузку по клику на кнопку 'ПЕРЕЗАГРУЗИТЬ СЕЙЧАС'", () => {
    render(
      <TvErrorBoundary autoReloadSeconds={5}>
        <BuggyComponent shouldThrow={true} />
      </TvErrorBoundary>
    );

    const reloadBtn = screen.getByRole("button", { name: /ПЕРЕЗАГРУЗИТЬ СЕЙЧАС/i });
    expect(reloadBtn).toBeDefined();

    fireEvent.click(reloadBtn);
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it("останавливает таймер при размонтировании компонента", () => {
    const { unmount } = render(
      <TvErrorBoundary autoReloadSeconds={5}>
        <BuggyComponent shouldThrow={true} />
      </TvErrorBoundary>
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(window.location.reload).not.toHaveBeenCalled();
  });
});
