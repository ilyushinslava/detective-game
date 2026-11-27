// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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
});
