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
  duration = 3000,
}: ToastProps) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const bgStyles =
    type === "error"
      ? "bg-red-950/95 border-red-700 text-red-200"
      : type === "success"
        ? "bg-emerald-950/95 border-emerald-700 text-emerald-200"
        : "bg-zinc-900/95 border-zinc-700 text-zinc-200";

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[90%] pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
      <div
        className={`px-4 py-3 rounded-xl border shadow-2xl text-xs font-bold flex items-center justify-between gap-3 backdrop-blur-md ${bgStyles}`}
      >
        <span className="truncate">{message}</span>
        <button
          onClick={onClose}
          className="pointer-events-auto text-zinc-400 hover:text-zinc-200 text-sm font-black p-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
};