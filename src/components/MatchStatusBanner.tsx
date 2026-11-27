import React from "react";
import { formatRemainingMs } from "../utils/serverEvents";

export interface MatchStatusBannerProps {
  /** Сервер поставил таймер хода на паузу. */
  isTurnTimerPaused: boolean;
  /** Оставшееся время хода (мс) на момент паузы/возобновления. */
  turnTimerRemainingMs?: number | null;
  /** Оба игрока оффлайн — матч на паузе. */
  isDualDisconnectPaused: boolean;
  /** Длительность окна ожидания возвращения игроков (мс). */
  dualDisconnectGraceMs?: number | null;
}

const ClockIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="7" x2="12" y2="12" />
    <line x1="12" y1="12" x2="16" y2="14" />
  </svg>
);

const DisconnectIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <path d="M2 8.5a15 15 0 0 1 20 0" />
    <path d="M5 12a10 10 0 0 1 14 0" />
    <path d="M8.5 15.5a5 5 0 0 1 7 0" />
    <line x1="3" y1="3" x2="21" y2="21" />
  </svg>
);

/**
 * Ненавязчивый баннер состояния матча: пауза таймера хода или пауза из-за
 * двойного дисконнекта. Не блокирует управление и не мешает игровому полю.
 */
export const MatchStatusBanner: React.FC<MatchStatusBannerProps> = ({
  isTurnTimerPaused,
  turnTimerRemainingMs,
  isDualDisconnectPaused,
  dualDisconnectGraceMs,
}) => {
  if (!isTurnTimerPaused && !isDualDisconnectPaused) return null;

  const isDual = isDualDisconnectPaused;
  const graceSeconds =
    typeof dualDisconnectGraceMs === "number" && Number.isFinite(dualDisconnectGraceMs)
      ? Math.max(0, Math.ceil(dualDisconnectGraceMs / 1000))
      : null;

  return (
    <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] inset-x-0 z-[115] flex justify-center px-3 pointer-events-none select-none">
      <div
        role="status"
        aria-live="polite"
        className={`neo-card flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-md border text-[11px] font-mono font-medium tracking-wide shadow-[0_4px_20px_rgba(0,0,0,0.6)] ${
          isDual
            ? "bg-rose-950/85 border-rose-500/40 text-rose-200"
            : "bg-zinc-950/85 border-blue-500/40 text-blue-200"
        }`}
      >
        <span className={isDual ? "text-rose-400" : "text-blue-400"}>
          {isDual ? <DisconnectIcon /> : <ClockIcon />}
        </span>
        {isDual ? (
          <span>
            Матч на паузе: оба игрока оффлайн
            {graceSeconds !== null ? ` · ожидание до ${graceSeconds} с` : ""}
          </span>
        ) : (
          <span>
            Таймер хода на паузе
            {turnTimerRemainingMs !== null && turnTimerRemainingMs !== undefined
              ? ` · осталось ${formatRemainingMs(turnTimerRemainingMs)}`
              : ""}
          </span>
        )}
      </div>
    </div>
  );
};
