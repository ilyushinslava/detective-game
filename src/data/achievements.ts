// src/data/achievements.ts
// Реестр достижений детективной стратегии «Под подозрением» (Neo-Noir)

export type AchievementCategory =
  | "MANIAC"
  | "THIEF_HUNT"
  | "SECRET_SERVICE"
  | "STREAK"
  | "MASTERY"
  | "SPECIAL";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  iconName: string;
  rewardCoins: number;
  maxProgress: number;
  secret?: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // --- Режим «Маньяк против оперативника» ---
  {
    id: "maniac_first_blood",
    title: "Первая кровь",
    description: "Одержите 1 победу за Маньяка в дуэли подозреваемых",
    category: "MANIAC",
    iconName: "Skull",
    rewardCoins: 150,
    maxProgress: 1,
  },
  {
    id: "maniac_cold_calculation",
    title: "Холодный расчёт",
    description: "Одержите 5 побед за Маньяка, заметая следы преступления",
    category: "MANIAC",
    iconName: "Target",
    rewardCoins: 400,
    maxProgress: 5,
  },
  {
    id: "operative_case_closed",
    title: "Дело закрыто",
    description: "Вычислите Маньяка и одержите 1 победу за Оперативника",
    category: "MANIAC",
    iconName: "Shield",
    rewardCoins: 150,
    maxProgress: 1,
  },
  {
    id: "operative_chief_inspector",
    title: "Главный следователь",
    description: "Раскройте серию из 5 дел оперативником",
    category: "MANIAC",
    iconName: "Search",
    rewardCoins: 400,
    maxProgress: 5,
  },

  // --- Режим «Охота на вора» ---
  {
    id: "thief_night_heist",
    title: "Ночной налёт",
    description: "Похитите сокровища и ускользните от патрулей (1 победа)",
    category: "THIEF_HUNT",
    iconName: "Briefcase",
    rewardCoins: 150,
    maxProgress: 1,
  },
  {
    id: "thief_shadow_phantom",
    title: "Тень в переулке",
    description: "Одержите 5 побед за Грабителя, виртуозно меняя маскировки",
    category: "THIEF_HUNT",
    iconName: "Mask",
    rewardCoins: 400,
    maxProgress: 5,
  },
  {
    id: "police_iron_grip",
    title: "Железная рука",
    description: "Выставьте патрули и арестуйте вора (1 победа за Полицию)",
    category: "THIEF_HUNT",
    iconName: "Badge",
    rewardCoins: 150,
    maxProgress: 1,
  },
  {
    id: "police_curfew",
    title: "Комендантский час",
    description: "Одержите 5 побед за Полицию, заблокировав улицы города",
    category: "THIEF_HUNT",
    iconName: "Lock",
    rewardCoins: 400,
    maxProgress: 5,
  },

  // --- Режим «Спецслужбы» ---
  {
    id: "spy_undercover",
    title: "Агент прикрытия",
    description: "Соберите компромат и разоблачите связного (1 победа)",
    category: "SECRET_SERVICE",
    iconName: "Eye",
    rewardCoins: 150,
    maxProgress: 1,
  },
  {
    id: "spy_double_agent",
    title: "Двойной агент",
    description: "Одержите 5 побед в дуэли разведок",
    category: "SECRET_SERVICE",
    iconName: "Fingerprint",
    rewardCoins: 450,
    maxProgress: 5,
  },
  {
    id: "spy_kompromat_master",
    title: "Магистр компромата",
    description: "Соберите 3 компромата и победите без единого разоблачения",
    category: "SECRET_SERVICE",
    iconName: "Award",
    rewardCoins: 500,
    maxProgress: 1,
  },

  // --- Серии побед и мастерство ---
  {
    id: "streak_triple",
    title: "На волне фарта",
    description: "Одержите 3 победы подряд в любых сценариях",
    category: "STREAK",
    iconName: "Flame",
    rewardCoins: 300,
    maxProgress: 3,
  },
  {
    id: "streak_untouchable",
    title: "Неприкасаемый",
    description: "Одержите 5 побед подряд без единого поражения",
    category: "STREAK",
    iconName: "Crown",
    rewardCoins: 750,
    maxProgress: 5,
  },
  {
    id: "mastery_blitz",
    title: "Молниеносный удар",
    description: "Завершите победную партию быстрее чем за 60 секунд",
    category: "MASTERY",
    iconName: "Zap",
    rewardCoins: 500,
    maxProgress: 1,
  },
  {
    id: "mastery_flawless",
    title: "Чистая работа",
    description: "Безупречная победа без потери улик и ложных обвинений",
    category: "MASTERY",
    iconName: "CheckCircle",
    rewardCoins: 350,
    maxProgress: 1,
  },
  {
    id: "mastery_veteran",
    title: "Ветеран Синдиката",
    description: "Проведите 25 расследований на доске 5x5",
    category: "MASTERY",
    iconName: "Star",
    rewardCoins: 600,
    maxProgress: 25,
  },

  // --- Специальные и сетевые операции ---
  {
    id: "special_radio_silence",
    title: "В эфире",
    description: "Одержите 3 победы в Онлайн-мультиплеере против реальных соперников",
    category: "SPECIAL",
    iconName: "Radio",
    rewardCoins: 500,
    maxProgress: 3,
  },
  {
    id: "special_tv_syndicate",
    title: "Диванный синдикат",
    description: "Сыграйте хотя бы 1 партию на большом экране в режиме TV Party",
    category: "SPECIAL",
    iconName: "Tv",
    rewardCoins: 300,
    maxProgress: 1,
  },
];

export const ACHIEVEMENTS_MAP = new Map<string, Achievement>(
  ACHIEVEMENTS.map((a) => [a.id, a])
);
