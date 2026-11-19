import React from "react";
import { Button } from "../ui/Button";

interface TablesEmptyStateProps {
  lobbyTab: "PUBLIC" | "PRIVATE";
  onCreateRoom: () => void;
  onToggleMockRooms?: () => void;
  useMockRooms?: boolean;
}

export const TablesEmptyState: React.FC<TablesEmptyStateProps> = ({
  lobbyTab,
  onCreateRoom,
  onToggleMockRooms,
  useMockRooms: _useMockRooms,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-border-subtle border-t border-t-border-strong rounded-2xl bg-gradient-to-br from-background-surface/80 to-background-main/80 shadow-[inset_0_2px_25px_rgba(0,0,0,0.9)] backdrop-blur-2xl my-auto max-w-lg mx-auto w-full">
      <div className="relative mb-5 flex flex-col items-center justify-center">
        {/* Оптический видоискатель слежки */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-white/10 bg-zinc-950/80 p-3 flex items-center justify-center relative shadow-[inset_0_2px_20px_rgba(0,0,0,0.9)] backdrop-blur-md">
          {/* Угловые засечки видоискателя */}
          <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-white/30 rounded-tl-[2px]" />
          <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-white/30 rounded-tr-[2px]" />
          <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-white/30 rounded-bl-[2px]" />
          <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-white/30 rounded-br-[2px]" />

          {/* Векторный видоискатель и радиоволна полицейской частоты */}
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" className="w-full h-full text-zinc-400">
            {/* Тонкая шкала прицела */}
            <circle cx="24" cy="24" r="18" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />
            <circle cx="24" cy="24" r="11" strokeWidth="1.25" opacity="0.5" />

            {/* Осевые маркеры захвата */}
            <line x1="24" y1="3" x2="24" y2="7" strokeWidth="1.75" strokeLinecap="round" opacity="0.7" />
            <line x1="24" y1="41" x2="24" y2="45" strokeWidth="1.75" strokeLinecap="round" opacity="0.7" />
            <line x1="3" y1="24" x2="7" y2="24" strokeWidth="1.75" strokeLinecap="round" opacity="0.7" />
            <line x1="41" y1="24" x2="45" y2="24" strokeWidth="1.75" strokeLinecap="round" opacity="0.7" />

            {/* Осциллограмма полицейской частоты в центре (сканирование эфира) */}
            <path
              d="M16 24h2l1.5-4 2 8 2-6 1.5 4 2-2h3"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-400"
            />
            <circle cx="24" cy="24" r="1.5" fill="currentColor" className="text-blue-400" />
          </svg>
        </div>

        {/* Статус поиска столов */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono tracking-widest text-blue-400 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span>СВОБОДНЫХ СТОЛОВ НЕ НАЙДЕНО</span>
        </div>
      </div>
      <span className="text-xs sm:text-sm font-black tracking-widest text-zinc-200 uppercase mb-1">
        {lobbyTab === "PUBLIC" ? "Открытых комнат не найдено" : "Приватных комнат не найдено"}
      </span>
      <p className="text-[10px] sm:text-xs text-zinc-400 max-w-xs leading-relaxed mb-6 font-mono">
        {lobbyTab === "PUBLIC"
          ? "В списке комнат нет активных открытых игр. Создайте партию для подключения игроков."
          : "В списке комнат нет активных приватных игр. Создайте партию с паролем."}
      </p>
      <Button
        variant="primary"
        onClick={onCreateRoom}
        className="px-6 h-10 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95"
      >
        + Создать первый стол
      </Button>
      {import.meta.env.DEV && onToggleMockRooms && (
        <button
          type="button"
          onClick={onToggleMockRooms}
          className="mt-3 text-[10px] font-mono text-zinc-400 hover:text-blue-400 underline underline-offset-4 cursor-pointer transition"
        >
          🧪 Заполнить тестовыми столами (12 шт)
        </button>
      )}
    </div>
  );
};
