import type { CanonicalTutorialModule, TutorialStepConfig } from "./tutorialTypes";

export const TUTORIAL_STEPS_CONFIG: Record<
  CanonicalTutorialModule,
  TutorialStepConfig[]
> = {
  MANIAC: [
    // Шаг 1: Сдвиг колонки вниз
    {
      step: 1,
      totalSteps: 7,
      title: "СДВИГ УЛИЦЫ",
      instruction:
        "Жертва вне зоны досягаемости. Сдвиньте 3-ю колонку вниз, чтобы подвести Елену Соколову в радиус 3×3.",
      targetPosition: "bottom", // Цель вверху (стрелка col-down-2 в ряду 0-1)
      actionType: "SHIFT",
      targetShift: {
        type: "COL",
        index: 2,
        direction: "FORWARD",
        arrowId: "col-down-2",
      },
      highlightedArrowId: "col-down-2",
      myCharacterId: "c4", // Артём Воронов
      highlightNeighborCenterId: "c4",
      neighborRole: "red",
    },
    // Шаг 2: Выбор цели в зоне 3x3
    {
      step: 2,
      totalSteps: 7,
      title: "ЗОНА ПОРАЖЕНИЯ",
      instruction:
        "Жертва вошла в радиус 3×3. Обратный сдвиг заблокирован правилом Anti-Undo. Нажмите на Елену Соколову.",
      targetPosition: "top", // Цель карточка c3 на [1][2]
      actionType: "SELECT_CARD",
      allowedCardIds: ["c3"],
      targetCardId: "c3",
      myCharacterId: "c4",
      highlightNeighborCenterId: "c4",
      neighborRole: "red",
    },
    // Шаг 3: Ликвидация цели
    {
      step: 3,
      totalSteps: 7,
      title: "ЛИКВИДАЦИЯ",
      instruction:
        "Цель на мушке. Выстрел выдаст ваш сектор сопернику. Нажмите «Ликвидировать цель» для исполнения контракта.",
      targetPosition: "top", // Кнопка действия внизу
      actionType: "ACTION_BUTTON",
      buttonActionKey: "KILL",
      buttonLabel: "Ликвидировать цель",
      buttonVariant: "danger",
      myCharacterId: "c4",
      targetCardId: "c3",
      highlightNeighborCenterId: "c4",
      neighborRole: "red",
    },
    // Шаг 4: Смена маски
    {
      step: 4,
      totalSteps: 7,
      title: "СМЕНА МАСКИ",
      instruction:
        "Сыщик уже прочесывает сектор. Смените тайную личность, чтобы полиция потеряла ваш след в городе.",
      targetPosition: "top",
      actionType: "ACTION_BUTTON",
      buttonActionKey: "DISGUISE",
      buttonLabel: "Сменить маску",
      buttonVariant: "primary",
      myCharacterId: "c4",
    },
    // Шаг 5: Проверка алиби (Роль Сыщика)
    {
      step: 5,
      totalSteps: 7,
      title: "ПРОВЕРКА АЛИБИ",
      instruction:
        "Вы перехватили роль Сыщика. Все свидетели подтвердили алиби щитом. Найдите Софию Романову без алиби.",
      targetPosition: "bottom", // София на [1][1]
      actionType: "SELECT_CARD",
      allowedCardIds: ["c7"],
      targetCardId: "c7",
      myCharacterId: "c1", // Сыщик
      highlightNeighborCenterId: "c3", // Вокруг места преступления
      neighborRole: "blue",
      alibiCardIds: ["c1", "c2", "c6", "c8", "c11", "c12", "c13"],
    },
    // Шаг 6: Задержание подозреваемого
    {
      step: 6,
      totalSteps: 7,
      title: "ЗАДЕРЖАНИЕ",
      instruction:
        "Подозреваемый зажат и путается в показаниях. Нажмите «Задержать подозреваемого», чтобы завершить охоту.",
      targetPosition: "top",
      actionType: "ACTION_BUTTON",
      buttonActionKey: "ARREST",
      buttonLabel: "Задержать подозреваемого",
      buttonVariant: "primary",
      targetCardId: "c7",
      myCharacterId: "c1",
    },
    // Шаг 7: Зачистка поля
    {
      step: 7,
      totalSteps: 7,
      title: "ЗАЧИСТКА ПОЛЯ",
      instruction:
        "Тела выбывших мешают расследованию. Зачистка сдвигает тела вниз поля, сжимая живых горожан наверху.",
      targetPosition: "top",
      actionType: "ACTION_BUTTON",
      buttonActionKey: "CLEANUP",
      buttonLabel: "Зачистить поле",
      buttonVariant: "secondary",
    },
  ],

  THIEF: [
    // Шаг 1: Выбор жертвы кражи
    {
      step: 1,
      totalSteps: 6,
      title: "ТИХИЙ КАРМАННИК",
      instruction:
        "Грабитель охотится в радиусе 3×3. Для триумфа нужно 8 краж. Выберите соседку с ценностями (Анна Мороз).",
      targetPosition: "top",
      actionType: "SELECT_CARD",
      allowedCardIds: ["c5"],
      targetCardId: "c5",
      myCharacterId: "c4",
      highlightNeighborCenterId: "c4",
      neighborRole: "red",
    },
    // Шаг 2: Кража сокровища
    {
      step: 2,
      totalSteps: 6,
      title: "КРАЖА СОКРОВИЩА",
      instruction:
        "Замок взломан без лишнего шума. Нажмите «Украсть сокровище», чтобы забрать трофей в свой банк.",
      targetPosition: "top",
      actionType: "ACTION_BUTTON",
      buttonActionKey: "ROB",
      buttonLabel: "Украсть сокровище",
      buttonVariant: "danger",
      myCharacterId: "c4",
      targetCardId: "c5",
      highlightNeighborCenterId: "c4",
      neighborRole: "red",
    },
    // Шаг 3: Экстренная маскировка
    {
      step: 3,
      totalSteps: 6,
      title: "СБРОС ХВОСТА",
      instruction:
        "Сигнализация сработала! Смените маску на ходу, чтобы патрули шерифа потеряли ваши приметы.",
      targetPosition: "top",
      actionType: "ACTION_BUTTON",
      buttonActionKey: "DISGUISE",
      buttonLabel: "Сменить маску",
      buttonVariant: "primary",
      myCharacterId: "c4",
    },
    // Шаг 4: Выбор перекрёстка для патруля (Роль Полиции)
    {
      step: 4,
      totalSteps: 6,
      title: "ПОЛИЦЕЙСКИЙ КОРДОН",
      instruction:
        "Вы играете за Полицию. Патрульный жетон блокирует сектор 3×3. Выберите Софию Романову на перекрёстке.",
      targetPosition: "bottom",
      actionType: "SELECT_CARD",
      allowedCardIds: ["c7"],
      targetCardId: "c7",
      myCharacterId: "c1",
    },
    // Шаг 5: Выставление патруля
    {
      step: 5,
      totalSteps: 6,
      title: "ВЫСТАВЛЕНИЕ ПОСТА",
      instruction:
        "Офицеры перекрывают пути отхода. Нажмите «Выставить патруль», чтобы активировать защитный жетон.",
      targetPosition: "top",
      actionType: "ACTION_BUTTON",
      buttonActionKey: "PATROL",
      buttonLabel: "Выставить патруль",
      buttonVariant: "primary",
      myCharacterId: "c1",
      targetCardId: "c7",
    },
    // Шаг 6: Арест грабителя
    {
      step: 6,
      totalSteps: 6,
      title: "АРЕСТ С ПОЛИЧНЫМ",
      instruction:
        "Вор зажат в патрульном оцеплении и не может сделать маневр. Нажмите «Задержать вора».",
      targetPosition: "top",
      actionType: "ACTION_BUTTON",
      buttonActionKey: "ARREST",
      buttonLabel: "Задержать вора",
      buttonVariant: "danger",
      myCharacterId: "c1",
    },
  ],

  SECRET_SERVICE: [
    // Шаг 1: Наведение радара
    {
      step: 1,
      totalSteps: 4,
      title: "НАВЕДЕНИЕ РАДАРА",
      instruction:
        "В контрразведке все агенты скрыты. Выберите связного (София Романова), чтобы направить луч сканера 3×3.",
      targetPosition: "bottom",
      actionType: "SELECT_CARD",
      allowedCardIds: ["c7"],
      targetCardId: "c7",
      myCharacterId: "c1",
    },
    // Шаг 2: Сканирование радаром
    {
      step: 2,
      totalSteps: 4,
      title: "ОПРОС СВИДЕТЕЛЕЙ",
      instruction:
        "Запустите импульс опроса. Радар покажет, скрывается ли вражеский агент среди 8 соседних клеток.",
      targetPosition: "top",
      actionType: "ACTION_BUTTON",
      buttonActionKey: "INTERROGATE",
      buttonLabel: "Опрос свидетелей",
      buttonVariant: "primary",
      myCharacterId: "c1",
      targetCardId: "c7",
      radarTargetId: "c7",
    },
    // Шаг 3: Локализация шпиона
    {
      step: 3,
      totalSteps: 4,
      title: "ЛОКАЛИЗАЦИЯ ШПИОНА",
      instruction:
        "Пеленгатор подтвердил чужой радиосигнал. Под подозрение попал Марк Воронов. Нажмите на его карточку.",
      targetPosition: "bottom",
      actionType: "SELECT_CARD",
      allowedCardIds: ["c2"],
      targetCardId: "c2",
      myCharacterId: "c1",
      radarTargetId: "c7",
    },
    // Шаг 4: Разоблачение резидента
    {
      step: 4,
      totalSteps: 4,
      title: "РАЗОБЛАЧЕНИЕ",
      instruction:
        "Прикрытие синдиката сорвано. Нажмите «Разоблачение шпиона», чтобы перехватить компромат и победить.",
      targetPosition: "top",
      actionType: "ACTION_BUTTON",
      buttonActionKey: "EXPOSE_SPY",
      buttonLabel: "Разоблачение шпиона",
      buttonVariant: "danger",
      myCharacterId: "c1",
      targetCardId: "c2",
    },
  ],
};
