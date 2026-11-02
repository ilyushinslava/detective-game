// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileControllerView } from "../MobileControllerView";
import { createInitialState } from "../../../utils/gameLogic";

describe("MobileControllerView Component", () => {
  it("блокирует кнопку сдвига, если сейчас не ход игрока", () => {
    const baseState = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    baseState.currentTurn = "DETECTIVE"; // Ход соперника

    const mockDispatch = vi.fn();
    const mockExit = vi.fn();

    render(
      <MobileControllerView
        gameState={baseState}
        playerRole="KILLER"
        onDispatchAction={mockDispatch}
        onExit={mockExit}
      />
    );

    const shiftBtn = screen.getByRole("button", { name: "Ход соперника" }) as HTMLButtonElement;
    expect(shiftBtn.disabled).toBe(true);

    fireEvent.click(shiftBtn);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("отправляет экшен SHIFT_BOARD при клике на 'Выполнить сдвиг'", () => {
    const baseState = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    baseState.currentTurn = "KILLER"; // Мой ход

    const mockDispatch = vi.fn();
    const mockExit = vi.fn();

    render(
      <MobileControllerView
        gameState={baseState}
        playerRole="KILLER"
        onDispatchAction={mockDispatch}
        onExit={mockExit}
      />
    );

    const shiftBtn = screen.getByRole("button", { name: "Выполнить сдвиг" }) as HTMLButtonElement;
    expect(shiftBtn.disabled).toBe(false);

    fireEvent.click(shiftBtn);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SHIFT_BOARD",
        payload: {
          type: "ROW",
          index: 0,
          direction: "LEFT",
        },
        senderId: "local",
      })
    );
  });
});
