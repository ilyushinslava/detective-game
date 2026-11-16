// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { TvNetworkDisconnectModal } from '../TvNetworkDisconnectModal';

describe('TvNetworkDisconnectModal (Network Resilience)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isOpen is false', () => {
    render(<TvNetworkDisconnectModal isOpen={false} />);
    expect(screen.queryByText(/ПОТЕРЯ СВЯЗИ С СЕРВЕРОМ/i)).toBeNull();
  });

  it('renders cinematic overlay when isOpen is true', () => {
    render(<TvNetworkDisconnectModal isOpen={true} attempt={2} maxAttempts={10} />);
    expect(screen.getByText(/ПОТЕРЯ СВЯЗИ С СЕРВЕРОМ\. ПЕРЕПОДКЛЮЧЕНИЕ\.\.\./i)).toBeDefined();
    expect(screen.getByText(/Попытка 2 из 10/i)).toBeDefined();
  });

  it('traps and blocks all D-Pad and keyboard input when active', () => {
    render(<TvNetworkDisconnectModal isOpen={true} />);

    const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
    const stopPropagationSpy = vi.spyOn(keyEvent, 'stopPropagation');
    const preventDefaultSpy = vi.spyOn(keyEvent, 'preventDefault');

    window.dispatchEvent(keyEvent);

    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('cleanly removes window listeners upon unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<TvNetworkDisconnectModal isOpen={true} />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function), true);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);
  });

  it('renders cancel button and triggers onCancel when clicked or when Escape is pressed', () => {
    const onCancelMock = vi.fn();
    render(<TvNetworkDisconnectModal isOpen={true} onCancel={onCancelMock} />);

    const cancelBtn = screen.getByTestId('connection-loss-cancel-btn');
    expect(cancelBtn).toBeDefined();

    fireEvent.click(cancelBtn);
    expect(onCancelMock).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancelMock).toHaveBeenCalledTimes(2);
  });
});
