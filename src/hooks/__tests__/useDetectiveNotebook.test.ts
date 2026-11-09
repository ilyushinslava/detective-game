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
});
