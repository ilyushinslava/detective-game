import { useEffect } from "react";

interface ToastProps {
  message: string | null;
  type?: "info" | "error" | "success";
  onClose: () => void;
  duration?: number;
}

export const Toast = ({
  message,
  type = "info",
  onClose,
  duration = 2000,
}: ToastProps) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const bgStyles =
    type === "error"
      ? "bg-red-950/90 border-red-500/40 text-red-200 shadow-red-950/50"
      : type === "success"
        ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50"
        : "bg-zinc-900/90 border-white/10 text-zinc-200 shadow-black/60";

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[120] max-w-xs sm:max-w-sm w-auto px-4 pointer-events-none transition-all">
      <div
        className={`px-3 py-1.5 rounded-full border shadow-xl text-[11px] font-mono font-medium flex items-center justify-between gap-2.5 backdrop-blur-md pointer-events-auto ${bgStyles}`}
      >
        <span className="leading-tight select-none">{message}</span>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition text-xs font-bold px-1 cursor-pointer"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
