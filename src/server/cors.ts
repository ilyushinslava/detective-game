/**
 * SEC-ENV-02: Allowlist для CORS на PartyKit-сервере.
 *
 * Раньше все HTTP-эндпоинты (`list`, `resolve`, `verify_morse`) отдавали
 * `Access-Control-Allow-Origin: *`, из-за чего любой сторонний сайт,
 * открытый в соседней вкладке, мог читать список комнат и статусы игроков.
 *
 * Теперь cross-origin разрешён только для явного списка origins:
 *  - список берётся из env `ALLOWED_ORIGINS` (через запятую);
 *  - если env не задан — используется безопасный дефолт (dev + известный прод);
 *  - запрос без заголовка `Origin` (same-origin, curl, health-check) не блокируется,
 *    но и CORS-заголовки ему не добавляются;
 *  - запрос с неизвестным `Origin` получает ответ без CORS-заголовков
 *    (браузер сам заблокирует чтение), а preflight `OPTIONS` — явный `403`.
 *
 * Выбор «ответ без CORS-заголовков» для обычных запросов (а не `403`) минимально
 * ломает не-браузерных клиентов (curl, мониторинг, мобильные WebView без Origin)
 * и при этом полностью закрывает доступ из браузера: без ACAO прочитать ответ нельзя.
 */

/** Имя переменной окружения со списком разрешённых origins через запятую. */
export const ALLOWED_ORIGINS_ENV_KEY = "ALLOWED_ORIGINS";

/**
 * Безопасный дефолт, если `ALLOWED_ORIGINS` не задан.
 * Включает только локальную разработку и известные прод-платформы проекта.
 */
export const DEFAULT_ALLOWED_ORIGINS: readonly string[] = [
  // Локальная разработка: vite dev и vite preview
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  // Production: GitHub Pages (npm run deploy → gh-pages, og:url в index.html)
  "https://ilyushinslava.github.io",
  // Capacitor WebView (Android/iOS)
  "https://localhost",
  "capacitor://localhost",
];

/** Разрешённые методы для preflight-запроса. */
const ALLOWED_METHODS = "GET, POST, OPTIONS";

/** Разрешённые заголовки для preflight-запроса. */
const ALLOWED_HEADERS = "Content-Type, Authorization";

/** Время кэширования preflight-ответа браузером (10 минут). */
const PREFLIGHT_MAX_AGE = "600";

/**
 * Приватные/локальные сети: TV Party в dev-режиме открывается с телефона по LAN-IP
 * (vite на `:5173`, PartyKit на `:1999`), то есть запрос кросс-доменный.
 * Без этих origins локальный режим вечеринки на телефоне перестал бы работать.
 */
const PRIVATE_NETWORK_ORIGIN_RE =
  /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?::\d{1,5})?$/i;

/** Нормализует origin: убирает пробелы и завершающий слэш. */
function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

/** Проверяет, является ли origin локальным/LAN-адресом (только http/https). */
export function isPrivateNetworkOrigin(origin: string): boolean {
  return PRIVATE_NETWORK_ORIGIN_RE.test(normalizeOrigin(origin));
}

/**
 * Сопоставляет origin с шаблоном из allowlist.
 * Поддерживает точное совпадение (без учёта регистра) и `*` как wildcard
 * (например, `https://*.example.com`). Точка в шаблоне экранируется.
 */
export function matchesOriginPattern(origin: string, pattern: string): boolean {
  const cleanOrigin = normalizeOrigin(origin).toLowerCase();
  const cleanPattern = normalizeOrigin(pattern).toLowerCase();
  if (!cleanOrigin || !cleanPattern) return false;
  if (!cleanPattern.includes("*")) return cleanOrigin === cleanPattern;

  const escaped = cleanPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(cleanOrigin);
}

/**
 * Парсит список origins из env-строки.
 * Пустая/некорректная строка → безопасный дефолт.
 */
export function parseAllowedOrigins(raw?: string | null): string[] {
  const parsed = String(raw ?? "")
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_ORIGINS];
}

/**
 * Возвращает список разрешённых origins.
 * Источники (по приоритету): переданный env-объект → `process.env.ALLOWED_ORIGINS` → дефолт.
 * Все чтения защищены: PartyKit может работать в окружении без `process`.
 */
export function resolveAllowedOrigins(
  env?: Record<string, unknown> | null
): string[] {
  const fromEnvObject = env?.[ALLOWED_ORIGINS_ENV_KEY];
  if (typeof fromEnvObject === "string" && fromEnvObject.trim()) {
    return parseAllowedOrigins(fromEnvObject);
  }

  try {
    const proc = (globalThis as { process?: { env?: Record<string, unknown> } }).process;
    const fromProcess = proc?.env?.[ALLOWED_ORIGINS_ENV_KEY];
    if (typeof fromProcess === "string" && fromProcess.trim()) {
      return parseAllowedOrigins(fromProcess);
    }
  } catch (_) {
    // окружение без process — используем дефолт
  }

  return [...DEFAULT_ALLOWED_ORIGINS];
}

/** Проверяет, разрешён ли origin: точное совпадение, wildcard-шаблон или приватная сеть. */
export function isOriginAllowed(
  origin: string | null | undefined,
  allowlist: readonly string[] = DEFAULT_ALLOWED_ORIGINS
): boolean {
  if (!origin) return false;
  const cleanOrigin = normalizeOrigin(origin);
  if (!cleanOrigin) return false;
  if (isPrivateNetworkOrigin(cleanOrigin)) return true;
  return allowlist.some((pattern) => matchesOriginPattern(cleanOrigin, pattern));
}

/**
 * Формирует CORS-заголовки для ответа.
 * - без `Origin` → пустой объект (same-origin/curl не ломаем);
 * - origin не в allowlist → пустой объект (браузер заблокирует чтение);
 * - origin разрешён → `Access-Control-Allow-Origin` + `Vary: Origin`,
 *   для preflight дополнительно методы/заголовки/`Max-Age`.
 */
export function buildCorsHeaders(
  origin: string | null | undefined,
  allowlist: readonly string[] = DEFAULT_ALLOWED_ORIGINS,
  options: { preflight?: boolean } = {}
): Record<string, string> {
  if (!origin || !isOriginAllowed(origin, allowlist)) return {};

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": normalizeOrigin(origin),
    Vary: "Origin",
  };

  if (options.preflight) {
    headers["Access-Control-Allow-Methods"] = ALLOWED_METHODS;
    headers["Access-Control-Allow-Headers"] = ALLOWED_HEADERS;
    headers["Access-Control-Max-Age"] = PREFLIGHT_MAX_AGE;
  }

  return headers;
}

/** Извлекает заголовок `Origin` из запроса (учитывает регистр через Headers API). */
export function getRequestOrigin(req: Request): string | null {
  return req.headers.get("origin");
}

/**
 * Единая точка обработки preflight `OPTIONS`.
 * Возвращает `null`, если запрос не preflight (тогда обработку продолжает роут).
 */
export function buildPreflightResponse(
  req: Request,
  allowlist: readonly string[] = DEFAULT_ALLOWED_ORIGINS
): Response | null {
  if (req.method !== "OPTIONS") return null;

  const origin = getRequestOrigin(req);
  if (origin && !isOriginAllowed(origin, allowlist)) {
    // Явный отказ preflight для недоверенного origin. Без ACAO браузер
    // заблокировал бы запрос и сам, но 403 делает поведение однозначным.
    return new Response(null, { status: 403, headers: { Vary: "Origin" } });
  }

  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(origin, allowlist, { preflight: true }),
  });
}
