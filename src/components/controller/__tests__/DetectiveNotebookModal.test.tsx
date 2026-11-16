// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DetectiveNotebookModal } from '../DetectiveNotebookModal';
import type { Character } from '../../../types/game';

const mockChars: Character[] = [
  { id: 'c1', name: 'Константин Бах', isAlive: true, isExonerated: false },
  { id: 'c2', name: 'Ольга Зайцева', isAlive: true, isExonerated: false },
  { id: 'c3', name: 'Виктор Громов', isAlive: true, isExonerated: false },
];

describe('DetectiveNotebookModal Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <DetectiveNotebookModal
        isOpen={false}
        onClose={vi.fn()}
        characters={mockChars}
        marks={{}}
        notes=""
        onCycleMark={vi.fn()}
        onSetMark={vi.fn()}
        onSetNotesText={vi.fn()}
        onClearNotebook={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders character list and triggers onCycleMark when clicking a character', () => {
    const cycleSpy = vi.fn();
    render(
      <DetectiveNotebookModal
        isOpen={true}
        onClose={vi.fn()}
        characters={mockChars}
        marks={{ c1: 'SUSPECT' }}
        notes="Заметка"
        onCycleMark={cycleSpy}
        onSetMark={vi.fn()}
        onSetNotesText={vi.fn()}
        onClearNotebook={vi.fn()}
      />
    );

    expect(screen.getByText('Блокнот расследования')).toBeDefined();
    expect(screen.getByText('Константин Бах')).toBeDefined();
    expect(screen.getByText('Подозрение')).toBeDefined();

    fireEvent.click(screen.getByText('Константин Бах'));
    expect(cycleSpy).toHaveBeenCalledWith('c1');
  });

  it('allows editing notes text and triggers onSetNotesText', () => {
    const notesSpy = vi.fn();
    render(
      <DetectiveNotebookModal
        isOpen={true}
        onClose={vi.fn()}
        characters={mockChars}
        marks={{}}
        notes="Исходная заметка"
        onCycleMark={vi.fn()}
        onSetMark={vi.fn()}
        onSetNotesText={notesSpy}
        onClearNotebook={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/Записывайте подозрения/i);
    fireEvent.change(textarea, { target: { value: 'Новая версия алиби' } });
    expect(notesSpy).toHaveBeenCalledWith('Новая версия алиби');
  });

  it('filters character list by SUSPECT (Подозрения) and CLEARED (Невиновные)', () => {
    render(
      <DetectiveNotebookModal
        isOpen={true}
        onClose={vi.fn()}
        characters={mockChars}
        marks={{ c1: 'SUSPECT', c2: 'CLEARED' }}
        notes=""
        onCycleMark={vi.fn()}
        onSetMark={vi.fn()}
        onSetNotesText={vi.fn()}
        onClearNotebook={vi.fn()}
      />
    );

    // Initial: ALL 3 characters rendered
    expect(screen.getByText('Константин Бах')).toBeDefined();
    expect(screen.getByText('Ольга Зайцева')).toBeDefined();
    expect(screen.getByText('Виктор Громов')).toBeDefined();

    // Click "Подозрения" filter button
    const suspectBtn = screen.getByRole('button', { name: /Подозрения \(1\)/i });
    fireEvent.click(suspectBtn);

    expect(screen.getByText('Константин Бах')).toBeDefined();
    expect(screen.queryByText('Ольга Зайцева')).toBeNull();
    expect(screen.queryByText('Виктор Громов')).toBeNull();

    // Click "Невиновные" filter button
    const clearedBtn = screen.getByRole('button', { name: /Невиновные \(1\)/i });
    fireEvent.click(clearedBtn);

    expect(screen.queryByText('Константин Бах')).toBeNull();
    expect(screen.getByText('Ольга Зайцева')).toBeDefined();
    expect(screen.queryByText('Виктор Громов')).toBeNull();

    // Click "Все" filter button
    const allBtn = screen.getByRole('button', { name: /Все \(3\)/i });
    fireEvent.click(allBtn);

    expect(screen.getByText('Константин Бах')).toBeDefined();
    expect(screen.getByText('Ольга Зайцева')).toBeDefined();
    expect(screen.getByText('Виктор Громов')).toBeDefined();
  });

  it('triggers onClearNotebook when clicking "Сбросить все метки"', () => {
    const clearSpy = vi.fn();
    render(
      <DetectiveNotebookModal
        isOpen={true}
        onClose={vi.fn()}
        characters={mockChars}
        marks={{ c1: 'SUSPECT' }}
        notes=""
        onCycleMark={vi.fn()}
        onSetMark={vi.fn()}
        onSetNotesText={vi.fn()}
        onClearNotebook={clearSpy}
      />
    );

    const resetBtn = screen.getByRole('button', { name: /Сбросить все метки/i });
    fireEvent.click(resetBtn);
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});
