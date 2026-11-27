// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MatchStatusBanner } from "../MatchStatusBanner";

describe("MatchStatusBanner", () => {
  afterEach(() => {
    cleanup();
  });

  it("не рендерит ничего, если оба флага паузы выключены", () => {
    const { container } = render(
      <MatchStatusBanner isTurnTimerPaused={false} isDualDisconnectPaused={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("показывает паузу таймера хода с таймкодом MM:SS и role=status", () => {
    render(
      <MatchStatusBanner
        isTurnTimerPaused={true}
        turnTimerRemainingMs={27000}
        isDualDisconnectPaused={false}
      />
    );

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Таймер хода на паузе");
    expect(status.textContent).toContain("00:27");
  });

  it("показывает паузу двойного дисконнекта с rose-акцентом и секундами grace", () => {
    render(
      <MatchStatusBanner
        isTurnTimerPaused={false}
        isDualDisconnectPaused={true}
        dualDisconnectGraceMs={15000}
      />
    );

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("оба игрока оффлайн");
    expect(status.textContent).toContain("15 с");
    expect(status.className).toContain("rose");
  });

  it("баннер не перехватывает события указателя (pointer-events-none)", () => {
    const { container } = render(
      <MatchStatusBanner isTurnTimerPaused={true} turnTimerRemainingMs={5000} isDualDisconnectPaused={false} />
    );

    expect((container.firstChild as HTMLElement).className).toContain("pointer-events-none");
  });

  it("показывает полный текст причины отказа без обрезки", () => {
    const longReason =
      "Цель вне радиуса 3×3. Выберите персонажа рядом с вашей тайной личностью и повторите действие.";
    render(
      <MatchStatusBanner
        isTurnTimerPaused={false}
        isDualDisconnectPaused={false}
        rejectMessage={longReason}
      />
    );

    const status = screen.getByRole("status");
    expect(status.textContent).toContain(longReason);
    expect(status.innerHTML).not.toContain("truncate");
    expect(status.className).toContain("rose");
  });

  it("не рендерит плашку отказа при пустом сообщении", () => {
    const { container } = render(
      <MatchStatusBanner
        isTurnTimerPaused={false}
        isDualDisconnectPaused={false}
        rejectMessage="   "
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("вызывает onDismissReject по кнопке закрытия", () => {
    const onDismissReject = vi.fn();
    render(
      <MatchStatusBanner
        isTurnTimerPaused={false}
        isDualDisconnectPaused={false}
        rejectMessage="Цель вне радиуса 3×3."
        onDismissReject={onDismissReject}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Скрыть уведомление" }));
    expect(onDismissReject).toHaveBeenCalledTimes(1);
  });
});
