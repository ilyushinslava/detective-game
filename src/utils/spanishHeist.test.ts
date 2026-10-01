import { describe, it, expect } from 'vitest';
import { createInitialState, crackVault, lockVault } from './gameLogic';
import { getHeistRobberAIMove, getHeistSecurityAIMove } from './aiLogic';

describe('Режим: Ограбление по-испански (SPANISH_HEIST)', () => {
  it('В режиме испанского ограбления 4 угла являются хранилищами', () => {
    const state = createInitialState('SPANISH_HEIST', 'AI', 'DETECTIVE');
    expect(state.board[0][0].isVault).toBe(true);
    expect(state.board[0][4].isVault).toBe(true);
    expect(state.board[4][0].isVault).toBe(true);
    expect(state.board[4][4].isVault).toBe(true);
  });

  it('Грабитель успешно взламывает соседний сейф', () => {
    const state = createInitialState('SPANISH_HEIST', 'AI', 'DETECTIVE');
    // Ставим грабителя рядом с углом [0,0]
    state.killerSecretId = state.board[0][1].id;
    const target = state.board[0][0];

    const crackedState = crackVault(state, target.id);
    expect(crackedState.trophiesKiller).toBe(1);
    expect(crackedState.board[0][0].isVaultCracked).toBe(true);
  });

  it('Охрана блокирует доступ к сейфу сигнализацией', () => {
    const state = createInitialState('SPANISH_HEIST', 'AI', 'KILLER');
    state.detectiveSecretId = state.board[0][1].id;
    const target = state.board[0][0];

    const lockedState = lockVault(state, target.id);
    expect(lockedState.board[0][0].isVaultLocked).toBe(true);
  });

  it('Бот-грабитель и бот-охрана выполняют валидные ходы', () => {
    const state = createInitialState('SPANISH_HEIST', 'AI', 'DETECTIVE');
    const robberMove = getHeistRobberAIMove(state);
    expect(robberMove.currentTurn).toBe('DETECTIVE');

    const securityMove = getHeistSecurityAIMove(robberMove);
    expect(securityMove.currentTurn).toBe('KILLER');
  });
});
