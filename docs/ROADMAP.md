# Дорожная карта модернизации: «Реквием: Последний выстрел»

## Фаза 1: Ампутация устаревшего ТВ-режима
- [x] TASK-01: Очистка App.tsx и src/server/index.ts от рудиментов ТВ-режима.
- [x] TASK-02: Удаление рудиментов ТВ-компонентов.

## Фаза 2: Слияние игровых режимов «Схватка» и «Маньяк»
- [x] TASK-03: Удаление SKHVATKA из типов и ядра gameLogic/gameReducer.
- [x] TASK-04: Синхронизация MainMenu.tsx, RulesModal.tsx и GAME_RULES.md.

## Фаза 3: Обновление Vitest-тестов
- [x] TASK-05: Удаление/перевод тестов с SKHVATKA на MANIAC_VS_OPERATIVE.
- [x] TASK-06: Обеспечение 100% прохождения тест-сьюта (Zero Regression).

## Фаза 4: Проектирование нового ТВ-режима
- [x] TASK-07: Сетевой протокол и маскирование стейта для ТВ/контроллеров.
- [x] TASK-08: Новый интерфейс ТВ-экрана (TvBoardView) на базе Glassmorphism Neo-Noir.
- [x] TASK-09: Новый мобильный пульт управления (MobileControllerView).

## Фаза 5: Мультиплатформенность и связка TV Party
- [x] TASK-10: Синхронизация TvLobbyView (очистка от SKHVATKA, 4 актуальных режима).
- [x] TASK-11: Бесшовный роутинг TV Party в App.tsx (подключение TV_DISPLAY и CONTROLLER по URL).
- [x] TASK-12: Адаптация D-Pad навигации под пульт Android TV на экране телевизора.
- [ ] TASK-13: Интеграция и конфигурация Capacitor для Android и Android TV.
