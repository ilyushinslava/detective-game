import { describe, it, expect } from 'vitest';
import { createInitialState } from '../gameLogic';
import {
  getKillerAIMove,
  getDetectiveAIMove,
  getThiefAIMove,
  getPoliceAIMove,
  calculateNextAIMove,
} from '../aiLogic';

describe('Интеллект игрового бота (aiLogic)', () => {
  it('Бот-убийца обязан сменить ход на Сыщика после своего действия', () => {
    const state = createInitialState('SKHVATKA', 'AI', 'DETECTIVE');
    state.currentTurn = 'KILLER';

    const nextState = getKillerAIMove(state);

    expect(nextState.currentTurn).toBe('DETECTIVE');
    expect(nextState.log.length).toBeGreaterThan(state.log.length);
  });

  it('Бот-маньяк не атакует цели вне списка смертников', () => {
    const state = createInitialState('MANIAC_VS_OPERATIVE', 'AI', 'DETECTIVE');
    state.currentTurn = 'KILLER';

    const nextState = getKillerAIMove(state);

    expect(nextState.currentTurn).toBe('DETECTIVE');
    if (nextState.killCount > state.killCount) {
      const dead = nextState.board.flat().filter(c => !c.isAlive);
      const lastKilled = dead[dead.length - 1];
      const wasValidTarget = state.victimList.includes(lastKilled.id) || lastKilled.id === state.detectiveSecretId;
      expect(wasValidTarget).toBe(true);
    }
  });

  it('Бот-детектив с пустой рукой алиби делает сдвиг или обвинение без падений', () => {
    const state = createInitialState('SKHVATKA', 'AI', 'KILLER');
    state.currentTurn = 'DETECTIVE';
    state.detectiveHand = [];

    const nextState = getDetectiveAIMove(state);

    expect(nextState.currentTurn).toBe('KILLER');
  });

  it('Бот-вор и бот-полиция передают ход корректно', () => {
    const state = createInitialState('THIEF_HUNT', 'AI', 'DETECTIVE');
    const thiefMove = getThiefAIMove(state);
    expect(thiefMove.currentTurn).toBe('DETECTIVE');

    const policeMove = getPoliceAIMove(thiefMove);
    expect(policeMove.currentTurn).toBe('KILLER');
  });

  describe('Единая точка входа calculateNextAIMove', () => {
    it('1. Корректно совершает ход в MANIAC_VS_OPERATIVE (Маньяк)', () => {
      const state = createInitialState('MANIAC_VS_OPERATIVE', 'AI', 'DETECTIVE');
      state.currentTurn = 'KILLER';

      const next = calculateNextAIMove(state);
      expect(next.currentTurn).toBe('DETECTIVE');
      expect(next.log.length).toBeGreaterThan(state.log.length);
    });

    it('2. Корректно совершает ход в THIEF_HUNT (Грабитель)', () => {
      const state = createInitialState('THIEF_HUNT', 'AI', 'DETECTIVE');
      state.currentTurn = 'KILLER';

      const next = calculateNextAIMove(state);
      expect(next.currentTurn).toBe('DETECTIVE');
      expect(next.log.length).toBeGreaterThan(state.log.length);
    });

    it('3. Корректно совершает ход в SECRET_SERVICE (Шпион-бот)', () => {
      const state = createInitialState('SECRET_SERVICE', 'AI', 'KILLER');
      state.activeSpyIndex = 1; // Бот
      if (state.spies?.[1]) {
        state.spies[1].isAI = true;
      }

      const next = calculateNextAIMove(state);
      expect(next.activeSpyIndex).not.toBe(1);
      expect(next.log.length).toBeGreaterThan(state.log.length);
    });

    it('4. Корректно совершает ход в LINE_UP (Следователь / Подозреваемый)', () => {
      const state = createInitialState('LINE_UP', 'AI', 'KILLER');
      // В LINE_UP первым ходит Следователь (DETECTIVE)
      state.currentTurn = 'DETECTIVE';

      const next = calculateNextAIMove(state);
      expect(next.currentTurn).toBe('KILLER');
      expect(next.log.length).toBeGreaterThan(state.log.length);
    });
  });
});
