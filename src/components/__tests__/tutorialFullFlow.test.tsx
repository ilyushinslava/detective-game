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

  it("Стартовое меню Академии отображает 7 модулей The Wicked City и позволяет войти в каждый сценарий", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    expect(screen.getByText(/Основы The Wicked City/i)).toBeDefined();
    expect(screen.getByText(/Синдикат \(Охота: Убийца\)/i)).toBeDefined();
    expect(screen.getByText(/Зачистка \(Охота: Детектив\)/i)).toBeDefined();
    expect(screen.getByText(/Тени \(Ограбление: Вор\)/i)).toBeDefined();
    expect(screen.getByText(/Кордон \(Ограбление: Полиция\)/i)).toBeDefined();
    expect(screen.getByText(/Перехват \(Контрразведка\)/i)).toBeDefined();
    expect(screen.getByText(/Допросная \(Очная ставка\)/i)).toBeDefined();
    expect(screen.getByText(/Архив The Wicked City/i)).toBeDefined();
    expect(screen.getByText(/Пройдено:/i)).toBeDefined();

    // Вход в модуль Убийцы и возврат в архив
    fireEvent.click(screen.getByText(/Синдикат \(Охота: Убийца\)/i));
    expect(screen.getByText(/КОНТРАКТ: УБИЙЦА/i)).toBeDefined();

    fireEvent.click(screen.getByText(/← В архив/i));
    expect(screen.getByText(/Архив The Wicked City/i)).toBeDefined();
  });

  it("Сценарий 'Синдикат' (MANIAC_KILLER): аппаратная блокировка неверных действий, ликвидация и побег со сменой маски", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    // 1. Вход в модуль
    fireEvent.click(screen.getByText(/Синдикат \(Охота: Убийца\)/i));
    expect(screen.getAllByText(/Подвод жертвы/i).length).toBeGreaterThan(0);

    // Нецелевое действие: клик по карточке на шаге маневра заблокирован и не меняет шаг
    const randomCard = screen.getAllByText(/#/i)[0];
    fireEvent.click(randomCard);
    expect(screen.getAllByText(/Подвод жертвы/i).length).toBeGreaterThan(0);

    // Шаг 1: маневр 3-й колонки вниз (col index 2, forward)
    const colDownBtn = screen.getByTestId("col-down-2");
    fireEvent.click(colDownBtn);

    // Шаг 2: Захват цели (Елена Соколова)
    expect(screen.getAllByText(/Захват цели/i).length).toBeGreaterThan(0);
    const targetCard = screen.getByAltText("Елена Соколова");
    fireEvent.click(targetCard);

    // Шаг 3: Ликвидация
    expect(screen.getAllByText(/Ликвидация/i).length).toBeGreaterThan(0);
    const killBtn = screen.getByRole("button", { name: /Ликвидировать по заказу/i });
    fireEvent.click(killBtn);

    // Шаг 4: Побег
    expect(screen.getAllByText(/Побег/i).length).toBeGreaterThan(0);
    const escapeBtn = screen.getByRole("button", { name: /Конспирация \(Побег\)/i });
    fireEvent.click(escapeBtn);

    // Шаг 5: Модальное окно новой маски -> Принять личность
    expect(screen.getByText(/Ваша новая маска/i)).toBeDefined();
    const confirmDisguiseBtn = screen.getByRole("button", { name: /Принять личность/i });
    fireEvent.click(confirmDisguiseBtn);

    // Завершение модуля и возврат в архив
    expect(screen.getAllByText(/Конспирация успешна/i).length).toBeGreaterThan(0);
    const finishBtn = screen.getByRole("button", { name: /Завершить модуль/i });
    fireEvent.click(finishBtn);

    expect(screen.getByText(/Архив The Wicked City/i)).toBeDefined();
    const saved = JSON.parse(localStorage.getItem("crime_city_completed_modules") || "[]");
    expect(saved).toContain("MANIAC_KILLER");
  });

  it("Сценарий 'Зачистка' (MANIAC_DETECTIVE): арест и механика зачистки сетки вниз", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    // Вход в модуль Детектива
    fireEvent.click(screen.getByText(/Зачистка \(Охота: Детектив\)/i));
    expect(screen.getAllByText(/Анализ алиби/i).length).toBeGreaterThan(0);

    // Шаг 1: Подозреваемый без щита в [1][1] (София Романова, #07)
    const suspectCard = screen.getByAltText("София Романова");
    fireEvent.click(suspectCard);

    // Шаг 2: Задержание
    expect(screen.getAllByText(/Арест/i).length).toBeGreaterThan(0);
    const arrestBtn = screen.getByRole("button", { name: /Задержание/i });
    fireEvent.click(arrestBtn);

    // Шаг 3: Зачистка сетки (уплотнение мертвых вниз)
    expect(screen.getAllByText(/Зачистка/i).length).toBeGreaterThan(0);
    const cleanupBtn = screen.getByRole("button", { name: /Зачистка/i });
    fireEvent.click(cleanupBtn);

    // Шаг 4: Сектор чист -> Завершить модуль
    expect(screen.getAllByText(/Сектор чист/i).length).toBeGreaterThan(0);
    const finishBtn = screen.getByRole("button", { name: /Завершить модуль/i });
    fireEvent.click(finishBtn);

    const saved = JSON.parse(localStorage.getItem("crime_city_completed_modules") || "[]");
    expect(saved).toContain("MANIAC_DETECTIVE");
  });

  it("Сценарий 'Очная ставка' (LINE_UP): опрос свидетеля, отсечение по алиби и финальное обвинение", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    // 1. Вход в модуль Очная ставка
    const lineUpBtn = screen.getByText(/Допросная \(Очная ставка\)/i);
    fireEvent.click(lineUpBtn);
    expect(screen.getByText(/Очная ставка: Каталог/i)).toBeDefined();

    // 2. Шаг 1: Нажимаем кнопку вопроса свидетелю
    const askBtn = screen.getByRole("button", { name: /Задать вопрос/i });
    fireEvent.click(askBtn);

    // 3. Шаг 2: Ответ получен (ДА), появляется кнопка исключения непричастных
    expect(screen.getByText(/Очная ставка: Отсечение/i)).toBeDefined();
    const eliminateBtn = screen.getByRole("button", { name: /Исключить непричастных/i });
    fireEvent.click(eliminateBtn);

    // 4. Шаг 3: Круг сужен, выбираем карточку Руслана Громова
    expect(screen.getByText(/Очная ставка: Мишень/i)).toBeDefined();
    const gromovCard = screen.getByAltText("Руслан Громов");
    fireEvent.click(gromovCard);

    // 5. Шаг 4: Выносим обвинение
    expect(screen.getByText(/Очная ставка: Приговор/i)).toBeDefined();
    const accuseBtn = screen.getByRole("button", { name: /Вынести обвинение/i });
    fireEvent.click(accuseBtn);

    // 6. Шаг 5: Завершение модуля и возврат в архив
    expect(screen.getByText(/Архив закрыт/i)).toBeDefined();
    const finishModuleBtn = screen.getByRole("button", { name: /Завершить модуль/i });
    fireEvent.click(finishModuleBtn);

    expect(screen.getByText(/Архив The Wicked City/i)).toBeDefined();
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
    localStorage.setItem(
      "crime_city_completed_modules",
      JSON.stringify(["BASICS", "MANIAC_KILLER", "MANIAC_DETECTIVE", "THIEF_ROBBER", "THIEF_POLICE", "SECRET_SERVICE", "LINE_UP"])
    );
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
