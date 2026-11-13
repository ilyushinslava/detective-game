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
    <nav className="w-full shrink-0 bg-zinc-950/90 backdrop-blur-xl border-t border-white/10 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-6 flex md:hidden justify-around items-center z-40">
      <button
        onClick={() => {
          soundManager.play("tapMenu");
          onNavigate("HOME", "LOBBY");
        }}
        className={`flex flex-col items-center gap-1.5 p-1.5 transition cursor-pointer relative ${
          isHqActive ? "text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <Icons.Home />
        <span className="text-[8px] md:text-[10px] font-mono tracking-widest uppercase">{labels.hq}</span>
        {isHqActive && (
          <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.9)]" />
        )}
      </button>

      <button
        onClick={() => {
          soundManager.play("tapMenu");
          onNavigate("TABLES", "TABLES");
        }}
        className={`flex flex-col items-center gap-1.5 p-1.5 transition cursor-pointer relative ${
          isTablesActive ? "text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <Icons.Cards />
        <span className="text-[8px] md:text-[10px] font-mono tracking-widest uppercase">{labels.tables}</span>
        {isTablesActive && (
          <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.9)]" />
        )}
      </button>

      <button
        onClick={() => {
          soundManager.play("tapMenu");
          onNavigate("PROFILE", "TOP");
        }}
        className={`flex flex-col items-center gap-1.5 p-1.5 transition cursor-pointer relative ${
          isProfileActive ? "text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <Icons.User />
        <span className="text-[8px] md:text-[10px] font-mono tracking-widest uppercase">{labels.profile}</span>
        {isProfileActive && (
          <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.9)]" />
        )}
      </button>
    </nav>
  );
};
