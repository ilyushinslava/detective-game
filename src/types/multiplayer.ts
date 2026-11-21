import type { Role, GameModeType } from "./game";

export type ClientDeviceType = "TV_DISPLAY" | "CONTROLLER" | "PLAYER" | "SPECTATOR";

export type RoomStatus = "EMPTY" | "WAITING" | "READY_TO_START" | "PLAYING" | "PAUSED" | "FINISHED";

export interface MorseCandidate {
  roomCode: string;
  hostName: string;
  mode: string;
  status: string;
  playersCount: number;
  maxPlayers: number;
  isPrivate?: boolean;
}

export type BaseGameAction = {
  senderId?: string;
  timestamp?: number;
  actionId?: string;
  nextTurn?: Role;
  nextSpyIndex?: number;
  targetId?: string;
};

export type GameAction = BaseGameAction & (
  | { type: "SHIFT_BOARD"; payload: any }
  | { type: "KILL_CHARACTER"; payload: any }
  | { type: "ROB_NEIGHBOR"; payload: any }
  | { type: "ACCUSE"; payload: any }
  | { type: "CAPTURE_SPY"; payload: any }
  | { type: "INTERROGATE"; payload: any }
  | { type: "ESCAPE_MANIAC" }
  | { type: "FAST_DISGUISE"; payload: any }
  | { type: "DISGUISE" }
  | { type: "EXONERATE"; payload: any }
  | { type: "CLEANUP" }
  | { type: "RESTART_GAME"; payload?: any }
  | { type: "MATCH_STARTED"; payload: { state: any } }
  | { type: "REQUEST_RESTART"; payload: { requestedBy: "HOST" | "GUEST"; rematchMode?: "SWAP" | "SAME" | "RANDOM" } }
  | { type: "CONFIRM_RESTART" }
  | { type: "REJECT_RESTART" }
  | { type: "CLEAR_DISGUISE_NOTIFICATION" }
  | { type: "ASK_QUESTION"; payload: any }
  | { type: "TURN_TIMEOUT" }
  | { type: "TIMEOUT_PASS" }
  | { type: "DUEL_TIMEOUT_PASS" }
  | { type: "RESTART_DUEL"; payload?: any }
  | { type: "RESOLVE_DUEL_TIE_BREAK"; payload?: any }
  | { type: "SET_MATCH_POT"; payload: { pot: number; bet: number } }
  | { type: "PLAYER_READY" }
  | { type: "PLAYER_UNREADY" }
  | { type: "SWEAR_IN_OFFICER"; payload: any }
  | { type: "SET_INSPECTOR_ROLE"; payload: { chosenId: string } }
  | { type: "DUEL_ASK_QUESTION"; payload: { questionId: string }; senderId?: string }
  | { type: "DUEL_ACCUSE"; payload: { targetId: string }; senderId?: string }
  | { type: "PREVIEW_SHIFT"; payload: { type: "ROW" | "COL"; index: number } | null }
  | { type: "START_GAME"; payload?: any }
  | { type: "START_MATCH"; payload?: { mode?: GameModeType; isPassAndPlay?: boolean } }
  | { type: "CHANGE_SETTINGS"; payload?: { mode?: GameModeType; roleDistribution?: "RANDOM" | "HOST_KILLER" | "HOST_DETECTIVE" } }
  | { type: "END_TURN" }
  | { type: "CONFIRM_TURN_READY" }
  | { type: "TV_TOGGLE_PAUSE" }
  | { type: "TV_TOGGLE_MUTE" }
  | { type: "TV_CONFIRM_RESTART"; payload?: { roleAction?: "SWAP" | "SAME" } }
  | { type: "TV_EXIT_TO_LOBBY" }
);
