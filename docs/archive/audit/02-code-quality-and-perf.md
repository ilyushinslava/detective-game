# Отчет аудита №2: Чистота кода, типизация (TypeScript) и производительность

> **Проект:** «Под подозрением» (Prime Suspect)  
> **Репозиторий:** `ilyushinslava/detective-game`  
> **Дата проведения аудита:** 19 ноября 2026 г.  
> **Аудитор:** Субагент 2 (Аудит чистоты кода, типизации и производительности)  
> **Статус проверки:** Завершен (Кодовая база: `src/`, `party/`, `public/`, `tsconfig.*`, `vite.config.ts`)  
> **Режим проверки:** Strict Read-Only  
> **Базовый прогон тестов:** 78 тест-сьютов (504 теста) успешно пройдены (Vitest). Сборка `tsc && vite build` успешна.

---

## 1. Сводная статистика и карта выявленных дефектов

В ходе комплексного аудита качества кодовой базы, строгой типизации TypeScript и профилирования рендеринга было проанализировано **176 файлов исходного кода** (`src/`), **92 медиафайла** (`public/`, `src/assets/`), а также конфигурационные файлы сборщика и компилятора (`tsconfig.app.json`, `vite.config.ts`).

### Ключевые метрики кодовой базы:
- **Общий объем исходного кода:** ~176 модулей TypeScript/TSX.
- **Дисциплина подавления проверок:** `@ts-ignore` в продуктовом коде отсутствует (0 в проде, 4 в тестах), `@ts-expect-error` отсутствует (0). Заглушек `TODO/FIXME` в продуктовом коде нет (0).
- **Размывание строгой типизации:** 
  - **109** явных объявлений `: any` в продуктовом коде.
  - **83** небезопасных приведения типа `as any` в продуктовом коде.
  - **3** двойных приведения типа `as unknown as`.
  - **`strict: true` отключен** в `tsconfig.app.json` (отсутствуют `noImplicitAny`, `strictNullChecks`).
- **Активы и балласт:**
  - **5 неиспользуемых медиафайлов** (~95 КБ), включая дубликат баннера маньяка на 65 КБ и шаблоны Vite/React.
  - Повторный `eager glob` импорт 50 портретов персонажей в `CharacterCard.tsx` и `GameOverModal.tsx` в обход модуля отложенной загрузки `characterImages.ts`.
  - **23 неиспользуемых в проде экспорта** (константы правил, мертвые хелперы, тестовые методы в проде).
  - **1 легаси-режим-призрак** (`EUROPOL_VS_OPG`), отсутствующий в типах `GameModeType`.
  - **55 прямых обращений к `localStorage`** в обход отказоустойчивого сервиса `storage.ts`.
- **Рендеринг и реактивность:**
  - Центральный таймер (`useGameTimer`) в корневом `App.tsx` вызывает перерисовку всего дерева (`App` -> `GameScreen` -> `GameBoard`) **каждые 1000 мс**.
  - `GameBoard` **не обернут в `React.memo`**, вызывая пересчет 25 элементов `motion.div` и линейные поиски в массивах каждую секунду.
  - Полное параллельное дублирование тяжелого компонента карточки поля: `CharacterCard` (297 строк) и `TvCell` (230 строк) дублируют логику силуэтов, штампов, статусов ареста и смерти.
  - Синхронный импорт экранов `TablesScreen` и `ProfileScreen` в `MainMenu.tsx`, увеличивающий основной JS-бандл до 344 КБ (raw).

---

### Сводная таблица выявленных дефектов и рисков

