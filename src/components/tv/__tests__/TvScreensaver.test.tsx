// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { TvScreensaver } from '../TvScreensaver';

describe('TvScreensaver Component (OLED Protection)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render when isIdle is false', () => {
    render(<TvScreensaver isIdle={false} onDismiss={vi.fn()} />);
    expect(screen.queryByText(/OLED PROTECTION/i)).toBeNull();
  });

  it('renders black screen with floating logo when isIdle is true', () => {
    render(<TvScreensaver isIdle={true} onDismiss={vi.fn()} />);
    expect(screen.getByText(/OLED PROTECTION/i)).toBeDefined();
    expect(screen.getByText(/PRIME SUSPECT/i)).toBeDefined();
  });

  it('calls onDismiss and prevents event propagation on user keydown or click', () => {
    const onDismiss = vi.fn();
    render(<TvScreensaver isIdle={true} onDismiss={onDismiss} />);

    const keyEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    const stopPropagationSpy = vi.spyOn(keyEvent, 'stopPropagation');
    const preventDefaultSpy = vi.spyOn(keyEvent, 'preventDefault');

    window.dispatchEvent(keyEvent);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
