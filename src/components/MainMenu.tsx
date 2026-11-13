import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import type { GameModeType, OpponentType, Role } from "../types/game";
import type { UserProfile } from "../types/profile";
import { triggerHaptic, setHapticsEnabled } from "../utils/haptics";
import { partyService } from "../utils/partyPeer";
import { soundManager } from "../utils/audio";
import { Toast } from "./Toast";
import { BiometricSlider } from "./BiometricSlider";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { Icons } from "./ui/Icons";
import { useBannerViewer } from "../contexts/BannerViewerContext";
import { GAME_MODES_META, getGameModesList, getGameModeTitle, getGameModeShortTitle } from "../constants/gameMeta";
import lobbyBg from "../assets/lobby_background.webp";

const MODE_BANNER_IMAGE: Record<GameModeType, string> = {
  MANIAC_VS_OPERATIVE: "/assets/modes/maniac-banner.webp",
  THIEF_HUNT: "/assets/modes/thief-banner.webp",
  SECRET_SERVICE: "/assets/modes/secret-service-banner.webp",
  LINE_UP: "/assets/modes/lineup-banner.webp",
};

import { TablesScreen } from "./TablesScreen";
import { ProfileScreen } from "./ProfileScreen";

// Асинхронный динамический чанк для тяжелого модуля Академии (TASK-ARCH-001)
const TutorialScreen = lazy(() => import("./TutorialScreen").then((m) => ({ default: m.TutorialScreen })));

const ScreenFallback = () => (
  <div className="flex-1 w-full flex items-center justify-center min-h-[300px] text-blue-400 select-none">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-400 rounded-full animate-spin" />
      <span className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
        Загрузка...
      </span>
    </div>
  </div>
);

const TutorialFullscreenFallback = () => (
  <div className="fixed inset-0 z-[100] bg-[#080a0f] flex items-center justify-center select-none">
    <div className="flex flex-col items-center gap-3">
      <div className="w-9 h-9 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
      <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
        Загрузка Академии...
      </span>
    </div>
  </div>
);

declare const __BUILD_TIMESTAMP__: string;
import { useTranslation } from "../i18n/context";

const MODE_ICONS: Record<GameModeType, React.ComponentType<{ className?: string }>> = {
  MANIAC_VS_OPERATIVE: Icons.Fingerprint,
  THIEF_HUNT: Icons.ShieldLock,
  SECRET_SERVICE: Icons.RadioRadar,
  LINE_UP: Icons.Search,
};

const GAME_MODES = getGameModesList().map((mode) => ({
  ...mode,
  icon: MODE_ICONS[mode.id],
}));

const ROOM_FILTERS = [
  { id: "ALL", label: "Все" },
  { id: "MANIAC_VS_OPERATIVE", label: GAME_MODES_META.MANIAC_VS_OPERATIVE.shortTitle.ru },
  { id: "THIEF_HUNT", label: GAME_MODES_META.THIEF_HUNT.shortTitle.ru },
  { id: "SECRET_SERVICE", label: GAME_MODES_META.SECRET_SERVICE.shortTitle.ru },
  { id: "LINE_UP", label: GAME_MODES_META.LINE_UP.shortTitle.ru },
];

type ScreenType = 'HOME' | 'MODES' | 'MODE_DETAIL' | 'PROFILE' | 'TABLES';

