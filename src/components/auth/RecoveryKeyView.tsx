import React, { useState } from "react";
import { Button } from "../ui/Button";
import { soundManager } from "../../utils/audio";
import { triggerHaptic } from "../../utils/haptics";

/**
 * Генерация 12-значного криптографически стойкого резервного ключа.
 * Формат: NOIR-XXXX-XXXX (без двусмысленных символов 0/O, 1/I, L).
 */
export function generateRecoveryKey(): string {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const getRandomChunk = (len: number) => {
    let chunk = "";
    for (let i = 0; i < len; i++) {
      chunk += chars[Math.floor(Math.random() * chars.length)];
    }
    return chunk;
  };
  return `NOIR-${getRandomChunk(4)}-${getRandomChunk(4)}`;
}

export interface RecoveryKeyViewProps {
  recoveryKey: string;
  login?: string;
  onComplete: () => void;
}

export const RecoveryKeyView: React.FC<RecoveryKeyViewProps> = ({
  recoveryKey,
  login,
  onComplete,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(recoveryKey);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = recoveryKey;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      soundManager.play("confirm");
      triggerHaptic("success");
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn("Failed to copy recovery key:", e);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-left select-none animate-fadeIn">
      {/* Шапка статуса */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            ПРОФИЛЬ АКТИВИРОВАН
          </h3>
          <p className="text-[10px] font-mono text-zinc-400">
            {login ? `Агент: ${login}` : "Гостевой прогресс успешно привязан"}
          </p>
        </div>
      </div>

      {/* Стилизованная перфокарта секретного ключа */}
      <div className="relative rounded-2xl bg-gradient-to-b from-zinc-950 via-zinc-900/90 to-background-surface/90 border border-accent-primary/40 p-4 sm:p-5 shadow-[0_0_30px_rgba(59,130,246,0.18)] overflow-hidden">
        {/* Декоративные перфорационные засечки */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[radial-gradient(#3b82f6_1.5px,transparent_1.5px)] bg-[size:10px_10px] opacity-40 pointer-events-none" />
        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-accent-neon/10 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-zinc-400 mb-2 border-b border-white/[0.08] pb-1.5">
          <span className="flex items-center gap-1.5 text-accent-neon">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-neon animate-pulse" />
            РЕЗЕРВНЫЙ КЛЮЧ ДОСТУПА
          </span>
          <span className="text-zinc-500 font-bold">128-BIT NOIR</span>
        </div>

        {/* Вывод ключа на формуляре */}
        <div className="my-3 py-3 px-4 rounded-xl bg-black/50 border border-accent-neon/30 text-center relative group">
          <div className="font-mono text-lg sm:text-2xl font-black tracking-[0.2em] text-accent-neon drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] select-all">
            {recoveryKey}
          </div>
          <div className="text-[8px] font-mono uppercase tracking-widest text-zinc-500 mt-1">
            Секретный код восстановления
          </div>
        </div>

        <p className="text-[10px] font-mono text-zinc-300 leading-relaxed bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
          <strong className="text-amber-400 uppercase">Внимание:</strong> мы не запрашиваем вашу почту ради конфиденциальности. Сохраните этот ключ в заметки — он позволит восстановить доступ к делу при утере пароля.
        </p>
      </div>

      {/* Кнопки действий */}
      <div className="flex flex-col gap-2 mt-1">
        <Button
          variant="secondary"
          fullWidth
          type="button"
          onClick={handleCopy}
          className={`h-10 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            copied
              ? "bg-emerald-950/70 border-emerald-500 text-emerald-300"
              : "bg-background-surface/60 border-white/10 hover:border-accent-neon/50 text-white"
          }`}
        >
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-emerald-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>КЛЮЧ СКОПИРОВАН В БУФЕР</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-zinc-400">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>СКОПИРОВАТЬ КЛЮЧ</span>
            </>
          )}
        </Button>

        <Button
          variant="primary"
          fullWidth
          type="button"
          onClick={onComplete}
          className="h-10 text-xs font-bold uppercase tracking-wider active:scale-95 cursor-pointer shadow-neon-blue"
        >
          В ШТАБ (ПРОДОЛЖИТЬ)
        </Button>
      </div>
    </div>
  );
};