| ID | Область | Критичность | Описание дефекта | Файл и строка |
| :--- | :--- | :--- | :--- | :--- |
| **PERF-REN-01** | Рендеринг / React | **HIGH** | Корневой таймер `useGameTimer` в `App.tsx` вызывает каскадный ре-рендер `GameScreen` и всех 25 ячеек `GameBoard` каждую секунду | [src/App.tsx#L427](file:///c:/Projects/detective-game/src/App.tsx#L427) <br> [src/components/GameBoard.tsx#L57](file:///c:/Projects/detective-game/src/components/GameBoard.tsx#L57) |
| **TYPE-SSOT-01** | Модель данных | **HIGH** | Отсутствие свойства `isArrested` в интерфейсе `Character` при мутации в `gameLogic.ts` порождает каскад `as any` в UI | [src/types/game.ts#L11-L19](file:///c:/Projects/detective-game/src/types/game.ts#L11-L19) <br> [src/utils/gameLogic.ts#L682](file:///c:/Projects/detective-game/src/utils/gameLogic.ts#L682) <br> [src/components/CharacterCard.tsx#L66-L92](file:///c:/Projects/detective-game/src/components/CharacterCard.tsx#L66-L92) |
| **TYPE-NET-01** | Сетевой слой | **HIGH** | Полная эрозия типизации сетевых событий (`onSyncState: any`, `onAction: any`, `lastSyncedState: any`) в `partyPeer.ts` | [src/utils/partyPeer.ts#L86-L236](file:///c:/Projects/detective-game/src/utils/partyPeer.ts#L86-L236) <br> [src/utils/useMultiplayer.ts#L16-L70](file:///c:/Projects/detective-game/src/utils/useMultiplayer.ts#L16-L70) |
| **ARCH-DUP-01** | UI Архитектура | **HIGH** | Параллельное дублирование карточки персонажа поля: `TvCell` в `TvBoardView.tsx` дублирует `CharacterCard.tsx` | [src/components/tv/TvBoardView.tsx#L120-L364](file:///c:/Projects/detective-game/src/components/tv/TvBoardView.tsx#L120-L364) <br> [src/components/CharacterCard.tsx#L37-L290](file:///c:/Projects/detective-game/src/components/CharacterCard.tsx#L37-L290) |
| **RUN-STOR-01** | Надежность / Runtime | **HIGH** | 55 прямых вызовов `localStorage` в обход безопасного хранилища `storage.ts` (риск краша в Safari Private Mode / WebViews) | [src/App.tsx#L106-L216](file:///c:/Projects/detective-game/src/App.tsx#L106-L216) <br> [src/contexts/AuthContext.tsx#L75-L261](file:///c:/Projects/detective-game/src/contexts/AuthContext.tsx#L75-L261) <br> [src/utils/storage.ts#L12-L192](file:///c:/Projects/detective-game/src/utils/storage.ts#L12-L192) |
| **DEAD-ASSET-01** | Ассеты / Бандл | **MEDIUM** | Наличие неиспользуемых медиафайлов и дубликатов тяжелых изображений (65 КБ дубликат баннера маньяка, шаблонные SVG) | [src/assets/modes/maniac_preview.webp](file:///c:/Projects/detective-game/src/assets/modes/maniac_preview.webp) <br> [public/icons.svg](file:///c:/Projects/detective-game/public/icons.svg) <br> [src/assets/hero.png](file:///c:/Projects/detective-game/src/assets/hero.png) |
| **PERF-ASSET-01** | Загрузка ассетов | **MEDIUM** | Игнорирование механизма ленивой загрузки: повторный `import.meta.glob(..., { eager: true })` для 50 персонажей в компонентах | [src/components/CharacterCard.tsx#L9-L12](file:///c:/Projects/detective-game/src/components/CharacterCard.tsx#L9-L12) <br> [src/components/GameOverModal.tsx#L32-L35](file:///c:/Projects/detective-game/src/components/GameOverModal.tsx#L32-L35) <br> [src/constants/characterImages.ts#L1-L37](file:///c:/Projects/detective-game/src/constants/characterImages.ts#L1-L37) |
| **PERF-BUND-01** | Размер бандла | **MEDIUM** | Синхронная загрузка экранов `TablesScreen` и `ProfileScreen` в `MainMenu.tsx` раздувает начальный бандл `index.js` (344 КБ) | [src/components/MainMenu.tsx#L13-L14](file:///c:/Projects/detective-game/src/components/MainMenu.tsx#L13-L14) |
| **TYPE-CFG-01** | Конфигурация TS | **MEDIUM** | Отсутствие флага `strict: true` в `tsconfig.app.json` допускает неявные типы `any` и пропуск `null`-проверок | [tsconfig.app.json#L1-L26](file:///c:/Projects/detective-game/tsconfig.app.json#L1-L26) |
| **DEAD-CODE-01** | Чистота кода | **LOW** | Мертвый режим `"EUROPOL_VS_OPG"` в ядре игровой логики и неиспользуемая функция `setPolicePatrol` | [src/utils/gameLogic.ts#L546](file:///c:/Projects/detective-game/src/utils/gameLogic.ts#L546) <br> [src/utils/gameLogic.ts#L594](file:///c:/Projects/detective-game/src/utils/gameLogic.ts#L594) |
| **DEAD-EXPO-01** | Чистота кода | **LOW** | 23 экспортируемых символа без единого использования в продакшн-коде (константы правил, хэптики, тестовый метод в `tvAudio`) | [src/constants/gameRules.ts#L8-L23](file:///c:/Projects/detective-game/src/constants/gameRules.ts#L8-L23) <br> [src/components/CharacterCard.tsx#L33](file:///c:/Projects/detective-game/src/components/CharacterCard.tsx#L33) <br> [src/utils/tvAudio.ts#L44](file:///c:/Projects/detective-game/src/utils/tvAudio.ts#L44) |
| **ARCH-MODE-01** | Архитектура режимов | **LOW** | Рассинхронизация серверной валидации: сервер валидирует специфику `SECRET_SERVICE`, но не режимы `THIEF_HUNT` и `LINE_UP` | [src/server/index.ts#L980-L1015](file:///c:/Projects/detective-game/src/server/index.ts#L980-L1015) |

---

## 2. Анализ мертвого и неиспользуемого кода (Dead Code & Asset Bloat)

### 2.1. Неиспользуемые медиафайлы и ассеты-дубликаты

Сопоставление всех 92 медиафайлов на диске (`public/` и `src/assets/`) с кодом выявило 5 файлов, которые либо никогда не загружаются, либо представляют собой полные дубликаты:

1. **`src/assets/modes/maniac_preview.webp` (65.0 КБ, 66 524 байт)**  
   - [src/assets/modes/maniac_preview.webp](file:///c:/Projects/detective-game/src/assets/modes/maniac_preview.webp)
   - **Проблема:** Полный байтовый дубликат файла [public/assets/modes/maniac-banner.webp](file:///c:/Projects/detective-game/public/assets/modes/maniac-banner.webp) (66 524 байт). При этом `maniac_preview.webp` никогда не импортируется ни в одном модуле, тогда как баннеры режимов берутся из папки `public/assets/modes/`.
   - **Влияние:** Бесполезно занимает 65 КБ в репозитории и исходниках.

2. **`public/icons.svg` (4.9 КБ)**  
   - [public/icons.svg](file:///c:/Projects/detective-game/public/icons.svg)
   - **Проблема:** Файл содержит SVG-спрайт иконок. Однако в приложении все иконки переписаны на встроенные React-компоненты в [src/components/ui/Icons.tsx](file:///c:/Projects/detective-game/src/components/ui/Icons.tsx) и [src/components/ui/ActionIcons.tsx](file:///c:/Projects/detective-game/src/components/ui/ActionIcons.tsx). Ни один файл проекта не делает запрос к `/icons.svg` или `<use href="...">`.

3. **`src/assets/hero.png` (12.8 КБ)**  
   - [src/assets/hero.png](file:///c:/Projects/detective-game/src/assets/hero.png)
   - **Проблема:** Статическое изображение героя, не имеющее ни единого упоминания в коде, `index.html` или стилях.

4. **Шаблонные файлы от создания проекта через Vite:**
   - [src/assets/react.svg](file:///c:/Projects/detective-game/src/assets/react.svg) (4.0 КБ)
   - [src/assets/vite.svg](file:///c:/Projects/detective-game/src/assets/vite.svg) (8.5 КБ)
   - **Проблема:** Стандартные иконки-заглушки Vite + React, не используемые в приложении (в фавиконе и PWA используются [public/favicon.png](file:///c:/Projects/detective-game/public/favicon.png) и [public/apple-touch-icon.png](file:///c:/Projects/detective-game/public/apple-touch-icon.png)).

---

### 2.2. Нарушение архитектуры загрузки изображений персонажей (Asset Bloat)

В проекте был специально спроектирован модуль [src/constants/characterImages.ts](file:///c:/Projects/detective-game/src/constants/characterImages.ts#L1-L37), документированный следующим комментарием:
> *«Заменяет тяжеловесную блокирующую eager-загрузку в App.tsx на отложенный маппинг по требованию.»*

Однако при анализе кодовой базы обнаружено, что сразу два ключевых компонента продолжают осуществлять неконтролируемый **eager-импорт всех 50 изображений персонажей**:
- [src/components/CharacterCard.tsx#L9-L12](file:///c:/Projects/detective-game/src/components/CharacterCard.tsx#L9-L12):
  ```ts
  const characterImages = import.meta.glob<{ default: string }>(
    "../assets/characters/*.webp",
    { eager: true }
  );
  ```
- [src/components/GameOverModal.tsx#L32-L35](file:///c:/Projects/detective-game/src/components/GameOverModal.tsx#L32-L35):
  ```ts
  const localCharacterImages = import.meta.glob<{ default: string }>(
    "../assets/characters/*.webp",
    { eager: true }
  );
  ```
Кроме того, объект `characterImages` из `src/constants/characterImages.ts` передается через пропсы в 8 уровней компонентов: `App` -> `GameScreen` -> `GameModalsContainer` -> `GameLifecycleModals` -> `GameOverModal`, `DetectiveHand`, `ThiefHand`, `InspectorChoiceModal`.
В результате бандлер формирует избыточные зависимости и включает eager-маппинги в чанки `game-core` и модальных окон.

---

### 2.3. Неиспользуемые экспорты, рудименты и мертвые ветки логики

1. **Режим-призрак `EUROPOL_VS_OPG`:**
   - Место в коде: [src/utils/gameLogic.ts:546-548](file:///c:/Projects/detective-game/src/utils/gameLogic.ts#L546-L548)
   ```ts
   } else if (state.mode === "EUROPOL_VS_OPG" && newKillCount >= 6) {
     winner = "KILLER";
   }
   ```
   В `src/types/game.ts` тип `GameModeType` строго ограничен 4 режимами: `"MANIAC_VS_OPERATIVE" | "THIEF_HUNT" | "SECRET_SERVICE" | "LINE_UP"`. Условие `state.mode === "EUROPOL_VS_OPG"` физически никогда не может выполниться. Это 100% мертвый рудимент ранней версии игры.

2. **Неиспользуемая функция `setPolicePatrol`:**
   - Место в коде: [src/utils/gameLogic.ts:594-607](file:///c:/Projects/detective-game/src/utils/gameLogic.ts#L594-L607)
   - Функция экспортируется, но ни разу не вызывается ни в одном компоненте, хуке или тесте проекта.

3. **Неиспользуемый хелпер форматирования `formatCompactName`:**
   - Место в коде: [src/components/CharacterCard.tsx:33-35](file:///c:/Projects/detective-game/src/components/CharacterCard.tsx#L33-L35)
   - `export const formatCompactName = (fullName: string): string => fullName || "";` — функция нигде не вызывается.

4. **Мертвые константы в `src/constants/gameRules.ts`:**
   - Место в коде: [src/constants/gameRules.ts#L8-L23](file:///c:/Projects/detective-game/src/constants/gameRules.ts#L8-L23)
   - Константы `MIN_BET` (50), `MAX_BET` (1000), `TURN_TIMEOUT_BASE_SECONDS` (60), `TURN_TIMEOUT_DUEL_SECONDS` (45), `REMATCH_TIMEOUT_SECONDS` (15), `CONTROLLER_VIEWPORT_SIZE` (3), `TOTAL_BOARD_CELLS` (25), `DEFAULT_MAX_PLAYERS` (2), `TV_PARTY_MAX_PLAYERS` (8) объявлены с директивой `export`, но в кодовой базе не имеют ни одного потребителя. Вместо них используются литералы либо объект `TIMINGS`.

5. **Тестовые методы в продуктовых модулях:**
   - Место в коде: [src/utils/tvAudio.ts:44-50](file:///c:/Projects/detective-game/src/utils/tvAudio.ts#L44-L50)
   - Метод `_resetAudioContextForTesting` экспортируется из продуктового модуля для сброса состояния в тестах. Рекомендуется выносить такие хелперы в тестовое окружение либо закрывать директивой исключения.

6. **Устаревшие алиасы экшенов на сервере:**
   - Место в коде: [src/server/index.ts:990-1006](file:///c:/Projects/detective-game/src/server/index.ts#L990-L1006)
   - Сервер валидирует экшены: `action.type === "STEAL" || action.type === "ROB_NEIGHBOR" || action.type === "ROB"`, а также `action.type === "KILL_CHARACTER" || action.type === "TARGET_KILL"`. В актуальном клиенте используются строго `KILL_CHARACTER` и `ROB_NEIGHBOR`.

---

## 3. Качество типизации (TypeScript Type Safety & Strictness)

### 3.1. Отсутствие строгого режима в `tsconfig.app.json`
В [tsconfig.app.json](file:///c:/Projects/detective-game/tsconfig.app.json) блок `compilerOptions` **не содержит** директивы `"strict": true`:
```json
/* Linting */
"noUnusedLocals": true,
"noUnusedParameters": true,
"erasableSyntaxOnly": true,
"noFallthroughCasesInSwitch": true
```
Из-за отсутствия `strict: true` (и в частности `noImplicitAny: true` и `strictNullChecks: true`) компилятор TypeScript пропускает:
- Неявные типы `any` в аргументах функций.
- Обращения к свойствам потенциально `undefined` / `null` объектов без проверки существования.
- Небезопасные приведения `as any`, маскирующие реальные ошибки проектирования типов.

---

### 3.2. Разрыв контракта интерфейса `Character` и каскад `as any` в UI

Критический дефект проектирования базовых типов:
В файле [src/types/game.ts:11-19](file:///c:/Projects/detective-game/src/types/game.ts#L11-L19):
```ts
export interface Character {
  id: string;
  name: string;
  isAlive: boolean;
  isExonerated: boolean;
  isRobbed?: boolean;
  hasCoin?: boolean;
  unmaskedSpyIndex?: number;
}
```
При этом в ядре игры [src/utils/gameLogic.ts:682](file:///c:/Projects/detective-game/src/utils/gameLogic.ts#L682) при аресте персонажа объекту динамически присваивается свойство `isArrested: true`:
```ts
row.map((c) => (c.id === targetId ? { ...c, isArrested: true } : c))
```
Поскольку свойство `isArrested` **не объявлено** в интерфейсе `Character`, разработчики были вынуждены внедрять обходы типов во всех компонентах, работающих с полем:
- [src/components/CharacterCard.tsx:66](file:///c:/Projects/detective-game/src/components/CharacterCard.tsx#L66):
  ```ts
  if ((prevChar as any).isArrested !== (nextChar as any).isArrested) return false;
  ```
- [src/components/CharacterCard.tsx:92](file:///c:/Projects/detective-game/src/components/CharacterCard.tsx#L92):
  ```ts
  const isArrested = Boolean((character as any).isArrested);
  ```
- [src/components/tv/TvBoardView.tsx:146](file:///c:/Projects/detective-game/src/components/tv/TvBoardView.tsx#L146):
  ```ts
  if ((prevChar as any).isArrested !== (nextChar as any).isArrested) return false;
  ```
**Решение:** Добавить `isArrested?: boolean;` в интерфейс `Character` в `src/types/game.ts` и убрать все костыли `(character as any).isArrested`.

---

### 3.3. Размывание типов в сетевом слое и контроллере

1. **Сетевой клиент `PartyService` ([src/utils/partyPeer.ts](file:///c:/Projects/detective-game/src/utils/partyPeer.ts)):**
   - Строка 86: `lastSyncedState: any = null;`
   - Строка 75: `parsePacket(raw: unknown): any | null`
   - Строки 235–242:
     ```ts
     onSyncState: ((state: any, role?: Role, status?: string) => void) | null = null;
     onStateUpdate: ((state: any, role?: Role, status?: string) => void) | null = null;
     onAction: ((action: any) => void) | null = null;
     onRoomStatus: ((data: any) => void) | null = null;
     ```
   Вся сетевая шина между сервером PartyKit и клиентом оперирует типом `any`. Это полностью лишает клиент автодополнения и статической проверки корректности входящих данных от сервера.

2. **Мобильный контроллер TV Party ([src/components/controller/MobileControllerView.tsx](file:///c:/Projects/detective-game/src/components/controller/MobileControllerView.tsx)):**
   В контроллере обнаружено **11 приведений `as any`**:
   - Строки 285–295:
     ```ts
     if (Array.isArray((gameState as any)?.players) && (gameState as any).players.length > 0) {
       const fromPlayers = (gameState as any).players ...
     }
     if (Array.isArray((gameState as any)?.allCharacters) && (gameState as any).allCharacters.length > 0) {
       return (gameState as any).allCharacters;
     }
     ```
   Причина: состояние матча TV Party расширяет стандартный `GameState` полями `players` и `allCharacters`, но отдельный тип `TvPartyGameState` не был создан, что привело к массовым хакам `(gameState as any)`.

3. **Игровой редюсер ([src/utils/gameReducer.ts](file:///c:/Projects/detective-game/src/utils/gameReducer.ts)):**
   - Строка 127: `return gameReducer(state, { ...action, type: "DUEL_ACCUSE" as any });`
   - Строка 132: `const payload = action.payload as any;`
   - Строки 499–500: `filterCandidates(DUEL_CHARACTERS, history as any, "DETECTIVE")`
   Типы экшенов дуэли не синхронизированы с базовым типом `GameAction`, что вынуждает разработчика подавлять проверки через `as any`.

4. **Двойственность поля логов в `GameState`:**
   В [src/components/tv/TvBoardView.tsx:395-434](file:///c:/Projects/detective-game/src/components/tv/TvBoardView.tsx#L395-L434):
   ```ts
   const logs = gameState?.log || (gameState as any)?.logs || [];
   ```
   В `GameState` поле называется `log: string[]`. Наличие проверки `(gameState as any)?.logs` свидетельствует о рассинхронизации контрактов между сервером и клиентом.

---

### 3.4. Риски Runtime-ошибок (Non-null assertions и прямой `localStorage`)

1. **55 прямых вызовов `localStorage` в обход `storage.ts`:**
   В проекте существует специализированный отказоустойчивый класс [src/utils/storage.ts](file:///c:/Projects/detective-game/src/utils/storage.ts), поддерживающий гибридное сохранение в `IndexedDB` и `localStorage` с безопасным перехватом исключений (`try/catch`).
   Однако в 55 местах ([src/App.tsx#L106-L216](file:///c:/Projects/detective-game/src/App.tsx#L106-L216), [src/contexts/AuthContext.tsx#L75-L261](file:///c:/Projects/detective-game/src/contexts/AuthContext.tsx#L75-L261), [src/utils/audio.ts#L72](file:///c:/Projects/detective-game/src/utils/audio.ts#L72)) производятся прямые обращения:
   ```ts
   localStorage.getItem("tv_session_party_state")
   localStorage.setItem("crime_city_completed_modules", JSON.stringify(updated))
   ```
   **Риск:** В режиме инкогнито в Safari (или при жестких политиках cookies в WebView) обращение к `localStorage` вызывает исключение `DOMException: QuotaExceededError` или `SecurityError: The operation is insecure`, что приводит к аварийному завершению приложения (white screen).

2. **Опасные Non-null assertions (`!`):**
   Обнаружено 24 использования оператора `!`.
   Пример опасного извлечения карты в [src/utils/gameLogic.ts:530](file:///c:/Projects/detective-game/src/utils/gameLogic.ts#L530):
   ```ts
   newDetectiveSecretId = newDetectiveHand.shift()!;
   ```
   Если массив `newDetectiveHand` окажется пустым (например, при рассинхронизации рук в мультиплеере), `newDetectiveSecretId` получит значение `undefined`, что вызовет последующие падения в логике подсветки и проверки дистанций.

---

## 4. Анализ производительности и рендеринга (Performance & Rendering)

### 4.1. Разрушение изоляции рендеринга из-за таймера в корневом `App.tsx`

**Диагностика проблемы:**
В компоненте [src/App.tsx:427](file:///c:/Projects/detective-game/src/App.tsx#L427) подключен хук таймера матча:
```tsx
const { secondsElapsed, setSecondsElapsed } = useGameTimer({
  hasStartedEver,
  isIntroPhase,
  winner: gameState.winner,
});
```
Внутри [src/hooks/useGameTimer.ts:22](file:///c:/Projects/detective-game/src/hooks/useGameTimer.ts#L22) работает интервал:
```ts
interval = setInterval(() => {
  setSecondsElapsed((prev) => prev + 1);
}, 1000);
```
Каждую секунду вызов `setSecondsElapsed` приводит к **полному перерендериванию корневого компонента `App` (1 340 строк)**.

**Каскадный эффект на игровое поле:**
1. `App` передает `secondsElapsed={secondsElapsed}` в [src/components/GameScreen.tsx](file:///c:/Projects/detective-game/src/components/GameScreen.tsx#L196) (исключительно ради отображения секунд в шапке матча).
2. `GameScreen` ре-рендерится и передает пропсы в `<GameBoard ... />`.
3. Компонент [src/components/GameBoard.tsx:57](file:///c:/Projects/detective-game/src/components/GameBoard.tsx#L57) **НЕ ОБЕРНУТ в `React.memo`**!
4. Внутри `GameBoard` на каждой секунде:
   - Заново выполняется итерация `board.flatMap((row, rIdx) => row.map(...))` (25 ячеек).
   - В каждой из 25 итераций выполняются линейные поиски:
     ```ts
     const isRadarCell = radarCellIds.includes(character.id);
     const isKillerNeighbor = showKillerHints && dynamicKillerAdjacentIds.includes(character.id);
     const isDetectiveNeighbor = showDetectiveHints && dynamicDetectiveAdjacentIds.includes(character.id);
     const isOfficer = uniformedOfficerIds?.includes(character.id);
     ```
   - Заново создаются 25 экземпляров анимационных оберток `<motion.div layout ...>` Framer Motion.
   - Заново конструируются 25 инлайн-функций `onClick={() => handleCardClick(character.id, rIdx, cIdx)}`.
   - Заново генерируются 25 строк `neighborHighlightColor={neighborRole ? ... : null}`.
   - Запускается функция `areCharacterCardPropsEqual` для каждой из 25 карточек.

Хотя сама карточка `CharacterCard` защищена функцией `areCharacterCardPropsEqual` и пропускает обновление DOM, **весь виртуальный слой доски 5×5 и Framer Motion пересчитывается в холостом цикле каждую секунду**.

**Решение:**
Изолировать состояние таймера. Перенести `useGameTimer` из `App.tsx` непосредственно в компонент шапки матча (`GameScreenHeader` / `TimerBadge`), передавая только `startTime` или `isGameRunning`. `App` не должен ре-рендериться ради тиканья секунд.

---

### 4.2. Дублирование тяжелых UI-компонентов: `CharacterCard` vs `TvCell`

В проекте сосуществуют два параллельных, независимых компонента карточки персонажа на доске 5×5:
1. [src/components/CharacterCard.tsx](file:///c:/Projects/detective-game/src/components/CharacterCard.tsx) (297 строк) — используется в соло-игре, PvP и мобильных экранах.
2. `TvCell` внутри [src/components/tv/TvBoardView.tsx:151-364](file:///c:/Projects/detective-game/src/components/tv/TvBoardView.tsx#L151-L364) (213 строк) — используется на экране телевизора в TV Party.

Оба компонента дублируют:
- Логику определения статусов (`isDead`, `isExonerated`, `isArrested`, `hasCoin`, `unmaskedSpyIndex`).
- Отображение силуэтов (`renderSilhouette`).
- Штампы ареста, смерти, алиби и монет.
- Подсветку радаров и линий.
- Кастомные компараторы мемоизации (`areCharacterCardPropsEqual` vs `areTvCellPropsEqual`).

**Последствия:** Любое визуальное изменение или исправление багов в отображении персонажей (например, добавление нового бейджа или анимации) требует синхронной правки в двух разных местах, что нарушает принцип DRY и увеличивает риск расхождения UI.

---

### 4.3. Оптимизация бандла и чанков (Bundle Splitting & Lazy Loading)

Анализ продакшн-сборки (`npm run build`) показал следующее распределение чанков:
```
dist/assets/vendor-qr-scanner-DeYdgO6V.js   334.30 kB │ gzip: 99.84 kB
dist/assets/tv-party-Ben-RGub.js            278.95 kB │ gzip: 78.09 kB
dist/assets/vendor-supabase-7KcKRj6y.js     226.68 kB │ gzip: 58.83 kB
dist/assets/index-BSHA8aHv.js               344.02 kB │ gzip: 89.03 kB
dist/assets/vendor-react-gTtcGVxu.js        141.92 kB │ gzip: 45.46 kB
dist/assets/vendor-ui-DUb0Qx28.js           121.11 kB │ gzip: 40.44 kB
```

**Критические наблюдения:**
1. **Основной чанк приложения `index-BSHA8aHv.js` весит 344 КБ (89 КБ gzip).**  
   Причина: в [src/components/MainMenu.tsx#L13-L14](file:///c:/Projects/detective-game/src/components/MainMenu.tsx#L13-L14) экраны комнат и профиля импортируются статически:
   ```ts
   import { TablesScreen } from "./TablesScreen";
   import { ProfileScreen } from "./ProfileScreen";
   ```
   В то время как `TutorialScreen` вынесен в отдельный асинхронный чанк через `React.lazy` ([MainMenu.tsx:28](file:///c:/Projects/detective-game/src/components/MainMenu.tsx#L28)), `TablesScreen` и `ProfileScreen` загружаются сразу на старте приложения, даже если игрок просто запускает соло-матч.
2. **Чанк сканера QR-кодов (`vendor-qr-scanner`, 334 КБ):**  
   Библиотека `html5-qrcode` вынесена в отдельный чанк в `vite.config.ts`, однако в файле [src/components/controller/index.ts:4](file:///c:/Projects/detective-game/src/components/controller/index.ts#L4) содержится экспорт `export * from './QrCameraScanner';`. Любой некорректный импорт из барреля контроллера немедленно втягивает библиотеку сканирования в основной поток.

---

### 4.4. Тяжелые вычисления и сериализация в циклах рендера

1. **Сравнение через `JSON.stringify` в сетевом синхронизаторе:**
   В [src/utils/useMultiplayer.ts:76](file:///c:/Projects/detective-game/src/utils/useMultiplayer.ts#L76):
   ```ts
   if (state.lastShift && JSON.stringify(state.lastShift) !== JSON.stringify(prev.lastShift)) {
     soundManager.play("slide");
   }
   ```
   Вызов `JSON.stringify` выполняется на каждом входящем пакете синхронизации состояния. Поскольку объект `LastShift` содержит всего три примитивных поля (`type`, `index`, `direction`), сравнение через сериализацию неэффективно и создает мусор для GC.
2. **Линейные поиски в `GameBoard`:**
   Вместо передачи `Set<string>` для `radarCellIds`, `killerAdjacentIds` и `uniformedOfficerIds`, в компонент передаются обычные массивы. В результате в цикле 25 ячеек многократно вызывается `.includes()`.

---

## 5. Дублирование бизнес-логики между 4 игровыми режимами

В игре реализовано 4 ключевых режима:
1. `MANIAC_VS_OPERATIVE` (Почерк убийцы)
2. `THIEF_HUNT` (Оцепление)
3. `SECRET_SERVICE` (Директива «Ноль»)
4. `LINE_UP` (Очная ставка)

### 5.1. Архитектурное несовершенство: каскады `if (mode === ...)` вместо стратегий

Вся логика режимов реализована процедурно через разрозненные проверки `if (state.mode === ...)` и `switch (action.type)` в двух гигантских монолитах:
- [src/utils/gameLogic.ts](file:///c:/Projects/detective-game/src/utils/gameLogic.ts) (1 280 строк)
- [src/utils/gameReducer.ts](file:///c:/Projects/detective-game/src/utils/gameReducer.ts) (550 строк)

**Статистика проверок режимов в ядре:**
- `gameLogic.ts`: 13 проверок `MANIAC_VS_OPERATIVE`, 8 проверок `THIEF_HUNT`, 7 проверок `SECRET_SERVICE`, 10 проверок `LINE_UP`.
- `gameReducer.ts`: 4 проверки `MANIAC_VS_OPERATIVE`, 3 проверки `THIEF_HUNT`, 5 проверок `SECRET_SERVICE`, 3 проверки `LINE_UP`.

**Где возникает дублирование:**
1. **Проверка победы и смены масок при ликвидации/аресте:**
   Логика проверки победы дублируется между функцией `killCharacter` / `accuseCharacter` в `gameLogic.ts` и обработчиками экшенов в `gameReducer.ts`.
2. **Определение следующего хода (`resolveNextPlayerInfo`):**
   В [src/utils/gameLogic.ts:1272-1320](file:///c:/Projects/detective-game/src/utils/gameLogic.ts#L1272-L1320) логика переключения очереди между игроками содержит отдельные ветвления под каждый режим с повторяющимися паттернами ротации ходов.

### 5.2. Асимметрия серверной валидации режимов

В сервере [src/server/index.ts](file:///c:/Projects/detective-game/src/server/index.ts):
- Найдено **11 специфических проверок** для режима `SECRET_SERVICE` (контроль очереди шпионов, валидация очной ставки шпионов).
- Найдено **0 проверок** для режима `THIEF_HUNT`!
- Найдено **0 проверок** для режима `LINE_UP`!

В режимах `THIEF_HUNT` и `LINE_UP` сервер фактически не валидирует бизнес-правила (кражу только у соседей, лимит вопросов каталога), полностью доверяя клиенту или универсальному `gameReducer`. Это создает серьезный архитектурный перекос между режимами.

---

## 6. Детальные рекомендации и дорожная карта оптимизации

### Приоритет P1 (Немедленные исправления / High Impact)

1. **Изоляция игрового таймера:**
   - Вынести состояние `secondsElapsed` из [src/App.tsx](file:///c:/Projects/detective-game/src/App.tsx) в отдельный изолированный компонент `GameTimer` / `GameScreenHeader`.
   - В `GameScreen` передавать флаги состояния (`isGameRunning`, `isPaused`), но не передавать число секунд в корневой стейт.
   - Обернуть [src/components/GameBoard.tsx](file:///c:/Projects/detective-game/src/components/GameBoard.tsx) в `React.memo`.

2. **Нормализация интерфейса `Character`:**
   - В [src/types/game.ts](file:///c:/Projects/detective-game/src/types/game.ts) добавить `isArrested?: boolean;`.
   - Удалить все приведения `(character as any).isArrested` в `CharacterCard.tsx`, `TvBoardView.tsx` и тестах.

3. **Удаление мертвого кода и дубликатов ассетов:**
   - Удалить неиспользуемый файл `src/assets/modes/maniac_preview.webp` (освобождение 65 КБ).
   - Удалить шаблонные файлы `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`, `public/icons.svg`.
   - Удалить мертвую ветку `state.mode === "EUROPOL_VS_OPG"` из `src/utils/gameLogic.ts:546`.
   - Удалить мертвую функцию `setPolicePatrol` и неиспользуемый хелпер `formatCompactName`.

4. **Устранение повторного eager-импорта портретов:**
   - В `CharacterCard.tsx` и `GameOverModal.tsx` заменить локальные `import.meta.glob(..., { eager: true })` на использование единого модуля [src/constants/characterImages.ts](file:///c:/Projects/detective-game/src/constants/characterImages.ts).

---

### Приоритет P2 (Среднесрочные оптимизации / Medium Impact)

1. **Включение строгой типизации TypeScript:**
   - В [tsconfig.app.json](file:///c:/Projects/detective-game/tsconfig.app.json) включить `"strict": true`.
   - Типизировать контракты сетевых событий в `partyPeer.ts` (заменить `any` на строго типизированные интерфейсы сетевых сообщений `ServerToClientMessage`, `ClientToServerMessage`).
   - Создать расширенный тип `TvPartyGameState`, включающий `players` и `allCharacters`, избавившись от 11 кастов `as any` в `MobileControllerView.tsx`.

2. **Миграция прямых вызовов `localStorage` на `storage.ts`:**
   - Заменить 55 прямых вызовов `localStorage.getItem/setItem` на методы `storage.getSyncItem` / `storage.setSyncAndPersist`.
   - Это гарантирует 100% защиту от падений в приватном режиме Safari и WebViews.

3. **Разделение чанков (Code Splitting):**
   - В [src/components/MainMenu.tsx](file:///c:/Projects/detective-game/src/components/MainMenu.tsx) перевести `TablesScreen` и `ProfileScreen` на отложенную загрузку `React.lazy`.
   - Исключить прямой ре-экспорт `QrCameraScanner` из барреля `src/components/controller/index.ts`.

4. **Оптимизация структур данных в `GameBoard`:**
   - Преобразовывать списки `radarCellIds`, `dynamicKillerAdjacentIds` и `uniformedOfficerIds` в `Set<string>` через `useMemo`, обеспечивая поиск за `O(1)` вместо `O(N)` в каждой ячейке.
   - Заменить `JSON.stringify(state.lastShift)` в `useMultiplayer.ts` на прямое сравнение полей `type`, `index`, `direction`.

---

### Приоритет P3 (Архитектурный рефакторинг / Technical Excellence)

1. **Объединение `TvCell` и `CharacterCard`:**
   - Рефакторинг компонента `CharacterCard` для поддержки пропса режима отображения (`variant="standard" | "tv"`).
   - Устранение 230 строк дублирующегося кода в `TvBoardView.tsx`.

2. **Паттерн «Стратегия» для игровых режимов:**
   - Вынести специфические правила режимов из монолитных `gameLogic.ts` и `gameReducer.ts` в изолированные модули стратегий:
     - `src/modes/ManiacModeStrategy.ts`
     - `src/modes/ThiefHuntModeStrategy.ts`
     - `src/modes/SecretServiceModeStrategy.ts`
     - `src/modes/LineUpModeStrategy.ts`
   - Реализовать единый интерфейс `GameModeStrategy` с методами `validateMove`, `applyAction`, `checkWinCondition`, `resolveNextTurn`.

---

## 7. Итоговое заключение

Кодовая база проекта «Под подозрением» демонстрирует высокое покрытие тестами (504 успешно пройденных теста), чистую историю отсутствия `@ts-ignore` в проде и аккуратную организацию стилей в соответствии с дизайн-системой Neo-Noir.

В то же время кодовая база накопила существенный технический долг в трех областях:
1. **Эрозия типов TypeScript** из-за отключенного `strict: true`, пропущенных полей в базовых интерфейсах (`Character.isArrested`) и размывания сетевых типов (`any`).
2. **Неэффективный рендеринг**, вызванный централизованным таймером в корневом компоненте `App.tsx` и отсутствием мемоизации у `GameBoard`.
3. **Балласт неиспользуемых ассетов и дублирование тяжелых компонентов** (`CharacterCard` vs `TvCell`), которые при устранении позволят уменьшить бандл и повысить поддерживаемость проекта.

Реализация рекомендаций дорожной карты P1–P2 позволит ликвидировать паразитные ре-рендеры доски, сократить потребление оперативной памяти на мобильных устройствах и обеспечить надежный фундамент для дальнейшего развития мультиплеера.
