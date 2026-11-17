// src/hooks/useProfile.ts
// Реактивный хук работы с профилем агента Supabase (с Offline-First кэшированием)

import { useState, useEffect, useCallback } from "react";
import type { UserProfile, MatchHistoryEntry } from "../types/profile";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { storage } from "../utils/storage";

const DEFAULT_AVATAR = "🕵️‍♂️";
const DEFAULT_AVATAR_ID = "agent_01";

function getInitialCallsign(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("crime_city_callsign");
    if (saved) return saved;
  }
  return "Агент #" + Math.floor(100 + Math.random() * 900);
}

function generateLocalId(): string {
  return "id_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
}

const DEFAULT_LOCAL_PROFILE: UserProfile = {
  id: generateLocalId(),
  nickname: getInitialCallsign(),
  agentName: getInitialCallsign(),
  avatar: DEFAULT_AVATAR,
  avatarId: DEFAULT_AVATAR_ID,
  level: 1,
  xp: 0,
  cash: 1500,
  chips: 10,
  rank: "Стажёр",
  mmr: 1000,
  matchesPlayed: 0,
  winsDetective: 0,
  winsManiac: 0,
  stats: {
    wins: 0,
    losses: 0,
  },
  recentMatches: [],
};

export function useProfile() {
  let authContext: any = null;
  try {
    authContext = useAuth();
  } catch (_) {
    // Безопасный fallback при рендере вне AuthProvider (например, в изолированных тестах)
  }
  const user = authContext?.user ?? null;
  const isCloudConnected = authContext?.isCloudConnected ?? isSupabaseConfigured;
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = storage.getSyncItem<Partial<UserProfile> | null>("crime_city_profile", null);
    if (saved) {
      return {
        ...DEFAULT_LOCAL_PROFILE,
        ...saved,
        stats: saved.stats || DEFAULT_LOCAL_PROFILE.stats,
      };
    }
    return DEFAULT_LOCAL_PROFILE;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Синхронизация с Supabase при наличии авторизованного пользователя
  const syncWithCloud = useCallback(async (userId: string) => {
    if (!isCloudConnected) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Запрашиваем профиль из таблицы profiles
      const { data: dbProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) {
        console.warn("[useProfile] Ошибка загрузки профиля:", fetchError.message);
      }

      if (dbProfile) {
        // Профиль найден в БД — обновляем локальное состояние
        const cloudProfile: UserProfile = {
          id: dbProfile.id,
          nickname: dbProfile.agent_name,
          agentName: dbProfile.agent_name,
          avatar: dbProfile.avatar_id === DEFAULT_AVATAR_ID ? DEFAULT_AVATAR : dbProfile.avatar_id,
          avatarId: dbProfile.avatar_id,
          level: dbProfile.level,
          xp: dbProfile.xp,
          cash: dbProfile.cash,
          chips: 10,
          rank: dbProfile.rank,
          mmr: dbProfile.mmr,
          matchesPlayed: dbProfile.matches_played,
          winsDetective: dbProfile.wins_detective,
          winsManiac: dbProfile.wins_maniac,
          stats: {
            wins: dbProfile.wins_detective + dbProfile.wins_maniac,
            losses: Math.max(0, dbProfile.matches_played - (dbProfile.wins_detective + dbProfile.wins_maniac)),
          },
        };

        setProfile((prev) => {
          const merged = { ...prev, ...cloudProfile };
          storage.setSyncAndPersist("crime_city_profile", merged);
          return merged;
        });
      } else {
        // Профиль еще не создан — создаем начальный профиль в Supabase
        const initialName = profile.agentName || profile.nickname || getInitialCallsign();
        const initialAvatarId = profile.avatarId || DEFAULT_AVATAR_ID;

        const { error: insertError } = await supabase.from("profiles").insert({
          id: userId,
          agent_name: initialName,
          avatar_id: initialAvatarId,
          mmr: 1000,
          cash: profile.cash || 1500,
          xp: profile.xp || 0,
          level: profile.level || 1,
          rank: profile.rank || "Стажёр",
        });

        if (insertError) {
          console.warn("[useProfile] Ошибка создания профиля в Supabase:", insertError.message);
        }
      }

      // 2. Запрашиваем историю последних 10 матчей
      const { data: participants, error: matchesError } = await supabase
        .from("match_participants")
        .select(`
          id,
          match_id,
          role,
          is_winner,
          mmr_delta,
          created_at,
          matches:match_id (
            id,
            mode,
            winner_role,
            duration_seconds
          )
        `)
        .eq("profile_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!matchesError && participants) {
        const history: MatchHistoryEntry[] = participants.map((p: any) => ({
          id: p.id,
          matchId: p.match_id,
          mode: p.matches?.mode || "MANIAC_VS_OPERATIVE",
          winnerRole: p.matches?.winner_role || "DETECTIVE",
          role: p.role,
          isWinner: p.is_winner,
          mmrDelta: p.mmr_delta,
          durationSeconds: p.matches?.duration_seconds || 0,
          createdAt: p.created_at,
        }));

        setProfile((prev) => ({
          ...prev,
          recentMatches: history,
        }));
      }
    } catch (err: any) {
      console.warn("[useProfile] Не удалось синхронизировать профиль с облаком:", err);
      setError(err?.message || "Sync error");
    } finally {
      setIsLoading(false);
    }
  }, [isCloudConnected, profile.agentName, profile.nickname, profile.avatarId, profile.cash, profile.xp, profile.level, profile.rank]);

  useEffect(() => {
    if (user?.id) {
      syncWithCloud(user.id);
    }
  }, [user?.id, syncWithCloud]);

  // Обновление позывного или аватара
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      storage.setSyncAndPersist("crime_city_profile", next);
      if (updates.nickname || updates.agentName) {
        localStorage.setItem("crime_city_callsign", (updates.agentName || updates.nickname) as string);
      }
      return next;
    });

    if (user?.id && isCloudConnected) {
      const dbUpdates: Record<string, any> = {};
      if (updates.agentName || updates.nickname) {
        dbUpdates.agent_name = updates.agentName || updates.nickname;
      }
      if (updates.avatarId || updates.avatar) {
        dbUpdates.avatar_id = updates.avatarId || updates.avatar;
      }

      if (Object.keys(dbUpdates).length > 0) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update(dbUpdates)
          .eq("id", user.id);

        if (updateError) {
          console.warn("[useProfile] Ошибка сохранения профиля в облаке:", updateError.message);
        }
      }
    }
  }, [user?.id, isCloudConnected]);

  // Запись результатов матча (локально + вызов RPC record_match_result)
  const recordMatchResult = useCallback(async (
    isWin: boolean,
    matchDetails?: {
      mode?: string;
      winnerRole?: string;
      role?: string;
      durationSeconds?: number;
      mmrDelta?: number;
    }
  ) => {
    const role = matchDetails?.role || (profile.rank.includes("Маньяк") ? "KILLER" : "DETECTIVE");
    const isDetWin = isWin && role === "DETECTIVE";
    const isManWin = isWin && role === "KILLER";
    const mmrDelta = matchDetails?.mmrDelta ?? (isWin ? 25 : -20);
    let finalMmr = profile.mmr + mmrDelta;

    setProfile((prev) => {
      const newWins = (prev.stats?.wins || 0) + (isWin ? 1 : 0);
      const newLosses = (prev.stats?.losses || 0) + (isWin ? 0 : 1);
      const newXp = prev.xp + (isWin ? 50 : 15);
      const newLevel = Math.floor(newXp / 100) + 1;
      const newMmr = Math.max(100, prev.mmr + mmrDelta);
      finalMmr = newMmr;

      let newRank = prev.rank;
      if (newMmr >= 2000) newRank = "Магистр";
      else if (newMmr >= 1600) newRank = "Шериф";
      else if (newMmr >= 1300) newRank = "Инспектор";
      else if (newMmr >= 1100) newRank = "Сыщик";
      else newRank = "Стажёр";

      const newMatchEntry: MatchHistoryEntry = {
        id: `match_${Date.now()}`,
        mode: matchDetails?.mode || "MANIAC_VS_OPERATIVE",
        role: role as any,
        isWinner: isWin,
        mmrDelta: mmrDelta,
        durationSeconds: matchDetails?.durationSeconds || 120,
        createdAt: new Date().toISOString(),
      };
      const recentMatches = [newMatchEntry, ...(prev.recentMatches || [])].slice(0, 10);

      const next: UserProfile = {
        ...prev,
        xp: newXp,
        level: newLevel,
        rank: newRank,
        mmr: newMmr,
        matchesPlayed: prev.matchesPlayed + 1,
        winsDetective: prev.winsDetective + (isDetWin ? 1 : 0),
        winsManiac: prev.winsManiac + (isManWin ? 1 : 0),
        stats: { wins: newWins, losses: newLosses },
        recentMatches,
      };
      storage.setSyncAndPersist("crime_city_profile", next);
      return next;
    });

    // Облачная запись через защищенную RPC функцию
    if (user?.id && isCloudConnected) {
      try {
        await (supabase.rpc as any)("record_match_result", {
          p_mode: matchDetails?.mode || "MANIAC_VS_OPERATIVE",
          p_winner_role: matchDetails?.winnerRole || (isWin ? role : "OPPONENT"),
          p_duration_seconds: Math.max(11, matchDetails?.durationSeconds || 120),
          p_role: role,
          p_is_winner: isWin,
          p_mmr_delta: mmrDelta,
          p_match_id: (matchDetails as any)?.matchId || null,
        });
      } catch (rpcErr) {
        console.warn("[useProfile] Ошибка записи матча в Supabase RPC:", rpcErr);
      }
    }

    return { newMmr: finalMmr, mmrDelta };
  }, [user?.id, isCloudConnected, profile.rank, profile.mmr]);

  const awardPrize = useCallback((pot: number) => {
    if (pot <= 0) return;
    setProfile((prev) => {
      const next = { ...prev, cash: prev.cash + pot };
      storage.setSyncAndPersist("crime_city_profile", next);
      return next;
    });
  }, []);

  const reserveBet = useCallback((amount: number): boolean => {
    if (amount <= 0) return true;
    if (profile.cash < amount) return false;
    const next = { ...profile, cash: profile.cash - amount };
    setProfile(next);
    storage.setSyncAndPersist("crime_city_profile", next);
    return true;
  }, [profile.cash]);

  const refundBet = useCallback((amount: number) => {
    if (amount <= 0) return;
    setProfile((prev) => {
      const next = { ...prev, cash: prev.cash + amount };
      storage.setSyncAndPersist("crime_city_profile", next);
      return next;
    });
  }, []);

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    recordMatchResult,
    awardPrize,
    reserveBet,
    refundBet,
    refetch: () => user?.id && syncWithCloud(user.id),
  };
}
