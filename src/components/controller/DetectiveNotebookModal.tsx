import React from 'react';
import type { Character } from '../../types/game';
import type { CharacterNoteStatus } from '../../hooks/useDetectiveNotebook';

export interface DetectiveNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  marks: Record<string, CharacterNoteStatus>;
  notes: string;
  onCycleMark: (characterId: string) => void;
  onSetMark: (characterId: string, status: CharacterNoteStatus) => void;
  onSetNotesText: (notes: string) => void;
  onClearNotebook: () => void;
}

const Icons = {
  Close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Book: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-blue-400">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5 text-blue-400">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5 text-rose-500">
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

export const DetectiveNotebookModal: React.FC<DetectiveNotebookModalProps> = ({
  isOpen,
  onClose,
  characters,
  marks,
  notes,
  onCycleMark,
  onSetNotesText,
  onClearNotebook,
}) => {
  if (!isOpen) return null;

  const clearedCount = Object.values(marks).filter((m) => m === 'CLEARED').length;
  const suspectCount = Object.values(marks).filter((m) => m === 'SUSPECT').length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md select-none font-sans animate-fadeIn">
      <div className="w-full max-w-lg max-h-[92dvh] rounded-t-3xl sm:rounded-3xl bg-zinc-950 border border-white/15 flex flex-col shadow-2xl overflow-hidden">
        {/* Шапка блокнота */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <Icons.Book />
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                Блокнот расследования
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">
                Личные пометки • Доступно только вам
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer active:scale-95"
            aria-label="Закрыть блокнот"
          >
            <Icons.Close />
          </button>
        </div>

        {/* Сводка счётчиков отметок */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-900/30 border-b border-zinc-800/60 text-xs text-center font-sans">
          <div className="p-2 rounded-xl bg-zinc-900/80 border border-white/5">
            <span className="text-[10px] text-zinc-400 uppercase block font-semibold">Всего в деле</span>
            <span className="text-xs font-black text-white">{characters.length}</span>
          </div>
          <div className="p-2 rounded-xl bg-blue-950/40 border border-blue-900/40">
            <span className="text-[10px] text-blue-300 uppercase block font-semibold">Невиновны</span>
            <span className="text-xs font-black text-blue-400">{clearedCount}</span>
          </div>
          <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-900/40">
            <span className="text-[10px] text-rose-300 uppercase block font-semibold">Подозреваемые</span>
            <span className="text-xs font-black text-rose-400">{suspectCount}</span>
          </div>
        </div>

        {/* Скроллируемая область: список персонажей и текстовое поле */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center justify-between">
              <span>Список персонажей (тап для смены статуса)</span>
              <span className="text-[10px] text-zinc-500 font-normal">Тап: [?] ➔ [✕] ➔ [!]</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {characters.map((char) => {
                const mark = marks[char.id] || 'NEUTRAL';
                const isCleared = mark === 'CLEARED';
                const isSuspect = mark === 'SUSPECT';

                return (
                  <button
                    key={char.id}
                    onClick={() => onCycleMark(char.id)}
                    className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer active:scale-[0.98] ${
                      isCleared
                        ? 'bg-blue-950/40 border-blue-600/70 shadow-[0_0_12px_rgba(37,99,235,0.25)]'
                        : isSuspect
                          ? 'bg-rose-950/40 border-rose-600/70 shadow-[0_0_12px_rgba(225,29,72,0.25)]'
                          : 'bg-zinc-900/70 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="font-mono text-xs font-bold text-zinc-400 shrink-0">
                        #{char.id.replace('c', '').padStart(2, '0')}
                      </span>
                      <span className={`text-xs font-bold truncate ${
                        isCleared ? 'text-blue-200 line-through' : isSuspect ? 'text-rose-200' : 'text-zinc-200'
                      }`}>
                        {char.name}
                      </span>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isCleared && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-900/60 border border-blue-500/50 text-[10px] font-bold text-blue-200">
                          <Icons.Check />
                          Невиновен
                        </span>
                      )}
                      {isSuspect && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-900/60 border border-rose-500/50 text-[10px] font-bold text-rose-200">
                          <Icons.Alert />
                          Подозрение
                        </span>
                      )}
                      {!isCleared && !isSuspect && (
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-[10px] font-medium text-zinc-400 border border-white/5">
                          Без метки
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Личные текстовые заметки */}
          <div className="pt-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Личные заметки и версии
            </label>
            <textarea
              value={notes}
              onChange={(e) => onSetNotesText(e.target.value)}
              placeholder="Записывайте подозрения, исключенные ряды, алиби или версии..."
              rows={3}
              className="w-full p-3 rounded-2xl bg-zinc-900/90 border border-white/10 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition resize-none font-sans"
            />
          </div>
        </div>

        {/* Подвал блокнота */}
        <div className="p-3 sm:p-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <button
            onClick={onClearNotebook}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition font-medium cursor-pointer"
          >
            Сбросить все метки
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition cursor-pointer active:scale-95"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};

