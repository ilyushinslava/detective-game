// src/utils/__tests__/achievementEngine.test.ts
import { describe, it, expect } from "vitest";
import {
  createDefaultDetailedStats,
  migrateProfileStats,
  evaluateAchievements,
  type MatchOutcomeContext,
} from "../achievementEngine";
import type { UserProfile } from "../../types/profile";
import { ACHIEVEMENTS } from "../../data/achievements";

describe("achievementEngine", () => {
  const baseProfile: UserProfile = {
    id: "agent_007",
    nickname: "Bond",
    avatar: "c1",
    level: 1,
    xp: 0,
    cash: 1000,
    chips: 10,
    rank: "Стажёр",
    mmr: 1000,
    matchesPlayed: 0,
    winsDetective: 0,
    winsManiac: 0,
    stats: { wins: 0, losses: 0 },
  };

  it("createDefaultDetailedStats создает чистую структуру статистики для 3 режимов и ролей", () => {
    const stats = createDefaultDetailedStats();
    expect(stats.modes.MANIAC_VS_OPERATIVE).toBeDefined();
    expect(stats.modes.THIEF_HUNT).toBeDefined();
    expect(stats.modes.SECRET_SERVICE).toBeDefined();
    expect(stats.roles.KILLER).toBeDefined();
    expect(stats.roles.DETECTIVE).toBeDefined();
    expect(stats.roles.SPY).toBeDefined();
    expect(stats.totalOnlineMatches).toBe(0);
    expect(stats.fastestWinSeconds).toBeNull();
  });

  it("migrateProfileStats плавно мигрирует старый профиль без потери баланса и MMR", () => {
    const oldProfile: UserProfile = {
      ...baseProfile,
      cash: 5000,
      mmr: 1450,
      matchesPlayed: 10,
      winsDetective: 4,
      winsManiac: 3,
      stats: { wins: 7, losses: 3 },
    };

    const migrated = migrateProfileStats(oldProfile);
    expect(migrated.cash).toBe(5000);
    expect(migrated.mmr).toBe(1450);
    expect(migrated.unlockedAchievements).toEqual([]);
    expect(migrated.achievementProgress).toEqual({});
    expect(migrated.detailedStats).toBeDefined();
    expect(migrated.detailedStats?.modes.MANIAC_VS_OPERATIVE.wins).toBe(7);
    expect(migrated.detailedStats?.roles.KILLER.wins).toBe(3);
    expect(migrated.detailedStats?.roles.DETECTIVE.wins).toBe(4);
  });

  it("разблокирует 'Первая кровь' при первой победе за Маньяка и начисляет монеты", () => {
    const match: MatchOutcomeContext = {
      mode: "MANIAC_VS_OPERATIVE",
      role: "KILLER",
      isWin: true,
      durationSeconds: 120,
    };

    const { updatedProfile, newlyUnlocked } = evaluateAchievements(baseProfile, match);

    expect(newlyUnlocked.some((a) => a.id === "maniac_first_blood")).toBe(true);
    expect(updatedProfile.unlockedAchievements).toContain("maniac_first_blood");
    // Награда за первую кровь: 150 CR
    expect(updatedProfile.cash).toBe(1000 + 150);
    expect(updatedProfile.detailedStats?.modes.MANIAC_VS_OPERATIVE.wins).toBe(1);
    expect(updatedProfile.detailedStats?.modes.MANIAC_VS_OPERATIVE.currentStreak).toBe(1);
    expect(updatedProfile.detailedStats?.modes.MANIAC_VS_OPERATIVE.bestStreak).toBe(1);
  });

  it("гарантирует строгую защиту от повторной выдачи наград за уже открытые ачивки", () => {
    const match: MatchOutcomeContext = {
      mode: "MANIAC_VS_OPERATIVE",
      role: "KILLER",
      isWin: true,
      durationSeconds: 120,
    };

    // Первый матч — получаем ачивку
    const round1 = evaluateAchievements(baseProfile, match);
    expect(round1.newlyUnlocked.some((a) => a.id === "maniac_first_blood")).toBe(true);
    const balanceAfterRound1 = round1.updatedProfile.cash;

    // Второй победный матч за Маньяка
    const round2 = evaluateAchievements(round1.updatedProfile, match);
    // "maniac_first_blood" не должна выдаваться повторно
    expect(round2.newlyUnlocked.some((a) => a.id === "maniac_first_blood")).toBe(false);
    expect(round2.updatedProfile.unlockedAchievements?.filter((id) => id === "maniac_first_blood").length).toBe(1);
    // Баланс не увеличивается на 150 повторно
    expect(round2.updatedProfile.cash).toBe(balanceAfterRound1);
  });

  it("корректно отслеживает серию побед и разблокирует ачивку 'Тройной капкан'", () => {
    let currentProfile = baseProfile;
    const matchWin: MatchOutcomeContext = {
      mode: "THIEF_HUNT",
      role: "DETECTIVE",
      isWin: true,
      durationSeconds: 90,
    };

    // Победа 1
    currentProfile = evaluateAchievements(currentProfile, matchWin).updatedProfile;
    // Победа 2
    currentProfile = evaluateAchievements(currentProfile, matchWin).updatedProfile;
    // Победа 3
    const res3 = evaluateAchievements(currentProfile, matchWin);

    expect(res3.newlyUnlocked.some((a) => a.id === "streak_triple")).toBe(true);
    expect(res3.updatedProfile.unlockedAchievements).toContain("streak_triple");
    expect(res3.updatedProfile.detailedStats?.modes.THIEF_HUNT.currentStreak).toBe(3);
    expect(res3.updatedProfile.detailedStats?.modes.THIEF_HUNT.bestStreak).toBe(3);

    // При поражении серия сбрасывается
    const matchLoss: MatchOutcomeContext = {
      mode: "THIEF_HUNT",
      role: "DETECTIVE",
      isWin: false,
      durationSeconds: 100,
    };
    const resLoss = evaluateAchievements(res3.updatedProfile, matchLoss);
    expect(resLoss.updatedProfile.detailedStats?.modes.THIEF_HUNT.currentStreak).toBe(0);
    expect(resLoss.updatedProfile.detailedStats?.modes.THIEF_HUNT.bestStreak).toBe(3);
  });

  it("разблокирует 'Молниеносный удар' при победе быстрее 60 секунд", () => {
    const blitzMatch: MatchOutcomeContext = {
      mode: "MANIAC_VS_OPERATIVE",
      role: "DETECTIVE",
      isWin: true,
      durationSeconds: 45,
    };

    const { updatedProfile, newlyUnlocked } = evaluateAchievements(baseProfile, blitzMatch);
    expect(newlyUnlocked.some((a) => a.id === "mastery_blitz")).toBe(true);
    expect(updatedProfile.unlockedAchievements).toContain("mastery_blitz");
    expect(updatedProfile.detailedStats?.fastestWinSeconds).toBe(45);
  });

  it("разблокирует 'Чистая работа' при безупречной победе", () => {
    const flawlessMatch: MatchOutcomeContext = {
      mode: "SECRET_SERVICE",
      role: "DETECTIVE",
      isWin: true,
      durationSeconds: 110,
      isFlawless: true,
    };

    const { updatedProfile, newlyUnlocked } = evaluateAchievements(baseProfile, flawlessMatch);
    expect(newlyUnlocked.some((a) => a.id === "mastery_flawless")).toBe(true);
    expect(updatedProfile.unlockedAchievements).toContain("mastery_flawless");
    expect(updatedProfile.detailedStats?.flawlessVictories).toBe(1);
  });

  it("учитывает онлайн и ТВ матчи", () => {
    const onlineMatch: MatchOutcomeContext = {
      mode: "MANIAC_VS_OPERATIVE",
      role: "KILLER",
      isWin: true,
      durationSeconds: 120,
      isOnline: true,
    };
    const tvMatch: MatchOutcomeContext = {
      mode: "MANIAC_VS_OPERATIVE",
      role: "DETECTIVE",
      isWin: false,
      durationSeconds: 150,
      isTvParty: true,
    };

    let p = evaluateAchievements(baseProfile, onlineMatch).updatedProfile;
    expect(p.detailedStats?.totalOnlineMatches).toBe(1);
    expect(p.detailedStats?.totalOnlineWins).toBe(1);

    const resTv = evaluateAchievements(p, tvMatch);
    expect(resTv.updatedProfile.detailedStats?.totalTvMatches).toBe(1);
    expect(resTv.newlyUnlocked.some((a) => a.id === "special_tv_syndicate")).toBe(true);
  });

  it("реестр достижений содержит не менее 18 уникальных достижений", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(18);
    const idSet = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(idSet.size).toBe(ACHIEVEMENTS.length);
  });
});
