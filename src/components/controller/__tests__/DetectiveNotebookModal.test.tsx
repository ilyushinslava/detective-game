// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DetectiveNotebookModal } from '../DetectiveNotebookModal';
import type { Character } from '../../../types/game';

const mockChars: Character[] = [
  { id: 'c1', name: 'Константин Бах', isAlive: true, isExonerated: false },
  { id: 'c2', name: 'Ольга Зайцева', isAlive: true, isExonerated: false },
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
});
