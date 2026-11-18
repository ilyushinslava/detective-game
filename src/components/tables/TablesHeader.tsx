import React from "react";
import { Button } from "../ui/Button";

const Icons = {
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  Lock: ({ className = "w-3.5 h-3.5 text-zinc-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Globe: ({ className = "w-3.5 h-3.5 text-zinc-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
};

interface TablesHeaderProps {
  onBack?: () => void;
  lobbyTab: "PUBLIC" | "PRIVATE";
  onTabChange: (tab: "PUBLIC" | "PRIVATE") => void;
  openRoomsCount: number;
  privateRoomsCount: number;
  roomFilter: string;
  onFilterChange: (filter: string) => void;
  roomFilters: Array<{ id: string; label: string }>;
  soundManager?: any;
}

export const TablesHeader: React.FC<TablesHeaderProps> = ({
  onBack,
  lobbyTab,
  onTabChange,
  openRoomsCount,
  privateRoomsCount,
  roomFilter,
  onFilterChange,
  roomFilters,
  soundManager,
}) => {
  return (
    <>
      <div className="flex items-center gap-3 px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-white/10 bg-zinc-950/40 backdrop-blur-md z-10 min-w-0">
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="h-9 px-2.5 bg-zinc-900/60 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800/60 gap-1.5 text-[10px] font-black uppercase tracking-widest shrink-0 transition cursor-pointer"
            title="Назад в главное меню"
          >
            <Icons.ChevronLeft />
            <span className="hidden sm:inline">Штаб</span>
          </Button>
        )}
        <div className="flex flex-col select-none min-w-0">
          <h1 className="text-base sm:text-xl font-display font-black tracking-widest uppercase text-white truncate">
            Сеть // Радар операций
          </h1>
          <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase -mt-0.5 hidden xs:inline">
            Сетевой шлюз открытых и приватных комнат
          </span>
        </div>
      </div>

      <div className="flex border-b border-border-subtle bg-background-surface/80 px-4 sm:px-6 py-2 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (soundManager?.play) soundManager.play("tapMenu");
            onTabChange("PUBLIC");
          }}
          className={`py-2 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer select-none flex items-center gap-2 ${
            lobbyTab === "PUBLIC"
              ? "bg-accent-primary/15 text-white border border-accent-primary/40 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <Icons.Globe className={`w-3.5 h-3.5 ${lobbyTab === "PUBLIC" ? "text-accent-primary" : "text-zinc-500"}`} />
          <span>Открытые игры</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            lobbyTab === "PUBLIC" ? "bg-accent-primary/25 text-blue-200 border-accent-primary/30" : "bg-zinc-900 text-zinc-400 border-white/10"
          }`}>
            {openRoomsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (soundManager?.play) soundManager.play("tapMenu");
            onTabChange("PRIVATE");
          }}
          className={`py-2 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer select-none flex items-center gap-2 ${
            lobbyTab === "PRIVATE"
              ? "bg-accent-primary/15 text-white border border-accent-primary/40 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <Icons.Lock className={`w-3.5 h-3.5 ${lobbyTab === "PRIVATE" ? "text-accent-primary" : "text-zinc-500"}`} />
          <span>Приватные игры</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            lobbyTab === "PRIVATE" ? "bg-accent-primary/25 text-blue-200 border-accent-primary/30" : "bg-zinc-900 text-zinc-400 border-white/10"
          }`}>
            {privateRoomsCount}
          </span>
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 sm:px-6 py-2.5 shrink-0 border-b border-white/5 bg-zinc-950/40 w-full items-center justify-center">
        {roomFilters.map((filter) => {
          const isActive = roomFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => {
                if (soundManager?.play) soundManager.play("tapMenu");
                onFilterChange(filter.id);
              }}
              className={`h-8 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-colors duration-150 cursor-pointer select-none border focus:outline-none focus-visible:outline-none active:scale-95 ${
                isActive
                  ? "bg-zinc-800 text-white border-white/20"
                  : "bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border-transparent"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </>
  );
};
