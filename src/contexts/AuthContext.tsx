// src/contexts/AuthContext.tsx
// Провайдер аутентификации Supabase с поддержкой бесшовного анонимного входа

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAnonymous: boolean;
  isCloudConnected: boolean;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("[Auth] Ошибка получения сессии:", error.message);
        }

        if (data?.session) {
          if (isMounted) {
            setSession(data.session);
            setUser(data.session.user);
            setIsLoading(false);
          }
          return;
        }

        // Если сессии нет — выполняем бесшовный анонимный вход
        if (isSupabaseConfigured) {
          const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
          if (anonError) {
            console.warn("[Auth] Ошибка анонимной авторизации:", anonError.message);
          } else if (anonData?.session && isMounted) {
            setSession(anonData.session);
            setUser(anonData.session.user);
          }
        }
      } catch (err) {
        console.warn("[Auth] Ошибка инициализации аутентификации:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signInAnonymously = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      setSession(data.session);
      setUser(data.user);
    } catch (err) {
      console.error("[Auth] Ошибка входа:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const isAnonymous = Boolean(user?.is_anonymous);

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      isAnonymous,
      isCloudConnected: isSupabaseConfigured,
      signInAnonymously,
      signOut,
    }),
    [user, session, isLoading, isAnonymous]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth должен использоваться внутри AuthProvider");
  }
  return context;
}
