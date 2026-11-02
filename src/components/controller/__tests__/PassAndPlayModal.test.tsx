// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PassAndPlayModal } from "../PassAndPlayModal";

describe("PassAndPlayModal Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("не рендерится, если isOpen = false", () => {
    const { container } = render(
      <PassAndPlayModal
        isOpen={false}
        nextRole="KILLER"
        onConfirmTakeDevice={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("отображает имя следующего игрока и вызывает подтверждение", () => {
    const mockConfirm = vi.fn();

    render(
      <PassAndPlayModal
        isOpen={true}
        nextRole="DETECTIVE"
        onConfirmTakeDevice={mockConfirm}
      />
    );

    expect(screen.getByText("Агент Призрак")).toBeDefined();
    expect(screen.getByText(/Передайте телефон следующему игроку/i)).toBeDefined();

    const confirmBtn = screen.getByRole("button", { name: "Я взял телефон" });
    fireEvent.click(confirmBtn);

    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });
});
