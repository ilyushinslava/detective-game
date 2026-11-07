import React from 'react';
import { Button } from './ui/Button';
import { getGameModeTitle } from '../constants/gameMeta';

const Icons = {
  Coin: ({ className = "w-3.5 h-3.5 text-amber-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  Radar: ({ className = "w-7 h-7 text-cyan-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 9 9" opacity="0.6" />
      <path d="M12 7a5 5 0 0 1 5 5" opacity="0.8" />
      <line x1="12" y1="12" x2="18.5" y2="5.5" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
};

interface TablesScreenProps {
  roomFilter: string;
  setRoomFilter: (filter: string) => void;
  filteredRooms: any[];
  joinCode: string;
  setJoinCode: (code: string) => void;
  handleJoinRoom: (code: string, mode?: any) => void;
  setIsCreateRoomOpen: (open: boolean) => void;
  ROOM_FILTERS: Array<{ id: string; label: string }>;
  GAME_MODES: any[];
  soundManager?: any;
  onBack?: () => void;
}

export const TablesScreen: React.FC<TablesScreenProps> = ({
  roomFilter,
  setRoomFilter,
  filteredRooms,
  joinCode,
  setJoinCode,
  handleJoinRoom,
  setIsCreateRoomOpen,
  ROOM_FILTERS,
  GAME_MODES,
  soundManager,
  onBack,
}) => {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#080a0f] overflow-hidden relative w-full max-w-full">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-white/10 bg-[#080a0f]">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="h-9 px-2.5 text-zinc-400 hover:text-white gap-1.5 text-[10px] font-black uppercase tracking-widest shrink-0"
              title="Назад в главное меню"
            >
              <Icons.ChevronLeft />
              <span className="hidden sm:inline">Назад в штаб</span>
            </Button>
          )}
          <div className="flex flex-col select-none min-w-0">
            <h1 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-white uppercase drop-shadow-[0_2px_15px_rgba(0,0,0,0.9)] truncate">
              Оперативные столы
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-mono font-bold text-emerald-300 uppercase tracking-wider">ONLINE</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 px-4 sm:px-6 py-2.5 shrink-0 border-b border-white/5 bg-zinc-950/40 w-full">
        {ROOM_FILTERS.map((filter) => {
          const isActive = roomFilter === filter.id;
          return (
            <Button
              key={filter.id}
              variant={isActive ? "secondary" : "ghost"}
              onClick={() => {
                if (soundManager?.play) soundManager.play('tapMenu');
                setRoomFilter(filter.id);
              }}
              className={`h-8 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-800/90 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {filter.label}
            </Button>
          );
        })}
      </div>

      {/* Rooms List / Empty State */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 custom-scrollbar flex flex-col">
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-white/10 rounded-2xl bg-zinc-950/60 backdrop-blur-md shadow-xl my-auto max-w-lg mx-auto w-full">
            <div className="relative mb-5 flex items-center justify-center">
              {/* Concentric semi-transparent radar circles with scanner sweep */}
              <div className="w-24 h-24 rounded-full border border-cyan-500/20 flex items-center justify-center animate-pulse">
                <div className="w-16 h-16 rounded-full border border-cyan-500/40 flex items-center justify-center bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/25 to-transparent rounded-full animate-spin" style={{ animationDuration: '4s' }} />
                  <Icons.Radar className="w-7 h-7 text-cyan-400 relative z-10" />
                </div>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-black tracking-widest text-zinc-200 uppercase mb-1">
              Сканирование закрытых частот...
            </span>
            <p className="text-[10px] sm:text-xs text-zinc-400 max-w-xs leading-relaxed mb-6">
              В данном секторе нет активных дел. Откройте новый канал и начните собственную операцию.
            </p>
            <Button
              variant="primary-info"
              onClick={() => setIsCreateRoomOpen(true)}
              className="from-red-600 px-6 h-10 text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              + Создать первый стол
            </Button>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const modeMeta = GAME_MODES.find((m: any) => m.id === room.mode);
            const modeTitle = modeMeta?.title || getGameModeTitle(room.mode, 'ru') || room.mode;
            return (
              <div
                key={room.roomCode}
                className="bg-zinc-950/60 hover:bg-zinc-950/80 border border-white/10 hover:border-cyan-500/40 rounded-2xl p-4 flex flex-col gap-3.5 backdrop-blur-md transition-all shadow-lg group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest mb-0.5">
                      Хост: {room.hostName}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-zinc-100 uppercase tracking-wider truncate group-hover:text-cyan-300 transition-colors">
                      {modeTitle}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                      ОЖИДАНИЕ
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Агенты: {room.playersCount}/{room.maxPlayers}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5 bg-black/50 px-3 py-1 rounded-full border border-white/10 text-amber-400">
                    <Icons.Coin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs font-mono font-bold text-amber-400">{room.bet || 250}</span>
                  </div>
                  <Button
                    variant="primary-info"
                    onClick={() => handleJoinRoom(room.roomCode, room.mode)}
                    className="from-red-600 px-5 h-10 text-xs font-bold uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    Войти ➔
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Code Input and Create Table Bar */}
      <div className="w-full shrink-0 bg-[#080a0f] border-t border-white/10 p-4 flex flex-col items-center gap-2.5 z-20">
        <div className="w-full max-w-xl flex flex-col gap-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="tel"
                maxLength={4}
                placeholder="ШИФР (4 ЗНАКА)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-zinc-950/80 border border-white/15 focus:border-cyan-500 rounded-xl px-4 py-3 text-xs font-mono font-bold text-zinc-100 placeholder:text-zinc-500 outline-none transition uppercase tracking-widest text-center shadow-inner"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => handleJoinRoom(joinCode)}
              disabled={joinCode.length !== 4}
              className="px-5 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl shrink-0"
            >
              Применить
            </Button>
          </div>
          <Button
            variant="primary-info"
            fullWidth
            onClick={() => setIsCreateRoomOpen(true)}
            className="from-red-600 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-[0_4px_20px_rgba(6,182,212,0.25)]"
          >
            + Создать партию
          </Button>
        </div>
      </div>
    </div>
  );
};
