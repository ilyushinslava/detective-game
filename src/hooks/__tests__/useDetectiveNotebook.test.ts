// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDetectiveNotebook } from '../useDetectiveNotebook';

describe('useDetectiveNotebook Hook (Client-Only Isolation)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with empty marks and empty notes', () => {
    const { result } = renderHook(() => useDetectiveNotebook('test_session_1'));
    expect(result.current.marks).toEqual({});
    expect(result.current.notes).toBe('');
  });

  it('cycles character marks: NEUTRAL -> CLEARED -> SUSPECT -> NEUTRAL', () => {
    const { result } = renderHook(() => useDetectiveNotebook('test_session_1'));

    // 1st cycle: CLEARED (Оправдан / Невиновен)
    act(() => {
      result.current.cycleMark('c1');
    });
    expect(result.current.marks['c1']).toBe('CLEARED');

    // 2nd cycle: SUSPECT (Подозреваемый)
    act(() => {
      result.current.cycleMark('c1');
    });
    expect(result.current.marks['c1']).toBe('SUSPECT');

    // 3rd cycle: back to NEUTRAL
    act(() => {
      result.current.cycleMark('c1');
    });
    expect(result.current.marks['c1']).toBe('NEUTRAL');
  });

  it('persists notes and loads them across hook instances of the same session', () => {
    const { result: firstResult } = renderHook(() => useDetectiveNotebook('test_session_persist'));

    act(() => {
      firstResult.current.setMark('c15', 'SUSPECT');
      firstResult.current.setNotesText('Замечен в 3 ряду со шляпой');
    });

    const { result: secondResult } = renderHook(() => useDetectiveNotebook('test_session_persist'));
    expect(secondResult.current.marks['c15']).toBe('SUSPECT');
    expect(secondResult.current.notes).toBe('Замечен в 3 ряду со шляпой');
  });

  it('isolates notebooks between different match sessions', () => {
    const { result: sessionA } = renderHook(() => useDetectiveNotebook('match_alpha'));
    const { result: sessionB } = renderHook(() => useDetectiveNotebook('match_beta'));

    act(() => {
      sessionA.current.setMark('c7', 'SUSPECT');
      sessionA.current.setNotesText('Заметки матча А');
    });

    expect(sessionA.current.marks['c7']).toBe('SUSPECT');
    expect(sessionB.current.marks['c7']).toBeUndefined();
    expect(sessionB.current.notes).toBe('');
  });

  it('строго изолирует блокноты между игроками разных ролей в одной сессии Pass & Play', () => {
    const sessionMatchId = 'pvp_match_123';
    const { result: player1Killer } = renderHook(() => useDetectiveNotebook(sessionMatchId, 'KILLER'));
    const { result: player2Detective } = renderHook(() => useDetectiveNotebook(sessionMatchId, 'DETECTIVE'));

    act(() => {
      player1Killer.current.setMark('c3', 'SUSPECT');
      player1Killer.current.setNotesText('План ликвидации: цель Елена Соколова');
    });

    // У Игрока 1 (Маньяк) данные сохранены
    expect(player1Killer.current.marks['c3']).toBe('SUSPECT');
    expect(player1Killer.current.notes).toBe('План ликвидации: цель Елена Соколова');

    // У Игрока 2 (Сыщик) блокнот абсолютно чист и не содержит записей оппонента
    expect(player2Detective.current.marks['c3']).toBeUndefined();
    expect(player2Detective.current.notes).toBe('');

    // Игрок 2 делает свои пометки
    act(() => {
      player2Detective.current.setMark('c1', 'CLEARED');
      player2Detective.current.setNotesText('Проверено алиби Руслана Громова');
    });

    expect(player2Detective.current.marks['c1']).toBe('CLEARED');
    expect(player2Detective.current.notes).toBe('Проверено алиби Руслана Громова');
    expect(player1Killer.current.marks['c1']).toBeUndefined();
  });
});
