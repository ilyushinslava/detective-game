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
  const mockAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
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

  const createQueryBuilder = () => {
    const builder: any = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return builder;
  };

  return {
    auth: mockAuth as any,
    from: () => createQueryBuilder(),
    rpc: async () => ({ data: null, error: null }),
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
