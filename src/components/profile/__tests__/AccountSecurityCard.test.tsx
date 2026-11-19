// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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

  it("рендерит карточку призыва с заголовком и текстом призыва для анонимного профиля", () => {
    render(
      <AccountSecurityCard
        isAnonymous={true}
        isAccountProtectedSuccess={false}
        onOpenAuthModal={vi.fn()}
        translations={defaultTranslations}
      />
    );

    expect(screen.getByText("СОХРАНЕНИЕ ПРОГРЕССА")).toBeDefined();
    expect(
      screen.getByText("Создайте профиль, чтобы навсегда сохранить текущий рейтинг, статистику и монеты.")
    ).toBeDefined();
  });

  it("рендерит кнопку 'ВОЙТИ' и вызывает onOpenAuthModal при клике", () => {
    const mockOpen = vi.fn();
    render(
      <AccountSecurityCard
        isAnonymous={true}
        isAccountProtectedSuccess={false}
        onOpenAuthModal={mockOpen}
        translations={defaultTranslations}
      />
    );

    const btn = screen.getByRole("button", { name: /ВОЙТИ|СОЗДАТЬ ПРОФИЛЬ/i });
    expect(btn).toBeDefined();

    fireEvent.click(btn);
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it("не содержит встроенных инпутов логина и пароля внутри карточки", () => {
    render(
      <AccountSecurityCard
        isAnonymous={true}
        isAccountProtectedSuccess={false}
        onOpenAuthModal={vi.fn()}
        translations={defaultTranslations}
      />
    );

    expect(screen.queryByPlaceholderText("agent_77")).toBeNull();
    expect(screen.queryByPlaceholderText("••••••••")).toBeNull();
  });

  it("не рендерит ничего (return null), если пользователь авторизован или привязка успешна", () => {
    const { container } = render(
      <AccountSecurityCard
        isAnonymous={false}
        isAccountProtectedSuccess={true}
        onOpenAuthModal={vi.fn()}
        translations={defaultTranslations}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("АККАУНТ ЗАЩИЩЕН")).toBeNull();
    expect(screen.queryByText("СОХРАНЕНИЕ ПРОГРЕССА")).toBeNull();
  });
});
