import React from 'react';

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
  soundManager
}) => {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#080a0f] overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-white/10 bg-[#080a0f]">
        <div className="flex flex-col">
          <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">Сетевой эфир</span>
          <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">Оперативные столы</h2>
        </div>
        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-mono font-bold text-emerald-300 uppercase tracking-wider">ONLINE</span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-6 py-3 scrollbar-hide shrink-0 border-b border-white/[0.05] bg-zinc-950/30">
        {ROOM_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => {
              if (soundManager?.play) soundManager.play('tapMenu');
              setRoomFilter(filter.id);
            }}
            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap border transition-all cursor-pointer ${
              roomFilter === filter.id
                ? 'bg-zinc-100 text-zinc-950 border-zinc-200 shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                : 'bg-zinc-900/60 text-zinc-500 border-white/[0.08] hover:text-zinc-300 hover:border-white/20'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar flex flex-col">
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-white/[0.08] rounded-3xl bg-zinc-900/30 shadow-inner my-auto">
            <div className="relative mb-4 text-zinc-600">
              <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute inset-0 rounded-full border border-red-500/30 animate-ping pointer-events-none" />
            </div>
            <span className="text-xs font-black tracking-widest text-zinc-200 uppercase mb-1">
              Сканирование закрытых частот...
            </span>
            <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed mb-6 uppercase tracking-wider">
              В данном секторе нет активных дел. Откройте новый канал и начните собственную операцию.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateRoomOpen(true)}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)] transition cursor-pointer active:scale-95"
            >
              + Создать первый стол
            </button>
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div key={room.roomCode} className="bg-zinc-950/80 border border-white/10 rounded-2xl p-4 flex flex-col gap-3.5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest mb-0.5">Хост: {room.hostName}</span>
                  <span className="text-sm font-black text-zinc-100 uppercase tracking-widest">
                    {GAME_MODES.find((m: any) => m.id === room.mode)?.title || room.mode}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                    Открыто
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Агенты: {room.playersCount}/{room.maxPlayers}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/[0.05]">
                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-mono font-bold text-emerald-400">{room.bet || 250}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleJoinRoom(room.roomCode, room.mode)}
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(220,38,38,0.35)] transition cursor-pointer active:scale-95"
                >
                  Войти ➔
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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
                className="w-full bg-zinc-900/90 border border-white/15 rounded-xl px-4 py-3 text-xs font-mono font-bold text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-red-500 transition uppercase tracking-widest text-center shadow-inner"
              />
            </div>
            <button
              type="button"
              onClick={() => handleJoinRoom(joinCode)}
              disabled={joinCode.length !== 4}
              className="px-5 py-3 bg-zinc-800 border border-white/15 hover:bg-zinc-700 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer disabled:cursor-not-allowed shrink-0 shadow-md active:scale-95"
            >
              Применить
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateRoomOpen(true)}
            className="w-full py-3.5 bg-gradient-to-r from-zinc-800 to-zinc-900 border border-white/15 hover:border-white/30 text-zinc-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer shadow-lg active:scale-99"
          >
            + Создать партию
          </button>
        </div>
      </div>
    </div>
  );
};
