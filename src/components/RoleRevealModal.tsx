import { useState, useEffect, useRef } from "react";
import type {
  Character,
  GameModeType,
  OpponentType,
  Role,
} from "../types/game";
import { mpService } from "../utils/multiplayerPeer";

const characterImages = import.meta.glob<{ default: string }>(
  "../assets/characters/*.webp",
  { eager: true }
);

// --- ИКОНКИ (Inline SVG) ---
const Icons = {
  Target: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  ),
  Shift: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M9 19l3 3 3 3M2 12h20M12 2v20" />
    </svg>
  ),
  Eye: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Shield: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Folder: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Coins: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="10" y1="10" x2="14" y2="10" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  ),
  Radar: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 20v-8" />
      <path d="M8 12a4 4 0 0 1 8 0" />
      <path d="M4 12a8 8 0 0 1 16 0" />
    </svg>
  ),
  Badge: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Lock: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  ArrowRight: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  Info: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const renderSilhouetteSvg = (id: string) => {
  const num = parseInt(id.replace("c", ""), 10) || 0;
  const variant = num % 8;
  const svgClass = "w-full h-full opacity-40 text-zinc-300 fill-current pointer-events-none";

  switch (variant) {
    case 0:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M35 45 C40 20, 80 20, 85 45 Z" />
          <path d="M15 45 C45 35, 75 35, 105 45 C105 50, 15 50, 15 45 Z" />
          <path d="M45 50 L75 50 L70 75 C60 85, 50 80, 45 50 Z" opacity="0.6" />
          <path d="M25 110 L40 75 L50 90 L60 80 L70 90 L80 75 L95 110 Z" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M30 30 C10 50, 20 90, 35 100 C35 70, 25 50, 45 35 C65 20, 90 30, 95 60 C100 90, 85 100, 85 100 C105 80, 105 40, 80 25 C55 10, 35 15, 30 30 Z" />
          <path d="M45 40 C75 40, 85 60, 75 80 C60 90, 45 80, 45 40 Z" opacity="0.5" />
          <path d="M35 110 C45 95, 75 95, 85 110 Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 120" className={svgClass}>
          <path d="M35 30 C35 10, 75 10, 85 30 C95 50, 90 80, 75 90 C50 100, 30 80, 35 30 Z" opacity="0.6" />
          <path d="M45 45 L75 45 L70 55 L50 55 Z" />
          <path d="M25 110 L35 80 C50 95, 70 95, 85 80 L95 110 Z" />
        </svg>
      );
  }
};

interface RoleRevealModalProps {
  mode: GameModeType;
  opponent: OpponentType;
  playerRole: Role;
  killer: Character | undefined;
  detective: Character | undefined;
  inspectorChoices: Character[];
  role1Name?: string;
  role2Name?: string;
  onSelectDetectiveRole: (id: string) => void;
  onComplete: () => void;
  onCancelMatch?: () => void;
}

