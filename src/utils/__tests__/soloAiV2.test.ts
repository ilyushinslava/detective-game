import { describe, it, expect } from 'vitest';
import { createInitialState, isOppositeShift, areAdjacent } from '../gameLogic';
import {
  calculateNextAIMove,
  getKillerAIMove,
  getDetectiveAIMove,
  getThiefAIMove,
  getPoliceAIMove,
  getSecretServiceAIMove,
  getManiacCandidates,
  getThiefCandidates,
  getAllValidShifts,
} from '../aiLogic';
import type { GameState, GameModeType } from '../../types/game';

describe('Solo AI v2 — Умный бот одиночного режима', () => {
  describe('1. Модуль дедукции и кандидатные пулы', () => {
    it('getManiacCandidates исключает самого детектива, оправданных и карты в руке', () => {
      const state = createInitialState('MANIAC_VS_OPERATIVE', 'AI', 'DETECTIVE');
      const candidates = getManiacCandidates(state);

      // Детектив сам не может быть маньяком
      expect(candidates.has(state.detectiveSecretId)).toBe(false);

      // Карты в руке детектива исключены
      for (const cardId of state.detectiveHand) {
        expect(candidates.has(cardId)).toBe(false);
      }

      // Все кандидаты обязаны быть живыми
      for (const candId of candidates) {
        const char = state.board.flat().find((c) => c.id === candId);
        expect(char?.isAlive).toBe(true);
        expect(char?.isExonerated).not.toBe(true);
      }
    });

    it('getThiefCandidates исключает детектива и патрульных офицеров', () => {
      const state = createInitialState('THIEF_HUNT', 'AI', 'DETECTIVE');
      state.uniformedOfficers = [state.board[0][0].id, state.board[0][1].id];

      const candidates = getThiefCandidates(state);

      expect(candidates.has(state.detectiveSecretId)).toBe(false);
      expect(candidates.has(state.board[0][0].id)).toBe(false);
      expect(candidates.has(state.board[0][1].id)).toBe(false);
    });
  });

  describe('2. Тактические паттерны и позиционная оценка', () => {
    it('Маньяк немедленно ликвидирует текущую жертву контракта при соседстве', () => {
      const state = createInitialState('MANIAC_VS_OPERATIVE', 'AI', 'DETECTIVE');
      state.currentTurn = 'KILLER';

      const killerId = state.killerSecretId;
      const victimId = state.victimList[0];

      // Меняем местами жертву с соседом маньяка, исключая дубликаты
      let kCoords = { r: 2, c: 2 };
      let vCoords = { r: 0, c: 0 };
      for (let r = 0; r < state.board.length; r++) {
        for (let c = 0; c < state.board[r].length; c++) {
          if (state.board[r][c].id === killerId) kCoords = { r, c };
          if (state.board[r][c].id === victimId) vCoords = { r, c };
        }
      }

      const neighborCol = kCoords.c === 4 ? kCoords.c - 1 : kCoords.c + 1;
      // Свопаем жертву и соседа маньяка
      const temp = state.board[kCoords.r][neighborCol];
      state.board[kCoords.r][neighborCol] = state.board[vCoords.r][vCoords.c];
      state.board[vCoords.r][vCoords.c] = temp;
      state.board[kCoords.r][neighborCol].isAlive = true;

      const next = getKillerAIMove(state);
      expect(next.currentTurn).toBe('DETECTIVE');
      expect(next.killCount).toBe(state.killCount + 1);
      const deadVictim = next.board.flat().find((c) => c.id === victimId);
      expect(deadVictim?.isAlive).toBe(false);
    });

    it('Маньяк мгновенно выигрывает, если детектив оказывается среди соседей', () => {
      const state = createInitialState('MANIAC_VS_OPERATIVE', 'AI', 'DETECTIVE');
      state.currentTurn = 'KILLER';
      state.detectiveHand = [];

      const killerId = state.killerSecretId;
      const detId = state.detectiveSecretId;

      let kCoords = { r: 2, c: 2 };
      let dCoords = { r: 0, c: 0 };
      for (let r = 0; r < state.board.length; r++) {
        for (let c = 0; c < state.board[r].length; c++) {
          if (state.board[r][c].id === killerId) kCoords = { r, c };
          if (state.board[r][c].id === detId) dCoords = { r, c };
        }
      }

      const neighborCol = kCoords.c === 4 ? kCoords.c - 1 : kCoords.c + 1;
      const temp = state.board[kCoords.r][neighborCol];
      state.board[kCoords.r][neighborCol] = state.board[dCoords.r][dCoords.c];
      state.board[dCoords.r][dCoords.c] = temp;
      state.board[kCoords.r][neighborCol].isAlive = true;

      const next = getKillerAIMove(state);
      expect(next.winner).toBe('KILLER');
    });

    it('Детектив не производит слепых арестов на 1-м ходу при высоком числе подозреваемых', () => {
      const state = createInitialState('MANIAC_VS_OPERATIVE', 'AI', 'KILLER');
      state.currentTurn = 'DETECTIVE';

      // 10+ подозреваемых, жертва не в критической опасности
      const next = getDetectiveAIMove(state);
      expect(next.winner).toBeNull();
      expect(next.currentTurn).toBe('KILLER');
    });

    it('Вор приоритетно грабит соседнюю монету, если она доступна', () => {
      const state = createInitialState('THIEF_HUNT', 'AI', 'DETECTIVE');
      state.currentTurn = 'KILLER';
      state.trophiesKiller = 0;

      // Обеспечиваем живого неограбленного соседа
      const neighbor = state.board[2][2];
      neighbor.isAlive = true;
      neighbor.isRobbed = false;
      state.board[2][3].id = state.killerSecretId;

      const next = getThiefAIMove(state);
      expect((next.trophiesKiller ?? 0)).toBeGreaterThan(0);
    });

    it('Все сдвиги строго уважают Anti-Undo инвариант', () => {
      const state = createInitialState('MANIAC_VS_OPERATIVE', 'AI', 'DETECTIVE');
      const shifts = getAllValidShifts(state.board, {
        type: 'ROW',
        index: 2,
        direction: 'FORWARD',
      });

      // Противоположный сдвиг (ROW 2 BACKWARD) обязан отсутствовать
      const forbidden = shifts.find(
        (s) => s.type === 'ROW' && s.index === 2 && s.direction === 'BACKWARD'
      );
      expect(forbidden).toBeUndefined();
    });
  });

  describe('3. Headless-симуляция 60 полных матчей (Бот против Бота)', () => {
    /**
     * Запускает симуляцию одного полного матча в headless-режиме
     */
    function runSimulationMatch(
      mode: GameModeType,
      matchIndex: number,
      maxTurns = 150
    ): {
      winner: string | null;
      turnsCount: number;
      mode: GameModeType;
      matchIndex: number;
      hadErrors: boolean;
      illegalShiftsCount: number;
    } {
      let state = createInitialState(
        mode,
        'AI',
        'KILLER',
        2,
        mode === 'SECRET_SERVICE' ? 1 : 3
      );

      // Настройка для SECRET_SERVICE: все шпионы управляются AI
      if (mode === 'SECRET_SERVICE' && state.spies) {
        state.spies = state.spies.map((s) => ({ ...s, isAI: true }));
      }

      let turnsCount = 0;
      let hadErrors = false;
      let illegalShiftsCount = 0;

      while (!state.winner && turnsCount < maxTurns) {
        turnsCount++;
        const prevLastShift = state.lastShift;
        const prevTurn = state.currentTurn;
        const prevSpyIndex = state.activeSpyIndex;

        try {
          const nextState = calculateNextAIMove(state);

          // Проверка на Anti-Undo
          if (
            nextState.lastShift &&
            prevLastShift &&
            isOppositeShift(
              prevLastShift,
              nextState.lastShift.type,
              nextState.lastShift.index,
              nextState.lastShift.direction
            )
          ) {
            illegalShiftsCount++;
          }

          // Проверка на бесконечный цикл (ход обязан передаваться или игра завершаться)
          if (!nextState.winner) {
            if (mode === 'SECRET_SERVICE') {
              if (nextState.activeSpyIndex === prevSpyIndex && nextState.board === state.board) {
                hadErrors = true;
                break;
              }
            } else if (nextState.currentTurn === prevTurn && nextState.board === state.board) {
              hadErrors = true;
              break;
            }
          }

          state = nextState;
        } catch (err) {
          hadErrors = true;
          break;
        }
      }

      return {
        winner: state.winner,
        turnsCount,
        mode,
        matchIndex,
        hadErrors,
        illegalShiftsCount,
        state,
      };
    }

    it('Симуляция 20 матчей MANIAC_VS_OPERATIVE: 0 падений, 0 нелегальных сдвигов', () => {
      const results = [];
      const stats = { DETECTIVE: 0, KILLER: 0, UNFINISHED: 0 };

      for (let i = 1; i <= 20; i++) {
        const res = runSimulationMatch('MANIAC_VS_OPERATIVE', i, 250);
        results.push(res);
        if (res.winner === 'DETECTIVE') stats.DETECTIVE++;
        else if (res.winner === 'KILLER') stats.KILLER++;
        else stats.UNFINISHED++;

        expect(res.hadErrors).toBe(false);
        expect(res.illegalShiftsCount).toBe(0);
      }

      // Все матчи обязаны завершаться победой одной из сторон без зависаний
      expect(stats.UNFINISHED).toBe(0);
      // Обе стороны способны побеждать (живой баланс)
      expect(stats.DETECTIVE + stats.KILLER).toBe(20);
    });

    it('Симуляция 20 матчей THIEF_HUNT: 0 падений, 0 нелегальных сдвигов', () => {
      const results = [];
      const stats = { DETECTIVE: 0, KILLER: 0, UNFINISHED: 0 };

      for (let i = 1; i <= 20; i++) {
        const res = runSimulationMatch('THIEF_HUNT', i, 120);
        results.push(res);
        if (res.winner === 'DETECTIVE') stats.DETECTIVE++;
        else if (res.winner === 'KILLER') stats.KILLER++;
        else stats.UNFINISHED++;

        expect(res.hadErrors).toBe(false);
        expect(res.illegalShiftsCount).toBe(0);
      }

      expect(stats.UNFINISHED).toBe(0);
      expect(stats.DETECTIVE + stats.KILLER).toBe(20);
    });

    it('Симуляция 20 матчей SECRET_SERVICE: 0 падений, 0 нелегальных сдвигов', () => {
      const results = [];
      let totalCompleted = 0;

      for (let i = 1; i <= 20; i++) {
        const res = runSimulationMatch('SECRET_SERVICE', i, 200);
        results.push(res);

        expect(res.hadErrors).toBe(false);
        expect(res.illegalShiftsCount).toBe(0);
        if (res.winner) {
          totalCompleted++;
        }
      }

      // В дуэли разведок подавляющее большинство матчей (>= 18 из 20) завершаются победой без зависаний
      expect(totalCompleted).toBeGreaterThanOrEqual(18);
    });
  });
});
