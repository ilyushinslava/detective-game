// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ControllerLobbyView } from '../ControllerLobbyView';

describe('ControllerLobbyView Component (Stage 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('отображает статус подключения к ТВ, позывной игрока и переключатель готовности', () => {
    const onToggleReady = vi.fn();
    render(
      <ControllerLobbyView
        roomCode="12345"
        isHost={false}
        myNickname="Сыщик_Тест"
        isReady={false}
        onToggleReady={onToggleReady}
        players={{
          c1: { nickname: 'Хост_Тест', isHost: true },
          c2: { nickname: 'Сыщик_Тест', isHost: false },
        }}
        readyClients={new Set()}
        selectedMode="MANIAC_VS_OPERATIVE"
        roleDistribution="RANDOM"
        canStartMatch={false}
      />
    );

    expect(screen.getByText(/ВЫ В ЛОББИ/i)).toBeDefined();
    expect(screen.getByText(/КОМНАТА #12345/i)).toBeDefined();
    expect(screen.getByText('Сыщик_Тест')).toBeDefined();

    const readyBtn = screen.getByRole('button', { name: /ПОДТВЕРДИТЬ ГОТОВНОСТЬ/i });
    expect(readyBtn).toBeDefined();

    fireEvent.click(readyBtn);
    expect(onToggleReady).toHaveBeenCalledTimes(1);
  });

  it('для хоста отображает 3 режима игры (без сломанного LINE_UP) и кнопки распределения ролей', () => {
    const onSelectMode = vi.fn();
    const onSelectRoleDistribution = vi.fn();

    render(
      <ControllerLobbyView
        roomCode="12345"
        isHost={true}
        myNickname="Хост_Тест"
        isReady={true}
        onToggleReady={vi.fn()}
        players={{
          c1: { nickname: 'Хост_Тест', isHost: true },
          c2: { nickname: 'Гость_Тест', isHost: false },
        }}
        readyClients={new Set(['c1'])}
        selectedMode="MANIAC_VS_OPERATIVE"
        onSelectMode={onSelectMode}
        roleDistribution="RANDOM"
        onSelectRoleDistribution={onSelectRoleDistribution}
        canStartMatch={false}
      />
    );

    // Должны присутствовать кнопки МАНЬЯК, ВОР, ШПИОНЫ
    expect(screen.getByText('МАНЬЯК')).toBeDefined();
    expect(screen.getByText('ВОР')).toBeDefined();
    expect(screen.getByText('ШПИОНЫ')).toBeDefined();

    // Сломанный режим LINE_UP / Очная ставка строго отсутствует
    expect(screen.queryByText(/ОЧНАЯ СТАВКА|LINE_UP/i)).toBeNull();

    // Переключение режима
    fireEvent.click(screen.getByText('ВОР'));
    expect(onSelectMode).toHaveBeenCalledWith('THIEF_HUNT');

    // Переключение распределения ролей
    fireEvent.click(screen.getByText('Я — ПРЕСТУПНИК'));
    expect(onSelectRoleDistribution).toHaveBeenCalledWith('HOST_KILLER');
  });

  it('кнопка «НАЧАТЬ МАТЧ» у хоста неактивна при неполной готовности и активна при canStartMatch', () => {
    const onStartMatch = vi.fn();

    const { rerender } = render(
      <ControllerLobbyView
        roomCode="12345"
        isHost={true}
        myNickname="Хост_Тест"
        isReady={true}
        onToggleReady={vi.fn()}
        players={{
          c1: { nickname: 'Хост_Тест', isHost: true },
          c2: { nickname: 'Гость_Тест', isHost: false },
        }}
        readyClients={new Set(['c1'])}
        selectedMode="MANIAC_VS_OPERATIVE"
        roleDistribution="RANDOM"
        canStartMatch={false}
        onStartMatch={onStartMatch}
      />
    );

    const startBtn = screen.getByTestId('controller-start-btn');
    expect(startBtn).toBeDefined();
    expect(startBtn.hasAttribute('disabled')).toBe(true);

    // Оба игрока готовы
    rerender(
      <ControllerLobbyView
        roomCode="12345"
        isHost={true}
        myNickname="Хост_Тест"
        isReady={true}
        onToggleReady={vi.fn()}
        players={{
          c1: { nickname: 'Хост_Тест', isHost: true },
          c2: { nickname: 'Гость_Тест', isHost: false },
        }}
        readyClients={new Set(['c1', 'c2'])}
        selectedMode="MANIAC_VS_OPERATIVE"
        roleDistribution="RANDOM"
        canStartMatch={true}
        onStartMatch={onStartMatch}
      />
    );

    const activeStartBtn = screen.getByTestId('controller-start-btn');
    expect(activeStartBtn).toBeDefined();
    expect(activeStartBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(activeStartBtn);
    expect(onStartMatch).toHaveBeenCalledTimes(1);
  });
});
