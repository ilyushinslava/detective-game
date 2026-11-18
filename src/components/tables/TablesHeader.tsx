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
  onToggleMockRooms?: () => void;
  useMockRooms?: boolean;
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
  onToggleMockRooms,
  useMockRooms,
}) => {
  return (
    <header className="w-full shrink-0 bg-background-main/80 backdrop-blur-xl border-b border-border-subtle flex flex-col z-10">
      {/* Верхний ряд: Навигация и заголовок + сегмент-контрол вкладок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="h-8 px-2 bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08] gap-1 text-[10px] font-bold uppercase tracking-widest shrink-0 transition cursor-pointer rounded-lg"
              title="Назад в главное меню"
            >
              <Icons.ChevronLeft />
              <span className="hidden sm:inline">Меню</span>
            </Button>
          )}
          <div className="flex items-center gap-2.5 select-none min-w-0">
            <h1 className="text-base sm:text-lg font-display font-black tracking-widest uppercase text-white truncate">
              Сетевая игра
            </h1>
            {import.meta.env.DEV && onToggleMockRooms && (
              <button
                type="button"
                onClick={onToggleMockRooms}
                className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase transition cursor-pointer select-none shrink-0 ${
                  useMockRooms
                    ? "bg-blue-500/20 text-blue-300 border-blue-400/40"
                    : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
                }`}
                title="Переключить тестовые столы"
              >
                {useMockRooms ? "🧪 Демо: 12" : "🧪 Демо"}
              </button>
            )}
          </div>
        </div>

        {/* Стеклянный сегмент-контрол вкладок */}
        <div className="flex items-center gap-1.5 bg-background-surface/30 p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              if (soundManager?.play) soundManager.play("tapMenu");
              onTabChange("PUBLIC");
            }}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none flex items-center justify-center gap-2 ${
              lobbyTab === "PUBLIC"
                ? "bg-background-panel rounded-xl shadow-lg border border-white/10 text-white"
                : "bg-transparent text-zinc-500 hover:text-zinc-300 border border-transparent"
            }`}
          >
            <Icons.Globe className={`w-3.5 h-3.5 transition-colors ${lobbyTab === "PUBLIC" ? "text-accent-neon" : "text-zinc-500"}`} />
            <span className={lobbyTab === "PUBLIC" ? "text-white drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" : ""}>Открытые игры</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border transition-colors ${
              lobbyTab === "PUBLIC" ? "bg-accent-neon/20 text-cyan-200 border-accent-neon/30" : "bg-white/[0.04] text-zinc-500 border-white/5"
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
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none flex items-center justify-center gap-2 ${
              lobbyTab === "PRIVATE"
                ? "bg-background-panel rounded-xl shadow-lg border border-white/10 text-white"
                : "bg-transparent text-zinc-500 hover:text-zinc-300 border border-transparent"
            }`}
          >
            <Icons.Lock className={`w-3.5 h-3.5 transition-colors ${lobbyTab === "PRIVATE" ? "text-accent-neon" : "text-zinc-500"}`} />
            <span className={lobbyTab === "PRIVATE" ? "text-white drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" : ""}>Приватные игры</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border transition-colors ${
              lobbyTab === "PRIVATE" ? "bg-accent-neon/20 text-cyan-200 border-accent-neon/30" : "bg-white/[0.04] text-zinc-500 border-white/5"
            }`}>
              {privateRoomsCount}
            </span>
          </button>
        </div>
      </div>

      {/* Компактная линейка фильтров */}
      <div className="w-full flex items-center justify-center flex-wrap gap-2.5 px-4 sm:px-6 py-2 border-t border-white/[0.04] shrink-0">
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
              className={`h-6 px-3 text-[10px] font-mono font-bold uppercase tracking-wider rounded-md transition-colors duration-150 cursor-pointer select-none shrink-0 border focus:outline-none active:scale-95 ${
                isActive
                  ? "bg-white/15 text-white border-white/20 shadow-xs"
                  : "bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border-transparent"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
