/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, within, fireEvent } from "@testing-library/react";
import { DevPanel } from "../DevPanel";

describe("DevPanel", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onForceWin: vi.fn(),
    onTriggerInspectorChoice: vi.fn(),
    onResetToMenu: vi.fn(),
    onAddCash: vi.fn(),
    onResetCash: vi.fn(),
    onToggleTurn: vi.fn(),
    onAddKill: vi.fn(),
    onTriggerIntro: vi.fn(),
    onTriggerRestartRequest: vi.fn(),
    onTriggerOpponentLeft: vi.fn(),
    onTriggerDisguiseModal: vi.fn(),
    onTriggerCaughtSpyModal: vi.fn(),
    onTriggerGameOver: vi.fn(),
    onClearSession: vi.fn(),
  };

  afterEach(() => {
    cleanup();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(<DevPanel {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders QA / Dev Control Panel header when isOpen is true", () => {
    const { container } = render(<DevPanel {...defaultProps} isOpen={true} />);
    expect(within(container).getByText(/QA \/ Dev Control Panel/i)).toBeDefined();
  });

  it("calls onForceWin and onClose when match outcome button is clicked", () => {
    const onForceWin = vi.fn();
    const onClose = vi.fn();
    const { container } = render(<DevPanel {...defaultProps} onForceWin={onForceWin} onClose={onClose} />);

    const outcomeBtn = within(container).getByText(/Схватка: Бандит/i);
    fireEvent.click(outcomeBtn);

    expect(onForceWin).toHaveBeenCalledWith("KILLER", "SKHVATKA");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onAddCash with appropriate amount when economy button is clicked", () => {
    const onAddCash = vi.fn();
    const { container } = render(<DevPanel {...defaultProps} onAddCash={onAddCash} />);

    const econHeader = within(container).getByText(/4\. Экономика и отладка/i);
    fireEvent.click(econHeader);

    const add1000Btn = within(container).getByText(/\+1,000 CR/i);
    fireEvent.click(add1000Btn);

    expect(onAddCash).toHaveBeenCalledWith(1000);
  });

  it("guarantees no amber classes in rendered markup", () => {
    const { container } = render(<DevPanel {...defaultProps} isOpen={true} />);
    expect(container.innerHTML).not.toMatch(/amber/i);

    fireEvent.click(within(container).getByText(/2\. Управление состоянием/i));
    expect(container.innerHTML).not.toMatch(/amber/i);

    fireEvent.click(within(container).getByText(/3\. Модальные окна/i));
    expect(container.innerHTML).not.toMatch(/amber/i);

    fireEvent.click(within(container).getByText(/4\. Экономика и отладка/i));
    expect(container.innerHTML).not.toMatch(/amber/i);

    fireEvent.click(within(container).getByText(/1\. Исходы матчей/i));
    expect(container.innerHTML).not.toMatch(/amber/i);
  });
});
