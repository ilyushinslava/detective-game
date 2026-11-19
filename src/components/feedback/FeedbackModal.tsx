import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Icons } from "../ui/Icons";
import { soundManager } from "../../utils/audio";
import { triggerHaptic } from "../../utils/haptics";
import { supabase } from "../../lib/supabase";
import { useAuthSafe } from "../../contexts/AuthContext";
import { GAME_CONFIG } from "../../config/gameConfig";

export type FeedbackCategory = "bug" | "idea" | "other";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: FeedbackCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "bug", label: "Ошибка", icon: Icons.AlertCircle },
  { id: "idea", label: "Идея", icon: Icons.Lightbulb },
  { id: "other", label: "Другое", icon: Icons.MessageSquare },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthSafe();
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setMessage("");
    setCategory("bug");
    setIsSubmitted(false);
    setErrorMessage(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    soundManager.play("tapMenu");
    resetForm();
    onClose();
  };

  const handleCategorySelect = (cat: FeedbackCategory) => {
    soundManager.play("tapMenu");
    triggerHaptic("light");
    setCategory(cat);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 3 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: user?.id ?? null,
        category,
        message: trimmed,
        app_version: GAME_CONFIG.VERSION,
        metadata: {
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          screenWidth: typeof window !== "undefined" ? window.innerWidth : 0,
          screenHeight: typeof window !== "undefined" ? window.innerHeight : 0,
        },
      });

      if (error) {
        throw error;
      }

      soundManager.play("confirm");
      triggerHaptic("success");
      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err?.message || "Не удалось отправить сообщение. Попробуйте позже.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = message.trim().length >= 3 && message.length <= 1000;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      showCloseButton={true}
      maxWidth="max-w-md"
      className="text-left"
    >
      {isSubmitted ? (
        <div className="py-6 flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Icons.Check className="w-7 h-7 text-blue-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black uppercase tracking-wider text-white">
              Сообщение отправлено
            </h3>
            <p className="text-xs font-mono text-zinc-400 max-w-xs leading-relaxed">
              Спасибо за обратную связь! Ваш отзыв поможет сделать игру лучше.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleClose}
            className="w-full mt-2"
          >
            Отлично
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Icons.MessageSquare className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Обратная связь
              </h2>
              <p className="text-[10px] font-mono text-zinc-400">
                Сообщите об ошибке или предложите идею
              </p>
            </div>
          </div>

          {/* Выбор темы (монохромные иконки, 0 эмодзи) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
              Тема обращения
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-mono font-bold uppercase tracking-wider cursor-pointer touch-manipulation select-none ${
                      isSelected
                        ? "bg-blue-600/20 border-blue-500/50 text-white shadow-sm"
                        : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isSelected ? "text-blue-400" : "text-zinc-400"}`} />
                    <span className="text-[11px]">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Текстовое поле */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                Текст сообщения
              </label>
              <span className="text-[10px] font-mono text-zinc-500">
                {message.length} / 1000
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите проблему или предложение..."
              maxLength={1000}
              rows={4}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 custom-scrollbar resize-none touch-manipulation"
            />
          </div>

          {/* Ошибка валидации или отправки (без truncate) */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono leading-relaxed whitespace-normal break-words">
              {errorMessage}
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              type="button"
              onClick={handleClose}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Отправка..." : "Отправить"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
