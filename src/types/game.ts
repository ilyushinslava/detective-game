// src/types/game.ts
import type { DuelHistoryEntry } from "./duel";

export type GameModeType =
  | "SKHVATKA"
  | "MANIAC_VS_OPERATIVE"
  | "THIEF_HUNT"
  | "SECRET_SERVICE"
  | "LINE_UP";

export type Role = "KILLER" | "DETECTIVE";
export type OpponentType = "PVP" | "AI" | "ONLINE";

export interface Character {
  id: string;
  name: string;
  isAlive: boolean;
  isExonerated: boolean;
  isRobbed?: boolean;
  unmaskedSpyIndex?: number;
}

export interface LastShift {
  type: "ROW" | "COL";
  index: number;
  direction: "FORWARD" | "BACKWARD";
}

export interface InterrogationResult {
  interrogator: Role;
  targetName: string;
  isNear: boolean;
}

export interface SpyPlayer {
  id: string;
  name: string;
  secretId: string;
  trophies: number;
  isAI: boolean;
}

export interface GameState {
  mode: GameModeType;
  opponent: OpponentType;
  playerRole: Role;
  boardSize: number;
  board: Character[][];
  currentTurn: Role;
  killerSecretId: string;
  detectiveSecretId: string;
  detectiveHand: string[];
  evidenceDeck: string[];
  victimList: string[];
  killCount: number;
  trophiesKiller?: number;
  trophiesDetective?: number;
  blockedShift?: { type: "ROW" | "COL"; index: number } | null;
  winner: Role | null;
  log: string[];
  lastShift: LastShift | null;
  lastInterrogation: InterrogationResult | null;
  inspectorChoices?: string[];
  uniformedOfficers?: string[];
  killerHand?: string[];
  spies?: SpyPlayer[];
  activeSpyIndex?: number;
  spyTargetTrophies?: number;
  maxTurns?: number;
  lastSpyInterrogation?: {
    interrogatorName: string;
    targetName: string;
    raisedHandsPlayerNames: string[];
  } | null;
  justCaughtSpyId?: string;
  interrogationRadar?: { targetId: string; interrogatorIndex: number } | null;
  isHotseatCoverOpen?: boolean;
  matchBet?: number;
  matchPot?: number;
  restartRequestedBy?: "HOST" | "GUEST" | null;
  pendingRematchMode?: "SWAP" | "SAME" | "RANDOM";
  disguisedNotification?: { roleName: string; newSecretId: string } | null;
  duelHistory?: DuelHistoryEntry[];
  duelPenalties?: Record<Role, number>;
  accusedTargets?: Record<Role, string[]>;
}
export const SPY_COLORS = [
  { text: "text-red-400", bg: "bg-red-950", border: "border-red-500", ring: "ring-red-500/80" },
  { text: "text-blue-400", bg: "bg-blue-950", border: "border-blue-500", ring: "ring-blue-500/80" },
  { text: "text-rose-400", bg: "bg-rose-950", border: "border-rose-700", ring: "ring-rose-700/80" },
  { text: "text-emerald-400", bg: "bg-emerald-950", border: "border-emerald-600", ring: "ring-emerald-600/80" },
  { text: "text-zinc-300", bg: "bg-zinc-800", border: "border-zinc-500", ring: "ring-zinc-400/80" },
  { text: "text-indigo-400", bg: "bg-indigo-950", border: "border-indigo-600", ring: "ring-indigo-600/80" },
];
