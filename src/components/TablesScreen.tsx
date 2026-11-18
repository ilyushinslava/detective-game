import React, { useState, lazy, Suspense } from 'react';
import { Button } from './ui/Button';
import { TablesHeader, TablesEmptyState, RoomItemCard } from './tables';

const ControllerConnectView = lazy(() =>
  import('./controller/ControllerConnectView').then((m) => ({ default: m.ControllerConnectView }))
);

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
    <div className="flex-1 min-h-0 flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background-panel/60 via-background-main to-background-main overflow-hidden relative w-full max-w-full">
      {/* Фоновые мягкие сферы для сетевого хаба */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-accent-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-accent-purple/15 blur-3xl pointer-events-none" />

      <TablesHeader
        onBack={onBack}
        lobbyTab={lobbyTab}
        onTabChange={setLobbyTab}
        openRoomsCount={openRooms.length}
        privateRoomsCount={privateRooms.length}
        roomFilter={roomFilter}
        onFilterChange={setRoomFilter}
        roomFilters={ROOM_FILTERS}
        soundManager={soundManager}
      />

      {/* Rooms List / Empty State */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 custom-scrollbar flex flex-col">
        {currentRooms.length === 0 ? (
          <TablesEmptyState
            lobbyTab={lobbyTab}
            onCreateRoom={() => setIsCreateRoomOpen(true)}
          />
        ) : (
          currentRooms.map((room) => (
            <RoomItemCard
              key={room.roomCode}
              room={room}
              gameModes={GAME_MODES}
              onSelectPrivateRoom={(r) => {
                setSelectedPrivateRoom(r);
                setIsMorseOpen(true);
              }}
              onJoinRoom={(code, mode) => handleJoinRoom(code, mode)}
            />
          ))
        )}
      </div>

      {/* Нижняя панель действий */}
      <div className="w-full shrink-0 bg-background-main/90 backdrop-blur-md border-t border-border-subtle p-4 flex flex-col items-center gap-2.5 z-20">
        <div className="w-full max-w-xl flex flex-col sm:flex-row gap-2.5">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              if (soundManager?.play) soundManager.play('tapMenu');
              setSelectedPrivateRoom(null);
              setIsMorseOpen(true);
            }}
            className="py-3.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-xl border border-border-strong text-zinc-200 hover:border-accent-neon/40 hover:text-white bg-background-surface/90 shadow-md flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95 duration-75"
          >
            <span>•— Ввести шифр вручную</span>
          </Button>

          <Button
            variant="primary-info"
            fullWidth
            onClick={() => setIsCreateRoomOpen(true)}
            className="from-red-600 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-gradient-to-r from-accent-primary via-blue-600 to-accent-secondary hover:from-blue-500 hover:to-indigo-500 text-white shadow-neon-blue border border-blue-400/40 touch-manipulation active:scale-95 duration-75"
          >
            + Создать партию
          </Button>
        </div>
      </div>

      {/* Оверлей ввода 7-значного шифра Морзе (пароль к выбранной приватной комнате) */}
      {isMorseOpen && (
        <div className="fixed inset-0 z-50 bg-background-main flex flex-col">
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
