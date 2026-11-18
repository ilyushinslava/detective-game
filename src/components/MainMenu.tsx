import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import type { GameModeType, OpponentType, Role } from "../types/game";
import type { UserProfile } from "../types/profile";
import { triggerHaptic } from "../utils/haptics";
import { soundManager } from "../utils/audio";
import { useBannerViewer } from "../contexts/BannerViewerContext";
import { getGameModesList } from "../constants/gameMeta";
import { useTranslation } from "../i18n/context";
import { useLobbyNetwork } from "../hooks/useLobbyNetwork";
import { Icons } from "./ui/Icons";
import { LiquidBackground } from "./ui/LiquidBackground";
import { TablesScreen } from "./TablesScreen";
import { ProfileScreen } from "./ProfileScreen";
import {
  CreateRoomModal,
  LobbyWaitingModal,
  ModesList,
  ModeDetailView,
  LobbyBottomNav,
  TvPartyModal,
  SettingsModal,
  LoginModal,
  LobbyHomeView,
} from "./lobby";

// Асинхронный динамический чанк для тяжелого модуля Академии (TASK-ARCH-001)
const TutorialScreen = lazy(() => import("./TutorialScreen").then((m) => ({ default: m.TutorialScreen })));

const TutorialFullscreenFallback = () => (
  <div className="fixed inset-0 z-[100] bg-background-main flex items-center justify-center select-none">
    <div className="flex flex-col items-center gap-3">
      <div className="w-9 h-9 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
      <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Загрузка Академии...</span>
    </div>
  </div>
);

const MODE_BANNER_IMAGE: Record<GameModeType, string> = {
  MANIAC_VS_OPERATIVE: "/assets/modes/maniac-banner.webp",
  THIEF_HUNT: "/assets/modes/thief-banner.webp",
  SECRET_SERVICE: "/assets/modes/secret-service-banner.webp",
  LINE_UP: "/assets/modes/lineup-banner.webp",
};

const MODE_ICONS: Record<GameModeType, React.ComponentType<{ className?: string }>> = {
  MANIAC_VS_OPERATIVE: Icons.Fingerprint,
  THIEF_HUNT: Icons.ShieldLock,
  SECRET_SERVICE: Icons.RadioRadar,
  LINE_UP: Icons.Search,
};

const GAME_MODES = getGameModesList().map((mode) => ({ ...mode, icon: MODE_ICONS[mode.id] }));

const ROOM_FILTERS = [
  { id: "ALL", label: "Все" },
  { id: "MANIAC_VS_OPERATIVE", label: "Почерк" },
  { id: "THIEF_HUNT", label: "Оцепление" },
  { id: "SECRET_SERVICE", label: "Директива" },
  { id: "LINE_UP", label: "Ставка" },
];

export type ScreenType = "HOME" | "MODES" | "MODE_DETAIL" | "PROFILE" | "TABLES";

export interface MainMenuProps {
  onStartTvParty?: (role?: "TV_DISPLAY" | "CONTROLLER") => void;
  profile: UserProfile;
  onUpdateProfile?: (profile: Partial<UserProfile>) => void;
  activeTab: "LOBBY" | "TABLES" | "TOP";
  onTabChange: (tab: "LOBBY" | "TABLES" | "TOP") => void;
  onStartGame: (
    mode: GameModeType,
    opponent: OpponentType,
    playerRole?: Role,
    playersCount?: number,
    targetVictims?: number,
    targetScore?: number,
    bet?: number,
    guestNickname?: string
  ) => void;
  hasActiveGame?: boolean;
  onResumeGame?: () => void;
  onOpenRules?: () => void;
  onOpenDevPanel?: () => void;
}

