// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GameBoard } from "../GameBoard";
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
});