export const RoleRevealModal = ({
  mode,
  opponent,
  playerRole,
  killer,
  detective,
  inspectorChoices,
  role1Name: propRole1Name,
  role2Name: propRole2Name,
  onSelectDetectiveRole,
  onComplete,
  onCancelMatch,
}: RoleRevealModalProps) => {
  let role1Name = propRole1Name || "Бандит";
  let role2Name = propRole2Name || "Инспектор";
  let role1Goal = "Ликвидация Инспектора или 14 жертв";
  let role2Goal = "Вычислить Бандита через допросы алиби";

  if (mode === "MANIAC_VS_OPERATIVE") {
    role1Name = propRole1Name || "Маньяк";
    role2Name = propRole2Name || "Оперативник";
    role1Goal = "Устранить 4 цели строго по открытому списку жертв";
    role2Goal = "Вычислить Маньяка до завершения серии из 4 смертей";
  } else if (mode === "THIEF_HUNT") {
    role1Name = propRole1Name || "Грабитель";
    role2Name = propRole2Name || "Полиция";
    role1Goal = "Похитить 5 сокровищ у соседей и менять маски";
    role2Goal = "Выставлять патрули на улицы и арестовать Грабителя";
  } else if (mode === "SECRET_SERVICE") {
    role1Name = propRole1Name || "Агент 1";
    role2Name = propRole2Name || "Агент 2";
    role1Goal = "Собрать 4 трофея, разоблачая шпиона";
    role2Goal = "Собрать 4 трофея, разоблачая шпиона";
  }

  const isSoloOrOnline = opponent === "AI" || opponent === "ONLINE";

  const [phase, setPhase] = useState<string>(() => {
    if (mode === "SECRET_SERVICE") {
      return isSoloOrOnline ? "SECRET_SERVICE_SOLO" : "SPY_P1_PROMPT";
    }
    if (isSoloOrOnline) {
      return playerRole === "KILLER"
        ? "SOLO_KILLER"
        : "SOLO_DETECTIVE_REVEAL";
    }
    return "KILLER_PROMPT";
  });

  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Онлайн-ожидание и АФК-таймер
  const [isWaitingRemote, setIsWaitingRemote] = useState(false);
  const [afkSecondsLeft, setAfkSecondsLeft] = useState(30);
  const remoteReadyRef = useRef(false);

  useEffect(() => {
    if (opponent !== "ONLINE") return;

    const unsubscribe = mpService.subscribeToActions((action: any) => {
      if (action.type === "PLAYER_READY") {
        remoteReadyRef.current = true;
        if (isWaitingRemote) {
          onComplete();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [opponent, isWaitingRemote, onComplete]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isWaitingRemote) {
      timer = setInterval(() => {
        setAfkSecondsLeft((prev) => {
          if (prev <= 1) {
            if (onCancelMatch) onCancelMatch();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isWaitingRemote, onCancelMatch]);

  const handleConfirmChoices = () => {
    if (selectedInspectorId) {
      onSelectDetectiveRole(selectedInspectorId);
    }
    onComplete();
  };

  const handleOnlineReady = () => {
    if (selectedInspectorId) {
      onSelectDetectiveRole(selectedInspectorId);
    }
    mpService.sendAction({ type: "PLAYER_READY", senderId: "local" } as any);
    if (remoteReadyRef.current) {
      onComplete();
    } else {
      setIsWaitingRemote(true);
    }
  };

  const isRedTheme = playerRole === "KILLER";
  const currentRoleName = isRedTheme ? role1Name : role2Name;

  const themeClasses = isRedTheme
    ? {
        text: "text-red-500",
        border: "border-red-500/60",
        shadow: "shadow-[0_0_25px_rgba(239,68,68,0.25)]",
        button: "bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-500 shadow-[0_0_20px_rgba(220,38,38,0.45)]",
      }
    : {
        text: "text-cyan-400",
        border: "border-cyan-500/60",
        shadow: "shadow-[0_0_25px_rgba(6,182,212,0.25)]",
        button: "bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-800 hover:from-cyan-600 hover:to-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.45)]",
      };

  const renderCharacterCard = (char: Character | undefined, titleLabel: string, isRed: boolean) => {
    const imageAsset = char?.id ? characterImages[`../assets/characters/${char.id}.webp`]?.default : null;
    const gradient = isRed
      ? "from-red-950 via-zinc-950/80 to-transparent"
      : "from-cyan-950 via-zinc-950/80 to-transparent";
    const border = isRed
      ? "border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
      : "border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.3)]";

    return (
      <div className={`relative w-full rounded-3xl overflow-hidden border ${border} bg-zinc-950 h-[230px] sm:h-[260px] flex flex-col justify-between p-5 mb-3.5 select-none shrink-0 shadow-2xl`}>
        {imageAsset ? (
          <img
            src={imageAsset}
            alt={char?.name || "Личность"}
            className="absolute inset-0 w-full h-full object-cover object-center pt-4 opacity-60 grayscale contrast-125 pointer-events-none"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-6 pt-10">
            {renderSilhouetteSvg(char?.id || "c0")}
          </div>
        )}
        <div className={`absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t ${gradient} pointer-events-none`} />

        <div className="relative z-10 flex items-center justify-between">
          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${isRed ? "bg-red-950/90 text-red-300 border-red-700/60" : "bg-cyan-950/90 text-cyan-300 border-cyan-700/60"}`}>
            {titleLabel}
          </span>
          <span className="text-xs font-mono font-bold text-zinc-400">
            {char?.id ? `#${char.id.replace("c", "").padStart(2, "0")}` : ""}
          </span>
        </div>

        <div className="relative z-10 text-left">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
            Тайная личность
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider leading-none drop-shadow-md">
            {char?.name ?? "Неизвестно"}
          </h2>
        </div>
      </div>
    );
  };

  const getActionTiles = (currentMode: GameModeType, role: Role) => {
    interface ActionTileItem {
      id: string;
      label: string;
      icon: JSX.Element;
      desc: string;
    }

    const tiles: ActionTileItem[] = [];
    const isRed = role === "KILLER";
    const colorClass = isRed ? "text-red-500" : "text-cyan-400";

    if (currentMode === "SKHVATKA") {
      if (isRed) {
        tiles.push({
          id: "kill",
          label: "Ликвидация",
          icon: <Icons.Target className={`w-6 h-6 ${colorClass}`} />,
          desc: "Устранить соседнего персонажа (включая диагональ). При убийстве невиновного проводится опрос соперника.",
        });
        tiles.push({
          id: "shift",
          label: "Сдвиг",
          icon: <Icons.Shift className="w-6 h-6 text-zinc-400" />,
          desc: "Сместить ряд или колонку на 1 клетку. Нельзя отменять ход противника.",
        });
        tiles.push({
          id: "disguise",
          label: "Конспирация",
          icon: <Icons.Eye className="w-6 h-6 text-zinc-400" />,
          desc: "Взять карту из колоды и сменить тайную личность.",
        });
      } else {
        tiles.push({
          id: "accuse",
          label: "Задержание",
          icon: <Icons.Shield className={`w-6 h-6 ${colorClass}`} />,
          desc: "Обвинить соседнюю клетку. Если это преступник — победа.",
        });
        tiles.push({
          id: "shift",
          label: "Сдвиг",
          icon: <Icons.Shift className="w-6 h-6 text-zinc-400" />,
          desc: "Сместить ряд или колонку на 1 клетку. Нельзя отменять ход противника.",
        });
        tiles.push({
          id: "alibi",
          label: "Проверка алиби",
          icon: <Icons.Folder className="w-6 h-6 text-zinc-400" />,
          desc: "Выложить доказательство из руки на поле и опросить преступника.",
        });
      }
    } else if (currentMode === "MANIAC_VS_OPERATIVE") {
      if (isRed) {
        tiles.push({
          id: "target_kill",
          label: "Заказная цель",
          icon: <Icons.Target className={`w-6 h-6 ${colorClass}`} />,
          desc: "Ликвидировать текущую цель строго по открытому списку из 4 жертв.",
        });
        tiles.push({
          id: "shift",
          label: "Сдвиг",
          icon: <Icons.Shift className="w-6 h-6 text-zinc-400" />,
          desc: "Сместить ряд или колонку на 1 клетку. Нельзя отменять ход противника.",
        });
        tiles.push({
          id: "escape",
          label: "Побег",
          icon: <Icons.Eye className="w-6 h-6 text-zinc-400" />,
          desc: "Взять карту из колоды и сменить тайную личность.",
        });
      } else {
        tiles.push({
          id: "accuse",
          label: "Задержание",
          icon: <Icons.Shield className={`w-6 h-6 ${colorClass}`} />,
          desc: "Обвинить соседнюю клетку. Если это преступник — победа.",
        });
        tiles.push({
          id: "shift",
          label: "Сдвиг",
          icon: <Icons.Shift className="w-6 h-6 text-zinc-400" />,
          desc: "Сместить ряд или колонку на 1 клетку. Нельзя отменять ход противника.",
        });
        tiles.push({
          id: "alibi",
          label: "Проверка алиби",
          icon: <Icons.Folder className="w-6 h-6 text-zinc-400" />,
          desc: "Выложить доказательство из руки на поле и опросить преступника.",
        });
      }
    } else if (currentMode === "THIEF_HUNT") {
      if (isRed) {
        tiles.push({
          id: "steal",
          label: "Кража",
          icon: <Icons.Coins className={`w-6 h-6 ${colorClass}`} />,
          desc: "Украсть сокровище из сейфа у себя или соседней клетки. Цель — 5 сокровищ.",
        });
        tiles.push({
          id: "shift",
          label: "Сдвиг",
          icon: <Icons.Shift className="w-6 h-6 text-zinc-400" />,
          desc: "Сместить ряд или колонку на 1 клетку. Нельзя отменять ход противника.",
        });
        tiles.push({
          id: "disguise_thief",
          label: "Смена маски",
          icon: <Icons.Eye className="w-6 h-6 text-zinc-400" />,
          desc: "Взять карту из колоды и сменить тайную личность.",
        });
      } else {
        tiles.push({
          id: "accuse_thief",
          label: "Задержание",
          icon: <Icons.Shield className={`w-6 h-6 ${colorClass}`} />,
          desc: "Обвинить клетку рядом со своей тайной личностью или любым из патрульных.",
        });
        tiles.push({
          id: "shift",
          label: "Сдвиг",
          icon: <Icons.Shift className="w-6 h-6 text-zinc-400" />,
          desc: "Сместить ряд или колонку на 1 клетку. Нельзя отменять ход противника.",
        });
        tiles.push({
          id: "patrol",
          label: "Вызов патруля",
          icon: <Icons.Badge className="w-6 h-6 text-zinc-400" />,
          desc: "Заменить открытого патрульного картой из колоды (грабитель получает 1 сокровище).",
        });
      }
    } else if (currentMode === "SECRET_SERVICE") {
      tiles.push({
        id: "capture_spy",
        label: "Разоблачение",
        icon: <Icons.Target className={`w-6 h-6 ${colorClass}`} />,
        desc: "Вскрыть соседнего подозреваемого. Если это чужой агент — забрать трофей.",
      });
      tiles.push({
        id: "shift",
        label: "Сдвиг",
        icon: <Icons.Shift className="w-6 h-6 text-zinc-400" />,
        desc: "Сместить ряд или колонку на 1 клетку. Нельзя отменять ход противника.",
      });
      tiles.push({
        id: "interrogate_spy",
        label: "Опрос свидетелей",
        icon: <Icons.Radar className="w-6 h-6 text-zinc-400" />,
        desc: "Узнать, находится ли тайная личность соперника рядом с выбранной целью.",
      });
    }

    const selectedTile = tiles.find((t) => t.id === activeTooltip);

    return (
      <div className="w-full mt-3 text-left">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
            ДОСТУПНЫЕ ДЕЙСТВИЯ
          </span>
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <Icons.Info className="w-3 h-3 text-zinc-500" /> Нажмите для деталей
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 w-full">
          {tiles.map((t) => {
            const isCurrent = activeTooltip === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTooltip((prev) => (prev === t.id ? null : t.id))}
                className={`rounded-2xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer border ${
                  isCurrent
                    ? "bg-zinc-800/90 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.15)] scale-[1.02]"
                    : "bg-zinc-900/60 border-white/5 hover:border-white/20 active:scale-95"
                }`}
              >
                {t.icon}
                <span className="text-[9px] font-black text-zinc-200 uppercase tracking-widest leading-tight">
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Плашка пояснения выбранного действия */}
        {selectedTile && (
          <div className="mt-2.5 p-3 rounded-xl bg-zinc-900/90 border border-white/10 text-[10px] text-zinc-300 font-mono text-left animate-fadeIn leading-relaxed">
            <b className="text-white uppercase font-black block mb-0.5">{selectedTile.label}:</b>
            {selectedTile.desc}
          </div>
        )}
      </div>
    );
  };

  const getOpponentText = (roleName: string) => {
    if (opponent === "ONLINE") return `Игрок в сети (${roleName})`;
    if (opponent === "PVP") return `Второй игрок (${roleName})`;
    return `Бот-компьютер (${roleName})`;
  };

  // ЭКРАН ОЖИДАНИЯ СОПЕРНИКА В ОНЛАЙНЕ
  if (isWaitingRemote) {
    return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080a0f]/95 backdrop-blur-xl p-4 select-none">
      <div className="w-full max-w-md h-[90dvh] max-h-[760px] bg-zinc-950 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col justify-between text-center overflow-y-auto custom-scrollbar"> <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Сетевой протокол</div>
          <div className="w-12 h-12 border-2 border-zinc-800 border-t-cyan-500 rounded-full animate-spin mb-6" />
          <h2 className="text-lg font-black text-white uppercase tracking-wider mb-2">Ожидание соперника</h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Вы подтвердили готовность. Ждем подтверждения второго игрока...
          </p>
          <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 w-full flex items-center justify-between font-mono mb-6">
            <span className="text-[10px] text-zinc-400 uppercase">Автоотмена (АФК):</span>
            <span className="text-xs font-black text-amber-500">{afkSecondsLeft} сек</span>
          </div>
          {onCancelMatch && (
            <button
              onClick={onCancelMatch}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-white/5 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
            >
              Отменить матч
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080a0f]/95 backdrop-blur-xl p-4 select-none">
      <div className="w-full max-w-lg h-[92dvh] max-h-[820px] bg-zinc-950 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col justify-between text-center overflow-y-auto custom-scrollbar">
        
        {/* Одиночная Секретная служба */}
        {phase === "SECRET_SERVICE_SOLO" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className={`text-[10px] font-black ${themeClasses.text} uppercase tracking-widest mb-3`}>
                Секретная служба: Ваша личность
              </span>
              {renderCharacterCard(detective, currentRoleName, false)}
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Цель операции</span>
                  <span className="text-xs font-bold text-zinc-200">Собрать 4 трофея (ловить чужих шпионов)</span>
                </div>
              </div>
              {getActionTiles(mode, playerRole)}
            </div>
            <button
              onClick={opponent === "ONLINE" ? handleOnlineReady : onComplete}
              className={`w-full h-14 mt-4 ${themeClasses.button} text-white text-xs font-black uppercase tracking-widest rounded-full transition flex items-center justify-center gap-2 cursor-pointer shrink-0`}
            >
              <span>{opponent === "ONLINE" ? "ГОТОВ" : "Начать операцию"}</span> <Icons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* PVP Секретная служба: Игрок 1 */}
        {phase === "SPY_P1_PROMPT" && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto">
              <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-500/50 flex items-center justify-center text-red-500 font-black text-2xl mb-6 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                1
              </div>
              <h2 className="text-xl font-black uppercase tracking-widest text-zinc-100 mb-3">
                Агент «Восток»
              </h2>
              <p className="text-[10px] font-mono text-zinc-500 max-w-xs leading-relaxed uppercase tracking-widest">
                Убедитесь, что второй игрок не смотрит на экран перед раскрытием вашей тайной личности.
              </p>
            </div>
            <button onClick={() => setPhase("SPY_P1_REVEAL")} className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-full transition flex items-center justify-center gap-2 cursor-pointer shrink-0">
              <Icons.Eye className="w-4 h-4" /> <span>Посмотреть тайную роль</span>
            </button>
          </>
        )}

        {phase === "SPY_P1_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">
                Тайная личность
              </span>
              {renderCharacterCard(detective, "Агент «Восток»", true)}
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Цель операции</span>
                  <span className="text-xs font-bold text-zinc-200">Собрать 4 трофея для победы</span>
                </div>
              </div>
              {getActionTiles(mode, "DETECTIVE")}
            </div>
            <button onClick={() => setPhase("SPY_P2_PROMPT")} className="w-full h-14 mt-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-full transition flex items-center justify-center gap-2 cursor-pointer shrink-0">
              <Icons.Lock className="w-4 h-4" /> <span>Скрыть и передать Агенту «Запад»</span>
            </button>
          </>
        )}

        {/* PVP Секретная служба: Игрок 2 */}
        {phase === "SPY_P2_PROMPT" && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto">
              <div className="w-16 h-16 rounded-full bg-cyan-950/50 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-black text-2xl mb-6 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                2
              </div>
              <h2 className="text-xl font-black uppercase tracking-widest text-zinc-100 mb-3">
                Агент «Запад»
              </h2>
              <p className="text-[10px] font-mono text-zinc-500 max-w-xs leading-relaxed uppercase tracking-widest">
                Агент «Восток» передал устройство. Ознакомьтесь с вашей тайной ролью.
              </p>
            </div>
            <button onClick={() => setPhase("SPY_P2_REVEAL")} className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-full transition flex items-center justify-center gap-2 cursor-pointer shrink-0">
              <Icons.Eye className="w-4 h-4" /> <span>Посмотреть тайную роль</span>
            </button>
          </>
        )}

        {phase === "SPY_P2_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3">
                Тайная личность
              </span>
              {renderCharacterCard(killer, "Агент «Запад»", false)}
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Цель операции</span>
                  <span className="text-xs font-bold text-zinc-200">Собрать 4 трофея для победы</span>
                </div>
              </div>
              {getActionTiles(mode, "KILLER")}
            </div>
            <button onClick={onComplete} className="w-full h-14 mt-4 bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-800 hover:from-cyan-600 hover:to-cyan-500 text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_0_20px_rgba(6,182,212,0.45)] flex items-center justify-center gap-2 cursor-pointer shrink-0">
              <span>Начать шпионскую дуэль</span> <Icons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Режимы SKHVATKA, MANIAC, THIEF */}
        {phase === "SOLO_KILLER" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">
                Ваша секретная личность
              </span>
              {renderCharacterCard(killer, role1Name, true)}
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Роль и Задача</span>
                  <span className="text-xs font-bold text-zinc-200 block mb-0.5"><b className="text-red-400">{role1Name}</b></span>
                  <span className="text-[10px] text-zinc-400">{role1Goal}</span>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Соперник</span>
                  <span className="text-xs font-bold text-zinc-200">{getOpponentText(role2Name)}</span>
                </div>
              </div>
              {getActionTiles(mode, "KILLER")}
            </div>
            <button
              onClick={opponent === "ONLINE" ? handleOnlineReady : onComplete}
              className="w-full h-14 mt-4 bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-500 text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_0_20px_rgba(220,38,38,0.45)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>{opponent === "ONLINE" ? "ГОТОВ" : "Начать операцию"}</span> <Icons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {phase === "SOLO_DETECTIVE_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3">
                {mode === "SKHVATKA" ? "Ориентировка" : "Ваша секретная личность"}
              </span>
              {mode === "SKHVATKA" ? (
                <div className="w-full p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.25)] mb-6 flex flex-col items-center justify-center text-center min-h-[240px] sm:min-h-[270px]">
                  <Icons.Shield className="w-16 h-16 text-cyan-500 mb-4 opacity-80" />
                  <h2 className="text-xl font-black text-zinc-100 uppercase tracking-wider mb-2">
                    Ожидание хода
                  </h2>
                  <p className="text-[10px] font-mono text-cyan-200/70 uppercase tracking-widest leading-relaxed">
                    Выбор личности после выстрела. Бандит сделает первый ход вслепую. После ликвидации жертвы вы оцените обстановку и выберете личность из 4 карт.
                  </p>
                </div>
              ) : (
                renderCharacterCard(detective, role2Name, false)
              )}
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Роль и Задача</span>
                  <span className="text-xs font-bold text-zinc-200 block mb-0.5"><b className="text-cyan-400">{role2Name}</b></span>
                  <span className="text-[10px] text-zinc-400">{role2Goal}</span>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Соперник</span>
                  <span className="text-xs font-bold text-zinc-200">{getOpponentText(role1Name)}</span>
                </div>
              </div>
              {mode !== "SKHVATKA" && getActionTiles(mode, "DETECTIVE")}
            </div>
            <button
              onClick={opponent === "ONLINE" ? handleOnlineReady : onComplete}
              className="w-full h-14 mt-4 bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-800 hover:from-cyan-600 hover:to-cyan-500 text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_0_20px_rgba(6,182,212,0.45)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>{opponent === "ONLINE" ? "ГОТОВ" : (mode === "SKHVATKA" ? "Принять дело" : "Начать расследование")}</span> <Icons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {phase === "SOLO_DETECTIVE_CHOOSE" && (
          <>
            <div className="flex flex-col items-center flex-1 justify-start w-full">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">
                Выбор личности (1 из 4)
              </span>
              <p className="text-[10px] font-mono text-zinc-500 mb-5 uppercase tracking-widest">
                Остальные 3 карты составят ваше досье алиби.
              </p>

              <div className="grid grid-cols-2 gap-3 w-full">
                {inspectorChoices.map((char) => {
                  const isSelected = selectedInspectorId === char.id;
                  const img = char.id ? characterImages[`../assets/characters/${char.id}.webp`]?.default : null;
                  return (
                    <div
                      key={char.id}
                      onClick={() => setSelectedInspectorId(char.id)}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border text-left cursor-pointer transition select-none min-h-[105px] overflow-hidden ${
                        isSelected
                          ? "bg-cyan-950/40 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.35)] scale-[1.02]"
                          : "bg-zinc-900/50 border-white/5 hover:border-white/20 text-zinc-400"
                      }`}
                    >
                      {img && (
                        <img src={img} alt={char.name} className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none" />
                      )}
                      <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                        <span>#{char.id.replace("c", "").padStart(2, "0")}</span>
                        {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.9)]" />}
                      </div>
                      <div className={`relative z-10 text-xs font-black uppercase tracking-wider mt-3 ${isSelected ? "text-cyan-100" : "text-zinc-200"}`}>
                        {char.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              onClick={opponent === "ONLINE" ? handleOnlineReady : handleConfirmChoices}
              disabled={!selectedInspectorId}
              className="w-full h-14 mt-4 bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-800 hover:from-cyan-600 hover:to-cyan-500 disabled:from-zinc-800 disabled:to-zinc-900 disabled:text-zinc-600 disabled:shadow-none text-white text-[10px] font-black uppercase tracking-widest rounded-full transition cursor-pointer disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.45)] flex items-center justify-center gap-2 shrink-0"
            >
              <span>{opponent === "ONLINE" ? "ГОТОВ" : "Подтвердить личность"}</span> <Icons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {phase === "KILLER_PROMPT" && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto">
              <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-500/50 flex items-center justify-center text-red-500 font-black text-2xl mb-6 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                1
              </div>
              <h2 className="text-xl font-black uppercase tracking-widest text-zinc-100 mb-3">
                Ознакомление: {role1Name}
              </h2>
              <p className="text-[10px] font-mono text-zinc-500 max-w-xs leading-relaxed uppercase tracking-widest">
                Убедитесь, что второй игрок не смотрит на экран перед раскрытием тайной личности.
              </p>
            </div>
            <button onClick={() => setPhase("KILLER_REVEAL")} className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-full transition flex items-center justify-center gap-2 cursor-pointer shrink-0">
              <Icons.Eye className="w-4 h-4" /> <span>Посмотреть тайную роль</span>
            </button>
          </>
        )}

        {phase === "KILLER_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">
                Тайная личность
              </span>
              {renderCharacterCard(killer, role1Name, true)}
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Роль и Задача</span>
                  <span className="text-xs font-bold text-zinc-200 block mb-0.5"><b className="text-red-400">{role1Name}</b></span>
                  <span className="text-[10px] text-zinc-400">{role1Goal}</span>
                </div>
              </div>
              {getActionTiles(mode, "KILLER")}
            </div>
            <button onClick={() => setPhase("DETECTIVE_PROMPT")} className="w-full h-14 mt-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-full transition flex items-center justify-center gap-2 cursor-pointer shrink-0">
              <Icons.Lock className="w-4 h-4" /> <span>Скрыть и передать сопернику</span>
            </button>
          </>
        )}

        {phase === "DETECTIVE_PROMPT" && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto">
              <div className="w-16 h-16 rounded-full bg-cyan-950/50 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-black text-2xl mb-6 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                2
              </div>
              <h2 className="text-xl font-black uppercase tracking-widest text-zinc-100 mb-3">
                Ознакомление: {role2Name}
              </h2>
              <p className="text-[10px] font-mono text-zinc-500 max-w-xs leading-relaxed uppercase tracking-widest">
                {role1Name} передал устройство. Ознакомьтесь со своей ролью.
              </p>
            </div>
            <button onClick={() => setPhase("DETECTIVE_REVEAL")} className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-full transition flex items-center justify-center gap-2 cursor-pointer shrink-0">
              <Icons.Eye className="w-4 h-4" /> <span>Посмотреть роль</span>
            </button>
          </>
        )}

        {phase === "DETECTIVE_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3">
                {mode === "SKHVATKA" ? "Ориентировка" : "Тайная личность"}
              </span>
              {mode === "SKHVATKA" ? (
                <div className="w-full p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.25)] mb-6 flex flex-col items-center justify-center text-center min-h-[240px] sm:min-h-[270px]">
                  <Icons.Shield className="w-16 h-16 text-cyan-500 mb-4 opacity-80" />
                  <h2 className="text-xl font-black text-zinc-100 uppercase tracking-wider mb-2">
                    Ожидание хода
                  </h2>
                  <p className="text-[10px] font-mono text-cyan-200/70 uppercase tracking-widest leading-relaxed">
                    Выбор личности после выстрела. Бандит сделает первый ход вслепую. После ликвидации жертвы вы оцените обстановку и выберете личность из 4 карт.
                  </p>
                </div>
              ) : (
                renderCharacterCard(detective, role2Name, false)
              )}
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Роль и Задача</span>
                  <span className="text-xs font-bold text-zinc-200 block mb-0.5"><b className="text-cyan-400">{role2Name}</b></span>
                  <span className="text-[10px] text-zinc-400">{role2Goal}</span>
                </div>
              </div>
              {mode !== "SKHVATKA" && getActionTiles(mode, "DETECTIVE")}
            </div>
            <button onClick={onComplete} className="w-full h-14 mt-4 bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-800 hover:from-cyan-600 hover:to-cyan-500 text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_0_20px_rgba(6,182,212,0.45)] flex items-center justify-center gap-2 cursor-pointer shrink-0">
              <span>{mode === "SKHVATKA" ? "Принять дело" : "Начать партию"}</span> <Icons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {phase === "DETECTIVE_CHOOSE" && (
          <>
            <div className="flex flex-col items-center flex-1 justify-start w-full">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">
                Выбор личности (1 из 4)
              </span>
              <p className="text-[10px] font-mono text-zinc-500 mb-5 uppercase tracking-widest">
                Остальные 3 карты составят твою начальную руку доказательств.
              </p>

              <div className="grid grid-cols-2 gap-3 w-full">
                {inspectorChoices.map((char) => {
                  const isSelected = selectedInspectorId === char.id;
                  const img = char.id ? characterImages[`../assets/characters/${char.id}.webp`]?.default : null;
                  return (
                    <div
                      key={char.id}
                      onClick={() => setSelectedInspectorId(char.id)}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border text-left cursor-pointer transition select-none min-h-[105px] overflow-hidden ${
                        isSelected
                          ? "bg-cyan-950/40 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.35)] scale-[1.02]"
                          : "bg-zinc-900/50 border-white/5 hover:border-white/20 text-zinc-400"
                      }`}
                    >
                      {img && (
                        <img src={img} alt={char.name} className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none" />
                      )}
                      <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                        <span>#{char.id.replace("c", "").padStart(2, "0")}</span>
                        {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.9)]" />}
                      </div>
                      <div className={`relative z-10 text-xs font-black uppercase tracking-wider mt-3 ${isSelected ? "text-cyan-100" : "text-zinc-200"}`}>
                        {char.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              onClick={handleConfirmChoices}
              disabled={!selectedInspectorId}
              className="w-full h-14 mt-4 bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-800 hover:from-cyan-600 hover:to-cyan-500 disabled:from-zinc-800 disabled:to-zinc-900 disabled:text-zinc-600 disabled:shadow-none text-white text-[10px] font-black uppercase tracking-widest rounded-full transition cursor-pointer disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.45)] flex items-center justify-center gap-2 shrink-0"
            >
              <span>Подтвердить личность</span> <Icons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};