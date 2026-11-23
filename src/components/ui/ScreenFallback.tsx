import React from "react";

export interface ScreenFallbackProps {
  label?: string;
}

export const ScreenFallback: React.FC<ScreenFallbackProps> = ({
  label = "Загрузка модуля...",
}) => (
  <div
    role="status"
    aria-live="polite"
    className="fixed inset-0 z-50 flex items-center justify-center bg-[#080a0f] text-zinc-300 select-none"
  >
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin" />
      <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
        {label}
      </span>
    </div>
  </div>
);
