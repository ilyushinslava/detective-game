// src/hooks/useProfile.ts
// Реактивный хук работы с профилем агента Supabase (с Offline-First кэшированием)

import { useState, useEffect, useCallback, useRef } from "react";
import type { UserProfile, MatchHistoryEntry } from "../types/profile";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { storage, safeLocalStorage } from "../utils/storage";
import { guestRegistry } from "../utils/guestManager";
import { sanitizePlayerName, validatePlayerName } from "../utils/nameFilter";
import { migrateProfileStats, evaluateAchievements, type MatchOutcomeContext } from "../utils/achievementEngine";
import {
  calculateMatchCashReward,
  calculateMmrDelta,
  clampMatchDuration,
  createMatchId,
  normalizeMode,
  resolveMatchOutcome,
} from "../utils/matchRewards";
import type { Achievement } from "../data/achievements";

const DEFAULT_AVATAR = "c1";
const DEFAULT_AVATAR_ID = "c1";

function getInitialCallsign(): string {
  if (typeof window !== "undefined") {
    const saved = safeLocalStorage.getItem("crime_city_callsign");
    if (saved && validatePlayerName(saved).isValid) {
      return saved;
    }
  }
  return guestRegistry.generateCallsign();
}

function generateLocalId(): string {
  return "id_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
}

