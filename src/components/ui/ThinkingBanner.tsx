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
      className={`w-full max-w-sm mx-auto p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-blue-950/90 to-purple-950/80 border border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.35)] backdrop-blur-xl flex items-center justify-between gap-2.5 animate-pulse select-none ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
        </span>
        <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-cyan-200 truncate drop-shadow">
          {label}
          <span className="inline-block w-4 text-left font-mono">{dots}</span>
        </span>
      </div>
      <span className="text-[9px] sm:text-[10px] font-mono text-cyan-400/70 font-bold uppercase tracking-widest shrink-0 border border-cyan-500/20 px-1.5 py-0.5 rounded-md bg-black/40">
        [AI_PROCESSING]
      </span>
    </div>
  );
};
