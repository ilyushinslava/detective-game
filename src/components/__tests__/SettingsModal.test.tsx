// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MainMenu } from "../MainMenu";

const { mockToggleSfx, mockToggleAmbient, mockSetHapticsEnabled } = vi.hoisted(() => ({
  mockToggleSfx: vi.fn(() => false),
  mockToggleAmbient: vi.fn(() => true),
  mockSetHapticsEnabled: vi.fn(),
}));

vi.mock("../../utils/audio", () => ({
  soundManager: {
    getSfxEnabled: vi.fn(() => true),
    getAmbientEnabled: vi.fn(() => false),
    toggleSfx: mockToggleSfx,
    toggleAmbient: mockToggleAmbient,
    play: vi.fn(),
  },
}));

vi.mock("../../utils/haptics", () => ({
  triggerHaptic: vi.fn(),
  setHapticsEnabled: mockSetHapticsEnabled,
}));

vi.mock("../../utils/partyPeer", () => ({
  partyService: {
    fetchPublicRooms: vi.fn().mockResolvedValue([]),
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

vi.mock("../../i18n/context", () => ({
  useTranslation: () => ({
    t: {
      settings: {
        title: "SETTINGS",
        sfx: "SFX",
        sfxDesc: "Sound effects",
        ambient: "AMBIENT",
        ambientDesc: "Atmospheric soundtrack",
        haptics: "HAPTICS",
        hapticsDesc: "Vibration feedback",
        close: "CLOSE"
      },
      nav: { hq: "HQ", tables: "TABLES", profile: "PROFILE" },
      modes: {},
      menu: {
        title: "Title",
        subtitle: "Subtitle",
        desc: "Desc",
        resume: "Resume",
        quickPlay: "Quick Play",
        searching: "Searching",
        soloCases: "Solo",
        soloDesc: "Solo desc",
        localDuel: "Local",
        localDesc: "Local desc",
        onlineOps: "Online",
        onlineDesc: "Online desc",
        rulebook: "Rules",
        rulebookDesc: "Rules desc",
        tutorial: "Tutorial",
        tutorialDesc: "Tutorial desc"
      }
    },
    lang: "ru",
    setLang: vi.fn()
  })
}));

describe("SettingsModal (MainMenu)", () => {
  const mockProfile = {
    id: "1",
    nickname: "Agent",
    avatar: "A",
    level: 1,
    xp: 0,
    cash: 1000,
    chips: 0,
    rank: "Agent",
    stats: { wins: 0, losses: 0 }
  };

  const defaultProps = {
    profile: mockProfile,
    activeTab: "LOBBY" as const,
    onTabChange: vi.fn(),
    onStartGame: vi.fn(),
    hasActiveGame: false,
    onResumeGame: vi.fn(),
    onOpenRules: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("открывает окно настроек при клике по иконке настроек в шапке", () => {
    const { container } = render(<MainMenu {...defaultProps} />);
    const buttons = Array.from(container.querySelectorAll("button"));
    // Иконка настроек в шапке имеет класс w-10 h-10 rounded-full
    const settingsBtn = buttons.find(b => b.className.includes("w-10 h-10 rounded-full"));
    
    expect(settingsBtn).toBeDefined();
    fireEvent.click(settingsBtn!);
    
    expect(screen.getByText("SETTINGS")).toBeDefined();
  });

  it("переключает звуковые эффекты (SFX) и фоновый звук (Ambient)", () => {
    const { container } = render(<MainMenu {...defaultProps} />);
    const buttons = Array.from(container.querySelectorAll("button"));
    const settingsBtn = buttons.find(b => b.className.includes("w-10 h-10 rounded-full"));
    fireEvent.click(settingsBtn!);

    // Тумблеры настроек имеют классы w-12 h-6
    const toggles = Array.from(container.querySelectorAll("button")).filter(b => b.className.includes("w-12 h-6"));
    expect(toggles.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(toggles[0]); // SFX
    expect(mockToggleSfx).toHaveBeenCalled();

    fireEvent.click(toggles[1]); // Ambient
    expect(mockToggleAmbient).toHaveBeenCalled();
  });

  it("переключает тактильную отдачу (Haptics)", () => {
    const { container } = render(<MainMenu {...defaultProps} />);
    const buttons = Array.from(container.querySelectorAll("button"));
    const settingsBtn = buttons.find(b => b.className.includes("w-10 h-10 rounded-full"));
    fireEvent.click(settingsBtn!);

    const toggles = Array.from(container.querySelectorAll("button")).filter(b => b.className.includes("w-12 h-6"));
    expect(toggles.length).toBeGreaterThanOrEqual(3);

    fireEvent.click(toggles[2]); // Haptics
    expect(mockSetHapticsEnabled).toHaveBeenCalled();
  });

  it("закрывает окно настроек по кнопке закрытия", () => {
    const { container } = render(<MainMenu {...defaultProps} />);
    const buttons = Array.from(container.querySelectorAll("button"));
    const settingsBtn = buttons.find(b => b.className.includes("w-10 h-10 rounded-full"));
    fireEvent.click(settingsBtn!);
    
    expect(screen.getByText("SETTINGS")).toBeDefined();

    const closeBtn = screen.getByText("CLOSE");
    fireEvent.click(closeBtn);

    expect(screen.queryByText("SETTINGS")).toBeNull();
  });
});
