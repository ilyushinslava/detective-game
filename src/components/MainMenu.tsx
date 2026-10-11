// src/components/MainMenu.tsx
import { useState, useEffect } from "react";
import type { GameModeType, OpponentType, Role } from "../types/game";
import type { UserProfile } from "../types/profile";
import { ModeSelectModal } from "./ModeSelectModal";
import { triggerHaptic } from "../utils/haptics";
import { mpService, type PublicRoomMeta } from "../utils/multiplayerPeer";
import { BottomNavigation } from "./BottomNavigation";
import { usePlayerProfile } from "../utils/usePlayerProfile";

interface MainMenuProps {
  profile: UserProfile;
  onUpdateProfile?: (updates: Partial<UserProfile>) => void;
  activeTab: "LOBBY" | "TABLES" | "TOP" | "SHOP";
  onTabChange: (tab: "LOBBY" | "TABLES" | "TOP" | "SHOP") => void;
  onStartGame: (
    modeId: GameModeType,
    opponent: OpponentType,
    playerRole: Role,
    playerCount?: number,
    targetTrophies?: number,
    maxTurns?: number,
    betAmount?: number,
  ) => void;
  hasActiveGame: boolean;
  onResumeGame: () => void;
  onOpenRules: () => void;
}

const MODE_LABELS: Record<string, string> = {
  SKHVATKA: "Схватка",
  MANIAC_VS_OPERATIVE: "Маньяк",
  THIEF_HUNT: "Охота",
  SECRET_SERVICE: "Секретная служба",
};

const ROOM_FILTERS = [
  { id: "ALL", label: "Все" },
  { id: "SKHVATKA", label: "Схватка" },
  { id: "SECRET_SERVICE", label: "Секретная Служба" },
  { id: "MANIAC_VS_OPERATIVE", label: "Маньяка против Оперативника" },
  { id: "THIEF_HUNT", label: "Охота на Грабителя" },
];

