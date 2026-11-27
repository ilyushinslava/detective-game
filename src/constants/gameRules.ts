/**
 * src/constants/gameRules.ts
 * Единый источник истины (SSoT) для правил игры, числовых констант и лимитов.
 */

// Ставки и экономика
export const DEFAULT_BET = 250;

// Тайминги ходов и задержек (в секундах)
export const TURN_GRACE_PERIOD_SECONDS = 60;

// Лимит длительности одного хода — единый источник истины (SSoT) для
// серверного таймера, клиентского конфига и тестов.
// 30с соответствует фактическому серверному поведению таймера хода.
export const TURN_TIME_LIMIT_SECONDS = 30;
export const TURN_TIME_LIMIT_MS = TURN_TIME_LIMIT_SECONDS * 1000;

// Лимиты длительности матча (античит-кламп в record_match_result / matchRewards).
export const MATCH_MIN_DURATION_SECONDS = 11;
export const MATCH_DEFAULT_DURATION_SECONDS = 120;
export const MATCH_MAX_DURATION_SECONDS = 3600;
export const MATCH_SECRET_SERVICE_MAX_DURATION_SECONDS = 7200;
export const MATCH_LINE_UP_MAX_DURATION_SECONDS = 1800;

// Параметры поля
export const BOARD_GRID_SIZE = 5;

// Системные тайминги UI и сети (в миллисекундах)
export const TIMINGS = {
  GAME_OVER_DELAY_MS: 1300,
  MORSE_DASH_THRESHOLD_MS: 250,
  OLED_IDLE_TIMEOUT_MS: 300000,
  LOBBY_POLL_INTERVAL_MS: 3000,
} as const;

// Аудио-параметры
export const AUDIO_CONFIG = {
  MORSE_TONE_FREQ_HZ: 700,
} as const;

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
    MAX_ACCUSATIONS: 3,
  },
} as const;

export const GAME_RULES = WIN_CONDITIONS;
