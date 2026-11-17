// src/lib/supabase.ts
// Клиент Supabase с поддержкой Graceful Degradation (Offline-First)

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

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
  const recordedMatchIds = new Set<string>();

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
        // Античит 1: Проверка длительности матча (> 10 секунд)
        if (params?.p_duration_seconds !== undefined && params.p_duration_seconds <= 10) {
          return {
            data: null,
            error: {
              message: "Античит: подозрительная длительность матча. Матч не может завершиться быстрее 11 секунд.",
              code: "P0001",
              status: 400,
            },
          };
        }

        // Античит 2: Проверка повторной записи того же матча
        if (params?.p_match_id) {
          if (recordedMatchIds.has(params.p_match_id)) {
            return {
              data: null,
              error: {
                message: `Античит: результат матча ${params.p_match_id} уже зафиксирован для данного игрока`,
                code: "23505",
                status: 409,
              },
            };
          }
          recordedMatchIds.add(params.p_match_id);
        }

        return {
          data: {
            ok: true,
            match_id: params?.p_match_id || "mock_match_uuid",
            new_mmr: 1025,
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
