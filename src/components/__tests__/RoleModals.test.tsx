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
    const { container } = render(<IdentityRevealModal {...defaultProps} isPvpPassPhase={true} />);
    expect(screen.getByText(/Player 2/)).toBeDefined();

    const buttons = Array.from(container.querySelectorAll("button"));
    const confirmBtn = buttons.find(b => b.className.includes("bg-red-600"));
    expect(confirmBtn).toBeDefined();
    fireEvent.click(confirmBtn!);
    expect(mockOnConfirmPvpPass).toHaveBeenCalled();
  });

  it("в фазе раскрытия роли рендерит имя персонажа и вызывает onAcceptIdentity", () => {
    const { container } = render(<IdentityRevealModal {...defaultProps} isPvpPassPhase={false} />);
    expect(screen.getByText("John Doe")).toBeDefined();

    const buttons = Array.from(container.querySelectorAll("button"));
    const acceptBtn = buttons.find(b => b.className.includes("bg-red-600"));
    expect(acceptBtn).toBeDefined();
    fireEvent.click(acceptBtn!);
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
    const { container } = render(<InspectorChoiceModal {...defaultProps} isPVP={true} />);
    
    const buttons = Array.from(container.querySelectorAll("button"));
    const passBtn = buttons.find(b => b.className.includes("from-blue-700"));
    expect(passBtn).toBeDefined();
    
    fireEvent.click(passBtn!);
    expect(screen.getByText("Char One")).toBeDefined();
  });

  it("рендерит варианты выбора, позволяет выбрать персонажа и активирует кнопку подтверждения", () => {
    const { container } = render(<InspectorChoiceModal {...defaultProps} />);
    
    expect(screen.getByText("Char One")).toBeDefined();
    
    const charCard = screen.getByText("Char One").closest("div.cursor-pointer");
    expect(charCard).toBeDefined();
    fireEvent.click(charCard!);

    const buttons = Array.from(container.querySelectorAll("button"));
    const confirmBtn = buttons.find(b => b.className.includes("from-blue-700") && !b.disabled);
    expect(confirmBtn).toBeDefined();
    
    fireEvent.click(confirmBtn!);
    expect(mockOnSelectInspectorRole).toHaveBeenCalledWith("c1");
  });

  it("позволяет сворачивать модалку для осмотра поля", () => {
    const { container } = render(<InspectorChoiceModal {...defaultProps} />);
    
    const modalContainer = container.querySelector(".max-w-md");
    expect(modalContainer?.className).not.toContain("translate-y-[110%]");

    const minimizeBtn = Array.from(modalContainer?.querySelectorAll("button") || []).find(b =>
      b.querySelector('svg path[d*="M1 12s4-8"]')
    );
    expect(minimizeBtn).toBeDefined();

    fireEvent.click(minimizeBtn!);
    expect(modalContainer?.className).toContain("translate-y-[110%]");

    const restoreBtn = Array.from(container.querySelectorAll("button")).find(b => 
      b.className.includes("border-blue-500/30")
    );
    expect(restoreBtn).toBeDefined();

    fireEvent.click(restoreBtn!);
    expect(modalContainer?.className).toContain("translate-y-0");
  });
});
