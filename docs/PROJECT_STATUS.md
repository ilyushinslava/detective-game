# Сводный статус проекта: что сделано / что впереди

> Проект: **«Под подозрением» (Prime Suspect)**
> Дата сводки: **2026-11-27**
> Ветка: **`main`**, HEAD **`b7cd640`**, синхронизирован с `origin/main`
> Вердикт: **полный сьют зелёный — 114 тест-файлов, 801 тест, 100% passed (~42 с); `npx tsc --noEmit` — exit 0; `npm run build` — успешно, CSP-мета присутствует в `dist/index.html`.**

Это оперативная сводка, а не полный отчёт. Детали и приоритизированный бэклог — в [docs/audit/SUMMARY.md](file:///c:/Projects/detective-game/docs/audit/SUMMARY.md) и [docs/archive/TECHNICAL_DEBT.md](file:///c:/Projects/detective-game/docs/archive/TECHNICAL_DEBT.md).

---

## 1. Сделано (сессия закрытия спринта 2)

|  №  | Задача                            | Суть                                                                                                                                                                                                                                                                                                                                    | Коммиты                     |
| :-: | :-------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------- |
|  1  | **2.3 / SEC-NET-05**              | Серверная проверка радиуса 3×3 для `KILL_CHARACTER`/`TARGET_KILL`, `ROB_NEIGHBOR`/`ROB`/`STEAL`, `ACCUSE`/`ARREST`, `CAPTURE_SPY`/`INTERROGATE`; новый код `TARGET_NOT_IN_RADIUS`, страховка `ACTION_NOT_APPLIED`. Сьют [spatialValidation.test.ts](file:///c:/Projects/detective-game/src/server/__tests__/spatialValidation.test.ts). | `94447be` → merge `b72fa74` |
|  2  | **2.4**                           | Клиентская обработка отказов: `isActionRejectReason`, дедупликация `SYNC_ERROR` + `ACTION_REJECTED`, отказ не перетирается снапшотом, неблокирующая плашка [MatchStatusBanner.tsx](file:///c:/Projects/detective-game/src/components/MatchStatusBanner.tsx), звук `deny` только для десктоп-онлайн.                                     | `6a0d143` → merge `a2ae60a` |
|  3  | **Синхронизация документации**    | Актуализация спринта 2, статус `SEC-NET-04`.                                                                                                                                                                                                                                                                                            | `2cea735` → merge `67ed8c4` |
|  4  | **SEC-NET-06**                    | Гонка реконнекта: `sessionEpoch`, stale-close guard, коды `SESSION_SUPERSEDED` / `SESSION_CONFLICT`, защита границ таймеров, фикс `playerIndex` / `CLIENT_BACKGROUNDED`. Сьют [sessionReconnectRace.test.ts](file:///c:/Projects/detective-game/src/server/__tests__/sessionReconnectRace.test.ts).                                     | `bff0d69` → merge `afed166` |
|  5  | **TV-REJECT**                     | Плашка причины отказа на ТВ-экране (10-foot UI) + relay на ТВ-дисплеи.                                                                                                                                                                                                                                                                  | `84cb630` → merge `6f155e7` |
|  6  | **TOOL-VITEST**                   | `vitest` 1.6.1 → 2.1.9, снят Windows-дефект регистра диска.                                                                                                                                                                                                                                                                             | `ac72d19` → merge `fcb9d93` |
|  7  | **SEC-NET-04-T**                  | Тесты дуэльных блокировок [duelProhibitedActions.test.ts](file:///c:/Projects/detective-game/src/server/__tests__/duelProhibitedActions.test.ts).                                                                                                                                                                                       | `b6178eb` → merge `78bb22a` |
|  8  | **SESSION_SUPERSEDED на клиенте** | Обработка без автопереподключения + модалка «Сессия открыта в другой вкладке».                                                                                                                                                                                                                                                          | `034524f` → merge `da28469` |
|  9  | **Ротация `authToken`**           | Окно совместимости 60 с. Сьют [authTokenRotation.test.ts](file:///c:/Projects/detective-game/src/server/__tests__/authTokenRotation.test.ts).                                                                                                                                                                                           | `024e82c` → merge `3e57ff8` |
| 10  | **Граничные ТВ-тесты плашки**     | [TvRejectEdgeCases.test.tsx](file:///c:/Projects/detective-game/src/components/tv/__tests__/TvRejectEdgeCases.test.tsx).                                                                                                                                                                                                                | `de321d7` → merge `d277ee4` |
| 11  | **Плашка на контроллере**         | Инлайн-причина отказа на мобильном контроллере, тест [MobileControllerReject.test.tsx](file:///c:/Projects/detective-game/src/components/controller/__tests__/MobileControllerReject.test.tsx).                                                                                                                                         | `a41abed` → merge `b323c63` |
| 12  | **MEM-RES-03 / SEC-NET-07**       | Refs таймеров подсветки; освобождение позывных в `guestRegistry`.                                                                                                                                                                                                                                                                       | `42131a3` → merge `981327a` |
| 13  | **SEC-ENV-01 / SEC-ENV-02**       | CSP для production [cspPolicy.ts](file:///c:/Projects/detective-game/src/config/cspPolicy.ts) и CORS-allowlist [cors.ts](file:///c:/Projects/detective-game/src/server/cors.ts).                                                                                                                                                        | `225dcfb` → merge `613166d` |
| 14  | **Документация**                  | Актуальные числа и статусы в базе знаний.                                                                                                                                                                                                                                                                                               | `f36627b` → merge `a10c848` |
| 15  | **Фикс jsdom-шума**               | Устранён шум `HTMLMediaElement.play()` в ТВ-тесте, полный сьют 801/801.                                                                                                                                                                                                                                                                 | `04ec708` → merge `b7cd640` |

Итог: сетевой спринт 2 (`SEC-NET`) закрыт, кроме отложенного `DEBT-01` (см. раздел 2.D).

---

## 2. Что впереди

### A. Нужны продуктовые решения владельца

- **Приватность текста причины отказа на общем ТВ-экране.** Плашку видит и соперник. Решить: показывать полный текст, показывать обобщённо или скрывать.
- **Где ещё нужен текст причины отказа.** Открытый вопрос по дуэльному экрану `LINE_UP` — показывать ли причину там.

### B. Инфраструктура и хостинг (вне кода приложения)

- `frame-ancestors` / `X-Frame-Options` **не работают через `<meta>` CSP** — настраиваются только HTTP-заголовком на хостинге.
- При использовании кастомного `VITE_WS_GATEWAY` нужно расширять `connect-src` в CSP.
- Для PartyKit Cloud при необходимости задать `ALLOWED_ORIGINS`.

### C. Проверки только на реальных устройствах (не выполнялись)

- **ТВ 1280×720 / 1920×1080 и Android TV:** рендер, safe area, 10-foot читаемость, навигация D-Pad, отсутствие скролла.
- **Мобильный контроллер 375×667:** геометрия инлайн-плашки отказа, возможное визуальное наложение на нижний ряд сетки, отсутствие вертикального скролла.
- **CSP в браузере:** DevTools → Console на нарушения политики.
- **`SESSION_SUPERSEDED` и ротация `authToken`** на реальных устройствах: контроллер, ТВ, приватные комнаты.

### D. Отложено / не делалось

- **`DEBT-01` / `LINE_UP`** — режим заморожен по решению владельца: `CRIT-02` split-brain `duelReducer` / `gameReducer`, `CRIT-03` сломанный `questionId` на мобильном контроллере ТВ, `ARC-LU-02` ИИ-бот в оффлайн-дуэли, `ARC-LU-05` атрибуты внешности на карточках.
- **`DEBT-02`** — стресс-тест ТВ на слабом Android TV.

### E. Кандидаты в техдолг (найдены по ходу)

- `guestRegistry.generateCallsign()` вызывается как аргумент `sanitizePlayerName` на каждом подключении (включая ТВ) и занимает лишний номер позывного.
- jsdom-шум `HTMLMediaElement.play()` печатается в `stderr` в ряде ТВ-тестов (не падения).
- `hostToken` не ротируется, в отличие от `authToken`.

---

## 3. Как проверить локально

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

Ожидаемо: типы без ошибок, **801 тест — 100% passed**, production-сборка успешна с CSP-метой в `dist/index.html`.

---

## 4. Правила фиксации изменений

1. Работа в отдельной ветке (`feature/*`, `fix/*`, `docs/*`), прямой коммит в `main` запрещён.
2. Коммит с осмысленным сообщением на русском языке.
3. Слияние в `main` только через `git merge --no-ff`.
4. `git push origin main` — **без force push**.
5. После слияния ветку удалить (`git branch -d`).
