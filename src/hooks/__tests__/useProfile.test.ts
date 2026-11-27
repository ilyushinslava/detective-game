// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProfile } from "../useProfile";
import { safeLocalStorage, safeSessionStorage } from "../../utils/storage";

describe("useProfile Hook (Supabase & Offline-First)", () => {
  beforeEach(() => {
    safeLocalStorage.clear();
    safeSessionStorage.clear();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("возвращает дефолтный профиль агента при первичном запуске", () => {
    const { result } = renderHook(() => useProfile());

    expect(result.current.profile).toBeDefined();
    expect(result.current.profile.mmr).toBe(1000);
    expect(result.current.profile.rank).toBe("Стажёр");
    expect(result.current.profile.cash).toBe(1500);
    expect(result.current.profile.matchesPlayed).toBe(0);
    expect(result.current.profile.nickname).toContain("Агент #");
  });

  it("позволяет обновлять позывной агента локально и сохранять в storage", async () => {
    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await result.current.updateProfile({ nickname: "Блэквуд", agentName: "Блэквуд" });
    });

    expect(result.current.profile.nickname).toBe("Блэквуд");
    expect(result.current.profile.agentName).toBe("Блэквуд");
    expect(localStorage.getItem("crime_city_callsign")).toBe("Блэквуд");
  });

  it("корректно фиксирует победу в матче, начисляет MMR (+25) и опыт", async () => {
    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await result.current.recordMatchResult(true, {
        mode: "MANIAC_VS_OPERATIVE",
        role: "DETECTIVE",
        winnerRole: "DETECTIVE",
        durationSeconds: 90,
      });
    });

    expect(result.current.profile.matchesPlayed).toBe(1);
    expect(result.current.profile.stats.wins).toBe(1);
    expect(result.current.profile.winsDetective).toBe(1);
    expect(result.current.profile.mmr).toBe(1025);
    expect(result.current.profile.xp).toBe(50);
    expect(result.current.profile.unlockedAchievements).toContain("operative_case_closed");
    // 1500 стартовых + 100 серверная награда за победу + 150 за достижение
    expect(result.current.profile.cash).toBe(1750);
  });

  it("корректно списывает и возвращает ставку", () => {
    const { result } = renderHook(() => useProfile());

    let reserved = false;
    act(() => {
      reserved = result.current.reserveBet(500);
    });

    expect(reserved).toBe(true);
    expect(result.current.profile.cash).toBe(1000);

    act(() => {
      result.current.refundBet(500);
    });

    expect(result.current.profile.cash).toBe(1500);
  });
});
