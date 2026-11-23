import { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '../utils/storage';

export type CharacterNoteStatus = 'NEUTRAL' | 'SUSPECT' | 'CLEARED';

export interface DetectiveNotebookData {
  marks: Record<string, CharacterNoteStatus>;
  notes: string;
}

const DEFAULT_NOTEBOOK: DetectiveNotebookData = {
  marks: {},
  notes: '',
};

/**
 * useDetectiveNotebook — строго локальный клиентский блокнот игрока.
 * Данные не передаются через WebSocket, не попадают в GameState и не отображаются на ТВ.
 */
export function useDetectiveNotebook(
  sessionKeyOrState: string | { sessionId?: string; roomId?: string; gameMode?: string; board?: any[][] } = 'default',
  role?: string
) {
  const storageKey = useMemo(() => {
    let baseKey = 'default';
    if (typeof sessionKeyOrState === 'string') {
      baseKey = sessionKeyOrState;
    } else if (sessionKeyOrState && typeof sessionKeyOrState === 'object') {
      const state = sessionKeyOrState;
      baseKey =
        state.roomId ||
        state.sessionId ||
        `${state.gameMode || 'game'}_${state.board?.[0]?.[0]?.id || 'session'}`;
    }
    const roleKey = role ? `_${role}` : '';
    return `requiem_notebook_${baseKey}${roleKey}`;
  }, [sessionKeyOrState, role]);

  const [notebook, setNotebook] = useState<DetectiveNotebookData>(() => {
    return storage.getSyncItem<DetectiveNotebookData>(storageKey, DEFAULT_NOTEBOOK);
  });

  useEffect(() => {
    const loaded = storage.getSyncItem<DetectiveNotebookData>(storageKey, DEFAULT_NOTEBOOK);
    setNotebook(loaded);
  }, [storageKey]);

  // Циклическое переключение: NEUTRAL -> CLEARED (Невиновен) -> SUSPECT (Подозреваемый) -> NEUTRAL
  const cycleMark = useCallback((characterId: string) => {
    setNotebook((prev) => {
      const current = prev.marks[characterId] || 'NEUTRAL';
      let next: CharacterNoteStatus = 'NEUTRAL';
      if (current === 'NEUTRAL') next = 'CLEARED';
      else if (current === 'CLEARED') next = 'SUSPECT';
      else next = 'NEUTRAL';

      const updated: DetectiveNotebookData = {
        ...prev,
        marks: {
          ...prev.marks,
          [characterId]: next,
        },
      };
      storage.setSyncAndPersist(storageKey, updated);
      return updated;
    });
  }, [storageKey]);

  const setMark = useCallback((characterId: string, status: CharacterNoteStatus) => {
    setNotebook((prev) => {
      const updated: DetectiveNotebookData = {
        ...prev,
        marks: {
          ...prev.marks,
          [characterId]: status,
        },
      };
      storage.setSyncAndPersist(storageKey, updated);
      return updated;
    });
  }, [storageKey]);

  const setNotesText = useCallback((notes: string) => {
    setNotebook((prev) => {
      const updated: DetectiveNotebookData = { ...prev, notes };
      storage.setSyncAndPersist(storageKey, updated);
      return updated;
    });
  }, [storageKey]);

  const clearNotebook = useCallback(() => {
    setNotebook(DEFAULT_NOTEBOOK);
    storage.setSyncAndPersist(storageKey, DEFAULT_NOTEBOOK);
  }, [storageKey]);

  return {
    marks: notebook.marks,
    notes: notebook.notes,
    cycleMark,
    setMark,
    setNotesText,
    updateNote: setNotesText,
    clearNotebook,
  };
}
