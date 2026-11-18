import type { PublicRoomInfo } from "../hooks/useLobbyNetwork";

export interface MockRoomInfo extends PublicRoomInfo {
  isPrivate?: boolean;
}

export const MOCK_NETWORK_ROOMS: MockRoomInfo[] = [
  // --- Открытые столы (PUBLIC) ---
  {
    roomCode: "room_alpha_742",
    mode: "MANIAC_VS_OPERATIVE",
    hostName: "Агент 742",
    status: "WAITING",
    playersCount: 1,
    maxPlayers: 2,
    bet: 100,
    isPrivate: false,
  },
  {
    roomCode: "room_holmes_221",
    mode: "THIEF_HUNT",
    hostName: "Детектив Холмс",
    status: "WAITING",
    playersCount: 1,
    maxPlayers: 2,
    bet: 250,
    isPrivate: false,
  },
  {
    roomCode: "room_directive_01",
    mode: "SECRET_SERVICE",
    hostName: "Майор Ковальски",
    status: "WAITING",
    playersCount: 1,
    maxPlayers: 2,
    bet: 500,
    isPrivate: false,
  },
  {
    roomCode: "room_lineup_07",
    mode: "LINE_UP",
    hostName: "Инспектор Лестрейд",
    status: "WAITING",
    playersCount: 1,
    maxPlayers: 2,
    bet: 1000,
    isPrivate: false,
  },
  {
    roomCode: "room_shadow_12",
    mode: "THIEF_HUNT",
    hostName: "Тень_12",
    status: "WAITING",
    playersCount: 1,
    maxPlayers: 2,
    bet: 100,
    isPrivate: false,
  },
  {
    roomCode: "room_spectre_99",
    mode: "MANIAC_VS_OPERATIVE",
    hostName: "Спектр",
    status: "IN_GAME",
    playersCount: 2,
    maxPlayers: 2,
    bet: 500,
    isPrivate: false,
  },
  {
    roomCode: "room_noir_44",
    mode: "SECRET_SERVICE",
    hostName: "Нуар_44",
    status: "IN_GAME",
    playersCount: 2,
    maxPlayers: 2,
    bet: 2500,
    isPrivate: false,
  },
  {
    roomCode: "room_full_55",
    mode: "LINE_UP",
    hostName: "Шериф Браун",
    status: "FULL",
    playersCount: 2,
    maxPlayers: 2,
    bet: 5000,
    isPrivate: false,
  },

  // --- Закрытые столы с шифром Морзе (PRIVATE) ---
  {
    roomCode: "room_priv_cipher",
    mode: "MANIAC_VS_OPERATIVE",
    hostName: "Связной_X",
    status: "WAITING",
    playersCount: 1,
    maxPlayers: 2,
    bet: 500,
    isPrivate: true,
  },
  {
    roomCode: "room_priv_safe",
    mode: "SECRET_SERVICE",
    hostName: "Агент 003",
    status: "WAITING",
    playersCount: 1,
    maxPlayers: 2,
    bet: 1000,
    isPrivate: true,
  },
  {
    roomCode: "room_priv_thief",
    mode: "THIEF_HUNT",
    hostName: "Комиссар",
    status: "IN_GAME",
    playersCount: 2,
    maxPlayers: 2,
    bet: 250,
    isPrivate: true,
  },
  {
    roomCode: "room_priv_full",
    mode: "LINE_UP",
    hostName: "Крот_VIP",
    status: "FULL",
    playersCount: 2,
    maxPlayers: 2,
    bet: 5000,
    isPrivate: true,
  },
];

export const MOCK_PRIVATE_ROOM_PASSWORDS: Record<string, string> = {
  room_priv_cipher: "...---...",
  room_priv_safe: ".-.-.-.",
  room_priv_thief: "--..--..",
  room_priv_full: ".-.-...",
};

