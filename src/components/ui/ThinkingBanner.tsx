import React, { useState, useEffect } from "react";

export interface ThinkingBannerProps {
  label?: string;
  className?: string;
}

export const ThinkingBanner: React.FC<ThinkingBannerProps> = ({
  label = "СИСТЕМА АНАЛИЗИРУЕТ",
  className = "",
}) => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 450);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      data-testid="ai-thinking-banner"
      className={`w-full max-w-sm mx-auto p-3 sm:p-3.5 rounded-2xl neo-card border-t-white/20 shadow-xl backdrop-blur-xl flex items-center justify-between gap-2.5 select-none ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.9)]" />
        </span>
        <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-200 truncate drop-shadow">
          {label}
          <span className="inline-block w-4 text-left font-mono text-blue-400">{dots}</span>
        </span>
      </div>
      <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-widest shrink-0 border border-white/10 px-2 py-0.5 rounded-md bg-zinc-950/80">
        [AI_PROCESSING]
      </span>
    </div>
  );
};
