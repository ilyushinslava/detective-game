# Отчет аудита №1: Безопасность, сетевой слой и утечки памяти

> **Проект:** «Под подозрением» (Prime Suspect)  
> **Репозиторий:** `ilyushinslava/detective-game`  
> **Дата проведения аудита:** 19 ноября 2026 г.  
> **Аудитор:** Субагент 1 (Аудит безопасности, сети и утечек памяти)  
> **Статус проверки:** Завершен (Кодовая база: `src/server`, `src/utils`, `src/hooks`, `src/components`, `src/contexts`, `party-server`)  
> **Режим проверки:** Strict Read-Only

---

## 1. Сводная статистика и карта рисков

В ходе глубокого исследования кодовой базы было детально проанализировано 18 ключевых модулей сетевого взаимодействия, валидации действий, маскирования данных, управления сессиями и жизненного цикла React-компонентов.

### Таблица найденных уязвимостей и дефектов

| ID | Область | Критичность | Описание дефекта | Файл и строка |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-NET-01** | Сетевой слой | **CRITICAL** | Фальсификация победы через экшен `CAPTURE_SPY` вне режима `SECRET_SERVICE` | [src/server/index.ts#L1479-L1532](file:///c:/Projects/detective-game/src/server/index.ts#L1479-L1532) <br> [src/utils/gameReducer.ts#L131-L200](file:///c:/Projects/detective-game/src/utils/gameReducer.ts#L131-L200) |
| **SEC-NET-02** | Экономика / Сеть | **HIGH** | Несанкционированная накрутка банка матча через клиентский экшен `SET_MATCH_POT` | [src/server/index.ts#L1189-L1215](file:///c:/Projects/detective-game/src/server/index.ts#L1189-L1215) <br> [src/utils/gameReducer.ts#L523-L528](file:///c:/Projects/detective-game/src/utils/gameReducer.ts#L523-L528) |
| **SEC-NET-03** | Античит / Маскирование | **HIGH** | Утечка карт дуэли (`duelSecretKillerId`, `duelSecretDetectiveId`) и руки грабителя в `maskStateForPlayer` | [src/server/index.ts#L1666-L1737](file:///c:/Projects/detective-game/src/server/index.ts#L1666-L1737) |
| **SEC-NET-04** | Сетевой слой | **HIGH** | Срыв дуэли и подделка победы по тай-брейку через `RESTART_DUEL` и `RESOLVE_DUEL_TIE_BREAK` | [src/server/index.ts#L1144](file:///c:/Projects/detective-game/src/server/index.ts#L1144) <br> [src/utils/gameReducer.ts#L471-L508](file:///c:/Projects/detective-game/src/utils/gameReducer.ts#L471-L508) |
| **SEC-NET-05** | Игровая логика | **MEDIUM** | Отсутствие серверной валидации дистанции (3×3) и правил для целевых действий `ACCUSE`, `KILL_CHARACTER`, `ROB_NEIGHBOR` | [src/server/index.ts#L980-L1015](file:///c:/Projects/detective-game/src/server/index.ts#L980-L1015) |
| **SEC-NET-06** | Сессии / Reconnect | **MEDIUM** | Потенциальное состояние гонки (Race Condition) при переподключении сокетов с `authToken` | [src/server/index.ts#L570-L639](file:///c:/Projects/detective-game/src/server/index.ts#L570-L639) <br> [src/server/index.ts#L855-L917](file:///c:/Projects/detective-game/src/server/index.ts#L855-L917) |
| **SEC-NET-07** | Сессии / Гости | **LOW** | Зависание занятого номера гостя в реестре `guestRegistry` при нештатном закрытии комнаты хостом | [src/server/index.ts#L870-L873](file:///c:/Projects/detective-game/src/server/index.ts#L870-L873) <br> [src/utils/guestManager.ts#L13-L53](file:///c:/Projects/detective-game/src/utils/guestManager.ts#L13-L53) |
| **SEC-ENV-01** | Окружение | **HIGH** | Отсутствие политики Content Security Policy (CSP) в `index.html` | [index.html#L1-L23](file:///c:/Projects/detective-game/index.html#L1-L23) |
| **SEC-ENV-02** | Окружение / CORS | **MEDIUM** | Чрезмерно открытый CORS (`Access-Control-Allow-Origin: *`) на всех эндпоинтах комнат и лобби | [src/server/index.ts#L309](file:///c:/Projects/detective-game/src/server/index.ts#L309) <br> [src/server/lobby.ts#L155](file:///c:/Projects/detective-game/src/server/lobby.ts#L155) |
| **SEC-ENV-03** | Хранилище / Токены | **MEDIUM** | Незащищенное хранение профиля и сессионных токенов в `localStorage` с риском подделки в офлайн-режиме | [src/contexts/AuthContext.tsx#L75-L115](file:///c:/Projects/detective-game/src/contexts/AuthContext.tsx#L75-L115) <br> [src/utils/storage.ts#L129-L149](file:///c:/Projects/detective-game/src/utils/storage.ts#L129-L149) |
| **SEC-ENV-04** | Инфраструктура | **LOW** | Риск захвата сторонних доменов (Dangling DNS) через зашитые резервные шлюзы `FALLBACK_GATEWAYS` | [src/config/gameConfig.ts#L18-L21](file:///c:/Projects/detective-game/src/config/gameConfig.ts#L18-L21) |
| **MEM-RES-01** | React / Утечки | **HIGH** | Утечка памяти и накопление замыканий через антипаттерн monkey-patching коллбэков синглтона `partyService` | [src/utils/partyPeer.ts#L235-L245](file:///c:/Projects/detective-game/src/utils/partyPeer.ts#L235-L245) <br> [src/components/RoleRevealModal.tsx#L51-L81](file:///c:/Projects/detective-game/src/components/RoleRevealModal.tsx#L51-L81) <br> [src/components/controller/MobileControllerView.tsx#L216-L258](file:///c:/Projects/detective-game/src/components/controller/MobileControllerView.tsx#L216-L258) |
| **MEM-RES-02** | Аудиосистема | **MEDIUM** | Нарушение регламента проекта (запрет `createOscillator`) и утечка аудио-узлов в `audio.ts` | [src/utils/audio.ts#L292-L342](file:///c:/Projects/detective-game/src/utils/audio.ts#L292-L342) <br> [src/utils/audio.ts#L393-L502](file:///c:/Projects/detective-game/src/utils/audio.ts#L393-L502) |
| **MEM-RES-03** | React / Таймеры | **MEDIUM** | Висящие `setTimeout(500ms)` с вызовом `setState` на размонтированном компоненте | [src/hooks/useGameActions.ts#L268](file:///c:/Projects/detective-game/src/hooks/useGameActions.ts#L268) <br> [src/components/controller/MobileControllerView.tsx#L246](file:///c:/Projects/detective-game/src/components/controller/MobileControllerView.tsx#L246) |
| **MEM-RES-04** | Event Listeners | **LOW** | Неотменяемый глобальный слушатель `visibilitychange` в конструкторе синглтона `PartyService` | [src/utils/partyPeer.ts#L248-L262](file:///c:/Projects/detective-game/src/utils/partyPeer.ts#L248-L262) |

---

## 2. Глубокий анализ сетевого слоя и безопасности мультиплеера

### SEC-NET-01: Фальсификация победы через экшен `CAPTURE_SPY` вне режима `SECRET_SERVICE`
- **Уровень критичности:** `CRITICAL`
- **Место в коде:**
  - Сервер: [src/server/index.ts:1479-1532](file:///c:/Projects/detective-game/src/server/index.ts#L1479-L1532)
  - Редюсер: [src/utils/gameReducer.ts:131-200](file:///c:/Projects/detective-game/src/utils/gameReducer.ts#L131-L200)
- **Описание проблемы:**
  В сервере `GameRoomServer.onMessage` валидация и пересчет полей экшена `CAPTURE_SPY` (проверка попадания `isHit`, определение пойманного шпиона, раскрытие роли) выполняются **строго** под условием:
  ```ts
  if (action.type === "CAPTURE_SPY" && this.state.mode === "SECRET_SERVICE") {
    // вычисление реального попадания, перезапись action.payload
  }
  ```
  Если текущий матч проходит в любом другом режиме (`MANIAC_VS_OPERATIVE`, `THIEF_HUNT`, `LINE_UP`), условие не выполняется, и входящий экшен передается в `gameReducer(this.state.gameState, action)` в неизменном виде.
  В свою очередь, `gameReducer` содержит следующую логику:
  ```ts
  case "CAPTURE_SPY": {
    const payload = action.payload as any;
    const explicitHit = payload?.isHit === true || Boolean(payload?.caughtSpyId);
    if (explicitHit && targetId) {
      // ...
      const attacker = nextSpies[attackerIndex];
      const isWin = (attacker?.trophies ?? 0) >= targetTrophies;
      const winner = isWin ? (attackerIndex === 0 ? "KILLER" : "DETECTIVE") : (payload?.winner || state.winner);
      return { ...state, winner, ... };
    }
  }
  ```
- **Сценарий атаки:**
  1. Злоумышленник находится в онлайн-матче режима `MANIAC_VS_OPERATIVE`.
  2. Дождавшись своего хода, злоумышленник отправляет по WebSocket пакет:
     ```json
     {
       "type": "CAPTURE_SPY",
       "payload": {
         "targetId": "char_1",
         "isHit": true,
         "winner": "KILLER"
       }
     }
     ```
  3. Сервер пропускает экшен через `validateActionLogic` (очередь хода совпадает, `char_1` жив и находится на поле).
  4. Блок строки 1479 игнорируется, так как режим не `SECRET_SERVICE`.
  5. В `gameReducer` массив `state.spies` пуст/не определен, `isWin` ложно, а `winner` берется из непроверенного клиентского поля `payload.winner` (`"KILLER"`).
  6. Сервер фиксирует `nextState.winner = "KILLER"`, переводит статус комнаты в `"FINISHED"`, рассылает всем клиентам подтверждение победы и завершает матч.
- **Рекомендуемое исправление:**
  В `validateActionLogic` добавить проверку соответствия типа экшена текущему режиму игры (`mode`). Сервер обязан немедленно отклонять экшены `CAPTURE_SPY`, `INTERROGATE`, если `state.mode !== "SECRET_SERVICE"`. В `gameReducer` категорически запретить чтение `payload.winner` из клиентского пейлоуда.

---

### SEC-NET-02: Эксплойт экономики матча через невалидируемый экшен `SET_MATCH_POT`
- **Уровень критичности:** `HIGH`
- **Место в коде:**
  - Сервер: [src/server/index.ts:1144, 1189-1215](file:///c:/Projects/detective-game/src/server/index.ts#L1144)
  - Редюсер: [src/utils/gameReducer.ts:523-528](file:///c:/Projects/detective-game/src/utils/gameReducer.ts#L523-L528)
  - Начисление награды: [src/hooks/useMatchEndHandler.ts:64](file:///c:/Projects/detective-game/src/hooks/useMatchEndHandler.ts#L64)
- **Описание проблемы:**
  Экшен `SET_MATCH_POT` изменяет размер призового фонда:
  ```ts
  case "SET_MATCH_POT":
    return {
      ...state,
      matchPot: action.payload.pot,
      matchBet: action.payload.bet,
    };
  ```
  В `GameRoomServer` экшен `SET_MATCH_POT` не входит в список системных или запрещенных команд. Во время своего хода игрок может прислать любое значение банка. После завершения матча хук `useMatchEndHandler` вызывает `awardPrize(gameState.matchPot || 0)`, который начисляет валюту в локальный профиль игрока и сохраняет ее в базу данных.
- **Сценарий атаки:**
  Клиент отправляет `{ "type": "SET_MATCH_POT", "payload": { "pot": 99999999, "bet": 99999999 } }`, после чего делает победный ход или дожидается сдачи оппонента. Клиент получает 99 999 999 внутриигровых кредитов.
- **Рекомендуемое исправление:**
  Заблокировать экшен `SET_MATCH_POT` на сервере для клиентских сообщений. Вычисление `matchPot` должно производиться строго на сервере при создании комнаты и старте матча исходя из ставок игроков.

---

### SEC-NET-03: Утечка карт дуэли и руки грабителя в `maskStateForPlayer`
- **Уровень критичности:** `HIGH`
- **Место в коде:**
  - Сервер: [src/server/index.ts:1666-1737](file:///c:/Projects/detective-game/src/server/index.ts#L1666-L1737)
- **Описание проблемы:**
  Для экрана телевизора в методе `maskStateForTv` зануляются все секретные идентификаторы дуэли:
  ```ts
  copy.duelSecretKillerId = null;
  copy.duelSecretDetectiveId = null;
  copy.killerRoleCard = null;
  copy.detectiveRoleCard = null;
  copy.robberHand = [];
  ```
  Однако в функции фильтрации для игроков `maskStateForPlayer()` (строки 1666–1737) данные поля **не маскируются**:
  - `duelSecretKillerId` и `duelSecretDetectiveId` остаются в объекте `copy` и передаются обоим соперникам по WebSocket в сообщениях `STATE_UPDATE` и `SYNC_STATE`.
  - Поле `robberHand` (рука грабителя в режиме `THIEF_HUNT`) не зануляется при отправке состояния Инспектору.
  - Поля `killerRoleCard` и `detectiveRoleCard` не фильтруются для противоположной роли.
- **Сценарий атаки:**
  Игрок открывает вкладку `Network -> WS` в DevTools браузера или смотрит свойство `partyService.lastSyncedState` в консоли. В режиме «Опознание» (Дуэль) игрок мгновенно видит карту соперника `state.duelSecretKillerId` и на первом же ходу заявляет точное безошибочное обвинение.
- **Рекомендуемое исправление:**
  Добавить маскирование в `maskStateForPlayer`:
  ```ts
  if (role === "KILLER") {
    copy.detectiveSecretId = null;
    copy.duelSecretDetectiveId = null;
    copy.detectiveRoleCard = null;
    // ...
  } else if (role === "DETECTIVE") {
    copy.killerSecretId = null;
    copy.duelSecretKillerId = null;
    copy.killerRoleCard = null;
    copy.robberHand = [];
    // ...
  }
  ```

---

### SEC-NET-04: Срыв дуэли и подделка победы по тай-брейку через `RESTART_DUEL` и `RESOLVE_DUEL_TIE_BREAK`
- **Уровень критичности:** `HIGH`
- **Место в коде:**
  - Сервер: [src/server/index.ts:1144](file:///c:/Projects/detective-game/src/server/index.ts#L1144)
  - Редюсер: [src/utils/gameReducer.ts:471-508](file:///c:/Projects/detective-game/src/utils/gameReducer.ts#L471-L508)
- **Описание проблемы:**
  На сервере в строке 1144 блокируются только два экшена рестарта:
  `if (action.type === "MATCH_STARTED" || action.type === "RESTART_GAME") return;`
  Экшены дуэли `RESTART_DUEL` и `RESOLVE_DUEL_TIE_BREAK` не фильтруются. 
- **Сценарий атаки:**
  1. Если игрок получил 2 штрафа из 3 возможных, он отправляет `{ "type": "RESTART_DUEL" }`. Редюсер сбрасывает историю опросов, штрафы оппонента и статус поражения, обнуляя матч.
  2. Если у оппонента 1 штраф, а у атакующего 0, атакующий в свой ход отправляет `{ "type": "RESOLVE_DUEL_TIE_BREAK" }`. Редюсер проверяет `penalties.DETECTIVE < penalties.KILLER` и мгновенно присуждает победу атакующему, минуя стадию опросов.
- **Рекомендуемое исправление:**
  Запретить прием `RESTART_DUEL` и `RESOLVE_DUEL_TIE_BREAK` от клиентских соединений. Разрешение тай-брейка должно происходить только по системному тайм-ауту матча на сервере.

---

### SEC-NET-05: Отсутствие серверной валидации правил и дистанции (3×3) для действий `ACCUSE`, `KILL_CHARACTER`, `ROB_NEIGHBOR`
- **Уровень критичности:** `MEDIUM`
- **Место в коде:**
  - Сервер: [src/server/index.ts:980-1015](file:///c:/Projects/detective-game/src/server/index.ts#L980-L1015)
- **Описание проблемы:**
  Метод `validateActionLogic` проверяет только факт того, что персонаж жив и не ограблен:
  ```ts
  const targetId = action.payload?.targetId || action.payload?.targetCardId;
  if (targetId && typeof targetId === "string") {
    // Проверяется только: targetChar существует, targetChar.isAlive, targetChar.isRobbed
  }
  ```
  Сервер **не проверяет** допустимость расстояния 3×3 от тайного персонажа игрока до цели. Хотя в чистых функциях `gameLogic.ts` (например, `killCharacter`) есть проверка `areAdjacent(state.board, state.killerSecretId, targetId)`, при ее нарушении функция просто возвращает исходный `state` без изменений. Сервер не отправляет клиенту уведомление `ACTION_REJECTED` или `SYNC_ERROR`, из-за чего клиент считает ход совершенным и переходит в состояние ожидания, что приводит к рассинхронизации клиентского таймера и UI-лока.
- **Рекомендуемое исправление:**
  Включить явную проверку `areAdjacent` и прав роли на действие непосредственно в `validateActionLogic` с возвратом понятной причины отказа (`NOT_ADJACENT`, `INVALID_ACTION_FOR_ROLE`).

---

### SEC-NET-06: Потенциальное состояние гонки (Race Condition) при переподключении сокетов с `authToken`
- **Уровень критичности:** `MEDIUM`
- **Место в коде:**
  - Сервер: [src/server/index.ts:570-639, 855-917](file:///c:/Projects/detective-game/src/server/index.ts#L570-L639)
- **Описание проблемы:**
  При сетевом реконнекте клиент открывает новый WebSocket. Если `onConnect` нового соединения отрабатывает быстрее, чем событие `onClose` предыдущего (закрывающегося) сокета:
  - `onConnect` обновляет `this.state.players[clientId].connectionId = newConn.id`.
  - Когда старый сокет окончательно закрывается, срабатывает `onClose(oldConn)`. Метод вызывает `getClientIdByConnId(oldConn.id)`. Так как `connectionId` уже заменен на новый, метод возвращает `undefined` и безопасно завершает работу (строка 856).
  - Однако, если клиент переподключается с новым сгенерированным `clientId` (например, при перезагрузке страницы мобильного браузера без кешированного `clientId`, но с сохраненным `authToken`), строка 623 удаляет старый `clientId`:
    `delete this.state.players[existingPlayerId]; this.state.players[clientId] = existingPlayer;`
    Если в этот момент для `existingPlayerId` уже тикал индивидуальный таймер `disconnectTimers`, он очищается (строка 599). Но если в микросекундное окно между закрытием старого сокета и открытием нового сервер запустил `handleDualDisconnectTimeout`, состояние матча может перейти в ничью по тайм-ауту без возможности восстановления.
- **Рекомендуемое исправление:**
  Связать идентификатор сессии напрямую с `authToken`, а не с динамическим `connectionId` / `clientId`. Добавить блокировку (lock) на смену состояния игрока во время обработки дисконнекта/реконнекта.

---

### SEC-NET-07: Зависание занятого номера гостя в реестре `guestRegistry`
- **Уровень критичности:** `LOW`
- **Место в коде:**
  - Сервер: [src/server/index.ts:870-873, 1767-1782](file:///c:/Projects/detective-game/src/server/index.ts#L870-L873)
  - Реестр: [src/utils/guestManager.ts:13-53](file:///c:/Projects/detective-game/src/utils/guestManager.ts#L13-L53)
- **Описание проблемы:**
  В методе `onClose`, если хост покидает комнату в статусе `WAITING`:
  ```ts
  if (playerWhoLeft?.isHost && this.state.status === "WAITING") {
    unregisterRoom(this.getRoomCode());
  }
  ```
  Освобождение номера позывного `guestRegistry.releaseByCallsign(playerWhoLeft.nickname)` не вызывается. Номер освобождается только по истечении 60-секундного таймера `handleIndividualGraceTimeout`. Если игрок сразу создает новую комнату, его предыдущий номер считается занятым. Аналогично, при вызове `server.close()` номера остававшихся игроков не освобождаются.
- **Рекомендуемое исправление:**
  Вызывать `guestRegistry.releaseByCallsign` во всех ветках преждевременного уничтожения комнаты и в методе `close()`.

---

## 3. Безопасность окружения, токенов и данных (Storage & Environment)

### SEC-ENV-01: Отсутствие Content Security Policy (CSP)
- **Уровень критичности:** `HIGH`
- **Место в коде:** [index.html:1-23](file:///c:/Projects/detective-game/index.html#L1-L23)
- **Описание проблемы:**
  В файле `index.html` отсутствует мета-тег `<meta http-equiv="Content-Security-Policy" ...>`. Браузер разрешает загрузку скриптов, стилей, изображений и подключение WebSocket к любым произвольным источникам.
- **Сценарий атаки:**
  В случае внедрения вредоносной нагрузки (через взломанный сторонний npm-пакет или XSS) злоумышленник может беспрепятственно передавать токены сессий и профили игроков на сторонний C2-сервер.
- **Рекомендуемое исправление:**
  Сформировать строгую политику CSP в `index.html`:
  ```html
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    connect-src 'self' wss://*.partykit.dev ws://localhost:* https://*.supabase.co;
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob:;
    media-src 'self' data: blob:;
  ">
  ```

---

### SEC-ENV-02: Чрезмерно открытая политика CORS на сервере PartyKit/Lobby
- **Уровень критичности:** `MEDIUM`
- **Место в коде:**
  - [src/server/index.ts:309-312](file:///c:/Projects/detective-game/src/server/index.ts#L309-L312)
  - [src/server/lobby.ts:154-158](file:///c:/Projects/detective-game/src/server/lobby.ts#L154-L158)
- **Описание проблемы:**
  Все HTTP-эндпоинты лобби и резолва комнат по позывным Морзе возвращают заголовок:
  `"Access-Control-Allow-Origin": "*"`
  Любой сторонний сайт, открытый пользователем в соседней вкладке браузера, может отправлять запросы к серверу игры, перечислять список активных приватных и публичных комнат, узнавать позывные и статус игроков.
- **Рекомендуемое исправление:**
  Ограничить разрешенные Origin списком доверенных доменов игры (домен продакшена на Vercel/Cloudflare Pages и `localhost` для разработки).

---

### SEC-ENV-03: Незащищенное хранение профиля и сессионных токенов в `localStorage`
- **Уровень критичности:** `MEDIUM`
- **Место в коде:**
  - [src/contexts/AuthContext.tsx:75-115, 233-240](file:///c:/Projects/detective-game/src/contexts/AuthContext.tsx#L75-L115)
  - [src/utils/storage.ts:129-149](file:///c:/Projects/detective-game/src/utils/storage.ts#L129-L149)
- **Описание проблемы:**
  Объект пользователя `crime_city_auth_user` сохраняется в незашифрованном виде в `localStorage`. В офлайн-режиме (когда Supabase недоступен или отключен) проверка пароля не производится, а пользователь аутентифицируется на основе содержимого `localStorage`:
  ```ts
  const localUser: any = {
    id: `user_${login.trim().toLowerCase()}`,
    is_anonymous: false,
    email,
    user_metadata: { login: login.trim() },
  };
  localStorage.setItem("crime_city_auth_user", JSON.stringify(localUser));
  ```
  Любой локальный пользователь может подделать свой `id` или прогресс в IndexedDB/LocalStorage.
- **Рекомендуемое исправление:**
  Использовать криптографическую подпись локального состояния через SubtleCrypto или изолировать сохранение чувствительных сессионных токенов в `sessionStorage`.

---

### SEC-ENV-04: Риск захвата сторонних доменов (Dangling DNS) в `FALLBACK_GATEWAYS`
- **Уровень критичности:** `LOW`
- **Место в коде:** [src/config/gameConfig.ts:18-21](file:///c:/Projects/detective-game/src/config/gameConfig.ts#L18-L21)
- **Описание проблемы:**
  В конфигурации прописан шлюз `detective-game-haxi.onrender.com`. Если инстанс на сервисе Render будет удален владельцем репозитория, злоумышленник может зарегистрировать поддомен с аналогичным именем на Render и перехватывать трафик клиентов, использующих fallback.
- **Рекомендуемое исправление:**
  Использовать только собственные поддомены, привязанные к контролируемому домену проекта, либо удалить неиспользуемый шлюз из конфигурации.

---

## 4. Утечки памяти (Memory Leaks) и очистка системных ресурсов

### MEM-RES-01: Антипаттерн «monkey-patching» одиночных коллбэков на синглтоне `partyService`
- **Уровень критичности:** `HIGH`
- **Место в коде:**
  - Синглтон: [src/utils/partyPeer.ts:235-245](file:///c:/Projects/detective-game/src/utils/partyPeer.ts#L235-L245)
  - Лобби: [src/hooks/useLobbyNetwork.ts:120-175](file:///c:/Projects/detective-game/src/hooks/useLobbyNetwork.ts#L120-L175)
  - Модальное окно: [src/components/RoleRevealModal.tsx:51-81](file:///c:/Projects/detective-game/src/components/RoleRevealModal.tsx#L51-L81)
  - Контроллер: [src/components/controller/MobileControllerView.tsx:216-258](file:///c:/Projects/detective-game/src/components/controller/MobileControllerView.tsx#L216-L258)
- **Описание проблемы:**
  Класс `PartyService` объявлен как синглтон, но не использует механизм подписок на события (`EventTarget`, `EventEmitter` или массив слушателей). Вместо этого в нем объявлены одиночные свойства-функции:
  ```ts
  onSyncState: ((state: any, role?: Role, status?: string) => void) | null = null;
  onAction: ((action: any) => void) | null = null;
  onRoomStatus: ((status: any) => void) | null = null;
  // ...
  ```
  В компонентах React разработчики вынуждены применять шаблон «сохрани старый коллбэк и вызови его в новом»:
  ```ts
  // RoleRevealModal.tsx
  const prevAction = partyService.onAction;
  partyService.onAction = (action: any) => {
    if (prevAction) prevAction(action);
    // ...
  };
  return () => {
    partyService.onAction = prevAction;
  };
  ```
- **Почему это вызывает утечку памяти:**
  1. **Цепочки замыканий (Closure Retaining Paths):** Если один компонент перемонтируется несколько раз (или монтируется поверх другого, как `RoleRevealModal` поверх `GameScreen`), формируется глубокая цепочка `prevAction -> prevAction -> prevAction...`. Каждое замыкание удерживает в памяти весь контекст рендера, пропсы и хуки размонтированного компонента, препятствуя сборщику мусора (V8 Garbage Collector).
  2. **Потеря обработчиков при нарушении порядка размонтирования:** Если порядок размонтирования компонентов не совпадает со стеком LIFO (например, асинхронное закрытие модалки после перехода в лобби), строка `partyService.onAction = prevAction` затирает активный обработчик нового экрана ссылкой на уже уничтоженный компонент.
- **Рекомендуемое исправление:**
  Переписать систему событий `PartyService` на стандартный `EventEmitter` или `Set<(action: GameAction) => void>` с методами `subscribe(event, cb): () => unsubscribe()`.

---

### MEM-RES-02: Нарушение архитектурного регламента (запрет `createOscillator`) и утечка аудио-узлов в `audio.ts`
- **Уровень критичности:** `MEDIUM`
- **Место в коде:**
  - Тон Морзе: [src/utils/audio.ts:292-342](file:///c:/Projects/detective-game/src/utils/audio.ts#L292-L342)
  - ТВ Эмбиент: [src/utils/audio.ts#L393-L502](file:///c:/Projects/detective-game/src/utils/audio.ts#L393-L502)
- **Описание проблемы:**
  1. **Прямое нарушение инварианта проекта `AGENTS.md` (раздел 4):**
     > *«В игре разрешено использовать строго оригинальные звуковые файлы из папки `public/sounds`. Категорически запрещен любой процедурный WebAudio-синтез (`createOscillator`).»*
  2. В `src/utils/audio.ts` методы `startMorseTone` и `startTvAmbient` создают 5 процедурных осцилляторов (`createOscillator`) и связывают их с `BiquadFilter` и `GainNode`.
  3. В методе `stopTvAmbient` физическое отключение узлов отложено через `setTimeout(..., 1300)`. Если компонент размонтируется или аудио переключается несколько раз подряд, старые узлы не отключаются вовремя и продолжают обрабатываться аудиопотоком браузера.
- **Рекомендуемое исправление:**
  Заменить процедурный синтез на воспроизведение оригинальных сэмплов из `public/sounds` (`morse-tone.mp3`, `ambient.mp3`), как того требует архитектурный регламент игры.

---

### MEM-RES-03: Висящие таймеры `setTimeout` (500 мс) без отмены в обработчиках ошибок
- **Уровень критичности:** `MEDIUM`
- **Место в коде:**
  - [src/hooks/useGameActions.ts:268, 360](file:///c:/Projects/detective-game/src/hooks/useGameActions.ts#L268)
  - [src/components/controller/MobileControllerView.tsx:246](file:///c:/Projects/detective-game/src/components/controller/MobileControllerView.tsx#L246)
  - [src/components/GameScreen.tsx:234](file:///c:/Projects/detective-game/src/components/GameScreen.tsx#L234)
- **Описание проблемы:**
  При ошибочном действии (ложный арест, неверный ход) запускается таймер снятия красной подсветки:
  ```ts
  setErrorCardId(selectedId);
  setTimeout(() => setErrorCardId(null), 500);
  ```
  Таймер не сохраняется в `useRef` и не отменяется при анмаунте. Если игрок немедленно нажимает «Выйти в меню» или перезапускает матч, через 500 мс происходит вызов функции обновления состояния на размонтированном компоненте, что приводит к предупреждениям React о memory leak и удерживанию ссылки на хук.
- **Рекомендуемое исправление:**
  Оборачивать таймеры подсветки ошибок в `useRef<NodeJS.Timeout | null>` и очищать в функции возврата `useEffect`.

---

### MEM-RES-04: Неотменяемый глобальный слушатель `visibilitychange` в `PartyService`
- **Уровень критичности:** `LOW`
- **Место в коде:** [src/utils/partyPeer.ts:248-262](file:///c:/Projects/detective-game/src/utils/partyPeer.ts#L248-L262)
- **Описание проблемы:**
  В конструкторе `PartyService` вызывается:
  ```ts
  document.addEventListener("visibilitychange", () => { ... });
  ```
  Слушатель зарегистрирован как анонимная функция без метода снятия (`removeEventListener`). В режиме разработки при горячей перезагрузке модулей (HMR) или повторном создании экземпляров создаются дублирующиеся слушатели событий документа.
- **Рекомендуемое исправление:**
  Сохранять ссылку на именованный метод и снимать слушатель в методе `disconnect()` или `destroy()`.

---

## 5. Дорожная карта и приоритеты устранения (Action Plan)

### Приоритет P0 (Критическая безопасность — исправить немедленно):
1. **[SEC-NET-01]** Закрыть эксплойт `CAPTURE_SPY` на сервере `GameRoomServer`: отклонять команду, если режим не `SECRET_SERVICE`, и исключить доверие полю `payload.winner`.
2. **[SEC-NET-02]** Заблокировать экшен `SET_MATCH_POT` для всех входящих сообщений клиентов.
3. **[SEC-NET-03]** Включить полное маскирование секретов дуэли (`duelSecretKillerId`, `duelSecretDetectiveId`, `robberHand`) в методе `maskStateForPlayer`.
4. **[SEC-NET-04]** Заблокировать прием `RESTART_DUEL` и `RESOLVE_DUEL_TIE_BREAK` от клиентских WebSocket-соединений.

### Приоритет P1 (Архитектурная надежность и утечки памяти):
1. **[MEM-RES-01]** Заменить антипаттерн monkey-patching коллбэков в `partyService` на надежный `EventEmitter` / `Set<Listener>` с отпиской при анмаунте.
2. **[MEM-RES-02]** Устранить процедурный синтез `createOscillator` в `audio.ts` согласно регламенту `AGENTS.md`, заменив его на сэмплы из `public/sounds`.
3. **[SEC-ENV-01]** Внедрить строгую политику Content Security Policy (CSP) в `index.html`.

### Приоритет P2 (Плановое улучшение и гигиена кода):
1. **[SEC-NET-05]** Реализовать полноценную валидацию правил 3×3 на сервере с возвратом `ACTION_REJECTED`.
2. **[MEM-RES-03]** Обернуть разовые таймеры `setErrorCardId` в безопасные refs с автоматической очисткой.
3. **[SEC-ENV-02]** Ограничить заголовки CORS доверенным списком хостов.
4. **[SEC-NET-07]** Гарантировать освобождение занятых номеров гостей в `guestRegistry` во всех ветках `onClose`.

---

## 6. Итоговое заключение

Сетевая архитектура проекта «Под подозрением» демонстрирует высокий уровень проработки базовой защиты: авторитетный сервер, криптографические сессионные токены `authToken`, маскирование очередей жертв и защита от захвата сессий протестированы и функционируют корректно (тестовый набор из 78 тест-сьютов и 504 тестов проходит успешно).

Тем не менее, выявлены критические уязвимости бизнес-логики в обработке редких и режимных экшенов (`CAPTURE_SPY`, `SET_MATCH_POT`, `RESTART_DUEL`), а также неполная фильтрация секретов в дуэльном режиме. Устранение выявленных уязвимостей в соответствии с представленным планом позволит полностью исключить читы, предотвратить десинхронизацию и устранить риски деградации производительности из-за утечек памяти.
