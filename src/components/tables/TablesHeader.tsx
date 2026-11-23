import React, { useState, useRef, useEffect } from "react";
import { Button } from "../ui/Button";

const Icons = {
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  ChevronDown: ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-3.5 h-3.5 shrink-0 ${className}`}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  Filter: ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3.5 h-3.5 shrink-0 ${className}`}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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
  Radar: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="9" opacity="0.3" strokeDasharray="2 2" />
      <circle cx="12" cy="12" r="5" opacity="0.6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3" strokeLinecap="round" />
    </svg>
  ),
  Users: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

export type NetworkTab = "TABLES" | "FRIENDS";

interface TablesHeaderProps {
  onBack?: () => void;
  networkTab?: NetworkTab;
  onNetworkTabChange?: (tab: NetworkTab) => void;
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
  networkTab = "TABLES",
  onNetworkTabChange,
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentFilter = roomFilters.find((f) => f.id === roomFilter) || roomFilters[0] || { id: "ALL", label: "Все" };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("pointerdown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  return (
    <header className="w-full shrink-0 bg-background-main/80 backdrop-blur-xl border-b border-border-subtle flex flex-col z-10">
      {/* Верхний ряд: Навигация, главный переключатель [Столы | Друзья] и под-вкладки */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 gap-2.5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 justify-between sm:justify-start">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="h-8 px-2 bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08] gap-1 text-[10px] font-bold uppercase tracking-widest shrink-0 transition cursor-pointer rounded-lg"
                title="Назад в главное меню"
              >
                <Icons.ChevronLeft />
                <span className="hidden md:inline">Меню</span>
              </Button>
            )}

            {/* Главный сегмент-контрол раздела: [ Столы | Друзья ] (монохромные иконки, 0 эмодзи) */}
            <div className="flex items-center p-1 rounded-xl bg-background-surface/50 border border-white/5 backdrop-blur-md shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (soundManager?.play) soundManager.play("tapMenu");
                  onNetworkTabChange?.("TABLES");
                }}
                className={`py-1 px-2.5 sm:px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none touch-manipulation ${
                  networkTab === "TABLES"
                    ? "bg-background-panel text-white border border-white/10 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                <Icons.Radar className={`w-3.5 h-3.5 ${networkTab === "TABLES" ? "text-blue-400" : "text-zinc-500"}`} />
                <span>Столы</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (soundManager?.play) soundManager.play("tapMenu");
                  onNetworkTabChange?.("FRIENDS");
                }}
                className={`py-1 px-2.5 sm:px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none touch-manipulation ${
                  networkTab === "FRIENDS"
                    ? "bg-background-panel text-white border border-white/10 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                <Icons.Users className={`w-3.5 h-3.5 ${networkTab === "FRIENDS" ? "text-blue-400" : "text-zinc-500"}`} />
                <span>Друзья</span>
              </button>
            </div>
          </div>

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
              {useMockRooms ? "Демо: 12" : "Демо"}
            </button>
          )}
        </div>

        {/* Стеклянный сегмент-контрол вкладок комнат (только для вкладки TABLES) */}
        {networkTab === "TABLES" && (
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
              <Icons.Globe className={`w-3.5 h-3.5 transition-colors ${lobbyTab === "PUBLIC" ? "text-blue-400" : "text-zinc-500"}`} />
              <span className={lobbyTab === "PUBLIC" ? "text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" : ""}>Открытые игры</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border transition-colors ${
                lobbyTab === "PUBLIC" ? "bg-blue-500/15 text-blue-200 border-blue-500/30" : "bg-white/[0.04] text-zinc-500 border-white/5"
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
              <Icons.Lock className={`w-3.5 h-3.5 transition-colors ${lobbyTab === "PRIVATE" ? "text-blue-400" : "text-zinc-500"}`} />
              <span className={lobbyTab === "PRIVATE" ? "text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" : ""}>Приватные игры</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border transition-colors ${
                lobbyTab === "PRIVATE" ? "bg-blue-500/15 text-blue-200 border-blue-500/30" : "bg-white/[0.04] text-zinc-500 border-white/5"
              }`}>
                {privateRoomsCount}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Мобильная версия фильтра: только для вкладки TABLES */}
      {networkTab === "TABLES" && (
        <div className="md:hidden relative w-full px-4 py-2 border-t border-white/[0.04] shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              if (soundManager?.play) soundManager.play("tapMenu");
              setIsDropdownOpen((prev) => !prev);
            }}
            className="w-full flex items-center justify-between px-3.5 h-9 rounded-xl text-xs font-sans font-bold uppercase tracking-wider neo-button-primary transition-all duration-150 active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Icons.Filter className="text-zinc-400" />
              <span className="text-zinc-400 font-semibold shrink-0">РЕЖИМ:</span>
              <span className="text-white font-extrabold truncate">{currentFilter.label}</span>
            </div>
            <Icons.ChevronDown className={`text-zinc-400 transition-transform duration-300 ease-out ${isDropdownOpen ? "rotate-180 text-white" : ""}`} />
          </button>

          {/* Выпадающий список режимов */}
          {isDropdownOpen && (
            <div className="absolute left-4 right-4 top-full mt-1.5 z-50 rounded-2xl bg-zinc-950/95 border border-white/15 p-1.5 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] space-y-1 animate-dropdownSlideDown">
              {roomFilters.map((filter) => {
                const isSelected = roomFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => {
                      if (soundManager?.play) soundManager.play("tapMenu");
                      onFilterChange(filter.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-all duration-100 cursor-pointer text-left ${
                      isSelected
                        ? "bg-white/15 text-white border border-white/20 shadow-xs"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] border border-transparent"
                    }`}
                  >
                    <span className="truncate">{filter.label}</span>
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.8)] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Десктопная / планшетная версия: только для вкладки TABLES */}
      {networkTab === "TABLES" && (
        <div className="hidden md:flex w-full items-center justify-center gap-2 px-6 py-2 border-t border-white/[0.04] shrink-0">
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
                className={`h-7 px-3.5 text-[11px] font-sans font-bold uppercase tracking-wider rounded-lg transition-all duration-150 cursor-pointer select-none shrink-0 border focus:outline-none active:scale-95 ${
                  isActive
                    ? "bg-white/15 text-white border-white/25 shadow-xs"
                    : "bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07] border-white/5"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
