# Мастер-сводка комплексного предрелизного аудита
> Проект: **«Под подозрением» (Prime Suspect)**  
> Дата проведения аудита: **19 ноября 2026 г.**  
> Ветка: `feature/tv-mode-redesign`  
> Статус тестов: **78 файлов, 504 теста пройдены успешно (100% PASS)**  
> Статус сборки: **✓ built in 6.16s (0 ошибок TypeScript, PWA precache: 106 ассетов)**

---

## 1. Обзор и структура отчётов

Комплексный аудит кодовой базы проведён автономно 4 специализированными агентами в режиме строгого `READ-ONLY` для продуктового кода. Результаты зафиксированы в четырёх подробных аналитических документах:

| Документ | Направление аудита | Ключевой фокус | Размер |
| :--- | :--- | :--- | :--- |
| [01-security-and-network.md](file:///c:/Projects/detective-game/docs/audit/01-security-and-network.md) | **Безопасность, сеть и память** | PartyKit WebSocket, маскирование ролей, античит, токены, гонки, утечки памяти | 41.2 КБ |
| [02-code-quality-and-perf.md](file:///c:/Projects/detective-game/docs/audit/02-code-quality-and-perf.md) | **Качество кода и производительность** | Мёртвый код, типизация (any / strict), 1-секундный ре-рендер доски, дублирование | 45.5 КБ |
| [03-ui-ux-consistency.md](file:///c:/Projects/detective-game/docs/audit/03-ui-ux-consistency.md) | **Neo-Noir дизайн и мобильный UX** | Экраны вне ТВ: циан/неон, терминология, iOS Safe Area, 100dvh, Touch Targets | 41.8 КБ |
| [04-architecture-and-lineup.md](file:///c:/Projects/detective-game/docs/audit/04-architecture-and-lineup.md) | **Архитектура и режим «Очная ставка»** | Модульная карта, Data Flow, глубокий аудит LINE_UP (рассинхрон стейта, бот) | 43.8 КБ |

---

## 2. Главные находки по направлениям

### 2.1. Безопасность и сеть (Security & Network)
1. **[CRITICAL] Фальсификация победы через `CAPTURE_SPY` (SEC-NET-01):**  
   Экшен `CAPTURE_SPY` валидируется сервером только если комната запущена в режиме `SECRET_SERVICE`. Если злоумышленник отправляет `CAPTURE_SPY` в режимах `MANIAC_VS_OPERATIVE`, `THIEF_HUNT` или `LINE_UP`, сервер пропускает экшен без проверки, а клиентский `gameReducer.ts:131-200` безоговорочно выставляет `state.winner = action.payload.winner`, позволяя мгновенно выиграть матч.
2. **[HIGH] Утечка секретных карт дуэли и руки грабителя (SEC-NET-03):**  
   В `server/index.ts` функция `maskStateForPlayer` фильтрует только `killerSecretId` и `detectiveSecretId`, но оставляет открытыми `duelSecretKillerId`, `duelSecretDetectiveId`, а также руку грабителя `robberHand` в режиме «Охота на вора», позволяя сопернику через DevTools или сетевой сниффер видеть скрытые цели.
3. **[HIGH] Накрутка банка матча через `SET_MATCH_POT` (SEC-NET-02):**  
   Клиент может прислать произвольное значение `matchPot`, которое при победе зачисляется в профиль игрока через RPC Supabase.
4. **[HIGH] Утечка памяти через monkey-patching одиночных коллбэков на `partyService` (MEM-RES-01):**  
   Хуки `useLobbyNetwork`, `RoleRevealModal`, `MobileControllerView` перезаписывают `partyService.onAction` и `partyService.onSyncState` без шины подписок. При быстром переключении экранов возникают висячие замыкания на размонтированные компоненты и потеря сетевых пакетов.
5. **[MEDIUM] Процедурный синтез звуков `createOscillator` (MEM-RES-02):**  
   В `audio.ts` (`startMorseTone`, `startTvAmbient`) создаются осцилляторы, что нарушает инвариант проекта `AGENTS.md` (разрешены только оригинальные файлы из `public/sounds`).

---

### 2.2. Качество кода и производительность (Code Quality & Performance)
1. **[CRITICAL] Главный ботлнек производительности — 1-секундный каскадный ре-рендер (PERF-01):**  
   В корневом `App.tsx` хук `useGameTimer` каждую секунду (1000 мс) вызывает `setSecondsElapsed`. Так как `GameBoard.tsx` **не обёрнут в `React.memo`**, каждую секунду с нуля ререндерятся все 25 карточек поля, пересчитываются анимации `framer-motion`, стили и поиски по массивам.
2. **[HIGH] Разрыв контрактов интерфейса `Character` (TS-02):**  
   Свойство `isArrested` мутируется в `gameLogic.ts:682`, но отсутствует в типе `Character` (`src/types/game.ts`), порождая небезопасные касты `(character as any).isArrested` в `CharacterCard.tsx` и `TvBoardView.tsx`.
3. **[HIGH] Повторный eager-импорт 50 портретов персонажей (DEAD-02):**  
   В `CharacterCard.tsx` и `GameOverModal.tsx` выполняется `import.meta.glob('../assets/characters/*.webp', { eager: true })`, полностью дублирующий уже существующий оптимизированный кэш `src/constants/characterImages.ts`.
4. **[HIGH] Прямые вызовы `localStorage` в обход безопасного хранилища (TS-04):**  
   Обнаружено 55 прямых вызовов `localStorage.getItem/setItem` в компонентах без перехвата `SecurityError`/`QuotaExceededError`, что ведёт к падению в приватных вкладках iOS Safari и WebView.
5. **[MEDIUM] 109 явных `any`, 83 `as any` и отключенный strict mode в `tsconfig.app.json` (TS-01):**  
   Отсутствуют флаги `strict`, `noImplicitAny`, `strictNullChecks`.

---

### 2.3. Консистентность Neo-Noir и мобильный UX (UI/UX Consistency)
1. **[HIGH] Уязвимости интерфейса к вырезам iOS (Safe Area) и скачкам адресной строки (UI-SAFE-01 / UI-SAFE-02):**  
   - Шапка матча `GameTopHeader.tsx` не имеет `pt-[env(safe-area-inset-top)]`, из-за чего кнопки блокнота и логов накладываются на Dynamic Island / шторку уведомлений iPhone.
   - Экран столов `TablesScreen.tsx` не имеет `pb-[env(safe-area-inset-bottom)]` на плавающей кнопке создания партии (перекрывается Home Bar).
   - Всплывающие уведомления `Toast.tsx` (`top-3`) перекрываются Dynamic Island.
   - Экраны `MainMenu.tsx` и `ProfileScreen.tsx` используют устаревший `h-screen`/`min-h-screen` вместо `100dvh`.
2. **[HIGH] Остатки кислотного циана и неоновых теней вне ТВ-режима (UI-PALETTE-01):**  
   - `LobbyWaitingModal.tsx`: классы `bg-cyan-500`, `text-cyan-400`, `shadow-neon-cyan`.
   - `TablesHeader.tsx`: `text-cyan-400`, `bg-cyan-400`.
   - `ModeCard.tsx`: индикатор онлайна `bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]`.
   - `AuthModal.tsx`: неоновые градиенты `from-cyan-500/20`.
   - `tailwind.config.js`: устаревший токен `accent-neon: '#06b6d4'`.
3. **[MEDIUM] Устаревшая пафосная терминология в лобби и комнатах (UI-TERM-01):**  
   - `RecoveryKeyView.tsx:147`: кнопка «*В ШТАБ (ПРОДОЛЖИТЬ)*».
   - `LobbyWaitingModal.tsx`: «*ШИФРОВАННЫЙ КАНАЛ*», «*7-значный шифр*».
   - `TablesEmptyState.tsx`: «*ЭФИР СВОБОДЕН*».
   - `RoomItemCard.tsx`: «*Ввести шифр ➔*».
   - `CreateRoomModal.tsx`: «*Закрытый канал (по шифру)*».
4. **[MEDIUM] Маленькие Touch Targets на смартфонах (UI-TOUCH-01):**  
   Кнопки блокнота, паузы и протокола в `GameTopHeader.tsx` имеют размер 32×32px (стандарт эргономики — не менее 44×44px).

---

### 2.4. Архитектура и режим «Очная ставка» (LINE_UP Audit)
1. **[CRITICAL] «Двоевластие» стейта (State Split-Brain) (ARC-LU-01):**  
   В одиночной игре `DuelScreen` использует изолированный локальный `useReducer(duelReducer, createInitialDuelState())`. При этом глобальный стейт `gameState` в `App.tsx` не знает о ходе дуэли, истории вопросов и победителе.
2. **[CRITICAL] Полная заморозка бота ИИ в одиночной игре «Очной ставки» (ARC-LU-02):**  
   Хотя в `aiLogic.ts:470-530` реализован качественный энтропийный алгоритм `getDuelAIMove`, в компоненте `DuelScreen.tsx` вообще отсутствует вызов хода бота! При переходе хода к `KILLER` игра зависает навсегда.
3. **[CRITICAL] Несуществующий `questionId: 'q_gender'` в мобильном контроллере ТВ-режима (ARC-LU-03):**  
   В `MobileControllerView.tsx:1367` захардкожен вопрос `questionId: 'q_gender'`, которого нет в реестре `DUEL_QUESTIONS` (там есть `q_gender_male` и `q_gender_female`), из-за чего в режиме ТВ-вечеринки нажатие кнопки вопроса падает с ошибкой.
4. **[HIGH] Потеря записи результатов матча и рейтинга MMR (ARC-LU-04):**  
   Хук `useMatchEndHandler` слушает `gameState.winner`. Поскольку локальный `DuelScreen` не обновляет `gameState.winner`, победа/поражение в «Очной ставке» не записываются в профиль и лидерборд Supabase.
5. **[HIGH] Несоответствие визуального ряда поля 5×5 (ARC-LU-05):**  
   В «Очной ставке» карточки подозреваемых должны содержать визуальные атрибуты (очки, шляпа, пальто, пол), но рендерятся обычной карточкой `CharacterCard` без атрибутивных маркеров.

---

## 3. Единый приоритизированный бэклог (Master Backlog)

### 🔴 Приоритет: CRITICAL (Безопасность, сбои логики, утечки)
| ID | Задача | Файлы | Описание |
| :--- | :--- | :--- | :--- |
| **CRIT-01** | **Серверная защита от фейк-победы `CAPTURE_SPY`** | `src/server/index.ts`<br>`src/utils/gameReducer.ts` | Игнорировать `CAPTURE_SPY` вне режима `SECRET_SERVICE`. Перенести расчёт победы строго на авторитетный сервер. |
| **CRIT-02** | **Устранение State Split-Brain и оживление ИИ в «Очной ставке»** | `src/components/duel/DuelScreen.tsx`<br>`src/utils/gameReducer.ts`<br>`src/App.tsx` | Перевести `LINE_UP` на единый `gameReducer`. Добавить хук `useAiTurn` в дуэль с вызовом `getDuelAIMove`. |
| **CRIT-03** | **Фикс сломанного `questionId` в мобильном контроллере** | `src/components/controller/MobileControllerView.tsx` | Заменить хардкод `q_gender` на полноценный выбор категорий из `DUEL_QUESTIONS`. |
| **CRIT-04** | **Устранение 1-секундного ре-рендера доски 5×5** | `src/components/GameBoard.tsx`<br>`src/App.tsx`<br>`src/hooks/useGameTimer.ts` | Обернуть `GameBoard` в `React.memo`. Изолировать тикание `secondsElapsed` внутри шапки матча без ре-рендера доски. |
| **CRIT-05** | **Устранение утечки памяти в `partyService` (Event Bus)** | `src/utils/partyPeer.ts`<br>`src/hooks/useLobbyNetwork.ts` | Заменить одиночные коллбэки `onAction`/`onSyncState` на типизированную шину событий `addEventListener`/`removeEventListener`. |

---

### 🟠 Приоритет: HIGH (UX, Safe Area, античит, контракты)
| ID | Задача | Файлы | Описание |
| :--- | :--- | :--- | :--- |
| **HIGH-01** | **Маскирование скрытых полей дуэли и руки грабителя** | `src/server/index.ts:1666` | В `maskStateForPlayer` маскировать `duelSecretKillerId`, `duelSecretDetectiveId` и скрывать чужие карты `robberHand`. |
| **HIGH-02** | **Серверная валидация банка матча `SET_MATCH_POT`** | `src/server/index.ts` | Рассчитывать банк матча на сервере на основе `matchBet` обоих игроков, запретить клиентский `SET_MATCH_POT`. |
| **HIGH-03** | **Внедрение iOS Safe Area и `100dvh` во всех экранах** | `src/components/game/GameTopHeader.tsx`<br>`src/components/lobby/TablesScreen.tsx`<br>`src/components/ui/Toast.tsx`<br>`src/components/MainMenu.tsx` | Добавить `pt-[env(safe-area-inset-top)]`, `pb-[env(safe-area-inset-bottom)]`, перевести контейнеры на `h-[100dvh]`. |
| **HIGH-04** | **Зачистка остаточного циана и неоновых теней** | `src/components/lobby/LobbyWaitingModal.tsx`<br>`src/components/lobby/TablesHeader.tsx`<br>`src/components/lobby/ModeCard.tsx`<br>`tailwind.config.js` | Заменить `cyan-*` на сапфировые `blue-500/600`, удалить `shadow-neon-*`, перевести панели на `.neo-card`. |
| **HIGH-05** | **Добавление атрибутов внешности на карточки «Очной ставки»** | `src/components/CharacterCard.tsx`<br>`src/components/duel/DuelScreen.tsx` | Отображать бейджи атрибутов (шляпа, очки, борода, пол) на карточках поля в режиме `LINE_UP`. |
| **HIGH-06** | **Добавление свойства `isArrested` в интерфейс `Character`** | `src/types/game.ts:11` | Включить `isArrested?: boolean` в базовый контракт, устранив касты `(character as any).isArrested`. |
| **HIGH-07** | **Замена прямого `localStorage` на модуль `storage.ts`** | По проекту (55 вхождений) | Использовать `storage.getSyncItem` / `storage.setSyncAndPersist` с защитой от сбоев в Safari Private Mode. |
| **HIGH-08** | **Устранение дублирующего импорта 50 портретов** | `src/components/CharacterCard.tsx`<br>`src/components/modals/GameOverModal.tsx` | Перевести на единый модуль `src/constants/characterImages.ts`. |

---

### 🟡 Приоритет: MEDIUM / QUICK WINS (Чистка терминологии, UI Kit, мёртвый код)
| ID | Задача | Файлы | Описание |
| :--- | :--- | :--- | :--- |
| **MED-01** | **Чистка устаревшей терминологии в лобби и комнатах** | `RecoveryKeyView.tsx`<br>`LobbyWaitingModal.tsx`<br>`TablesEmptyState.tsx`<br>`RoomItemCard.tsx`<br>`CreateRoomModal.tsx` | Заменить «Штаб» ➔ «Главное меню», «Шифр» ➔ «Код», «Эфир свободен» ➔ «Комнат не найдено». |
| **MED-02** | **Унификация кнопок и Touch Targets >= 44px** | `src/components/game/GameTopHeader.tsx`<br>`src/components/tutorial/TutorialActionBar.tsx`<br>`src/components/modals/GameOverActions.tsx` | Увеличить кнопки до 44×44px, заменить самодельные кнопки на `Button.tsx`, исправить опечатку `rounded-full rounded-xl`. |
| **MED-03** | **Удаление мёртвых ассетов и неиспользуемого кода** | `src/assets/modes/maniac_preview.webp`<br>`src/utils/gameLogic.ts:546` | Удалить дубликат баннера (65 КБ), шаблонные SVG, вырезать мёртвый режим `EUROPOL_VS_OPG`. |
| **MED-04** | **Замена `createOscillator` на оригинальные звуки в `audio.ts`** | `src/utils/audio.ts:133` | Заменить синтезатор Морзе на аудиосэмплы из `public/sounds` согласно регламенту `AGENTS.md`. |
| **MED-05** | **Добавление метатега Content Security Policy (CSP)** | `index.html` | Ограничить источники скриптов, стилей и подключений к WebSocket/Supabase. |
| **MED-06** | **Включение флагов строгости в `tsconfig.app.json`** | `tsconfig.app.json` | Включить `noImplicitAny: true` и `strictNullChecks: true`, типизировать сетевой стейт `useMultiplayer.ts`. |

---

## 4. Рекомендуемый план реализации (Roadmap)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Спринт 1: Безопасность и Стабильность Ядра (P0 Critical)               │
│  - Закрытие уязвимости CAPTURE_SPY и маскирование ролей в PartyKit     │
│  - Устранение утечки памяти в partyService (Event Bus)                 │
│  - Изоляция 1-сек таймера и мемоизация GameBoard (Zero Layout Shift)   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Спринт 2: Редизайн и Оживление режима «Очная ставка» (LINE_UP)        │
│  - Унификация стейта (устранение Split-Brain, перенос в gameReducer)    │
│  - Подключение энтропийного ИИ-бота в оффлайне и дуэли                │
│  - Фикс каталога вопросов на мобильном пульте TV Party                 │
│  - Отображение атрибутов внешности на карточках поля                   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Спринт 3: Мобильный UX, Safe Area и Neo-Noir гармонизация             │
│  - Внедрение safe-area-inset-* в шапку матча, столы и тосты            │
│  - Полная зачистка остатков циана/неона и терминов («Штаб»/«Шифр»)     │
│  - Увеличение Touch Targets до 44×44px на мобильных устройствах        │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Спринт 4: Чистка кода, Типизация и Подготовка к Релизу                │
│  - Перевод direct localStorage вызовов на модуль storage.ts            │
│  - Удаление мертвых ассетов (~95 КБ) и дублирующих импортов картинок   │
│  - Устранение any в сетевых контрактах и добавление CSP в index.html   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Заключение

Проект находится в высокой степени технической готовности:
- Все **504 теста Vitest** проходят стабильно.
- Сборка бандла быстрая и чистая (**6.16 с**).
- ТВ-режим и мобильный пульт приведены к эталонному стандарту Neo-Noir на Этапах 1 и 2.

Реализация пунктов из Спринтов 1–2 полностью устранит критические уязвимости безопасности и восстановит полноценную работу режима «Очная ставка», сделав проект готовым к релизу на Web, PWA, Android и TV Party.
