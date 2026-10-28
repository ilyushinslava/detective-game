export const GAME_CONFIG = {
  APP_NAME: "Реквием",
  APP_SUBTITLE: "Последний выстрел",
  APP_FULL_TITLE: "Реквием: Последний выстрел",
  VERSION: "0.9.0",
  TIMERS: {
    TURN_TIME_LIMIT_SEC: 60,
    DUEL_MATCH_LIMIT_SEC: 480,
  },
  STORAGE_KEYS: {
    PROFILE: "crime_city_profile",
    TUTORIAL_COMPLETED: "crime_city_tutorial",
    SOUND_ENABLED: "crime_city_sound",
    HAPTICS_ENABLED: "crime_city_haptics",
  },
  NETWORK: {
    DEFAULT_DEV_PORT: 1999,
    FALLBACK_GATEWAYS: [
      "detective-game-haxi.onrender.com",
    ],
    RECONNECT: {
      MAX_ATTEMPTS: 3,
      INITIAL_DELAY_MS: 1000,
      MAX_DELAY_MS: 4000,
      HEARTBEAT_INTERVAL_MS: 15000,
    },
  },
} as const;
