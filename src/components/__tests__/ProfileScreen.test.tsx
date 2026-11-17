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

  it("отображает блок 'СОХРАНЕНИЕ ПРОГРЕССА' со строгим предупреждением для анонимного профиля", () => {
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={vi.fn()} />);

    expect(screen.getByText("СОХРАНЕНИЕ ПРОГРЕССА")).toBeDefined();
    expect(
      screen.getByText(/мы не собираем вашу почту\. Если вы забудете пароль, восстановить аккаунт будет невозможно/i)
    ).toBeDefined();
    expect(screen.getByPlaceholderText("agent_77")).toBeDefined();
    expect(screen.getByRole("button", { name: /Защитить аккаунт/i })).toBeDefined();
  });

  it("при успешной привязке логина и пароля отображает зеленый бейдж 'АККАУНТ ЗАЩИЩЕН'", async () => {
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={vi.fn()} />);

    const loginInput = screen.getByPlaceholderText("agent_77");
    const passInput = screen.getByPlaceholderText("••••••••");
    const protectBtn = screen.getByRole("button", { name: /Защитить аккаунт/i });

    fireEvent.change(loginInput, { target: { value: "detective_99" } });
    fireEvent.change(passInput, { target: { value: "securePass123" } });
    fireEvent.click(protectBtn);

    expect(await screen.findByText("АККАУНТ ЗАЩИЩЕН")).toBeDefined();
    expect(screen.queryByText("СОХРАНЕНИЕ ПРОГРЕССА")).toBeNull();
  });
});
