import { describe, it, expect } from 'vitest';
import {
  isOppositeShift,
  getAdjacentCharacters,
  killCharacter,
  accuseCharacter,
  canCleanupBoard,
} from './gameLogic';
import type { Character, GameState } from '../types/game';

const createMockChar = (id: string, name: string, isAlive = true, isExonerated = false): Character => ({
  id,
  name,
  isAlive,
  isExonerated,
});

describe('Ядро правил игры (gameLogic)', () => {
  it('должно блокировать отмену хода противника (anti-undo)', () => {
    const lastShift = { type: 'ROW' as const, index: 2, direction: 'FORWARD' as const };

    expect(isOppositeShift(lastShift, 'ROW', 2, 'BACKWARD')).toBe(true);
    expect(isOppositeShift(lastShift, 'ROW', 2, 'FORWARD')).toBe(false);
    expect(isOppositeShift(lastShift, 'ROW', 1, 'BACKWARD')).toBe(false);
    expect(isOppositeShift(lastShift, 'COL', 2, 'BACKWARD')).toBe(false);
  });

  it('должно корректно находить соседей клетки (включая диагонали)', () => {
    const board: Character[][] = [
      [createMockChar('1', 'A'), createMockChar('2', 'B'), createMockChar('3', 'C')],
      [createMockChar('4', 'D'), createMockChar('5', 'E'), createMockChar('6', 'F')],
      [createMockChar('7', 'G'), createMockChar('8', 'H'), createMockChar('9', 'I')],
    ];

    const centerNeighbors = getAdjacentCharacters(board, '5');
    expect(centerNeighbors.length).toBe(8);
    expect(centerNeighbors.map((c) => c.id)).toEqual(
      expect.arrayContaining(['1', '2', '3', '4', '6', '7', '8', '9'])
    );

    const cornerNeighbors = getAdjacentCharacters(board, '1');
    expect(cornerNeighbors.length).toBe(3);
    expect(cornerNeighbors.map((c) => c.id)).toEqual(
      expect.arrayContaining(['2', '4', '5'])
    );
  });

  it('Бандит побеждает мгновенно при убийстве Инспектора', () => {
    const board: Character[][] = [
      [createMockChar('k', 'Бандит'), createMockChar('i', 'Инспектор')],
      [createMockChar('v1', 'Жертва 1'), createMockChar('v2', 'Жертва 2')],
    ];

    const state: GameState = {
      mode: 'SKHVATKA',
      board,
      currentTurn: 'KILLER',
      killerSecretId: 'k',
      detectiveSecretId: 'i',
      detectiveHand: [],
      evidenceDeck: [],
      victimList: [],
      killCount: 0,
      winner: null,
      log: [],
      lastShift: null,
      lastInterrogation: null,
    };

    const nextState = killCharacter(state, 'i');
    expect(nextState.winner).toBe('KILLER');
    expect(nextState.board[0][1].isAlive).toBe(false);
  });

  it('Бандит побеждает при наборе 14 убийств', () => {
    const board: Character[][] = [
      [createMockChar('k', 'Бандит'), createMockChar('v1', 'Жертва 1')],
      [createMockChar('v2', 'Жертва 2'), createMockChar('i', 'Инспектор')],
    ];

    const state: GameState = {
      mode: 'SKHVATKA',
      board,
      currentTurn: 'KILLER',
      killerSecretId: 'k',
      detectiveSecretId: 'i',
      detectiveHand: [],
      evidenceDeck: [],
      victimList: [],
      killCount: 13,
      winner: null,
      log: [],
      lastShift: null,
      lastInterrogation: null,
    };

    const nextState = killCharacter(state, 'v1');
    expect(nextState.killCount).toBe(14);
    expect(nextState.winner).toBe('KILLER');
  });

  it('Инспектор побеждает при верном обвинении Бандита-соседа', () => {
    const board: Character[][] = [
      [createMockChar('i', 'Инспектор'), createMockChar('k', 'Бандит')],
      [createMockChar('v1', 'Гражданин'), createMockChar('v2', 'Гражданин 2')],
    ];

    const state: GameState = {
      mode: 'SKHVATKA',
      board,
      currentTurn: 'DETECTIVE',
      killerSecretId: 'k',
      detectiveSecretId: 'i',
      detectiveHand: [],
      evidenceDeck: [],
      victimList: [],
      killCount: 0,
      winner: null,
      log: [],
      lastShift: null,
      lastInterrogation: null,
    };

    const nextState = accuseCharacter(state, 'k');
    expect(nextState.winner).toBe('DETECTIVE');
  });

  it('Ложное обвинение оправдывает персонажа (isExonerated = true)', () => {
    const board: Character[][] = [
      [createMockChar('i', 'Инспектор'), createMockChar('v1', 'Подозреваемый')],
      [createMockChar('k', 'Бандит'), createMockChar('v2', 'Гражданин 2')],
    ];

    const state: GameState = {
      mode: 'SKHVATKA',
      board,
      currentTurn: 'DETECTIVE',
      killerSecretId: 'k',
      detectiveSecretId: 'i',
      detectiveHand: [],
      evidenceDeck: [],
      victimList: [],
      killCount: 0,
      winner: null,
      log: [],
      lastShift: null,
      lastInterrogation: null,
    };

    const nextState = accuseCharacter(state, 'v1');
    expect(nextState.winner).toBeNull();
    expect(nextState.currentTurn).toBe('KILLER');
    expect(nextState.board[0][1].isExonerated).toBe(true);
  });

  it('кнопка «Обновить» активна только если мертвый находится перед живым', () => {
    const boardNeedsCleanup: Character[][] = [
      [createMockChar('1', 'A', false), createMockChar('2', 'B', true)],
      [createMockChar('3', 'C', true), createMockChar('4', 'D', true)],
    ];
    expect(canCleanupBoard(boardNeedsCleanup)).toBe(true);

    const boardAlreadyClean: Character[][] = [
      [createMockChar('1', 'A', true), createMockChar('2', 'B', true)],
      [createMockChar('3', 'C', true), createMockChar('4', 'D', false)],
    ];
    expect(canCleanupBoard(boardAlreadyClean)).toBe(false);
  });

  it('Маньяк не может убить соседа, которого нет в списке смертников', () => {
    const board: Character[][] = [
      [createMockChar('m', 'Маньяк'), createMockChar('targetNotInList', 'Не в списке')],
      [createMockChar('v1', 'В списке'), createMockChar('op', 'Оперативник')],
    ];

    const state: GameState = {
      mode: 'MANIAC_VS_OPERATIVE',
      board,
      currentTurn: 'KILLER',
      killerSecretId: 'm',
      detectiveSecretId: 'op',
      detectiveHand: [],
      evidenceDeck: [],
      victimList: ['v1'],
      killCount: 0,
      winner: null,
      log: [],
      lastShift: null,
      lastInterrogation: null,
    };

    // Попытка убить цель вне списка смертников
    const unallowedKillState = killCharacter(state, 'targetNotInList');
    expect(unallowedKillState.killCount).toBe(0);
    expect(unallowedKillState.currentTurn).toBe('KILLER'); // Ход не сменился
    expect(unallowedKillState.board[0][1].isAlive).toBe(true);
  });
});
