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
    const state = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    state.currentTurn = "DETECTIVE";

    render(
      <MobileControllerView
        gameState={state}
        playerRole="KILLER"
        onDispatchAction={vi.fn()}
      />
    );

    expect(screen.getByText("Ожидание")).toBeDefined();
    expect(screen.getByText("ВАША РОЛЬ")).toBeDefined();
  });

  it("renders neighbors and actions when it is player's turn", () => {
    const state = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    state.currentTurn = "KILLER";

    render(
      <MobileControllerView
        gameState={state}
        playerRole="KILLER"
        onDispatchAction={vi.fn()}
      />
    );

    expect(screen.getByText("ДОСТУПНЫЕ ДЕЙСТВИЯ")).toBeDefined();
    expect(screen.getByRole("button", { name: /Переместить ряд\/столбец/i })).toBeDefined();
    expect(screen.getByText("Ликвидация цели")).toBeDefined();
  });

  it("dispatches canonical SHIFT_BOARD with BACKWARD direction when shifting left", () => {
    const state = createInitialState("SKHVATKA", "ONLINE", "KILLER");
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
    fireEvent.click(screen.getByText("Горизонталь"));

    // Step 2: Select Row 1 (Ряд 1)
    fireEvent.click(screen.getByText("Ряд 1"));

    // Step 3: Select Direction Left (Влево)
    fireEvent.click(screen.getByText("Влево"));

    // Step 4: Confirm shift (Подтвердить)
    fireEvent.click(screen.getByText("Подтвердить"));

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
