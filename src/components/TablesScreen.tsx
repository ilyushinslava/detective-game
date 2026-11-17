import React, { useState, lazy, Suspense } from 'react';
import { Button } from './ui/Button';
import { getGameModeTitle } from '../constants/gameMeta';
import { DEFAULT_BET } from '../constants/gameRules';

const ControllerConnectView = lazy(() =>
  import('./controller/ControllerConnectView').then((m) => ({ default: m.ControllerConnectView }))
);

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
  Radar: ({ className = "w-7 h-7 text-zinc-300" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 9 9" opacity="0.6" />
      <path d="M12 7a5 5 0 0 1 5 5" opacity="0.8" />
      <line x1="12" y1="12" x2="18.5" y2="5.5" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  Lock: ({ className = "w-3.5 h-3.5 text-zinc-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Globe: ({ className = "w-3.5 h-3.5 text-zinc-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
};

interface TablesScreenProps {
  roomFilter: string;
  setRoomFilter: (filter: string) => void;
  filteredRooms: any[];
  joinCode?: string;
  setJoinCode?: (code: string) => void;
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
  joinCode: _joinCode,
  setJoinCode: _setJoinCode,
  handleJoinRoom,
  setIsCreateRoomOpen,
  ROOM_FILTERS,
  GAME_MODES,
  soundManager,
  onBack,
}) => {
  const [lobbyTab, setLobbyTab] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [selectedPrivateRoom, setSelectedPrivateRoom] = useState<any | null>(null);
  const [isMorseOpen, setIsMorseOpen] = useState(false);

  // Разделение списка комнат на "Открытые игры" и "Приватные игры"
  const openRooms = filteredRooms.filter((r) => !r.isPrivate);
  const privateRooms = filteredRooms.filter((r) => Boolean(r.isPrivate));
  const currentRooms = lobbyTab === 'PUBLIC' ? openRooms : privateRooms;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#07080c] overflow-hidden relative w-full max-w-full">
      {/* Top Header Bar (Neo-Noir Glassmorphic Header) */}
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

      {/* Два списка: Вкладки "Открытые игры" и "Приватные игры" */}
      <div className="flex border-b border-white/[0.07] bg-zinc-950/80 px-4 sm:px-6 pt-2 pb-0 gap-3 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (soundManager?.play) soundManager.play('tapMenu');
            setLobbyTab('PUBLIC');
          }}
          className={`pb-2.5 px-3 text-xs font-black uppercase tracking-wider transition-all relative border-b-2 cursor-pointer select-none ${
            lobbyTab === 'PUBLIC'
              ? 'border-zinc-200 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <Icons.Globe className={`w-3.5 h-3.5 ${lobbyTab === 'PUBLIC' ? 'text-zinc-200' : 'text-zinc-500'}`} />
            <span>Открытые игры</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-white/10">
              {openRooms.length}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (soundManager?.play) soundManager.play('tapMenu');
            setLobbyTab('PRIVATE');
          }}
          className={`pb-2.5 px-3 text-xs font-black uppercase tracking-wider transition-all relative border-b-2 cursor-pointer select-none ${
            lobbyTab === 'PRIVATE'
              ? 'border-zinc-200 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <Icons.Lock className={`w-3.5 h-3.5 ${lobbyTab === 'PRIVATE' ? 'text-zinc-200' : 'text-zinc-500'}`} />
            <span>Приватные игры</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-white/10">
              {privateRooms.length}
            </span>
          </span>
        </button>
      </div>

      {/* Filter Tabs (Игровые режимы) */}
      <div className="flex flex-wrap gap-1.5 px-4 sm:px-6 py-2.5 shrink-0 border-b border-white/5 bg-zinc-950/40 w-full items-center justify-center">
        {ROOM_FILTERS.map((filter) => {
          const isActive = roomFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => {
                if (soundManager?.play) soundManager.play('tapMenu');
                setRoomFilter(filter.id);
              }}
              className={`h-8 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-colors duration-150 cursor-pointer select-none border focus:outline-none focus-visible:outline-none active:scale-95 ${
                isActive
                  ? 'bg-zinc-800 text-white border-white/20'
                  : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border-transparent'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Rooms List / Empty State */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 custom-scrollbar flex flex-col">
        {currentRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-white/10 rounded-2xl bg-black/60 shadow-[inset_0_2px_25px_rgba(0,0,0,0.9)] backdrop-blur-2xl my-auto max-w-lg mx-auto w-full">
            <div className="relative mb-5 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
                <div className="w-16 h-16 rounded-full border border-white/15 flex items-center justify-center bg-zinc-900/60 shadow-[0_0_25px_rgba(0,0,0,0.8)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/15 to-transparent rounded-full animate-spin" style={{ animationDuration: '4s' }} />
                  <Icons.Radar className="w-7 h-7 text-zinc-300 relative z-10" />
                </div>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-black tracking-widest text-zinc-200 uppercase mb-1">
              {lobbyTab === 'PUBLIC' ? 'Открытых столов не найдено' : 'Приватных штабов не обнаружено'}
            </span>
            <p className="text-[10px] sm:text-xs text-zinc-400 max-w-xs leading-relaxed mb-6 font-mono">
              {lobbyTab === 'PUBLIC'
                ? 'В эфире нет активных открытых комнат. Создайте открытую партию для свободного подключения игроков.'
                : 'Нет активных закрытых каналов. Создайте приватную партию с защитой 7-значным шифром Морзе.'}
            </p>
            <Button
              variant="primary-info"
              onClick={() => setIsCreateRoomOpen(true)}
              className="from-red-600 px-6 h-10 text-xs font-bold uppercase tracking-wider shadow-lg shadow-black/50 border border-white/10"
            >
              + Создать первый стол
            </Button>
          </div>
        ) : (
          currentRooms.map((room) => {
            const modeMeta = GAME_MODES.find((m: any) => m.id === room.mode);
            const modeTitle = modeMeta?.title || getGameModeTitle(room.mode, 'ru') || room.mode;
            const isPrivateRoom = Boolean(room.isPrivate);

            return (
              <div
                key={room.roomCode}
                className="bg-black/60 hover:bg-black/80 border border-white/10 hover:border-blue-500/40 rounded-2xl p-4 flex flex-col gap-3.5 backdrop-blur-2xl shadow-[inset_0_2px_20px_rgba(0,0,0,0.8)] transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                        Хост: {room.hostName}
                      </span>
                      {isPrivateRoom && (
                        <span className="text-[10px] font-mono font-bold text-zinc-300 bg-zinc-900/80 border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                          <Icons.Lock className="w-3 h-3 text-zinc-400" />
                          ЗАКРЫТЫЙ КАНАЛ
                        </span>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-black text-zinc-100 uppercase tracking-wider truncate group-hover:text-white transition-colors">
                      {modeTitle}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      ОЖИДАНИЕ
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono tracking-wider">
                      Агенты: {room.playersCount}/{room.maxPlayers}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5 bg-black/50 px-3 py-1 rounded-full border border-white/10 text-amber-400">
                    <Icons.Coin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs font-mono font-bold text-amber-400">{room.bet || DEFAULT_BET}</span>
                  </div>

                  {isPrivateRoom ? (
                    /* Приватная игра: вход по 7-значному шифру Морзе к выбранному хосту */
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedPrivateRoom(room);
                        setIsMorseOpen(true);
                      }}
                      className="px-5 h-10 text-xs font-mono font-bold uppercase tracking-wider rounded-xl border border-white/15 text-zinc-200 hover:border-white/30 hover:text-white bg-zinc-900/90 shadow-md cursor-pointer"
                    >
                      Ввести шифр ➔
                    </Button>
                  ) : (
                    /* Открытая игра: свободный вход в 1 клик без паролей */
                    <Button
                      variant="primary-info"
                      onClick={() => handleJoinRoom(room.roomCode, room.mode)}
                      className="from-red-600 px-5 h-10 text-xs font-mono font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-black/50 cursor-pointer"
                    >
                      Войти ➔
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Нижняя панель действий */}
      <div className="w-full shrink-0 bg-[#07080c] border-t border-white/[0.07] p-4 flex flex-col items-center gap-2.5 z-20">
        <div className="w-full max-w-xl flex flex-col sm:flex-row gap-2.5">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              if (soundManager?.play) soundManager.play('tapMenu');
              setSelectedPrivateRoom(null);
              setIsMorseOpen(true);
            }}
            className="py-3.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-xl border border-white/20 text-zinc-200 hover:border-cyan-500/40 hover:text-white bg-zinc-900/90 shadow-md flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95 duration-75"
          >
            <span>•— Ввести шифр вручную</span>
          </Button>

          <Button
            variant="primary-info"
            fullWidth
            onClick={() => setIsCreateRoomOpen(true)}
            className="from-red-600 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-black/50 touch-manipulation active:scale-95 duration-75"
          >
            + Создать партию
          </Button>
        </div>
      </div>

      {/* Оверлей ввода 7-значного шифра Морзе (пароль к выбранной приватной комнате) */}
      {isMorseOpen && (
        <div className="fixed inset-0 z-50 bg-[#07080c] flex flex-col">
          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-xs">
              Загрузка терминала связи...
            </div>
          }>
            <ControllerConnectView
              initialTab="MORSE"
              targetRoomCode={selectedPrivateRoom?.roomCode}
              targetHostName={selectedPrivateRoom?.hostName}
              targetExpectedMorse={selectedPrivateRoom?.morseCode}
              onConnect={(roomCode) => {
                setIsMorseOpen(false);
                setSelectedPrivateRoom(null);
                handleJoinRoom(roomCode);
              }}
              onBackToMenu={() => {
                setIsMorseOpen(false);
                setSelectedPrivateRoom(null);
              }}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
};
