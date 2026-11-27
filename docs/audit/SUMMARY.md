# Мастер-сводка комплексного аудита и дорожная карта спринтов

> Проект: **«Под подозрением» (Prime Suspect)**  
> Статус системы: **Релиз v2.0.0**  
> Актуальное состояние тестов (прогон 2026-11-27): **114 тест-файлов, 801 тест — 100% passed** (зелёный полный сьют; jsdom-шум `HTMLMediaElement.play()` в [TvRejectEdgeCases.test.tsx](file:///c:/Projects/detective-game/src/components/tv/__tests__/TvRejectEdgeCases.test.tsx) устранён моком `soundManager.play` в тесте)
> Статус сборки: **✓ built (0 ошибок TypeScript, строгий режим, PWA precache: 105 ассетов, ~5.0 МБ)**

---

## 1. Обзор направлений аудита

Комплексный аудит кодовой базы проведён по 4 ключевым направлениям:

| Документ                                                                                                         | Направление аудита                     | Ключевой фокус                                                                                               | Статус реализации                                    |
| :--------------------------------------------------------------------------------------------------------------- | :------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :--------------------------------------------------- |
| [01-security-and-network.md](file:///c:/Projects/detective-game/docs/archive/audit/01-security-and-network.md)   | **Безопасность, сеть и память**        | PartyKit WebSocket, маскирование ролей, античит, токены, гонки, устранение утечек памяти                     | ✅ Выполнен (Архив)                                  |
| [02-code-quality-and-perf.md](file:///c:/Projects/detective-game/docs/archive/audit/02-code-quality-and-perf.md) | **Качество кода и производительность** | Мёртвый код, строгая типизация (`noImplicitAny`, `strictNullChecks`), устранение 1-сек ререндера доски       | ✅ Выполнен (Архив)                                  |
| [03-ui-ux-consistency.md](file:///c:/Projects/detective-game/docs/archive/audit/03-ui-ux-consistency.md)         | **Neo-Noir дизайн и мобильный UX**     | Чистка циана/эмодзи, терминология («Главное меню», «Код»), iOS Safe Area, `100dvh`, Touch Targets $\ge 44$px | ✅ Выполнен (Архив)                                  |
| [04-architecture-and-lineup.md](file:///c:/Projects/detective-game/docs/audit/04-architecture-and-lineup.md)     | **Архитектура и режим «Очная ставка»** | Разбор LINE_UP (рассинхрон стейта, бот) и реструктуризация Академии v2                                       | 🟡 В работе (Академия v2 закрыта, LINE_UP заморожен) |

---

## 2. Статус выполнения спринтов

### ✅ Спринт 1: Безопасность и Стабильность Ядра (P0 Critical) — ВЫПОЛНЕН

- [x] **CRIT-01:** Серверная защита от фейк-победы `CAPTURE_SPY` (проверка режима `SECRET_SERVICE`, авторитетный сервер).
- [x] **CRIT-04:** Устранение 1-секундного ре-рендера доски 5×5 (мемоизация `GameBoard`, изоляция тикания таймера).
- [x] **CRIT-05:** Устранение утечки памяти в `partyService` (типизированная шина событий).
- [x] **HIGH-01:** Маскирование скрытых полей дуэли и руки грабителя в `maskStateForPlayer` и `maskStateForTv`.
- [x] **HIGH-02:** Серверный расчет банка матча `matchPot` и блокировка клиентских вызовов `SET_MATCH_POT`.

### ✅ Спринт 2: Целостность матча (SEC-NET) — ВЫПОЛНЕН (2026-11-27), кроме `DEBT-01` (отложен по решению владельца)

> Отдельный сетевой спринт по архивному аудиту [01-security-and-network.md](file:///c:/Projects/detective-game/docs/archive/audit/01-security-and-network.md). Не путать с замороженным спринтом «Очная ставка» ниже.

- [x] **SEC-NET-05 (P2):** серверная проверка соседства 3×3 в [`validateActionLogic()`](file:///c:/Projects/detective-game/src/server/index.ts#L1079) для `KILL_CHARACTER`/`TARGET_KILL`, `ROB_NEIGHBOR`/`ROB`/`STEAL`, `ACCUSE`/`ARREST`, `CAPTURE_SPY`/`INTERROGATE`; новый код `TARGET_NOT_IN_RADIUS` и страховка от «тихого» no-op → `ACTION_NOT_APPLIED`. Тест-сьют [spatialValidation.test.ts](file:///c:/Projects/detective-game/src/server/__tests__/spatialValidation.test.ts) — 16 тестов. Merge `b72fa74`, коммит `94447be`.
- [x] **Клиентская обработка отказов (задача 2.4):** `isActionRejectReason()` в [serverEvents.ts](file:///c:/Projects/detective-game/src/utils/serverEvents.ts), дедупликация `SYNC_ERROR` + `ACTION_REJECTED`, авто-скрытие через 5 с в [useMultiplayer.ts](file:///c:/Projects/detective-game/src/utils/useMultiplayer.ts), неблокирующая плашка [MatchStatusBanner.tsx](file:///c:/Projects/detective-game/src/components/MatchStatusBanner.tsx); `ServerMessageModal` остаётся только для настоящего десинка. Merge `a2ae60a`, коммит `6a0d143`.
- [x] **SEC-NET-04 (HIGH):** блокировка `RESTART_DUEL` / `RESOLVE_DUEL_TIE_BREAK` закрыта в коде двумя слоями: ранний фильтр в [`onMessage`](file:///c:/Projects/detective-game/src/server/index.ts#L1376-L1385) и код `PROHIBITED_ACTION` в [`validateActionLogic`](file:///c:/Projects/detective-game/src/server/index.ts#L1141-L1147). Тестами покрыто частично (см. бэклог `SEC-NET-04-T`).
- [x] **SEC-NET-06 (P2):** гонка состояния при реконнекте сокетов с `authToken` — закрыта: `sessionEpoch`, stale-close guard, коды `SESSION_SUPERSEDED` / `SESSION_CONFLICT`, защита границ таймеров. Merge `bff0d69` → `afed166`.
- [x] **SEC-NET-04-T:** тесты дуэльных блокировок `RESTART_DUEL` / `RESOLVE_DUEL_TIE_BREAK` — [duelProhibitedActions.test.ts](file:///c:/Projects/detective-game/src/server/__tests__/duelProhibitedActions.test.ts), 5 тестов. Merge `b6178eb` → `78bb22a`.
- [x] **TV-REJECT:** плашка причины отказа на ТВ-экране в 10-foot UI + граничные тесты [TvRejectEdgeCases.test.tsx](file:///c:/Projects/detective-game/src/components/tv/__tests__/TvRejectEdgeCases.test.tsx). Merge `84cb630` → `6f155e7`, `de321d7` → `d277ee4`.
- [x] **Плашка на контроллере:** инлайн-причина отказа на мобильном контроллере. Merge `a41abed` → `b323c63`.
- [x] **MEM-RES-03 / SEC-NET-07:** устранение утечек памяти и сетевых остатков подписок. Merge `42131a3` → `981327a`.
- [x] **SEC-ENV-01 / SEC-ENV-02:** CSP для production и CORS-allowlist на сервере. Merge `225dcfb` → `613166d`.
- [x] **TOOL-VITEST:** `vitest` 1.6.1 → 2.1.9, снят Windows-дефект регистра диска. Merge `ac72d19` → `fcb9d93`.
- [x] **Клиент `SESSION_SUPERSEDED`:** обработка без автопереподключения. Merge `034524f` → `da28469`.
- [x] **Ротация `authToken`:** окно совместимости 60 с. Merge `024e82c` → `3e57ff8`.

### 🟡 Спринт 2: Режим «Очная ставка» (`LINE_UP`) — [ЗАМОРОЖЕН / В РАЗРАБОТКЕ]

- [ ] **CRIT-02:** Устранение State Split-Brain между `duelReducer` и `gameReducer`.
- [ ] **CRIT-03:** Фикс сломанного `questionId` в мобильном контроллере ТВ-режима.
- [ ] **ARC-LU-02:** Подключение энтропийного ИИ-бота в оффлайн-дуэли.
- [ ] **ARC-LU-05:** Отображение атрибутов внешности на карточках поля в режиме `LINE_UP`.
  > _Решение:_ Режим временно скрыт из главного меню, турнирной ротации и Академии. Задачи перенесены в изолированный бэклог будущего редизайна.

### ✅ Спринт 3: Мобильный UX, Safe Area и Neo-Noir гармонизация — ВЫПОЛНЕН

- [x] **HIGH-03:** Внедрение iOS Safe Area (`pt-[max(0.75rem,env(safe-area-inset-top))]`, `pb-[max(0.75rem,env(safe-area-inset-bottom))]`) и `100dvh` во всех экранах.
- [x] **HIGH-04:** Полная зачистка остатков циана (`cyan-*`, `#06b6d4`, `accent-neon`) и теней `shadow-neon-*`.
- [x] **MED-01:** Чистка пафосной терминологии: «Штаб» ➔ «Главное меню», «Шифр» ➔ «Код комнаты», «Связной» ➔ «Игрок».
- [x] **MED-02:** Увеличение интерактивных кнопок до Touch Targets $\ge 44\times 44$px.
- [x] Запрет системных цветных эмодзи в UI (переход строго на монохромные SVG из UI Kit).

### ✅ Спринт 4: Чистка кода, Типизация и Подготовка к Релизу — ВЫПОЛНЕН

- [x] **HIGH-06:** Добавление свойства `isArrested?: boolean` в базовый контракт `Character`.
- [x] **HIGH-07:** Замена прямых вызовов `localStorage` на безопасный фасад `safeLocalStorage` / `storage.ts`.
- [x] **HIGH-08:** Устранение дублирующих импортов 50 портретов (единый модуль `characterImages.ts`).
- [x] **MED-03:** Удаление мёртвого кода и неиспользуемых ассетов.
- [x] **MED-06:** Включение строгих флагов TypeScript (`noImplicitAny`, `strictNullChecks`).
- [x] Настройка автоматического CI на GitHub Actions (`.github/workflows/ci.yml`).

### ✅ Спринт: Академия v2 (Zero-Jump & Сюжет) — ВЫПОЛНЕН

- [x] Переработка сюжета: 3 канонических дела строго по [GAME_RULES.md](file:///c:/Projects/detective-game/docs/GAME_RULES.md) (11 шагов вместо 28 раздробленных).
- [x] Объединённый шаг `CARD_ACTION`: клик по карте сразу активирует кнопку действия внизу без дробления на два экрана.
- [x] Жёсткая неподвижная 4-слотовая вёрстка `100dvh` (шапка `h-14`, брифинг `h-[84px]`, доска `flex-1`, панель действий `h-[64px]`).
- [x] 2-канальная аудиосистема (`soundManager`): UI и Action каналы, микро-дебаунс 70 мс, подавление наложений звуков.
- [x] Разгрузка карточек на 375px: замена `#NN` на `ВЫ` на `< sm`, компактные горизонтальные штампы над именем персонажа.
- [x] Закрепление правил быстрой верификации в [AGENTS.md](file:///c:/Projects/detective-game/AGENTS.md).

---

## 3. Открытый бэклог технического долга (Open Debt)

В открытом бэклоге оставлены только задачи, не блокирующие релиз v2.0.0:

| ID          | Задача                                                    | Зона           | Статус                                                                               |
| :---------- | :-------------------------------------------------------- | :------------- | :----------------------------------------------------------------------------------- |
| **DEBT-01** | Редизайн «Очной ставки» (`LINE_UP`)                       | Game Core / UI | Отложено по решению владельца: режим заморожен и скрыт из меню, турниров и Академии. |
| **DEBT-02** | Стресс-тестирование ТВ-режима на слабом Android TV железе | TV Party       | Открыто: требуется реальное профилирование FPS на бюджетных приставках с 1 ГБ RAM.   |

> Закрыто в спринте 2: `SEC-NET-04-T`, `SEC-NET-06`, `TV-REJECT`, `TOOL-VITEST`, `MEM-RES-03`, `SEC-NET-07`, `SEC-ENV-01`, `SEC-ENV-02`.

---

## 4. Не проверено на реальных устройствах

Перечисленные ниже пункты проверены только юнит-тестами (jsdom) и требуют ручной валидации на физических устройствах:

- **ТВ 1280×720 / 1920×1080 и Android TV:** реальный рендер (шрифты, safe area, 10-foot читаемость с дивана), отсутствие скролла, работа D-Pad и отсутствие ловушек фокуса.
- **Мобильный контроллер 375×667:** реальная геометрия инлайн-плашки отказа, отсутствие визуального наложения на нижний ряд сетки, отсутствие вертикального скролла.
- **CSP в браузере:** проверка через DevTools → Console на нарушения политики; `frame-ancestors` и `X-Frame-Options` настраиваются только на хостинге и локально не воспроизводятся.
- **`SESSION_SUPERSEDED` и ротация `authToken`:** поведение на реальных устройствах (мобильный контроллер, ТВ, приватные комнаты) — реконнект, окно совместимости 60 с, отсутствие автопереподключения.

---

## 5. Заключение

Проект полностью стабилизирован:

- **801 тест Vitest: 100% passed** (114 тест-файлов, 0 failed; jsdom-шум `HTMLMediaElement.play()` в ТВ-тесте плашки устранён моком звука, проверка отсутствия реальных ошибок сохранена).
- Сборка чистая и быстрая.
- Безопасность авторитетного сервера PartyKit подтверждена.
- Все 3 активных режима игры согласованы с официальными правилами.
