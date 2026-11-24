# Аудит консистентности дизайна Neo-Noir и мобильного UX (за пределами ТВ-режима)

> **Проект:** «Под подозрением (Prime Suspect)»  
> **Дата аудита:** 19 ноября 2026 г.  
> **Статус кода:** Строгий Read-Only анализ репозитория  
> **Целевой документ:** `docs/audit/03-ui-ux-consistency.md`  
> **Зона охвата:** Все экраны, модальные окна, шторки и компоненты управления игры вне ТВ-дисплея (`TvBoardView`, `TvHomeView`, `TvLobbyView`, `TvPauseModal`).

---

## 1. Исполнительное резюме (Executive Summary)

В ходе сплошного аудита всех пользовательских интерфейсов проекта «Под подозрением» было исследовано более **35 ключевых экранов и компонентов**. 

### Ключевые позитивные находки:
1. **Базовая эстетика Neo-Noir выдержана:** большинство основных экранов матча (`GameScreen`, `GameStatusBar`, `GameActionDock`, `GameBoard`, `CharacterCard`, `BlindfoldCurtain`, `DetectiveNotebookModal`) строго следуют палитре глубокого черного `#07080c` / `#080a0f`, используют стекломорфизм с размытием `backdrop-blur-xl`, полупрозрачные границы `border-white/10` и контрастные монохромные акценты.
2. **Инвариант карточек 5×5 соблюдён:** компонент `CharacterCard.tsx` отображает имена персонажей полностью в две строки (`whitespace-pre-line`), номера карт `#01-#25` и статусы размещены в строго фиксированных угловых слотах, класс `truncate` исключен.
3. **Белый импульс стрелок маневра:** в `BoardShiftControls.tsx` строго соблюдается контракт кратковременного (250 мс) монохромного белого свечения без цветных залипаний.
4. **Стабильность сетки поля (Zero Layout Shift):** панель действий `GameActionDock` зафиксирована в нижнем слоте, предотвращая прыжки доски.

