// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { soundManager } from "../audio";
import {
  triggerHaptic,
  setHapticsEnabled,
  getHapticsEnabled,
  hapticImpactLight,
  hapticImpactMedium,
  hapticSuccess,
  hapticError,
} from "../haptics";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

vi.mock("@capacitor/haptics", () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
    vibrate: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: {
    Heavy: "HEAVY",
    Medium: "MEDIUM",
    Light: "LIGHT",
  },
  NotificationType: {
    Success: "SUCCESS",
    Warning: "WARNING",
    Error: "ERROR",
  },
}));

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
        "arrest", "error", "deny", "click", "confirm", "tapMenu", "impact", "gameStart", "win", "lose"
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

    it("startMorseTone и stopMorseTone управляют воспроизведением сигнала Морзе", () => {
      (soundManager as any).isSfxEnabled = true;
      const playSpy = vi.spyOn(soundManager, "play").mockImplementation(() => {});

      soundManager.startMorseTone(700);
      expect(playSpy).toHaveBeenCalledWith("confirm", 0.4);

      expect(() => soundManager.stopMorseTone()).not.toThrow();
      playSpy.mockRestore();
    });

    it("startMorseTone не запускается, если SFX отключен", () => {
      if (soundManager.getSfxEnabled()) {
        soundManager.toggleSfx();
      }
      expect(soundManager.getSfxEnabled()).toBe(false);
      const playSpy = vi.spyOn(soundManager, "play").mockImplementation(() => {});
      soundManager.startMorseTone(700);
      expect(playSpy).not.toHaveBeenCalled();
      soundManager.toggleSfx(); // возвращаем в исходное
      playSpy.mockRestore();
    });

    it("startTvAmbient и stopTvAmbient управляют воспроизведением нео-нуарного эмбиента через аудиосэмплы", () => {
      (soundManager as any).isAmbientEnabled = true;
      const playAmbientSpy = vi.spyOn(soundManager, "playAmbient").mockImplementation(() => {});
      const stopAmbientSpy = vi.spyOn(soundManager, "stopAmbient").mockImplementation(() => {});

      // 1. Запуск ТВ-эмбиента
      soundManager.startTvAmbient(0.16);
      expect(playAmbientSpy).toHaveBeenCalledWith(0.16);

      // 2. Остановка ТВ-эмбиента
      soundManager.stopTvAmbient();
      expect(stopAmbientSpy).toHaveBeenCalled();

      // 3. Повторный вызов stopTvAmbient безопасен
      expect(() => soundManager.stopTvAmbient()).not.toThrow();

      // 4. Не запускается при выключенном эмбиенте
      (soundManager as any).isAmbientEnabled = false;
      playAmbientSpy.mockClear();
      soundManager.startTvAmbient(0.16);
      expect(playAmbientSpy).not.toHaveBeenCalled();
      (soundManager as any).isAmbientEnabled = true;

      playAmbientSpy.mockRestore();
      stopAmbientSpy.mockRestore();
    });
  });

  describe("triggerHaptic", () => {
    it("При доступности Capacitor Haptics вызывает нативные методы плагина", async () => {
      vi.spyOn(Capacitor, "isPluginAvailable").mockReturnValue(true);
      (Haptics.impact as any).mockClear();
      (Haptics.notification as any).mockClear();

      setHapticsEnabled(true);

      triggerHaptic("light");
      expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });

      triggerHaptic("medium");
      expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Medium });

      triggerHaptic("heavy");
      expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Heavy });

      triggerHaptic("success");
      expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Success });

      triggerHaptic("error");
      expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Error });

      triggerHaptic("turn");
      expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Warning });
    });

    it("Семантические хелперы hapticImpactLight, hapticSuccess, hapticError вызывают правильные события", () => {
      vi.spyOn(Capacitor, "isPluginAvailable").mockReturnValue(true);
      (Haptics.impact as any).mockClear();
      (Haptics.notification as any).mockClear();

      setHapticsEnabled(true);

      hapticImpactLight();
      expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });

      hapticImpactMedium();
      expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Medium });

      hapticSuccess();
      expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Success });

      hapticError();
      expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Error });
    });

    it("При недоступности Capacitor Haptics вызывает navigator.vibrate с правильными таймингами", () => {
      vi.spyOn(Capacitor, "isPluginAvailable").mockReturnValue(false);

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

      triggerHaptic("turn");
      expect(vibrateMock).toHaveBeenCalledWith([100, 50, 100]);
    });

    it("Не вызывает вибрацию, если тактильный отклик отключен", () => {
      vi.spyOn(Capacitor, "isPluginAvailable").mockReturnValue(true);
      (Haptics.impact as any).mockClear();

      setHapticsEnabled(false);
      triggerHaptic("heavy");
      expect(Haptics.impact).not.toHaveBeenCalled();
    });

    it("Безопасно отрабатывает на iOS Safari при отсутствии navigator.vibrate (DEBT-05)", () => {
      vi.spyOn(Capacitor, "isPluginAvailable").mockReturnValue(false);
      Object.defineProperty(navigator, "vibrate", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      setHapticsEnabled(true);
      expect(() => {
        triggerHaptic("light");
        triggerHaptic("medium");
        triggerHaptic("heavy");
      }).not.toThrow();

      const tickInput = document.getElementById("haptic-tick-input");
      expect(tickInput).not.toBeNull();
      expect(tickInput?.getAttribute("role")).toBe("switch");
    });

    it("Перехватывает исключения NotAllowedError/SecurityError из navigator.vibrate без падения приложения", () => {
      vi.spyOn(Capacitor, "isPluginAvailable").mockReturnValue(false);
      const failingVibrate = vi.fn().mockImplementation(() => {
        throw new Error("NotAllowedError: vibration not allowed without user gesture");
      });
      Object.defineProperty(navigator, "vibrate", {
        value: failingVibrate,
        writable: true,
        configurable: true,
      });

      setHapticsEnabled(true);
      expect(() => triggerHaptic("error")).not.toThrow();
      expect(failingVibrate).toHaveBeenCalledWith([40, 30, 60]);
    });
  });
});
