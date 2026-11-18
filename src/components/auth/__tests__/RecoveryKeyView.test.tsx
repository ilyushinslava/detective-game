// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import { RecoveryKeyView, generateRecoveryKey } from "../RecoveryKeyView";

describe("RecoveryKeyView", () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("generateRecoveryKey генерирует 12-значный ключ формата NOIR-XXXX-XXXX", () => {
    const key = generateRecoveryKey();
    expect(key).toMatch(/^NOIR-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  });

  it("рендерит перфокарту с переданным секретным ключом", () => {
    render(
      <RecoveryKeyView
        recoveryKey="NOIR-8X2F-9P4Q"
        login="agent_noir"
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText("ПРОФИЛЬ АКТИВИРОВАН")).toBeDefined();
    expect(screen.getByText("Агент: agent_noir")).toBeDefined();
    expect(screen.getByText("NOIR-8X2F-9P4Q")).toBeDefined();
    expect(screen.getByText("СКОПИРОВАТЬ КЛЮЧ")).toBeDefined();
  });

  it("копирует ключ при клике на кнопку копирования и показывает фидбэк", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <RecoveryKeyView
        recoveryKey="NOIR-8X2F-9P4Q"
        login="agent_noir"
        onComplete={mockOnComplete}
      />
    );

    const copyBtn = screen.getByRole("button", { name: /СКОПИРОВАТЬ КЛЮЧ/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("NOIR-8X2F-9P4Q");
      expect(screen.getByText(/КЛЮЧ СКОПИРОВАН В БУФЕР/i)).toBeDefined();
    });
  });

  it("вызывает onComplete при нажатии кнопки завершения", () => {
    render(
      <RecoveryKeyView
        recoveryKey="NOIR-8X2F-9P4Q"
        onComplete={mockOnComplete}
      />
    );

    const completeBtn = screen.getByRole("button", { name: /В ШТАБ/i });
    fireEvent.click(completeBtn);

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });
});
