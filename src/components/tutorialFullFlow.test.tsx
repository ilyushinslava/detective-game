// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TutorialScreen } from "./TutorialScreen";

describe("Интерактивное обучение (tutorialFullFlow)", () => {
  beforeEach(() => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });
  it("Стартовое меню отображает 4 модуля и позволяет войти в каждый сценарий", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    expect(screen.getByText(/Курс оперативника \(Схватка\)/i)).toBeDefined();
    expect(screen.getByText(/Охота на маньяка/i)).toBeDefined();
    expect(screen.getByText(/Охота на грабителя/i)).toBeDefined();
    expect(screen.getByText(/Секретная служба/i)).toBeDefined();

    // Вход в Маньяка и возврат
    fireEvent.click(screen.getByText(/Охота на маньяка/i));
    expect(screen.getByText(/Очередь целей/i)).toBeDefined();

    fireEvent.click(screen.getByText(/← К делам/i));
    expect(screen.getByText(/Каталог дел/i)).toBeDefined();
  });

  it("Действие задержания (handleArrest) не вешает штамп 'УБИТ'", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    // Запуск Схватки
    const skhvatkaBtns = screen.getAllByText(/Курс оперативника \(Схватка\)/i);
    fireEvent.click(skhvatkaBtns[0]);

    // Проходим шаг 1 (клик по соседу)
    const cards = screen.getAllByText(/#/i);
    fireEvent.click(cards[7]); // сосед центра

    // Не должно быть штампа "УБИТ"
    expect(screen.queryByText("УБИТ")).toBeNull();
  });

  it("Кнопка завершения курса: вызывает onExit если модули не пройдены, и onFinish если все сданы", () => {
    localStorage.clear();
    const onExit = vi.fn();
    const onFinish = vi.fn();

    // 1. Модули не пройдены -> вызывается onExit без начисления наград
    const { container, unmount } = render(<TutorialScreen onExit={onExit} onFinish={onFinish} />);
    const exitBtn = container.querySelector('button.from-emerald-700') || screen.getAllByRole('button', { name: /В главное меню/i })[0];
    fireEvent.click(exitBtn);
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
    unmount();

    // 2. Все модули пройдены -> вызывается onFinish
    localStorage.setItem("crime_city_completed_modules", JSON.stringify(["SKHVATKA", "MANIAC", "THIEF", "SECRET_SERVICE"]));
    const onFinishCompleted = vi.fn();
    const { container: containerCompleted } = render(<TutorialScreen onExit={vi.fn()} onFinish={onFinishCompleted} />);
    const finishBtn = containerCompleted.querySelector('button.from-emerald-700') || screen.getAllByRole('button', { name: /Завершить курс/i })[0];
    fireEvent.click(finishBtn);
    expect(onFinishCompleted).toHaveBeenCalledTimes(1);
    localStorage.clear();
  });
});
