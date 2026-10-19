import type { GameModeType } from "../types/game";

export interface GameModeInfo {
  id: GameModeType;
  title: string;
  players: string;
  time: string;
  difficulty: "Легкая" | "Средняя" | "Высокая";
  description: string;
  isAvailable: boolean;
  killerRoleName: string;
  detectiveRoleName: string;
}

export const GAME_MODES: GameModeInfo[] = [
  {
    id: "SKHVATKA",
    title: "Схватка",
    players: "2 игрока",
    time: "15 минут",
    difficulty: "Легкая",
    description: "Опасная городская дуэль на опережение: вычислите скрывающегося бандита до того, как инспектор окажется в его прицеле.",
    isAvailable: true,
    killerRoleName: "Бандит",
    detectiveRoleName: "Инспектор",
  },
  {
    id: "MANIAC_VS_OPERATIVE",
    title: "Маньяк против оперативника",
    players: "2 игрока",
    time: "20 минут",
    difficulty: "Средняя",
    description: "Серийный маньяк ведет охоту по скрытому заказу из 4 целей. Задача оперативника — перехватить след и остановить расправу.",
    isAvailable: true,
    killerRoleName: "Маньяк",
    detectiveRoleName: "Оперативник",
  },
  {
    id: "THIEF_HUNT",
    title: "Охота на грабителя",
    players: "2 игрока",
    time: "60 минут",
    difficulty: "Высокая",
    description: "Дерзкий домушник методично обчищает карманы горожан и меняет маски, а полиция стягивает оцепление по кварталам.",
    isAvailable: true,
    killerRoleName: "Грабитель",
    detectiveRoleName: "Полиция",
  },
  {
    id: "SECRET_SERVICE",
    title: "Секретная служба",
    players: "3–9 игроков",
    time: "30 минут",
    difficulty: "Средняя",
    description: "Закрытая операция разведок: опрашивайте связных, вычисляйте резидентов конкурентов и собирайте компромат.",
    isAvailable: true,
    killerRoleName: "Агент «Восток»",
    detectiveRoleName: "Агент «Запад»",
  },
  {
    id: "LINE_UP",
    title: "Очная ставка",
    players: "2 игрока",
    time: "10 минут",
    difficulty: "Легкая",
    description: "Интеллектуальная дуэль на дедукцию: опрашивайте свидетелей по внешним признакам (пол, шляпа, очки, борода) и раскройте тайную личность соперника.",
    isAvailable: true,
    killerRoleName: "Подозреваемый",
    detectiveRoleName: "Следователь",
  },
];

export const ModeSelectModal = () => {
  return null;
};