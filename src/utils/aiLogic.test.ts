import { describe, it, expect } from 'vitest';
import { createInitialState } from './gameLogic';
import { getKillerAIMove, getDetectiveAIMove, getSecretServiceAIMove } from './aiLogic';

describe('Интеллект игрового бота (aiLogic)', () => {
  it('Бот-убийца обязан сменить ход на Сыщика после своего действия', () => {
    const state = createInitialState('SKHVATKA', 'AI', 'DETECTIVE');
    state.currentTurn = 'KILLER';

    const nextState = getKillerAIMove(state);

    expect(nextState.currentTurn).toBe('DETECTIVE');
    expect(nextState.log.length).toBeGreaterThan(state.log.length);
  });

  it('Бот-маньяк не зависает и не атакует цели вне списка смертников', () => {
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

  it('Бот-детектив с пустой рукой алиби не падает с ошибкой и делает сдвиг или обвинение', () => {
    const state = createInitialState('SKHVATKA', 'AI', 'KILLER');
    state.currentTurn = 'DETECTIVE';
    state.detectiveHand = []; // пустая рука

    const nextState = getDetectiveAIMove(state);

    expect(nextState.currentTurn).toBe('KILLER');
  });

  it('Бот-шпион в «Секретной службе» делает валидный ход и передает очередь', () => {
    const state = createInitialState('SECRET_SERVICE', 'AI', 'KILLER');
    state.currentTurn = 'DETECTIVE';

    const nextState = getSecretServiceAIMove(state);

    expect(nextState.currentTurn).toBe('KILLER');
    expect(nextState.log.length).toBeGreaterThan(state.log.length);
  });
});