export const MainMenu = ({
  onStartTvParty,
  profile,
  onUpdateProfile,
  activeTab,
  onTabChange,
  onStartGame,
  hasActiveGame = false,
  onResumeGame,
  onOpenRules,
  onOpenDevPanel,
}: MainMenuProps) => {
  const { t } = useTranslation();
  const { openBanner } = useBannerViewer();

  // Навигационные и UI состояния
  const [screen, setScreen] = useState<ScreenType>("HOME");
  const [navDirection, setNavDirection] = useState<"forward" | "backward" | "none">("none");
  const [selectedMode, setSelectedMode] = useState<GameModeType>("MANIAC_VS_OPERATIVE");
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentType>("AI");
  const [selectedRole, setSelectedRole] = useState<Role>("DETECTIVE");
  const [playerCount, setPlayerCount] = useState<number>(3);
  const [isTvPartyModalOpen, setIsTvPartyModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Свайп-жесты возврата назад
  const [isEdgeDragging, setIsEdgeDragging] = useState(false);
  const dragControls = useDragControls();
  const screenContainerRef = useRef<HTMLDivElement>(null);

  // Сетевой хук лобби (матчмейкинг, создание и поиск комнат)
  const network = useLobbyNetwork({ profile, screen, onStartGame });

  const navigateTo = (nextScreen: ScreenType) => {
    soundManager.play("tapMenu");
    setNavDirection("forward");
    setScreen(nextScreen);
  };

  const navigateBack = (prevScreen: ScreenType) => {
    soundManager.play("tapMenu");
    setNavDirection("backward");
    setScreen(prevScreen);
  };

  // Синхронизация внешнего activeTab с внутренним screen
  useEffect(() => {
    if (activeTab === "LOBBY" && screen !== "HOME" && screen !== "MODES" && screen !== "MODE_DETAIL") {
      setNavDirection("none"); setScreen("HOME");
    } else if (activeTab === "TABLES" && screen !== "TABLES") {
      setNavDirection("none"); setScreen("TABLES");
    } else if (activeTab === "TOP" && screen !== "PROFILE") {
      setNavDirection("none"); setScreen("PROFILE");
    }
  }, [activeTab]);

  // Фоновая предзагрузка Академии
  useEffect(() => {
    const prefetchTimer = setTimeout(() => {
      import("./TutorialScreen");
    }, 1200);
    return () => clearTimeout(prefetchTimer);
  }, []);

  const activeModeData = GAME_MODES.find((m) => m.id === selectedMode) || GAME_MODES[0];

  const handleFinishTutorial = () => {
    const completed = localStorage.getItem("crime_city_tutorial");
    if (!completed) {
      localStorage.setItem("crime_city_tutorial", "true");
      if (onUpdateProfile) {
        onUpdateProfile({ cash: profile.cash + 500 });
      }
    }
    setIsTutorialOpen(false);
  };

  // Анимационные варианты для смены экранов
  const screenVariants = {
    initial: (direction: "forward" | "backward" | "none") => {
      if (direction === "none") return { opacity: 1, x: 0 };
      return { opacity: 0, x: direction === "forward" ? 40 : -40 };
    },
    animate: { opacity: 1, x: 0 },
    exit: (direction: "forward" | "backward" | "none") => {
      if (direction === "none") return { opacity: 1, x: 0 };
      return { opacity: 0, x: direction === "forward" ? -40 : 40 };
    },
  };

  const handleEdgePointerDown = (e: React.PointerEvent) => {
    if (e.clientX <= 28 && (screen === "MODES" || screen === "MODE_DETAIL")) {
      setIsEdgeDragging(true);
      dragControls.start(e);
    }
  };

  const handleDragEnd = (_: any, info: any) => {
    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 360;
    if (info.offset.x > screenWidth * 0.25 || info.velocity.x > 300) {
      triggerHaptic("light");
      if (screen === "MODE_DETAIL") navigateBack("MODES");
      else if (screen === "MODES") navigateBack("HOME");
    }
    setIsEdgeDragging(false);
  };

  // Рендеринг контента активного экрана
  const renderScreenContent = () => {
    switch (screen) {
      case "HOME":
        return (
          <LobbyHomeView
            title={t.menu.title}
            profile={profile}
            onOpenProfile={() => {
              soundManager.play("tapMenu");
              setNavDirection("none");
              setScreen("PROFILE");
              onTabChange("TOP");
            }}
            onOpenDevPanel={onOpenDevPanel}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            hasActiveGame={hasActiveGame}
            onResumeGame={onResumeGame}
            isCreating={network.isCreating}
            onQuickPlay={network.handleQuickPlay}
            onSelectSolo={() => { setSelectedOpponent("AI"); navigateTo("MODES"); }}
            onSelectLocalDuel={() => { setSelectedOpponent("PVP"); navigateTo("MODES"); }}
            onOpenTvParty={() => setIsTvPartyModalOpen(true)}
            onOpenOnline={() => { navigateTo("TABLES"); onTabChange("TABLES"); }}
            onlineRoomsCount={network.filteredRooms.length}
            onOpenRules={onOpenRules}
            onOpenTutorial={() => setIsTutorialOpen(true)}
            t={t}
          />
        );

      case "MODES":
        return (
          <ModesList
            modes={GAME_MODES}
            modeBanners={MODE_BANNER_IMAGE}
            onBack={() => navigateBack("HOME")}
            onSelectMode={(modeId) => { setSelectedMode(modeId); navigateTo("MODE_DETAIL"); }}
          />
        );

      case "MODE_DETAIL":
        return (
          <ModeDetailView
            modeData={activeModeData}
            modeBanners={MODE_BANNER_IMAGE}
            selectedOpponent={selectedOpponent}
            setSelectedOpponent={setSelectedOpponent}
            selectedRole={selectedRole}
            setSelectedRole={setSelectedRole}
            playerCount={playerCount}
            setPlayerCount={setPlayerCount}
            onBack={() => navigateBack("MODES")}
            onOpenBanner={openBanner}
            onStartOnline={() => {
              network.setCreateRoomMode(selectedMode);
              network.setIsCreateRoomOpen(true);
            }}
            onStartOffline={(effectiveCount, targetTrophies) => {
              onStartGame(selectedMode, selectedOpponent, selectedRole, effectiveCount, targetTrophies, 0, 0);
            }}
          />
        );

      case "TABLES":
        return (
          <TablesScreen
            roomFilter={network.roomFilter}
            setRoomFilter={network.setRoomFilter}
            filteredRooms={network.filteredRooms}
            joinCode={network.joinCode}
            setJoinCode={network.setJoinCode}
            handleJoinRoom={network.handleJoinRoom}
            setIsCreateRoomOpen={network.setIsCreateRoomOpen}
            ROOM_FILTERS={ROOM_FILTERS}
            GAME_MODES={GAME_MODES}
            soundManager={soundManager}
            networkError={network.networkError}
            clearNetworkError={network.clearNetworkError}
            onBack={() => { setNavDirection("none"); setScreen("HOME"); onTabChange("LOBBY"); }}
          />
        );

      case "PROFILE":
        return (
          <ProfileScreen
            profile={profile}
            onUpdateProfile={onUpdateProfile || (() => {})}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onBack={() => { setNavDirection("none"); setScreen("HOME"); onTabChange("LOBBY"); }}
          />
        );

      default:
        return null;
    }
  };

  const isChildScreen = screen === "MODES" || screen === "MODE_DETAIL";

  return (
    <div
      ref={screenContainerRef}
      onPointerDown={handleEdgePointerDown}
      className={`flex-1 w-full h-screen flex flex-col ${screen === "HOME" ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background-panel/60 via-background-main to-background-main" : "bg-transparent"} text-zinc-100 select-none overflow-hidden relative max-w-full`}
    >
      {/* Фоновый слой: Liquid-анимация на всех подэкранах кроме Главного меню (HOME) */}
      {screen !== "HOME" ? (
        <LiquidBackground />
      ) : (
        <>
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-accent-primary/15 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-accent-purple/15 blur-3xl pointer-events-none" />
        </>
      )}

      <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col min-h-0">
        <AnimatePresence initial={false} custom={navDirection} mode="wait">
          <motion.div
            key={screen}
            custom={navDirection}
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: process.env.NODE_ENV === "test" ? 0 : 0.18, ease: "easeOut" }}
            drag={isChildScreen && isEdgeDragging ? "x" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ left: 0, right: 300 }}
            dragElastic={{ left: 0, right: 0.2 }}
            onDragEnd={handleDragEnd}
            className="w-full h-full flex-1 flex flex-col min-h-0 overflow-hidden relative"
          >
            {renderScreenContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {screen !== "MODE_DETAIL" && (
        <div className="lg:hidden">
          <LobbyBottomNav
            currentScreen={screen}
            onNavigate={(nextScreen, nextTab) => {
              setIsEdgeDragging(false);
              setNavDirection("none");
              setScreen(nextScreen);
              onTabChange(nextTab);
            }}
            labels={t.nav}
          />
        </div>
      )}

      <CreateRoomModal
        isOpen={network.isCreateRoomOpen}
        onClose={() => network.setIsCreateRoomOpen(false)}
        selectedMode={network.createRoomMode}
        onSelectMode={network.setCreateRoomMode}
        isPrivate={network.createRoomIsPrivate}
        onTogglePrivate={network.setCreateRoomIsPrivate}
        onConfirm={network.handleConfirmCreateRoom}
        isCreating={network.isCreating}
      />

      <LobbyWaitingModal
        isOpen={network.isWaitingForOpponent}
        isPrivate={network.createRoomIsPrivate}
        roomCode={network.partyRoomCode || ""}
        morseCode={network.morseCode}
        isHost={true}
        onCancel={network.handleCancelWaiting}
      />

      {isTutorialOpen && (
        <Suspense fallback={<TutorialFullscreenFallback />}>
          <TutorialScreen onExit={() => setIsTutorialOpen(false)} onFinish={handleFinishTutorial} />
        </Suspense>
      )}

      <TvPartyModal
        isOpen={isTvPartyModalOpen}
        onClose={() => setIsTvPartyModalOpen(false)}
        onStartTvParty={onStartTvParty}
      />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
};
