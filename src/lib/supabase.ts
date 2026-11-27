// src/lib/supabase.ts
// Клиент Supabase с поддержкой Graceful Degradation (Offline-First)

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import {
  calculateMatchCashReward,
  calculateMmrDelta,
  clampMatchDuration,
  isKnownMode,
  resolveMatchOutcome,
} from "../utils/matchRewards";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  typeof supabaseUrl === "string" &&
  supabaseUrl.startsWith("http") &&
  !supabaseUrl.includes("your-project.supabase.co")
);

// Fallback Mock-клиент для оффлайн режима или тестового стенда без облачных ключей
function createMockSupabaseClient(): SupabaseClient<Database> {
  // Оффлайн-зеркало серверного состояния: хранит уже обработанные match_id,
  // чтобы повторный вызов RPC не начислял награду дважды.
  const recordedMatches = new Map<
    string,
    { is_winner: boolean; mmr_delta: number; cash_awarded: number; duration_seconds: number }
  >();
  const mockProfileState = { mmr: 1000, cash: 1500 };

  const mockAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: { id: "mock_user_1" } }, error: null }),
    signInAnonymously: async () => {
      const mockUserId = "local_anon_" + Math.random().toString(36).substring(2, 9);
      return {
        data: {
          user: { id: mockUserId, is_anonymous: true } as any,
          session: { user: { id: mockUserId } } as any,
        },
        error: null,
      };
    },
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  };

  const createQueryBuilder = (tableName: string) => {
    let updatePayload: any = null;

    const builder: any = {
      select: () => builder,
      insert: () => builder,
      update: (payload: any) => {
        updatePayload = payload;
        return builder;
      },
      delete: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => {
        const res = await builder;
        return res;
      },
      maybeSingle: async () => {
        const res = await builder;
        return res;
      },
      then: (resolve: any) => {
        // Симуляция RLS и триггера protect_profile_stats для таблицы profiles
        if (tableName === "profiles" && updatePayload) {
          const forbiddenFields = [
            "mmr",
            "cash",
            "xp",
            "level",
            "rank",
            "matches_played",
            "wins_detective",
            "wins_maniac",
            "id",
            "created_at",
          ];
          const attemptedKeys = Object.keys(updatePayload);
          const hasForbidden = attemptedKeys.some((k) => forbiddenFields.includes(k));

          if (hasForbidden) {
            return Promise.resolve({
              data: null,
              error: {
                message: 'new row violates row-level security policy for table "profiles" (permission denied)',
                code: "42501",
                status: 403,
              },
            }).then(resolve);
          }
        }

        return Promise.resolve({ data: updatePayload ? [updatePayload] : [], error: null }).then(resolve);
      },
    };
    return builder;
  };

  return {
    auth: mockAuth as any,
    from: (table: string) => createQueryBuilder(table),
    rpc: async (fnName: string, params: any) => {
      if (fnName === "record_match_result") {
        // Античит 0: match_id обязателен (ключ идемпотентности)
        if (!params?.p_match_id) {
          return {
            data: null,
            error: {
              message: "Античит: match_id обязателен для фиксации результата матча",
              code: "22023",
              status: 400,
            },
          };
        }

        const mode = params?.p_mode;
        const role = params?.p_role;
        const winnerRole = params?.p_winner_role;

        // Валидация режима и роли (как в серверной функции)
        if (!isKnownMode(mode)) {
          return {
            data: null,
            error: {
              message: `Античит: неизвестный режим матча (${mode})`,
              code: "22023",
              status: 400,
            },
          };
        }

        // Античит 1: Проверка длительности матча (> 10 секунд)
        if (
          params?.p_duration_seconds === undefined ||
          params?.p_duration_seconds === null ||
          params.p_duration_seconds <= 10
        ) {
          return {
            data: null,
            error: {
              message: "Античит: подозрительная длительность матча. Матч не может завершиться быстрее 11 секунд.",
              code: "P0001",
              status: 400,
            },
          };
        }

        // Античит 2: идемпотентность — повторный match_id не начисляет награду
        const existing = recordedMatches.get(params.p_match_id);
        if (existing) {
          return {
            data: {
              ok: true,
              idempotent: true,
              match_id: params.p_match_id,
              is_winner: existing.is_winner,
              mmr_delta: 0,
              cash_awarded: 0,
              new_mmr: mockProfileState.mmr,
              new_cash: mockProfileState.cash,
              duration_seconds: existing.duration_seconds,
            },
            error: null,
          };
        }

        const durationSeconds = clampMatchDuration(mode, params.p_duration_seconds);
        // Клиентские p_is_winner / p_mmr_delta — только подсказки, сервер пересчитывает
        const isWinner = resolveMatchOutcome({
          mode,
          role,
          winnerRole,
          fallbackIsWinner: params?.p_is_winner,
        });
        const mmrDelta = calculateMmrDelta(isWinner);
        const cashAwarded = calculateMatchCashReward(isWinner);

        mockProfileState.mmr = Math.max(100, mockProfileState.mmr + mmrDelta);
        mockProfileState.cash = Math.max(0, mockProfileState.cash + cashAwarded);

        recordedMatches.set(params.p_match_id, {
          is_winner: isWinner,
          mmr_delta: mmrDelta,
          cash_awarded: cashAwarded,
          duration_seconds: durationSeconds,
        });

        return {
          data: {
            ok: true,
            idempotent: false,
            match_id: params.p_match_id,
            is_winner: isWinner,
            mmr_delta: mmrDelta,
            cash_awarded: cashAwarded,
            new_mmr: mockProfileState.mmr,
            new_cash: mockProfileState.cash,
            duration_seconds: durationSeconds,
          },
          error: null,
        };
      }

      return { data: null, error: null };
    },
  } as unknown as SupabaseClient<Database>;
}

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createMockSupabaseClient();
