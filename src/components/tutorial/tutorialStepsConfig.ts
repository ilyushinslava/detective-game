import type { CanonicalTutorialModule, TutorialStepConfig } from "./tutorialTypes";

export const TUTORIAL_STEPS_CONFIG: Record<
  CanonicalTutorialModule,
  TutorialStepConfig[]
> = {
  MANIAC: [
    // Шаг 1: Сдвиг колонки 2 вниз
    {
      step: 1,
      totalSteps: 5,
      title: "Сдвиг улицы",
      instruction:
        "Акт I — ты Маньяк. Цель Елена Соколова вне радиуса 3×3. Сдвинь 3-ю колонку вниз, чтобы подтянуть её ближе.",
      actionType: "SHIFT",
      targetShift: {
        type: "COL",
        index: 2,
        direction: "FORWARD",
        arrowId: "col-down-2",
      },
      highlightedArrowId: "col-down-2",
      myCharacterId: "c4", // Артур Блэк на [2][1]
      highlightNeighborCenterId: "c4",
      neighborRole: "red",
      hintMessage: "Нажмите на подсвеченную стрелку",
    },
    // Шаг 2: Ликвидация цели (выбор Елены c3 + кнопка Ликвидация)
    {
      step: 2,
      totalSteps: 5,
      title: "Ликвидация",
      instruction:
        "Обратный сдвиг заблокирован (⊘ Anti-Undo). Елена в радиусе 3×3 — выбери её и нажми «Ликвидация».",
      actionType: "CARD_ACTION",
      allowedCardIds: ["c3"],
      targetCardId: "c3",
      buttonActionKey: "KILL",
      buttonLabel: "Ликвидация",
      buttonVariant: "danger",
      myCharacterId: "c4",
      highlightNeighborCenterId: "c4",
      neighborRole: "red",
      hintMessage: "Выберите Елену Соколову на доске",
    },
    // Шаг 3: Зачистка поля
    {
      step: 3,
      totalSteps: 5,
      title: "Зачистка",
      instruction:
        "Выбывшие жители мешают сдвигам. Нажми «Зачистка» — выбывшие уедут вниз, а живые уплотнятся сверху.",
      actionType: "ACTION_BUTTON",
      buttonActionKey: "CLEANUP",
      buttonLabel: "Зачистка",
      buttonVariant: "secondary",
      myCharacterId: "c4",
      hintMessage: "Нажмите «Зачистка»",
    },
    // Шаг 4: Акт II • Проверка алиби (выбор Марии Климовой c13 + кнопка Проверка алиби)
    {
      step: 4,
      totalSteps: 5,
      title: "Акт II • Теперь ты — Оперативник",
      instruction:
        "Акт II — ты Оперативник. Выбери Марию Климову рядом с сектором удара и нажми «Проверка алиби», чтобы просканировать 3×3.",
      actionType: "CARD_ACTION",
      allowedCardIds: ["c13"],
      targetCardId: "c13",
      buttonActionKey: "EXONERATE",
      buttonLabel: "Проверка алиби",
      buttonVariant: "primary",
      myCharacterId: "c1", // Руслан Громов
      highlightNeighborCenterId: "c1",
      neighborRole: "blue",
      alibiCardIds: ["c2", "c6", "c8", "c9", "c10", "c11", "c12"],
      hintMessage: "Выберите Марию Климову на доске",
    },
    // Шаг 5: Акт II • Задержание (выбор Софии Романовой c7 + кнопка Задержание)
    {
      step: 5,
      totalSteps: 5,
      title: "Акт II • Задержание",
      instruction:
        "Все остальные соседи проверены. В секторе остался один подозреваемый — София Романова. Выбери её и нажми «Задержание»!",
      actionType: "CARD_ACTION",
      allowedCardIds: ["c7"],
      targetCardId: "c7",
      buttonActionKey: "ARREST",
      buttonLabel: "Задержание",
      buttonVariant: "primary",
      myCharacterId: "c1",
      highlightNeighborCenterId: "c1",
      neighborRole: "blue",
      alibiCardIds: ["c2", "c6", "c8", "c9", "c10", "c11", "c12", "c13"],
      hintMessage: "Выберите Софию Романову на доске",
    },
  ],

  THIEF: [
    // Шаг 1: Кража (выбор Анны Мороз c5 + кнопка Кража)
    {
      step: 1,
      totalSteps: 4,
      title: "Кража",
      instruction:
        "Акт I — ты Грабитель, цель — 8 сокровищ. Выбери соседку с монетой (Анна Мороз) и нажми «Кража».",
      actionType: "CARD_ACTION",
      allowedCardIds: ["c5"],
      targetCardId: "c5",
      buttonActionKey: "ROB",
      buttonLabel: "Кража",
      buttonVariant: "danger",
      myCharacterId: "c4",
      highlightNeighborCenterId: "c4",
      neighborRole: "red",
      hintMessage: "Выберите Анну Мороз на доске",
    },
    // Шаг 2: Конспирация (кнопка Конспирация -> смена маски)
    {
      step: 2,
      totalSteps: 4,
      title: "Конспирация",
      instruction:
        "Полиция вышла на след. Нажми «Конспирация» и смени личность на запасную маску из руки (София Романова).",
      actionType: "ACTION_BUTTON",
      buttonActionKey: "DISGUISE",
      buttonLabel: "Конспирация",
      buttonVariant: "primary",
      myCharacterId: "c4",
      hintMessage: "Нажмите «Конспирация»",
    },
    // Шаг 3: Акт II • Вызов патруля
    {
      step: 3,
      totalSteps: 4,
      title: "Акт II • Теперь ты — Полиция",
      instruction:
        "Акт II — ты Полиция. Шеф далеко, но арестовывать можно рядом с патрульным. Нажми «Вызов патруля» (вор получит +1 монету в суматохе).",
      actionType: "ACTION_BUTTON",
      buttonActionKey: "PATROL_CALL",
      buttonLabel: "Вызов патруля",
      buttonVariant: "secondary",
      myCharacterId: "c1", // Шеф Руслан Громов
      hintMessage: "Нажмите «Вызов патруля»",
    },
    // Шаг 4: Задержание через патруль (выбор Софии Романовой c7 + кнопка Задержание)
    {
      step: 4,
      totalSteps: 4,
      title: "Задержание через патруль",
      instruction:
        "София Романова теперь в радиусе 3×3 твоего патрульного. Выбери её и нажми «Задержание»!",
      actionType: "CARD_ACTION",
      allowedCardIds: ["c7"],
      targetCardId: "c7",
      buttonActionKey: "ARREST",
      buttonLabel: "Задержание",
      buttonVariant: "danger",
      myCharacterId: "c1",
      hintMessage: "Выберите Софию Романову на доске",
    },
  ],

  SECRET_SERVICE: [
    // Шаг 1: Опрос свидетелей (выбор Софии c7 + кнопка Опрос свидетелей)
    {
      step: 1,
      totalSteps: 2,
      title: "Опрос свидетелей",
      instruction:
        "Все агенты скрыты, цель в дуэли — 3 компромата. Выбери Софию Романову и нажми «Опрос свидетелей», чтобы просканировать 3×3.",
      actionType: "CARD_ACTION",
      allowedCardIds: ["c7"],
      targetCardId: "c7",
      buttonActionKey: "INTERROGATE",
      buttonLabel: "Опрос свидетелей",
      buttonVariant: "primary",
      myCharacterId: "c1", // Агент «Зенит» Руслан Громов
      highlightNeighborCenterId: "c1",
      neighborRole: "blue",
      hintMessage: "Выберите Софию Романову на доске",
    },
    // Шаг 2: Разоблачение (выбор Марка Воронова c2 + кнопка Разоблачение)
    {
      step: 2,
      totalSteps: 2,
      title: "Разоблачение",
      instruction:
        "Сигнал подтверждён! Непроверенным в секторе и рядом с тобой остался Марк Воронов. Выбери его и нажми «Разоблачение».",
      actionType: "CARD_ACTION",
      allowedCardIds: ["c2"],
      targetCardId: "c2",
      buttonActionKey: "EXPOSE_SPY",
      buttonLabel: "Разоблачение",
      buttonVariant: "danger",
      myCharacterId: "c1",
      highlightNeighborCenterId: "c1",
      neighborRole: "blue",
      radarTargetId: "c7",
      hintMessage: "Выберите Марка Воронова на доске",
    },
  ],
};
