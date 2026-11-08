# Журнал работ (WORKLOG.md)

> Проект: **«Под подозрением» (Prime Suspect)**  
> Ветка: `feature/tv-party-enhancements`

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
