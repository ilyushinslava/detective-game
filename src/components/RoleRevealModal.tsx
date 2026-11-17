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
      const prevAllReady = partyService.onAllPlayersReady;
      const prevStatus = partyService.onRoomStatus;
      const prevAction = partyService.onAction;

      partyService.onAction = (action: any) => {
        if (prevAction) prevAction(action);
        if (action?.type === "ALL_PLAYERS_READY") {
          remoteReadyRef.current = true;
          completeOnce();
        }
      };

      partyService.onAllPlayersReady = () => {
        if (prevAllReady) prevAllReady();
        remoteReadyRef.current = true;
        completeOnce();
      };

      partyService.onRoomStatus = (data: any) => {
        const s = typeof data === "string" ? data : data?.status;
        if (prevStatus) prevStatus(data);
        if (s === "PLAYING") {
          remoteReadyRef.current = true;
          completeOnce();
        }
      };

      return () => {
        partyService.onAllPlayersReady = prevAllReady;
        partyService.onRoomStatus = prevStatus;
        partyService.onAction = prevAction;
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
    role1Goal = "Собрать 3 трофея, разоблачая шпиона";
    role2Goal = "Собрать 3 трофея, разоблачая шпиона";
  }

  const isSoloOrOnline = opponent === "AI" || opponent === "ONLINE";
  if (mode === "THIEF_HUNT") {
    role1Goal = "Похитить 8 сокровищ у соседей и менять маски";
  }
  if (mode === "SECRET_SERVICE") {
    role1Goal = "Собрать целевые трофеи (3 в дуэли, 4 при 3 игроках, 3 при 4+)";
    role2Goal = "Собрать целевые трофеи (3 в дуэли, 4 при 3 игроках, 3 при 4+)";
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
  const spyGoalDescription = `Собрать ${spyTargetTrophiesCount} трофея для победы`;

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
        text: "text-red-500",
        border: "border-red-500/60",
        shadow: "shadow-[0_0_25px_rgba(239,68,68,0.25)]",
        button: "bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-500 shadow-[0_10px_25px_rgba(220,38,38,0.5)] border-t border-white/25",
      }
    : {
        text: "text-blue-400",
        border: "border-blue-500/60",
        shadow: "shadow-[0_0_25px_rgba(59,130,246,0.25)]",
        button: "bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 hover:from-blue-600 hover:to-blue-500 shadow-[0_10px_25px_rgba(59,130,246,0.5)] border-t border-white/25",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background-main/95 backdrop-blur-xl p-4 select-none modal-backdrop touch-none"
      onTouchMove={(e) => e.stopPropagation()}
    >
      <FullscreenCharacterPreview
        character={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />

      <div className="w-full max-w-lg h-[92dvh] max-h-[85vh] bg-zinc-950 border border-border-subtle rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col justify-between text-center overflow-y-auto custom-scrollbar">

        {/* Одиночная Директива "Ноль" */}
        {phase === "SECRET_SERVICE_SOLO" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border mb-3 ${isRedTheme ? "bg-red-950/90 text-red-300 border-red-700/60 shadow-[0_0_15px_rgba(239,68,68,0.25)]" : "bg-blue-950/90 text-blue-300 border-blue-700/60 shadow-[0_0_15px_rgba(59,130,246,0.25)]"}`}>
                {GAME_MODES_META.SECRET_SERVICE.title.ru}: Ваша личность
              </span>
              <CharacterRevealCard
                character={detective}
                titleLabel={currentRoleName}
                isRed={false}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Цель операции</span>
                  <span className="text-xs font-bold text-zinc-200">{spyGoalDescription}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role={playerRole} />
            </div>
            <button
              disabled={false}
              onClick={opponent === "ONLINE" ? handleOnlineReady : onComplete}
              className={`w-full h-14 mt-4 ${themeClasses.button} disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-full transition flex items-center justify-center gap-2 cursor-pointer shrink-0`}
            >
              <span>{opponent === "ONLINE" ? "ГОТОВ" : "Начать операцию"}</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* PVP Директива "Ноль": Игрок 1 */}
        {phase === "SPY_P1_PROMPT" && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto">
              <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <RoleRevealIcons.Lock className="w-7 h-7 text-red-400" />
              </div>
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 mb-3">
                {GAME_MODES_META.SECRET_SERVICE.title.ru}
              </span>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                Агент 1: {role1Name}
              </h2>
              <p className="text-xs font-medium tracking-normal text-zinc-400 max-w-xs mb-8 leading-relaxed">
                Передайте устройство Первому агенту. Личность является строго секретной.
              </p>
            </div>
            <button
              onClick={() => setPhase("SPY_P1_REVEAL")}
              className="w-full h-14 bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-500 text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_10px_25px_rgba(220,38,38,0.5)] border-t border-white/25 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Показать личность</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {phase === "SPY_P1_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className="text-[10px] font-black text-red-300 uppercase tracking-widest px-3 py-1 rounded-full bg-red-950/90 border border-red-700/60 shadow-[0_0_15px_rgba(239,68,68,0.25)] mb-3">
                Агент 1: Ваша личность
              </span>
              <CharacterRevealCard
                character={killer}
                titleLabel={role1Name}
                isRed={true}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Цель операции</span>
                  <span className="text-xs font-bold text-zinc-200">{spyGoalDescription}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role="KILLER" />
            </div>
            <button
              onClick={() => setPhase("SPY_P2_PROMPT")}
              className="w-full h-14 mt-4 bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-500 text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_10px_25px_rgba(220,38,38,0.5)] border-t border-white/25 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Скрыть и передать Агенту 2</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* PVP Директива "Ноль": Игрок 2 */}
        {phase === "SPY_P2_PROMPT" && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto">
              <div className="w-16 h-16 rounded-full bg-blue-950/40 border border-blue-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <RoleRevealIcons.Lock className="w-7 h-7 text-blue-400" />
              </div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/40 mb-3">
                {GAME_MODES_META.SECRET_SERVICE.title.ru}
              </span>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                Агент 2: {role2Name}
              </h2>
              <p className="text-xs font-medium tracking-normal text-zinc-400 max-w-xs mb-8 leading-relaxed">
                Передайте устройство Второму агенту. Убедитесь, что Первый агент не смотрит на экран.
              </p>
            </div>
            <button
              onClick={() => setPhase("SPY_P2_REVEAL")}
              className="w-full h-14 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 hover:from-blue-600 hover:to-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_10px_25px_rgba(59,130,246,0.5)] border-t border-white/25 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Показать личность</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {phase === "SPY_P2_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest px-3 py-1 rounded-full bg-blue-950/90 border border-blue-700/60 shadow-[0_0_15px_rgba(59,130,246,0.25)] mb-3">
                Агент 2: Ваша личность
              </span>
              <CharacterRevealCard
                character={detective}
                titleLabel={role2Name}
                isRed={false}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-blue-950/20 border border-blue-900/40 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Цель операции</span>
                  <span className="text-xs font-bold text-zinc-200">{spyGoalDescription}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role="KILLER" />
            </div>
            <button onClick={onComplete} className="w-full h-14 mt-4 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 hover:from-blue-600 hover:to-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_10px_25px_rgba(59,130,246,0.5)] border-t border-white/25 flex items-center justify-center gap-2 cursor-pointer shrink-0">
              <span>Начать шпионскую дуэль</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Режимы MANIAC, THIEF, LINE_UP */}
        {phase === "SOLO_KILLER" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className="text-[10px] font-black text-red-300 uppercase tracking-widest px-3 py-1 rounded-full bg-red-950/90 border border-red-700/60 shadow-[0_0_15px_rgba(239,68,68,0.25)] mb-3">
                Ваша секретная личность
              </span>
              <CharacterRevealCard
                character={killer}
                titleLabel={role1Name}
                isRed={true}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Роль и Задача</span>
                  <span className="text-xs font-bold text-zinc-200 block mb-0.5"><b className="text-red-400">{role1Name}</b></span>
                  <span className="text-[10px] text-zinc-400">{role1Goal}</span>
                </div>
                <div className="bg-blue-950/20 border border-blue-900/40 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Соперник</span>
                  <span className="text-xs font-bold text-zinc-200">{getOpponentText(role2Name)}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role="KILLER" />
            </div>
            <button
              data-testid="ready-button"
              disabled={false}
              onClick={opponent === "ONLINE" ? handleOnlineReady : onComplete}
              className="w-full h-14 mt-4 bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_0_20px_rgba(220,38,38,0.45)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>{opponent === "ONLINE" ? "ГОТОВ" : "Начать операцию"}</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {phase === "SOLO_DETECTIVE_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest px-3 py-1 rounded-full bg-blue-950/90 border border-blue-700/60 shadow-[0_0_15px_rgba(59,130,246,0.25)] mb-3">
                Ваша секретная личность
              </span>
              <CharacterRevealCard
                character={detective}
                titleLabel={role2Name}
                isRed={false}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Роль и Задача</span>
                  <span className="text-xs font-bold text-zinc-200 block mb-0.5"><b className="text-blue-400">{role2Name}</b></span>
                  <span className="text-[10px] text-zinc-400">{role2Goal}</span>
                </div>
                <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Соперник</span>
                  <span className="text-xs font-bold text-zinc-200">{getOpponentText(role1Name)}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role="DETECTIVE" />
            </div>
            <button
              data-testid="ready-button"
              disabled={false}
              onClick={opponent === "ONLINE" ? handleOnlineReady : onComplete}
              className="w-full h-14 mt-4 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 hover:from-blue-600 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_0_20px_rgba(59,130,246,0.45)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>{opponent === "ONLINE" ? "ГОТОВ" : "Начать операцию"}</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* PVP Пошаговое раскрытие */}
        {phase === "KILLER_PROMPT" && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto">
              <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <RoleRevealIcons.Lock className="w-7 h-7 text-red-400" />
              </div>
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 mb-3">
                Партия на одном устройстве
              </span>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                Игрок 1: {role1Name}
              </h2>
              <p className="text-xs font-medium tracking-normal text-zinc-400 max-w-xs mb-8 leading-relaxed">
                Передайте устройство первому игроку. Убедитесь, что второй игрок не смотрит на экран.
              </p>
            </div>
            <button
              onClick={() => setPhase("KILLER_REVEAL")}
              className="w-full h-14 bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-500 text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_10px_25px_rgba(220,38,38,0.5)] border-t border-white/25 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Посмотреть тайную роль</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {phase === "KILLER_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className="text-[10px] font-black text-red-300 uppercase tracking-widest px-3 py-1 rounded-full bg-red-950/90 border border-red-700/60 shadow-[0_0_15px_rgba(239,68,68,0.25)] mb-3">
                Личность игрока 1
              </span>
              <CharacterRevealCard
                character={killer}
                titleLabel={role1Name}
                isRed={true}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Роль и Задача</span>
                  <span className="text-xs font-bold text-zinc-200 block mb-0.5"><b className="text-red-400">{role1Name}</b></span>
                  <span className="text-[10px] text-zinc-400">{role1Goal}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role="KILLER" />
            </div>
            <button
              onClick={() => setPhase("DETECTIVE_PROMPT")}
              className="w-full h-14 mt-4 bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-500 text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_10px_25px_rgba(220,38,38,0.5)] border-t border-white/25 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Скрыть и передать сопернику</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {phase === "DETECTIVE_PROMPT" && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto">
              <div className="w-16 h-16 rounded-full bg-blue-950/40 border border-blue-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <RoleRevealIcons.Lock className="w-7 h-7 text-blue-400" />
              </div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/40 mb-3">
                Партия на одном устройстве
              </span>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                Игрок 2: {role2Name}
              </h2>
              <p className="text-xs font-medium tracking-normal text-zinc-400 max-w-xs mb-8 leading-relaxed">
                Передайте устройство второму игроку. Убедитесь, что первый игрок не смотрит на экран.
              </p>
            </div>
            <button
              onClick={() => setPhase("DETECTIVE_REVEAL")}
              className="w-full h-14 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 hover:from-blue-600 hover:to-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_10px_25px_rgba(59,130,246,0.5)] border-t border-white/25 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Посмотреть тайную роль</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {phase === "DETECTIVE_REVEAL" && (
          <>
            <div className="flex flex-col items-center justify-start flex-1 w-full">
              <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest px-3 py-1 rounded-full bg-blue-950/90 border border-blue-700/60 shadow-[0_0_15px_rgba(59,130,246,0.25)] mb-3">
                Личность игрока 2
              </span>
              <CharacterRevealCard
                character={detective}
                titleLabel={role2Name}
                isRed={false}
                onOpenFullscreen={setFullscreenImage}
              />
              <div className="w-full text-left space-y-2 mt-1">
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Роль и Задача</span>
                  <span className="text-xs font-bold text-zinc-200 block mb-0.5"><b className="text-blue-400">{role2Name}</b></span>
                  <span className="text-[10px] text-zinc-400">{role2Goal}</span>
                </div>
              </div>
              <ActionTilesGrid mode={mode} role="DETECTIVE" />
            </div>
            <button onClick={onComplete} className="w-full h-14 mt-4 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 hover:from-blue-600 hover:to-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-full transition shadow-[0_10px_25px_rgba(59,130,246,0.5)] border-t border-white/25 flex items-center justify-center gap-2 cursor-pointer shrink-0">
              <span>Начать партию</span> <RoleRevealIcons.ArrowRight className="w-4 h-4" />
            </button>
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