export const MainMenu = ({
  profile,
  onUpdateProfile,
  activeTab,
  onTabChange,
  onStartGame,
  hasActiveGame,
  onResumeGame,
  onOpenRules,
}: MainMenuProps) => {
  const { refundBet } = usePlayerProfile();
  const [publicRooms, setPublicRooms] = useState<PublicRoomMeta[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [roomFilter, setRoomFilter] = useState<string>("ALL");

  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [createRoomMode, setCreateRoomMode] =
    useState<GameModeType>("SKHVATKA");
  const [createRoomBet, setCreateRoomBet] = useState<number>(250);
  const [createRoomIsPrivate, setCreateRoomIsPrivate] =
    useState<boolean>(false);
  const [createRoomCallsign, setCreateRoomCallsign] = useState(
    profile.nickname,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);

  // Стейты для выбора режима (Одиночная / Локальная)
  const [isModeSelectOpen, setIsModeSelectOpen] = useState(false);
  const [selectedOpponentType, setSelectedOpponentType] =
    useState<OpponentType>("AI");
  const [selectedScenarioMode, setSelectedScenarioMode] =
    useState<GameModeType>("SKHVATKA");

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(profile.nickname);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (activeTab === "TABLES") {
      unsubscribe = mpService.subscribeToPublicRooms((rooms) => {
        setPublicRooms(rooms);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeTab]);

  const handleSaveName = () => {
    setIsEditingName(false);
    const trimmed = editNameValue.trim();
    const isValid =
      /^[a-zA-Zа-яА-Я0-9 _-]+$/.test(trimmed) &&
      trimmed.length >= 2 &&
      trimmed.length <= 14;

    if (isValid && trimmed !== profile.nickname) {
      if (onUpdateProfile) onUpdateProfile({ nickname: trimmed });
      localStorage.setItem("crime_city_callsign", trimmed);
    } else if (!isValid) {
      const fallback = "Агент";
      if (onUpdateProfile) onUpdateProfile({ nickname: fallback });
      localStorage.setItem("crime_city_callsign", fallback);
      setEditNameValue(fallback);
    } else {
      setEditNameValue(profile.nickname);
    }
  };

  const handleQuickPlay = async () => {
    triggerHaptic("heavy");
    setIsCreating(true);
    const foundCode = await mpService.findQuickPlayRoom(250);

    if (foundCode) {
      setIsCreating(false);
      handleJoinRoom(foundCode);
    } else {
      const rand = Math.random();
      const autoMode: GameModeType =
        rand < 0.5
          ? "SECRET_SERVICE"
          : rand < 0.75
            ? "SKHVATKA"
            : rand < 0.9
              ? "MANIAC_VS_OPERATIVE"
              : "THIEF_HUNT";
      const isSecretService = autoMode === "SECRET_SERVICE";

      mpService.createRoom(
        profile.nickname || "Агент",
        autoMode,
        250,
        false,
        isSecretService ? 4 : 2,
        () => {
          setIsCreating(false);
          setIsWaitingForOpponent(true);
        },
        () => {
          setIsWaitingForOpponent(false);
          onStartGame(
            autoMode,
            "ONLINE",
            "DETECTIVE",
            isSecretService ? 2 : 2,
            isSecretService ? 4 : 3,
            0,
            250,
          );
        },
        (err) => {
          console.error(err);
          alert("Ошибка создания комнаты");
          setIsCreating(false);
        },
      );
    }
  };

  const handleConfirmCreateRoom = () => {
    triggerHaptic("medium");
    setIsCreating(true);

    if (createRoomCallsign.trim() !== profile.nickname) {
      if (onUpdateProfile)
        onUpdateProfile({ nickname: createRoomCallsign.trim() });
      localStorage.setItem("crime_city_callsign", createRoomCallsign.trim());
    }

    mpService.createRoom(
      createRoomCallsign.trim() || "Агент",
      createRoomMode,
      createRoomBet,
      createRoomIsPrivate,
      createRoomMode === "SECRET_SERVICE" ? 4 : 2,
      () => {
        setIsCreating(false);
        setIsCreateRoomOpen(false);
        setIsWaitingForOpponent(true);
      },
      () => {
        setIsWaitingForOpponent(false);
        onStartGame(
          createRoomMode,
          "ONLINE",
          "DETECTIVE",
          createRoomMode === "SECRET_SERVICE" ? 2 : 2,
          createRoomMode === "SECRET_SERVICE" ? 4 : 3,
          0,
          createRoomBet,
        );
      },
      () => {
        setIsCreating(false);
        alert("Ошибка создания комнаты");
      },
    );
  };

  const handleJoinRoom = (code: string) => {
    if (code.length !== 4) return;
    triggerHaptic("light");

    if (code === mpService.roomCode && mpService.isHost) {
      setIsWaitingForOpponent(true);
      return;
    }

    const foundRoom = publicRooms.find((r) => r.roomCode === code);
    const roomMode = (foundRoom?.mode as GameModeType) || "SKHVATKA";
    const roomBet = foundRoom?.bet || 250;

    mpService.joinRoom(
      code,
      profile.nickname,
      () => {
        setIsWaitingForOpponent(true);
      },
      () => alert("Комната не найдена или игра уже началась"),
    );
  };

  const filteredRooms = publicRooms.filter((r) => {
    if (roomFilter === "ALL") return true;
    return r.mode === roomFilter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center overflow-hidden font-sans select-none">
      <div className="w-full h-full md:h-auto md:max-h-[820px] max-w-[440px] md:max-w-[460px] bg-zinc-950 relative md:rounded-3xl md:border md:border-zinc-800/80 shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="w-full bg-zinc-900 border-b border-zinc-800 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 px-4 sm:px-6 flex items-center justify-between shadow-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 border-2 border-amber-500 flex items-center justify-center text-2xl shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                {profile.avatar}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-amber-500 text-zinc-950 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-zinc-900">
                LVL {profile.level}
              </div>
            </div>
            <div className="flex flex-col">
              {isEditingName ? (
                <input
                  autoFocus
                  maxLength={14}
                  placeholder="Позывной"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  className="bg-zinc-950 border border-amber-500 text-zinc-100 text-sm font-black px-2 py-0.5 rounded outline-none w-28"
                />
              ) : (
                <span
                  onClick={() => setIsEditingName(true)}
                  className="text-sm font-black text-zinc-100 tracking-wide cursor-pointer hover:text-amber-400 transition truncate max-w-[140px]"
                  title="Нажмите, чтобы изменить имя"
                >
                  {profile.nickname} ✎
                </span>
              )}
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mt-0.5">
                {profile.rank}
              </span>
              <div className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-amber-500 w-[45%]"></div>
              </div>
            </div>
          </div>
          <div
            className="flex flex-col items-end opacity-75"
            title="Экономика временно в бета-режиме"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-inner">
              <span className="text-emerald-400 font-black text-xs">$</span>
              <span className="text-zinc-300 font-mono text-xs font-bold">
                {profile.cash.toLocaleString()}
              </span>
              <span className="text-[8px] font-bold bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded border border-zinc-700 ml-0.5">
                Бета
              </span>
            </div>
          </div>
        </div>
        {/* CONTENT AREA */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          {/* TAB: LOBBY */}
          {activeTab === "LOBBY" && (
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col justify-center gap-3.5">
              {hasActiveGame && (
                <button
                  onClick={onResumeGame}
                  className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl p-4 font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-amber-500/20 transition cursor-pointer shadow-lg"
                >
                  ▶ Вернуться в активную партию
                </button>
              )}

              <button
                onClick={handleQuickPlay}
                disabled={isCreating}
                className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 p-3.5 sm:p-4 md:p-5 text-left shadow-[0_0_20px_rgba(245,158,11,0.2)] active:scale-[0.98] transition-transform disabled:opacity-70 shrink-0"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="text-amber-200 text-[10px] font-black uppercase tracking-widest mb-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse"></span>
                    Случайный соперник
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mb-0.5">
                    {isCreating ? "ПОИСК..." : "БЫСТРАЯ ИГРА"}
                  </h2>
                  <div className="text-amber-100/80 text-xs font-medium">
                    Ставка: 250 $ • Выигрыш: 500 $
                  </div>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 opacity-60 cursor-not-allowed select-none">
                  <span className="absolute top-2 right-2 bg-amber-500/10 text-amber-400 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                    СКОРО
                  </span>
                  <span className="text-3xl sm:text-4xl grayscale opacity-70">
                    🏆
                  </span>
                  <span className="text-[11px] sm:text-xs font-black text-zinc-400 uppercase tracking-wider">
                    Рейтинг
                  </span>
                </div>
                <button
                  onClick={() => onTabChange("TABLES")}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:border-amber-500/50 transition active:scale-95 cursor-pointer"
                >
                  <span className="text-3xl sm:text-4xl drop-shadow-md">
                    👥
                  </span>
                  <span className="text-[11px] sm:text-xs font-black text-zinc-300 uppercase tracking-wider">
                    Список комнат
                  </span>
                </button>
                <button
                  onClick={() => {
                    setSelectedOpponentType("AI");
                    setIsModeSelectOpen(true);
                  }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:border-blue-500/50 transition active:scale-95 cursor-pointer"
                >
                  <span className="text-3xl sm:text-4xl drop-shadow-md">
                    🤖
                  </span>
                  <span className="text-[11px] sm:text-xs font-black text-zinc-300 uppercase tracking-wider">
                    Против бота
                  </span>
                </button>
                <button
                  onClick={() => {
                    setSelectedOpponentType("PVP");
                    setIsModeSelectOpen(true);
                  }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:border-purple-500/50 transition active:scale-95 cursor-pointer"
                >
                  <span className="text-3xl sm:text-4xl drop-shadow-md">
                    📱
                  </span>
                  <span className="text-[11px] sm:text-xs font-black text-zinc-300 uppercase tracking-wider">
                    Локально 1v1
                  </span>
                </button>
              </div>

              <div className="bg-zinc-900/80 border border-emerald-900/50 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-lg">
                    🎁
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                      Ежедневное дело
                    </div>
                    <div className="text-xs font-bold text-zinc-200">
                      Выиграйте 1 партию
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 uppercase">
                    Награда
                  </div>
                  <div className="text-sm font-black text-emerald-400">
                    100 $
                  </div>
                </div>
              </div>

              <button
                onClick={onOpenRules}
                className="w-full py-1.5 text-[10px] sm:text-[11px] font-bold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition shrink-0"
              >
                📖 Справочник правил
              </button>
            </div>
          )}

          {/* TAB: TABLES */}
          {activeTab === "TABLES" && (
            <div className="w-full h-full flex flex-col gap-3">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide shrink-0">
                {ROOM_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setRoomFilter(filter.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border transition-colors ${
                      roomFilter === filter.id
                        ? "bg-amber-500 text-zinc-950 border-amber-500"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                {filteredRooms.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-2xl">
                    Нет доступных столов в этой категории.
                    <br />
                    Создайте свою комнату!
                  </div>
                ) : (
                  filteredRooms.map((room) => (
                    <div
                      key={room.roomCode}
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-amber-500/50 transition h-fit"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg">
                            {room.mode === "SECRET_SERVICE"
                              ? "🕵️"
                              : room.mode === "THIEF_HUNT"
                                ? "🦹"
                                : room.mode === "MANIAC_VS_OPERATIVE"
                                  ? "🔪"
                                  : "🔫"}
                          </div>
                          <div>
                            <div className="text-xs font-black text-zinc-100 flex items-center gap-1.5">
                              <span className="text-[10px] font-normal text-zinc-500">
                                Хост:
                              </span>
                              <span>{room.hostName}</span>
                            </div>
                            <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mt-0.5">
                              {MODE_LABELS[room.mode] || room.mode}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-emerald-400 flex items-center justify-end gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>{" "}
                            Открыт
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-1">
                            👥 {room.playersCount}/{room.maxPlayers}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                        <div className="text-[10px] font-black text-zinc-300 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800">
                          💰 {room.bet} $
                        </div>
                        <button
                          onClick={() => handleJoinRoom(room.roomCode)}
                          className="px-5 py-2 bg-zinc-800 hover:bg-amber-600 hover:text-zinc-950 text-zinc-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition"
                        >
                          Войти ➔
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="w-full shrink-0 border-t border-zinc-800 bg-zinc-950 p-2 flex gap-2 items-center">
                <input
                  type="tel"
                  maxLength={4}
                  placeholder="Введите код партии"
                  value={joinCode}
                  onChange={(e) =>
                    setJoinCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-100 placeholder:text-zinc-500 placeholder:font-normal focus:outline-none focus:border-amber-500 transition"
                />
                <button
                  onClick={() => handleJoinRoom(joinCode)}
                  disabled={joinCode.length !== 4}
                  className="px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 disabled:opacity-40 text-amber-400 text-[10px] font-black uppercase rounded-xl transition cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  Применить
                </button>
                <div className="w-px h-7 bg-zinc-800 mx-0.5 shrink-0"></div>
                <button
                  onClick={() => setIsCreateRoomOpen(true)}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 text-[10px] font-black uppercase rounded-xl shadow-lg transition cursor-pointer shrink-0 whitespace-nowrap"
                >
                  + Создать партию
                </button>
              </div>
            </div>
          )}

          {/* TAB: TOP */}
          {activeTab === "TOP" && (
            <div className="w-full max-w-lg md:max-w-xl px-4 my-auto flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-4xl mb-4 shadow-xl">
                🏆
              </div>
              <div className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-black px-2.5 py-1 rounded-full mb-3 uppercase tracking-widest">
                Сезон 1 • Скоро
              </div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-wider mb-2">
                Таблица лидеров
              </h2>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                Рейтинговые матчи и начисление очков Лиги откроются после
                завершения открытого тестирования механик.
              </p>
            </div>
          )}

          {/* TAB: SHOP */}
          {activeTab === "SHOP" && (
            <div className="w-full max-w-lg md:max-w-xl px-4 my-auto flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-4xl mb-4 shadow-xl">
                🛒
              </div>
              <div className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-black px-2.5 py-1 rounded-full mb-3 uppercase tracking-widest">
                В разработке
              </div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-wider mb-2">
                Черный рынок закрыт
              </h2>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                Скины персонажей, рубашки карт и лицензии будут доступны в
                следующем обновлении.
              </p>
            </div>
          )}
        </div>
        <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
        {/* МОДАЛКА ВЫБОРА РЕЖИМА (Одиночная / Локальная) */}
        {isModeSelectOpen && (
          <ModeSelectModal
            currentModeId={selectedScenarioMode}
            initialOpponent={selectedOpponentType}
            hasActiveGame={hasActiveGame}
            onSelectMode={(modeId) => setSelectedScenarioMode(modeId)}
            onResumeGame={() => setIsModeSelectOpen(false)}
            onStartNewGame={(modeId, opponent, playerRole, playerCount) => {
              setIsModeSelectOpen(false);
              onStartGame(
                modeId,
                opponent || selectedOpponentType,
                playerRole,
                playerCount,
                modeId === "SECRET_SERVICE" ? (playerCount === 3 ? 4 : 3) : 3,
                0,
              );
            }}
          />
        )}
        {/* МОДАЛКА СОЗДАНИЯ КОМНАТЫ */}
        {isCreateRoomOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl">
              <h3 className="text-lg font-black text-zinc-100 uppercase tracking-wider mb-4">
                Создать комнату
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">
                    Режим игры
                  </label>
                  <select
                    value={createRoomMode}
                    onChange={(e) =>
                      setCreateRoomMode(e.target.value as GameModeType)
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-100 focus:border-amber-500 outline-none appearance-none transition mb-4"
                  >
                    <option value="SKHVATKA">Схватка</option>
                    <option value="SECRET_SERVICE">Секретная служба</option>
                    <option value="MANIAC_VS_OPERATIVE">
                      Маньяк против оперативника
                    </option>
                    <option value="THIEF_HUNT">Охота на грабителя</option>
                  </select>

                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">
                        Режим ставок:
                      </span>
                      <span className="text-[11px] text-zinc-300 font-medium">
                        Товарищеский матч (без списания $)
                      </span>
                    </div>
                    <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                      Free
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createRoomIsPrivate}
                      onChange={(e) => setCreateRoomIsPrivate(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 bg-zinc-900 border-zinc-700 rounded"
                    />
                    <span className="text-xs font-bold text-zinc-300">
                      Приватная комната (по коду)
                    </span>
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setIsCreateRoomOpen(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleConfirmCreateRoom}
                    disabled={isCreating}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 text-xs font-black uppercase rounded-xl transition"
                  >
                    {isCreating ? "Создание..." : "Создать"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ЭКРАН ОЖИДАНИЯ СОПЕРНИКА */}
        {isWaitingForOpponent && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Код вашей комнаты
              </div>
              <div className="text-5xl font-black text-amber-400 tracking-widest font-mono mb-6">
                {mpService.roomCode}
              </div>

              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 border-4 border-zinc-800 border-t-amber-500 rounded-full animate-spin"></div>
              </div>

              <div className="text-sm text-zinc-300 font-bold animate-pulse mb-8">
                {mpService.isHost
                  ? "Ожидание подключения соперника..."
                  : "Ожидание данных от хоста..."}
              </div>

              <button
                onClick={() => {
                  mpService.disconnect();
                  refundBet(createRoomBet || 250);
                  setIsWaitingForOpponent(false);
                  setIsCreating(false);
                }}
                className="w-full py-3.5 bg-red-950/50 hover:bg-red-900/80 text-red-400 border border-red-900/50 text-xs font-bold uppercase rounded-xl transition pointer-events-auto cursor-pointer z-50"
              >
                Отменить и выйти
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
