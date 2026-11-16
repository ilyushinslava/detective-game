import React from "react";
import { Icons } from "../ui/Icons";

export interface ModeCardProps {
  title: string;
  badge: string;
  description: string;
  actionText: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "pve" | "pvp" | "tv" | "academy";
  className?: string;
}

const VARIANT_STYLES = {
  pve: {
    borderHover: "hover:border-blue-500/50",
    shadowHover: "hover:shadow-[0_0_35px_rgba(37,99,235,0.25)]",
    focusRing: "focus:ring-blue-500/40",
    badgeBg: "bg-blue-950/70 text-blue-300 border-blue-500/30 shadow-[0_0_12px_rgba(37,99,235,0.2)]",
    iconColor: "text-zinc-300 group-hover:text-blue-400 group-hover:border-blue-500/40",
    textHover: "group-hover:text-blue-300",
  },
  pvp: {
    borderHover: "hover:border-purple-500/50",
    shadowHover: "hover:shadow-[0_0_35px_rgba(168,85,247,0.25)]",
    focusRing: "focus:ring-purple-500/40",
    badgeBg: "bg-purple-950/70 text-purple-300 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.2)]",
    iconColor: "text-zinc-300 group-hover:text-purple-400 group-hover:border-purple-500/40",
    textHover: "group-hover:text-purple-300",
  },
  tv: {
    borderHover: "hover:border-red-500/50",
    shadowHover: "hover:shadow-[0_0_35px_rgba(239,68,68,0.25)]",
    focusRing: "focus:ring-red-500/40",
    badgeBg: "bg-red-950/80 text-red-400 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]",
    iconColor: "text-red-400 group-hover:text-red-300 group-hover:border-red-500/50",
    textHover: "group-hover:text-red-300",
  },
  academy: {
    borderHover: "hover:border-amber-500/50",
    shadowHover: "hover:shadow-[0_0_35px_rgba(245,158,11,0.25)]",
    focusRing: "focus:ring-amber-500/40",
    badgeBg: "bg-amber-950/70 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    iconColor: "text-amber-400 group-hover:text-amber-300 group-hover:border-amber-500/50",
    textHover: "group-hover:text-amber-300",
  },
};

export const ModeCard: React.FC<ModeCardProps> = ({
  title,
  badge,
  description,
  actionText,
  icon,
  onClick,
  variant = "pve",
  className = "",
}) => {
  const styles = VARIANT_STYLES[variant];

  return (
    <button
      onClick={onClick}
      className={`rounded-3xl border border-white/10 ${styles.borderHover} bg-zinc-950/75 hover:bg-zinc-900/90 backdrop-blur-xl p-5 xl:p-6 flex flex-col hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl active:scale-[0.99] group text-left relative ${styles.shadowHover} focus:outline-none focus:ring-2 ${styles.focusRing} min-h-[220px] xl:min-h-[250px] ${className}`}
    >
      <div className="flex items-center justify-between w-full">
        <div className={`w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center ${styles.iconColor} transition-all shrink-0 shadow-lg`}>
          {icon}
        </div>
        <span className={`text-xs font-mono px-3 py-1 rounded-xl uppercase font-bold tracking-wider shrink-0 border ${styles.badgeBg}`}>
          {badge}
        </span>
      </div>

      <div className="flex flex-col mt-3 xl:mt-4">
        <h3 className={`font-display font-black text-xl xl:text-2xl text-white uppercase tracking-tight whitespace-normal leading-tight ${styles.textHover} transition`}>
          {title}
        </h3>
        <p className="text-xs xl:text-sm text-zinc-400 mt-2 leading-relaxed whitespace-normal line-clamp-2 xl:line-clamp-3">
          {description}
        </p>
      </div>

      <div className={`pt-3 xl:pt-4 border-t border-white/10 mt-auto flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 ${styles.textHover} transition shrink-0`}>
        <span>{actionText}</span>
        <Icons.ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
      </div>
    </button>
  );
};
