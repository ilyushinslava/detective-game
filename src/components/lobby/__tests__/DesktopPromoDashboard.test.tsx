// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DesktopPromoDashboard } from '../DesktopPromoDashboard';

describe('DesktopPromoDashboard Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders branding title, subtitle and core pillars', () => {
    render(<DesktopPromoDashboard />);

    expect(screen.getByText('ПОД ПОДОЗРЕНИЕМ')).toBeDefined();
    expect(screen.getByText(/PRIME SUSPECT • WICKED CITY/i)).toBeDefined();
    expect(screen.getAllByText(/Маневр поля/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Тайная роль/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Authoritative Net/i)).toBeDefined();
  });

  it('renders 4 game mode presentation cards', () => {
    render(<DesktopPromoDashboard />);

    expect(screen.getByText('Маньяк против Сыщика')).toBeDefined();
    expect(screen.getByText('Полицейская облава')).toBeDefined();
    expect(screen.getByText('Война спецслужб')).toBeDefined();
    expect(screen.getByText('Очная дуэль')).toBeDefined();
  });

  it('triggers onOpenRules when clicking rules button', () => {
    const rulesSpy = vi.fn();
    render(<DesktopPromoDashboard onOpenRules={rulesSpy} />);

    const rulesBtn = screen.getByRole('button', { name: /Правила игры/i });
    expect(rulesBtn).toBeDefined();

    fireEvent.click(rulesBtn);
    expect(rulesSpy).toHaveBeenCalledTimes(1);
  });
});
