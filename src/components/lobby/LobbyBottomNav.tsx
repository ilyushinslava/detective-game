import React from "react";
import { Icons } from "../ui/Icons";
import { soundManager } from "../../utils/audio";

export interface LobbyBottomNavProps {
  currentScreen: string;
  onNavigate: (screen: "HOME" | "TABLES" | "PROFILE", tab: "LOBBY" | "TABLES" | "TOP") => void;
  labels: {
    hq: string;
    tables: string;
    profile: string;
  };
}

export const LobbyBottomNav: React.FC<LobbyBottomNavProps> = ({
  currentScreen,
  onNavigate,
  labels,
}) => {
  const isHqActive = currentScreen === "HOME" || currentScreen === "MODES";
  const isTablesActive = currentScreen === "TABLES";
  const isProfileActive = currentScreen === "PROFILE";

  return (
    <nav className="w-full shrink-0 bg-background-main/90 backdrop-blur-xl border-t border-border-subtle pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-6 flex md:hidden justify-around items-center z-40">
      <button
        type="button"
        onClick={() => {
          soundManager.play("tapMenu");
          onNavigate("HOME", "LOBBY");
        }}
        className={`flex flex-col items-center justify-start w-16 h-14 pt-1.5 pb-3 gap-1 bg-transparent border-0 transition-colors cursor-pointer relative ${
          isHqActive ? "text-accent-primary font-bold" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <Icons.Home className="w-6 h-6 shrink-0" />
        <span className="text-[9px] font-mono tracking-widest uppercase leading-none">{labels.hq}</span>
        {isHqActive && (
          <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(59,130,246,0.9)]" />
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          soundManager.play("tapMenu");
          onNavigate("TABLES", "TABLES");
        }}
        className={`flex flex-col items-center justify-start w-16 h-14 pt-1.5 pb-3 gap-1 bg-transparent border-0 transition-colors cursor-pointer relative ${
          isTablesActive ? "text-accent-primary font-bold" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <Icons.Radar className="w-6 h-6 shrink-0" />
        <span className="text-[9px] font-mono tracking-widest uppercase leading-none">{labels.tables}</span>
        {isTablesActive && (
          <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(59,130,246,0.9)]" />
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          soundManager.play("tapMenu");
          onNavigate("PROFILE", "TOP");
        }}
        className={`flex flex-col items-center justify-start w-16 h-14 pt-1.5 pb-3 gap-1 bg-transparent border-0 transition-colors cursor-pointer relative ${
          isProfileActive ? "text-accent-primary font-bold" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <Icons.User className="w-6 h-6 shrink-0" />
        <span className="text-[9px] font-mono tracking-widest uppercase leading-none">{labels.profile}</span>
        {isProfileActive && (
          <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(59,130,246,0.9)]" />
        )}
      </button>
    </nav>
  );
};
