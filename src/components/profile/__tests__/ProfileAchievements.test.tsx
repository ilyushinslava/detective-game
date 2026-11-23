// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ModeStatsSection } from "../ModeStatsSection";
import { AchievementsSection } from "../AchievementsSection";
import { AchievementToast } from "../../ui/AchievementToast";
import { ProfileScreen } from "../../ProfileScreen";
import { ru } from "../../../i18n/ru";
import { createDefaultDetailedStats } from "../../../utils/achievementEngine";
import type { UserProfile } from "../../../types/profile";
import type { Achievement } from "../../../data/achievements";

vi.mock("../../../i18n/context", () => ({
  useTranslation: () => ({
    t: { ...ru, menu: { ...(ru as any).menu, settings: "Settings" } },
    lang: "ru",
    setLang: vi.fn(),
  }),
  useLanguage: () => ({
    t: { ...ru, menu: { ...(ru as any).menu, settings: "Settings" } },
    lang: "ru",
    setLang: vi.fn(),
  }),
}));

vi.mock("../../../utils/audio", () => ({
  soundManager: {
    play: vi.fn(),
  },
}));

vi.mock("../../../utils/haptics", () => ({
  triggerHaptic: vi.fn(),
}));

describe("Profile Achievements and Progression UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const sampleProfile: UserProfile = {
    id: "agent_47",
    nickname: "Hitman",
    avatar: "c1",
    level: 2,
    xp: 150,
    cash: 2500,
    chips: 10,
    rank: "Сыщик",
    mmr: 1250,
    matchesPlayed: 12,
    winsDetective: 6,
    winsManiac: 3,
    stats: { wins: 9, losses: 3 },
    unlockedAchievements: ["maniac_first_blood", "operative_case_closed"],
    achievementProgress: {
      maniac_first_blood: 1,
      operative_case_closed: 1,
      streak_triple: 2,
    },
    detailedStats: {
      ...createDefaultDetailedStats(),
      modes: {
        MANIAC_VS_OPERATIVE: { matches: 8, wins: 6, losses: 2, currentStreak: 2, bestStreak: 4 },
        THIEF_HUNT: { matches: 3, wins: 2, losses: 1, currentStreak: 1, bestStreak: 2 },
        SECRET_SERVICE: { matches: 1, wins: 1, losses: 0, currentStreak: 1, bestStreak: 1 },
      },
      totalOnlineMatches: 5,
      totalOnlineWins: 4,
      totalTvMatches: 2,
      totalTvWins: 1,
      flawlessVictories: 2,
      fastestWinSeconds: 42,
      totalShifts: 38,
    },
  };

  it("ModeStatsSection рендерит все 3 режима игры и показатели мастерства", () => {
    render(<ModeStatsSection stats={sampleProfile.detailedStats} />);

    expect(screen.getByText("ПОЧЕРК УБИЙЦЫ")).toBeDefined();
    expect(screen.getByText("ОЦЕПЛЕНИЕ")).toBeDefined();
    expect(screen.getByText("ДИРЕКТИВА «НОЛЬ»")).toBeDefined();
    expect(screen.getByText("ОНЛАЙН СЕТЬ")).toBeDefined();
    expect(screen.getByText("ТВ ВЕЧЕРИНКА")).toBeDefined();
    expect(screen.getByText("ЧИСТАЯ РАБОТА")).toBeDefined();
    expect(screen.getByText("БЛИЦ-РЕКОРД")).toBeDefined();
    expect(screen.getByText(/42 сек/)).toBeDefined();
  });

  it("AchievementsSection отображает прогресс, фильтры и список ачивок", () => {
    render(
      <AchievementsSection
        unlockedAchievements={sampleProfile.unlockedAchievements}
        achievementProgress={sampleProfile.achievementProgress}
      />
    );

    expect(screen.getByText("ДОСТИЖЕНИЯ СИНДИКАТА")).toBeDefined();
    expect(screen.getByText(/Получено 2 из/i)).toBeDefined();
    expect(screen.getByText("+300 CR")).toBeDefined(); // 150 + 150

    // Проверяем фильтры
    const thiefTab = screen.getByRole("button", { name: "ОЦЕПЛЕНИЕ" });
    expect(thiefTab).toBeDefined();
    fireEvent.click(thiefTab);

    // Должна отображаться ачивка вора
    expect(screen.getByText("Ночной налёт")).toBeDefined();
  });

  it("ProfileScreen позволяет переключаться между вкладками 'Сводка', 'Режимы' и 'Награды'", () => {
    render(<ProfileScreen profile={sampleProfile} onUpdateProfile={vi.fn()} />);

    // По умолчанию на экране Сводка
    expect(screen.getByText("РЕЙТИНГ")).toBeDefined();
    expect(screen.getByText("ВИНРЕЙТ")).toBeDefined();

    // Переключаемся на Режимы
    const modesTabBtn = screen.getByRole("button", { name: /Режимы/i });
    fireEvent.click(modesTabBtn);
    expect(screen.getByText("ПОЧЕРК УБИЙЦЫ")).toBeDefined();
    expect(screen.getByText("ОНЛАЙН СЕТЬ")).toBeDefined();

    // Переключаемся на Награды (Достижения)
    const rewardsTabBtn = screen.getByRole("button", { name: /Награды/i });
    fireEvent.click(rewardsTabBtn);
    expect(screen.getByText("ДОСТИЖЕНИЯ СИНДИКАТА")).toBeDefined();

    // Возвращаемся на Сводку
    const overviewTabBtn = screen.getByRole("button", { name: /Сводка/i });
    fireEvent.click(overviewTabBtn);
    expect(screen.getByText("РЕЙТИНГ")).toBeDefined();
  });

  it("AchievementToast корректно рендерит всплывающее уведомление о награде", () => {
    const mockAchievement: Achievement = {
      id: "streak_triple",
      title: "Тройной капкан",
      description: "Одержите 3 победы подряд без единого поражения",
      category: "STREAK",
      iconName: "Flame",
      rewardCoins: 400,
      maxProgress: 3,
    };

    const handleClose = vi.fn();
    render(<AchievementToast achievement={mockAchievement} onClose={handleClose} />);

    expect(screen.getByText("ДОСТИЖЕНИЕ РАЗБЛОКИРОВАНО")).toBeDefined();
    expect(screen.getByText("Тройной капкан")).toBeDefined();
    expect(screen.getByText("+400")).toBeDefined();

    // Клик по кнопке закрытия
    const closeBtn = screen.getByRole("button", { name: "Закрыть уведомление" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
