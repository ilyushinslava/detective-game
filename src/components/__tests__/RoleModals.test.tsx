// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { IdentityRevealModal } from "../IdentityRevealModal";
import { InspectorChoiceModal } from "../InspectorChoiceModal";

describe("IdentityRevealModal", () => {
  const mockOnConfirmPvpPass = vi.fn();
  const mockOnAcceptIdentity = vi.fn();

  const defaultProps = {
    badge: "Test Badge",
    badgeColor: "red" as const,
    character: { id: "c1", name: "John Doe" },
    characterImage: null,
    isOpen: true,
    isPvpPassPhase: false,
    onConfirmPvpPass: mockOnConfirmPvpPass,
    onAcceptIdentity: mockOnAcceptIdentity,
    targetPlayerName: "Player 2",
    title: "Test Title"
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("не рендерится при isOpen: false", () => {
    const { container } = render(<IdentityRevealModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("в фазе PVP pass отображает экран передачи устройства и вызывает onConfirmPvpPass", () => {
    render(<IdentityRevealModal {...defaultProps} isPvpPassPhase={true} />);
    expect(screen.getByText(/Player 2/)).toBeDefined();

    const confirmBtn = screen.getByText("Я держу телефон один");
    expect(confirmBtn).toBeDefined();
    fireEvent.click(confirmBtn);
    expect(mockOnConfirmPvpPass).toHaveBeenCalled();
  });

  it("в фазе раскрытия роли рендерит имя персонажа и вызывает onAcceptIdentity", () => {
    render(<IdentityRevealModal {...defaultProps} isPvpPassPhase={false} />);
    expect(screen.getByText("John Doe")).toBeDefined();

    const acceptBtn = screen.getByText(/Принять личность/);
    expect(acceptBtn).toBeDefined();
    fireEvent.click(acceptBtn);
    expect(mockOnAcceptIdentity).toHaveBeenCalled();
  });
});

describe("InspectorChoiceModal", () => {
  const mockOnSelectInspectorRole = vi.fn();

  const mockChoices = [
    { id: "c1", name: "Char One", isAlive: true, isExonerated: false },
    { id: "c2", name: "Char Two", isAlive: true, isExonerated: false },
    { id: "c3", name: "Char Three", isAlive: true, isExonerated: false },
    { id: "c4", name: "Char Four", isAlive: true, isExonerated: false }
  ];

  const defaultProps = {
    isOpen: true,
    isPVP: false,
    inspectorChoices: mockChoices,
    characterImages: {},
    onSelectInspectorRole: mockOnSelectInspectorRole,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("в режиме PVP сначала требует подтверждения передачи экрана", () => {
    render(<InspectorChoiceModal {...defaultProps} isPVP={true} />);
    
    const passBtn = screen.getByText("Я держу телефон один");
    expect(passBtn).toBeDefined();
    
    fireEvent.click(passBtn);
    expect(screen.getByText("Char One")).toBeDefined();
  });

  it("рендерит варианты выбора, позволяет выбрать персонажа и активирует кнопку подтверждения", () => {
    render(<InspectorChoiceModal {...defaultProps} />);
    
    expect(screen.getByText("Char One")).toBeDefined();
    
    const charCard = screen.getByText("Char One").closest("div.cursor-pointer");
    expect(charCard).toBeDefined();
    fireEvent.click(charCard!);

    const confirmBtn = screen.getByText("Подтвердить личность").closest("button");
    expect(confirmBtn).toBeDefined();
    expect(confirmBtn?.disabled).toBe(false);
    
    fireEvent.click(confirmBtn!);
    expect(mockOnSelectInspectorRole).toHaveBeenCalledWith("c1");
  });

  it("позволяет сворачивать модалку для осмотра поля", () => {
    const { container } = render(<InspectorChoiceModal {...defaultProps} />);
    
    const modalContainer = container.querySelector(".max-w-md");
    expect(modalContainer?.className).not.toContain("translate-y-[110%]");

    const minimizeBtn = screen.getByText("Осмотреть поле").closest("button");
    expect(minimizeBtn).toBeDefined();

    fireEvent.click(minimizeBtn!);
    expect(modalContainer?.className).toContain("translate-y-[110%]");

    const restoreBtn = screen.getByText("Выбор личности").closest("button");
    expect(restoreBtn).toBeDefined();

    fireEvent.click(restoreBtn!);
    expect(modalContainer?.className).toContain("translate-y-0");
  });
});
