// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BlindfoldCurtain } from "../BlindfoldCurtain";

describe("BlindfoldCurtain Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("не рендерится, если isOpen = false", () => {
    const { container } = render(
      <BlindfoldCurtain
        isOpen={false}
        nextRole="KILLER"
        onDismiss={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("рендерит шторку с оверлеем z-[9999] и абсолютным черным фоном", () => {
    const { container } = render(
      <BlindfoldCurtain
        isOpen={true}
        nextRole="DETECTIVE"
        onDismiss={vi.fn()}
      />
    );

    const overlay = container.querySelector('[role="dialog"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.className).toContain("z-[9999]");
    expect(overlay?.className).toContain("bg-black");
  });

  it("отображает дефолтное имя следующей роли 'Оперативник', подсказку и слоган передачи устройства", () => {
    render(
      <BlindfoldCurtain
        isOpen={true}
        nextRole="DETECTIVE"
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByText(/ПЕРЕДАЙТЕ УСТРОЙСТВО/i)).toBeDefined();
    expect(screen.getByText(/НАЖМИТЕ НА ЭКРАН ДЛЯ ПРОДОЛЖЕНИЯ/i)).toBeDefined();
    expect(screen.getByText("Оперативник")).toBeDefined();
  });

  it("отображает кастомное имя игрока, если оно передано", () => {
    render(
      <BlindfoldCurtain
        isOpen={true}
        nextPlayerName="Агент Фантом"
        nextPlayerColor="text-rose-400"
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getAllByText(/Агент Фантом/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/ПЕРЕДАЙТЕ УСТРОЙСТВО \[Агент Фантом\]\.\.\./i)).toBeDefined();
  });

  it("снимается по тапу на экран (вызывает onDismiss)", () => {
    const handleDismiss = vi.fn();
    const { container } = render(
      <BlindfoldCurtain
        isOpen={true}
        nextRole="KILLER"
        onDismiss={handleDismiss}
      />
    );

    const overlay = container.querySelector('[role="dialog"]')!;
    fireEvent.click(overlay);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
