// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ProfileScreen } from "../ProfileScreen";
import { ru } from "../../i18n/ru";

const mockSetLang = vi.fn();
vi.mock("../../i18n/context", () => ({
  useTranslation: () => ({
    t: { ...ru, menu: { ...(ru as any).menu, settings: "Settings" } },
    lang: "ru",
    setLang: mockSetLang,
  }),
  useLanguage: () => ({
    t: { ...ru, menu: { ...(ru as any).menu, settings: "Settings" } },
    lang: "ru",
    setLang: mockSetLang,
  }),
}));

vi.mock("../../utils/audio", () => ({
  soundManager: {
    play: vi.fn(),
  },
}));

describe("ProfileScreen", () => {
  const defaultProfile = {
    id: "1",
    nickname: "Agent Smith",
    avatar: "A",
    level: 1,
    xp: 0,
    cash: 15000,
    chips: 0,
    rank: "Special Agent",
    stats: { wins: 7, losses: 3 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("рендерит данные агента: позывной, ранг и баланс", () => {
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={vi.fn()} />);
    expect(screen.getByText("Agent Smith")).toBeDefined();
    expect(screen.getByText("Special Agent")).toBeDefined();
    expect(screen.getByText(/15[\s\u00A0,]?000/)).toBeDefined();
  });

  it("корректно рассчитывает и отображает статистику дел и винрейт", () => {
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={vi.fn()} />);
    expect(screen.getAllByText("10")[0]).toBeDefined();
    expect(screen.getAllByText("7")[0]).toBeDefined();
    expect(screen.getAllByText("3")[0]).toBeDefined();
    expect(screen.getByText("70%")).toBeDefined();
  });

  it("обрабатывает нулевую статистику без деления на ноль", () => {
    const zeroProfile = { ...defaultProfile, stats: { wins: 0, losses: 0 } };
    render(<ProfileScreen profile={zeroProfile} onUpdateProfile={vi.fn()} />);
    expect(screen.getByText("0%")).toBeDefined();
  });

  it("позволяет редактировать позывной и вызывает onUpdateProfile", () => {
    const mockUpdate = vi.fn();
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={mockUpdate} />);
    const editBtn = screen.getByTitle("Изменить позывной");
    fireEvent.click(editBtn);
    const input = screen.getByDisplayValue("Agent Smith");
    fireEvent.change(input, { target: { value: "Neo Agent" } });
    const saveBtn = screen.getByRole("button", { name: /сохранить/i });
    fireEvent.click(saveBtn);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ nickname: "Neo Agent" }));
  });

  it("санитизирует опасные символы при сохранении позывного для защиты от XSS", () => {
    const mockUpdate = vi.fn();
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={mockUpdate} />);
    const editBtn = screen.getByTitle("Изменить позывной");
    fireEvent.click(editBtn);
    const input = screen.getByDisplayValue("Agent Smith");
    fireEvent.change(input, { target: { value: "<b>Agent</b>" } });
    const saveBtn = screen.getByRole("button", { name: /сохранить/i });
    fireEvent.click(saveBtn);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ nickname: "bAgent/b" }));
  });

  it("блокирует сохранение нецензурного позывного и выводит сообщение об ошибке", () => {
    const mockUpdate = vi.fn();
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={mockUpdate} />);
    const editBtn = screen.getByTitle("Изменить позывной");
    fireEvent.click(editBtn);
    const input = screen.getByDisplayValue("Agent Smith");
    fireEvent.change(input, { target: { value: "Слава Лох" } });
    const saveBtn = screen.getByRole("button", { name: /сохранить/i });
    fireEvent.click(saveBtn);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(screen.getByText(/содержит недопустимые слова/i)).toBeDefined();
  });

  it("вызывает открытие настроек", () => {
    const mockOnOpenSettings = vi.fn();
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={vi.fn()} onOpenSettings={mockOnOpenSettings} />);
    const settingsBtn = screen.getAllByRole("button", { name: /Settings/i })[0];
    fireEvent.click(settingsBtn);
    expect(mockOnOpenSettings).toHaveBeenCalled();
  });

  it("отображает 'РЕЙТИНГ' вместо сленга 'MMR' и не содержит пафосных бутафорских подписей", () => {
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={vi.fn()} />);
    expect(screen.getByText("РЕЙТИНГ")).toBeDefined();
    expect(screen.queryByText(/РЕЙТИНГ MMR/i)).toBeNull();
    expect(screen.queryByText(/ОСОБЫЙ ОТДЕЛ/i)).toBeNull();
    expect(screen.queryByText(/DOSSIER/i)).toBeNull();
  });

  it("в модалке аватаров отображаются только фотографии без имен персонажей", () => {
    const mockUpdate = vi.fn();
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={mockUpdate} />);
    const avatarBtn = screen.getByTitle("Сменить аватар");
    fireEvent.click(avatarBtn);

    expect(screen.getByText("ВЫБЕРИТЕ АВАТАР")).toBeDefined();
    // Имена персонажей (типа Фокс, Вульф, Химик) отсутствуют
    expect(screen.queryByText(/Фокс/i)).toBeNull();
    expect(screen.queryByText(/Вульф/i)).toBeNull();
    expect(screen.queryByText(/Химик/i)).toBeNull();

    // Клик по первому аватару вызывает onUpdateProfile
    const avatarModalButtons = screen.getAllByRole("button");
    const firstAvatarBtn = avatarModalButtons.find(btn => btn.querySelector("img"));
    expect(firstAvatarBtn).toBeDefined();
    if (firstAvatarBtn) {
      fireEvent.click(firstAvatarBtn);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ avatarId: "c1" }));
    }
  });

  it("отображает блок 'СОХРАНЕНИЕ ПРОГРЕССА' с кнопкой призыва для анонимного профиля", () => {
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={vi.fn()} />);

    expect(screen.getByText("СОХРАНЕНИЕ ПРОГРЕССА")).toBeDefined();
    expect(
      screen.getByText(/Создайте профиль, чтобы навсегда сохранить текущий рейтинг, статистику и монеты/i)
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /СОЗДАТЬ ПРОФИЛЬ \/ ВОЙТИ/i })).toBeDefined();
    // Встроенные инпуты перенесены в AuthModal и отсутствуют в карточке
    expect(screen.queryByPlaceholderText("agent_77")).toBeNull();
  });

  it("по клику на кнопку 'СОЗДАТЬ ПРОФИЛЬ / ВОЙТИ' открывает модальное окно AuthModal", () => {
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={vi.fn()} />);

    const authBtn = screen.getByRole("button", { name: /СОЗДАТЬ ПРОФИЛЬ \/ ВОЙТИ/i });
    fireEvent.click(authBtn);

    // Модальное окно AuthModal открыто на вкладке создания профиля
    expect(screen.getByText("СОЗДАНИЕ ПРОФИЛЯ")).toBeDefined();
    expect(screen.getByPlaceholderText("agent_77")).toBeDefined();
  });

  it("по клику на строку 'ПОСЛЕДНИЕ МАТЧИ' открывает модальное окно со списком матчей", () => {
    const profileWithMatches = {
      ...defaultProfile,
      recentMatches: [
        {
          id: "m_1",
          mode: "MANIAC_VS_OPERATIVE",
          role: "DETECTIVE" as const,
          isWinner: true,
          durationSeconds: 150,
          timestamp: Date.now(),
          mmrDelta: 25,
        },
      ],
    };

    render(<ProfileScreen profile={profileWithMatches} onUpdateProfile={vi.fn()} />);

    // На экране отображаются карточки статистики
    expect(screen.getByText("РЕЙТИНГ")).toBeDefined();
    expect(screen.getByText("ВИНРЕЙТ")).toBeDefined();

    // Находим кнопку-строку 'ПОСЛЕДНИЕ МАТЧИ'
    const openHistoryBtn = screen.getByRole("button", { name: /ПОСЛЕДНИЕ МАТЧИ/i });
    fireEvent.click(openHistoryBtn);

    // В открывшейся модалке отображаются данные матча
    expect(screen.getByText(/Маньяк против Оперативника/i)).toBeDefined();
    expect(screen.getByText("+25")).toBeDefined();
  });

  it("на десктопе отображает кнопку 'Назад' и возвращается назад по клику или Escape", () => {
    const mockOnBack = vi.fn();
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={vi.fn()} onBack={mockOnBack} />);

    // Кнопка возврата с классом hidden md:inline-flex
    const backBtn = screen.getByRole("button", { name: /Назад/i });
    expect(backBtn).toBeDefined();
    expect(backBtn.className).toContain("hidden md:inline-flex");

    // Клик по кнопке вызывает onBack
    fireEvent.click(backBtn);
    expect(mockOnBack).toHaveBeenCalledTimes(1);

    // Нажатие Escape на клавиатуре вызывает onBack
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockOnBack).toHaveBeenCalledTimes(2);
  });
});
