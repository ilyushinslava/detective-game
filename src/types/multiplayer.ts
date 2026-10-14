export type GameAction =
  | { type: "SHIFT_BOARD"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "KILL_CHARACTER"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "ROB_NEIGHBOR"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "ACCUSE"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "CAPTURE_SPY"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "INTERROGATE"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "ESCAPE_MANIAC"; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "FAST_DISGUISE"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "DISGUISE"; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "EXONERATE"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "CLEANUP"; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "RESTART_GAME"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "MATCH_STARTED"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "PRE_SHIFT"; payload: any; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "REQUEST_RESTART"; payload: { requestedBy: "HOST" | "GUEST" }; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "CONFIRM_RESTART"; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "REJECT_RESTART"; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string }
  | { type: "SET_MATCH_POT"; payload: { pot: number; bet: number }; senderId?: string; timestamp?: number; nextTurn?: Role; targetId?: string };