const DEFAULT_LOCAL_PROFILE: UserProfile = migrateProfileStats({
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
});

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
      const validCallsign = sanitizePlayerName(
        saved.nickname || saved.agentName || "",
        guestRegistry.generateCallsign()
      );
      return migrateProfileStats({
        ...DEFAULT_LOCAL_PROFILE,
        ...saved,
        nickname: validCallsign,
        agentName: validCallsign,
        stats: saved.stats || DEFAULT_LOCAL_PROFILE.stats,
      });
    }
    return DEFAULT_LOCAL_PROFILE;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestUnlockedAchievement, setLatestUnlockedAchievement] = useState<Achievement | null>(null);

  const clearLatestUnlockedAchievement = useCallback(() => {
    setLatestUnlockedAchievement(null);
  }, []);

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
    const rawName = updates.agentName || updates.nickname;
    const sanitizedName = rawName ? sanitizePlayerName(rawName, guestRegistry.generateCallsign()) : undefined;
    const safeUpdates: Partial<UserProfile> = {
      ...updates,
      ...(sanitizedName ? { nickname: sanitizedName, agentName: sanitizedName } : {}),
    };

    setProfile((prev) => {
      const next = { ...prev, ...safeUpdates };
      storage.setSyncAndPersist("crime_city_profile", next);
      if (sanitizedName) {
        safeLocalStorage.setItem("crime_city_callsign", sanitizedName);
      }
      return next;
    });

    if (user?.id && isCloudConnected) {
      const dbUpdates: {
        agent_name?: string;
        avatar_id?: string;
        updated_at?: string;
      } = {};
      if (sanitizedName) {
        dbUpdates.agent_name = sanitizedName;
      }
      if (updates.avatarId || updates.avatar) {
        dbUpdates.avatar_id = updates.avatarId || updates.avatar;
      }

      if (Object.keys(dbUpdates).length > 0) {
        dbUpdates.updated_at = new Date().toISOString();
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

  // Запись результатов матча (локально + вызов RPC record_match_result).
  // Клиентские isWin/mmrDelta — только подсказки: доверенные значения MMR/cash
  // приходят из ответа RPC (онлайн) или рассчитываются по тем же серверным
  // правилам локально (оффлайн / mock-клиент).
  const processedMatchesRef = useRef<
    Map<
      string,
      {
        newMmr: number;
        mmrDelta: number;
        cashAwarded: number;
        isWinner: boolean;
        matchId: string;
        newlyUnlocked: Achievement[];
      }
    >
  >(new Map());

  const recordMatchResult = useCallback(async (
    isWin: boolean,
    matchDetails?: {
      mode?: string;
      winnerRole?: string;
      role?: string;
      durationSeconds?: number;
      mmrDelta?: number;
      isOnline?: boolean;
      isTvParty?: boolean;
      isFlawless?: boolean;
      shiftsCount?: number;
      matchId?: string;
    }
  ) => {
    const mode = normalizeMode(matchDetails?.mode);
    const role = matchDetails?.role || (profile.rank.includes("Маньяк") ? "KILLER" : "DETECTIVE");
    const winnerRole =
      matchDetails?.winnerRole ||
      (isWin ? role : role === "DETECTIVE" ? "KILLER" : "DETECTIVE");

    // match_id — обязательный ключ идемпотентности. Повторная фиксация
    // того же матча не должна начислять награду дважды.
    const matchId = matchDetails?.matchId || createMatchId();

    const cached = processedMatchesRef.current.get(matchId);
    if (cached) {
      return cached;
    }

    // Серверные правила: не доверяем клиентским isWin/mmrDelta
    let isWinner = resolveMatchOutcome({ mode, role, winnerRole, fallbackIsWinner: isWin });
    let mmrDelta = calculateMmrDelta(isWinner);
    let cashAwarded = calculateMatchCashReward(isWinner);

    // Реальная длительность матча (без искусственного Math.max(11, ...)),
    // приведённая к серверным рамкам режима.
    const durationSeconds = clampMatchDuration(mode, matchDetails?.durationSeconds);

    // Облачная запись через защищённую RPC функцию.
    // p_is_winner / p_mmr_delta передаются лишь как подсказка: сервер
    // пересчитывает результат, MMR и cash по своим правилам.
    if (user?.id && isCloudConnected) {
      try {
        const { data, error } = await (supabase.rpc as any)("record_match_result", {
          p_mode: mode,
          p_winner_role: winnerRole,
          p_duration_seconds: durationSeconds,
          p_role: role,
          p_is_winner: isWinner,
          p_mmr_delta: mmrDelta,
          p_match_id: matchId,
        });

        if (error) {
          console.warn("[useProfile] Ошибка записи матча в Supabase RPC:", error.message || error);
        } else if (data) {
          // Доверенные значения из ответа RPC имеют приоритет
          if (typeof data.is_winner === "boolean") isWinner = data.is_winner;
          if (typeof data.mmr_delta === "number") mmrDelta = data.mmr_delta;
          if (typeof data.cash_awarded === "number") cashAwarded = data.cash_awarded;
        }
      } catch (rpcErr) {
        console.warn("[useProfile] Ошибка записи матча в Supabase RPC:", rpcErr);
      }
    }

    const isDetWin = isWinner && role === "DETECTIVE";
    const isManWin = isWinner && role === "KILLER";
    let finalMmr = Math.max(100, profile.mmr + mmrDelta);
    let newlyUnlockedList: Achievement[] = [];

    setProfile((prev) => {
      const newWins = (prev.stats?.wins || 0) + (isWinner ? 1 : 0);
      const newLosses = (prev.stats?.losses || 0) + (isWinner ? 0 : 1);
      const newXp = prev.xp + (isWinner ? 50 : 15);
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
        id: matchId,
        matchId: matchId,
        mode: mode,
        winnerRole: winnerRole,
        role: role,
        isWinner: isWinner,
        mmrDelta: mmrDelta,
        durationSeconds: durationSeconds,
        createdAt: new Date().toISOString(),
      };
      const recentMatches = [newMatchEntry, ...(prev.recentMatches || [])].slice(0, 10);

      const nextBase: UserProfile = {
        ...prev,
        cash: Math.max(0, prev.cash + cashAwarded),
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

      const outcomeContext: MatchOutcomeContext = {
        mode: mode,
        role: role,
        isWin: isWinner,
        durationSeconds: durationSeconds,
        isOnline: matchDetails?.isOnline,
        isTvParty: matchDetails?.isTvParty,
        isFlawless: matchDetails?.isFlawless,
        shiftsCount: matchDetails?.shiftsCount,
      };

      const evalRes = evaluateAchievements(nextBase, outcomeContext);
      newlyUnlockedList = evalRes.newlyUnlocked;
      if (evalRes.newlyUnlocked.length > 0) {
        setLatestUnlockedAchievement(evalRes.newlyUnlocked[0]);
      }

      storage.setSyncAndPersist("crime_city_profile", evalRes.updatedProfile);
      return evalRes.updatedProfile;
    });

    const result = {
      newMmr: finalMmr,
      mmrDelta,
      cashAwarded,
      isWinner,
      matchId,
      newlyUnlocked: newlyUnlockedList,
    };

    processedMatchesRef.current.set(matchId, result);
    return result;
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
    latestUnlockedAchievement,
    clearLatestUnlockedAchievement,
    updateProfile,
    recordMatchResult,
    awardPrize,
    reserveBet,
    refundBet,
    refetch: () => user?.id && syncWithCloud(user.id),
  };
}
