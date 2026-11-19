// src/contexts/AuthContext.tsx
// Провайдер аутентификации Supabase с поддержкой анонимного входа,
// привязки аккаунта по Логину/Паролю и входа без сбора Email-адресов.

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { safeLocalStorage } from "../utils/storage";

export const LOGIN_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Преобразование пользовательского логина в виртуальный email noir.local.
 * Позволяет использовать Supabase Auth без сбора персональных данных (email).
 */
export function loginToEmail(login: string): string {
  return `${login.trim().toLowerCase()}@noir.local`;
}

/**
 * Валидация логина (латиница, цифры, знак подчеркивания, 3-20 символов).
 */
export function validateLogin(login: string): string | null {
  const trimmed = login.trim();
  if (!trimmed) {
    return "Введите логин";
  }
  if (/[а-яА-ЯёЁ]/.test(trimmed)) {
    return "Логин не должен содержать кириллицу (только латиница и цифры)";
  }
  if (/\s/.test(trimmed)) {
    return "Логин не должен содержать пробелы";
  }
  if (!LOGIN_REGEX.test(trimmed)) {
    return "Логин может содержать только латинские буквы, цифры и знак подчеркивания (от 3 до 20 символов)";
  }
  return null;
}

/**
 * Валидация пароля (не менее 6 символов).
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return "Введите пароль";
  }
  if (password.length < 6) {
    return "Пароль должен содержать не менее 6 символов";
  }
  return null;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAnonymous: boolean;
  isCloudConnected: boolean;
  signInAnonymously: () => Promise<void>;
  linkAccount: (login: string, password: string) => Promise<AuthResult>;
  signIn: (login: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(() =>
    safeLocalStorage.getJSON<User | null>("crime_city_auth_user", null)
  );
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
            safeLocalStorage.setJSON("crime_city_auth_user", data.session.user);
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
            safeLocalStorage.setJSON("crime_city_auth_user", anonData.session.user);
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
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          safeLocalStorage.setJSON("crime_city_auth_user", currentUser);
        }
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
      if (data.user) {
        safeLocalStorage.setJSON("crime_city_auth_user", data.user);
      }
    } catch (err) {
      console.error("[Auth] Ошибка анонимного входа:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Привязка логина и пароля к текущему анонимному аккаунту.
   * Сохраняет профиль и прогресс без сбора почты.
   */
  const linkAccount = async (login: string, password: string): Promise<AuthResult> => {
    const loginErr = validateLogin(login);
    if (loginErr) return { success: false, error: loginErr };

    const passErr = validatePassword(password);
    if (passErr) return { success: false, error: passErr };

    const email = loginToEmail(login);

    if (!isSupabaseConfigured) {
      // Офлайн / Mock режим
      const updatedUser: any = {
        id: user?.id || `local_${Date.now()}`,
        is_anonymous: false,
        email,
        user_metadata: { login: login.trim() },
      };
      setUser(updatedUser);
      safeLocalStorage.setJSON("crime_city_auth_user", updatedUser);
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        email,
        password,
        data: { login: login.trim() },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.user) {
        // Успешная привязка — пользователь перестает быть анонимным
        const updatedUser = {
          ...data.user,
          is_anonymous: false,
        };
        setUser(updatedUser as any);
        safeLocalStorage.setJSON("crime_city_auth_user", updatedUser);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Ошибка привязки аккаунта" };
    }
  };

  /**
   * Вход по логину и паролю на новом устройстве или после переустановки.
   */
  const signIn = async (login: string, password: string): Promise<AuthResult> => {
    const loginErr = validateLogin(login);
    if (loginErr) return { success: false, error: loginErr };

    const passErr = validatePassword(password);
    if (passErr) return { success: false, error: passErr };

    const email = loginToEmail(login);

    if (!isSupabaseConfigured) {
      // Офлайн / Mock режим
      const localUser: any = {
        id: `user_${login.trim().toLowerCase()}`,
        is_anonymous: false,
        email,
        user_metadata: { login: login.trim() },
      };
      setUser(localUser);
      safeLocalStorage.setJSON("crime_city_auth_user", localUser);
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const errorMsg =
          error.message === "Invalid login credentials"
            ? "Неверный логин или пароль"
            : error.message;
        return { success: false, error: errorMsg };
      }

      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
        safeLocalStorage.setJSON("crime_city_auth_user", data.session.user);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Ошибка входа в аккаунт" };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      safeLocalStorage.removeItem("crime_city_auth_user");
    } finally {
      setIsLoading(false);
    }
  };

  const isAnonymous = user ? Boolean(user.is_anonymous) : true;

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      isAnonymous,
      isCloudConnected: isSupabaseConfigured,
      signInAnonymously,
      linkAccount,
      signIn,
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

/**
 * Безопасная версия useAuth, возвращающая дефолтный офлайн-стейт при отсутствии AuthProvider
 * (позволяет компонентам рендериться в изолированных тестах).
 */
export function useAuthSafe(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      session: null,
      isLoading: false,
      isAnonymous: true,
      isCloudConnected: false,
      signInAnonymously: async () => {},
      linkAccount: async () => ({ success: true }),
      signIn: async () => ({ success: true }),
      signOut: async () => {},
    };
  }
  return context;
}
