# Журнал работ (WORKLOG.md)

> Проект: **«Под подозрением» (Prime Suspect)**  
> Ветка: `feature/tv-party-enhancements`

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
