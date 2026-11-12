// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { soundManager } from "../audio";
import { triggerHaptic, setHapticsEnabled, getHapticsEnabled } from "../haptics";

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

    it("startMorseTone и stopMorseTone управляют аналоговым тоном и огибающей 15мс (TASK-SND-001)", () => {
      (soundManager as any).isSfxEnabled = true;

      const mockOsc = {
        type: "sine",
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
      };
      const mockGain = {
        gain: {
          value: 0.2,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      const mockCtx = {
        state: "suspended",
        currentTime: 0,
        resume: vi.fn().mockResolvedValue(undefined),
        createOscillator: vi.fn().mockReturnValue(mockOsc),
        createGain: vi.fn().mockReturnValue(mockGain),
        createBuffer: vi.fn().mockReturnValue({}),
        createBufferSource: vi.fn().mockReturnValue({ connect: vi.fn(), start: vi.fn() }),
        destination: {},
      };

      (soundManager as any).ctx = mockCtx;

      // 1. Запуск тона с частотой 700 Гц
      soundManager.startMorseTone(700);

      expect(mockCtx.resume).toHaveBeenCalled();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();
      expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(700, 0);
      expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
      expect(mockGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.2, 0.015);
      expect(mockOsc.start).toHaveBeenCalledWith(0);

      // 2. Защита от дубликатов: повторный start не создает новый осциллятор
      soundManager.startMorseTone(700);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);

      // 3. Остановка тона с плавным release спадом
      soundManager.stopMorseTone();
      expect(mockGain.gain.cancelScheduledValues).toHaveBeenCalledWith(0);
      expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0.2, 0);
      expect(mockGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.0001, 0.015);
      expect(mockOsc.stop).toHaveBeenCalledWith(0.02);

      // 4. Безопасность повторной остановки
      expect(() => soundManager.stopMorseTone()).not.toThrow();
    });

    it("startMorseTone не запускается, если SFX отключен", () => {
      if (soundManager.getSfxEnabled()) {
        soundManager.toggleSfx();
      }
      expect(soundManager.getSfxEnabled()).toBe(false);
      expect(() => soundManager.startMorseTone(700)).not.toThrow();
      soundManager.toggleSfx(); // возвращаем в исходное
    });

    it("startTvAmbient и stopTvAmbient управляют процедурным аналоговым нео-нуарным эмбиентом на Web Audio API", () => {
      (soundManager as any).isAmbientEnabled = true;

      const mockOsc = {
        type: "sine",
        frequency: { setValueAtTime: vi.fn(), value: 55 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
      };
      const mockFilter = {
        type: "lowpass",
        frequency: { setValueAtTime: vi.fn(), value: 140 },
        Q: { setValueAtTime: vi.fn(), value: 2.0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      const mockGain = {
        gain: {
          value: 0.16,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      const mockCtx = {
        state: "suspended",
        currentTime: 0,
        resume: vi.fn().mockResolvedValue(undefined),
        createOscillator: vi.fn().mockReturnValue(mockOsc),
        createBiquadFilter: vi.fn().mockReturnValue(mockFilter),
        createGain: vi.fn().mockReturnValue(mockGain),
        createBuffer: vi.fn().mockReturnValue({}),
        createBufferSource: vi.fn().mockReturnValue({ connect: vi.fn(), start: vi.fn() }),
        destination: {},
      };

      (soundManager as any).ctx = mockCtx;

      // 1. Запуск ТВ-эмбиента
      soundManager.startTvAmbient(0.16);
      expect(mockCtx.resume).toHaveBeenCalled();
      expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(soundManager.isTvAmbientActive()).toBe(true);

      // 2. Защита от дубликатов: повторный start не создает новые ноды
      const oscCallsBefore = mockCtx.createOscillator.mock.calls.length;
      soundManager.startTvAmbient(0.16);
      expect(mockCtx.createOscillator.mock.calls.length).toBe(oscCallsBefore);

      // 3. Остановка ТВ-эмбиента с плавным затуханием
      soundManager.stopTvAmbient();
      expect(soundManager.isTvAmbientActive()).toBe(false);
      expect(mockGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.0001, 1.2);
      expect(mockOsc.stop).toHaveBeenCalledWith(1.25);

      // 4. Повторный вызов stopTvAmbient безопасен
      expect(() => soundManager.stopTvAmbient()).not.toThrow();

      // 5. Не запускается при выключенном эмбиенте
      (soundManager as any).isAmbientEnabled = false;
      soundManager.startTvAmbient(0.16);
      expect(soundManager.isTvAmbientActive()).toBe(false);
      (soundManager as any).isAmbientEnabled = true;
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

    it("Безопасно отрабатывает на iOS Safari при отсутствии navigator.vibrate (DEBT-05)", () => {
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