interface MainMenuProps {
  onStartTvParty?: (role?: "TV_DISPLAY" | "CONTROLLER") => void;
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
  onStartTvParty,
  hasActiveGame,
  onResumeGame,
  onOpenRules,
  onOpenDevPanel,
}: MainMenuProps) => {
  const { t, lang, setLang } = useTranslation();
  
  const [screen, setScreen] = useState<ScreenType>('HOME');
  const [navDirection, setNavDirection] = useState<'forward' | 'backward' | 'none'>('none');

  const navigateTo = (nextScreen: ScreenType) => {
    setNavDirection('forward');
    setScreen(nextScreen);
  };

  const navigateBack = (prevScreen: ScreenType) => {
    setNavDirection('backward');
    setScreen(prevScreen);
  };
  const [selectedMode, setSelectedMode] = useState<GameModeType>("MANIAC_VS_OPERATIVE");
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentType>("AI");
  const [selectedRole, setSelectedRole] = useState<Role>("DETECTIVE");
  const [isTvPartyModalOpen, setIsTvPartyModalOpen] = useState(false);
  const [playerCount, setPlayerCount] = useState<number>(3);
  const { openBanner: handleOpenBanner } = useBannerViewer();

  const [publicRooms, setPublicRooms] = useState<Array<{
    roomCode: string;
    mode: string;
    hostName: string;
    status: string;
    playersCount: number;
    maxPlayers: number;
    bet?: number;
  }>>([]);
  const [joinCode, setJoinCode] = useState("");
  const [roomFilter, setRoomFilter] = useState<string>("ALL");
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [createRoomMode, setCreateRoomMode] = useState<GameModeType>("MANIAC_VS_OPERATIVE");
  const [createRoomBet] = useState<number>(250);
  const [createRoomIsPrivate, setCreateRoomIsPrivate] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [partyRoomCode, setPartyRoomCode] = useState<string>("");
  const [showShareToast, setShowShareToast] = useState(false);

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
    if (activeTab === "LOBBY" && screen !== 'HOME' && screen !== 'MODES' && screen !== 'MODE_DETAIL') {
      setNavDirection('none');
      setScreen('HOME');
    }
    if (activeTab === "TABLES" && screen !== 'TABLES') {
      setNavDirection('none');
      setScreen('TABLES');
    }
    if (activeTab === "TOP" && screen !== 'PROFILE') {
      setNavDirection('none');
      setScreen('PROFILE');
    }
  }, [activeTab]);

  useEffect(() => {
    // Фоновая предзагрузка тяжелого чанка Академии после инициализации меню
    const prefetchTimer = setTimeout(() => {
      import("./TutorialScreen");
    }, 1200);
    return () => clearTimeout(prefetchTimer);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    const loadRooms = async () => {
      if (screen === "TABLES") {
        try {
          const rooms = await partyService.fetchPublicRooms();
          if (isSubscribed) {
            setPublicRooms(rooms as any);
          }
        } catch (e) {
          console.warn("fetchPublicRooms error:", e);
        }
      }
    };

    if (screen === "TABLES") {
      loadRooms();
      timer = setInterval(loadRooms, 3000);
    }

    return () => {
      isSubscribed = false;
      if (timer) clearInterval(timer);
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

  const connectToPartyRoom = (
    code: string,
    mode: GameModeType,
    isHost: boolean,
    _bet: number = 250,
    isPrivate: boolean = false,
  ) => {
    const cleanCode = String(code).trim();
    partyService.roomCode = cleanCode;
    setPartyRoomCode(cleanCode);
    setIsCreating(false);
    setIsCreateRoomOpen(false);
    setIsWaitingForOpponent(true);

    sessionStorage.setItem(
      "mp_session",
      JSON.stringify({
        roomCode: cleanCode,
        isHost,
        mode,
        nickname: profile.nickname,
      })
    );

    partyService.connect(cleanCode, profile.nickname || "Агент", isHost, mode, undefined, undefined, isPrivate);
  };
  

  const [matchmakingCancel, setMatchmakingCancel] = useState<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (matchmakingCancel) {
        matchmakingCancel();
      }
    };
  }, [matchmakingCancel]);

  const handleQuickPlay = async () => {
    triggerHaptic("heavy");
    setIsCreating(true);

    const cancelFn = partyService.startMatchmaking(
      {
        mode: "MANIAC_VS_OPERATIVE",
        nickname: profile.nickname || "Агент",
        rank: profile.rank || "СТАЖЁР",
        bet: 250,
      },
      (event) => {
        if (event.type === "MATCH_FOUND") {
          setIsCreating(false);
          setMatchmakingCancel(null);
          const { roomCode, mode, isHost, bet, isAiMatch, role } = event.payload;

          if (isAiMatch) {
            onStartGame(
              mode || "MANIAC_VS_OPERATIVE",
              "AI",
              role || "KILLER",
              2,
              3,
              16,
              bet || 250
            );
          } else {
            connectToPartyRoom(roomCode, mode || "MANIAC_VS_OPERATIVE", isHost, bet || 250, false);
          }
        } else if (event.type === "ERROR" || event.type === "QUEUE_LEFT") {
          setIsCreating(false);
          setMatchmakingCancel(null);
        }
      }
    );

    setMatchmakingCancel(() => cancelFn);
  };

  const handleConfirmCreateRoom = () => {
    triggerHaptic("medium");
    setIsCreating(true);
    setIsCreateRoomOpen(false);
    const code = `room_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    connectToPartyRoom(code, createRoomMode, true, createRoomBet, createRoomIsPrivate);
  };

  const handleJoinRoom = (code: string, mode?: GameModeType) => {
    const cleanCode = String(code).trim();
    if (!cleanCode) return;
    triggerHaptic("light");
    setIsCreating(true);
    connectToPartyRoom(cleanCode, mode || "MANIAC_VS_OPERATIVE", false, 0, false);
  };

  const filteredRooms = publicRooms.filter((r) => roomFilter === "ALL" || r.mode === roomFilter);
  const activeModeData = GAME_MODES.find(m => m.id === selectedMode) || GAME_MODES[0];

  const handleShare = async () => {
    triggerHaptic("light");
    const code = partyRoomCode || partyService.roomCode;
    if (!code) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(code)}`;
    const shareData = {
      title: "Под подозрением",
      text: `Присоединяйся к игре! Код комнаты: ${code}`,
      url: shareUrl,
    };
    if (typeof navigator.share === "function" && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        triggerHaptic("medium");
        soundManager.play("confirm");
      } catch {
        // Пользователь отменил — ничего не делаем
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        triggerHaptic("medium");
        soundManager.play("confirm");
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2500);
      } catch {
        // clipboard недоступен
      }
    }
  };

  const renderHome = () => (
    <div className="relative flex-1 flex flex-col bg-[#080a0f] w-full max-w-full overflow-x-hidden overflow-y-auto custom-scrollbar">
      {/* Background with vivid city lights and noir vignetting (no blur, 55% opacity) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <img 
          src={lobbyBg} 
          alt="Astoria City Noir" 
          className="w-full h-full object-cover object-center opacity-55 scale-100 transition-opacity duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080a0f] via-[#080a0f]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080a0f]/80 via-transparent to-[#080a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#080a0f_90%)] opacity-85" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-between pt-[max(0.5rem,env(safe-area-inset-top))] pb-3 px-4 sm:px-6 lg:px-8 max-w-7xl w-full max-w-full mx-auto min-h-0 overflow-x-hidden">
        {/* Top Header Bar: Left Title, Right Service Info */}
        <header className="flex items-center justify-between shrink-0 py-2 sm:py-3 lg:py-4 mb-2 lg:mb-4 border-b border-white/5 lg:border-b-0 w-full max-w-full">
          <div className="flex items-center gap-2.5 sm:gap-3.5 select-none min-w-0 pr-2">
            <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.85)] shrink-0" />
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white uppercase leading-none drop-shadow-[0_2px_15px_rgba(0,0,0,0.9)] truncate sm:overflow-visible">
              {t.menu.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Agent Callsign / Dossier Pill (Hidden on mobile < sm) */}
            <button
              onClick={() => { soundManager.play('tapMenu'); setNavDirection('none'); setScreen('PROFILE'); onTabChange('TOP'); }}
              className="hidden sm:flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-white/10 hover:border-blue-500/40 hover:bg-zinc-800/80 transition cursor-pointer shadow-lg active:scale-95 group text-left shrink-0"
              title="Досье агента"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center text-xs sm:text-sm shrink-0">
                {profile.avatar ? (
                  profile.avatar
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-zinc-400">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] sm:text-xs font-black tracking-wider text-zinc-200 uppercase group-hover:text-white transition truncate max-w-[85px] sm:max-w-[120px]">
                  {profile.nickname}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 tracking-widest uppercase mt-0.5">
                  {profile.rank || "Стажёр"}
                </span>
              </div>
            </button>

            {/* Dev Panel Cash Pill */}
            <div
              onClick={() => { onOpenDevPanel?.(); }}
              className="rounded-full bg-zinc-900/80 border border-white/10 hover:border-amber-500/40 hover:bg-zinc-800/80 px-3.5 py-1.5 flex items-center gap-1.5 shadow-lg cursor-pointer transition active:scale-95 shrink-0"
              title="Открыть Dev-панель"
            >
              <Icons.Coin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-zinc-100 font-mono text-xs font-bold">{profile.cash.toLocaleString()}</span>
            </div>

            {/* Settings Cog Button */}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 rounded-full bg-zinc-900/80 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:border-white/20 transition cursor-pointer shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shrink-0"
              title="Настройки"
            >
              <Icons.Settings />
            </button>
          </div>
        </header>

        {/* Central Game Showcase: Hero (Quick Play) + 2x2 Modes Grid */}
        <div className="w-full max-w-xl lg:max-w-none mx-auto flex-1 flex flex-col justify-center py-2 sm:py-6 sm:min-h-[calc(100vh-80px)] lg:min-h-0 lg:py-4 lg:grid lg:grid-cols-12 lg:gap-8 items-center my-auto min-h-0">
          {/* Hero Block: Quick Play (5 cols on lg+, full width on mobile/tablet) */}
          <div className="w-full lg:col-span-5 flex flex-col gap-3 mb-4 lg:mb-0">
            {hasActiveGame && (
              <button
                onClick={onResumeGame}
                className="w-full bg-gradient-to-r from-emerald-950/80 to-zinc-950/90 border border-emerald-500/50 hover:border-emerald-400 p-4 rounded-2xl flex items-center justify-between shadow-[0_0_25px_rgba(16,185,129,0.2)] hover:scale-[1.01] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/90 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                    <Icons.Play />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      ДЕЛО ПРИОСТАНОВЛЕНО
                    </span>
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white group-hover:text-blue-300 transition">
                      {t.menu.resume}
                    </span>
                  </div>
                </div>
                <Icons.ArrowRight />
              </button>
            )}

            <div className="w-full h-auto flex flex-col bg-zinc-950/70 hover:bg-zinc-950/90 border border-blue-500/30 hover:border-blue-400/60 backdrop-blur-xl rounded-2xl p-5 lg:p-6 shadow-[0_0_35px_rgba(37,99,235,0.12)] transition-all relative overflow-hidden group">
              <div className="absolute -top-16 -right-16 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500" />
              
              <div className="relative z-10 flex flex-col">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white uppercase tracking-tight leading-tight mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  {t.menu.quickPlay}
                </h2>
                <p className="text-[10px] sm:text-xs text-zinc-400 leading-relaxed max-w-sm">
                  Мгновенный вход в открытую партию. Если подходящий стол не найден, система автоматически создаст случайную игру и будет ждать соперника.
                </p>
              </div>

              <div className="relative z-10 w-full mt-6">
                <BiometricSlider
                  onTrigger={handleQuickPlay}
                  disabled={isCreating}
                  text={isCreating ? (t.menu.searching || "Поиск соперника...") : (t.menu.quickPlay || "Быстрая игра")}
                  price={250}
                />
              </div>
            </div>
          </div>

          {/* Right Column: 2x2 Showcase Grid + Aux Buttons (7 cols on lg+) */}
          <div className="w-full lg:col-span-7 flex flex-col">
            <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
              {/* Card 1: Solo Game (PVE) */}
              <button
                onClick={() => { setSelectedOpponent("AI"); navigateTo('MODES'); }}
                className="h-auto min-h-[110px] sm:min-h-[125px] border border-white/10 hover:border-white/25 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-4 sm:p-4.5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-zinc-900/90 text-zinc-300 border border-white/10 flex items-center justify-center group-hover:text-white group-hover:border-white/25 transition-all shrink-0 shadow-inner">
                    <Icons.Cards className="w-5 h-5" />
                  </div>
                  <span className="bg-zinc-900/90 text-zinc-400 border border-white/10 text-[10px] font-mono px-2.5 py-0.5 rounded-lg uppercase font-bold tracking-wider shrink-0">
                    PVE
                  </span>
                </div>
                <div className="flex flex-col mt-3 min-w-0 flex-1 justify-center">
                  <span className="font-bold text-xs sm:text-sm lg:text-base break-words leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                    {t.menu.soloCases}
                  </span>
                </div>
              </button>

              {/* Card 2: One Screen (PVP) */}
              <button
                onClick={() => { setSelectedOpponent("PVP"); navigateTo('MODES'); }}
                className="h-auto min-h-[110px] sm:min-h-[125px] border border-white/10 hover:border-white/25 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-4 sm:p-4.5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-zinc-900/90 text-zinc-300 border border-white/10 flex items-center justify-center group-hover:text-white group-hover:border-white/25 transition-all shrink-0 shadow-inner">
                    <Icons.Users className="w-5 h-5" />
                  </div>
                  <span className="bg-zinc-900/90 text-zinc-400 border border-white/10 text-[10px] font-mono px-2.5 py-0.5 rounded-lg uppercase font-bold tracking-wider shrink-0">
                    PVP
                  </span>
                </div>
                <div className="flex flex-col mt-3 min-w-0 flex-1 justify-center">
                  <span className="font-bold text-xs sm:text-sm lg:text-base break-words leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                    {t.menu.localDuel}
                  </span>
                </div>
              </button>

              {/* Card 3: TV Mode (TV PARTY) */}
              <button
                onClick={() => { setIsTvPartyModalOpen(true); }}
                className="h-auto min-h-[110px] sm:min-h-[125px] border border-white/10 hover:border-red-500/40 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-4 sm:p-4.5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-red-500/40"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-950/40 text-red-400 border border-red-500/30 flex items-center justify-center group-hover:text-red-300 group-hover:border-red-500/50 transition-all shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
                  </div>
                  <span className="bg-red-950/80 text-red-400 border border-red-500/40 text-[10px] font-mono px-2.5 py-0.5 rounded-lg uppercase font-black tracking-wider shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.25)]">
                    TV PARTY
                  </span>
                </div>
                <div className="flex flex-col mt-3 min-w-0 flex-1 justify-center">
                  <span className="font-bold text-xs sm:text-sm lg:text-base break-words leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                    {t.menu.tvMode || "ТВ РЕЖИМ"}
                  </span>
                </div>
              </button>

              {/* Card 4: Multiplayer (ONLINE) */}
              <button
                onClick={() => { navigateTo('TABLES'); onTabChange('TABLES'); }}
                className="h-auto min-h-[110px] sm:min-h-[125px] border border-white/10 hover:border-blue-500/40 bg-zinc-950/70 hover:bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-4 sm:p-4.5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] group text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-950/40 text-blue-400 border border-blue-500/30 flex items-center justify-center group-hover:text-blue-300 group-hover:border-blue-500/50 transition-all shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.15)]">
                    <Icons.Radar className="w-5 h-5" />
                  </div>
                  <span className="bg-blue-950/80 text-blue-400 border border-blue-500/40 text-[10px] font-mono px-2.5 py-0.5 rounded-lg uppercase font-bold tracking-wider shrink-0 shadow-[0_0_8px_rgba(37,99,235,0.25)]">
                    ONLINE
                  </span>
                </div>
                <div className="flex flex-col mt-3 min-w-0 flex-1 justify-center">
                  <span className="font-bold text-xs sm:text-sm lg:text-base break-words leading-tight text-zinc-100 uppercase tracking-wider group-hover:text-white transition">
                    {t.menu.onlineOps}
                  </span>
                </div>
              </button>
            </div>

            {/* Auxiliary Buttons: Rules & Tutorial */}
            <div className="grid grid-cols-2 gap-3.5 sm:gap-4 mt-3.5 sm:mt-4">
              <button
                onClick={onOpenRules}
                className="h-11 sm:h-12 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900/80 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2.5 px-4 text-zinc-300 hover:text-white cursor-pointer active:scale-[0.99] shadow-md group focus:outline-none focus:ring-2 focus:ring-blue-500/40 backdrop-blur-xl"
              >
                <div className="text-zinc-400 group-hover:text-blue-400 transition-colors shrink-0">
                  <Icons.Shield />
                </div>
                <div className="flex flex-col items-start leading-tight min-w-0">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-200 group-hover:text-white truncate">
                    {t.menu.rulebook}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase tracking-widest truncate">
                    {t.menu.rulebookDesc}
                  </span>
                </div>
              </button>

              <button
                onClick={() => setIsTutorialOpen(true)}
                onPointerEnter={() => import("./TutorialScreen")}
                className="h-11 sm:h-12 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900/80 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2.5 px-4 text-zinc-300 hover:text-white cursor-pointer active:scale-[0.99] shadow-md group focus:outline-none focus:ring-2 focus:ring-blue-500/40 backdrop-blur-xl"
              >
                <div className="text-zinc-400 group-hover:text-blue-400 transition-colors shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 sm:w-5 sm:h-5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                </div>
                <div className="flex flex-col items-start leading-tight min-w-0">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-200 group-hover:text-white truncate">
                    {t.menu.tutorial}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase tracking-widest truncate">
                    {t.menu.tutorialDesc}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModes = () => (
    <div className="flex-1 flex flex-col bg-[#080a0f] overflow-hidden w-full h-full">
      <div className="flex items-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-white/10 bg-[#080a0f] relative">
        <Button variant="ghost" onClick={() => navigateBack('HOME')} className="h-9 px-2 text-zinc-400 hover:text-white gap-1">
          <Icons.ChevronLeft />
          <span className="text-[10px] font-black uppercase tracking-widest">Назад</span>
        </Button>
        <h2 className="absolute left-1/2 -translate-x-1/2 text-sm md:text-base font-black tracking-widest text-zinc-100 uppercase">Выбор игры</h2>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-2.5 max-w-xl mx-auto w-full px-4 py-2 min-h-0 overflow-y-auto custom-scrollbar">
        {GAME_MODES.map((mode) => {
          const ModeIcon = mode.icon || Icons.Crosshair;
          const bannerPath = MODE_BANNER_IMAGE[mode.id];
          const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
          const bannerSrc = bannerPath ? `${base}${bannerPath.startsWith("/") ? bannerPath : "/" + bannerPath}` : null;

          return (
            <button
              key={mode.id}
              onClick={() => { setSelectedMode(mode.id); navigateTo('MODE_DETAIL'); }}
              className="w-full relative overflow-hidden bg-zinc-950/70 hover:bg-zinc-900/90 border border-white/10 hover:border-white/25 rounded-2xl p-3.5 transition-all duration-200 cursor-pointer active:scale-[0.99] group text-left shadow-lg"
            >
              {bannerSrc && (
                <div className="absolute right-0 top-0 bottom-0 w-1/3 overflow-hidden pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity">
                  <img src={bannerSrc} alt="" className="w-full h-full object-cover object-center" />
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent" />
                </div>
              )}
              <div className="relative z-10 flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-200 group-hover:text-white group-hover:border-white/30 transition-all shrink-0 shadow-inner">
                  <ModeIcon className="w-5 h-5" />
                </div>
                <span className="px-3 py-1 rounded-full bg-zinc-900/90 border border-white/10 text-[11px] font-bold text-zinc-300 group-hover:text-white group-hover:border-white/30 transition-all flex items-center gap-1">
                  ВЫБРАТЬ ➔
                </span>
              </div>

              <div className="relative z-10 mt-2.5">
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 uppercase tracking-wide group-hover:text-white transition-colors">
                  {mode.title}
                </h3>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  interface ModeSummaryItem {
    icon: (props: { className?: string }) => JSX.Element;
    title: string;
    subtitle: string;
  }

  const getModeSummaryItems = (modeId: GameModeType): ModeSummaryItem[] => {
    switch (modeId) {
      case 'MANIAC_VS_OPERATIVE':
        return [
          { icon: Icons.Grid, title: '25 ЖИТЕЛЕЙ', subtitle: 'ПОДОЗРЕВАЕМЫЕ' },
          { icon: Icons.Target, title: '4 ЖЕРТВЫ', subtitle: 'ЦЕЛЬ МАНЬЯКА' },
          { icon: Icons.RadioRadar, title: 'РАДИУС 3×3', subtitle: 'ЗОНА ОХОТЫ' },
        ];
      case 'THIEF_HUNT':
        return [
          { icon: Icons.Grid, title: '25 КВАРТАЛОВ', subtitle: 'ГОРОДСКАЯ СЕТКА' },
          { icon: Icons.Coins, title: '8 МОНЕТ', subtitle: 'ЦЕЛЬ ГРАБИТЕЛЯ' },
          { icon: Icons.ShieldLock, title: 'ОЦЕПЛЕНИЕ', subtitle: 'БЛОК ПАТРУЛЕЙ' },
        ];
      case 'SECRET_SERVICE':
        return [
          { icon: Icons.Users, title: '2–6 АГЕНТОВ', subtitle: 'СПЕЦСЛУЖБЫ' },
          { icon: Icons.FileText, title: 'КОМПРОМАТ', subtitle: 'СБОР 4 УЛИК' },
          { icon: Icons.EyeOff, title: 'ПРИКРЫТИЕ', subtitle: 'ТАЙНЫЕ ЯВКИ' },
        ];
      case 'LINE_UP':
        return [
          { icon: Icons.Search, title: 'ДОСЬЕ 5×5', subtitle: 'КАРТОТЕКА ЛИЦ' },
          { icon: Icons.HelpCircle, title: 'ВОПРОСЫ', subtitle: 'КАТАЛОГ УЛИК' },
          { icon: Icons.Scale, title: 'ИСКЛЮЧЕНИЕ', subtitle: 'ЧИСТЫЙ РАСЧЕТ' },
        ];
      default:
        return [
          { icon: Icons.Grid, title: '25 КАРТ', subtitle: 'СЕТКА 5×5' },
          { icon: Icons.Target, title: 'ДУЭЛЬ', subtitle: '1 НА 1' },
          { icon: Icons.Search, title: 'ПОИСК', subtitle: 'ДЕДУКЦИЯ' },
        ];
    }
  };

  const renderModeDetail = () => {
    const summaryItems = getModeSummaryItems(activeModeData.id);
    const modeMeta = GAME_MODES_META[activeModeData.id];
    const bannerPath = MODE_BANNER_IMAGE[activeModeData.id];
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    const modeBannerSrc = bannerPath ? `${base}${bannerPath.startsWith("/") ? bannerPath : "/" + bannerPath}` : null;

    return (
      <div className="flex-1 flex flex-col bg-[#080a0f] overflow-hidden relative w-full h-full">
        <div className="flex items-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-white/10 z-10 bg-[#080a0f] relative">
          <Button variant="ghost" onClick={() => navigateBack('MODES')} className="h-9 px-2 text-zinc-400 hover:text-white gap-1">
            <Icons.ChevronLeft />
            <span className="text-[10px] font-black uppercase tracking-widest">Назад</span>
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 sm:pb-28">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 w-full max-w-xl mx-auto flex flex-col gap-4 sm:gap-4.5">
            {modeBannerSrc && (
              <div
                onClick={(e) => handleOpenBanner(e, modeBannerSrc, activeModeData.title)}
                className={`relative w-full h-[100px] sm:h-[120px] rounded-2xl overflow-hidden mb-3.5 shrink-0 border ${
                  modeMeta?.banner?.borderColor || "border-zinc-800"
                } shadow-lg cursor-pointer group select-none bg-zinc-950`}
                title="Нажмите для просмотра полного фото"
              >
                <img
                  src={modeBannerSrc}
                  alt={activeModeData.title}
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-80 pointer-events-none"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent pointer-events-none" />

                <div className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 opacity-85 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-zinc-300">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </div>

                <div className="absolute bottom-2.5 left-3.5 right-3.5 z-10 flex items-end pointer-events-none">
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {activeModeData.title}
                  </h3>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">
                СВОДКА РАССЛЕДОВАНИЯ
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
                {summaryItems.map((item, idx) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-zinc-950/60 border border-white/10 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center text-center justify-between min-h-[92px] sm:min-h-[96px] shadow-sm"
                    >
                      <ItemIcon className="w-5 h-5 text-zinc-300" />
                      <span className="text-xs sm:text-sm font-black font-mono text-zinc-100 tracking-wider mt-1.5">
                        {item.title}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-tight mt-0.5">
                        {item.subtitle}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">
                Формат партии
              </h3>
              <div className="bg-zinc-900/80 border border-white/10 p-1 rounded-xl flex gap-1 w-full shadow-inner">
                {(['AI', 'PVP', 'ONLINE'] as OpponentType[]).map(opp => {
                  const isSelected = selectedOpponent === opp;
                  return (
                    <button
                      key={opp}
                      onClick={() => { setSelectedOpponent(opp); if (opp === 'PVP') setPlayerCount(2); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'text-white bg-zinc-800 border border-white/10 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {opp === 'AI' ? 'Против ИИ' : opp === 'PVP' ? 'Локально' : 'Онлайн'}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedOpponent === 'AI' && activeModeData.id !== 'SECRET_SERVICE' && (
              <div>
                <h3 className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">
                  Ваша роль
                </h3>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setSelectedRole('DETECTIVE')}
                    className={`flex-1 py-2.5 sm:py-3 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                      selectedRole === 'DETECTIVE'
                        ? 'bg-blue-950/40 border border-blue-500/50 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                        : 'bg-zinc-950/40 border border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {activeModeData.detectiveRoleName}
                  </button>
                  <button
                    onClick={() => setSelectedRole('KILLER')}
                    className={`flex-1 py-2.5 sm:py-3 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                      selectedRole === 'KILLER'
                        ? 'bg-red-950/40 border border-red-500/50 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                        : 'bg-zinc-950/40 border border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {activeModeData.killerRoleName}
                  </button>
                </div>
              </div>
            )}

            {activeModeData.id === 'SECRET_SERVICE' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest">
                    Количество агентов
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    Сетка: {playerCount >= 5 ? "6×6 (36 карт)" : "5×5 (25 карт)"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {[2, 3, 4, 5, 6].map((num) => {
                    const isPvpDisabled = selectedOpponent === "PVP" && num > 2;
                    const isSelected = playerCount === num && !isPvpDisabled;
                    return (
                      <button
                        key={num}
                        disabled={isPvpDisabled}
                        onClick={() => !isPvpDisabled && setPlayerCount(num)}
                        className={`w-10 h-10 rounded-xl border text-xs font-bold uppercase transition flex items-center justify-center ${
                          isSelected
                            ? "bg-zinc-800 border-white/20 text-white font-black shadow-sm cursor-pointer"
                            : isPvpDisabled
                              ? "bg-zinc-950/40 border-white/[0.04] text-zinc-700 cursor-not-allowed opacity-50"
                              : "bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 cursor-pointer"
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                  <div
                    title="Сетка 7×7 (49 карт) доступна только в ТВ-режиме"
                    className="w-10 h-10 rounded-xl border border-white/[0.04] bg-zinc-950/40 text-zinc-600 flex flex-col items-center justify-center cursor-not-allowed select-none opacity-50"
                  >
                    <span className="text-[10px] font-bold">7×7</span>
                    <span className="text-[7px] font-black text-red-500/80 uppercase tracking-tighter">ТВ</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-zinc-500">
                  {selectedOpponent === "AI"
                    ? `Вы против ${playerCount - 1} агентов ИИ. Цель: 4 компромата.`
                    : `Локальный матч на ${playerCount} человек. Передача устройства по кругу.`}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#080a0f] via-[#080a0f]/95 to-transparent pb-[max(1rem,env(safe-area-inset-bottom))] z-20">
          <div className="w-full max-w-xl mx-auto">
            <Button
              variant="primary-danger"
              fullWidth
              onClick={() => {
                triggerHaptic("medium");
                soundManager.play("confirm");
                if (selectedOpponent === 'ONLINE') {
                  setCreateRoomMode(selectedMode);
                  setIsCreateRoomOpen(true);
                } else {
                  const effectiveCount = (selectedMode === "SECRET_SERVICE" && selectedOpponent === "PVP") ? 2 : playerCount;
                  const targetTrophies = selectedMode === "SECRET_SERVICE" ? (effectiveCount === 3 ? 4 : 3) : 3;
                  onStartGame(selectedMode, selectedOpponent, selectedRole, effectiveCount, targetTrophies, 0, 0);
                }
              }}
              className="h-12 shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 text-xs sm:text-sm font-black tracking-widest uppercase"
            >
              <span>НАЧАТЬ ИГРУ</span>
              <span>➔</span>
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderTables = () => (
    <TablesScreen
      roomFilter={roomFilter}
      setRoomFilter={setRoomFilter}
      filteredRooms={filteredRooms}
      joinCode={joinCode}
      setJoinCode={setJoinCode}
      handleJoinRoom={handleJoinRoom}
      setIsCreateRoomOpen={setIsCreateRoomOpen}
      ROOM_FILTERS={ROOM_FILTERS}
      GAME_MODES={GAME_MODES}
      soundManager={soundManager}
      onBack={() => { setNavDirection('none'); setScreen('HOME'); onTabChange('LOBBY'); }}
    />
  );

  const renderProfile = () => (
    <ProfileScreen
      profile={profile}
      onUpdateProfile={onUpdateProfile || (() => {})}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onBack={() => { setNavDirection('none'); setScreen('HOME'); onTabChange('LOBBY'); }}
    />
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

  const dragControls = useDragControls();
  const [isEdgeDragging, setIsEdgeDragging] = useState(false);

  const screenVariants = {
    enter: (direction: 'forward' | 'backward' | 'none') => {
      if (direction === 'none') {
        return { x: 0, opacity: 0 };
      }
      return {
        x: direction === 'forward' ? '100%' : '-15%',
        opacity: direction === 'forward' ? 1 : 0.75,
      };
    },
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'forward' | 'backward' | 'none') => {
      if (direction === 'none') {
        return { x: 0, opacity: 0 };
      }
      return {
        x: direction === 'forward' ? '-15%' : '100%',
        opacity: direction === 'forward' ? 0.75 : 1,
      };
    },
  };

  const handleEdgePointerDown = (e: React.PointerEvent) => {
    if (e.clientX <= 35) {
      setIsEdgeDragging(true);
      dragControls.start(e);
    }
  };

  const handleDragEnd = (_: any, info: any) => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
    if (info.offset.x > screenWidth * 0.35 || info.velocity.x > 500) {
      triggerHaptic("light");
      setIsEdgeDragging(false);
      if (screen === 'MODE_DETAIL') {
        navigateBack('MODES');
      } else if (screen === 'MODES') {
        navigateBack('HOME');
      }
    } else {
      setTimeout(() => setIsEdgeDragging(false), 250);
    }
  };

  const renderScreenContent = () => {
    switch (screen) {
      case 'HOME': return renderHome();
      case 'MODES': return renderModes();
      case 'MODE_DETAIL': return renderModeDetail();
      case 'TABLES': return renderTables();
      case 'PROFILE': return renderProfile();
      default: return renderHome();
    }
  };

  const renderScreen = () => {
    const isChildScreen = screen === 'MODES' || screen === 'MODE_DETAIL';

    return (
      <div className="flex-1 relative overflow-hidden w-full h-full">
        {/* Underlay layer for interactive back-drag without black void */}
        {navDirection !== 'none' && isEdgeDragging && screen === 'MODE_DETAIL' && (
          <div className="absolute inset-0 w-full h-full flex flex-col pointer-events-none opacity-75 -translate-x-[15%] bg-[#080a0f] z-0 will-change-transform transform-gpu">
            {renderModes()}
          </div>
        )}
        {navDirection !== 'none' && isEdgeDragging && screen === 'MODES' && (
          <div className="absolute inset-0 w-full h-full flex flex-col pointer-events-none opacity-75 -translate-x-[15%] bg-[#080a0f] z-0 will-change-transform transform-gpu">
            {renderHome()}
          </div>
        )}

        <AnimatePresence initial={false} custom={navDirection}>
          <motion.div
            key={screen}
            custom={navDirection}
            variants={screenVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              navDirection === 'none'
                ? { duration: 0.14, ease: "easeOut" }
                : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
            }
            className={`absolute inset-0 w-full h-full flex flex-col will-change-transform transform-gpu select-none bg-[#080a0f] ${
              isChildScreen ? 'shadow-[-10px_0_20px_rgba(0,0,0,0.5)] z-10' : 'z-0'
            }`}
            {...(isChildScreen
              ? {
                  drag: "x" as const,
                  dragDirectionLock: true,
                  dragConstraints: { left: 0 },
                  dragElastic: 0,
                  dragListener: false,
                  dragControls: dragControls,
                  onPointerDown: handleEdgePointerDown,
                  onDragEnd: handleDragEnd,
                }
              : {}
            )}
          >
            {renderScreenContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#080a0f] flex justify-center w-full max-w-full overflow-hidden font-sans select-none text-zinc-100">
      <Toast message={toastMessage} type="error" onClose={() => setToastMessage(null)} />
      
      <div className="w-full max-w-7xl mx-auto h-full flex flex-col justify-between bg-[#080a0f] xl:border-x xl:border-white/10 xl:shadow-[0_0_100px_rgba(0,0,0,0.95)] relative w-full max-w-full overflow-hidden">
        {renderScreen()}

        {screen !== 'MODE_DETAIL' && (
          <nav className="w-full shrink-0 bg-zinc-950/90 backdrop-blur-xl border-t border-white/10 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-6 flex md:hidden justify-around items-center z-40">
          <button 
            onClick={() => {
              soundManager.play('tapMenu');
              setIsEdgeDragging(false);
              setNavDirection('none');
              setScreen('HOME');
              onTabChange('LOBBY');
            }} 
            className={`flex flex-col items-center gap-1.5 p-1.5 transition cursor-pointer relative ${screen === 'HOME' || screen === 'MODES' ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Icons.Home />
            <span className="text-[8px] md:text-[10px] font-mono tracking-widest uppercase">{t.nav.hq}</span>
            {(screen === 'HOME' || screen === 'MODES') && (
              <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.9)]" />
            )}
          </button>
          <button 
            onClick={() => {
              soundManager.play('tapMenu');
              setIsEdgeDragging(false);
              setNavDirection('none');
              setScreen('TABLES');
              onTabChange('TABLES');
            }} 
            className={`flex flex-col items-center gap-1.5 p-1.5 transition cursor-pointer relative ${screen === 'TABLES' ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Icons.Cards />
            <span className="text-[8px] md:text-[10px] font-mono tracking-widest uppercase">{t.nav.tables}</span>
            {screen === 'TABLES' && (
              <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.9)]" />
            )}
          </button>
          <button 
            onClick={() => {
              soundManager.play('tapMenu');
              setIsEdgeDragging(false);
              setNavDirection('none');
              setScreen('PROFILE');
              onTabChange('TOP');
            }} 
            className={`flex flex-col items-center gap-1.5 p-1.5 transition cursor-pointer relative ${screen === 'PROFILE' ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Icons.User />
            <span className="text-[8px] md:text-[10px] font-mono tracking-widest uppercase">{t.nav.profile}</span>
            {screen === 'PROFILE' && (
              <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.9)]" />
            )}
          </button>
        </nav>
        )}

        {isCreateRoomOpen && (
          <Modal
            isOpen={isCreateRoomOpen}
            onClose={() => setIsCreateRoomOpen(false)}
            title="Протокол: Новая операция"
            maxWidth="max-w-sm"
            showCloseButton={true}
            zIndexClass="z-[60]"
          >
            <div className="space-y-4 text-left mt-3">
              <div>
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">
                  Сценарий
                </label>
                <select
                  value={createRoomMode}
                  onChange={(e) => setCreateRoomMode(e.target.value as GameModeType)}
                  className="w-full bg-zinc-950/80 border border-white/15 rounded-xl px-4 py-3 text-xs font-black tracking-widest text-zinc-200 focus:border-blue-500 outline-none appearance-none transition uppercase shadow-inner cursor-pointer"
                >
                  <option value="LINE_UP">{GAME_MODES_META.LINE_UP.title.ru}</option>
                  <option value="SECRET_SERVICE">{GAME_MODES_META.SECRET_SERVICE.title.ru}</option>
                  <option value="MANIAC_VS_OPERATIVE">{GAME_MODES_META.MANIAC_VS_OPERATIVE.title.ru}</option>
                  <option value="THIEF_HUNT">{GAME_MODES_META.THIEF_HUNT.title.ru}</option>
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
                  className="w-4 h-4 accent-blue-500 bg-zinc-900 border-zinc-700 rounded-sm"
                />
                <span className="text-[10px] font-black tracking-widest text-zinc-300 uppercase">Закрытый канал (по шифру)</span>
              </label>

              <div className="flex gap-3 pt-3 border-t border-white/10">
                <Button variant="secondary" onClick={() => setIsCreateRoomOpen(false)} className="flex-1 text-[10px] font-black tracking-widest uppercase">
                  Отмена
                </Button>
                <Button variant="primary-info" onClick={handleConfirmCreateRoom} disabled={isCreating} className="flex-1 text-[10px] font-black tracking-widest uppercase">
                  {isCreating ? "Инициализация..." : "Создать"}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {isWaitingForOpponent && (
          <Modal
            isOpen={isWaitingForOpponent}
            maxWidth="max-w-sm"
            zIndexClass="z-[70]"
            className="items-center p-8 text-center"
          >
            <div className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-2">
              {createRoomIsPrivate ? "ШИФРОВАННЫЙ КАНАЛ (МОРЗЕ)" : "ОПЕРАТИВНЫЙ СТОЛ"}
            </div>

            {createRoomIsPrivate ? (
              (partyService.morseCode || partyService.lastSyncedState?.morseCode) ? (
                <div className="flex flex-col items-center gap-2 mb-6">
                  <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-zinc-950/90 border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                    {(partyService.morseCode || partyService.lastSyncedState?.morseCode)
                      .split("")
                      .map((sym: string, i: number) => (
                        <div key={i} className="flex items-center justify-center">
                          {sym === "." ? (
                            <div className="w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                          ) : (
                            <div className="w-8 h-3.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                          )}
                        </div>
                      ))}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 tracking-wider">
                    {(partyService.morseCode || partyService.lastSyncedState?.morseCode)
                      .split("")
                      .map((s: string) => (s === "." ? "•" : "—"))
                      .join(" ")}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400 uppercase">
                    Продиктуйте этот 7-значный шифр напарнику
                  </span>
                </div>
              ) : (
                <div className="text-sm font-mono text-cyan-400 animate-pulse mb-6 border border-white/10 rounded-2xl px-6 py-4 bg-zinc-950/70 shadow-inner">
                  Генерация 7-значного шифра...
                </div>
              )
            ) : (
              <div className="text-base font-black text-emerald-400 tracking-widest font-mono mb-6 border border-emerald-500/20 rounded-2xl px-6 py-4 bg-zinc-950/70 shadow-inner">
                ОТКРЫТЫЙ СТОЛ (ВХОД БЕЗ ПАРОЛЯ)
              </div>
            )}

            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 border-2 border-zinc-800 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
            </div>

            <div className="text-[10px] text-zinc-300 font-black tracking-widest uppercase animate-pulse mb-6">
              {partyService.isHost ? "Ожидание подключения агента..." : "Синхронизация с хостом..."}
            </div>

            {partyService.isHost && (
              <Button
                variant="ghost"
                fullWidth
                onClick={handleShare}
                className="mb-3 text-[10px] font-black tracking-widest uppercase text-zinc-400 hover:text-zinc-100 flex items-center justify-center gap-2"
              >
                <Icons.Share className="w-3.5 h-3.5" />
                Поделиться ссылкой
              </Button>
            )}

            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                partyService.disconnect();
                setIsWaitingForOpponent(false);
                setIsCreating(false);
              }}
              className="text-[10px] font-black tracking-widest uppercase"
            >
              Прервать операцию
            </Button>
          </Modal>
        )}

        <AnimatePresence>
          {showShareToast && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm font-semibold text-zinc-100 shadow-[0_4px_24px_rgba(0,0,0,0.6)] pointer-events-none select-none whitespace-nowrap"
            >
              Код скопирован
            </motion.div>
          )}
        </AnimatePresence>

        {isTutorialOpen && (
          <Suspense fallback={<TutorialFullscreenFallback />}>
            <TutorialScreen 
              onExit={() => setIsTutorialOpen(false)} 
              onFinish={handleFinishTutorial} 
            />
          </Suspense>
        )}

        {isTvPartyModalOpen && (
          <Modal
            isOpen={isTvPartyModalOpen}
            onClose={() => setIsTvPartyModalOpen(false)}
            maxWidth="max-w-md"
            className="p-6 text-left"
          >
            <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <h3 className="text-xs font-black text-zinc-100 uppercase tracking-widest">
                  ТВ ВЕЧЕРИНКА • РОЛЬ УСТРОЙСТВА
                </h3>
              </div>
              <Button
                variant="ghost"
                onClick={() => setIsTvPartyModalOpen(false)}
                className="!h-8 !w-8 !p-0 text-zinc-400 hover:text-white"
                title="Закрыть"
              >
                ✕
              </Button>
            </div>

            <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
              Выберите, как использовать текущее устройство в партии:
            </p>

            <div className="space-y-3 mb-5">
              <button
                onClick={() => {
                  setIsTvPartyModalOpen(false);
                  if (onStartTvParty) {
                    onStartTvParty("TV_DISPLAY");
                  } else {
                    const code = Math.floor(10000 + Math.random() * 90000).toString();
                    window.location.href = `${window.location.pathname}?clientType=TV_DISPLAY&room=${code}`;
                  }
                }}
                className="w-full p-4 rounded-2xl bg-zinc-950/70 border border-white/10 hover:border-red-500/60 hover:bg-zinc-900/90 transition-all text-left flex items-center gap-3.5 group cursor-pointer shadow-lg active:scale-[0.99]"
              >
                <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-red-500/30 group-hover:border-red-500/60 flex items-center justify-center text-red-500 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black uppercase tracking-wider text-zinc-100 group-hover:text-red-400 transition-colors">
                    ЭКРАН ТЕЛЕВИЗОРА
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                    Общее игровое поле 5×5 для хоста (TV / Проектор)
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsTvPartyModalOpen(false);
                  if (onStartTvParty) {
                    onStartTvParty("CONTROLLER");
                  } else {
                    window.location.href = `${window.location.pathname}?clientType=CONTROLLER`;
                  }
                }}
                className="w-full p-4 rounded-2xl bg-zinc-950/70 border border-white/10 hover:border-blue-500/60 hover:bg-zinc-900/90 transition-all text-left flex items-center gap-3.5 group cursor-pointer shadow-lg active:scale-[0.99]"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-950/40 border border-blue-500/30 group-hover:border-blue-500/60 flex items-center justify-center text-blue-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black uppercase tracking-wider text-zinc-100 group-hover:text-blue-400 transition-colors">
                    ПОДКЛЮЧИТЬСЯ К ТВ (ПУЛЬТ)
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                    Ввести PIN или передать позывной Морзе для подключения
                  </div>
                </div>
              </button>
            </div>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => setIsTvPartyModalOpen(false)}
              className="h-11 text-xs font-bold uppercase tracking-wider text-zinc-300"
            >
              Отмена
            </Button>
          </Modal>
        )}

        {isSettingsOpen && (
          <Modal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            title={t.settings.title}
            maxWidth="max-w-sm"
            showCloseButton={true}
            zIndexClass="z-[80]"
            className="p-6 text-left"
          >
            <div className="space-y-3.5 mb-6 mt-1">
              <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{t.settings.sfx}</span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5">{t.settings.sfxDesc}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    const enabled = soundManager.toggleSfx();
                    setIsSfxEnabled(enabled);
                  }}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${isSfxEnabled ? 'bg-blue-600' : 'bg-zinc-800 border border-white/10'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isSfxEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{t.settings.ambient}</span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5">{t.settings.ambientDesc}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    const enabled = soundManager.toggleAmbient();
                    setIsAmbientEnabled(enabled);
                  }}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${isAmbientEnabled ? 'bg-blue-600' : 'bg-zinc-800 border border-white/10'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isAmbientEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{t.settings.haptics}</span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5">{t.settings.hapticsDesc}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    const newVal = !isHapticsEnabled;
                    setIsHapticsEnabled(newVal);
                    setHapticsEnabled(newVal);
                    if (newVal) triggerHaptic("medium");
                  }}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${isHapticsEnabled ? 'bg-blue-600' : 'bg-zinc-800 border border-white/10'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isHapticsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{t.settings.language}</span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5">Выберите язык / Select language</span>
                </div>
                <div className="flex gap-1.5">
                  <button 
                    type="button"
                    onClick={() => setLang('ru')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider ${lang === 'ru' ? 'bg-zinc-200 text-zinc-950 shadow-sm' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'}`}
                  >
                    RU
                  </button>
                  <button 
                    type="button"
                    onClick={() => setLang('en')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider ${lang === 'en' ? 'bg-zinc-200 text-zinc-950 shadow-sm' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'}`}
                  >
                    EN
                  </button>
                </div>
              </div>
            </div>

            <Button variant="secondary" fullWidth onClick={() => setIsSettingsOpen(false)} className="text-[10px] font-black tracking-widest uppercase">
              {t.settings.close}
            </Button>
          </Modal>
        )}

      </div>
    </div>
  );
};
