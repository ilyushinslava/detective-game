# «Реквием: Последний выстрел» (The Wicked City)

> Пошаговая детективная киберпанк-стратегия с механикой социальной дедукции, скрытых ролей и динамического поля 5×5.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38b2ac.svg)](https://tailwindcss.com/)
[![PartyKit](https://img.shields.io/badge/PartyKit-WebSocket-ff6b6b.svg)](https://partykit.io/)
[![Vitest](https://img.shields.io/badge/Vitest-100%25%20Passing-success.svg)](https://vitest.dev/)

---

## 🎮 Об игре

Действие разворачивается в антиутопическом мегаполисе The Wicked City. На поле 5×5 перед игроками находятся 25 жителей. Игроки перемещают ряды и столбцы, опрашивают свидетелей и собирают улики в радиусе 3×3, пытаясь вычислить тайную личность соперника.

### 4 игровых режима:
1. **«Маньяк против оперативника» (`MANIAC_VS_OPERATIVE`):** Асимметричная охота за 4 жертвами против детектива с колодой улик.
2. **«Охота на грабителя» (`THIEF_HUNT`):** Домушник ворует сокровища и меняет маски против шефа полиции и двух патрульных.
3. **«Секретная служба» (`SECRET_SERVICE`):** Контрразведка для 2–8 игроков со сбором трофеев и перекрестным опросом на радаре.
4. **«Очная ставка» (`LINE_UP` / Дуэль):** Логическая дедуктивная дуэль на исключение подозреваемых по каталогу вопросов.

### Режим TV Party (Салонный формат / Jackbox-модель):
- **Телевизор (Android TV / ПК):** Большой экран с публичным полем 5×5, доступными действиями, живым предпросмотром сдвигов и поддержкой ТВ-пульта (D-Pad).
- **Смартфоны игроков:** Приватный контроллер с пространственной мини-картой соседей 3×3, схемой 5 полос для сдвигов и кнопкой завершения хода.

---

## 🛠 Технологический стек

- **Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion.
- **PWA:** `vite-plugin-pwa` (автообновление, оптимизированный прекэш 5.1 МБ для мгновенной загрузки офлайн).
- **Backend / Мультиплеер:** PartyKit WebSocket сервер + Standalone Node.js runner (`ws` + HTTP) на Render.
- **Хранилище данных:** IndexedDB (`requiem_game_db`) с автоматической миграцией из `localStorage`.
- **Тестирование:** Vitest + React Testing Library (41 тест-сьют, 233 теста).

---

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
npm install
```

### 2. Запуск frontend в режиме разработки
```bash
npm run dev
# Сервер разработки Vite будет доступен по локальному адресу (по умолчанию: http://localhost:5173/)
```

### 3. Запуск backend / WebSocket сервера

- **Локальный PartyKit сервер разработки:**
  ```bash
  npm run party:dev
  # запускает локальный PartyKit на порту 1999
  ```
- **Автономный Node.js сервер (Standalone):**
  ```bash
  npm run server:standalone
  # запускает server-standalone.mjs на порту process.env.PORT || 1999
  ```
- **Одновременный запуск frontend и backend одной командой:**
  ```bash
  npm run dev:all
  ```

### 4. Запуск тестов и проверок
```bash
# Быстрый запуск всех тестов
npm test

# Запуск тестов с генерацией отчета о покрытии
npm run test:coverage

# Проверка типов TypeScript без сборки
npx tsc --noEmit

# Комплексный аудит (тесты + проверка типов + сборка)
npm run audit:all
```

### 5. Сборка для production
```bash
npm run build
# Компилирует TypeScript и выполняет оптимизированную сборку Vite в папку dist/
```

### 6. Оптимизация медиа-ресурсов
```bash
npm run optimize:assets
# Сжимает портреты персонажей и фоновые изображения для уменьшения прекэша PWA
```

---

## 📚 Документация проекта

- **[`AGENTS.md`](AGENTS.md)** — **Главная инструкция для AI-агентов Antigravity** (рабочий процесс, язык общения, инварианты).
- **[`.agents/rules/`](.agents/rules/)** — Специализированные правила:
  - [`git-workflow.md`](.agents/rules/git-workflow.md) — регламент работы с ветками Git.
  - [`code-quality.md`](.agents/rules/code-quality.md) — стандарты тестирования и проверок.
  - [`ui-neo-noir.md`](.agents/rules/ui-neo-noir.md) — дизайн-система Neo-Noir и визуальные инварианты.
  - [`security-multiplayer.md`](.agents/rules/security-multiplayer.md) — авторитетный сервер и безопасность.
- **[`docs/`](docs/)** — Техническая база знаний:
  - [`PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) — концепция игры и платформы.
  - [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) — глубокая архитектура клиента и сервера.
  - [`GAME_MODES.md`](docs/GAME_MODES.md) — подробные правила 4 режимов и TV Party.
  - [`TECHNICAL_DEBT.md`](docs/TECHNICAL_DEBT.md) — реестр технического долга.
  - [`DECISIONS.md`](docs/DECISIONS.md) — журнал архитектурных решений (ADR).
  - [`GAME_RULES.md`](docs/GAME_RULES.md) — исходный официальный свод правил.
  - [`archive/agents-legacy.md`](docs/archive/agents-legacy.md) — архив устаревшего регламента JSON-патчера.

---

## 📌 Текущий статус проекта

- **Ветка разработки:** `feature/tv-party-enhancements`
- **Тестовое покрытие:** 41 файл тестов пройден успешно (233 теста).
- **ТВ-режим:** Макет в 3 колонки, D-Pad навигация, вырезка 3×3 на смартфонах завершены.
- **Следующий шаг:** Проверки тач-свайпов на физических смартфонах и подготовка к интеграции Capacitor (Android).
