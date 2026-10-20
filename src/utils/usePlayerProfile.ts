import { useState, useEffect, useRef } from "react";
import type { UserProfile } from "../types/profile";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, get, set, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBROSVP1oRoUQfKF0HzABi-jQh7m4v0SRs",
  authDomain: "the-wicked-city.firebaseapp.com",
  databaseURL: "https://the-wicked-city-default-rtdb.firebaseio.com",
  projectId: "the-wicked-city",
  storageBucket: "the-wicked-city.firebasestorage.app",
  messagingSenderId: "786914165881",
  appId: "1:786914165881:web:80afb2a4971377f54080a8",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

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

  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        uidRef.current = user.uid;
        try {
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const remoteData = snapshot.val();
            setProfile((prev) => {
              const merged: UserProfile = {
                ...prev,
                ...remoteData,
                stats: {
                  wins: Math.max(prev.stats?.wins || 0, remoteData.stats?.wins || 0),
                  losses: Math.max(prev.stats?.losses || 0, remoteData.stats?.losses || 0),
                },
                cash: typeof remoteData.cash === "number" ? remoteData.cash : prev.cash,
                xp: Math.max(prev.xp, remoteData.xp ?? 0),
                level: Math.max(prev.level, remoteData.level ?? 1),
              };
              localStorage.setItem("crime_city_profile", JSON.stringify(merged));
              return merged;
            });
          } else {
            const saved = localStorage.getItem("crime_city_profile");
            if (saved) {
              set(userRef, JSON.parse(saved)).catch(() => {});
            }
          }
        } catch (e) {
          console.warn("Failed to sync profile from RTDB", e);
        }
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });

    return () => unsubscribe();
  }, []);

  const syncToCloud = (nextProfile: UserProfile) => {
    if (uidRef.current) {
      update(ref(db, `users/${uidRef.current}`), nextProfile).catch(() => {});
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem("crime_city_profile", JSON.stringify(next));
      syncToCloud(next);
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
        syncToCloud(next);
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
      syncToCloud(next);
      return next;
    });
  };

  const awardPrize = (pot: number) => {
    if (pot <= 0) return;
    setProfile((prev) => {
      const next = { ...prev, cash: prev.cash + pot };
      localStorage.setItem("crime_city_profile", JSON.stringify(next));
      syncToCloud(next);
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
      localStorage.setItem("crime_city_profile", JSON.stringify(next));
      syncToCloud(next);
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