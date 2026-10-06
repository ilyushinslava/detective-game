// src/types/game.ts
export type GameModeType =
  | "SKHVATKA"
  | "MANIAC_VS_OPERATIVE"
  | "THIEF_HUNT"
  | "SECRET_SERVICE"
  | "EUROPOL_VS_OPG"
  | "SPANISH_HEIST";

export type Role = "KILLER" | "DETECTIVE";
export type OpponentType = "PVP" | "AI";

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
  lastSpyInterrogation?: {
    interrogatorName: string;
    targetName: string;
    raisedHandsPlayerNames: string[];
  } | null;
}
