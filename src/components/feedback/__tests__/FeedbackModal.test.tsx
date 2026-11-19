// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import { FeedbackModal } from "../FeedbackModal";
import { supabase } from "../../../lib/supabase";

vi.mock("../../../contexts/AuthContext", () => ({
  useAuthSafe: () => ({
    user: { id: "test_user_uuid_123" },
    isAnonymous: false,
  }),
}));

vi.mock("../../../utils/audio", () => ({
  soundManager: {
    play: vi.fn(),
  },
}));

vi.mock("../../../utils/haptics", () => ({
  triggerHaptic: vi.fn(),
}));

describe("FeedbackModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("рендерится корректно при isOpen={true} и показывает заголовок и категории", () => {
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Обратная связь")).toBeDefined();
    expect(screen.getByText("Ошибка")).toBeDefined();
    expect(screen.getByText("Идея")).toBeDefined();
    expect(screen.getByText("Другое")).toBeDefined();
  });

  it("кнопка 'Отправить' заблокирована при пустом тексте сообщения", () => {
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    const submitBtn = screen.getByRole("button", { name: "Отправить" }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it("кнопка 'Отправить' становится активной при вводе 3 и более символов", () => {
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    const textarea = screen.getByPlaceholderText("Опишите проблему или предложение...");
    fireEvent.change(textarea, { target: { value: "Тестовая ошибка" } });

    const submitBtn = screen.getByRole("button", { name: "Отправить" }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
  });

  it("отправляет фидбэк в Supabase и показывает экран успеха", async () => {
    const insertSpy = vi.spyOn(supabase, "from").mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any);

    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    // Выбираем категорию «Идея»
    fireEvent.click(screen.getByText("Идея"));

    // Вводим текст
    const textarea = screen.getByPlaceholderText("Опишите проблему или предложение...");
    fireEvent.change(textarea, { target: { value: "Было бы круто добавить рейтинговые дуэли 2х2" } });

    // Отправляем
    const submitBtn = screen.getByRole("button", { name: "Отправить" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Сообщение отправлено")).toBeDefined();
    });

    expect(insertSpy).toHaveBeenCalledWith("feedback");
  });

  it("вызывает onClose при клике на 'Отмена'", () => {
    const onClose = vi.fn();
    render(<FeedbackModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByText("Отмена"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
