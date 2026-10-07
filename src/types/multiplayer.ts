import type { Role, GameModeType, OpponentType } from "./game";

export type RoomStatus = "LOBBY" | "PLAYING" | "FINISHED";

export interface NetworkPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  role?: Role;
  spyIndex?: number;
}

export interface GameRoom {
  id: string;
  status: RoomStatus;
  hostId: string;
  players: NetworkPlayer[];
  maxPlayers: number;
}

export type GameAction =
  | {
      type: "SHIFT_BOARD";
      payload: {
        shiftType: "ROW" | "COL";
        index: number;
        direction: "FORWARD" | "BACKWARD";
      };
      senderId: string;
      timestamp: number;
    }
  | {
      type: "ACCUSE";
      payload: { targetId: string };
      senderId: string;
      timestamp: number;
    }
  | {
      type: "CAPTURE_SPY";
      payload: { targetId: string };
      senderId: string;
      timestamp: number;
    }
  | {
      type: "INTERROGATE";
      payload: { targetId: string };
      senderId: string;
      timestamp: number;
    }
  | {
      type: "RESTART_GAME";
      payload: {
        modeId: GameModeType;
        opponent: OpponentType;
        playerRole: Role;
        playerCount: number;
        targetTrophies: number;
        maxTurns: number;
      };
      senderId: string;
      timestamp: number;
    };
