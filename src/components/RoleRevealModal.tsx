import { useState, useEffect, useRef } from "react";
import { partyService } from "../utils/partyPeer";
import type {
  Character,
  GameModeType,
  OpponentType,
  Role,
} from "../types/game";
import { GAME_MODES_META } from "../constants/gameMeta";
import {
  RoleRevealIcons,
  ActionTilesGrid,
  DetectiveChoiceStep,
  WaitingOpponentOverlay,
  FullscreenCharacterPreview,
  CharacterRevealCard,
} from "./roleReveal";

export interface RoleRevealModalProps {
  onReady?: () => void;
  mode: GameModeType;
  opponent: OpponentType;
  playerRole: Role;
  killer: Character | undefined;
  detective: Character | undefined;
  inspectorChoices: Character[];
  role1Name?: string;
  role2Name?: string;
  isOpponentConnected?: boolean;
  onSelectDetectiveRole: (id: string) => void;
  onComplete: () => void;
  onCancelMatch?: () => void;
}

export const RoleRevealModal = ({
  onReady,
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
  useEffect(() => {
    if (opponent === "ONLINE") {
      const unsubAction = partyService.subscribe("action", (action: any) => {
        if (action?.type === "ALL_PLAYERS_READY") {
          remoteReadyRef.current = true;
          completeOnce();
        }
      });

      const unsubAllReady = partyService.subscribe("allPlayersReady", () => {
        remoteReadyRef.current = true;
        completeOnce();
      });

      const unsubStatus = partyService.subscribe("roomStatus", (data: any) => {
        const s = typeof data === "string" ? data : data?.status;
        if (s === "PLAYING") {
          remoteReadyRef.current = true;
          completeOnce();
        }
      });

      return () => {
        unsubAction();
        unsubAllReady();
        unsubStatus();
      };
    }
  }, [opponent, onComplete]);

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
    role1Goal = "Похитить 8 сокровищ у соседей и менять маски";
    role2Goal = "Выставлять патрули на улицы и арестовать Грабителя";
  } else if (mode === "SECRET_SERVICE") {
    role1Name = propRole1Name || "Фантом";
    role2Name = propRole2Name || "Призрак";
    role1Goal = "Собрать 3 единицы компромата, разоблачая шпиона";
    role2Goal = "Собрать 3 единицы компромата, разоблачая шпиона";
  }

  const isSoloOrOnline = opponent === "AI" || opponent === "ONLINE";
  if (mode === "THIEF_HUNT") {
    role1Goal = "Похитить 8 сокровищ у соседей и менять маски";
  }
  if (mode === "SECRET_SERVICE") {
    role1Goal = "Собрать целевой компромат (3 в дуэли, 4 при 3 игроках, 3 при 4+)";
    role2Goal = "Собрать целевой компромат (3 в дуэли, 4 при 3 игроках, 3 при 4+)";
  }

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

  const spyTargetTrophiesCount = (opponent === "PVP" || opponent === "ONLINE") ? 3 : 4;
  const spyGoalDescription = `Собрать ${spyTargetTrophiesCount} компромата для победы`;

  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; name: string; id: string } | null>(null);

  // Онлайн-ожидание и АФК-таймер
  const [isWaitingRemote, setIsWaitingRemote] = useState(false);
  const [afkSecondsLeft, setAfkSecondsLeft] = useState(15);
  const remoteReadyRef = useRef(false);
  const isWaitingRemoteRef = useRef(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const completeOnce = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsWaitingRemote(false);
    onCompleteRef.current();
  };

  useEffect(() => {
    isWaitingRemoteRef.current = isWaitingRemote;
  }, [isWaitingRemote]);

  const onCancelMatchRef = useRef(onCancelMatch);
  useEffect(() => {
    onCancelMatchRef.current = onCancelMatch;
  }, [onCancelMatch]);

  useEffect(() => {
    if (!isWaitingRemote || completedRef.current) return;

    if (afkSecondsLeft <= 0) {
      if (!completedRef.current) {
        onCancelMatchRef.current?.();
      }
      return;
    }

    const timer = setInterval(() => {
      setAfkSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isWaitingRemote, afkSecondsLeft]);

  const handleConfirmChoices = () => {
    if (selectedInspectorId) {
      onSelectDetectiveRole(selectedInspectorId);
    }
    partyService.sendAction({ type: "PLAYER_READY", senderId: (partyService as any).myClientId || "local" } as any);
    onReady?.();
    onComplete();
  };

  const handleOnlineReady = () => {
    if (selectedInspectorId) {
      onSelectDetectiveRole(selectedInspectorId);
    }
    partyService.sendAction({ type: "PLAYER_READY", senderId: partyService.myClientId } as any);
    if (onReady) {
      onReady();
    }
    if (remoteReadyRef.current) {
      completeOnce();
    } else {
      isWaitingRemoteRef.current = true;
      setIsWaitingRemote(true);
    }
  };

  const isRedTheme = playerRole === "KILLER";
  const currentRoleName = isRedTheme ? role1Name : role2Name;

  const themeClasses = isRedTheme
    ? {
        text: "text-rose-400",
        border: "border-rose-500/50",
        shadow: "shadow-[0_0_20px_rgba(225,29,72,0.2)]",
        button: "neo-button-danger rounded-xl h-12 shadow-lg",
      }
    : {
        text: "text-blue-400",
        border: "border-blue-500/50",
        shadow: "shadow-[0_0_20px_rgba(37,99,235,0.2)]",
        button: "neo-button-primary rounded-xl h-12 shadow-lg",
      };

  const getOpponentText = (roleName: string) => {
    if (opponent === "ONLINE") return `Игрок в сети (${roleName})`;
    if (opponent === "PVP") return `Второй игрок (${roleName})`;
    return `Бот-компьютер (${roleName})`;
  };

  // ЭКРАН ОЖИДАНИЯ СОПЕРНИКА В ОНЛАЙНЕ
  if (isWaitingRemote) {
    return (
      <WaitingOpponentOverlay
        afkSecondsLeft={afkSecondsLeft}
        onCancelMatch={onCancelMatch}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background-main/95 backdrop-blur-xl p-3 sm:p-4 select-none modal-backdrop touch-none"
      onTouchMove={(e) => e.stopPropagation()}
    >
      <FullscreenCharacterPreview
        character={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />

      <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[86vh] neo-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col justify-between text-center overflow-hidden relative">

        {/* Одиночная Директива "Ноль" */}
        {phase === "SECRET_SERVICE_SOLO" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border mb-2.5 shrink-0 bg-rose-950/80 text-rose-300 border-rose-700/60">
                {GAME_MODES_META.SECRET_SERVICE.title.ru}: Ваша личность
              </span>
              <CharacterRevealCard
                character={detective}
                titleLabel={role1Name}
                isRed={true}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-1.5 mt-0.5 shrink-0">
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-2.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Цель операции</span>
                  <span className="text-xs font-bold text-zinc-200">{spyGoalDescription}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role="KILLER" />
            </div>
            <div className="pt-3 w-full shrink-0">
              <button
                disabled={false}
                onClick={opponent === "ONLINE" ? handleOnlineReady : onComplete}
                className="w-full neo-button-danger disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg h-12"
              >
                <span>{opponent === "ONLINE" ? "ГОТОВ" : "Начать операцию"}</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* PVP Директива "Ноль": Игрок 1 */}
        {phase === "SPY_P1_PROMPT" && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto min-h-0 overflow-y-auto custom-scrollbar">
              <div className="w-14 h-14 rounded-full bg-rose-950/40 border border-rose-500/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(225,29,72,0.2)]">
                <RoleRevealIcons.Lock className="w-6 h-6 text-rose-400" />
              </div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/40 mb-2.5">
                {GAME_MODES_META.SECRET_SERVICE.title.ru}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2">
                Агент 1: {role1Name}
              </h2>
              <p className="text-xs font-medium tracking-normal text-zinc-400 max-w-xs mb-6 leading-relaxed">
                Передайте устройство Первому агенту. Личность является строго секретной.
              </p>
            </div>
            <div className="pt-3 w-full shrink-0">
              <button
                onClick={() => setPhase("SPY_P1_REVEAL")}
                className="w-full h-12 neo-button-danger text-white text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Показать личность</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {phase === "SPY_P1_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
              <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest px-3 py-1 rounded-full bg-rose-950/80 border border-rose-700/60 mb-2.5 shrink-0">
                Агент 1: Ваша личность
              </span>
              <CharacterRevealCard
                character={killer}
                titleLabel={role1Name}
                isRed={true}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-1.5 mt-0.5 shrink-0">
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-2.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Цель операции</span>
                  <span className="text-xs font-bold text-zinc-200">{spyGoalDescription}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role="KILLER" />
            </div>
            <div className="pt-3 w-full shrink-0">
              <button
                onClick={() => setPhase("SPY_P2_PROMPT")}
                className="w-full h-12 neo-button-danger text-white text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Скрыть и передать Агенту 2</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* PVP Директива "Ноль": Игрок 2 */}
        {phase === "SPY_P2_PROMPT" && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto min-h-0 overflow-y-auto custom-scrollbar">
              <div className="w-14 h-14 rounded-full bg-blue-950/40 border border-blue-500/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                <RoleRevealIcons.Lock className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/40 mb-2.5">
                {GAME_MODES_META.SECRET_SERVICE.title.ru}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2">
                Агент 2: {role2Name}
              </h2>
              <p className="text-xs font-medium tracking-normal text-zinc-400 max-w-xs mb-6 leading-relaxed">
                Передайте устройство Второму агенту. Убедитесь, что Первый агент не смотрит на экран.
              </p>
            </div>
            <div className="pt-3 w-full shrink-0">
              <button
                onClick={() => setPhase("SPY_P2_REVEAL")}
                className="w-full h-12 neo-button-primary text-white text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Показать личность</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {phase === "SPY_P2_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
              <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest px-3 py-1 rounded-full bg-blue-950/80 border border-blue-700/60 mb-2.5 shrink-0">
                Агент 2: Ваша личность
              </span>
              <CharacterRevealCard
                character={detective}
                titleLabel={role2Name}
                isRed={false}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-1.5 mt-0.5 shrink-0">
                <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-2.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Цель операции</span>
                  <span className="text-xs font-bold text-zinc-200">{spyGoalDescription}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role="DETECTIVE" />
            </div>
            <div className="pt-3 w-full shrink-0">
              <button onClick={onComplete} className="w-full h-12 neo-button-primary text-white text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 cursor-pointer">
                <span>Начать шпионскую дуэль</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Режимы MANIAC, THIEF, LINE_UP */}
        {phase === "SOLO_KILLER" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
              <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest px-3 py-1 rounded-full bg-rose-950/80 border border-rose-700/60 mb-2.5 shrink-0">
                Ваша секретная личность
              </span>
              <CharacterRevealCard
                character={killer}
                titleLabel={role1Name}
                isRed={true}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-1.5 mt-0.5 shrink-0">
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-2.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Роль и Задача</span>
                  <span className="text-xs font-bold text-zinc-200 block mb-0.5"><b className="text-rose-400">{role1Name}</b></span>
                  <span className="text-[10px] text-zinc-400">{role1Goal}</span>
                </div>
                <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-2.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Соперник</span>
                  <span className="text-xs font-bold text-zinc-200">{getOpponentText(role2Name)}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role="KILLER" />
            </div>
            <div className="pt-3 w-full shrink-0">
              <button
                data-testid="ready-button"
                disabled={false}
                onClick={opponent === "ONLINE" ? handleOnlineReady : onComplete}
                className="w-full h-12 neo-button-danger disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <span>{opponent === "ONLINE" ? "ГОТОВ" : "Начать операцию"}</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {phase === "SOLO_DETECTIVE_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
              <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest px-3 py-1 rounded-full bg-blue-950/80 border border-blue-700/60 mb-2.5 shrink-0">
                Ваша секретная личность
              </span>
              <CharacterRevealCard
                character={detective}
                titleLabel={role2Name}
                isRed={false}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-1.5 mt-0.5 shrink-0">
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-2.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Роль и Задача</span>
                  <span className="text-xs font-bold text-zinc-200 block mb-0.5"><b className="text-blue-400">{role2Name}</b></span>
                  <span className="text-[10px] text-zinc-400">{role2Goal}</span>
                </div>
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-2.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Соперник</span>
                  <span className="text-xs font-bold text-zinc-200">{getOpponentText(role1Name)}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role="DETECTIVE" />
            </div>
            <div className="pt-3 w-full shrink-0">
              <button
                data-testid="ready-button"
                disabled={false}
                onClick={opponent === "ONLINE" ? handleOnlineReady : onComplete}
                className="w-full h-12 neo-button-primary disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <span>{opponent === "ONLINE" ? "ГОТОВ" : "Начать операцию"}</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* PVP Пошаговое раскрытие */}
        {phase === "KILLER_PROMPT" && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto min-h-0 overflow-y-auto custom-scrollbar">
              <div className="w-14 h-14 rounded-full bg-rose-950/40 border border-rose-500/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(225,29,72,0.2)]">
                <RoleRevealIcons.Lock className="w-6 h-6 text-rose-400" />
              </div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/40 mb-2.5">
                Партия на одном устройстве
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2">
                Игрок 1: {role1Name}
              </h2>
              <p className="text-xs font-medium tracking-normal text-zinc-400 max-w-xs mb-6 leading-relaxed">
                Передайте устройство первому игроку. Убедитесь, что второй игрок не смотрит на экран.
              </p>
            </div>
            <div className="pt-3 w-full shrink-0">
              <button
                onClick={() => setPhase("KILLER_REVEAL")}
                className="w-full h-12 neo-button-danger text-white text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Посмотреть тайную роль</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {phase === "KILLER_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
              <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest px-3 py-1 rounded-full bg-rose-950/80 border border-rose-700/60 mb-2.5 shrink-0">
                Личность игрока 1
              </span>
              <CharacterRevealCard
                character={killer}
                titleLabel={role1Name}
                isRed={true}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-1.5 mt-0.5 shrink-0">
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-2.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Роль и Задача</span>
                  <span className="text-xs font-bold text-zinc-200 block mb-0.5"><b className="text-rose-400">{role1Name}</b></span>
                  <span className="text-[10px] text-zinc-400">{role1Goal}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role="KILLER" />
            </div>
            <div className="pt-3 w-full shrink-0">
              <button
                onClick={() => setPhase("DETECTIVE_PROMPT")}
                className="w-full h-12 neo-button-danger text-white text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Скрыть и передать сопернику</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {phase === "DETECTIVE_PROMPT" && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto min-h-0 overflow-y-auto custom-scrollbar">
              <div className="w-14 h-14 rounded-full bg-blue-950/40 border border-blue-500/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                <RoleRevealIcons.Lock className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/40 mb-2.5">
                Партия на одном устройстве
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2">
                Игрок 2: {role2Name}
              </h2>
              <p className="text-xs font-medium tracking-normal text-zinc-400 max-w-xs mb-6 leading-relaxed">
                Передайте устройство второму игроку. Убедитесь, что первый игрок не смотрит на экран.
              </p>
            </div>
            <div className="pt-3 w-full shrink-0">
              <button
                onClick={() => setPhase("DETECTIVE_REVEAL")}
                className="w-full h-12 neo-button-primary text-white text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Посмотреть тайную роль</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {phase === "DETECTIVE_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
              <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest px-3 py-1 rounded-full bg-blue-950/80 border border-blue-700/60 mb-2.5 shrink-0">
                Личность игрока 2
              </span>
              <CharacterRevealCard
                character={detective}
                titleLabel={role2Name}
                isRed={false}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-1.5 mt-0.5 shrink-0">
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-2.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Роль и Задача</span>
                  <span className="text-xs font-bold text-zinc-200 block mb-0.5"><b className="text-blue-400">{role2Name}</b></span>
                  <span className="text-[10px] text-zinc-400">{role2Goal}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role="DETECTIVE" />
            </div>
            <div className="pt-3 w-full shrink-0">
              <button onClick={onComplete} className="w-full h-12 neo-button-primary text-white text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 cursor-pointer">
                <span>Начать партию</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {phase === "DETECTIVE_CHOOSE" && (
          <DetectiveChoiceStep
            inspectorChoices={inspectorChoices}
            selectedInspectorId={selectedInspectorId}
            onSelectInspectorId={setSelectedInspectorId}
            onConfirmChoices={handleConfirmChoices}
          />
        )}
      </div>
    </div>
  );
};
