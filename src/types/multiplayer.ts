export type GameAction =
  | { type: "SHIFT_BOARD"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "KILL_CHARACTER"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "ROB_NEIGHBOR"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "ACCUSE"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "CAPTURE_SPY"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "INTERROGATE"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "ESCAPE_MANIAC"; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "FAST_DISGUISE"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "DISGUISE"; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "EXONERATE"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "CLEANUP"; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "RESTART_GAME"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "MATCH_STARTED"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "PRE_SHIFT"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "REQUEST_RESTART"; payload: { requestedBy: "HOST" | "GUEST" }; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "CONFIRM_RESTART"; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "REJECT_RESTART"; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "SET_MATCH_POT"; payload: { pot: number; bet: number }; senderId?: string; timestamp?: number; nextTurn?: Role; nextSpyIndex?: number; targetId?: string; actionId?: string }
  | { type: "PLAYER_READY"; senderId?: string; timestamp?: number; actionId?: string };