### Выявленные системные несоответствия:
1. **Остаточные кислотные цвета (`cyan-*` / `accent-neon` `#06b6d4`) и устаревшие тени (`shadow-neon-*`):** вопреки строгому запрету в `.agents/rules/ui-neo-noir.md`, кислотный циан обнаружен в `LobbyWaitingModal.tsx`, `TablesHeader.tsx`, `ModeCard.tsx`, `AuthModal.tsx`, `RecoveryKeyView.tsx`, `LobbyHomeView.tsx` и `tailwind.config.js`.
2. **Архаичная терминология («Штаб», «Шифр», «Связной», «Эфир»):** следы старого фантастического сеттинга сохранились в интерфейсных надписях `RecoveryKeyView.tsx` («В ШТАБ»), `LobbyWaitingModal.tsx` («ШИФРОВАННЫЙ КАНАЛ», «7-значный шифр»), `TablesEmptyState.tsx` («ЭФИР СВОБОДЕН»), `RoomItemCard.tsx` («Ввести шифр ➔»), `CreateRoomModal.tsx` («Закрытый канал (по шифру)») и `rulesData.ts` («связной передает шифровку»).
3. **Пропуски iOS Safe Area (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`):** шапка профиля `ProfileScreen`, нижняя плашка `TablesScreen`, верхний статус-бар `GameTopHeader`, шапка `DuelScreen`, всплывающее уведомление `Toast`, полноэкранный просмотр `FullscreenCardModal` и шторка `BlindfoldCurtain` могут перекрываться чёлкой, Dynamic Island или жестовой полосой Home Indicator на iPhone.
4. **Неконсистентность компонентов кнопок:** вместо стандартного UI Kit `Button.tsx` в ряде модулей (`TutorialActionBar.tsx`, `TutorialScreen.tsx`, `DuelScreen.tsx`, `RoleRevealModal.tsx`) применены самодельные `<button>` и `<motion.button>` с неконсистентными скруглениями (`rounded-full`), яркими сплошными заливками (`bg-amber-600`, `bg-emerald-600`) и опечатками (`rounded-full rounded-xl`).
5. **Маленькие сенсорные зоны (Touch Targets < 44×44px):** верхние кнопки паузы, блокнота и логов в `GameTopHeader.tsx` на смартфонах имеют размер `w-8 h-8` (32×32px); кнопки закрытия в `Modal.tsx`, `AvatarPickerModal.tsx`, `GameSheets.tsx` и стрелки маневра на мобильных устройствах требуют повышенной точности попадания.

---

## 2. Сводная статистика аудита

| Категория проверки | Проверено компонентов | Соответствует стандарту | Требует исправлений | Критических проблем |
| :--- | :---: | :---: | :---: | :---: |
| **1. Цветовая палитра и стиль Neo-Noir** | 35 | 23 | 12 | 2 (Cyan в лобби/столах, Amber-вспышка в обучалке) |
| **2. Типографика и UI Kit кнопки** | 35 | 22 | 13 | 1 (Кастомные кнопки TutorialActionBar) |
| **3. Текстовая терминология (Tone of Voice)** | 35 | 26 | 9 | 1 (Кнопка «В ШТАБ» и шифры комнат) |
| **4. iOS Safe Area & Viewport (100dvh)** | 35 | 24 | 11 | 3 (Toast под чёлкой, перекрытие шапки матча и подвала столов) |
| **5. Сенсорная отзывчивость (Touch Targets >= 44px)** | 35 | 25 | 10 | 2 (Кнопки шапки матча 32px, кнопки закрытия модалок) |
| **6. Поворот экрана (Orientation handling)** | 35 | 29 | 6 | 1 (Отсутствие оверлея в Меню, Профиле и Столах) |

---

## 3. Детальный аудит: Цветовая палитра Neo-Noir и UI Kit

### 3.1. Анализ использования кислотного циана (`cyan-*`, `accent-neon`), лайма и пересвеченных свечений

Стандарт `.agents/rules/ui-neo-noir.md` гласит:
> *«Сапфирово-синий (Закон, Детектив, Оперативник, Полиция, ТВ-эфир, Радар): глубокий сапфировый `#2563EB` / `#3B82F6`... Исключить циан/бирюзу из роли Закона. Категорически запрещено использовать кислотные оттенки (`cyan`, `lime`, ядовитый фиолетовый) и превращать интерфейс в дешёвый светящийся киберпанк.»*

| Экран / Компонент | Файл и строки | Проблема | Оценка критичности | Рекомендация по исправлению |
| :--- | :--- | :--- | :---: | :--- |
| **Ожидание оппонента в лобби** | [LobbyWaitingModal.tsx](file:///c:/Projects/detective-game/src/components/lobby/LobbyWaitingModal.tsx#L72-L116) | Строки 72, 101: `text-cyan-400`.<br>Строка 112: `border-t-accent-neon shadow-neon-cyan`.<br>Строка 116: `bg-accent-neon shadow-neon-cyan`. | **КРИТИЧНО** | Заменить `cyan-400` и `accent-neon` на сапфировый `text-blue-400`, `border-t-blue-500`, индикатор пульсации перевести на `bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]`. |
| **Шапка сетевых столов** | [TablesHeader.tsx](file:///c:/Projects/detective-game/src/components/tables/TablesHeader.tsx#L140-L213) | Строки 140, 161: `text-accent-neon`.<br>Строки 141, 162: `drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]`.<br>Строки 143, 164: `bg-accent-neon/20 text-cyan-200 border-accent-neon/30`.<br>Строка 212: маркер фильтра `bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]`. | **КРИТИЧНО** | Перевести бейджи вкладок и маркер фильтра на нейтральный сапфир/сланец: `text-blue-400`, `bg-blue-500/15 border-blue-500/30 text-blue-200`, маркер `bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.8)]`. |
| **Карточка онлайн-режима** | [ModeCard.tsx](file:///c:/Projects/detective-game/src/components/lobby/ModeCard.tsx#L37) | Строка 37: `iconColor: "text-zinc-300 group-hover:text-cyan-400 group-hover:border-cyan-500/30"`. | **СРЕДНЕ** | Заменить ховер-стиль иконки онлайна на благородный индиго/сапфир: `group-hover:text-blue-400 group-hover:border-blue-500/30`. |
| **Модалка авторизации** | [AuthModal.tsx](file:///c:/Projects/detective-game/src/components/auth/AuthModal.tsx#L203-L288) | Строки 203, 207: `focus:border-accent-neon focus:ring-accent-neon/40`.<br>Строка 288: лейбл «Текущая личность» оформлен в `text-accent-neon`. | **ВЫСОКО** | Заменить фокус полей ввода на `focus:border-blue-500 focus:ring-blue-500/40`, а лейбл на `text-zinc-400 font-mono`. |
| **Формуляр секретного ключа** | [RecoveryKeyView.tsx](file:///c:/Projects/detective-game/src/components/auth/RecoveryKeyView.tsx#L84-L119) | Строки 84, 87, 88: `bg-accent-neon/10`, `text-accent-neon`, `bg-accent-neon`.<br>Строки 95, 96: `border-accent-neon/30`, `text-accent-neon drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]`.<br>Строка 119: `hover:border-accent-neon/50`. | **ВЫСОКО** | Перфокарту ключа перевести на сапфирово-монохромную гамму: `text-zinc-100`, рамка `border-white/20`, мягкое свечение `shadow-[0_0_15px_rgba(59,130,246,0.2)]`. |
| **Фоновые световые пятна лобби** | [LobbyHomeView.tsx](file:///c:/Projects/detective-game/src/components/lobby/LobbyHomeView.tsx#L58), [App.tsx](file:///c:/Projects/detective-game/src/App.tsx#L750) | `bg-accent-neon/15 blur-3xl` в декоративном блюр-пятне на заднем плане. | **НИЗКО** | Заменить на `bg-blue-600/10 blur-3xl` для соблюдения монохромной нуарной глубины без примеси циана. |
| **Конфигурация Tailwind** | [tailwind.config.js](file:///c:/Projects/detective-game/tailwind.config.js#L29-L41) | Строка 29: `accent.neon: '#06b6d4'`.<br>Строка 41: `boxShadow['neon-cyan']: '0 0 25px rgba(6, 182, 212, 0.4)'`. | **СРЕДНЕ** | Удалить токен `neon: '#06b6d4'` и устаревший класс тени `'neon-cyan'`. |

---

### 3.2. Карточки интерфейса и использование единого класса `.neo-card`

| Экран / Компонент | Файл и строки | Проблема | Оценка критичности | Рекомендация по исправлению |
| :--- | :--- | :--- | :---: | :--- |
| **Базовый компонент Modal** | [Modal.tsx](file:///c:/Projects/detective-game/src/components/ui/Modal.tsx#L49) | Строка 49: контейнер модалки использует `bg-background-main/90 backdrop-blur-xl border border-border-subtle rounded-2xl p-6 shadow-2xl` без класса `.neo-card`. Из-за этого модалки, оборачиваемые через `Modal`, теряют фирменный верхний световой блик `border-top-color: rgba(255, 255, 255, 0.25)` и внутреннюю тень `inset 0 1px 0 rgba(255, 255, 255, 0.1)`. | **ВЫСОКО** | Добавить класс `.neo-card` в базовый контейнер `Modal.tsx`. |
| **Карточка комнаты в списке** | [RoomItemCard.tsx](file:///c:/Projects/detective-game/src/components/tables/RoomItemCard.tsx#L28) | Строка 28: использует самодельный каскадный градиент `bg-gradient-to-br from-background-surface/90 to-background-main/80 hover:from-background-surface hover:to-background-surface/80 border border-border-subtle hover:border-white/20 border-t border-t-border-strong rounded-2xl` вместо `.neo-card-interactive`. | **СРЕДНЕ** | Заменить кастомный фон на единый класс `.neo-card-interactive rounded-2xl`. |
| **Модалка выбора аватара** | [AvatarPickerModal.tsx](file:///c:/Projects/detective-game/src/components/profile/AvatarPickerModal.tsx#L28) | Строка 28: самодельный контейнер `bg-[#0b0e14] border border-white/20 rounded-2xl` без использования `Modal` и `.neo-card`. | **СРЕДНЕ** | Унифицировать через `<Modal>` или применить класс `.neo-card`. |
| **Плашка победы в Дуэли** | [DuelScreen.tsx](file:///c:/Projects/detective-game/src/components/duel/DuelScreen.tsx#L351) | Строка 351: баннер победы свёрстан как `bg-zinc-950 border border-zinc-800 rounded-3xl p-6` без эффекта Neo-Noir стекла. | **НИЗКО** | Добавить `.neo-card rounded-3xl` для визуальной синхронизации с `GameOverModal.tsx`. |

---

### 3.3. Кнопки интерфейса: Стандарт `Button.tsx` против самодельных кнопок

Стандарт дизайн-системы: все интерактивные кнопки первого и второго уровней обязаны использовать `Button.tsx` (варианты `primary`, `secondary`, `ghost`, `danger`) со стандартной высотой `h-11`/`h-12`, скруглением `rounded-xl`, анимацией `active:scale-95` и гарантированным touch target >= 44px.

| Экран / Компонент | Файл и строки | Проблема | Оценка критичности | Рекомендация по исправлению |
| :--- | :--- | :--- | :---: | :--- |
| **Панель действий обучения** | [TutorialActionBar.tsx](file:///c:/Projects/detective-game/src/components/tutorial/TutorialActionBar.tsx#L51-L130) | Строки 51, 61, 69, 77, 87, 95, 103, 113, 121, 129: все 10 кнопок используют сырой `<motion.button>` с `rounded-full`, плоскими кричащими цветами `bg-emerald-600` / `bg-amber-600` и кислотным неоновым свечением `shadow-[0_0_15px_rgba(245,158,11,0.4)]`. Выбивается из общей дизайн-системы нео-нуара. | **КРИТИЧНО** | Заменить сырые motion.button на `<Button variant="primary">` / `<Button variant="primary-danger">` с формой `rounded-xl` и благородными стеклянными градиентами `neo-button-primary` / `neo-button-danger`. |
| **Кнопка «Заново» в результатах матча** | [GameOverActions.tsx](file:///c:/Projects/detective-game/src/components/gameOver/GameOverActions.tsx#L71) | Строка 71: опечатка в классах кнопки — `className="rounded-full rounded-xl !h-12 text-xs..."`. Классы конфликтуют друг с другом, `rounded-full` был ошибочно оставлен. | **СРЕДНЕ** | Удалить устаревший класс `rounded-full`, оставить строго `rounded-xl`. |
| **Панель действий Дуэли** | [DuelScreen.tsx](file:///c:/Projects/detective-game/src/components/duel/DuelScreen.tsx#L322-L345) | Строки 322, 331, 339: кнопки «Задать вопрос», «Досье» и «Пропуск» свёрстаны сырыми `<button>` с кастомными инлайн-градиентами вместо `<Button>`. | **СРЕДНЕ** | Перевести на компоненты UI Kit: `<Button variant="primary">`, `<Button variant="secondary">`, `<Button variant="ghost">`. |
| **Модалка выбора инспектора** | [InspectorChoiceModal.tsx](file:///c:/Projects/detective-game/src/components/InspectorChoiceModal.tsx#L64-L101) | Строки 64, 98: сырые теги `<button>` с инлайновыми классами `neo-button-primary` вместо компонента `<Button variant="primary">`. | **НИЗКО** | Заменить на стандартный `Button`. |
| **Модули обучающего меню** | [TutorialMenuView.tsx](file:///c:/Projects/detective-game/src/components/tutorial/TutorialMenuView.tsx#L217-L232) | Строки 217, 224: сырые `<button>` в подвале меню обучения («Курс пройден (В меню)») вместо `<Button>`. | **НИЗКО** | Заменить на `<Button variant="primary">` и `<Button variant="secondary">`. |

---

### 3.4. Аномалии стрелок маневра поля и инъекции CSS в обучении

| Компонент | Файл и строки | Проблема | Оценка критичности | Рекомендация по исправлению |
| :--- | :--- | :--- | :---: | :--- |
| **Обучение: Инъекция янтарного неона в стрелки** | [TutorialScreen.tsx](file:///c:/Projects/detective-game/src/components/TutorialScreen.tsx#L453-L461) | В блоке `<style>` прописана принудительная перекраска стрелок маневра в янтарный цвет с неоновым ореолом:<br>`box-shadow: 0 0 20px rgba(245,158,11,0.9) !important; border-color: #f59e0b !important; background-color: rgba(245,158,11,0.3) !important`.<br>Нарушает контракт стрелок маневра из `.agents/rules/ui-neo-noir.md` (п. 52: *«Запрещено использование цветных стилей (blue, cyan, amber, red) для индикации стрелок маневра — только монохромная белая вспышка»*). | **ВЫСОКО** | Заменить янтарную подсветку подсказки в обучении на монохромную белую пульсирующую рамку: `border-white shadow-[0_0_15px_rgba(255,255,255,0.7)] bg-white/20`. |

---

## 4. Детальный аудит: Терминология и Tone of Voice

Согласно регламенту проекта, из интерфейса должна быть полностью устранена старая пафосная псевдошпионская терминология («Штаб», «Шифр», «Связной», «Радиоканал», «Эфир»), уступая место строгой нео-нуарной детективной лексике («Главное меню», «Код доступа», «Агент», «Комната», «Частота / Стол»).

| Экран / Компонент | Файл и строки | Найденный текст | Проблема терминологии | Рекомендуемая замена | Оценка критичности |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Ключ восстановления** | [RecoveryKeyView.tsx](file:///c:/Projects/detective-game/src/components/auth/RecoveryKeyView.tsx#L147) | `В ШТАБ (ПРОДОЛЖИТЬ)` | Архаизм «Штаб». | `В ГЛАВНОЕ МЕНЮ` или `ПРОДОЛЖИТЬ` | **КРИТИЧНО** |
| **Ожидание оппонента** | [LobbyWaitingModal.tsx](file:///c:/Projects/detective-game/src/components/lobby/LobbyWaitingModal.tsx#L73) | `ШИФРОВАННЫЙ КАНАЛ (МОРЗЕ)` | Архаизм «Шифрованный канал». | `ПРИВАТНЫЙ СТОЛ (КОД МОРЗЕ)` | **ВЫСОКО** |
| **Ожидание оппонента** | [LobbyWaitingModal.tsx](file:///c:/Projects/detective-game/src/components/lobby/LobbyWaitingModal.tsx#L97) | `Продиктуйте этот 7-значный шифр напарнику` | Слово «шифр» вместо «код». | `Продиктуйте этот 7-значный код напарнику` | **ВЫСОКО** |
| **Ожидание оппонента** | [LobbyWaitingModal.tsx](file:///c:/Projects/detective-game/src/components/lobby/LobbyWaitingModal.tsx#L102) | `Генерация 7-значного шифра...` | Слово «шифр». | `Генерация кода комнаты...` | **ВЫСОКО** |
| **Создание комнаты** | [CreateRoomModal.tsx](file:///c:/Projects/detective-game/src/components/lobby/CreateRoomModal.tsx#L34) | `title="Протокол: Новая операция"` | Пафосный заголовок из старого сеттинга. | `Новая партия` или `Создание стола` | **СРЕДНЕ** |
| **Создание комнаты** | [CreateRoomModal.tsx](file:///c:/Projects/detective-game/src/components/lobby/CreateRoomModal.tsx#L71) | `Закрытый канал (по шифру)` | «Канал по шифру». | `Приватная игра (по паролю)` | **ВЫСОКО** |
| **Карточка приватной комнаты** | [RoomItemCard.tsx](file:///c:/Projects/detective-game/src/components/tables/RoomItemCard.tsx#L79) | `Ввести шифр ➔` | Слово «шифр». | `Ввести пароль ➔` или `Войти ➔` | **ВЫСОКО** |
| **Пустой список комнат** | [TablesEmptyState.tsx](file:///c:/Projects/detective-game/src/components/tables/TablesEmptyState.tsx#L55) | `ЭФИР СВОБОДЕН • СИГНАЛ НЕ ОБНАРУЖЕН` | Пафосный «эфир». | `СВОБОДНЫХ СТОЛОВ НЕ НАЙДЕНО` | **ВЫСОКО** |
| **Сайдбар столов в меню** | [NetworkSidebar.tsx](file:///c:/Projects/detective-game/src/components/lobby/NetworkSidebar.tsx#L107) | `Открытые оперативные столы по шифрам комнат и приватные сессии...` | Фраза «по шифрам комнат». | `Открытые и приватные столы для расследований по сети.` | **СРЕДНЕ** |
| **Справочник правил** | [rulesData.ts](file:///c:/Projects/detective-game/src/components/rules/rulesData.ts#L190) | `...связной передает шифровку о присутствии любого вражеского резидента...` | Слова «связной» и «шифровка». | `...радар сообщает о присутствии любого вражеского агента в зоне охвата.` | **СРЕДНЕ** |
| **Моковые комнаты** | [mockRooms.ts](file:///c:/Projects/detective-game/src/utils/mockRooms.ts#L94) | `hostName: "Связной_X"` | Никнейм со словом «Связной». | `hostName: "Агент_X"` | **НИЗКО** |
| **Пауза матча** | [PauseModal.tsx](file:///c:/Projects/detective-game/src/components/PauseModal.tsx#L106) | `Параметры связи` | В детективной игре это простые аудио-настройки. | `Звук и вибрация` или `Параметры звука` | **НИЗКО** |
| **Карточки ролей в матче** | [RoleCards.tsx](file:///c:/Projects/detective-game/src/components/RoleCards.tsx#L157-L205) | `role1Name === "ОПЕРАТИВНИК" ? "ОПЕР" : role1Name` | Неконсистентное сокращение названия роли до «ОПЕР» (нарушает инвариант полных названий). | Всегда выводить полное название: `ОПЕРАТИВНИК`. | **СРЕДНЕ** |

---

## 5. Детальный аудит: Мобильный UX, Safe Area и адаптивность

### 5.1. Анализ поддержки iOS Safe Area (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`)

На смартфонах Apple iPhone с чёлкой (iPhone X–14) и вырезом Dynamic Island (iPhone 14 Pro–16), а также на Android-устройствах с жестовой полосой навигации критически важно закладывать системные отступы `safe-area-inset`.

| Экран / Компонент | Файл и строки | Проблема Safe Area | Где происходит конфликт? | Оценка критичности | Рекомендация по исправлению |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Всплывающий Toast** | [Toast.tsx](file:///c:/Projects/detective-game/src/components/Toast.tsx#L32) | Захардкожен отступ `top-3` (12px). | Уведомление попадает прямо под Dynamic Island / вырез чёлки (высота 44–54px) и становится нечитаемым. | **КРИТИЧНО** | Задать `top-[max(0.75rem,env(safe-area-inset-top))]`. |
| **Шапка экрана матча** | [GameTopHeader.tsx](file:///c:/Projects/detective-game/src/components/game/GameTopHeader.tsx#L36) | Задан паддинг `py-2 md:py-3` без `safe-area-inset-top`. | Кнопки меню паузы, блокнота и бейдж статуса хода упираются в чёлку смартфона. | **ВЫСОКО** | Задать `pt-[max(0.5rem,env(safe-area-inset-top))] pb-2`. |
| **Подвал экрана комнат** | [TablesScreen.tsx](file:///c:/Projects/detective-game/src/components/TablesScreen.tsx#L149) | Нижняя панель действий имеет отступ `p-4` без `safe-area-inset-bottom`. | Главная кнопка «+ Создать партию» перекрывается полосой Home Indicator на iPhone. | **ВЫСОКО** | Добавить `pb-[max(1rem,env(safe-area-inset-bottom))]`. |
| **Шапка экрана профиля** | [ProfileScreen.tsx](file:///c:/Projects/detective-game/src/components/ProfileScreen.tsx#L139) | Хедер использует `py-3` без `safe-area-inset-top`. Контейнер без `safe-area-inset-bottom`. | Кнопка «Назад» и аватар перекрываются чёлкой; нижняя карточка истории уходит под полосу Home Indicator. | **ВЫСОКО** | Добавить `pt-[max(0.75rem,env(safe-area-inset-top))]` в шапку и `pb-[max(1.5rem,env(safe-area-inset-bottom))]` в контейнер. |
| **Шапка экрана Дуэли** | [DuelScreen.tsx](file:///c:/Projects/detective-game/src/components/duel/DuelScreen.tsx#L153-L155) | Контейнер использует `p-3`, хедер `pb-2` без `safe-area-inset-top`. | Кнопка «Меню» и таймеры конфликтуют с островком Dynamic Island. | **СРЕДНЕ** | Задать контейнеру `pt-[max(0.75rem,env(safe-area-inset-top))]`. |
| **Шторка тайны (Pass & Play)** | [BlindfoldCurtain.tsx](file:///c:/Projects/detective-game/src/components/ui/BlindfoldCurtain.tsx#L86) | Контейнер шторки использует жесткий `p-6` без safe-area. | Верхняя плашка «ОФФЛАЙН РЕЖИМ» и нижняя строка «ТАЙНА ЛИЧНОСТИ» залезают на системные элементы iOS. | **СРЕДНЕ** | Задать `pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]`. |
| **Полноэкранный просмотр карты** | [FullscreenCardModal.tsx](file:///c:/Projects/detective-game/src/components/FullscreenCardModal.tsx#L18) | Кнопка закрытия `[✕]` спозиционирована `top-6 right-6` (24px). | Кнопка закрытия перекрывается датчиками FaceID / чёлкой на iPhone. | **СРЕДНЕ** | Задать `top-[max(1.5rem,env(safe-area-inset-top))] right-[max(1.5rem,env(safe-area-inset-right))]`. |
| **Выбор личности инспектора** | [InspectorChoiceModal.tsx](file:///c:/Projects/detective-game/src/components/InspectorChoiceModal.tsx#L46-L85) | Строка 46: `pt-16` без safe-area.<br>Строка 85: `bottom-8` без `safe-area-inset-bottom`. | Кнопки свернутого дока («Выбор личности», «Подтвердить») упираются в жестовую полосу iOS. | **СРЕДНЕ** | Задать `bottom-[max(1.5rem,env(safe-area-inset-bottom))]`. |

---

### 5.2. Анализ высоты экрана: `100dvh` vs `100vh` / `h-screen`

На мобильных браузерах (Safari iOS, Google Chrome Android) динамическая строка адреса меняет высоту видимой области. Классический `100vh` и класс `h-screen` рассчитываются от максимальной высоты без учёта адресной строки, из-за чего нижние кнопки уходят за край экрана или подпрыгивают при скролле.

| Экран / Компонент | Файл и строки | Найденный класс | Оценка критичности | Рекомендация по исправлению |
| :--- | :--- | :--- | :---: | :--- |
| **Главное меню (Лобби)** | [MainMenu.tsx](file:///c:/Projects/detective-game/src/components/MainMenu.tsx#L303) | `flex-1 w-full h-screen flex flex-col` | **ВЫСОКО** | Заменить `h-screen` на `h-[100dvh]` или `h-full`. Это устранит скачки контента и нижнего таб-бара при скрытии адресной строки Safari. |
| **Экран профиля** | [ProfileScreen.tsx](file:///c:/Projects/detective-game/src/components/ProfileScreen.tsx#L137) | `h-full w-full min-h-screen bg-transparent...` | **СРЕДНЕ** | Заменить `min-h-screen` на `min-h-[100dvh]`. |

---

### 5.3. Анализ сенсорной доступности (Touch Targets >= 44×44px и touch-manipulation)

Согласно рекомендациям Apple Human Interface Guidelines (HIG) и Google Material Design, минимальный размер интерактивного элемента для касания пальцем составляет **44×44px** (или 48×48dp).

| Компонент / Элемент | Файл и строки | Текущий размер | Проблема | Оценка критичности | Рекомендация по исправлению |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **Кнопки шапки матча (Пауза, Блокнот, Лог)** | [GameTopHeader.tsx](file:///c:/Projects/detective-game/src/components/game/GameTopHeader.tsx#L40-L63) | `w-8 h-8` (32×32px) на мобильных | На экранах смартфонов (< 768px) кнопки имеют габариты всего 32×32px, что на 27% меньше минимального стандарта доступности. Пальцем сложно попасть на ходу. | **ВЫСОКО** | Увеличить мобильный размер до `w-10 h-10` (40×40px) или `min-w-[44px] min-h-[44px]` с сохранением центрированной иконки. |
| **Кнопки закрытия шторок и модалок** | [Modal.tsx](file:///c:/Projects/detective-game/src/components/ui/Modal.tsx#L61), [GameSheets.tsx](file:///c:/Projects/detective-game/src/components/GameSheets.tsx#L75), [AvatarPickerModal.tsx](file:///c:/Projects/detective-game/src/components/profile/AvatarPickerModal.tsx#L33), [DuelCandidatesSheet.tsx](file:///c:/Projects/detective-game/src/components/duel/DuelCandidatesSheet.tsx#L71) | `p-1` (~24×24px) или `w-8 h-8` (32×32px) | Кнопки закрытия крестиком `[✕]` имеют узкую площадь касания. | **СРЕДНЕ** | Задать минимальную кликабельную область `min-w-[44px] min-h-[44px] flex items-center justify-center`. |
| **Стрелки маневра на малых смартфонах** | [BoardShiftControls.tsx](file:///c:/Projects/detective-game/src/components/board/BoardShiftControls.tsx#L58-L84) | Высота `h-4 sm:h-5` (16–20px) | В компактном мобильном портрете стрелки сдвига вертикальных колонок физически имеют высоту 16–20px из-за необходимости вписать поле 5×5 в высоту экрана. | **СРЕДНЕ** | Сохраняя визуальный размер плашки, расширить hit-slop (невидимую область тапа) через псевдоэлемент `before:absolute before:-inset-2` и гарантировать класс `touch-manipulation`. |
| **Кнопка «← В архив» в обучении** | [TutorialScreen.tsx](file:///c:/Projects/detective-game/src/components/TutorialScreen.tsx#L467) | `px-3 py-1.5` (~28px) | Маленькая высота кнопки возврата в архив. | **НИЗКО** | Увеличить высоту до `h-10` (40px). |

---

### 5.4. Поведение при повороте устройства (Orientation Lock / Overlay)

В кодовой базе присутствует компонент [DeviceOrientationOverlay.tsx](file:///c:/Projects/detective-game/src/components/DeviceOrientationOverlay.tsx#L3-L20):
```tsx
<div className="fixed inset-0 z-[100] hidden [@media(hover:none)_and_(pointer:coarse)]:max-md:landscape:flex flex-col items-center justify-center bg-black/95 text-center p-6 select-none">
  ...
  <h2>ТРЕБУЕТСЯ ВЕРТИКАЛЬНЫЙ РЕЖИМ</h2>
</div>
```

**Обнаруженное узкое место:**
Компонент `DeviceOrientationOverlay` смонтирован **только внутри `GameModalsContainer.tsx`** (строка 241), который активен исключительно во время идущего матча на основном экране. 
Если пользователь на мобильном телефоне повернёт устройство в горизонтальную ориентацию (landscape) находясь в **Главном меню (`MainMenu`)**, на **Экране профиля (`ProfileScreen`)**, в **Сетевых столах (`TablesScreen`)** или в **Обучении (`TutorialScreen`)**, защитная шторка блокировки не сработает. Это приводит к сплющиванию меню, обрезанию списков модалок и выходу контента за пределы экрана.

**Рекомендация:**
Вынести рендеринг `<DeviceOrientationOverlay />` на самый верхний уровень приложения в [App.tsx](file:///c:/Projects/detective-game/src/App.tsx) рядом со `SplashScreen` (активировать для всех мобильных экранов, кроме экрана телевизора `TvBoardView`).

---

## 6. Сводный план устранения выявленных замечаний

Все несоответствия разбиты на 4 последовательных спринта по степени приоритета:

### Спринт 1: Неотложные исправления палитры Neo-Noir и терминологии (P0 — Критично)
1. **Искоренение циана:** Заменить `cyan-400` и `accent-neon` на сапфирово-синий `#3B82F6` / `text-blue-400` в `LobbyWaitingModal.tsx`, `TablesHeader.tsx`, `AuthModal.tsx` и `RecoveryKeyView.tsx`.
2. **Устранение старой терминологии:**
   - `RecoveryKeyView.tsx:147`: изменить «В ШТАБ (ПРОДОЛЖИТЬ)» на «В ГЛАВНОЕ МЕНЮ».
   - `LobbyWaitingModal.tsx:73, 97, 102`: изменить «ШИФРОВАННЫЙ КАНАЛ» на «ПРИВАТНЫЙ СТОЛ», «шифр» на «код».
   - `CreateRoomModal.tsx:71`: изменить «Закрытый канал (по шифру)» на «Приватный стол (по коду)».
   - `TablesEmptyState.tsx:55`: изменить «ЭФИР СВОБОДЕН» на «СВОБОДНЫХ СТОЛОВ НЕ НАЙДЕНО».
   - `RoomItemCard.tsx:79`: изменить «Ввести шифр ➔» на «Ввести код ➔».
   - `rulesData.ts:190`: заменить «связной передает шифровку» на «радар сообщает о присутствии любого вражеского агента».
3. **Безопасность стрелок обучения:** В `TutorialScreen.tsx:453` удалить янтарное неоновое свечение `rgba(245,158,11,0.9)`, заменив на регламентный белый импульс.

### Спринт 2: iOS Safe Area и предотвращение наложений (P1 — Высокий приоритет)
1. **Toast:** В `Toast.tsx:32` перевести позиционирование с `top-3` на `top-[max(0.75rem,env(safe-area-inset-top))]`.
2. **Шапка матча:** В `GameTopHeader.tsx:36` добавить `pt-[max(0.5rem,env(safe-area-inset-top))]`.
3. **Подвал столов:** В `TablesScreen.tsx:149` добавить `pb-[max(1rem,env(safe-area-inset-bottom))]`.
4. **Профиль:** В `ProfileScreen.tsx` добавить `pt-[max(0.75rem,env(safe-area-inset-top))]` в шапку и `pb-[max(1.5rem,env(safe-area-inset-bottom))]` в контейнер.
5. **Шторка тайны:** В `BlindfoldCurtain.tsx:86` прописать `pt-[max(1.5rem,env(safe-area-inset-top))]` и `pb-[max(1.5rem,env(safe-area-inset-bottom))]`.
6. **Высота вьюпорта:** В `MainMenu.tsx:303` заменить `h-screen` на `h-[100dvh]`.

### Спринт 3: Унификация кнопок и карточек по UI Kit (P2 — Средний приоритет)
1. **Кнопки обучения:** В `TutorialActionBar.tsx` заменить 10 самодельных кнопок с `rounded-full` на UI Kit `Button` с `variant="primary"` / `variant="primary-danger"` и скруглением `rounded-xl`.
2. **Исправление опечатки:** В `GameOverActions.tsx:71` удалить лишний класс `rounded-full`, оставив `rounded-xl`.
3. **Карточки `.neo-card`:** Интегрировать класс `.neo-card` в базовый контейнер `Modal.tsx` и `RoomItemCard.tsx`.
4. **Инвариант полных названий:** В `RoleCards.tsx:157, 205` убрать сокращение «ОПЕР», выводить полное наименование «ОПЕРАТИВНИК».

### Спринт 4: Сенсорная эргономика и поворот экрана (P3 — Полировка)
1. **Touch Targets:** Увеличить кнопки в `GameTopHeader.tsx` на смартфонах с 32px до 40–44px. Расширить зону касания кнопок закрытия модалок `[✕]`.
2. **Глобальный оверлей ориентации:** Вынести `DeviceOrientationOverlay` в корень `App.tsx` для защиты Главного меню, Профиля и Сетевых столов от горизонтального искажения на смартфонах.
3. **Очистка конфига Tailwind:** Удалить устаревшие токены `accent.neon` и тени `shadow-neon-*` из `tailwind.config.js`.

---

## 7. Заключение контролёра качества

Проведённый аудит показал, что фундамент дизайн-системы Neo-Noir в проекте «Под подозрением» заложен качественно и целостно. Большинство несоответствий носят локальный характер и возникли в результате постепенного развития режимов без своевременной синхронизации старых модальных окон с обновлённым UI Kit.

Реализация рекомендаций данного отчёта обеспечит 100% соблюдение визуального стандарта Neo-Noir, исключит наложения элементов на современных смартфонах iOS/Android и создаст монолитный, премиальный пользовательский опыт.
