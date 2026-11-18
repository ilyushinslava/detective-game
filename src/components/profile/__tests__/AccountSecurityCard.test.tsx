// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { AccountSecurityCard } from "../AccountSecurityCard";

describe("AccountSecurityCard", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultTranslations = {
    accountSecured: "АККАУНТ ЗАЩИЩЕН",
    saveProgress: "СОХРАНЕНИЕ ПРОГРЕССА",
    loginLink: "Уже есть аккаунт? Войти",
    saveWarning: "Предупреждение",
    uniqueLogin: "Уникальный Логин",
    password: "Пароль",
    protectAccount: "СОЗДАТЬ ПРОФИЛЬ",
    saving: "Сохранение...",
  };

  it("рендерит кнопку 'СОЗДАТЬ ПРОФИЛЬ' на 100% ширины (w-full)", () => {
    render(
      <AccountSecurityCard
        isAnonymous={true}
        isAccountProtectedSuccess={false}
        onOpenLoginModal={vi.fn()}
        translations={defaultTranslations}
      />
    );

    const btn = screen.getByRole("button", { name: /СОЗДАТЬ ПРОФИЛЬ/i });
    expect(btn).toBeDefined();
    expect(btn.className).toContain("w-full");
  });

  it("при ошибке 'Логин уже занят' выводит ошибку строго под полем логина и подсвечивает красным контуром", () => {
    render(
      <AccountSecurityCard
        isAnonymous={true}
        isAccountProtectedSuccess={false}
        accountError="Логин уже занят другим игроком"
        onOpenLoginModal={vi.fn()}
        translations={defaultTranslations}
      />
    );

    const errorMsg = screen.getByText("Логин уже занят другим игроком");
    expect(errorMsg).toBeDefined();
    expect(errorMsg.className).toContain("text-accent-danger");
    expect(errorMsg.className).toContain("whitespace-normal");
    expect(errorMsg.className).toContain("break-words");
    expect(errorMsg.className).not.toContain("truncate");

    const loginInput = screen.getByPlaceholderText("agent_77");
    expect(loginInput.className).toContain("border-accent-danger");
  });

  it("при ошибке пароля выводит ошибку строго под полем пароля с переносом строк без обрезки", () => {
    render(
      <AccountSecurityCard
        isAnonymous={true}
        isAccountProtectedSuccess={false}
        accountError="Пароль должен содержать не менее 6 символов"
        onOpenLoginModal={vi.fn()}
        translations={defaultTranslations}
      />
    );

    const errorMsg = screen.getByText("Пароль должен содержать не менее 6 символов");
    expect(errorMsg).toBeDefined();
    expect(errorMsg.className).toContain("text-accent-danger");
    expect(errorMsg.className).toContain("whitespace-normal");
    expect(errorMsg.className).toContain("break-words");
    expect(errorMsg.className).not.toContain("truncate");

    const passInput = screen.getByPlaceholderText("••••••••");
    expect(passInput.className).toContain("border-accent-danger");
  });
});
