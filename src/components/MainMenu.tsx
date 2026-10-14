import { useState, useEffect } from "react";
import type { GameModeType, OpponentType, Role } from "../types/game";
import type { UserProfile } from "../types/profile";
import { triggerHaptic } from "../utils/haptics";
import { mpService, type PublicRoomMeta } from "../utils/multiplayerPeer";
import { usePlayerProfile } from "../utils/usePlayerProfile";
import { Toast } from "./Toast";

// --- ВЕКТОРНЫЕ ИКОНКИ (HUD) ---
const Icons = {
  Play: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8 5v14l11-7z"/></svg>,
  Users: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Clock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  Shield: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  ArrowRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  ChevronRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M9 18l6-6-6-6"/></svg>,
  ChevronLeft: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6"><path d="M15 18l-6-6 6-6"/></svg>,
  Settings: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  Home: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  Cards: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
  User: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Crosshair: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>,
  Radar: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle><line x1="12" y1="2" x2="12" y2="12"></line></svg>,
  Key: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="8" cy="15" r="4"></circle><line x1="10.85" y1="12.15" x2="19" y2="4"></line><line x1="18" y1="5" x2="20" y2="7"></line><line x1="15" y1="8" x2="17" y2="10"></line></svg>,
  DetectiveHat: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-12 h-12 text-zinc-400"><path d="M2 18h20M4 18c0-2 2-3 4-4l2-6h4l2 6c2 1 4 2 4 4M9 13h6"></path></svg>,
};

const GAME_MODES = [
  {
    id: "SKHVATKA" as GameModeType,
    title: "Схватка",
    players: "2 игрока",
    time: "15 мин",
    difficulty: "Легкая",
    description: "Опасная городская дуэль на опережение: вычислите скрывающегося бандита до того, как инспектор окажется в его прицеле.",
    isAvailable: true,
    killerRoleName: "Бандит",
    detectiveRoleName: "Инспектор",
  },
  {
    id: "MANIAC_VS_OPERATIVE" as GameModeType,
    title: "Маньяк против оперативника",
    players: "2 игрока",
    time: "20 мин",
    difficulty: "Средняя",
    description: "Серийный маньяк ведет охоту по скрытому заказу из 4 целей. Задача оперативника — перехватить след и остановить расправу.",
    isAvailable: true,
    killerRoleName: "Маньяк",
    detectiveRoleName: "Оперативник",
  },
  {
    id: "THIEF_HUNT" as GameModeType,
    title: "Охота на грабителя",
    players: "2 игрока",
    time: "25 мин",
    difficulty: "Высокая",
    description: "Дерзкий домушник методично обчищает карманы горожан и меняет маски, а полиция стягивает оцепление по кварталам.",
    isAvailable: true,
    killerRoleName: "Грабитель",
    detectiveRoleName: "Полиция",
  },
  {
    id: "SECRET_SERVICE" as GameModeType,
    title: "Секретная служба",
    players: "2-4 игрока",
    time: "30 мин",
    difficulty: "Средняя",
    description: "Закрытая операция разведок: опрашивайте связных, вычисляйте резидентов конкурентов и собирайте компромат.",
    isAvailable: true,
    killerRoleName: "Агент 1",
    detectiveRoleName: "Агент 2",
  },
];

const ROOM_FILTERS = [
  { id: "ALL", label: "Все" },
  { id: "SKHVATKA", label: "Схватка" },
  { id: "SECRET_SERVICE", label: "Спецслужбы" },
  { id: "MANIAC_VS_OPERATIVE", label: "Маньяк" },
  { id: "THIEF_HUNT", label: "Охота" },
];

