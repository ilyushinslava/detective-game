import { useState, useEffect } from "react";
import type { UserProfile } from "../types/profile";

const getInitialCallsign = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("crime_city_callsign");
    if (saved) return saved;
  }
  return "Агент " + Math.floor(100 + Math.random() * 900);
};

const generateId = () =>
  "id_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

const DEFAULT_PROFILE: UserProfile = {
  id: generateId(),
  nickname: getInitialCallsign(),
  avatar: "🕵️‍♂️",
  level: 1,
  xp: 0,
  cash: 1500,
  chips: 10,
  rank: "Стажёр",
  stats: {
    wins: 0,
    losses: 0,
  },
};

export function usePlayerProfile() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("crime_city_profile");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...DEFAULT_PROFILE,
            ...parsed,
            stats: parsed.stats || DEFAULT_PROFILE.stats,
            id: parsed.id || generateId(),
          };
        } catch (e) {
          console.error("Failed to parse profile", e);
        }
      }
      localStorage.setItem(
        "crime_city_profile",
        JSON.stringify(DEFAULT_PROFILE),
      );
    }
    return DEFAULT_PROFILE;
  });

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem("crime_city_profile", JSON.stringify(next));
      return next;
    });
  };

  const reserveBet = (amount: number): boolean => {
    if (amount <= 0) return true;
    let success = false;
    setProfile((prev) => {
      if (prev.cash >= amount) {
        success = true;
        const next = { ...prev, cash: prev.cash - amount };
        localStorage.setItem("crime_city_profile", JSON.stringify(next));
        return next;
      }
      return prev;
    });
    return success;
  };

  const refundBet = (amount: number) => {
    if (amount <= 0) return;
    setProfile((prev) => {
      const next = { ...prev, cash: prev.cash + amount };
      localStorage.setItem("crime_city_profile", JSON.stringify(next));
      return next;
    });
  };

  const awardPrize = (pot: number) => {
    if (pot <= 0) return;
    setProfile((prev) => {
      const next = { ...prev, cash: prev.cash + pot };
      localStorage.setItem("crime_city_profile", JSON.stringify(next));
      return next;
    });
  };

  const recordMatchResult = (isWin: boolean) => {
    setProfile((prev) => {
      const newWins = prev.stats.wins + (isWin ? 1 : 0);
      const newLosses = prev.stats.losses + (isWin ? 0 : 1);
      const newXp = prev.xp + (isWin ? 50 : 10);
      const newLevel = Math.floor(newXp / 100) + 1;

      let newRank = prev.rank;
      if (newLevel >= 10) newRank = "Сыщик";
      if (newLevel >= 25) newRank = "Инспектор";
      if (newLevel >= 50) newRank = "Шериф";
      if (newLevel >= 100) newRank = "Магистр";

      const next = {
        ...prev,
        xp: newXp,
        level: newLevel,
        rank: newRank,
        stats: { wins: newWins, losses: newLosses },
      };
      localStorage.setItem("crime_city_profile", JSON.stringify(next));
      return next;
    });
  };

  return {
    profile,
    updateProfile,
    reserveBet,
    refundBet,
    awardPrize,
    recordMatchResult,
  };
}
