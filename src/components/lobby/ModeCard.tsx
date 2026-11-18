import React from "react";
import { Icons } from "../ui/Icons";

export interface ModeCardProps {
  title: string;
  description: string;
  actionText: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "pve" | "pvp" | "tv" | "online";
  wide?: boolean;
  className?: string;
}

const VARIANT_STYLES = {
  pve: {
    borderHover: "hover:border-white/25 hover:border-t-white/45",
    focusRing: "focus:ring-white/20",
    iconColor: "text-zinc-300 group-hover:text-blue-400 group-hover:border-blue-500/30",
    textHover: "group-hover:text-white",
  },
  pvp: {
    borderHover: "hover:border-white/25 hover:border-t-white/45",
    focusRing: "focus:ring-white/20",
    iconColor: "text-zinc-300 group-hover:text-blue-400 group-hover:border-blue-500/30",
    textHover: "group-hover:text-white",
  },
  tv: {
    borderHover: "hover:border-white/25 hover:border-t-rose-400/50",
    focusRing: "focus:ring-rose-500/30",
    iconColor: "text-rose-400/90 group-hover:text-rose-300 group-hover:border-rose-500/40",
    textHover: "group-hover:text-white",
  },
  online: {
    borderHover: "hover:border-white/25 hover:border-t-white/45",
    focusRing: "focus:ring-white/20",
    iconColor: "text-zinc-300 group-hover:text-cyan-400 group-hover:border-cyan-500/30",
    textHover: "group-hover:text-white",
  },
};

export const ModeCard: React.FC<ModeCardProps> = ({
  title,
  description,
  actionText,
  icon,
  onClick,
  variant = "pve",
  wide = false,
  className = "",
}) => {
  const styles = VARIANT_STYLES[variant];

  if (wide) {
    return (
      <button
        onClick={onClick}
        className={`col-span-2 neo-card-interactive rounded-2xl xl:rounded-3xl ${styles.borderHover} p-4 xl:p-5 flex flex-col justify-between hover:scale-[1.01] transition-all duration-200 cursor-pointer active:scale-[0.99] group text-left relative focus:outline-none focus:ring-2 ${styles.focusRing} ${className}`}
      >
        <div className="flex items-center gap-3.5 min-w-0 w-full">
          <div className={`w-10 h-10 xl:w-12 xl:h-12 rounded-xl xl:rounded-2xl bg-zinc-950/80 border border-white/10 flex items-center justify-center ${styles.iconColor} transition-all shrink-0 shadow-inner`}>
            {icon}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <h3 className={`font-display font-black text-lg xl:text-xl text-white uppercase tracking-tight whitespace-normal leading-tight ${styles.textHover} transition`}>
              {title}
            </h3>
            <p className="text-[11px] xl:text-xs text-zinc-400 mt-1 leading-relaxed whitespace-normal">
              {description}
            </p>
          </div>
        </div>

        <div className={`pt-2.5 xl:pt-3 border-t border-white/10 mt-3 flex items-center justify-between text-[11px] xl:text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 ${styles.textHover} transition shrink-0 w-full`}>
          <span>{actionText}</span>
          <Icons.ArrowRight className="w-3.5 h-3.5 xl:w-4 xl:h-4 group-hover:translate-x-1.5 transition-transform" />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`neo-card-interactive rounded-2xl xl:rounded-3xl ${styles.borderHover} p-4 xl:p-5 flex flex-col hover:scale-[1.015] transition-all duration-200 cursor-pointer active:scale-[0.99] group text-left relative focus:outline-none focus:ring-2 ${styles.focusRing} ${className}`}
    >
      <div className={`w-10 h-10 xl:w-12 xl:h-12 rounded-xl xl:rounded-2xl bg-zinc-950/80 border border-white/10 flex items-center justify-center ${styles.iconColor} transition-all shrink-0 shadow-inner`}>
        {icon}
      </div>

      <div className="flex flex-col mt-2.5 xl:mt-3">
        <h3 className={`font-display font-black text-lg xl:text-xl text-white uppercase tracking-tight whitespace-normal leading-tight ${styles.textHover} transition`}>
          {title}
        </h3>
        <p className="text-[11px] xl:text-xs text-zinc-400 mt-1 xl:mt-1.5 leading-relaxed whitespace-normal line-clamp-2">
          {description}
        </p>
      </div>

      <div className={`pt-2.5 xl:pt-3 border-t border-white/10 mt-3 xl:mt-4 flex items-center justify-between text-[11px] xl:text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 ${styles.textHover} transition shrink-0`}>
        <span>{actionText}</span>
        <Icons.ArrowRight className="w-3.5 h-3.5 xl:w-4 xl:h-4 group-hover:translate-x-1.5 transition-transform" />
      </div>
    </button>
  );
};
