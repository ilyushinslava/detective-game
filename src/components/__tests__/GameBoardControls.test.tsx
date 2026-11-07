// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GameBoard, getShiftIndicator } from "../GameBoard";
import type { Character } from "../../types/game";

describe("GameBoard Controls", () => {
  const createMockBoard = (): Character[][] => {
    const board: Character[][] = [];
    let idCounter = 1;
    for (let r = 0; r < 5; r++) {
      const row: Character[] = [];
      for (let c = 0; c < 5; c++) {
        row.push({
          id: `c${idCounter}`,
          name: `Char ${idCounter}`,
          isAlive: true,
          isExonerated: false
        });
        idCounter++;
      }
      board.push(row);
    }
    return board;
  };

  const createCustomBoard = (size: number): Character[][] => {
    const board: Character[][] = [];
    let idCounter = 1;
    for (let r = 0; r < size; r++) {
      const row: Character[] = [];
      for (let c = 0; c < size; c++) {
        row.push({
          id: `c${idCounter}`,
          name: `Char ${idCounter}`,
          isAlive: true,
          isExonerated: false,
        });
        idCounter++;
      }
      board.push(row);
    }
    return board;
  };

  const defaultProps = {
    mode: "SKHVATKA" as const,
    board: createMockBoard(),
    selectedCharacterId: null,
    killerAdjacentIds: [],
    detectiveAdjacentIds: [],
    showKillerHints: false,
    showDetectiveHints: false,
    lastShift: null,
    onShift: vi.fn(),
    onSelectCharacter: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("вызывает onCardClick (onSelectCharacter) при клике на свободную карточку персонажа", () => {
    const mockOnSelect = vi.fn();
    render(<GameBoard {...defaultProps} onSelectCharacter={mockOnSelect} />);
    
    const card = screen.getByText("Char 1");
    expect(card).toBeDefined();
    fireEvent.click(card);
    
    expect(mockOnSelect).toHaveBeenCalledWith("c1");
  });

  it("вызывает onShift при клике на доступную кнопку сдвига столбца", () => {
    const mockOnShift = vi.fn();
    const { container } = render(<GameBoard {...defaultProps} onShift={mockOnShift} />);
    
    const buttons = Array.from(container.querySelectorAll("button"));
    const shiftBtn = buttons[0];
    
    expect(shiftBtn).toBeDefined();
    fireEvent.click(shiftBtn);
    
    expect(mockOnShift).toHaveBeenCalledWith("COL", 0, expect.any(String));
  });

  it("блокирует кнопку сдвига (disabled) при наличии blockedShift", () => {
    const mockOnShift = vi.fn();
    const { container } = render(
      <GameBoard 
        {...defaultProps} 
        onShift={mockOnShift} 
        blockedShift={{ type: "COL", index: 0 }} 
      />
    );
    
    const buttons = Array.from(container.querySelectorAll("button"));
    const shiftBtn = buttons[0];
    
    expect(shiftBtn).toBeDefined();
    expect(shiftBtn.disabled).toBe(true);
    
    fireEvent.click(shiftBtn);
    expect(mockOnShift).not.toHaveBeenCalled();
  });

  it("блокирует обратный сдвиг (isOppositeShift) для предотвращения мгновенной отмены хода", () => {
    const mockOnShift = vi.fn();
    const { container } = render(
      <GameBoard 
        {...defaultProps} 
        onShift={mockOnShift} 
        lastShift={{ type: "ROW", index: 1, direction: "FORWARD" }} 
      />
    );
    
    // Ищем все заблокированные кнопки. Должна быть ровно одна (обратный сдвиг).
    const disabledButtons = Array.from(container.querySelectorAll("button")).filter(b => b.disabled);
    
    expect(disabledButtons.length).toBe(1);
    
    fireEvent.click(disabledButtons[0]);
    expect(mockOnShift).not.toHaveBeenCalled();
  });

  it("renders expanded 6x6 grid with 36 cards and allows selecting corner card", () => {
    const mockOnSelect = vi.fn();
    const mockOnShift = vi.fn();
    const board6x6 = createCustomBoard(6);
    const { container } = render(
      <GameBoard
        {...defaultProps}
        mode="SECRET_SERVICE"
        board={board6x6}
        onSelectCharacter={mockOnSelect}
        onShift={mockOnShift}
      />
    );

    const lastCard = screen.getByText("Char 36");
    expect(lastCard).toBeDefined();
    fireEvent.click(lastCard);
    expect(mockOnSelect).toHaveBeenCalledWith("c36");

    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.length).toBe(24);

    fireEvent.click(buttons[5]);
    expect(mockOnShift).toHaveBeenCalledWith("COL", 5, expect.any(String));
  });

  it("renders expanded 7x7 grid with 49 cards and 28 shift buttons", () => {
    const mockOnSelect = vi.fn();
    const mockOnShift = vi.fn();
    const board7x7 = createCustomBoard(7);
    const { container } = render(
      <GameBoard
        {...defaultProps}
        mode="SECRET_SERVICE"
        board={board7x7}
        onSelectCharacter={mockOnSelect}
        onShift={mockOnShift}
      />
    );

    const lastCard = screen.getByText("Char 49");
    expect(lastCard).toBeDefined();
    fireEvent.click(lastCard);
    expect(mockOnSelect).toHaveBeenCalledWith("c49");

    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.length).toBe(28);

    const rowButtons = buttons.slice(7, 14);
    fireEvent.click(rowButtons[6]);
    expect(mockOnShift).toHaveBeenCalledWith("ROW", 6, expect.any(String));
  });

  describe("gridShift indication & regression", () => {
    it("при вызове сдвига колонки colIndex: 2, direction: 'up' в стейт индикации попадает ровно { type: 'col', index: 2, direction: 'up' }, а не противоположное направление", () => {
      // BACKWARD для COL соответствует стрелке вверх (up)
      const indicator = getShiftIndicator("COL", 2, "BACKWARD");
      expect(indicator).toEqual({ type: "col", index: 2, direction: "up" });
      expect(indicator.direction).not.toBe("down");
      expect(indicator.type).toBe("col");
      expect(indicator.index).toBe(2);

      // FORWARD для COL соответствует стрелке вниз (down)
      const indicatorDown = getShiftIndicator("COL", 2, "FORWARD");
      expect(indicatorDown).toEqual({ type: "col", index: 2, direction: "down" });
      expect(indicatorDown.direction).not.toBe("up");

      // FORWARD для ROW соответствует стрелке вправо (right)
      const indicatorRight = getShiftIndicator("ROW", 1, "FORWARD");
      expect(indicatorRight).toEqual({ type: "row", index: 1, direction: "right" });
      expect(indicatorRight.direction).not.toBe("left");

      // BACKWARD для ROW соответствует стрелке влево (left)
      const indicatorLeft = getShiftIndicator("ROW", 1, "BACKWARD");
      expect(indicatorLeft).toEqual({ type: "row", index: 1, direction: "left" });
      expect(indicatorLeft.direction).not.toBe("right");
    });

    it("при клике на стрелку col-up-2 подсвечивается ровно col-up-2, а противоположная стрелка col-down-2 не получает активную подсветку", () => {
      const mockOnShift = vi.fn();
      const { getByTestId } = render(<GameBoard {...defaultProps} onShift={mockOnShift} />);

      const colUp2 = getByTestId("col-up-2");
      const colDown2 = getByTestId("col-down-2");

      expect(colUp2.getAttribute("data-active-shift")).toBeNull();
      expect(colDown2.getAttribute("data-active-shift")).toBeNull();

      fireEvent.click(colUp2);

      expect(mockOnShift).toHaveBeenCalledWith("COL", 2, "BACKWARD");
      expect(colUp2.getAttribute("data-active-shift")).toBe("true");
      expect(colDown2.getAttribute("data-active-shift")).toBeNull();
    });

    it("при получении lastShift с типом COL и direction BACKWARD подсвечивается верхняя стрелка col-up, а не противоположная col-down", () => {
      const { getByTestId } = render(
        <GameBoard
          {...defaultProps}
          lastShift={{ type: "COL", index: 2, direction: "BACKWARD" }}
        />
      );

      const colUp2 = getByTestId("col-up-2");
      const colDown2 = getByTestId("col-down-2");

      expect(colUp2.getAttribute("data-active-shift")).toBe("true");
      expect(colDown2.getAttribute("data-active-shift")).toBeNull();
      // Противоположная стрелка заблокирована правилом запрета обратного хода
      expect(colDown2.disabled).toBe(true);
    });
  });
});
