// src/types/game.ts
import type { DuelHistoryEntry } from "./duel";

export type GameModeType =
  | "SKHVATKA"
  | "MANIAC_VS_OPERATIVE"
  | "THIEF_HUNT"
  | "SECRET_SERVICE"
  | "EUROPOL_VS_OPG"
  | "SPANISH_HEIST"
  | "LINE_UP";

export type Role = "KILLER" | "DETECTIVE";
export type OpponentType = "PVP" | "AI" | "ONLINE";

export interface Character {
  id: string;
  name: string;
  isAlive: boolean;
  isExonerated: boolean;
  isRobbed?: boolean;
  isShielded?: boolean;
  hasBomb?: boolean;
  isVault?: boolean;
  isVaultCracked?: boolean;
  isVaultLocked?: boolean;
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
  disguisedNotification?: { roleName: string; newSecretId: string } | null;
  duelHistory?: DuelHistoryEntry[];
  duelPenalties?: Record<Role, number>;
  accusedTargets?: Record<Role, string[]>;
}
export const SPY_COLORS = [
  {
    text: "text-red-400",
    bg: "bg-red-950",
    border: "border-red-500",
    ring: "ring-red-500/80",
  },
  {
    text: "text-cyan-400",
    bg: "bg-cyan-950",
    border: "border-cyan-500",
    ring: "ring-cyan-500/80",
  },
  {
    text: "text-sky-400",
    bg: "bg-sky-950",
    border: "border-sky-500",
    ring: "ring-sky-500/80",
  },
  {
    text: "text-purple-400",
    bg: "bg-purple-950",
    border: "border-purple-500",
    ring: "ring-purple-500/80",
  },
  {
    text: "text-rose-400",
    bg: "bg-rose-950",
    border: "border-rose-500",
    ring: "ring-rose-500/80",
  },
  {
    text: "text-lime-400",
    bg: "bg-lime-950",
    border: "border-lime-500",
    ring: "ring-lime-500/80",
  },
  {
    text: "text-cyan-400",
    bg: "bg-cyan-950",
    border: "border-cyan-500",
    ring: "ring-cyan-500/80",
  },
  {
    text: "text-orange-400",
    bg: "bg-orange-950",
    border: "border-orange-500",
    ring: "ring-orange-500/80",
  },
  {
    text: "text-fuchsia-400",
    bg: "bg-fuchsia-950",
    border: "border-fuchsia-500",
    ring: "ring-fuchsia-500/80",
  },
];
