/**
 * SEC-ENV-01: Content Security Policy для production-сборки.
 *
 * Политика НЕ вставляется в `index.html` статически: иначе она применялась бы
 * и в dev-режиме и ломала бы Vite HMR (websocket, inline-скрипты dev-сервера).
 * Вместо этого Vite-плагин `createCspPlugin()` добавляет `<meta>`-тег только
 * на этапе `vite build` (`apply: "build"`).
 *
 * Ограничения meta-тега: директивы `frame-ancestors`, `report-uri` и
 * `sandbox` через `<meta http-equiv="Content-Security-Policy">` не работают
 * (спецификация CSP их игнорирует). Защита от фрейминга должна настраиваться
 * HTTP-заголовком на хостинге (например, `Content-Security-Policy: frame-ancestors 'none'`
 * или `X-Frame-Options: DENY`), поэтому в строку политики они не включены.
 */

/** Атрибут meta-тега с политикой. */
export const CSP_META_HTTP_EQUIV = "Content-Security-Policy";

/** Известные внешние источники подключений проекта. */
export const CSP_CONNECT_SRC_BASE: readonly string[] = [
  // Собственные запросы и ассеты
  "'self'",
  // Supabase: REST/RPC по HTTPS и Realtime по WSS
  "https://*.supabase.co",
  "wss://*.supabase.co",
  // PartyKit Cloud (WebSocket + HTTP-эндпоинты list/resolve/verify_morse)
  "https://*.partykit.dev",
  "wss://*.partykit.dev",
  // Резервный standalone-шлюз из GAME_CONFIG.NETWORK.FALLBACK_GATEWAYS
  "https://*.onrender.com",
  "wss://*.onrender.com",
  // Локальный `vite preview` / standalone-сервер на loopback.
  // Только loopback: внешние хосты этими правилами не покрываются.
  "http://localhost:*",
  "ws://localhost:*",
  "http://127.0.0.1:*",
  "ws://127.0.0.1:*",
];

export interface CspConfig {
  /** Дополнительные источники для `connect-src` (кастомный VITE_WS_GATEWAY и т.п.). */
  extraConnectSrc?: readonly string[];
}

/**
 * Собирает строку CSP.
 *
 * Пояснение директив:
 * - `default-src 'self'` — базовое правило: всё, что не описано ниже, только с нашего origin.
 * - `script-src 'self'` — только собственные бандлы; `'unsafe-inline'`/`'unsafe-eval'` запрещены.
 * - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` — Tailwind и
 *   Framer Motion пишут инлайн-стили, плюс CSS Google Fonts из index.html.
 * - `font-src 'self' data: https://fonts.gstatic.com` — локальные шрифты и файлы Google Fonts.
 * - `img-src 'self' data: blob:` — ассеты, data-URI и blob (QR-сканер, canvas).
 * - `media-src 'self' data: blob: mediastream:` — звуки из public/sounds и аудиопотоки.
 * - `connect-src` — Supabase, PartyKit, fallback-шлюз и loopback для preview.
 * - `worker-src 'self' blob:` — service worker PWA и blob-воркеры.
 * - `object-src 'none'` — полный запрет плагинов/`<object>`.
 * - `base-uri 'self'` — запрет подмены `<base>` (защита от инъекций относительных путей).
 * - `form-action 'self'` — формы не могут отправлять данные на сторонний origin.
 */
export function buildCspPolicy(config: CspConfig = {}): string {
  const connectSrc = [
    ...CSP_CONNECT_SRC_BASE,
    ...(config.extraConnectSrc ?? []).map((item) => item.trim()).filter(Boolean),
  ];

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'"]],
    ["style-src", ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]],
    ["font-src", ["'self'", "data:", "https://fonts.gstatic.com"]],
    ["img-src", ["'self'", "data:", "blob:"]],
    ["media-src", ["'self'", "data:", "blob:", "mediastream:"]],
    ["connect-src", connectSrc],
    ["worker-src", ["'self'", "blob:"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
  ];

  return directives.map(([name, values]) => `${name} ${values.join(" ")};`).join(" ");
}

/** Готовый HTML meta-тег с CSP (используется плагином и тестами). */
export function buildCspMetaTag(config: CspConfig = {}): string {
  return `<meta http-equiv="${CSP_META_HTTP_EQUIV}" content="${buildCspPolicy(config)}" />`;
}

/** Минимальная структурная сигнатура Vite-плагина (без импорта типов Vite). */
export interface CspVitePlugin {
  name: string;
  apply: "build";
  transformIndexHtml: (html: string) => string;
}

/**
 * Vite-плагин: вставляет CSP только в production-сборку.
 * `apply: "build"` гарантирует, что dev-сервер и HMR политику не получают.
 * Повторный вызов идемпотентен (не дублирует meta-тег).
 */
export function createCspPlugin(config: CspConfig = {}): CspVitePlugin {
  const metaTag = buildCspMetaTag(config);

  return {
    name: "neo-noir-csp-meta",
    apply: "build",
    transformIndexHtml(html: string): string {
      if (html.includes(`http-equiv="${CSP_META_HTTP_EQUIV}"`)) {
        return html;
      }
      return html.replace(/<head(\s[^>]*)?>/i, (headTag) => `${headTag}\n    ${metaTag}`);
    },
  };
}
