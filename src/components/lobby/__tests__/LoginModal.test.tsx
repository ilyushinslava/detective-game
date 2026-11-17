// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import { LoginModal } from "../LoginModal";

const mockSignIn = vi.fn();
vi.mock("../../../contexts/AuthContext", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAuthSafe: () => ({
      signIn: mockSignIn,
      isAnonymous: true,
    }),
  };
});

describe("LoginModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("рендерит поля формы входа в аккаунт", () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    expect(screen.getByText("ВХОД В АККАУНТ")).toBeDefined();
    expect(screen.getByPlaceholderText("agent_77")).toBeDefined();
    expect(screen.getByPlaceholderText("••••••••")).toBeDefined();
  });

  it("отображает ошибку при вводе кириллицы в логин", async () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const loginInput = screen.getByPlaceholderText("agent_77");
    const passInput = screen.getByPlaceholderText("••••••••");
    const submitBtn = screen.getByRole("button", { name: "Войти" });

    fireEvent.change(loginInput, { target: { value: "ЛогинРусский" } });
    fireEvent.change(passInput, { target: { value: "password123" } });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/кириллицу/i)).toBeDefined();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("вызывает signIn и закрывает модалку при валидных данных", async () => {
    mockSignIn.mockResolvedValueOnce({ success: true });

    render(<LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const loginInput = screen.getByPlaceholderText("agent_77");
    const passInput = screen.getByPlaceholderText("••••••••");
    const submitBtn = screen.getByRole("button", { name: "Войти" });

    fireEvent.change(loginInput, { target: { value: "agent_cyber" } });
    fireEvent.change(passInput, { target: { value: "password123" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("agent_cyber", "password123");
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
