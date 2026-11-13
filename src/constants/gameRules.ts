/**
 * src/constants/gameRules.ts
 * Единый источник истины (SSoT) для правил игры, числовых констант и лимитов.
 */

// Ставки и экономика
export const DEFAULT_BET = 250;
export const MIN_BET = 50;
export const MAX_BET = 5000;

// Тайминги ходов и задержек (в секундах)
export const TURN_TIMEOUT_BASE_SECONDS = 60;
export const TURN_TIMEOUT_DUEL_SECONDS = 30;
export const TURN_GRACE_PERIOD_SECONDS = 60;
export const REMATCH_TIMEOUT_SECONDS = 30;

// Параметры поля и контроллера
export const BOARD_GRID_SIZE = 5;
export const CONTROLLER_VIEWPORT_SIZE = 3;
export const TOTAL_BOARD_CELLS = BOARD_GRID_SIZE * BOARD_GRID_SIZE; // 25

// Цели победы для игровых режимов
export const WIN_CONDITIONS = {
  MANIAC_VS_OPERATIVE: {
    VICTIMS_REQUIRED: 4,
  },
  THIEF_HUNT: {
    TROPHIES_REQUIRED: 8,
  },
  SECRET_SERVICE: {
    DEFAULT_TROPHIES_REQUIRED: 4,
  },
  LINE_UP: {
    ACCUSATIONS_TO_WIN: 1,
    INSPECTOR_CHOICES_COUNT: 4,
  },
} as const;

// Лимиты комнат
export const DEFAULT_MAX_PLAYERS = 2;
export const TV_PARTY_MAX_PLAYERS = 8;
