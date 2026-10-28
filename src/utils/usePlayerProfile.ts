import { useState } from "react";
import type { UserProfile } from "../types/profile";
import { storage } from "./storage";

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
    const saved = storage.getSyncItem<Partial<UserProfile> | null>("crime_city_profile", null);
    if (saved) {
      return {
        ...DEFAULT_PROFILE,
        ...saved,
        stats: saved.stats || DEFAULT_PROFILE.stats,
        id: saved.id || generateId(),
      };
    }
    storage.setSyncAndPersist("crime_city_profile", DEFAULT_PROFILE);
    return DEFAULT_PROFILE;
  });

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      storage.setSyncAndPersist("crime_city_profile", next);
      return next;
    });
  };

  const reserveBet = (amount: number): boolean => {
    if (amount <= 0) return true;
    if (profile.cash < amount) return false;

    const next = { ...profile, cash: profile.cash - amount };
    setProfile(next);
    storage.setSyncAndPersist("crime_city_profile", next);
    return true;
  };

  const refundBet = (amount: number) => {
    if (amount <= 0) return;
    setProfile((prev) => {
      const next = { ...prev, cash: prev.cash + amount };
      if (typeof window !== "undefined") {
        localStorage.setItem("crime_city_profile", JSON.stringify(next));
      }
      return next;
    });
  };

  const awardPrize = (pot: number) => {
    if (pot <= 0) return;
    setProfile((prev) => {
      const next = { ...prev, cash: prev.cash + pot };
      if (typeof window !== "undefined") {
        localStorage.setItem("crime_city_profile", JSON.stringify(next));
      }
      return next;
    });
  };

  const recordMatchResult = (isWin: boolean) => {
    setProfile((prev) => {
      const newWins = (prev.stats?.wins || 0) + (isWin ? 1 : 0);
      const newLosses = (prev.stats?.losses || 0) + (isWin ? 0 : 1);
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
      if (typeof window !== "undefined") {
        localStorage.setItem("crime_city_profile", JSON.stringify(next));
      }
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
