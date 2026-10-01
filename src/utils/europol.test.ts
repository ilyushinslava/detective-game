import { describe, it, expect } from 'vitest';
import { createInitialState, plantBomb, applyShield, sniperShot, killCharacter } from './gameLogic';
import { getOPGAIMove, getEuropolAIMove } from './aiLogic';

describe('Режим: Европол против ОПГ (EUROPOL_VS_OPG)', () => {
  it('Бронежилет отражает выстрел и снимается после атаки', () => {
    const state = createInitialState('EUROPOL_VS_OPG', 'AI', 'KILLER');
    // Ставим Европол на [0, 0], а цель рядом на [0, 1]
    state.detectiveSecretId = state.board[0][0].id;
    const target = state.board[0][1];

    // Навешиваем бронежилет
    const shieldedState = applyShield(state, target.id);
    expect(shieldedState.board[0][1].isShielded).toBe(true);

    // Бандит встает на [0, 2] и стреляет в соседа [0, 1]
    shieldedState.killerSecretId = state.board[0][2].id;
    const afterShot = killCharacter(shieldedState, target.id);

    expect(afterShot.board[0][1].isAlive).toBe(true);
    expect(afterShot.board[0][1].isShielded).toBe(false);
  });

  it('ОПГ закладывает мину на клетку соседа', () => {
    const state = createInitialState('EUROPOL_VS_OPG', 'AI', 'DETECTIVE');
    state.killerSecretId = state.board[1][1].id;

    const bombedState = plantBomb(state, state.board[1][2].id);
    expect(bombedState.board[1][2].hasBomb).toBe(true);
  });

  it('Снайпер поражает цель строго на дистанции 2 клеток', () => {
    const state = createInitialState('EUROPOL_VS_OPG', 'AI', 'KILLER');
    state.detectiveSecretId = state.board[0][0].id;

    const shotState = sniperShot(state, state.board[0][2].id);
    expect(shotState.board[0][2].isAlive).toBe(false);
  });

  it('Бот Европола и бот ОПГ совершают ходы без зависаний', () => {
    const state = createInitialState('EUROPOL_VS_OPG', 'AI', 'DETECTIVE');
    const opgMove = getOPGAIMove(state);
    expect(opgMove.currentTurn).toBe('DETECTIVE');

    const europolMove = getEuropolAIMove(opgMove);
    expect(europolMove.currentTurn).toBe('KILLER');
  });
});
