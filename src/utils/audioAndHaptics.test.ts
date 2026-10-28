// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { soundManager } from "./audio";
import { triggerHaptic, setHapticsEnabled, getHapticsEnabled } from "./haptics";

describe("Звуковая система и тактильный отклик (audioAndHaptics)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  describe("soundManager", () => {
    it("Воспроизводит все 11 ключевых звуковых типов без ошибок", () => {
      const soundTypes = [
        "splash", "slide", "kill", "disguise", "radar",
        "arrest", "error", "deny", "click", "tapMenu", "impact", "gameStart", "win", "lose"
      ] as const;

      soundTypes.forEach((type) => {
        expect(() => soundManager.play(type)).not.toThrow();
      });
    });

    it("Переключение SFX и эмбиента корректно меняет флаги", () => {
      const initialSfx = soundManager.getSfxEnabled();
      const toggledSfx = soundManager.toggleSfx();
      expect(toggledSfx).toBe(!initialSfx);
      expect(soundManager.getSfxEnabled()).toBe(!initialSfx);

      const initialAmbient = soundManager.getAmbientEnabled();
      const toggledAmbient = soundManager.toggleAmbient();
      expect(toggledAmbient).toBe(!initialAmbient);
    });
  });

  describe("triggerHaptic", () => {
    it("Вызывает navigator.vibrate с правильными таймингами", () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, "vibrate", {
        value: vibrateMock,
        writable: true,
        configurable: true,
      });

      setHapticsEnabled(true);
      expect(getHapticsEnabled()).toBe(true);

      triggerHaptic("light");
      expect(vibrateMock).toHaveBeenCalledWith(15);

      triggerHaptic("medium");
      expect(vibrateMock).toHaveBeenCalledWith([40, 30, 40]);

      triggerHaptic("heavy");
      expect(vibrateMock).toHaveBeenCalledWith(100);

      triggerHaptic("success");
      expect(vibrateMock).toHaveBeenCalledWith([20, 40, 20]);

      triggerHaptic("error");
      expect(vibrateMock).toHaveBeenCalledWith([40, 30, 60]);
    });

    it("Не вызывает вибрацию, если тактильный отклик отключен", () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, "vibrate", {
        value: vibrateMock,
        writable: true,
        configurable: true,
      });

      setHapticsEnabled(false);
      triggerHaptic("heavy");
      expect(vibrateMock).not.toHaveBeenCalled();
    });
  });
});
