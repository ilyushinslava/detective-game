export type GameAction =
  | { type: "SHIFT_BOARD"; payload: any; senderId?: string; timestamp?: number }
  | {
      type: "KILL_CHARACTER";
      payload: any;
      senderId?: string;
      timestamp?: number;
    }
  | {
      type: "ROB_NEIGHBOR";
      payload: any;
      senderId?: string;
      timestamp?: number;
    }
  | { type: "ACCUSE"; payload: any; senderId?: string; timestamp?: number }
  | { type: "CAPTURE_SPY"; payload: any; senderId?: string; timestamp?: number }
  | { type: "INTERROGATE"; payload: any; senderId?: string; timestamp?: number }
  | { type: "ESCAPE_MANIAC"; senderId?: string; timestamp?: number }
  | {
      type: "FAST_DISGUISE";
      payload: any;
      senderId?: string;
      timestamp?: number;
    }
  | { type: "DISGUISE"; senderId?: string; timestamp?: number }
  | { type: "EXONERATE"; payload: any; senderId?: string; timestamp?: number }
  | { type: "CLEANUP"; senderId?: string; timestamp?: number }
  | {
      type: "RESTART_GAME";
      payload: any;
      senderId?: string;
      timestamp?: number;
    }
  | {
      type: "MATCH_STARTED";
      payload: any;
      senderId?: string;
      timestamp?: number;
    }
  | { type: "PRE_SHIFT"; payload: any; senderId?: string; timestamp?: number }
  | {
      type: "REQUEST_RESTART";
      payload: { requestedBy: "HOST" | "GUEST" };
      senderId?: string;
      timestamp?: number;
    }
  | { type: "CONFIRM_RESTART"; senderId?: string; timestamp?: number }
  | { type: "REJECT_RESTART"; senderId?: string; timestamp?: number }
  | {
      type: "SET_MATCH_POT";
      payload: { pot: number; bet: number };
      senderId?: string;
      timestamp?: number;
    };
