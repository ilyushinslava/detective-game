import type { GameModeType } from '../types/game';

export interface GameModeMeta {
  id: GameModeType;
  title: { ru: string; en: string };
  shortTitle: { ru: string; en: string };
  description?: { ru: string; en: string };
  tags?: { ru: string[]; en: string[] };
  players?: { ru: string; en: string };
  time?: { ru: string; en: string };
  difficulty?: { ru: string; en: string };
  killerRoleName?: { ru: string; en: string };
  detectiveRoleName?: { ru: string; en: string };
  banner?: {
    gradient: string;
    borderColor: string;
    accentColor: string;
    atmosphereTitle: string;
    atmosphereSubtitle: string;
    badge: string;
  };
}

export const GAME_TITLE = {
  ru: 'Под подозрением',
  en: 'Prime Suspect',
} as const;

export const GAME_SUBTITLE = {
  ru: 'Последний выстрел',
  en: 'The Last Shot',
} as const;

export const GAME_MODES_META: Record<GameModeType, GameModeMeta> = {
  MANIAC_VS_OPERATIVE: {
    id: 'MANIAC_VS_OPERATIVE',
    title: {
      ru: 'Почерк убийцы',
      en: "Killer's Signature",
    },
    shortTitle: {
      ru: 'Почерк убийцы',
      en: 'Signature',
    },
    description: {
      ru: 'Смертельная дуэль сыщика и маньяка. Вычислите логово по радиусу преступлений.',
      en: 'A deadly duel between detective and killer. Deduce the lair by crime radius.',
    },
    tags: {
      ru: ['2 ИГРОКА', 'АСИММЕТРИЯ', 'МАНЬЯК VS СЫЩИК'],
      en: ['2 PLAYERS', 'ASYMMETRIC', 'KILLER VS DETECTIVE'],
    },
    players: { ru: '2 игрока', en: '2 players' },
    time: { ru: '20 мин', en: '20 min' },
    difficulty: { ru: 'Средняя', en: 'Medium' },
    killerRoleName: { ru: 'Маньяк', en: 'Killer' },
    detectiveRoleName: { ru: 'Оперативник', en: 'Operative' },
    banner: {
      gradient: 'from-rose-950/60 via-zinc-950 to-zinc-950',
      borderColor: 'border-rose-900/40',
      accentColor: '#E11D48',
      atmosphereTitle: 'ТУМАННЫЙ ДОЖДЬ И ВСПЫШКА ВЫСТРЕЛА',
      atmosphereSubtitle: 'Капли стекают по стеклу телефонной будки. В отражении — силуэт в плаще.',
      badge: 'КРАСНЫЙ СЕКТОР',
    },
  },
  THIEF_HUNT: {
    id: 'THIEF_HUNT',
    title: {
      ru: 'Оцепление',
      en: 'Cordon',
    },
    shortTitle: {
      ru: 'Оцепление',
      en: 'Cordon',
    },
    description: {
      ru: 'Ловите дерзкого вора в кварталах города, пока полиция стягивает патрули.',
      en: 'Catch an elusive thief in city blocks while police tighten patrols.',
    },
    tags: {
      ru: ['2 ИГРОКА', 'ПЕРЕХВАТ', 'СМЕНА МАСОК'],
      en: ['2 PLAYERS', 'INTERCEPTION', 'DISGUISE SHIFT'],
    },
    players: { ru: '2 игрока', en: '2 players' },
    time: { ru: '25 мин', en: '25 min' },
    difficulty: { ru: 'Высокая', en: 'Hard' },
    killerRoleName: { ru: 'Грабитель', en: 'Thief' },
    detectiveRoleName: { ru: 'Полиция', en: 'Police' },
    banner: {
      gradient: 'from-blue-950/60 via-zinc-950 to-zinc-950',
      borderColor: 'border-blue-900/40',
      accentColor: '#2563EB',
      atmosphereTitle: 'НЕОНОВЫЕ ОГНИ И БЛИКИ НА МОКРОМ АСФАЛЬТЕ',
      atmosphereSubtitle: 'Мигалки патрулей разрезают ночной квартал. Грабитель меняет маски в толпе.',
      badge: 'СИНИЙ ПЕРЕХВАТ',
    },
  },
  SECRET_SERVICE: {
    id: 'SECRET_SERVICE',
    title: {
      ru: 'Директива ноль',
      en: 'Directive Zero',
    },
    shortTitle: {
      ru: 'Директива ноль',
      en: 'Directive Zero',
    },
    description: {
      ru: 'Битва спецслужб на улицах мегаполиса. Опрашивайте свидетелей и вскрывайте резидентов.',
      en: 'Intelligence battle on city streets. Interrogate witnesses and expose handlers.',
    },
    tags: {
      ru: ['2–4 ИГРОКА', 'КОНТРРАЗВЕДКА', 'БЛЕФ'],
      en: ['2–4 PLAYERS', 'COUNTER-INTEL', 'BLUFF'],
    },
    players: { ru: '2-4 игрока', en: '2-4 players' },
    time: { ru: '30 мин', en: '30 min' },
    difficulty: { ru: 'Средняя', en: 'Medium' },
    killerRoleName: { ru: 'Агент 1', en: 'Agent 1' },
    detectiveRoleName: { ru: 'Агент 2', en: 'Agent 2' },
    banner: {
      gradient: 'from-emerald-950/50 via-zinc-950 to-zinc-950',
      borderColor: 'border-emerald-900/40',
      accentColor: '#10B981',
      atmosphereTitle: 'ТИХИЙ ОФИС И МОНИТОРЫ ШИФРОВАНИЯ',
      atmosphereSubtitle: 'Зеленый монохромный терминал и папка «СОВЕРШЕННО СЕКРЕТНО». Война спецслужб.',
      badge: 'ГРИФ СЕКРЕТНО',
    },
  },
  LINE_UP: {
    id: 'LINE_UP',
    title: {
      ru: 'Очная ставка',
      en: 'Line-Up',
    },
    shortTitle: {
      ru: 'Очная ставка',
      en: 'Line-Up',
    },
    description: {
      ru: 'Классическая детективная дуэль. Задавайте вопросы по каталогу и найдите соперника.',
      en: 'Classic deduction duel. Inquire through catalog clues and unmask the rival.',
    },
    tags: {
      ru: ['2 ИГРОКА', 'ДЕДУКЦИЯ', 'БЕЗ СЛУЧАЙНОСТЕЙ'],
      en: ['2 PLAYERS', 'DEDUCTION', 'NO RNG'],
    },
    players: { ru: '2 игрока', en: '2 players' },
    time: { ru: '8 мин', en: '8 min' },
    difficulty: { ru: 'Средняя', en: 'Medium' },
    killerRoleName: { ru: 'Подозреваемый', en: 'Suspect' },
    detectiveRoleName: { ru: 'Следователь', en: 'Inspector' },
    banner: {
      gradient: 'from-amber-950/40 via-zinc-950 to-zinc-950',
      borderColor: 'border-amber-900/40',
      accentColor: '#F59E0B',
      atmosphereTitle: 'ДОПРОСНАЯ КОМНАТА И ЛАМПА ПОД АБАЖУРОМ',
      atmosphereSubtitle: 'Зеркало Гезелла, сигаретный дым и досье 25 подозреваемых на столе.',
      badge: 'ОЧНАЯ СТАВКА',
    },
  },
};

export function getGameModeTitle(mode: GameModeType | string, lang: 'ru' | 'en' = 'ru'): string {
  const meta = GAME_MODES_META[mode as GameModeType];
  if (meta) {
    return meta.title[lang] || meta.title.ru;
  }
  return mode;
}

export function getGameModeShortTitle(mode: GameModeType | string, lang: 'ru' | 'en' = 'ru'): string {
  const meta = GAME_MODES_META[mode as GameModeType];
  if (meta) {
    return meta.shortTitle[lang] || meta.shortTitle.ru;
  }
  return mode;
}

export function getGameModeDescription(mode: GameModeType | string, lang: 'ru' | 'en' = 'ru'): string {
  const meta = GAME_MODES_META[mode as GameModeType];
  if (meta?.description) {
    return meta.description[lang] || meta.description.ru;
  }
  return '';
}
