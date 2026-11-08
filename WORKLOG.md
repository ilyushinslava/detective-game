# Журнал работ (WORKLOG.md)

> Проект: **«Под подозрением» (Prime Suspect)**  
> Ветка: `feature/tv-party-enhancements`

---

## Запись: TASK-CONTENT-002 — Рефакторинг обучающих модулей с изоляцией асимметричных ролей и инструктивным форматом

- **ID задачи:** TASK-CONTENT-002
- **Хэш коммита:** 94b666d
- **Дата:** 2026-11-08
- **Что сделано:**
  1. **Разделение обучающих сценариев на 7 независимых модулей (`TutorialScreen.tsx`):**
     - `BASICS`: Основы Син-Сити (циклический тороидальный сдвиг рядов, сектор 3×3, правило Anti-Undo).
     - `MANIAC_KILLER`: Почерк убийцы: Контракт синдиката (игра за Убийцу: подвод первой жертвы, ликвидация строго по очереди, побег со сменой маски).
     - `MANIAC_DETECTIVE`: Почерк убийцы: Логика алиби (игра за Детектива: звуковой радиус выстрела 3×3, отсечение невиновных, задержание подозреваемого, зачистка поля).
     - `THIEF_ROBBER`: Оцепление: Карманная кража (игра за Вора: кража сокровища с защищенного тайла, экстренная маскировка в толпе).
     - `THIEF_POLICE`: Оцепление: Патрульный кордон (игра за Полицию: перекрытие секторов, выставление кордона, блокировка путей отхода и задержание).
     - `SECRET_SERVICE`: Директива Ноль (игра за Спецслужбу: радарный сканер 3×3, проверка подозреваемых, выявление двойного агента и нейтрализация).
     - `LINE_UP`: Очная ставка (Дедуктивная дуэль: опрос свидетеля по уликам, исключение непричастных, финальное обвинение).
  2. **Тактический инструктивный формат брифинга:**
     - Все сюжетные и художественные описания заменены на строгую структуру: «ЦЕЛЬ -> ДЕЙСТВИЕ -> РЕЗУЛЬТАТ».
     - Внедрены цветовые акценты: голубой (`ЦЕЛЬ`), янтарный (`ДЕЙСТВИЕ`), изумрудный (`РЕЗУЛЬТАТ`), циан (стрелки направлений).
     - Полностью сохранены исходная DOM-структура, контейнеры, модальные окна, Tailwind CSS классы и визуальный нео-нуарный стиль.
  3. **Строгая защита от неверных действий (Input Guarding):**
     - В `handleShift` и `handleSelectCharacter` добавлены строгие валидаторы целевых координат и карточек. Нецелевые клики и сдвиги не продвигают состояние FSM.
  4. **Обновление меню Академии:**
     - Каталог дел расширен до 7 карточек с тактическими описаниями.
     - Счетчик прогресса переведен на формат `X/7`, премия (+250 CR) начисляется при сдаче всех 7 уроков.
  5. **Тестирование (`tutorialFullFlow.test.tsx`):**
     - Обновлены тесты на проверку 7 модулей каталога и корректность FSM-переходов.
     - Добавлены проверки на блокировку ошибочных действий игрока.
- **Изменённые файлы:**
  - `src/components/TutorialScreen.tsx`
  - `src/components/__tests__/tutorialFullFlow.test.tsx`
  - `WORKLOG.md`
- **Проверки и результаты:**
  - `npx vitest run src/components/__tests__/tutorialFullFlow.test.tsx`: 5/5 тестов passed (100%).
  - `npm test`: 42 сьюта, 262/262 тестов passed (100%).
  - `npm run build`: Код завершения 0, чистая сборка PWA, `TutorialScreen-*.js` 51.00 kB.
- **Способ отката:**
  - `git reset --hard HEAD~1`

---

## Запись: TASK-CONTENT-001 — Обучающий сценарий для режима «Очная ставка» (LINE_UP)

