// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { LiquidBackground } from '../LiquidBackground';

describe('LiquidBackground', () => {
  it('рендерит фоновый контейнер с аппаратным ускорением и animate-liquid', () => {
    const { container } = render(<LiquidBackground className="test-bg" />);
    const root = container.firstElementChild as HTMLElement;

    expect(root).toBeDefined();
    expect(root.className).toContain('fixed');
    expect(root.className).toContain('inset-0');
    expect(root.className).toContain('pointer-events-none');
    expect(root.className).toContain('test-bg');

    const animatedLayer = root.querySelector('.animate-liquid');
    expect(animatedLayer).not.toBeNull();
    expect(animatedLayer?.className).toContain('bg-[length:200%_200%]');
  });
});
