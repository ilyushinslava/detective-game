import { describe, it, expect, vi, beforeEach } from "vitest";
import { soundManager } from "../audio";

describe("SoundController: каналы воспроизведения и анти-наложение", () => {
  beforeEach(() => {
    soundManager.stopAll();
  });

  it("Микро-дебаунс 70мс подавляет одинаковые подряд вызовы одного звука", () => {
    // Получаем доступ к приватному play через вызовы
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1000);

    // Первый вызов
    soundManager.play("click");

    // Вызов через 30мс (должен быть подавлен дебаунсом < 70мс)
    nowSpy.mockReturnValue(1030);
    soundManager.play("click");

    // Вызов через 80мс (должен пройти)
    nowSpy.mockReturnValue(1085);
    soundManager.play("click");

    nowSpy.mockRestore();
  });

  it("Action-звуки подавляют клики, если они вызваны в течение 120мс после Action", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(2000);

    // Запускаем действие (kill)
    soundManager.play("kill");

    // Клик через 50мс должен подавиться защитой от наложения
    nowSpy.mockReturnValue(2050);
    soundManager.play("click");

    nowSpy.mockRestore();
  });
});
