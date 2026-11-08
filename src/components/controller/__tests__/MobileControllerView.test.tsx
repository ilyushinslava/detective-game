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
    expect(screen.getByText(/Сейчас ход другого игрока/i)).toBeDefined();
    expect(screen.getByText(/Дождитесь своего хода/i)).toBeDefined();
    // Action buttons must NOT be present on waiting screen
    expect(screen.queryByText(/ДОСТУПНЫЕ ДЕЙСТВИЯ/i)).toBeNull();
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

  it("dispatches PREVIEW_SHIFT when line is selected in step 2", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
    state.currentTurn = "KILLER";
    const dispatchSpy = vi.fn();
    const previewSpy = vi.fn();

    render(
      <MobileControllerView
        gameState={state}
        playerRole="KILLER"
        onDispatchAction={dispatchSpy}
        onSelectLinePreview={previewSpy}
      />
    );

    // Step 1: open wizard and select COL (Вертикаль)
    fireEvent.click(screen.getByRole("button", { name: /Переместить ряд\/столбец/i }));
    fireEvent.click(screen.getByText(/Вертикаль/i));

    // Step 2: select Column 3 (Столбец #3)
    fireEvent.click(screen.getByText(/СТОЛБЕЦ #3/i));

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: "PREVIEW_SHIFT",
      payload: {
        type: "COL",
        index: 2,
        direction: undefined,
      },
    });
    expect(previewSpy).toHaveBeenCalledWith({
      type: "COL",
      index: 2,
    });
  });

  it("supports back button navigation across wizard steps", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
    state.currentTurn = "KILLER";

    render(
      <MobileControllerView
        gameState={state}
        playerRole="KILLER"
        onDispatchAction={vi.fn()}
      />
    );

    // Open wizard -> Step 1
    fireEvent.click(screen.getByRole("button", { name: /Переместить ряд\/столбец/i }));
    expect(screen.getByText(/ШАГ 1 • ВЫБЕРИТЕ ОСЬ/i)).toBeDefined();

    // Select ROW -> Step 2
    fireEvent.click(screen.getByText(/Горизонталь/i));
    expect(screen.getByText(/ШАГ 2 • ВЫБЕРИТЕ ГОРИЗОНТАЛЬНЫЙ РЯД/i)).toBeDefined();

    // Go back to Step 1
    fireEvent.click(screen.getByRole("button", { name: /Назад к выбору оси/i }));
    expect(screen.getByText(/ШАГ 1 • ВЫБЕРИТЕ ОСЬ/i)).toBeDefined();

    // Cancel wizard -> returns to main screen
    fireEvent.click(screen.getByRole("button", { name: /Отмена и возврат к пульту/i }));
    expect(screen.getByText(/ДОСТУПНЫЕ ДЕЙСТВИЯ/i)).toBeDefined();
  });

  it("disables confirmation button and displays warning on Anti-Undo move", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
    state.currentTurn = "KILLER";
    // Opponent last shifted ROW 0 FORWARD
    state.lastShift = {
      type: "ROW",
      index: 0,
      direction: "FORWARD",
    };

    render(
      <MobileControllerView
        gameState={state}
        playerRole="KILLER"
        onDispatchAction={vi.fn()}
      />
    );

    // Step 1: ROW
    fireEvent.click(screen.getByRole("button", { name: /Переместить ряд\/столбец/i }));
    fireEvent.click(screen.getByText(/Горизонталь/i));

    // Step 2: Row 1 (index 0)
    fireEvent.click(screen.getByText(/РЯД #1/i));

    // Step 3: Shift LEFT (BACKWARD, which reverses FORWARD)
    fireEvent.click(screen.getByText(/ВЛЕВО/i));

    // Step 4: Confirm screen displays Anti-Undo warning and disables button
    expect(screen.getByText(/Anti-Undo: ход отменяет предыдущий сдвиг соперника/i)).toBeDefined();
    const confirmButton = screen.getByRole("button", { name: /Подтвердить/i });
    expect(confirmButton).toHaveProperty("disabled", true);
  });

  it("locks controller into waiting screen immediately after shift execution (Step 6)", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
    state.currentTurn = "KILLER";

    render(
      <MobileControllerView
        gameState={state}
        playerRole="KILLER"
        onDispatchAction={vi.fn()}
      />
    );

    // Execute valid shift
    fireEvent.click(screen.getByRole("button", { name: /Переместить ряд\/столбец/i }));
    fireEvent.click(screen.getByText(/Горизонталь/i));
    fireEvent.click(screen.getByText(/РЯД #2/i));
    fireEvent.click(screen.getByText(/ВПРАВО/i));
    fireEvent.click(screen.getByRole("button", { name: /Подтвердить/i }));

    // Controller should instantly show waiting screen
    expect(screen.getByText(/ОЖИДАНИЕ/i)).toBeDefined();
    expect(screen.getByText(/Сейчас ход другого игрока/i)).toBeDefined();
    expect(screen.queryByText(/ДОСТУПНЫЕ ДЕЙСТВИЯ/i)).toBeNull();
  });

  it("allows selecting player's own card in 3x3 radar grid", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
    state.currentTurn = "KILLER";

    render(
      <MobileControllerView
        gameState={state}
        playerRole="KILLER"
        onDispatchAction={vi.fn()}
      />
    );

    // Find the center card with "ВЫ" badge
    const youBadge = screen.getByText("ВЫ");
    expect(youBadge).toBeDefined();

    const centerCardContainer = youBadge.closest(".cursor-pointer");
    expect(centerCardContainer).toBeDefined();

    // Clicking center card is enabled and marks it as target
    fireEvent.click(centerCardContainer!);
    expect(centerCardContainer?.className).toContain("scale-105");
  });
});
