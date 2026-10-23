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
  duration = 1500,
}: ToastProps) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const borderAccent =
    type === "error"
      ? "border-red-500/40 text-red-200"
      : type === "success"
        ? "border-emerald-500/40 text-emerald-200"
        : "border-white/15 text-zinc-200";

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[120] max-w-xs sm:max-w-sm w-auto px-4 pointer-events-none transition-all">
      <div
        onClick={onClose}
        className={`cursor-pointer active:scale-95 transition-transform backdrop-blur-md bg-zinc-950/80 border text-zinc-200 shadow-[0_4px_20px_rgba(0,0,0,0.6)] px-4 py-2 rounded-full text-xs font-mono font-medium flex items-center justify-center pointer-events-auto select-none ${borderAccent}`}
      >
        <span className="leading-tight text-center">{message}</span>
      </div>
    </div>
  );
};
