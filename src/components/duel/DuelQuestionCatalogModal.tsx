// src/components/duel/DuelQuestionCatalogModal.tsx
import { useState, useMemo } from "react";
import { DUEL_QUESTIONS } from "../../constants/duelQuestions";
import type { DuelCategory } from "../../types/duel";

interface DuelQuestionCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuestion: (questionId: string) => void;
}

const CATEGORY_LABELS: Record<DuelCategory | "ALL", string> = {
  ALL: "Все",
  APPEARANCE: "Внешность",
  CLOTHING: "Одежда",
  ACCESSORIES: "Аксессуары",
};

const Icons = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

export const DuelQuestionCatalogModal = ({
  isOpen,
  onClose,
  onSelectQuestion,
}: DuelQuestionCatalogModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<DuelCategory | "ALL">("ALL");
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);

  const filteredQuestions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return DUEL_QUESTIONS.filter((q) => {
      const matchCategory = selectedCategory === "ALL" || q.category === selectedCategory;
      const matchSearch =
        query === "" ||
        q.text.toLowerCase().includes(query) ||
        q.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchCategory && matchSearch;
    });
  }, [searchQuery, selectedCategory]);

  const selectedQuestion = useMemo(() => {
    return DUEL_QUESTIONS.find((q) => q.id === pendingQuestionId);
  }, [pendingQuestionId]);

  const handleClose = () => {
    setPendingQuestionId(null);
    setSearchQuery("");
    setSelectedCategory("ALL");
    onClose();
  };

  const handleConfirm = () => {
    if (pendingQuestionId) {
      onSelectQuestion(pendingQuestionId);
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center p-3 sm:p-4 select-none">
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 max-w-lg w-full mx-auto max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-lg font-black uppercase tracking-widest text-zinc-100">
            Каталог вопросов
          </h2>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer p-1"
          >
            <Icons.X />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4 shrink-0">
          <div className="absolute inset-y-0 left-3 flex items-center text-zinc-500 pointer-events-none">
            <Icons.Search />
          </div>
          <input
            type="text"
            placeholder="Поиск по тексту или тегам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              <Icons.X />
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-2 shrink-0">
          {(["ALL", "APPEARANCE", "CLOTHING", "ACCESSORIES"] as const).map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition border cursor-pointer ${
                  isActive
                    ? "bg-blue-950/60 border-blue-500/50 text-blue-200 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                    : "bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/20"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>

        {/* Question List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 min-h-0">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-xs font-mono uppercase tracking-widest">
              Вопросы не найдены
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const isSelected = pendingQuestionId === q.id;
              return (
                <div
                  key={q.id}
                  onClick={() => setPendingQuestionId(q.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${
                    isSelected
                      ? "bg-blue-950/30 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                      : "bg-zinc-900/50 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`text-sm font-bold leading-snug ${isSelected ? "text-blue-100" : "text-zinc-200"}`}>
                      {q.text}
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-zinc-950 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.8)]">
                        <Icons.Check />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                      {CATEGORY_LABELS[q.category]}
                    </span>
                    {q.tags.map((tag) => (
                      <span key={tag} className="text-[8px] font-mono text-zinc-600 uppercase">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Confirmation Footer */}
        {selectedQuestion && (
          <div className="mt-4 pt-4 border-t border-zinc-800 shrink-0 animate-in slide-in-from-bottom-4 fade-in duration-200">
            <div className="mb-3">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">
                Выбранный вопрос:
              </span>
              <span className="text-sm font-bold text-zinc-100">
                {selectedQuestion.text}
              </span>
            </div>
            <button
              onClick={handleConfirm}
              className="w-full py-3.5 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-[0_10px_25px_rgba(59,130,246,0.5)] hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
            >
              Подтвердить вопрос
            </button>
          </div>
        )}
      </div>
    </div>
  );
};