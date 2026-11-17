import { useState, useEffect } from "react";
import type { GameModeType, OpponentType, Role } from "../types/game";
import type { UserProfile } from "../types/profile";
import { partyService } from "../utils/partyPeer";
import { triggerHaptic } from "../utils/haptics";
import { soundManager } from "../utils/audio";
import { DEFAULT_BET, TIMINGS } from "../constants/gameRules";

export interface PublicRoomInfo {
  roomCode: string;
  mode: string;
  hostName: string;
  status: string;
  playersCount: number;
  maxPlayers: number;
  bet?: number;
}

export interface UseLobbyNetworkOptions {
  profile: UserProfile;
  screen: string;
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
}

export function useLobbyNetwork({ profile, screen, onStartGame }: UseLobbyNetworkOptions) {
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [roomFilter, setRoomFilter] = useState<string>("ALL");
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [createRoomMode, setCreateRoomMode] = useState<GameModeType>("MANIAC_VS_OPERATIVE");
  const [createRoomBet] = useState<number>(DEFAULT_BET);
  const [createRoomIsPrivate, setCreateRoomIsPrivate] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [partyRoomCode, setPartyRoomCode] = useState<string>("");
  const [morseCode, setMorseCode] = useState<string | null>(null);
  const [activeRoomMode, setActiveRoomMode] = useState<GameModeType>("MANIAC_VS_OPERATIVE");
  const [activeRoomBet, setActiveRoomBet] = useState<number>(DEFAULT_BET);
  const [matchmakingCancel, setMatchmakingCancel] = useState<(() => void) | null>(null);

  // Поллинг публичных комнат при нахождении на вкладке TABLES или HOME (для ПК-сайдбара)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    const loadRooms = async () => {
      try {
        const rooms = await partyService.fetchPublicRooms();
        if (isSubscribed) {
          setPublicRooms(rooms as any);
        }
      } catch (e) {
        console.warn("fetchPublicRooms error:", e);
      }
    };

    // Первичный вызов для мгновенного отображения счетчика в ПК-сайдбаре и на радаре
    loadRooms();

    if (screen === "TABLES" || screen === "HOME") {
      timer = setInterval(loadRooms, TIMINGS.LOBBY_POLL_INTERVAL_MS);
    }

    return () => {
      isSubscribed = false;
      if (timer) clearInterval(timer);
    };
  }, [screen]);

  // Слушатель событий ожидания соперника: получение Морзе и автоматический запуск матча
  useEffect(() => {
    if (!isWaitingForOpponent) {
      return;
    }

    const prevOnRoomStatus = partyService.onRoomStatus;
    const prevOnSyncState = partyService.onSyncState;

    if (partyService.morseCode) {
      setMorseCode(partyService.morseCode);
    }

    partyService.onRoomStatus = (data: any) => {
      prevOnRoomStatus?.(data);
      if (data?.morseCode) {
        setMorseCode(data.morseCode);
      }
      const status = typeof data === "string" ? data : data?.status;
      if (status === "READY_TO_START" || status === "PLAYING") {
        soundManager.play("confirm");
        setIsWaitingForOpponent(false);
        const targetRole = partyService.isHost ? "KILLER" : "DETECTIVE";
        onStartGame(activeRoomMode, "ONLINE", targetRole, 2, 3, 0, activeRoomBet);
      }
    };

    partyService.onSyncState = (state: any, role?: Role, status?: string) => {
      prevOnSyncState?.(state, role, status);
      if (status === "READY_TO_START" || status === "PLAYING") {
        soundManager.play("confirm");
        setIsWaitingForOpponent(false);
        const targetRole = role || (partyService.isHost ? "KILLER" : "DETECTIVE");
        onStartGame(activeRoomMode, "ONLINE", targetRole, 2, 3, 0, activeRoomBet);
      }
    };

    return () => {
      partyService.onRoomStatus = prevOnRoomStatus;
      partyService.onSyncState = prevOnSyncState;
    };
  }, [isWaitingForOpponent, activeRoomMode, activeRoomBet, onStartGame]);

  // Очистка матчмейкинга при анмаунте
  useEffect(() => {
    return () => {
      if (matchmakingCancel) {
        matchmakingCancel();
      }
    };
  }, [matchmakingCancel]);

  const connectToPartyRoom = (
    code: string,
    mode: GameModeType,
    isHost: boolean,
    _bet: number = DEFAULT_BET,
    isPrivate: boolean = false
  ) => {
    const cleanCode = String(code).trim();
    partyService.roomCode = cleanCode;
    setPartyRoomCode(cleanCode);
    setActiveRoomMode(mode);
    setActiveRoomBet(_bet);
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

  const handleQuickPlay = async () => {
    triggerHaptic("heavy");
    setIsCreating(true);

    const cancelFn = partyService.startMatchmaking(
      {
        mode: "MANIAC_VS_OPERATIVE",
        nickname: profile.nickname || "Агент",
        rank: profile.rank || "СТАЖЁР",
        bet: DEFAULT_BET,
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
              bet || DEFAULT_BET
            );
          } else {
            connectToPartyRoom(roomCode, mode || "MANIAC_VS_OPERATIVE", isHost, bet || DEFAULT_BET, false);
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

  const handleCancelWaiting = () => {
    partyService.disconnect();
    setIsWaitingForOpponent(false);
    setIsCreating(false);
    setMorseCode(null);
  };

  const filteredRooms = publicRooms.filter((r) => roomFilter === "ALL" || r.mode === roomFilter);

  return {
    publicRooms,
    filteredRooms,
    joinCode,
    setJoinCode,
    roomFilter,
    setRoomFilter,
    isCreateRoomOpen,
    setIsCreateRoomOpen,
    createRoomMode,
    setCreateRoomMode,
    createRoomBet,
    createRoomIsPrivate,
    setCreateRoomIsPrivate,
    isCreating,
    setIsCreating,
    isWaitingForOpponent,
    setIsWaitingForOpponent,
    partyRoomCode,
    morseCode,
    handleQuickPlay,
    handleConfirmCreateRoom,
    handleJoinRoom,
    handleCancelWaiting,
  };
}
