// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TutorialScreen } from "../TutorialScreen";
import { safeLocalStorage, safeSessionStorage } from "../../utils/storage";

describe("Интерактивное обучение Академии — 3 канонических модуля, 11 шагов (tutorialFullFlow)", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    safeLocalStorage.clear();
    safeSessionStorage.clear();
    window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  it("1. Меню Академии отображает ровно 3 модуля, счетчик 0/3 и блокировку награды", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    expect(screen.getByText(/Академия детективов/i)).toBeDefined();
    expect(screen.getByText(/Пройдено:/i)).toBeDefined();
    expect(screen.getByText(/0/i)).toBeDefined();
    expect(screen.getByText(/\/3/i)).toBeDefined();

    // 3 основных модуля
    expect(screen.getByText(/1\. Почерк убийцы/i)).toBeDefined();
    expect(screen.getByText(/2\. Оцепление/i)).toBeDefined();
    expect(screen.getByText(/3\. Директива «Ноль»/i)).toBeDefined();

    // Замороженная «Очная ставка» и фрагментированные «Основы игры» удалены
    expect(screen.queryByText(/Очная ставка/i)).toBeNull();
    expect(screen.queryByText(/1\. Основы игры/i)).toBeNull();

    // Кнопка выхода в меню вместо награды при 0/3
    const mainBtn = screen.getByTestId("tutorial-main-action-btn");
    expect(mainBtn.textContent).toContain("В главное меню");
  });

  it("2. Модуль 1 «Почерк убийцы»: прохождение всех 5 логичных шагов (Сдвиг -> Ликвидация -> Зачистка -> Проверка алиби -> Задержание)", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    // Вход в модуль
    fireEvent.click(screen.getByText(/1\. Почерк убийцы/i));
    expect(screen.getByText(/1\. Почерк убийцы/i)).toBeDefined();

    // Нецелевое действие: случайный клик не продвигает шаг
    const nonTargetCard = screen.getAllByRole("img")[0];
    fireEvent.click(nonTargetCard);
    expect(screen.getAllByText(/1\/5/).length).toBeGreaterThan(0);

    // Шаг 1: Сдвиг колонки 2 вниз
    const colDownBtn = screen.getByTestId("col-down-2");
    fireEvent.click(colDownBtn);

    // Шаг 2: Ликвидация (выбор Елены Соколовой c3 + клик по кнопке Ликвидация)
    expect(screen.getAllByText(/2\/5/).length).toBeGreaterThan(0);
    const elenaCard = screen.getByAltText("Елена Соколова");
    fireEvent.click(elenaCard);

    const killBtn = screen.getByRole("button", { name: /Ликвидация/i });
    fireEvent.click(killBtn);

    // Шаг 3: Зачистка поля
    expect(screen.getAllByText(/3\/5/).length).toBeGreaterThan(0);
    const cleanupBtn = screen.getByRole("button", { name: /Зачистка/i });
    fireEvent.click(cleanupBtn);

    // Шаг 4: Акт II — Проверка алиби (выбор Марии Климовой c13 + клик по кнопке Проверка алиби)
    expect(screen.getAllByText(/4\/5/).length).toBeGreaterThan(0);
    const mariaCard = screen.getAllByAltText("Мария Климова")[0];
    fireEvent.click(mariaCard);

    const alibiBtn = screen.getByRole("button", { name: /Проверка алиби/i });
    fireEvent.click(alibiBtn);

    // Шаг 5: Акт II — Задержание (выбор Софии Романовой c7 + клик по кнопке Задержание)
    expect(screen.getAllByText(/5\/5/).length).toBeGreaterThan(0);
    const sofiaCard = screen.getAllByAltText("София Романова")[0];
    fireEvent.click(sofiaCard);

    const arrestBtn = screen.getByRole("button", { name: /Задержание/i });
    fireEvent.click(arrestBtn);

    // Финал урока — кнопка «Завершить урок»
    const finishLessonBtn = screen.getByRole("button", { name: /Завершить урок/i });
    fireEvent.click(finishLessonBtn);

    // Возврат в меню Академии со статусом «Сдано»
    expect(screen.getByText(/Академия детективов/i)).toBeDefined();
    expect(screen.getByText(/Сдано/i)).toBeDefined();

    // Проверка записи в safeLocalStorage
    const saved = JSON.parse(
      safeLocalStorage.getItem("prime_suspect_completed_tutorial_modules") || "[]"
    );
    expect(saved).toContain("MANIAC");
  });

  it("3. Модуль 2 «Оцепление»: прохождение всех 4 шагов (Кража -> Конспирация -> Вызов патруля -> Задержание через патруль)", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    fireEvent.click(screen.getByText(/2\. Оцепление/i));
    expect(screen.getAllByText(/1\/4/).length).toBeGreaterThan(0);

    // Шаг 1: Кража (выбор Анны Мороз c5 + кнопка Кража)
    const annaCard = screen.getByAltText("Анна Мороз");
    fireEvent.click(annaCard);

    const robBtn = screen.getByRole("button", { name: /Кража/i });
    fireEvent.click(robBtn);

    // Шаг 2: Конспирация
    expect(screen.getAllByText(/2\/4/).length).toBeGreaterThan(0);
    const disguiseBtn = screen.getByRole("button", { name: /Конспирация/i });
    fireEvent.click(disguiseBtn);
    const confirmMaskBtn = screen.getByRole("button", { name: /Подтвердить маску/i });
    fireEvent.click(confirmMaskBtn);

    // Шаг 3: Акт II — Вызов патруля
    expect(screen.getAllByText(/3\/4/).length).toBeGreaterThan(0);
    const patrolBtn = screen.getByRole("button", { name: /Вызов патруля/i });
    fireEvent.click(patrolBtn);

    // Шаг 4: Задержание через патруль (выбор Софии Романовой c7 + кнопка Задержание)
    expect(screen.getAllByText(/4\/4/).length).toBeGreaterThan(0);
    const sofiaCard = screen.getAllByAltText("София Романова")[0];
    fireEvent.click(sofiaCard);

    const arrestThiefBtn = screen.getByRole("button", { name: /Задержание/i });
    fireEvent.click(arrestThiefBtn);

    // Завершить урок
    const finishLessonBtn = screen.getByRole("button", { name: /Завершить урок/i });
    fireEvent.click(finishLessonBtn);

    expect(screen.getByText(/Академия детективов/i)).toBeDefined();
    const saved = JSON.parse(
      safeLocalStorage.getItem("prime_suspect_completed_tutorial_modules") || "[]"
    );
    expect(saved).toContain("THIEF");
  });

  it("4. Модуль 3 «Директива «Ноль»»: прохождение 2 боевых шагов (Опрос свидетелей -> Разоблачение)", () => {
    render(<TutorialScreen onExit={vi.fn()} onFinish={vi.fn()} />);

    fireEvent.click(screen.getByText(/3\. Директива «Ноль»/i));
    expect(screen.getAllByText(/1\/2/).length).toBeGreaterThan(0);

    // Шаг 1: Опрос свидетелей (выбор Софии Романовой c7 + кнопка Опрос свидетелей)
    const sofiaCard = screen.getAllByAltText("София Романова")[0];
    fireEvent.click(sofiaCard);

    const interrogateBtn = screen.getByRole("button", { name: /Опрос свидетелей/i });
    fireEvent.click(interrogateBtn);

    // Шаг 2: Разоблачение шпиона (выбор Марка Воронова c2 + кнопка Разоблачение)
    expect(screen.getAllByText(/2\/2/).length).toBeGreaterThan(0);
    const markCard = screen.getByAltText("Марк Воронов");
    fireEvent.click(markCard);

    const exposeBtn = screen.getByRole("button", { name: /Разоблачение/i });
    fireEvent.click(exposeBtn);

    // Завершить урок
    const finishLessonBtn = screen.getByRole("button", { name: /Завершить урок/i });
    fireEvent.click(finishLessonBtn);

    expect(screen.getByText(/Академия детективов/i)).toBeDefined();
    const saved = JSON.parse(
      safeLocalStorage.getItem("prime_suspect_completed_tutorial_modules") || "[]"
    );
    expect(saved).toContain("SECRET_SERVICE");
  });

  it("5. Прогресс 3/3, кнопка «Завершить курс (+500 монет)» и начисление награды", () => {
    safeLocalStorage.setItem(
      "prime_suspect_completed_tutorial_modules",
      JSON.stringify(["MANIAC", "THIEF", "SECRET_SERVICE"])
    );

    const onFinish = vi.fn();
    const onExit = vi.fn();
    render(<TutorialScreen onExit={onExit} onFinish={onFinish} />);

    expect(screen.getByText(/Пройдено:/i)).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText(/\/3/i)).toBeDefined();

    const actionBtn = screen.getByTestId("tutorial-main-action-btn");
    expect(actionBtn.textContent).toContain("Завершить курс (+500 монет)");

    fireEvent.click(actionBtn);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onExit).not.toHaveBeenCalled();

    // Проверяем флаг награды
    expect(safeLocalStorage.getItem("requiem_tutorial_reward_claimed")).toBe("true");
  });

  it("6. Миграция старого хранилища (7 модулей -> 3 модуля): автоматический перенос прогресса", () => {
    safeLocalStorage.setItem(
      "crime_city_completed_modules",
      JSON.stringify(["BASICS", "MANIAC_KILLER", "MANIAC_DETECTIVE", "THIEF_ROBBER", "THIEF_POLICE", "SECRET_SERVICE", "LINE_UP"])
    );

    const onFinish = vi.fn();
    render(<TutorialScreen onExit={vi.fn()} onFinish={onFinish} />);

    // Должно сконвертироваться в 3/3 сданных модуля
    expect(screen.getByText(/Пройдено:/i)).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText(/\/3/i)).toBeDefined();
    const actionBtn = screen.getByTestId("tutorial-main-action-btn");
    expect(actionBtn.textContent).toContain("Завершить курс (+500 монет)");

    fireEvent.click(actionBtn);
    expect(onFinish).toHaveBeenCalledTimes(1);

    const newSaved = JSON.parse(
      safeLocalStorage.getItem("prime_suspect_completed_tutorial_modules") || "[]"
    );
    expect(newSaved).toEqual(expect.arrayContaining(["MANIAC", "THIEF", "SECRET_SERVICE"]));
  });

  it("7. Если награда уже забрана ранее, отображается кнопка «Курс пройден (В меню)»", () => {
    safeLocalStorage.setItem(
      "prime_suspect_completed_tutorial_modules",
      JSON.stringify(["MANIAC", "THIEF", "SECRET_SERVICE"])
    );
    safeLocalStorage.setItem("requiem_tutorial_reward_claimed", "true");

    const onFinish = vi.fn();
    const onExit = vi.fn();
    render(<TutorialScreen onExit={onExit} onFinish={onFinish} />);

    const claimBtn = screen.getByTestId("tutorial-main-action-btn");
    expect(claimBtn.textContent).toContain("Курс пройден (В меню)");
    fireEvent.click(claimBtn);

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("8. Кнопка-иконка «В главное меню» (aria-label) закрывает меню или возвращает из урока в меню", () => {
    const onExit = vi.fn();
    render(<TutorialScreen onExit={onExit} onFinish={vi.fn()} />);

    // Клик по кнопке-иконке в шапке меню
    const exitBtn = screen.getByLabelText("В главное меню");
    expect(exitBtn).toBeDefined();
    fireEvent.click(exitBtn);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
