import { useState, useEffect, useRef } from "react";
import type { GameModeType, OpponentType, Role } from "../types/game";
import type { UserProfile } from "../types/profile";
import { triggerHaptic, setHapticsEnabled } from "../utils/haptics";
import { mpService, type PublicRoomMeta } from "../utils/multiplayerPeer";
import { soundManager } from "../utils/audio";
import { Toast } from "./Toast";
import { TutorialScreen } from "./TutorialScreen";
import { useTranslation } from "../i18n/context";

// --- ВЕКТОРНЫЕ ИКОНКИ (HUD) ---
const Icons = {
  CardsDeck: ({ className = "w-6 h-6 text-zinc-300" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <rect x="5" y="2" width="14" height="18" rx="2" />
      <line x1="9" y1="2" x2="9" y2="20" opacity="0.3" />
      <line x1="15" y1="2" x2="15" y2="20" opacity="0.3" />
      <rect x="3" y="5" width="2" height="12" rx="0.5" opacity="0.5" />
      <rect x="19" y="5" width="2" height="12" rx="0.5" opacity="0.5" />
    </svg>
  ),
  EvidenceCards: ({ className = "w-6 h-6 text-cyan-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="13" y2="11" />
    </svg>
  ),
  TokensGroup: ({ className = "w-6 h-6 text-amber-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="9" cy="9" r="6" />
      <circle cx="15" cy="15" r="6" />
      <path d="M9 7v4M7 9h4" opacity="0.6" />
    </svg>
  ),
  Coin: ({ className = "w-4 h-4 text-amber-400" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" />
    </svg>
  ),
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
  {
    id: "LINE_UP" as GameModeType,
    title: "Очная ставка",
    players: "2 игрока",
    time: "8 мин",
    difficulty: "Средняя",
    description: "Интеллектуальная детективная дуэль: 25 подозреваемых, каталог вопросов с дедукцией и штрафы за ложные обвинения.",
    isAvailable: true,
    killerRoleName: "Подозреваемый",
    detectiveRoleName: "Следователь",
  },
];

const ROOM_FILTERS = [
  { id: "ALL", label: "Все" },
  { id: "LINE_UP", label: "Дуэль" },
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
  onOpenDevPanel?: () => void;
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
  onOpenDevPanel,
}: MainMenuProps) => {
  const { t, lang, setLang } = useTranslation();
  
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
  const [createRoomBet] = useState<number>(250);
  const [createRoomIsPrivate, setCreateRoomIsPrivate] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(profile.nickname);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSfxEnabled, setIsSfxEnabled] = useState(soundManager.getSfxEnabled());
  const [isAmbientEnabled, setIsAmbientEnabled] = useState(soundManager.getAmbientEnabled());
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(() => {
    return localStorage.getItem("crime_city_haptics") !== "false";
  });
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [, setTutorialStep] = useState(1);

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
          onStartGame(autoMode, "ONLINE", "KILLER", isSecretService ? 2 : 2, isSecretService ? 4 : 3, 0, 250);
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
        onStartGame(createRoomMode, "ONLINE", "KILLER", createRoomMode === "SECRET_SERVICE" ? 2 : 2, createRoomMode === "SECRET_SERVICE" ? 4 : 3, 0, createRoomBet);
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
    <div className="relative flex-1 flex flex-col bg-[#080a0f] overflow-hidden">
      {/* Фоновое изображение без срезания верхушек */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img 
          src="./bg-main.png" 
          alt="Реквием: последний выстрел" 
          className="w-full h-full object-cover object-[70%_top] opacity-95"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.endsWith("/bg-main.png")) target.src = "/bg-main.png";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080a0f]/20 to-[#080a0f]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080a0f]/95 via-[#080a0f]/40 to-transparent w-[60%]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-between pt-[max(0.5rem,env(safe-area-inset-top))] pb-3 px-5">

        <div>
          {/* Header Overlay */}
          <div className="flex items-center justify-between shrink-0 mb-4">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 rounded-full bg-black/75 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer shadow-lg active:scale-95"
              title="Настройки"
            >
              <Icons.Settings />
            </button>
            
            <div className="flex flex-col items-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Позывной</span>
              <span className="text-sm font-black tracking-widest text-zinc-100 uppercase">{profile.nickname}</span>
            </div>

            <div
              onClick={onOpenDevPanel}
              className="rounded-full bg-black/75 border border-white/10 hover:border-amber-500/50 hover:bg-amber-950/20 px-3.5 py-1.5 flex items-center gap-1.5 shadow-lg cursor-pointer transition active:scale-95"
              title="Открыть Dev-панель"
            >
              <Icons.Coin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-zinc-100 font-mono text-xs font-bold">{profile.cash.toLocaleString()}</span>
            </div>
          </div>

          {/* Заголовок игры */}
          <div className="max-w-[60%] text-left -rotate-3 select-none">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white uppercase leading-none drop-shadow-[0_4px_20px_rgba(0,0,0,1)]">
              {t.menu.title}
            </h1>
            <div className="text-red-500 font-black text-xs sm:text-sm tracking-widest uppercase mt-1 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
              {t.menu.subtitle}
            </div>
            <p className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase mt-2 leading-tight drop-shadow-md">
              {t.menu.desc}
            </p>
          </div>
        </div>

        {/* Main Actions */}
        <div className="w-full max-w-lg md:max-w-xl mx-auto flex flex-col gap-2.5 md:gap-3.5 shrink-0">
          {hasActiveGame && (
            <button
              onClick={onResumeGame}
              className="w-full h-11 sm:h-12 md:h-16 bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 border border-white/10 border-t-white/20 rounded-2xl flex items-center justify-between px-5 md:px-6 text-white shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-white/25 active:scale-[0.99] transition cursor-pointer"
            >
              <span className="font-black tracking-widest uppercase text-[10px] sm:text-xs md:text-sm">{t.menu.resume}</span>
              <Icons.ArrowRight />
            </button>
          )}

          <button
            onClick={handleQuickPlay}
            disabled={isCreating}
            className="w-full h-12 sm:h-[52px] md:h-16 rounded-full bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white font-black tracking-widest uppercase flex items-center justify-between px-6 md:px-8 border-t border-red-400/50 shadow-[0_10px_25px_rgba(220,38,38,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Icons.Play />
              <span className="text-[11px] sm:text-xs md:text-sm">{isCreating ? t.menu.searching : t.menu.quickPlay}</span>
            </div>
            <span className="text-[10px] md:text-xs font-mono text-red-200/80 flex items-center gap-1">
              <Icons.Coin className="w-3 h-3 text-amber-400 shrink-0" />
              250
            </span>
          </button>

          <div className="flex flex-col gap-2 sm:gap-2.5 md:gap-3.5 mt-1">
            <button onClick={() => { setSelectedOpponent("AI"); setScreen('MODES'); }} className="w-full h-11 sm:h-12 md:h-16 bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 border border-white/10 border-t-white/20 rounded-2xl flex items-center justify-between px-5 md:px-6 text-white shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-white/25 active:scale-[0.99] transition cursor-pointer">
              <div className="flex items-center gap-3.5">
                <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-zinc-400 shrink-0"><Icons.Cards /></div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] sm:text-xs md:text-sm font-black text-zinc-100 uppercase tracking-widest">{t.menu.soloCases}</span>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.menu.soloDesc}</span>
                </div>
              </div>
              <Icons.ChevronRight />
            </button>

            <button onClick={() => { setSelectedOpponent("PVP"); setScreen('MODES'); }} className="w-full h-11 sm:h-12 md:h-16 bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 border border-white/10 border-t-white/20 rounded-2xl flex items-center justify-between px-5 md:px-6 text-white shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-white/25 active:scale-[0.99] transition cursor-pointer">
              <div className="flex items-center gap-3.5">
                <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-zinc-400 shrink-0"><Icons.Users /></div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] sm:text-xs md:text-sm font-black text-zinc-100 uppercase tracking-widest">{t.menu.localDuel}</span>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.menu.localDesc}</span>
                </div>
              </div>
              <Icons.ChevronRight />
            </button>

            <button onClick={() => { setScreen('TABLES'); onTabChange('TABLES'); }} className="w-full h-11 sm:h-12 md:h-16 bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 border border-white/10 border-t-white/20 rounded-2xl flex items-center justify-between px-5 md:px-6 text-white shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-white/25 active:scale-[0.99] transition cursor-pointer">
              <div className="flex items-center gap-3.5">
                <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-zinc-400 shrink-0"><Icons.Users /></div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] sm:text-xs md:text-sm font-black text-zinc-100 uppercase tracking-widest">{t.menu.onlineOps}</span>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.menu.onlineDesc}</span>
                </div>
              </div>
              <Icons.ChevronRight />
            </button>

            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3.5">
              <button onClick={onOpenRules} className="w-full h-11 sm:h-12 md:h-16 bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 border border-white/10 border-t-white/20 rounded-2xl flex items-center justify-center gap-2 px-2.5 md:px-4 text-white shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-white/25 active:scale-[0.99] transition cursor-pointer">
                <div className="text-zinc-400"><Icons.Shield /></div>
                <div className="flex flex-col items-start">
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-black text-zinc-100 uppercase tracking-widest">{t.menu.rulebook}</span>
                  <span className="text-[7px] sm:text-[8px] md:text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{t.menu.rulebookDesc}</span>
                </div>
              </button>

              <button onClick={() => setIsTutorialOpen(true)} className="w-full h-11 sm:h-12 md:h-16 bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 border border-white/10 border-t-white/20 rounded-2xl flex items-center justify-center gap-2 px-2.5 md:px-4 text-white shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-white/25 active:scale-[0.99] transition cursor-pointer">
                <div className="text-zinc-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-black text-zinc-100 uppercase tracking-widest">{t.menu.tutorial}</span>
                  <span className="text-[7px] sm:text-[8px] md:text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{t.menu.tutorialDesc}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- ЭКРАН 2: ВЫБОР ИГРЫ (КАТАЛОГ СЦЕНАРИЕВ) ---
  const renderModes = () => (
    <div className="flex-1 flex flex-col bg-[#080a0f] overflow-hidden">
      <div className="flex items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 shrink-0 border-b border-white/10 bg-[#080a0f]">
        <button onClick={() => setScreen('HOME')} className="text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer">
          <Icons.ChevronLeft />
          <span className="text-[10px] font-black uppercase tracking-widest">Назад</span>
        </button>
        <h2 className="absolute left-1/2 -translate-x-1/2 text-sm md:text-base font-black tracking-widest text-zinc-100 uppercase">Выбор игры</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 custom-scrollbar pb-[max(6rem,env(safe-area-inset-bottom))]">
        <div className="w-full md:max-w-2xl lg:max-w-3xl mx-auto space-y-3.5">
          {GAME_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => { setSelectedMode(mode.id); setScreen('MODE_DETAIL'); }}
              className="w-full bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 backdrop-blur-xl border border-white/10 border-t-white/20 rounded-2xl p-4 md:p-6 flex items-center gap-4 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition text-left shadow-[0_4px_20px_rgba(0,0,0,0.4)] cursor-pointer"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-center shrink-0 text-zinc-500 shadow-inner">
                <Icons.Crosshair />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs md:text-base font-black text-zinc-100 uppercase tracking-widest mb-1 truncate">{mode.title}</h3>
                <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1.5">
                  <span className="flex items-center gap-1"><Icons.Users /> {mode.players}</span>
                  <span className="flex items-center gap-1"><Icons.Clock /> {mode.time}</span>
                </div>
                <p className="text-[10px] md:text-xs text-zinc-400 line-clamp-2 leading-relaxed">{mode.description}</p>
              </div>
              <div className="text-zinc-500 shrink-0"><Icons.ChevronRight /></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // --- ЭКРАН 3: КАРТОЧКА ДЕЛА И СТАРТ (МАКЕТ 1) ---
  const renderModeDetail = () => (
    <div className="flex-1 flex flex-col bg-[#080a0f] overflow-hidden relative">
      <div className="flex items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-white/10 z-10 bg-[#080a0f]">
        <button onClick={() => setScreen('MODES')} className="text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer">
          <Icons.ChevronLeft />
          <span className="text-[10px] font-black uppercase tracking-widest">Назад</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-[max(7rem,env(safe-area-inset-bottom))]">
        <div className="px-6 py-5 w-full md:max-w-2xl lg:max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-bold">
              {activeModeData.players}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-300 text-xs font-bold">
              {activeModeData.time}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest leading-tight mb-2">
            {activeModeData.title}
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 leading-relaxed mb-6">
            {activeModeData.description}
          </p>

          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">
            СОСТАВ ИГРЫ
          </h3>
          <div className="grid grid-cols-3 gap-2.5 mb-6">
            <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-3 flex flex-col items-center text-center gap-1 shadow-md">
              <Icons.CardsDeck className="w-6 h-6 text-zinc-300 mb-0.5" />
              <span className="text-xs font-black text-zinc-100 uppercase tracking-wider">25 карт</span>
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">подозреваемых</span>
            </div>
            <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-3 flex flex-col items-center text-center gap-1 shadow-md">
              <Icons.EvidenceCards className="w-6 h-6 text-cyan-400 mb-0.5" />
              <span className="text-xs font-black text-zinc-100 uppercase tracking-wider">25 карт</span>
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">доказательств</span>
            </div>
            <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-3 flex flex-col items-center text-center gap-1 shadow-md">
              <Icons.TokensGroup className="w-6 h-6 text-amber-400 mb-0.5" />
              <span className="text-xs font-black text-zinc-100 uppercase tracking-wider">6 жетонов</span>
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">улик / алиби</span>
            </div>
          </div>

          <h3 className="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-widest mb-2.5">
            Формат партии
          </h3>
          <div className="flex bg-zinc-950/80 p-1 rounded-xl border border-white/[0.08] mb-5 shadow-inner">
            {(['AI', 'PVP', 'ONLINE'] as OpponentType[]).map(opp => (
              <button
                key={opp}
                onClick={() => setSelectedOpponent(opp)}
                className={`flex-1 py-2.5 md:py-3 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition cursor-pointer ${selectedOpponent === opp ? 'bg-zinc-800 text-white shadow-md border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {opp === 'AI' ? 'Против ИИ' : opp === 'PVP' ? 'Локально' : 'Онлайн'}
              </button>
            ))}
          </div>

          {selectedOpponent === 'AI' && activeModeData.id !== 'SECRET_SERVICE' && (
            <>
              <h3 className="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-widest mb-2.5">Ваша роль</h3>
              <div className="flex gap-3 mb-5">
                <button
                  onClick={() => setSelectedRole('DETECTIVE')}
                  className={`flex-1 py-3 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-widest transition cursor-pointer ${selectedRole === 'DETECTIVE' ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-zinc-900/60 border-white/[0.08] text-zinc-500'}`}
                >
                  {activeModeData.detectiveRoleName}
                </button>
                <button
                  onClick={() => setSelectedRole('KILLER')}
                  className={`flex-1 py-3 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-widest transition cursor-pointer ${selectedRole === 'KILLER' ? 'bg-red-950/40 border-red-500/60 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-zinc-900/60 border-white/[0.08] text-zinc-500'}`}
                >
                  {activeModeData.killerRoleName}
                </button>
              </div>
            </>
          )}

          {activeModeData.id === 'SECRET_SERVICE' && selectedOpponent === 'AI' && (
            <>
              <h3 className="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-widest mb-2.5">Агенты ИИ</h3>
              <div className="flex gap-3 mb-5">
                <button onClick={() => setPlayerCount(2)} className={`flex-1 py-3 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-widest transition cursor-pointer ${playerCount === 2 ? 'bg-zinc-800 border-zinc-500 text-white shadow-md' : 'bg-zinc-900/60 border-white/[0.08] text-zinc-500'}`}>1 Бот</button>
                <button onClick={() => setPlayerCount(3)} className={`flex-1 py-3 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-widest transition cursor-pointer ${playerCount === 3 ? 'bg-zinc-800 border-zinc-500 text-white shadow-md' : 'bg-zinc-900/60 border-white/[0.08] text-zinc-500'}`}>2 Бота</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#080a0f] via-[#080a0f]/90 to-transparent pb-[max(1rem,env(safe-area-inset-bottom))] z-20">
        <div className="w-full md:max-w-2xl lg:max-w-3xl mx-auto">
          <button
            onClick={() => {
              if (selectedOpponent === 'ONLINE') {
                setCreateRoomMode(selectedMode);
                setIsCreateRoomOpen(true);
              } else {
                onStartGame(selectedMode, selectedOpponent, selectedRole, playerCount, selectedMode === "SECRET_SERVICE" ? 4 : 3, 0, 0);
              }
            }}
            className="w-full h-14 md:h-16 rounded-full bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white font-black tracking-widest uppercase flex items-center justify-center gap-3 border-t border-red-400/50 shadow-[0_10px_25px_rgba(220,38,38,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-[0.98] transition cursor-pointer md:text-sm"
          >
            <span>НАЧАТЬ ИГРУ</span>
            <Icons.ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );

  // --- ЭКРАН 4: ОПЕРАТИВНЫЕ СТОЛЫ (ТАКТИЧЕСКИЙ ТЕРМИНАЛ) ---
  const renderTables = () => (
    <div className="flex-1 min-h-0 flex flex-col bg-[#080a0f] overflow-hidden">
      {/* Шапка терминала */}
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

      {/* Список столов или радар пустого эфира (СТРОГО ОДИН БЛОК) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar flex flex-col">
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-white/[0.08] rounded-3xl bg-zinc-900/30 shadow-inner my-auto">
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
              className="bg-gradient-to-b from-zinc-800/60 to-zinc-950/80 border border-white/10 border-t-white/20 rounded-2xl p-4 flex flex-col gap-3.5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition shadow-lg"
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
                  <Icons.Coin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
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
      <div className="w-full shrink-0 bg-[#080a0f] border-t border-white/10 p-4 flex flex-col gap-2.5 z-20">
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
      <div className="flex items-center px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-4 shrink-0 border-b border-white/10 bg-[#080a0f]">
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

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900/60 border border-white/[0.05] rounded-xl p-3 flex flex-col items-center text-center">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
              <Icons.Coin className="w-3 h-3 text-amber-400 shrink-0" />
              Баланс
            </span>
            <span className="text-sm font-black text-amber-500 font-mono drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">{profile.cash.toLocaleString()}</span>
          </div>
          <div className="bg-zinc-900/60 border border-white/[0.05] rounded-xl p-3 flex flex-col items-center text-center">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Всего дел</span>
            <span className="text-sm font-black text-zinc-100 font-mono">{profile.stats.wins + profile.stats.losses}</span>
          </div>
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

        <div className="bg-zinc-900/40 border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Вводный пролог</span>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5">Обучение основам</span>
          </div>
          {localStorage.getItem("crime_city_tutorial") ? (
             <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest px-2 py-1 bg-emerald-950/30 rounded border border-emerald-900/50">Пройдено</span>
          ) : (
             <button onClick={() => { setScreen('HOME'); setIsTutorialOpen(true); }} className="text-[9px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest px-3 py-1.5 bg-cyan-950/50 rounded border border-cyan-900/50 transition cursor-pointer">Начать</button>
          )}
        </div>
      </div>
    </div>
  );

  const handleFinishTutorial = () => {
    const completed = localStorage.getItem("crime_city_tutorial");
    if (!completed) {
      if (onUpdateProfile) onUpdateProfile({ cash: profile.cash + 250 });
      localStorage.setItem("crime_city_tutorial", "true");
      setToastMessage("+250 за прохождение обучения!");
    }
    setIsTutorialOpen(false);
    setTutorialStep(1);
  };

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

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX <= 32) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    } else {
      touchStartRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (deltaX > 60 && Math.abs(deltaY) < 40) {
      triggerHaptic("light");
      
      if (isTutorialOpen) {
        setIsTutorialOpen(false);
      } else if (isSettingsOpen) {
        setIsSettingsOpen(false);
      } else if (isCreateRoomOpen) {
        setIsCreateRoomOpen(false);
      } else if (screen === 'MODE_DETAIL') {
        setScreen('MODES');
      } else if (screen === 'MODES') {
        setScreen('HOME');
      } else if (screen === 'TABLES' || screen === 'PROFILE') {
        setScreen('HOME');
        onTabChange('LOBBY');
      }
    }
    touchStartRef.current = null;
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 bg-[#050608] flex justify-center overflow-hidden font-sans select-none text-zinc-100"
    >
      <Toast message={toastMessage} type="error" onClose={() => setToastMessage(null)} />
      
      {/* Полноэкранный адаптивный фрейм: на мобилке и планшетах во всю ширину, на широких ПК центрирован до max-w-5xl */}
      <div className="w-full 2xl:max-w-5xl 2xl:mx-auto h-full flex flex-col justify-between bg-[#080a0f] 2xl:border-x 2xl:border-white/10 2xl:shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden">
        {/* Контент текущего экрана */}
        <div className="w-full flex-1 min-h-0 flex flex-col relative overflow-hidden">
          {renderScreen()}
        </div>

        {/* НИЖНИЙ НАВИГАЦИОННЫЙ ДОК */}
        {screen !== 'MODE_DETAIL' && (
          <nav className="w-full shrink-0 bg-[#080a0f] border-t border-white/10 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] md:py-3 px-6 flex justify-around items-center z-40">
          <button 
            onClick={() => { setScreen('HOME'); onTabChange('LOBBY'); }} 
            className={`flex flex-col items-center gap-1.5 p-1.5 transition cursor-pointer ${screen === 'HOME' || screen === 'MODES' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Icons.Home />
            <span className="text-[8px] md:text-[10px] font-black tracking-widest uppercase">{t.nav.hq}</span>
          </button>
          <button 
            onClick={() => { setScreen('TABLES'); onTabChange('TABLES'); }} 
            className={`flex flex-col items-center gap-1.5 p-1.5 transition cursor-pointer ${screen === 'TABLES' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Icons.Cards />
            <span className="text-[8px] md:text-[10px] font-black tracking-widest uppercase">{t.nav.tables}</span>
          </button>
          <button 
            onClick={() => { setScreen('PROFILE'); onTabChange('TOP'); }} 
            className={`flex flex-col items-center gap-1.5 p-1.5 transition cursor-pointer ${screen === 'PROFILE' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Icons.User />
            <span className="text-[8px] md:text-[10px] font-black tracking-widest uppercase">{t.nav.profile}</span>
          </button>
        </nav>
        )}

        {/* МОДАЛКА СОЗДАНИЯ КОМНАТЫ */}
        {isCreateRoomOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#080a0f]/90 backdrop-blur-md p-4" onClick={() => setIsCreateRoomOpen(false)}>
            <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/15 p-6 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()}>
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
                    <option value="LINE_UP">Очная ставка (Дуэль)</option>
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
                  setIsWaitingForOpponent(false);
                  setIsCreating(false);
                }}
                className="w-full py-3.5 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 border border-white/5 rounded-xl text-[10px] font-black tracking-widest uppercase transition pointer-events-auto cursor-pointer z-50"
              >
                Прервать операцию
              </button>
            </div>
          </div>
        )}

        {/* ЭКРАН ОБУЧЕНИЯ (ПРОЛОГ) */}
        {isTutorialOpen && (
          <TutorialScreen 
            onExit={() => setIsTutorialOpen(false)} 
            onFinish={handleFinishTutorial} 
          />
        )}

        {/* МОДАЛКА НАСТРОЕК */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#080a0f]/90 backdrop-blur-md p-4" onClick={() => setIsSettingsOpen(false)}>
            <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-3">
                <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest">
                  {t.settings.title}
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-500 hover:text-white transition cursor-pointer">
                  ✕
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{t.settings.sfx}</span>
                    <span className="text-[9px] text-zinc-600 font-mono mt-0.5">{t.settings.sfxDesc}</span>
                  </div>
                  <button 
                    onClick={() => {
                      const enabled = soundManager.toggleSfx();
                      setIsSfxEnabled(enabled);
                    }}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${isSfxEnabled ? 'bg-red-600' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isSfxEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{t.settings.ambient}</span>
                    <span className="text-[9px] text-zinc-600 font-mono mt-0.5">{t.settings.ambientDesc}</span>
                  </div>
                  <button 
                    onClick={() => {
                      const enabled = soundManager.toggleAmbient();
                      setIsAmbientEnabled(enabled);
                    }}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${isAmbientEnabled ? 'bg-red-600' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isAmbientEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{t.settings.haptics}</span>
                    <span className="text-[9px] text-zinc-600 font-mono mt-0.5">{t.settings.hapticsDesc}</span>
                  </div>
                  <button 
                    onClick={() => {
                      const newVal = !isHapticsEnabled;
                      setIsHapticsEnabled(newVal);
                      setHapticsEnabled(newVal);
                      if (newVal) triggerHaptic("medium");
                    }}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${isHapticsEnabled ? 'bg-red-600' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isHapticsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{t.settings.language}</span>
                    <span className="text-[9px] text-zinc-600 font-mono mt-0.5">Выберите язык / Select language</span>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setLang('ru')}
                      className={`px-3 py-1 rounded-md text-[10px] font-black transition-colors cursor-pointer ${lang === 'ru' ? 'bg-red-600 text-white shadow-md' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                      RU
                    </button>
                    <button 
                      onClick={() => setLang('en')}
                      className={`px-3 py-1 rounded-md text-[10px] font-black transition-colors cursor-pointer ${lang === 'en' ? 'bg-red-600 text-white shadow-md' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={() => setIsSettingsOpen(false)} className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black tracking-widest uppercase transition border border-white/5 cursor-pointer">
                {t.settings.close}
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
  );
};