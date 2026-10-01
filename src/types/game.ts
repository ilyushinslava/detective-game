export type GameModeType = 
  | 'SKHVATKA' 
  | 'MANIAC_VS_OPERATIVE' 
  | 'SECRET_SERVICE' 
  | 'THIEF_HUNT' 
  | 'EUROPOL_VS_OPG' 
  | 'SPANISH_HEIST';

export type Role = 'KILLER' | 'DETECTIVE';

export type OpponentType = 'PVP' | 'AI';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Character {
  id: string;
  name: string;
  isAlive: boolean;
  isExonerated: boolean;
  isRobbed?: boolean;
  isShielded?: boolean;
  hasBomb?: boolean;
  isVault?: boolean;       // Хранилище казино
  isVaultCracked?: boolean; // Взломанный сейф
  isVaultLocked?: boolean;  // Заблокированный сигнализацией
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
  killerSecretId: string;    // Лидер банды / Убийца
  detectiveSecretId: string; // Начальник СБ / Сыщик
  detectiveHand: string[];
  evidenceDeck: string[];
  victimList: string[];
  killCount: number;
  trophiesKiller?: number;    // Взломанные сейфы (цель: 3)
  trophiesDetective?: number;
  blockedShift?: { type: 'ROW' | 'COL'; index: number } | null;
  winner: Role | null;
  log: string[];
  lastShift: LastShift | null;
  lastInterrogation: InterrogationResult | null;
  inspectorChoices?: string[];
}
