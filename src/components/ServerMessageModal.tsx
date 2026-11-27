import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

export type ServerMessageVariant = "info" | "warning" | "final";

export interface ServerMessageModalProps {
  isOpen: boolean;
  /** info — нейтральное уведомление, warning — ошибка/рассинхронизация, final — финал матча. */
  variant?: ServerMessageVariant;
  title: string;
  /** Полный текст сообщения. Обрезка (truncate) запрещена — текст виден целиком. */
  message: string;
  hint?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

const InfoIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const WarningIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const FinalIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <line x1="8" y1="8" x2="16" y2="16" />
    <line x1="16" y1="8" x2="8" y2="16" />
  </svg>
);

const VARIANT_STYLES: Record<
  ServerMessageVariant,
  { accent: string; iconWrap: string; icon: React.ReactNode }
> = {
  info: {
    accent: "border-blue-500/30 bg-gradient-to-b from-blue-950/30 via-zinc-950 to-black/95",
    iconWrap: "bg-blue-950/60 border-blue-500/50 text-blue-300",
    icon: <InfoIcon />,
  },
  warning: {
    accent: "border-rose-500/30 bg-gradient-to-b from-rose-950/30 via-zinc-950 to-black/95",
    iconWrap: "bg-rose-950/60 border-rose-500/50 text-rose-300",
    icon: <WarningIcon />,
  },
  final: {
    accent: "border-white/15 bg-gradient-to-b from-zinc-900/80 via-zinc-950 to-black/95",
    iconWrap: "bg-zinc-900/80 border-white/20 text-zinc-300",
    icon: <FinalIcon />,
  },
};

/**
 * Единая Neo-Noir модалка для серверных сообщений: рассинхронизация (SYNC_ERROR),
 * отклонённое действие (ACTION_REJECTED) и финал аннулированного матча (MATCH_ANNULLED).
 * Переиспользует UI Kit (Modal, Button) и класс `.neo-card`.
 */
export const ServerMessageModal: React.FC<ServerMessageModalProps> = ({
  isOpen,
  variant = "info",
  title,
  message,
  hint,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}) => {
  const styles = VARIANT_STYLES[variant];

  return (
    <Modal
      isOpen={isOpen}
      maxWidth="max-w-sm"
      zIndexClass="z-[160]"
      className={`items-center rounded-3xl border p-6 ${styles.accent}`}
      onClose={secondaryLabel && onSecondary ? onSecondary : undefined}
    >
      <div
        className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-4 shrink-0 ${styles.iconWrap}`}
      >
        {styles.icon}
      </div>

      <h2 className="text-lg font-black uppercase tracking-wider text-zinc-100 mb-2 leading-tight">
        {title}
      </h2>

      <p className="text-sm text-zinc-300 leading-relaxed mb-3 whitespace-pre-line break-words">
        {message}
      </p>

      {hint && (
        <p className="text-[11px] text-zinc-500 leading-relaxed mb-4 break-words">{hint}</p>
      )}

      <div className="w-full flex flex-col gap-2 mt-2">
        {primaryLabel && onPrimary && (
          <Button
            variant={variant === "warning" ? "danger" : "primary"}
            fullWidth
            onClick={onPrimary}
            className="uppercase tracking-wider font-black text-xs h-12"
          >
            {primaryLabel}
          </Button>
        )}
        {secondaryLabel && onSecondary && (
          <Button
            variant="ghost"
            fullWidth
            onClick={onSecondary}
            className="uppercase tracking-wider font-bold text-xs h-11"
          >
            {secondaryLabel}
          </Button>
        )}
      </div>
    </Modal>
  );
};
