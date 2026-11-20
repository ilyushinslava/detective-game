// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TvVictoryScreen } from '../TvVictoryScreen';
import type { Character } from '../../../types/game';

const mockKiller: Character = {
  id: 'c1',
  name: 'Виктор Морозов',
  role: 'KILLER',
  isAlive: true,
  isRevealed: false,
};

const mockDetective: Character = {
  id: 'c2',
  name: 'Анна Соколова',
  role: 'DETECTIVE',
  isAlive: true,
  isRevealed: false,
};

describe('TvVictoryScreen Component (Stage 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('отображает 10-foot экран победы детектива с разоблачением тайной личности преступника', () => {
    render(
      <TvVictoryScreen
        winner="DETECTIVE"
        mode="MANIAC_VS_OPERATIVE"
        killer={mockKiller}
        detective={mockDetective}
        killerNickname="ShadowAgent"
        detectiveNickname="InspectorSherlock"
        elapsedTime="03:45"
        turnCount={14}
        eliminatedCount={3}
        onRestart={vi.fn()}
        onExitToLobby={vi.fn()}
      />
    );

    // Заголовок победы оперативника
    expect(screen.getByText(/ПОБЕДА: ОПЕРАТИВНИК/i)).toBeDefined();
    expect(screen.getByText(/ДЕЛО УСПЕШНО РАСКРЫТО/i)).toBeDefined();

    // Разоблаченное имя преступника и его никнейм
    expect(screen.getByText('Виктор Морозов')).toBeDefined();
    expect(screen.getByText('ShadowAgent')).toBeDefined();

    // Детектив и статистика партии
    expect(screen.getByText('Анна Соколова')).toBeDefined();
    expect(screen.getByText(/InspectorSherlock/i)).toBeDefined();
    expect(screen.getByText('03:45')).toBeDefined();
    expect(screen.getByText('14')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('поддерживает навигацию D-Pad пульта ТВ: переключение фокуса и активацию по Enter', () => {
    const onRestart = vi.fn();
    const onExitToLobby = vi.fn();

    render(
      <TvVictoryScreen
        winner="KILLER"
        mode="THIEF_HUNT"
        killer={mockKiller}
        detective={mockDetective}
        onRestart={onRestart}
        onExitToLobby={onExitToLobby}
      />
    );

    expect(screen.getByText(/ПОБЕДА: ГРАБИТЕЛЬ/i)).toBeDefined();

    // Начальный фокус на RESTART -> нажатие Enter вызывает onRestart
    fireEvent.keyDown(window, { key: 'Enter', keyCode: 13 });
    expect(onRestart).toHaveBeenCalledTimes(1);

    // Нажатие ArrowRight переключает фокус на LOBBY
    fireEvent.keyDown(window, { key: 'ArrowRight', keyCode: 39 });

    // Нажатие Enter вызывает onExitToLobby
    fireEvent.keyDown(window, { key: 'Enter', keyCode: 13 });
    expect(onExitToLobby).toHaveBeenCalledTimes(1);
  });
});
