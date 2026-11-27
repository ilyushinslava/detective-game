// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ServerMessageModal } from "../ServerMessageModal";

const LONG_MESSAGE =
  "Состояние матча рассинхронизировано с сервером. Переподключитесь к комнате, чтобы продолжить игру без потери прогресса.";

describe("ServerMessageModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("не рендерит ничего при isOpen=false", () => {
    const { container } = render(
      <ServerMessageModal isOpen={false} title="Скрыто" message="Скрытый текст" />
    );

    expect(container.firstChild).toBeNull();
  });

  it("показывает заголовок и полный текст без truncate", () => {
    render(<ServerMessageModal isOpen={true} title="Рассинхронизация" message={LONG_MESSAGE} />);

    expect(screen.getByText("Рассинхронизация")).toBeDefined();
    const messageEl = screen.getByText(LONG_MESSAGE);
    expect(messageEl.textContent).toBe(LONG_MESSAGE);
    expect(messageEl.className).not.toContain("truncate");
  });

  it("поддерживает варианты info, warning и final", () => {
    const { unmount } = render(
      <ServerMessageModal isOpen={true} variant="info" title="Инфо" message="Текст инфо" />
    );
    expect(screen.getByText("Инфо")).toBeDefined();
    unmount();

    render(<ServerMessageModal isOpen={true} variant="warning" title="Внимание" message="Текст ошибки" />);
    expect(screen.getByText("Внимание")).toBeDefined();
    cleanup();

    render(<ServerMessageModal isOpen={true} variant="final" title="Финал" message="Текст финала" />);
    expect(screen.getByText("Финал")).toBeDefined();
  });

  it("вызывает onPrimary и onSecondary по нажатию кнопок", () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();

    render(
      <ServerMessageModal
        isOpen={true}
        title="Действие отклонено"
        message="Сейчас ход соперника."
        primaryLabel="Переподключиться"
        onPrimary={onPrimary}
        secondaryLabel="Закрыть"
        onSecondary={onSecondary}
      />
    );

    fireEvent.click(screen.getByText("Переподключиться"));
    expect(onPrimary).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Закрыть"));
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it("отображает hint, если он передан", () => {
    render(
      <ServerMessageModal
        isOpen={true}
        title="Ошибка"
        message="Текст"
        hint="Проверьте соединение"
      />
    );

    expect(screen.getByText("Проверьте соединение")).toBeDefined();
  });
});
