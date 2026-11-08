// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TutorialScreen } from "../TutorialScreen";

describe("Интерактивное обучение (tutorialFullFlow)", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  it("Стартовое меню отображает 5 модулей и позволяет войти в каждый сценарий", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    expect(screen.getByText(/Основы Син-Сити/i)).toBeDefined();
    expect(screen.getByText(/Охота на маньяка/i)).toBeDefined();
    expect(screen.getByText(/Охота на грабителя/i)).toBeDefined();
    expect(screen.getByText(/Секретная служба/i)).toBeDefined();
    expect(screen.getByText(/Очная ставка/i)).toBeDefined();

    // Вход в Маньяка и возврат
    fireEvent.click(screen.getByText(/Охота на маньяка/i));
    expect(screen.getByText(/Очередь целей/i)).toBeDefined();

    fireEvent.click(screen.getByText(/← К делам/i));
    expect(screen.getByText(/Каталог дел/i)).toBeDefined();
  });

  it("Действие задержания (handleArrest) не вешает штамп 'УБИТ'", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    // Запуск Основ Син-Сити
    const basicsBtns = screen.getAllByText(/Основы Син-Сити/i);
    fireEvent.click(basicsBtns[0]);

    // Проходим шаг 1 (клик по соседу)
    const cards = screen.getAllByText(/#/i);
    fireEvent.click(cards[7]); // сосед центра
    expect(screen.queryByText("УБИТ")).toBeNull();
  });

  it("Сценарий 'Очная ставка' (LINE_UP): опрос свидетеля, отсечение по алиби и финальное обвинение", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    // 1. Вход в модуль Очная ставка
    const lineUpBtn = screen.getByText(/Очная ставка/i);
    fireEvent.click(lineUpBtn);
    expect(screen.getAllByText(/Очная ставка/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Каталог улик/i)).toBeDefined();

    // 2. Шаг 1: Нажимаем кнопку вопроса свидетелю
    const askBtn = screen.getByRole("button", { name: /Задать вопрос/i });
    fireEvent.click(askBtn);

    // 3. Шаг 2: Ответ получен (ДА), появляется кнопка исключения непричастных
    expect(screen.getByText(/Ответ получен: ДА/i)).toBeDefined();
    const eliminateBtn = screen.getByRole("button", { name: /Исключить непричастных/i });
    fireEvent.click(eliminateBtn);

    // 4. Шаг 3: Круг сужен, выбираем карточку Руслана Громова
    expect(screen.getByText(/Круг сужен!/i)).toBeDefined();
    const gromovCard = screen.getByAltText("Руслан Громов");
    fireEvent.click(gromovCard);

    // 5. Шаг 4: Выносим обвинение
    expect(screen.getByText(/Финальное обвинение/i)).toBeDefined();
    const accuseBtn = screen.getByRole("button", { name: /Вынести обвинение/i });
    fireEvent.click(accuseBtn);

    // 6. Шаг 5: Завершение модуля и возврат в меню
    expect(screen.getByText(/Победа в ставке!/i)).toBeDefined();
    const finishModuleBtn = screen.getByRole("button", { name: /Завершить модуль/i });
    fireEvent.click(finishModuleBtn);

    // Проверяем, что вернулись в меню и модуль помечен сданным
    expect(screen.getByText(/Каталог дел/i)).toBeDefined();
    const saved = JSON.parse(localStorage.getItem("crime_city_completed_modules") || "[]");
    expect(saved).toContain("LINE_UP");
  });

  it("Кнопка завершения курса: вызывает onExit если модули не пройдены, и onFinish если все сданы", () => {
    cleanup();
    localStorage.clear();
    const onExit = vi.fn();
    const onFinish = vi.fn();

    // 1. Модули не пройдены -> вызывается onExit без начисления наград
    const view1 = render(<TutorialScreen onExit={onExit} onFinish={onFinish} />);
    const exitBtn = view1.getAllByTestId("tutorial-main-action-btn")[0];
    fireEvent.click(exitBtn);
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
    view1.unmount();
    cleanup();

    // 2. Все модули пройдены -> вызывается onFinish
    localStorage.setItem("crime_city_completed_modules", JSON.stringify(["BASICS", "MANIAC", "THIEF", "SECRET_SERVICE", "LINE_UP"]));
    const onFinishCompleted = vi.fn();
    const view2 = render(<TutorialScreen onExit={vi.fn()} onFinish={onFinishCompleted} />);
    const finishBtn = view2.getAllByTestId("tutorial-main-action-btn")[0];
    fireEvent.click(finishBtn);
    expect(onFinishCompleted).toHaveBeenCalledTimes(1);
    view2.unmount();
    cleanup();
    localStorage.clear();
  });
});
