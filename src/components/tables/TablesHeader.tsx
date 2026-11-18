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
      <div className="flex items-center justify-between px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3.5 shrink-0 border-b border-white/[0.08] bg-gradient-to-r from-zinc-950/95 via-[#090d16]/95 to-zinc-950/95 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.7)] z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="h-9 px-2.5 bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800/80 gap-1.5 text-[10px] font-black uppercase tracking-widest shrink-0 transition shadow-md"
              title="Назад в главное меню"
            >
              <Icons.ChevronLeft />
              <span className="hidden sm:inline">Штаб</span>
            </Button>
          )}
          <div className="flex flex-col select-none min-w-0">
            <h1 className="text-base sm:text-xl font-display font-black tracking-widest uppercase bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(255,255,255,0.15)] truncate">
              Сеть // Радар операций
            </h1>
            <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase -mt-0.5 hidden xs:inline">
              Сетевой шлюз открытых и приватных комнат
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.25)] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-widest">ONLINE</span>
        </div>
      </div>

      <div className="flex border-b border-border-subtle bg-background-surface/80 px-4 sm:px-6 pt-2 pb-0 gap-3 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (soundManager?.play) soundManager.play("tapMenu");
            onTabChange("PUBLIC");
          }}
          className={`pb-2.5 px-3 text-xs font-black uppercase tracking-wider transition-all relative border-b-2 cursor-pointer select-none ${
            lobbyTab === "PUBLIC"
              ? "border-accent-primary text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span className="flex items-center gap-2">
            <Icons.Globe className={`w-3.5 h-3.5 ${lobbyTab === "PUBLIC" ? "text-accent-primary" : "text-zinc-500"}`} />
            <span>Открытые игры</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-white/10">
              {openRoomsCount}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (soundManager?.play) soundManager.play("tapMenu");
            onTabChange("PRIVATE");
          }}
          className={`pb-2.5 px-3 text-xs font-black uppercase tracking-wider transition-all relative border-b-2 cursor-pointer select-none ${
            lobbyTab === "PRIVATE"
              ? "border-accent-purple text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span className="flex items-center gap-2">
            <Icons.Lock className={`w-3.5 h-3.5 ${lobbyTab === "PRIVATE" ? "text-accent-purple" : "text-zinc-500"}`} />
            <span>Приватные игры</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-white/10">
              {privateRoomsCount}
            </span>
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
