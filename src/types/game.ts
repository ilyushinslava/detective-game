export type GameModeType = 
  | 'SKHVATKA' 
  | 'MANIAC_VS_OPERATIVE' 
  | 'THIEF_HUNT' 
  | 'SECRET_SERVICE' 
  | 'EUROPOL_VS_OPG' 
  | 'SPANISH_HEIST';

export type Role = 'KILLER' | 'DETECTIVE';
export type OpponentType = 'PVP' | 'AI';

export interface Character {
  id: string;
  name: string;
  isAlive: boolean;
  isExonerated: boolean;
  isRobbed?: boolean;
}

export interface LastShift {
  type: 'ROW' | 'COL';
  index: number;
  direction: 'FORWARD' | 'BACKWARD';
}

export interface InterrogationResult {
  interrogator: Role;
  targetName: string;
  isNear: boolean;
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
  blockedShift?: { type: 'ROW' | 'COL'; index: number } | null;
  winner: Role | null;
  log: string[];
  lastShift: LastShift | null;
  lastInterrogation: InterrogationResult | null;
  inspectorChoices?: string[];
}
