// SEC-ENV-01: формирование CSP и вставка meta-тега только в production-сборку.
import { describe, it, expect } from "vitest";
import {
  CSP_META_HTTP_EQUIV,
  buildCspMetaTag,
  buildCspPolicy,
  createCspPlugin,
} from "../cspPolicy";

function getDirective(policy: string, name: string): string {
  const match = policy.match(new RegExp(`(?:^|;)\\s*${name}\\s+([^;]+);`));
  return match ? match[1].trim() : "";
}

describe("SEC-ENV-01: CSP policy", () => {
  const policy = buildCspPolicy();

  it("содержит обязательные директивы", () => {
    expect(getDirective(policy, "default-src")).toBe("'self'");
    expect(getDirective(policy, "script-src")).toBe("'self'");
    expect(getDirective(policy, "img-src")).toContain("data:");
    expect(getDirective(policy, "img-src")).toContain("blob:");
    expect(getDirective(policy, "font-src")).toContain("data:");
    expect(getDirective(policy, "media-src")).toContain("'self'");
    expect(getDirective(policy, "object-src")).toBe("'none'");
    expect(getDirective(policy, "base-uri")).toBe("'self'");
    expect(getDirective(policy, "form-action")).toBe("'self'");
  });

  it("style-src разрешает инлайн-стили Tailwind/Framer Motion", () => {
    expect(getDirective(policy, "style-src")).toContain("'unsafe-inline'");
  });

  it("connect-src покрывает Supabase, PartyKit и fallback-шлюз", () => {
    const connectSrc = getDirective(policy, "connect-src");
    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain("https://*.supabase.co");
    expect(connectSrc).toContain("wss://*.supabase.co");
    expect(connectSrc).toContain("https://*.partykit.dev");
    expect(connectSrc).toContain("wss://*.partykit.dev");
    expect(connectSrc).toContain("https://*.onrender.com");
  });

  it("не содержит опасных script-разрешений", () => {
    expect(policy).not.toContain("'unsafe-eval'");
    expect(getDirective(policy, "script-src")).not.toContain("'unsafe-inline'");
    expect(getDirective(policy, "script-src")).not.toContain("*");
  });

  it("не включает frame-ancestors (в meta-теге не работает)", () => {
    expect(policy).not.toContain("frame-ancestors");
  });

  it("добавляет дополнительные connect-src из конфигурации", () => {
    const custom = buildCspPolicy({ extraConnectSrc: ["wss://custom.example"] });
    expect(getDirective(custom, "connect-src")).toContain("wss://custom.example");
  });

  it("buildCspMetaTag формирует корректный meta-тег", () => {
    const tag = buildCspMetaTag();
    expect(tag).toContain(`http-equiv="${CSP_META_HTTP_EQUIV}"`);
    expect(tag).toContain(buildCspPolicy());
  });
});

describe("SEC-ENV-01: Vite CSP plugin", () => {
  it("применяется только на сборке (apply: build)", () => {
    expect(createCspPlugin().apply).toBe("build");
  });

  it("вставляет meta-CSP в head", () => {
    const plugin = createCspPlugin();
    const html = "<!doctype html><html><head><meta charset=\"UTF-8\" /></head><body></body></html>";
    const result = plugin.transformIndexHtml(html);

    expect(result).toContain(`http-equiv="${CSP_META_HTTP_EQUIV}"`);
    expect(result).toContain(buildCspPolicy());
    expect(result.indexOf(CSP_META_HTTP_EQUIV)).toBeLessThan(result.indexOf("<body"));
  });

  it("идемпотентен: не дублирует meta-тег", () => {
    const plugin = createCspPlugin();
    const html = "<html><head></head><body></body></html>";
    const once = plugin.transformIndexHtml(html);
    const twice = plugin.transformIndexHtml(once);

    const occurrences = twice.match(/http-equiv="Content-Security-Policy"/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });

  it("не меняет HTML без <head> (не падает)", () => {
    const plugin = createCspPlugin();
    const html = "<div id=\"root\"></div>";
    expect(plugin.transformIndexHtml(html)).toBe(html);
  });
});