- **ID задачи:** TASK-CONTENT-001
- **Хэш коммита:** 37c16287daaa5d0b92048e198b482a7fb4f687dd
- **Дата:** 2026-11-08
- **Что сделано:**
  1. **Интеграция сценария LINE_UP в FSM `TutorialScreen.tsx`:**
     - Расширен тип `TutorialModule`: добавлено значение `"LINE_UP"`.
     - В `getInitialBoard` добавлена конфигурация начального поля дуэли со стартовой расстановкой.
     - Реализован дедуктивный цикл:
       - **Шаг 1:** Запрос к свидетелю из каталога примет («Есть ли головной убор?»).
       - **Шаг 2:** Получение положительного ответа свидетеля (`ДА`).
       - **Шаг 3:** Процесс исключения непричастных (`isExonerated = true`) и выбор оставшегося фигуранта Руслана Громова (#01).
       - **Шаг 4:** Предъявление обвинения (`handleAccuseDuel`) с арестом подозреваемого.
       - **Шаг 5:** Завершение дела и фиксация прогресса в `localStorage` (`crime_city_completed_modules`).
  2. **Интерфейс каталога Академии:**
     - Добавлена карточка 5-го модуля «Очная ставка (Дуэль дедукции)».
     - Обновлен счетчик прогресса прохождения дел (X/5) и условие завершения курса с премией (+250 CR).
  3. **Тестирование (`src/components/__tests__/tutorialFullFlow.test.tsx`):**
     - Добавлен сквозной интеграционный тест `Сценарий 'Очная ставка' (LINE_UP): опрос свидетеля, отсечение по алиби и финальное обвинение`.
     - Обновлены проверки отображения 5 модулей и сохранения прогресса.
- **Изменённые файлы:**
  - `src/components/TutorialScreen.tsx`
  - `src/components/__tests__/tutorialFullFlow.test.tsx`
  - `WORKLOG.md`
- **Проверки и результаты:**
  - `npx vitest run src/components/__tests__/tutorialFullFlow.test.tsx`: 4/4 тестов passed (100%).
  - `npm test`: 42 сьюта, 261/261 тестов passed (100%).
  - `npm run build`: Код завершения 0, чистая сборка PWA.
- **Способ отката:**
  - `git reset --hard HEAD~1`

---

## Запись: TASK-ARCH-001 — Оптимизация размера стартового JS-бандла (Code Splitting via React.lazy)

- **ID задачи:** TASK-ARCH-001
- **Хэш коммита:** a80945096e877b533b9cf94c336326a61574b5e6
- **Дата:** 2026-11-08
- **Что сделано:**
  1. **Динамический импорт второстепенных экранов в `src/App.tsx`:**
     - Переведены на `React.lazy`: `DuelScreen`, `TvBoardView`, `TvLobbyView`, `MobileControllerView`, `ControllerConnectView`.
     - Все ленивые экраны обёрнуты в `<Suspense fallback={<ScreenFallback />}>` с нео-нуарным легковесным индикатором загрузки (`ScreenFallback`).
  2. **Динамический импорт модульных экранов в `src/components/MainMenu.tsx`:**
     - Переведены на `React.lazy`: `TutorialScreen`, `TablesScreen`, `ProfileScreen`.
     - Отрендерены с использованием `Suspense` и fallback-компонента при переключении табов и открытии академии.
  3. **Результаты разделения чанков и устранение предупреждений Vite:**
     - Размер стартового чанка `index.js` уменьшен с **509.79 kB** (gzip: 125.96 kB) до **362.15 kB** (gzip: 89.76 kB) — снижение на ~29% (~148 kB).
     - Предупреждение сборщика Vite `(!) Some chunks are larger than 500 kB after minification` полностью устранено.
     - Логически выделены изолированные чанки в `dist/assets`:
       - `dist/assets/TablesScreen-*.js` — 7.43 kB (gzip: 2.66 kB)
       - `dist/assets/ControllerConnectView-*.js` — 7.43 kB (gzip: 2.54 kB)
       - `dist/assets/DuelScreen-*.js` — 9.34 kB (gzip: 3.38 kB)
       - `dist/assets/ProfileScreen-*.js` — 10.64 kB (gzip: 2.82 kB)
       - `dist/assets/TvBoardView-*.js` — 18.36 kB (gzip: 5.18 kB)
       - `dist/assets/TvLobbyView-*.js` — 28.16 kB (gzip: 10.10 kB)
       - `dist/assets/MobileControllerView-*.js` — 35.24 kB (gzip: 9.35 kB)
       - `dist/assets/TutorialScreen-*.js` — 37.09 kB (gzip: 9.19 kB)
- **Изменённые файлы:**
  - `src/App.tsx`
  - `src/components/MainMenu.tsx`
  - `WORKLOG.md`
- **Проверки и результаты:**
  - `npm run build`: Код завершения 0, чистая сборка, 0 предупреждений о превышении лимита 500 kB.
  - `npm test`: 42 сьюта, 260/260 тестов passed (100%).
- **Способ отката:**
  - `git reset --hard HEAD~1`

---

## Запись: TASK-UI-001 — Блокировка сквозных тач-событий, QR-код лобби ТВ и безопасный виброотклик

- **ID задачи:** TASK-UI-001
- **Хэш коммита:** 3ee261bf8f539e7ca9bef8c8b7a50cebb610e8df
- **Дата:** 2026-11-08
- **Что сделано:**
  1. **Изоляция тач- и pointer-событий модальных окон (DEBT-04):**
     - В `src/components/ui/Modal.tsx` на оверлее и модальной карточке реализован перехват и остановка всплытия событий: `onTouchStart`, `onTouchMove`, `onTouchEnd`, `onPointerDown`, `onPointerMove`, `onPointerUp`.
     - Карточке диалога заданы `touch-pan-y` и `overscroll-contain` (а в `src/index.css` добавлен вспомогательный класс `.modal-content-scrollable`), гарантирующие плавный вертикальный скролл длинного текста внутри модалки без сквозных жестов на `GameBoard`.
     - Добавлен юнит-тест в `src/components/__tests__/componentsUI.test.tsx`, подтверждающий изоляцию событий от родительских слоев.
  2. **Локальная LAN-маршрутизация QR-кода в TV Party (DEBT-02):**
     - В `src/components/tv/TvLobbyView.tsx` расширен механизм работы с локальным сетевым адресом хоста (`localStorage`, query-параметр `lanHost`, автодополнение порта текущего сервера при вводе IP).
     - При запуске ТВ на `localhost` добавлен визуальный блок предупреждения и быстрого указания IP для подключения смартфонов по домашней сети Wi-Fi.
  3. **Безопасная инициализация тактильного отклика и фолбеки для iOS (DEBT-05):**
     - В `src/utils/haptics.ts` внедрена обёртка `safeVibrate` со строгой проверкой `typeof navigator.vibrate === 'function'` и перехватом исключений безопасности WebKit (`NotAllowedError`).
     - Обеспечен устойчивый DOM-фолбек на основе скрытого switch-элемента для Taptic Engine в Safari iOS и поддержка `webkit.messageHandlers`.
     - В `src/utils/__tests__/audioAndHaptics.test.ts` добавлены тесты на отсутствие сбоев при `navigator.vibrate === undefined` и при перехвате ошибок.
  4. **Реестр технического долга (`docs/TECHNICAL_DEBT.md`):**
     - Статусы `DEBT-02`, `DEBT-04` и `DEBT-05` обновлены на `RESOLVED`.
- **Изменённые файлы:**
  - `src/components/ui/Modal.tsx`
  - `src/index.css`
  - `src/components/tv/TvLobbyView.tsx`
  - `src/utils/haptics.ts`
  - `src/components/__tests__/componentsUI.test.tsx`
  - `src/utils/__tests__/audioAndHaptics.test.ts`
  - `docs/TECHNICAL_DEBT.md`
  - `WORKLOG.md`
- **Проверки и результаты:**
  - `npm test`: 42 тест-файла, 260/260 тестов passed (100%).
  - `npm run build`: Сборка Vite и генерация PWA Service Worker завершены успешно без ошибок (exit code 0).
- **Способ отката:**
  - `git reset --hard HEAD~1`

---

## Запись: TASK-SEC-001 — Устранение уязвимости несанкционированного перезапуска матча гостем (DEBT-03)

- **ID задачи:** TASK-SEC-001
- **Хэш коммита:** 8764a95ff215913459ae3e173785c0c489a0cee9
- **Дата:** 2026-11-08
- **Что сделано:**
  1. Реализован TDD-тест в `src/utils/__tests__/serverSecurity.test.ts` (`SEC-04: CONFIRM_RESTART Privilege Enforcement`), воспроизводящий отправку несанкционированного `CONFIRM_RESTART` гостем без запроса от хоста.
  2. Подтверждена воспроизводимость уязвимости до внедрения фикса (отклонение с причиной `NOT_HOST` отсутствовало).
  3. В `src/server/index.ts` внедрена валидация полномочий:
     - Если отправитель сообщения не является хостом (`!player?.isHost`) и отсутствует согласие/запрос со стороны хоста (`!isHostConsentGiven`), сервер отвергает действие с кодом `ACTION_REJECTED` (`reason: "NOT_HOST"`), пишет предупреждение в лог и прерывает обработку.
     - Сохранен легитимный сценарий двухстороннего подтверждения реванша (когда реванш был предварительно запрошен хостом: `restartRequestedBy === hostPlayer.clientId`).
  4. Обновлен статус `DEBT-03` в `docs/TECHNICAL_DEBT.md` на `RESOLVED`.
- **Изменённые файлы:**
  - `src/server/index.ts`
  - `src/utils/__tests__/serverSecurity.test.ts`
  - `docs/TECHNICAL_DEBT.md`
  - `WORKLOG.md`
- **Проверки и результаты:**
  - `npx vitest run src/utils/__tests__/serverSecurity.test.ts`: 9/9 тестов passed (100%).
  - `npx vitest run src/utils/__tests__/roomLifecycleAndSecurity.test.ts`: 17/17 тестов passed (100%).
  - `npm test`: 42 тест-файла, 257/257 тестов passed (100%).
  - `npm run build`: Сборка Vite и генерация PWA Service Worker завершены успешно без ошибок (exit code 0).
- **Способ отката:**
  - `git reset --hard HEAD~1`

---

## Запись: TASK-CORE-001 — Фиксация неотслеживаемых файлов, синхронизация названия и очистка от рудиментов SKHVATKA

- **ID задачи:** TASK-CORE-001
- **Хэш коммита:** 6792f3f5d0c1d0a55a4ca0cde68ef715d3c9acbb
- **Дата:** 2026-11-08
- **Что сделано:**
  1. Зафиксированы в Git критически важные для компиляции и UI файлы:
     - `src/components/ui/Button.tsx`
     - `src/components/ui/Modal.tsx`
     - `src/constants/gameMeta.ts`
     - `public/assets/modes/base-banner.png`
     - `public/assets/modes/maniac-banner.png`
     - `PROJECT_CONTEXT.md`
  2. В `src/config/gameConfig.ts` эталонное название проекта синхронизировано как «Под подозрением» (`APP_NAME: "Под подозрением"`, `APP_FULL_TITLE: "Под подозрением: Последний выстрел"`).
  3. В `src/components/TutorialScreen.tsx` полностью удалены ссылки на несуществующий режим `SKHVATKA`:
     - Модуль переведён на канонический идентификатор `BASICS` («Основы Син-Сити»).
     - Переменная `skhvatkaBanditId` переименована в `basicsPlayerId`.
     - Скорректирован fallback режима в `GameBoard` с невалидного `"SKHVATKA"` на `"MANIAC_VS_OPERATIVE"`.
  4. Обновлены сопутствующие тесты в `src/components/__tests__/tutorialFullFlow.test.tsx`.
- **Изменённые и добавленные файлы:**
  - `src/config/gameConfig.ts`
  - `src/components/TutorialScreen.tsx`
  - `src/components/__tests__/tutorialFullFlow.test.tsx`
  - `src/components/ui/Button.tsx`
  - `src/components/ui/Modal.tsx`
  - `src/constants/gameMeta.ts`
  - `public/assets/modes/base-banner.png`
  - `public/assets/modes/maniac-banner.png`
  - `PROJECT_CONTEXT.md`
  - `WORKLOG.md`
- **Проверки и результаты:**
  - `npm test`: 42 тест-файла, 255/255 тестов passed (100%).
  - `npm run build`: Сборка Vite и генерация PWA Workbox завершены успешно.
  - `npx tsc --noEmit`: 0 ошибок компиляции TypeScript.
- **Известные проблемы и замечания:**
  - Внутренняя логика `Button.tsx` и `Modal.tsx` сохранена без рефакторинга в соответствии с ограничениями задачи.
- **Способ отката:**
  - `git reset --hard HEAD~1`
