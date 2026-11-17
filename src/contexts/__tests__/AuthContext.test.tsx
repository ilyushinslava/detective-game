// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import {
  AuthProvider,
  useAuth,
  loginToEmail,
  validateLogin,
  validatePassword,
} from "../AuthContext";

describe("AuthContext - Классическая система Логин/Пароль (без сбора Email)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe("Утилиты валидации и преобразования в виртуальный Email", () => {
    it("loginToEmail: преобразует логин в виртуальный email @noir.local в нижнем регистре", () => {
      expect(loginToEmail("Agent_77")).toBe("agent_77@noir.local");
      expect(loginToEmail("  Sherlock  ")).toBe("sherlock@noir.local");
      expect(loginToEmail("CYBER_COP")).toBe("cyber_cop@noir.local");
    });

    it("validateLogin: запрещает кириллицу, пробелы и спецсимволы", () => {
      expect(validateLogin("Агент007")).toContain("кириллицу");
      expect(validateLogin("agent 77")).toContain("пробелы");
      expect(validateLogin("agent@77")).toContain("только латинские буквы");
      expect(validateLogin("ag")).toContain("от 3 до 20");
      expect(validateLogin("a".repeat(21))).toContain("от 3 до 20");
      expect(validateLogin("")).toContain("Введите логин");
    });

    it("validateLogin: разрешает валидные логины", () => {
      expect(validateLogin("agent_007")).toBeNull();
      expect(validateLogin("noirDetective")).toBeNull();
      expect(validateLogin("x123")).toBeNull();
    });

    it("validatePassword: требует не менее 6 символов", () => {
      expect(validatePassword("")).toContain("Введите пароль");
      expect(validatePassword("12345")).toContain("не менее 6 символов");
      expect(validatePassword("secret123")).toBeNull();
    });
  });

  describe("Хук useAuth и операции linkAccount / signIn", () => {
    it("linkAccount: валидирует данные и привязывает аккаунт без сбора реальной почты", async () => {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Попытка с невалидным логином
      let linkRes: any;
      await act(async () => {
        linkRes = await result.current.linkAccount("Шпион", "password123");
      });
      expect(linkRes.success).toBe(false);
      expect(linkRes.error).toBeDefined();

      // Успешная привязка
      await act(async () => {
        linkRes = await result.current.linkAccount("phantom_99", "secretPass");
      });
      expect(linkRes.success).toBe(true);
      expect(result.current.user?.email).toBe("phantom_99@noir.local");
      expect(result.current.isAnonymous).toBe(false);
    });

    it("signIn: валидирует данные и осуществляет вход", async () => {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      let signInRes: any;
      await act(async () => {
        signInRes = await result.current.signIn("phantom_99", "secretPass");
      });

      expect(signInRes.success).toBe(true);
      expect(result.current.user?.email).toBe("phantom_99@noir.local");
      expect(result.current.isAnonymous).toBe(false);
    });
  });
});
