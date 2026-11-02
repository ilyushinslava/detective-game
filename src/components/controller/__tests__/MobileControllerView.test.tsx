// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MobileControllerView } from "../MobileControllerView";
import { createInitialState } from "../../../utils/gameLogic";

describe("MobileControllerView Master-TZ", () => {
  afterEach(() => {
    cleanup();
  });

  it("показывает экран ожидания с часами, если сейчас ход оппонента", () => {
    const baseState = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    baseState.currentTurn = "DETECTIVE";

    render(
      <MobileControllerView
        gameState={baseState}
        playerRole="KILLER"
        onDispatchAction={vi.fn()}
        onExit={vi.fn()}
      />
    );

    expect(screen.getByText("Сейчас ход другого игрока")).toBeDefined();
    expect(screen.getByText("Ожидание")).toBeDefined();
  });

  it("отображает блок соседей во время своего хода", () => {
    const baseState = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    baseState.currentTurn = "KILLER";
    baseState.killerSecretId = baseState.board[2][2].id;

    render(
      <MobileControllerView
        gameState={baseState}
        playerRole="KILLER"
        onDispatchAction={vi.fn()}
        onExit={vi.fn()}
      />
    );

    expect(screen.getByText("Соседи (8)")).toBeDefined();
    expect(screen.getByText("Завершить ход")).toBeDefined();
  });

  it("проходит 4 шага мастера перемещения поля", () => {
    const baseState = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    baseState.currentTurn = "KILLER";

    const mockDispatch = vi.fn();
    const mockPreview = vi.fn();

    render(
      <MobileControllerView
        gameState={baseState}
        playerRole="KILLER"
        onDispatchAction={mockDispatch}
        onSelectLinePreview={mockPreview}
        onExit={vi.fn()}
      />
    );

    // 1. Открытие мастера
    const moveBtn = screen.getByRole("button", { name: /Переместить ряд\/столбец/i });
    fireEvent.click(moveBtn);
    expect(screen.getByText("Шаг 1 • Выберите ось")).toBeDefined();

    // 2. Выбор горизонтали
    fireEvent.click(screen.getByRole("button", { name: /Горизонталь/i }));
    expect(screen.getByText("Шаг 2 • Выберите ряд")).toBeDefined();

    // 3. Выбор ряда 3
    fireEvent.click(screen.getByRole("button", { name: /Ряд 3/i }));
    expect(screen.getByText("Шаг 3 • Направление для Ряда 3")).toBeDefined();

    // 4. Выбор направления влево
    fireEvent.click(screen.getByRole("button", { name: /Влево/i }));
    expect(screen.getByText("Шаг 4 • Подтверждение")).toBeDefined();
    expect(screen.getByText("Переместить ряд 3 влево?")).toBeDefined();

    // 5. Подтверждение
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SHIFT_BOARD",
        payload: {
          type: "ROW",
          index: 2,
          direction: "LEFT",
        },
      })
    );
  });
});