type ScreenType = 'HOME' | 'MODES' | 'MODE_DETAIL' | 'PROFILE' | 'TABLES';

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
  
  const [screen, setScreen] = useState<ScreenType>('HOME');
  const [selectedMode, setSelectedMode] = useState<GameModeType>("SKHVATKA");
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentType>("AI");
  const [selectedRole, setSelectedRole] = useState<Role>("DETECTIVE");
  const [playerCount, setPlayerCount] = useState<number>(3);

  const [publicRooms, setPublicRooms] = useState<PublicRoomMeta[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [roomFilter, setRoomFilter] = useState<string>("ALL");
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [createRoomMode, setCreateRoomMode] = useState<GameModeType>("SKHVATKA");
  const [createRoomBet, setCreateRoomBet] = useState<number>(250);
  const [createRoomIsPrivate, setCreateRoomIsPrivate] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(profile.nickname);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "LOBBY" && screen !== 'HOME' && screen !== 'MODES' && screen !== 'MODE_DETAIL') setScreen('HOME');
    if (activeTab === "TABLES" && screen !== 'TABLES') setScreen('TABLES');
    if (activeTab === "TOP" && screen !== 'PROFILE') setScreen('PROFILE');
  }, [activeTab]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (screen === "TABLES") {
      unsubscribe = mpService.subscribeToPublicRooms((rooms) => {
        setPublicRooms(rooms);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [screen]);

  const handleSaveName = () => {
    setIsEditingName(false);
    const trimmed = editNameValue.trim();
    const isValid = /^[a-zA-Zа-яА-Я0-9 _-]+$/.test(trimmed) && trimmed.length >= 2 && trimmed.length <= 14;

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
      const autoMode: GameModeType = rand < 0.5 ? "SECRET_SERVICE" : rand < 0.75 ? "SKHVATKA" : rand < 0.9 ? "MANIAC_VS_OPERATIVE" : "THIEF_HUNT";
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
          onStartGame(autoMode, "ONLINE", "DETECTIVE", isSecretService ? 2 : 2, isSecretService ? 4 : 3, 0, 250);
        },
        (err) => {
          console.error(err);
          setToastMessage("Ошибка создания комнаты");
          setIsCreating(false);
        },
      );
    }
  };

  const handleConfirmCreateRoom = () => {
    triggerHaptic("medium");
    setIsCreating(true);
    mpService.createRoom(
      profile.nickname || "Агент",
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
        onStartGame(createRoomMode, "ONLINE", "DETECTIVE", createRoomMode === "SECRET_SERVICE" ? 2 : 2, createRoomMode === "SECRET_SERVICE" ? 4 : 3, 0, createRoomBet);
      },
      () => {
        setIsCreating(false);
        setToastMessage("Ошибка создания комнаты");
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
    mpService.joinRoom(
      code,
      profile.nickname,
      () => setIsWaitingForOpponent(true),
      () => setToastMessage("Комната не найдена или игра уже началась"),
    );
  };

  const filteredRooms = publicRooms.filter((r) => roomFilter === "ALL" || r.mode === roomFilter);
  const activeModeData = GAME_MODES.find(m => m.id === selectedMode) || GAME_MODES[0];

  // --- ЭКРАН 1: ГЛАВНАЯ (HOME) ---
  const renderHome = () => (
    <div className="relative flex-1 flex flex-col bg-[#080a0f] overflow-y-auto custom-scrollbar pb-[max(5.5rem,env(safe-area-inset-bottom))]">
      {/* 
        Слой фонового изображения:
        Используем тег <img> с absolute inset-0 и object-cover, чтобы браузер гарантированно подгрузил 
        картинку без проблем с CSS url() и базовыми путями Vite.
      */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img 
          src="./bg-main.png" 
          alt="Astoria City Noir" 
          className="w-full h-full object-cover object-top opacity-85"
          onError={(e) => {
            // Если путь ./bg-main.png не сработал, пробуем корень
            (e.target as HTMLImageElement).src = "/bg-main.png";
          }}
        />
        {/* Градиентная маска: верх чистый, середина полупрозрачная, низ — глубокий чёрный */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 via-60% to-[#080a0f]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-full justify-between">
        {/* Header Overlay */}
        <div className="flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0">
          <button 
            onClick={onOpenRules}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer shadow-lg active:scale-95"
            title="Правила и настройки"
          >
            <Icons.Settings />
          </button>
          
          <div className="flex flex-col items-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Позывной</span>
            <span className="text-sm font-black tracking-widest text-zinc-100 uppercase">{profile.nickname}</span>
          </div>

          <div className="rounded-full bg-black/60 backdrop-blur-md border border-white/10 px-3.5 py-1.5 flex items-center gap-1.5 shadow-lg">
            <span className="text-amber-500 font-black text-[10px] tracking-wider">CR</span>
            <span className="text-zinc-100 font-mono text-xs font-bold">{profile.cash.toLocaleString()}</span>
          </div>
        </div>

        {/* Заголовок игры и кнопки поверх города */}
        <div className="px-6 flex flex-col pt-32 sm:pt-44">
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-white uppercase leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
              АСТОРИЯ:<br/>
              <span className="text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.75)]">ПОСЛЕДНИЙ ВЫСТРЕЛ</span>
            </h1>
            <p className="text-[11px] font-bold tracking-widest text-zinc-300 uppercase mt-2 drop-shadow-md">
              Детективные игры в одной колоде
            </p>
          </div>

          {/* Стек кнопок */}
          <div className="flex flex-col gap-3">
            {hasActiveGame && (
              <button
                onClick={onResumeGame}
                className="w-full h-14 bg-gradient-to-b from-zinc-800/80 to-zinc-950/90 backdrop-blur-xl border border-white/15 border-t-white/30 rounded-2xl flex items-center justify-between px-5 text-white shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:border-white/30 active:scale-[0.99] transition cursor-pointer"
              >
                <span className="font-black tracking-widest uppercase text-xs">Продолжить дело</span>
                <Icons.ArrowRight />
              </button>
            )}

            <button
              onClick={handleQuickPlay}
              disabled={isCreating}
              className="w-full h-14 rounded-full bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white font-black tracking-widest uppercase flex items-center justify-between px-6 border-t border-red-400/50 shadow-[0_10px_25px_rgba(220,38,38,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Icons.Play />
                <span className="text-sm">{isCreating ? "ПОИСК..." : "ИГРАТЬ"}</span>
              </div>
              <span className="text-[10px] font-mono text-red-200/90">250 CR</span>
            </button>

            <button 
              onClick={() => { setSelectedOpponent("AI"); setScreen('MODES'); }} 
              className="w-full h-14 bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 backdrop-blur-xl border border-white/10 border-t-white/20 rounded-2xl flex items-center justify-between px-5 text-white shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-white/25 active:scale-[0.99] transition cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="text-zinc-400"><Icons.Cards /></div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-black text-zinc-100 uppercase tracking-widest">Выбрать игру</span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Против ИИ • 4 сценария</span>
                </div>
              </div>
              <Icons.ChevronRight />
            </button>

            <button 
              onClick={() => { setSelectedOpponent("PVP"); setScreen('MODES'); }} 
              className="w-full h-14 bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 backdrop-blur-xl border border-white/10 border-t-white/20 rounded-2xl flex items-center justify-between px-5 text-white shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-white/25 active:scale-[0.99] transition cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="text-zinc-400"><Icons.Users /></div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-black text-zinc-100 uppercase tracking-widest">Локально 1v1</span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Дуэль на одном экране</span>
                </div>
              </div>
              <Icons.ChevronRight />
            </button>

            <button 
              onClick={() => { setScreen('TABLES'); onTabChange('TABLES'); }} 
              className="w-full h-14 bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 backdrop-blur-xl border border-white/10 border-t-white/20 rounded-2xl flex items-center justify-between px-5 text-white shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-white/25 active:scale-[0.99] transition cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="text-zinc-400"><Icons.Crosshair /></div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-black text-zinc-100 uppercase tracking-widest">Сетевые столы</span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Комнаты игроков</span>
                </div>
              </div>
              <Icons.ChevronRight />
            </button>

            <button 
              onClick={onOpenRules} 
              className="w-full h-14 bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 backdrop-blur-xl border border-white/10 border-t-white/20 rounded-2xl flex items-center justify-between px-5 text-white shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-white/25 active:scale-[0.99] transition cursor-pointer mb-2"
            >
              <div className="flex items-center gap-4">
                <div className="text-zinc-400"><Icons.Shield /></div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-black text-zinc-100 uppercase tracking-widest">Правила</span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Интерактивное досье</span>
                </div>
              </div>
              <Icons.ChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // --- ЭКРАН 2: ВЫБОР ИГРЫ (КАТАЛОГ СЦЕНАРИЕВ) ---
  const renderModes = () => (
    <div className="flex-1 flex flex-col bg-[#080a0f] overflow-hidden">
      <div className="flex items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 shrink-0 border-b border-white/10 bg-zinc-950/50 backdrop-blur-md">
        <button onClick={() => setScreen('HOME')} className="text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer">
          <Icons.ChevronLeft />
          <span className="text-[10px] font-black uppercase tracking-widest">Назад</span>
        </button>
        <h2 className="absolute left-1/2 -translate-x-1/2 text-sm font-black tracking-widest text-zinc-100 uppercase">Выбор игры</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 custom-scrollbar pb-[max(6rem,env(safe-area-inset-bottom))]">
        {GAME_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => { setSelectedMode(mode.id); setScreen('MODE_DETAIL'); }}
            className="w-full bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 backdrop-blur-xl border border-white/10 border-t-white/20 rounded-2xl p-4 flex items-center gap-4 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition text-left shadow-[0_4px_20px_rgba(0,0,0,0.4)] cursor-pointer"
          >
            <div className="w-16 h-16 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-center shrink-0 text-zinc-500 shadow-inner">
              <Icons.Crosshair />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-black text-zinc-100 uppercase tracking-widest mb-1 truncate">{mode.title}</h3>
              <div className="flex items-center gap-3 text-[9px] font-mono text-zinc-400 uppercase tracking-widest mb-1.5">
                <span className="flex items-center gap-1"><Icons.Users /> {mode.players}</span>
                <span className="flex items-center gap-1"><Icons.Clock /> {mode.time}</span>
              </div>
              <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{mode.description}</p>
            </div>
            <div className="text-zinc-500 shrink-0"><Icons.ChevronRight /></div>
          </button>
        ))}
      </div>
    </div>
  );

  // --- ЭКРАН 3: КАРТОЧКА ДЕЛА И СТАРТ ---
  const renderModeDetail = () => (
    <div className="flex-1 flex flex-col bg-[#080a0f] overflow-hidden relative">
      <div className="flex items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 shrink-0 border-b border-white/10 z-10 bg-zinc-950/80 backdrop-blur-xl">
        <button onClick={() => setScreen('MODES')} className="text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer">
          <Icons.ChevronLeft />
          <span className="text-[10px] font-black uppercase tracking-widest">Назад</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-[max(7rem,env(safe-area-inset-bottom))]">
        <div className="px-6 py-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[9px] font-black text-zinc-400 uppercase tracking-widest">{activeModeData.players}</span>
            <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[9px] font-black text-zinc-400 uppercase tracking-widest">{activeModeData.time}</span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-widest leading-tight mb-3">{activeModeData.title}</h1>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6">{activeModeData.description}</p>

          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Состав игры</h3>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-zinc-900/60 border border-white/[0.08] rounded-xl p-3 flex flex-col items-center text-center gap-1.5 shadow-md">
              <div className="text-zinc-400"><Icons.Users /></div>
              <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">25 Карт<br/>Подозреваемых</span>
            </div>
            <div className="bg-zinc-900/60 border border-white/[0.08] rounded-xl p-3 flex flex-col items-center text-center gap-1.5 shadow-md">
              <div className="text-zinc-400"><Icons.Cards /></div>
              <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">25 Карт<br/>Доказательств</span>
            </div>
            <div className="bg-zinc-900/60 border border-white/[0.08] rounded-xl p-3 flex flex-col items-center text-center gap-1.5 shadow-md">
              <div className="text-zinc-400"><Icons.Shield /></div>
              <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Жетоны<br/>и Улики</span>
            </div>
          </div>

          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2.5">Формат партии</h3>
          <div className="flex bg-zinc-950/80 p-1 rounded-xl border border-white/[0.08] mb-5 shadow-inner">
            {(['AI', 'PVP', 'ONLINE'] as OpponentType[]).map(opp => (
              <button
                key={opp}
                onClick={() => setSelectedOpponent(opp)}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition cursor-pointer ${selectedOpponent === opp ? 'bg-zinc-800 text-white shadow-md border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {opp === 'AI' ? 'Против ИИ' : opp === 'PVP' ? 'Локально' : 'Онлайн'}
              </button>
            ))}
          </div>

          {selectedOpponent === 'AI' && activeModeData.id !== 'SECRET_SERVICE' && (
            <>
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2.5">Ваша роль</h3>
              <div className="flex gap-3 mb-5">
                <button
                  onClick={() => setSelectedRole('DETECTIVE')}
                  className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition cursor-pointer ${selectedRole === 'DETECTIVE' ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-zinc-900/60 border-white/[0.08] text-zinc-500'}`}
                >
                  {activeModeData.detectiveRoleName}
                </button>
                <button
                  onClick={() => setSelectedRole('KILLER')}
                  className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition cursor-pointer ${selectedRole === 'KILLER' ? 'bg-red-950/40 border-red-500/60 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-zinc-900/60 border-white/[0.08] text-zinc-500'}`}
                >
                  {activeModeData.killerRoleName}
                </button>
              </div>
            </>
          )}

          {activeModeData.id === 'SECRET_SERVICE' && selectedOpponent === 'AI' && (
            <>
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2.5">Агенты ИИ</h3>
              <div className="flex gap-3 mb-5">
                <button onClick={() => setPlayerCount(2)} className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition cursor-pointer ${playerCount === 2 ? 'bg-zinc-800 border-zinc-500 text-white shadow-md' : 'bg-zinc-900/60 border-white/[0.08] text-zinc-500'}`}>1 Бот</button>
                <button onClick={() => setPlayerCount(3)} className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition cursor-pointer ${playerCount === 3 ? 'bg-zinc-800 border-zinc-500 text-white shadow-md' : 'bg-zinc-900/60 border-white/[0.08] text-zinc-500'}`}>2 Бота</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#080a0f] via-[#080a0f]/90 to-transparent pb-[max(1rem,env(safe-area-inset-bottom))] z-20">
        <button
          onClick={() => {
            if (selectedOpponent === 'ONLINE') {
              setCreateRoomMode(selectedMode);
              setIsCreateRoomOpen(true);
            } else {
              onStartGame(selectedMode, selectedOpponent, selectedRole, playerCount, selectedMode === "SECRET_SERVICE" ? 4 : 3, 0, 0);
            }
          }}
          className="w-full h-14 rounded-full bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white font-black tracking-widest uppercase flex items-center justify-center gap-3 border-t border-red-400/50 shadow-[0_10px_25px_rgba(220,38,38,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
        >
          <span>Начать операцию</span>
          <Icons.ArrowRight />
        </button>
      </div>
    </div>
  );

  // --- ЭКРАН 4: ОПЕРАТИВНЫЕ СТОЛЫ (ТАКТИЧЕСКИЙ ТЕРМИНАЛ) ---
  const renderTables = () => (
    <div className="flex-1 flex flex-col bg-[#080a0f] overflow-hidden">
      {/* Шапка терминала */}
      <div className="flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-white/10 bg-zinc-950/60 backdrop-blur-xl">
        <div className="flex flex-col">
          <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">Сетевой эфир</span>
          <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">Оперативные столы</h2>
        </div>
        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-mono font-bold text-emerald-300 uppercase tracking-wider">ONLINE</span>
        </div>
      </div>
      
      {/* Горизонтальные фильтры сценариев */}
      <div className="flex gap-2 overflow-x-auto px-6 py-3 scrollbar-hide shrink-0 border-b border-white/[0.05] bg-zinc-950/30">
        {ROOM_FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setRoomFilter(filter.id)}
            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap border transition-all cursor-pointer ${
              roomFilter === filter.id 
                ? "bg-zinc-200 text-zinc-950 border-zinc-200 shadow-[0_0_12px_rgba(255,255,255,0.25)] font-black" 
                : "bg-zinc-900/60 text-zinc-500 border-white/[0.08] hover:text-zinc-300 hover:border-white/20"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Список столов или радар пустого эфира */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar pb-40">
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-white/[0.08] rounded-3xl bg-zinc-900/30 backdrop-blur-md shadow-inner my-auto">
            <div className="relative mb-4 text-zinc-600">
              <Icons.Radar />
              <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping pointer-events-none" />
            </div>
            <span className="text-xs font-black tracking-widest text-zinc-200 uppercase mb-1">
              Сканирование закрытых частот...
            </span>
            <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed mb-6 uppercase tracking-wider">
              В данном секторе нет активных дел. Откройте новый канал и начните собственную операцию.
            </p>
            <button
              onClick={() => setIsCreateRoomOpen(true)}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)] transition cursor-pointer active:scale-95"
            >
              + Создать первый стол
            </button>
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div 
              key={room.roomCode} 
              className="bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 backdrop-blur-xl border border-white/10 border-t-white/20 rounded-2xl p-4 flex flex-col gap-3.5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest mb-0.5">Хост: {room.hostName}</span>
                  <span className="text-sm font-black text-zinc-100 uppercase tracking-widest">
                    {GAME_MODES.find(m => m.id === room.mode)?.title || room.mode}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(6,182,212,0.8)]" /> 
                    Открыто
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Агенты: {room.playersCount}/{room.maxPlayers}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/[0.05]">
                  <span className="text-[10px] text-amber-500 font-black">CR</span>
                  <span className="text-xs font-mono font-bold text-zinc-200">{room.bet}</span>
                </div>
                <button 
                  onClick={() => handleJoinRoom(room.roomCode)} 
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(220,38,38,0.35)] transition cursor-pointer active:scale-95"
                >
                  Войти ➔
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Нижняя консоль ввода шифра и создания */}
      <div className="w-full shrink-0 border-t border-white/10 bg-black/85 backdrop-blur-2xl p-4 flex flex-col gap-2.5 pb-[max(5.5rem,env(safe-area-inset-bottom))] absolute bottom-0 z-20">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="tel"
              maxLength={4}
              placeholder="ШИФР КОМНАТЫ (4 ЗНАКА)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-zinc-900/90 border border-white/15 rounded-xl px-4 py-3 text-xs font-mono font-bold text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-red-500 transition uppercase tracking-widest text-center shadow-inner"
            />
          </div>
          <button
            onClick={() => handleJoinRoom(joinCode)}
            disabled={joinCode.length !== 4}
            className="px-5 py-3 bg-zinc-800 border border-white/15 hover:bg-zinc-700 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer disabled:cursor-not-allowed shrink-0 shadow-md active:scale-95"
          >
            Применить
          </button>
        </div>
        <button 
          onClick={() => setIsCreateRoomOpen(true)} 
          className="w-full py-3.5 bg-gradient-to-r from-zinc-800 to-zinc-900 border border-white/15 hover:border-white/30 text-zinc-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer shadow-lg active:scale-99"
        >
          + Создать партию
        </button>
      </div>
    </div>
  );

  // --- ЭКРАН 5: ПРОФИЛЬ (ДОСЬЕ) ---
  const renderProfile = () => (
    <div className="flex-1 flex flex-col bg-[#080a0f] overflow-hidden">
      <div className="flex items-center px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-4 shrink-0 border-b border-white/10 bg-zinc-950/50 backdrop-blur-md">
        <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">Досье Агента</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7 custom-scrollbar pb-[max(6rem,env(safe-area-inset-bottom))]">
        
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)] ring-1 ring-white/[0.05]">
              <Icons.DetectiveHat />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-600 text-zinc-950 text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-zinc-950 tracking-widest shadow-[0_0_15px_rgba(217,119,6,0.5)]">
              LVL {profile.level}
            </div>
          </div>
          
          {isEditingName ? (
            <input
              autoFocus
              maxLength={14}
              placeholder="ПОЗЫВНОЙ"
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              className="bg-zinc-900 border border-amber-600 text-zinc-100 text-lg font-black px-3 py-1.5 rounded-lg outline-none w-48 uppercase tracking-widest text-center mb-1 shadow-[0_0_10px_rgba(217,119,6,0.2)]"
            />
          ) : (
            <h2 onClick={() => setIsEditingName(true)} className="text-xl font-black text-zinc-100 tracking-widest uppercase cursor-pointer hover:text-amber-500 transition mb-0.5 drop-shadow-md">
              {profile.nickname} ✎
            </h2>
          )}
          <span className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest">{profile.rank}</span>
        </div>

        <div>
          <div className="flex justify-between text-[9px] font-mono text-zinc-400 uppercase tracking-widest mb-1.5">
            <span>Опыт расследований</span>
            <span>{profile.xp} / {profile.level * 100} XP</span>
          </div>
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/[0.05] shadow-inner">
            <div className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] transition-all" style={{ width: `${(profile.xp % 100)}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3.5 flex flex-col items-center text-center shadow-lg">
            <span className="text-xl font-black text-emerald-400 mb-0.5 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">{profile.stats.wins}</span>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Победы</span>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3.5 flex flex-col items-center text-center shadow-lg">
            <span className="text-xl font-black text-red-400 mb-0.5 drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]">{profile.stats.losses}</span>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Поражения</span>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3.5 flex flex-col items-center text-center shadow-lg">
            <span className="text-xl font-black text-cyan-400 mb-0.5 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">
              {profile.stats.wins > 0 ? Math.round((profile.stats.wins / (profile.stats.wins + profile.stats.losses)) * 100) : 0}%
            </span>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Винрейт</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderScreen = () => {
    switch (screen) {
      case 'HOME': return renderHome();
      case 'MODES': return renderModes();
      case 'MODE_DETAIL': return renderModeDetail();
      case 'TABLES': return renderTables();
      case 'PROFILE': return renderProfile();
      default: return renderHome();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#080a0f] flex items-center justify-center overflow-hidden font-sans select-none">
      <Toast message={toastMessage} type="error" onClose={() => setToastMessage(null)} />
      <div className="w-full h-full flex flex-col bg-[#080a0f] text-zinc-100 overflow-hidden relative md:max-w-[460px] md:border-x md:border-white/[0.05] shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        
        {renderScreen()}

        {/* НИЖНИЙ НАВИГАЦИОННЫЙ ДОК (Скрыт в деталях дела, чтобы не перекрывать кнопку «Начать операцию») */}
        {screen !== 'MODE_DETAIL' && (
          <div className="fixed md:absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-2xl border-t border-white/10 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 px-6 flex justify-around items-center z-40">
            <button 
              onClick={() => { setScreen('HOME'); onTabChange('LOBBY'); }} 
              className={`flex flex-col items-center gap-1.5 p-2 transition cursor-pointer ${screen === 'HOME' || screen === 'MODES' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Icons.Home />
              <span className="text-[8px] font-black tracking-widest uppercase">Штаб</span>
            </button>
            <button 
              onClick={() => { setScreen('TABLES'); onTabChange('TABLES'); }} 
              className={`flex flex-col items-center gap-1.5 p-2 transition cursor-pointer ${screen === 'TABLES' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Icons.Cards />
              <span className="text-[8px] font-black tracking-widest uppercase">Столы</span>
            </button>
            <button 
              onClick={() => { setScreen('PROFILE'); onTabChange('TOP'); }} 
              className={`flex flex-col items-center gap-1.5 p-2 transition cursor-pointer ${screen === 'PROFILE' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Icons.User />
              <span className="text-[8px] font-black tracking-widest uppercase">Профиль</span>
            </button>
          </div>
        )}

        {/* МОДАЛКА СОЗДАНИЯ КОМНАТЫ */}
        {isCreateRoomOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#080a0f]/90 backdrop-blur-md p-4">
            <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/15 p-6 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
              <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest mb-5 border-b border-white/10 pb-3">
                Протокол: Новая операция
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">
                    Сценарий
                  </label>
                  <select
                    value={createRoomMode}
                    onChange={(e) => setCreateRoomMode(e.target.value as GameModeType)}
                    className="w-full bg-zinc-950/80 border border-white/15 rounded-xl px-4 py-3 text-xs font-black tracking-widest text-zinc-200 focus:border-red-500 outline-none appearance-none transition uppercase shadow-inner cursor-pointer"
                  >
                    <option value="SKHVATKA">Схватка</option>
                    <option value="SECRET_SERVICE">Секретная служба</option>
                    <option value="MANIAC_VS_OPERATIVE">Маньяк против оперативника</option>
                    <option value="THIEF_HUNT">Охота на грабителя</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/10 flex items-center justify-between shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Финансирование</span>
                    <span className="text-[10px] text-zinc-300 font-mono mt-0.5">Без списания средств</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 border border-zinc-700 rounded px-2 py-0.5">Free</span>
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-1">
                  <input
                    type="checkbox"
                    checked={createRoomIsPrivate}
                    onChange={(e) => setCreateRoomIsPrivate(e.target.checked)}
                    className="w-4 h-4 accent-red-600 bg-zinc-900 border-zinc-700 rounded-sm"
                  />
                  <span className="text-[10px] font-black tracking-widest text-zinc-300 uppercase">Закрытый канал (по шифру)</span>
                </label>

                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <button onClick={() => setIsCreateRoomOpen(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-black tracking-widest uppercase transition border border-white/5 cursor-pointer">
                    Отмена
                  </button>
                  <button onClick={handleConfirmCreateRoom} disabled={isCreating} className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-40 text-white rounded-xl text-[10px] font-black tracking-widest uppercase transition shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">
                    {isCreating ? "Инициализация..." : "Утвердить"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ЭКРАН ОЖИДАНИЯ СОПЕРНИКА */}
        {isWaitingForOpponent && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#080a0f]/90 backdrop-blur-md p-4">
            <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/15 p-8 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
              <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">Шифр операции</div>
              <div className="text-4xl font-black text-zinc-100 tracking-widest font-mono mb-8 border border-white/10 rounded-2xl px-8 py-4 bg-zinc-950/70 shadow-inner">
                {mpService.roomCode}
              </div>

              <div className="flex justify-center mb-8">
                <div className="w-12 h-12 border-2 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
              </div>

              <div className="text-[10px] text-zinc-300 font-black tracking-widest uppercase animate-pulse mb-8">
                {mpService.isHost ? "Ожидание подключения агента..." : "Синхронизация с хостом..."}
              </div>

              <button
                onClick={() => {
                  mpService.disconnect();
                  refundBet(createRoomBet || 250);
                  setIsWaitingForOpponent(false);
                  setIsCreating(false);
                }}
                className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10 rounded-xl text-[10px] font-black tracking-widest uppercase transition pointer-events-auto cursor-pointer z-50"
              >
                Прервать операцию
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};