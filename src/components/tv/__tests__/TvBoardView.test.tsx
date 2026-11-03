// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TvBoardView } from "../TvBoardView";
import { createInitialState } from "../../../utils/gameLogic";

describe("TvBoardView Component", () => {
  it("отрисовывает 25 персонажей доски и статус текущего хода", () => {
    const state = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    state.currentTurn = "KILLER";

    render(<TvBoardView gameState={state} secondsLeft={45} />);

    const killerElements = screen.getAllByText("Бандит");
    expect(killerElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("0:45")).toBeDefined();
  });

  it("отображает блок выбранной линии, если она передана", () => {
    const state = createInitialState("SKHVATKA", "ONLINE", "KILLER");

    render(
      <TvBoardView
        gameState={state}
        selectedLine={{ type: "ROW", index: 2, direction: "FORWARD" }}
      />
    );

    expect(screen.getByText("Выбранная линия")).toBeDefined();
    expect(screen.getByText("Ряд 3")).toBeDefined();
    expect(screen.getByText("▶ Вправо")).toBeDefined();
  });
});
