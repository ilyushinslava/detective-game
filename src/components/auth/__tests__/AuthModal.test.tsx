// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import { AuthModal } from "../AuthModal";

const mockSignIn = vi.fn();
const mockLinkAccount = vi.fn();

vi.mock("../../../contexts/AuthContext", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAuthSafe: () => ({
      signIn: mockSignIn,
      linkAccount: mockLinkAccount,
      isAnonymous: true,
    }),
  };
});

describe("AuthModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("рендерит поля ввода и переключатель режимов", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    expect(screen.getByText("Создать профиль")).toBeDefined();
    expect(screen.getByText("Вход")).toBeDefined();
    expect(screen.getByPlaceholderText("agent_77")).toBeDefined();
    expect(screen.getByPlaceholderText("••••••••")).toBeDefined();
  });

  it("на вкладке CREATE_PROFILE отображает предзаполненное readOnly поле с позывным игрока", () => {
    render(
      <AuthModal
        isOpen={true}
        initialTab="CREATE_PROFILE"
        currentCallsign="Агент Спектр"
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/ПОЗЫВНОЙ \/ ИМЯ/i)).toBeDefined();
    const callsignInput = screen.getByLabelText(/ПОЗЫВНОЙ \/ ИМЯ/i) as HTMLInputElement;
    expect(callsignInput.value).toBe("Агент Спектр");
    expect(callsignInput.readOnly).toBe(true);
    expect(callsignInput.disabled).toBe(true);
  });

  it("переключает видимость пароля при нажатии на иконку глаза", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const passwordInput = screen.getByPlaceholderText("••••••••") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const eyeButton = screen.getByTitle("Показать пароль");
    fireEvent.click(eyeButton);
    expect(passwordInput.type).toBe("text");

    const eyeOffButton = screen.getByTitle("Скрыть пароль");
    fireEvent.click(eyeOffButton);
    expect(passwordInput.type).toBe("password");
  });

  it("в режиме CREATE_PROFILE вызывает linkAccount и переключается на экран RecoveryKeyView", async () => {
    mockLinkAccount.mockResolvedValueOnce({ success: true });

    render(
      <AuthModal
        isOpen={true}
        initialTab="CREATE_PROFILE"
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const loginInput = screen.getByPlaceholderText("agent_77");
    const passInput = screen.getByPlaceholderText("••••••••");
    const submitBtn = screen.getByRole("button", { name: /СОХРАНИТЬ И АКТИВИРОВАТЬ/i });

    fireEvent.change(loginInput, { target: { value: "agent_shadow" } });
    fireEvent.change(passInput, { target: { value: "password777" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLinkAccount).toHaveBeenCalledWith("agent_shadow", "password777");
      expect(screen.getByText("ПРОФИЛЬ АКТИВИРОВАН")).toBeDefined();
      expect(screen.getByText(/РЕЗЕРВНЫЙ КЛЮЧ ДОСТУПА/i)).toBeDefined();
    });
  });

  it("в режиме SIGN_IN вызывает signIn и закрывает модалку при успехе", async () => {
    mockSignIn.mockResolvedValueOnce({ success: true });

    render(
      <AuthModal
        isOpen={true}
        initialTab="SIGN_IN"
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const loginInput = screen.getByPlaceholderText("agent_77");
    const passInput = screen.getByPlaceholderText("••••••••");
    const submitBtn = screen.getByRole("button", { name: "Войти" });

    fireEvent.change(loginInput, { target: { value: "agent_existing" } });
    fireEvent.change(passInput, { target: { value: "password777" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("agent_existing", "password777");
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
