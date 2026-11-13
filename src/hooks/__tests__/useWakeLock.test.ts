// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWakeLock } from "../useWakeLock";

describe("useWakeLock Hook (Device API: Screen Wake Lock)", () => {
  let originalWakeLock: any;
  let mockSentinel: any;
  let releaseListeners: Array<() => void>;

  beforeEach(() => {
    releaseListeners = [];
    mockSentinel = {
      released: false,
      release: vi.fn().mockImplementation(async () => {
        mockSentinel.released = true;
        releaseListeners.forEach((cb) => cb());
      }),
      addEventListener: vi.fn().mockImplementation((event: string, cb: () => void) => {
        if (event === "release") {
          releaseListeners.push(cb);
        }
      }),
      removeEventListener: vi.fn(),
    };

    originalWakeLock = (navigator as any).wakeLock;

    Object.defineProperty(navigator, "wakeLock", {
      value: {
        request: vi.fn().mockResolvedValue(mockSentinel),
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (originalWakeLock !== undefined) {
      Object.defineProperty(navigator, "wakeLock", {
        value: originalWakeLock,
        configurable: true,
        writable: true,
      });
    } else {
      // @ts-ignore
      delete navigator.wakeLock;
    }
  });

  it("запрашивает блокировку сна экрана при монтировании, если enabled = true", async () => {
    const onRequestSpy = vi.fn();
    const { result } = renderHook(() => useWakeLock({ enabled: true, onRequest: onRequestSpy }));

    expect(result.current.isSupported).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(navigator.wakeLock.request).toHaveBeenCalledWith("screen");
    expect(onRequestSpy).toHaveBeenCalledTimes(1);
    expect(result.current.isActive).toBe(true);
  });

  it("освобождает блокировку сна при размонтировании хука", async () => {
    const onReleaseSpy = vi.fn();
    const { unmount } = renderHook(() => useWakeLock({ enabled: true, onRelease: onReleaseSpy }));

    await act(async () => {
      await Promise.resolve();
    });

    unmount();

    expect(mockSentinel.release).toHaveBeenCalledTimes(1);
  });

  it("повторно запрашивает блокировку при возвращении страницы в фокус (visibilitychange)", async () => {
    renderHook(() => useWakeLock({ enabled: true }));

    await act(async () => {
      await Promise.resolve();
    });
    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);

    // Симулируем отпускание блокировки браузером при сворачивании
    await act(async () => {
      mockSentinel.released = true;
      releaseListeners.forEach((cb) => cb());
    });

    // Возвращение страницы в фокус
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2);
  });

  it("безопасно работает и возвращает isSupported = false, если Wake Lock не поддерживается", () => {
    // @ts-ignore
    delete navigator.wakeLock;

    const { result } = renderHook(() => useWakeLock({ enabled: true }));

    expect(result.current.isSupported).toBe(false);
    expect(result.current.isActive).toBe(false);
  });
});
