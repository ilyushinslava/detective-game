import React from "react";
import { Button } from "../ui/Button";

interface TablesEmptyStateProps {
  lobbyTab: "PUBLIC" | "PRIVATE";
  onCreateRoom: () => void;
}

export const TablesEmptyState: React.FC<TablesEmptyStateProps> = ({
  lobbyTab,
  onCreateRoom,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-white/10 rounded-2xl bg-black/60 shadow-[inset_0_2px_25px_rgba(0,0,0,0.9)] backdrop-blur-2xl my-auto max-w-lg mx-auto w-full">
      <div className="relative mb-5 flex items-center justify-center">
        <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
          <div className="w-16 h-16 rounded-full border border-white/15 flex items-center justify-center bg-zinc-900/60 shadow-[0_0_25px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/15 to-transparent rounded-full animate-spin" style={{ animationDuration: "4s" }} />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-zinc-300 relative z-10">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 0 1 9 9" opacity="0.6" />
              <path d="M12 7a5 5 0 0 1 5 5" opacity="0.8" />
              <line x1="12" y1="12" x2="18.5" y2="5.5" strokeWidth="2" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
        </div>
      </div>
      <span className="text-xs sm:text-sm font-black tracking-widest text-zinc-200 uppercase mb-1">
        {lobbyTab === "PUBLIC" ? "Открытых столов не найдено" : "Приватных штабов не обнаружено"}
      </span>
      <p className="text-[10px] sm:text-xs text-zinc-400 max-w-xs leading-relaxed mb-6 font-mono">
        {lobbyTab === "PUBLIC"
          ? "В эфире нет активных открытых комнат. Создайте открытую партию для свободного подключения игроков."
          : "Нет активных закрытых каналов. Создайте приватную партию с защитой 7-значным шифром Морзе."}
      </p>
      <Button
        variant="primary-info"
        onClick={onCreateRoom}
        className="from-red-600 px-6 h-10 text-xs font-bold uppercase tracking-wider shadow-lg shadow-black/50 border border-white/10"
      >
        + Создать первый стол
      </Button>
    </div>
  );
};
