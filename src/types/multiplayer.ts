import type { Role } from "./game";

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
  | { type: "PRE_SHIFT"; payload: any }
  | { type: "REQUEST_RESTART"; payload: { requestedBy: "HOST" | "GUEST" } }
  | { type: "CONFIRM_RESTART" }
  | { type: "REJECT_RESTART" }
  | { type: "SET_MATCH_POT"; payload: { pot: number; bet: number } }
  | { type: "PLAYER_READY" }
  | { type: "SWEAR_IN_OFFICER"; payload: any }
  | { type: "SET_INSPECTOR_ROLE"; payload: { chosenId: string } }
  | { type: "DUEL_ASK_QUESTION"; payload: { attribute: string; value: any }; senderId?: string }
  | { type: "DUEL_ACCUSE"; payload: { targetId: number }; senderId?: string }
);
