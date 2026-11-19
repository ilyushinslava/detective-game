import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Button } from './ui/Button';
import { TablesHeader, TablesEmptyState, RoomItemCard } from './tables';
import type { NetworkTab } from './tables/TablesHeader';
import { Icons } from './ui/Icons';
import { Toast } from './Toast';
import { triggerHaptic } from '../utils/haptics';
import { useAuthSafe } from '../contexts/AuthContext';

const ControllerConnectView = lazy(() =>
  import('./controller/ControllerConnectView').then((m) => ({ default: m.ControllerConnectView }))
);

interface TablesScreenProps {
  roomFilter: string;
  setRoomFilter: (filter: string) => void;
  filteredRooms: any[];
  joinCode?: string;
  setJoinCode?: (code: string) => void;
  handleJoinRoom: (code: string, mode?: any, morseCode?: string) => void;
  setIsCreateRoomOpen: (open: boolean) => void;
  ROOM_FILTERS: Array<{ id: string; label: string }>;
  GAME_MODES: any[];
  soundManager?: any;
  onBack?: () => void;
  networkError?: string | null;
  clearNetworkError?: () => void;
  useMockRooms?: boolean;
  toggleMockRooms?: () => void;
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
  networkError,
  clearNetworkError,
  useMockRooms,
  toggleMockRooms,
}) => {
  const { user } = useAuthSafe();
  const [networkTab, setNetworkTab] = useState<NetworkTab>('TABLES');
  const [lobbyTab, setLobbyTab] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [selectedPrivateRoom, setSelectedPrivateRoom] = useState<any | null>(null);
  const [isMorseOpen, setIsMorseOpen] = useState(false);
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const effectiveUserId = user?.id || 'agent_guest';

  const handleCopyId = async (idToCopy: string) => {
    if (!idToCopy) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(idToCopy);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = idToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      if (soundManager?.play) soundManager.play("click");
      triggerHaptic("success");
      setIsCopied(true);
      setToastMessage("ID скопирован в буфер обмена");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Ошибка при копировании ID:", err);
    }
  };

  // Сброс спиннера при получении сетевой ошибки
  useEffect(() => {
    if (networkError) {
      setJoiningRoomCode(null);
    }
  }, [networkError]);

  const handleJoinRoomSafe = (code: string, mode?: any) => {
    if (joiningRoomCode) return;
    setJoiningRoomCode(code);
    clearNetworkError?.();
    handleJoinRoom(code, mode);
  };

  // Разделение списка комнат на "Открытые игры" и "Приватные игры"
  const openRooms = filteredRooms.filter((r) => !r.isPrivate);
  const privateRooms = filteredRooms.filter((r) => Boolean(r.isPrivate));
  const currentRooms = lobbyTab === 'PUBLIC' ? openRooms : privateRooms;

  // Умная сортировка: сначала доступные (WAITING), затем идущие матчи (IN_GAME), затем полные (FULL)
  const sortedRooms = [...currentRooms].sort((a, b) => {
    const getStatusWeight = (r: any) => {
      const isFull = (r.playersCount || 0) >= (r.maxPlayers || 2);
      const isInGame = r.status === "PLAYING" || r.status === "IN_GAME";
      if (!isFull && !isInGame) return 1; // WAITING: наивысший приоритет
      if (isInGame) return 2;
      return 3; // FULL: в конец
    };
    return getStatusWeight(a) - getStatusWeight(b);
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background-panel/60 via-background-main to-background-main overflow-hidden relative w-full max-w-full">
      {/* Фоновые мягкие сферы для сетевого хаба */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-accent-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-accent-purple/15 blur-3xl pointer-events-none" />

      <TablesHeader
        onBack={onBack}
        networkTab={networkTab}
        onNetworkTabChange={setNetworkTab}
        lobbyTab={lobbyTab}
        onTabChange={setLobbyTab}
        openRoomsCount={openRooms.length}
        privateRoomsCount={privateRooms.length}
        roomFilter={roomFilter}
        onFilterChange={setRoomFilter}
        roomFilters={ROOM_FILTERS}
        soundManager={soundManager}
        useMockRooms={useMockRooms}
        onToggleMockRooms={toggleMockRooms}
      />

      {/* Оповещение об ошибке подключения */}
      {networkError && (
        <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-mono flex items-center justify-between shadow-lg shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="truncate">{networkError}</span>
          </div>
          {clearNetworkError && (
            <button
              type="button"
              onClick={clearNetworkError}
              className="text-rose-400 hover:text-white px-2 py-0.5 rounded cursor-pointer transition shrink-0 ml-2"
              title="Закрыть"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Контент: либо список столов (TABLES), либо раздел «Друзья» (FRIENDS) */}
      {networkTab === "TABLES" ? (
        <>
          {/* Rooms List / Empty State */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 custom-scrollbar">
            {sortedRooms.length === 0 ? (
              <TablesEmptyState
                lobbyTab={lobbyTab}
                onCreateRoom={() => setIsCreateRoomOpen(true)}
                onToggleMockRooms={toggleMockRooms}
                useMockRooms={useMockRooms}
              />
            ) : (
              <div className="w-full max-w-4xl mx-auto flex flex-col sm:grid sm:grid-cols-2 gap-3 pb-4">
                {sortedRooms.map((room) => (
                  <RoomItemCard
                    key={room.roomCode}
                    room={room}
                    gameModes={GAME_MODES}
                    isJoining={joiningRoomCode === room.roomCode}
                    onSelectPrivateRoom={(r) => {
                      setSelectedPrivateRoom(r);
                      setIsMorseOpen(true);
                    }}
                    onJoinRoom={(code, mode) => handleJoinRoomSafe(code, mode)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Нижняя панель действий (только для столов) */}
          <div className="w-full shrink-0 bg-background-main/90 backdrop-blur-md border-t border-border-subtle p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-center z-20">
            <div className="w-full max-w-md">
              <Button
                variant="primary"
                fullWidth
                onClick={() => setIsCreateRoomOpen(true)}
                className="py-3.5 text-xs font-black uppercase tracking-widest rounded-xl touch-manipulation active:scale-95 duration-75 cursor-pointer"
              >
                + Создать партию
              </Button>
            </div>
          </div>
        </>
      ) : (
        /* Вкладка «Друзья»: карточка «Ваш ID» + заглушка списка друзей */
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 custom-scrollbar flex flex-col items-center">
          <div className="w-full max-w-lg space-y-4">
            {/* Карточка 1: Ваш ID агента */}
            <div className="neo-card border-t-white/20 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden flex flex-col gap-3.5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Icons.Key className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                    Ваш ID агента
                  </h2>
                  <p className="text-[10px] font-mono text-zinc-400">
                    Уникальный идентификатор для связи и добавления в отряд
                  </p>
                </div>
              </div>

              {/* Поле с ID и кнопка копирования */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-2 sm:p-2.5">
                <div
                  className="flex-1 min-w-0 font-mono text-xs sm:text-sm font-bold text-zinc-200 select-all truncate px-2 py-1"
                  title={effectiveUserId}
                >
                  {effectiveUserId || "—"}
                </div>

                <Button
                  variant="secondary"
                  onClick={() => handleCopyId(effectiveUserId)}
                  className="h-9 px-3.5 text-xs font-mono font-bold uppercase tracking-wider gap-1.5 shrink-0 rounded-lg touch-manipulation cursor-pointer active:scale-95 transition-all"
                  title="Скопировать ID"
                >
                  {isCopied ? (
                    <>
                      <Icons.Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Icons.Copy className="w-3.5 h-3.5 text-blue-400" />
                      <span>Скопировать</span>
                    </>
                  )}
                </Button>
              </div>

              <p className="text-[11px] font-mono text-zinc-500 leading-relaxed">
                Поделитесь этим ID с напарником. В будущем по этому коду можно будет отправлять прямые приглашения на приватные столы.
              </p>
            </div>

            {/* Карточка 2: Информационная плашка «Скоро в обновлении» */}
            <div className="neo-card border-t-white/20 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 mb-3 shadow-inner">
                <Icons.Users className="w-7 h-7 text-blue-400/80" />
              </div>

              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold mb-2">
                СКОРО В ОБНОВЛЕНИИ
              </span>

              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white mb-2">
                Список друзей и приглашения
              </h3>

              <p className="text-xs font-mono text-zinc-400 leading-relaxed max-w-sm">
                Список друзей и приглашения появятся в ближайшем обновлении. Вы сможете быстро находить напарников, отслеживать их статус в сети и вызывать на дуэль в один клик.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Всплывающее уведомление о копировании */}
      <Toast
        message={toastMessage}
        type="info"
        onClose={() => setToastMessage(null)}
        duration={1500}
      />

      {/* Оверлей ввода 7-значного кода Морзе (пароль к выбранной приватной комнате) */}
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
              onConnect={(roomCode, morseCode) => {
                setIsMorseOpen(false);
                const roomMode = selectedPrivateRoom?.mode;
                setSelectedPrivateRoom(null);
                handleJoinRoom(roomCode, roomMode, morseCode);
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
