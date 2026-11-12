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

  it("Стартовое меню Академии отображает 7 модулей и позволяет войти в каждый сценарий", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    expect(screen.getByText(/1. Основы игры/i)).toBeDefined();
    expect(screen.getByText(/2. Почерк убийцы: Маньяк/i)).toBeDefined();
    expect(screen.getByText(/3. Почерк убийцы: Оперативник/i)).toBeDefined();
    expect(screen.getByText(/4. Оцепление: Вор/i)).toBeDefined();
    expect(screen.getByText(/5. Оцепление: Полиция/i)).toBeDefined();
    expect(screen.getByText(/6. Директива «Ноль»: Контрразведка/i)).toBeDefined();
    expect(screen.getByText(/7. Очная ставка: Допрос/i)).toBeDefined();
    expect(screen.getByText(/Академия детективов/i)).toBeDefined();
    expect(screen.getByText(/Пройдено:/i)).toBeDefined();

    // Вход в модуль Убийцы и возврат в архив
    fireEvent.click(screen.getByText(/2. Почерк убийцы: Маньяк/i));
    expect(screen.getByText(/УРОК 2: ИГРА ЗА МАНЬЯКА/i)).toBeDefined();

    fireEvent.click(screen.getByText(/← В архив/i));
    expect(screen.getByText(/Академия детективов/i)).toBeDefined();
  });

  it("Сценарий 'Почерк убийцы' (MANIAC_KILLER): аппаратная блокировка неверных действий, ликвидация и побег со сменой маски", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    // 1. Вход в модуль
    fireEvent.click(screen.getByText(/2. Почерк убийцы: Маньяк/i));
    expect(screen.getAllByText(/Подвод жертвы/i).length).toBeGreaterThan(0);

    // Нецелевое действие: клик по карточке на шаге маневра заблокирован и не меняет шаг
    const randomCard = screen.getAllByText(/#/i)[0];
    fireEvent.click(randomCard);
    expect(screen.getAllByText(/Подвод жертвы/i).length).toBeGreaterThan(0);

    // Шаг 1: маневр 3-й колонки вниз (col index 2, forward)
    const colDownBtn = screen.getByTestId("col-down-2");
    fireEvent.click(colDownBtn);

    // Шаг 2: Выбор цели (Елена Соколова)
    expect(screen.getAllByText(/Выбор цели/i).length).toBeGreaterThan(0);
    const targetCard = screen.getByAltText("Елена Соколова");
    fireEvent.click(targetCard);

    // Шаг 3: Ликвидация
    expect(screen.getAllByText(/Ликвидация жертвы/i).length).toBeGreaterThan(0);
    const killBtn = screen.getByRole("button", { name: /Ликвидировать цель/i });
    fireEvent.click(killBtn);

    // Шаг 4: Побег
    expect(screen.getAllByText(/Смена маски \(Конспирация\)/i).length).toBeGreaterThan(0);
    const escapeBtn = screen.getByRole("button", { name: /Сменить маску/i });
    fireEvent.click(escapeBtn);

    // Шаг 5: Модальное окно новой маски -> Подтвердить маску
    expect(screen.getByText(/Ваша новая тайная личность/i)).toBeDefined();
    const confirmDisguiseBtn = screen.getByRole("button", { name: /Подтвердить маску/i });
    fireEvent.click(confirmDisguiseBtn);

    // Завершение модуля и возврат в архив
    expect(screen.getAllByText(/Маскировка успешна/i).length).toBeGreaterThan(0);
    const finishBtn = screen.getByRole("button", { name: /Завершить урок/i });
    fireEvent.click(finishBtn);

    expect(screen.getByText(/Академия детективов/i)).toBeDefined();
    const saved = JSON.parse(localStorage.getItem("crime_city_completed_modules") || "[]");
    expect(saved).toContain("MANIAC_KILLER");
  });

  it("Сценарий 'Почерк убийцы' (MANIAC_DETECTIVE): арест и механика зачистки поля вниз", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    // Вход в модуль Детектива
    fireEvent.click(screen.getByText(/3. Почерк убийцы: Оперативник/i));
    expect(screen.getAllByText(/Проверка алиби/i).length).toBeGreaterThan(0);

    // Шаг 1: Подозреваемый без щита в [1][1] (София Романова, #07)
    const suspectCard = screen.getByAltText("София Романова");
    fireEvent.click(suspectCard);

    // Шаг 2: Задержание
    expect(screen.getAllByText(/Задержание маньяка/i).length).toBeGreaterThan(0);
    const arrestBtn = screen.getByRole("button", { name: /Задержать подозреваемого/i });
    fireEvent.click(arrestBtn);

    // Шаг 3: Зачистка поля (уплотнение мертвых вниз)
    expect(screen.getAllByText(/Зачистка поля/i).length).toBeGreaterThan(0);
    const cleanupBtn = screen.getByRole("button", { name: /Зачистка поля/i });
    fireEvent.click(cleanupBtn);

    // Шаг 4: Дело раскрыто -> Завершить урок
    expect(screen.getAllByText(/Дело раскрыто/i).length).toBeGreaterThan(0);
    const finishBtn = screen.getByRole("button", { name: /Завершить урок/i });
    fireEvent.click(finishBtn);

    const saved = JSON.parse(localStorage.getItem("crime_city_completed_modules") || "[]");
    expect(saved).toContain("MANIAC_DETECTIVE");
  });

  it("Сценарий 'Очная ставка' (LINE_UP): опрос свидетеля, отсечение по алиби и финальное обвинение", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    // 1. Вход в модуль Очная ставка
    const lineUpBtn = screen.getByText(/7. Очная ставка: Допрос/i);
    fireEvent.click(lineUpBtn);
    expect(screen.getByText(/Вопрос по примете/i)).toBeDefined();

    // 2. Шаг 1: Нажимаем кнопку вопроса свидетелю
    const askBtn = screen.getByRole("button", { name: /Спросить: есть ли головной убор/i });
    fireEvent.click(askBtn);

    // 3. Шаг 2: Ответ получен (ДА), появляется кнопка исключения невиновных
    expect(screen.getByText(/Исключение неподходящих/i)).toBeDefined();
    const eliminateBtn = screen.getByRole("button", { name: /Исключить невиновных/i });
    fireEvent.click(eliminateBtn);

    // 4. Шаг 3: Круг сужен, выбираем карточку Руслана Громова
    expect(screen.getByText(/Единственный подозреваемый/i)).toBeDefined();
    const gromovCard = screen.getByAltText("Руслан Громов");
    fireEvent.click(gromovCard);

    // 5. Шаг 4: Выносим обвинение
    expect(screen.getByText(/Финальное обвинение/i)).toBeDefined();
    const accuseBtn = screen.getByRole("button", { name: /Предъявить обвинение/i });
    fireEvent.click(accuseBtn);

    // 6. Шаг 5: Завершение модуля и возврат в архив
    expect(screen.getByText(/Академия пройдена/i)).toBeDefined();
    const finishModuleBtn = screen.getByRole("button", { name: /Завершить обучение/i });
    fireEvent.click(finishModuleBtn);

    expect(screen.getByText(/Академия детективов/i)).toBeDefined();
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
