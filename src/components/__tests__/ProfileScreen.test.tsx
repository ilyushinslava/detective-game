// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ProfileScreen } from "../ProfileScreen";

const mockSetLang = vi.fn();
vi.mock("../../i18n/context", () => ({
  useTranslation: () => ({
    t: { nav: { profile: "PROFILE" }, menu: { settings: "Settings" } },
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

  it("вызывает переключение языка", () => {
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={vi.fn()} />);
    const enBtn = screen.getAllByRole("button", { name: /English/i })[0];
    fireEvent.click(enBtn);
    expect(mockSetLang).toHaveBeenCalledWith("en");
  });

  it("вызывает открытие настроек", () => {
    const mockOnOpenSettings = vi.fn();
    render(<ProfileScreen profile={defaultProfile} onUpdateProfile={vi.fn()} onOpenSettings={mockOnOpenSettings} />);
    const settingsBtn = screen.getAllByRole("button", { name: /Settings/i })[0];
    fireEvent.click(settingsBtn);
    expect(mockOnOpenSettings).toHaveBeenCalled();
  });
});
