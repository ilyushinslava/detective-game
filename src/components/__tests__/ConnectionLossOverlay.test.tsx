// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ConnectionLossOverlay } from "../ConnectionLossOverlay";
import { partyService } from "../../utils/partyPeer";

vi.mock("../../utils/partyPeer", () => ({
  partyService: {
    disconnect: vi.fn(),
    ensureConnection: vi.fn(),
  },
}));

describe("ConnectionLossOverlay Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing when isOpen is false", () => {
    render(<ConnectionLossOverlay isOpen={false} />);
    expect(screen.queryByTestId("connection-loss-overlay")).toBeNull();
  });

  it("renders overlay with retry and cancel buttons when isOpen is true", () => {
    render(<ConnectionLossOverlay isOpen={true} attempt={2} maxAttempts={3} />);

    expect(screen.getByTestId("connection-loss-overlay")).toBeDefined();
    expect(screen.getByText(/ПОТЕРЯ РАДИОСВЯЗИ/i)).toBeDefined();
    expect(screen.getByText(/ВОССТАНОВЛЕНИЕ СИГНАЛА \(2\/3\)\.\.\./i)).toBeDefined();
    expect(screen.getByText(/Повторить подключение сейчас/i)).toBeDefined();
    expect(screen.getByTestId("connection-loss-cancel-btn")).toBeDefined();
  });

  it("triggers partyService.disconnect and onCancel on cancel button click", () => {
    const onCancelMock = vi.fn();
    render(<ConnectionLossOverlay isOpen={true} onCancel={onCancelMock} />);

    const cancelBtn = screen.getByTestId("connection-loss-cancel-btn");
    fireEvent.click(cancelBtn);

    expect(partyService.disconnect).toHaveBeenCalled();
    expect(onCancelMock).toHaveBeenCalled();
  });
});
