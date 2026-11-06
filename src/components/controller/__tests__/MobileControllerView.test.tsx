// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MobileControllerView } from "../MobileControllerView";
import { createInitialState } from "../../../utils/gameLogic";

describe("MobileControllerView Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders waiting screen when it is not player's turn", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
    state.currentTurn = "DETECTIVE";

    render(
      <MobileControllerView
        gameState={state}
        playerRole="KILLER"
        onDispatchAction={vi.fn()}
      />
    );

    expect(screen.getByText(/ОЖИДАНИЕ/i)).toBeDefined();
    expect(screen.getByText(/ВАШЕ ДОСЬЕ/i)).toBeDefined();
  });

  it("renders neighbors and actions when it is player's turn", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
    state.currentTurn = "KILLER";

    render(
      <MobileControllerView
        gameState={state}
        playerRole="KILLER"
        onDispatchAction={vi.fn()}
      />
    );

    expect(screen.getByText(/ДОСТУПНЫЕ ДЕЙСТВИЯ/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Переместить ряд\/столбец/i })).toBeDefined();
    expect(screen.getByText(/Ликвидация/i)).toBeDefined();
  });

  it("dispatches canonical SHIFT_BOARD with BACKWARD direction when shifting left", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
    state.currentTurn = "KILLER";
    const dispatchSpy = vi.fn();

    render(
      <MobileControllerView
        gameState={state}
        playerRole="KILLER"
        onDispatchAction={dispatchSpy}
      />
    );

    // Click on Shift action button
    const shiftButton = screen.getByRole("button", { name: /Переместить ряд\/столбец/i });
    fireEvent.click(shiftButton);

    // Step 1: Select ROW (Горизонталь)
    fireEvent.click(screen.getByText(/Горизонталь/i));

    // Step 2: Select Row 1 (Ряд 1)
    fireEvent.click(screen.getByText(/РЯД #1/i));

    // Step 3: Select Direction Left (Влево)
    fireEvent.click(screen.getByText(/ВЛЕВО/i));

    // Step 4: Confirm shift
    fireEvent.click(screen.getByRole("button", { name: /Применить|Подтвердить/i }));

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: "SHIFT_BOARD",
      payload: {
        shiftType: "ROW",
        index: 0,
        direction: "BACKWARD",
      },
    });
  });
});
