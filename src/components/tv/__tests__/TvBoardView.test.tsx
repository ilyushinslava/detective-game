// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TvBoardView } from "../TvBoardView";
import { createInitialState } from "../../../utils/gameLogic";

describe("TvBoardView Component", () => {
  it("отрисовывает 25 персонажей доски и статус текущего хода", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
    state.currentTurn = "KILLER";

    render(<TvBoardView gameState={state} />);

    const killerElements = screen.getAllByText("Маньяк");
    expect(killerElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/ТВ ЭФИР/i)).toBeDefined();
  });

  it("отображает блок выбранной линии, если она передана", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");

    render(
      <TvBoardView
        gameState={state}
        selectedLine={{ type: "ROW", index: 2, direction: "FORWARD" }}
      />
    );

    expect(screen.getByText("ТАКТИЧЕСКИЙ МАНЕВР")).toBeDefined();
    expect(screen.getByText("РЯД #3")).toBeDefined();
    expect(screen.getByText("ВПРАВО")).toBeDefined();
  });
});
