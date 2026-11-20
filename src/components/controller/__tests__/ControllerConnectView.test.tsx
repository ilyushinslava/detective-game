// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { ControllerConnectView } from "../ControllerConnectView";
import {
  morseToRoomRegistry,
  morseToRoomsRegistry,
  roomToMorseRegistry,
  publicRoomsRegistry,
} from "../../../server/index";
import { soundManager } from "../../../utils/audio";

vi.mock("html5-qrcode", () => {
  return {
    Html5Qrcode: vi.fn().mockImplementation(() => ({
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn(),
      isScanning: false,
    })),
  };
});

describe("ControllerConnectView Component (TASK-NET-002 & Phase 8 Tabs)", () => {
  beforeEach(() => {
    morseToRoomRegistry.clear();
    morseToRoomsRegistry.clear();
    roomToMorseRegistry.clear();
    publicRoomsRegistry.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("рендерит навигацию с двумя вкладками (КАМЕРА, МОРЗЕ) без ПИН-кода", () => {
    render(<ControllerConnectView onConnect={vi.fn()} onBackToMenu={vi.fn()} />);

    expect(screen.getByText(/ПУЛЬТ УПРАВЛЕНИЯ/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /КАМЕРА/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /МОРЗЕ/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /ПИН-КОД/i })).toBeNull();
  });

  it("поддерживает переключение между вкладками КАМЕРА и МОРЗЕ", () => {
    render(<ControllerConnectView onConnect={vi.fn()} onBackToMenu={vi.fn()} />);

    // По умолчанию активна КАМЕРА
    const morseTabBtn = screen.getByRole("button", { name: /МОРЗЕ/i });
    fireEvent.click(morseTabBtn);

    // Появился телеграфный ключ
    expect(screen.getByRole("button", { name: "Ключ телеграфа" })).toBeDefined();

    // Возврат на вкладку КАМЕРА
    const cameraTabBtn = screen.getByRole("button", { name: /КАМЕРА/i });
    fireEvent.click(cameraTabBtn);
    expect(screen.queryByRole("button", { name: "Ключ телеграфа" })).toBeNull();
  });

  it("записывает точку по короткому нажатию и тире по удержанию на вкладке МОРЗЕ", () => {
    const startToneSpy = vi.spyOn(soundManager, "startMorseTone");
    const stopToneSpy = vi.spyOn(soundManager, "stopMorseTone");

    const { unmount } = render(<ControllerConnectView onConnect={vi.fn()} onBackToMenu={vi.fn()} />);
    startToneSpy.mockClear();
    stopToneSpy.mockClear();

    // Переходим на вкладку МОРЗЕ
    const morseTabBtn = screen.getByRole("button", { name: /МОРЗЕ/i });
    fireEvent.click(morseTabBtn);

    const telegraphBtn = screen.getByRole("button", { name: "Ключ телеграфа" });
    expect(telegraphBtn).toBeDefined();

    let simulatedTime = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => simulatedTime);

    // 1. Короткий клик (<250ms) -> Точка (.)
    simulatedTime = 1000;
    fireEvent.pointerDown(telegraphBtn);
    expect(startToneSpy).toHaveBeenCalledWith(700);

    simulatedTime = 1100; // 100ms
    fireEvent.pointerUp(telegraphBtn);
    expect(stopToneSpy).toHaveBeenCalledTimes(1);

    // 2. Долгое удержание (>=250ms) -> Тире (-)
    simulatedTime = 2000;
    fireEvent.pointerDown(telegraphBtn);
    expect(startToneSpy).toHaveBeenCalledTimes(2);

    simulatedTime = 2400; // 400ms
    fireEvent.pointerUp(telegraphBtn);
    expect(stopToneSpy).toHaveBeenCalledTimes(2);

    // 3. Pointer leave безопасно глушит тон
    fireEvent.pointerDown(telegraphBtn);
    fireEvent.pointerLeave(telegraphBtn);
    expect(stopToneSpy).toHaveBeenCalledTimes(3);

    // 4. Unmount гарантирует снятие звука
    unmount();
    expect(stopToneSpy).toHaveBeenCalledTimes(4);
  });

  it("находит и подключает комнату при вводе 7 верных сигналов Морзе", async () => {
    morseToRoomRegistry.set(".......", "room-alpha-99");

    const connectSpy = vi.fn();
    render(<ControllerConnectView onConnect={connectSpy} onBackToMenu={vi.fn()} />);

    // Переходим на вкладку МОРЗЕ
    const morseTabBtn = screen.getByRole("button", { name: /МОРЗЕ/i });
    fireEvent.click(morseTabBtn);

    const telegraphBtn = screen.getByRole("button", { name: "Ключ телеграфа" });
    let simulatedTime = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => simulatedTime);

    // Вводим 7 точек
    for (let i = 0; i < 7; i++) {
      simulatedTime += 200;
      fireEvent.pointerDown(telegraphBtn);
      simulatedTime += 80;
      fireEvent.pointerUp(telegraphBtn);
    }

    const submitBtn = screen.getByRole("button", { name: /ПОДКЛЮЧИТЬСЯ|НАЙТИ ШТАБ/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(connectSpy).toHaveBeenCalledWith("room-alpha-99", ".......");
  });

  it("отклоняет неверный пароль Морзе для целевой комнаты targetRoomCode", async () => {
    const connectSpy = vi.fn();
    render(
      <ControllerConnectView
        onConnect={connectSpy}
        onBackToMenu={vi.fn()}
        targetRoomCode="room-sec-1"
        targetHostName="Хост 1"
        targetExpectedMorse="------."
      />
    );

    const telegraphBtn = screen.getByRole("button", { name: "Ключ телеграфа" });
    let simulatedTime = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => simulatedTime);

    // Вводим 7 точек вместо 6 тире и точки
    for (let i = 0; i < 7; i++) {
      simulatedTime += 200;
      fireEvent.pointerDown(telegraphBtn);
      simulatedTime += 80;
      fireEvent.pointerUp(telegraphBtn);
    }

    const submitBtn = screen.getByRole("button", { name: /ПОДТВЕРДИТЬ|ПОДТВЕРДИТЬ ШИФР/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(connectSpy).not.toHaveBeenCalled();
    expect(await screen.findByText(/Неверный код комнаты|Неверный шифр доступа/i)).toBeDefined();
  });

  it("успешно верифицирует пароль Морзе для targetRoomCode", async () => {
    const connectSpy = vi.fn();
    render(
      <ControllerConnectView
        onConnect={connectSpy}
        onBackToMenu={vi.fn()}
        targetRoomCode="room-priv-xyz"
        targetHostName="Агент 007"
        targetExpectedMorse="......-"
      />
    );

    expect(screen.getByText(/КОД КОМНАТЫ: Агент 007|ШИФР ДОСТУПА: Агент 007/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /ПОДТВЕРДИТЬ|ПОДТВЕРДИТЬ ШИФР/i })).toBeDefined();

    const telegraphBtn = screen.getByRole("button", { name: "Ключ телеграфа" });
    let simulatedTime = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => simulatedTime);

    // Вводим 6 точек и 1 тире
    for (let i = 0; i < 6; i++) {
      simulatedTime += 200;
      fireEvent.pointerDown(telegraphBtn);
      simulatedTime += 80;
      fireEvent.pointerUp(telegraphBtn);
    }
    simulatedTime += 200;
    fireEvent.pointerDown(telegraphBtn);
    simulatedTime += 300; // dash
    fireEvent.pointerUp(telegraphBtn);

    const submitBtn = screen.getByRole("button", { name: /ПОДТВЕРДИТЬ|ПОДТВЕРДИТЬ ШИФР/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(connectSpy).toHaveBeenCalledWith("room-priv-xyz", "......-");
  });

  it("P0 регрессионный тест: рендеринг вкладки MORSE без сбоев TvErrorBoundary (isAcpive / isActive)", () => {
    // Проверяем монтирование с явным initialTab="MORSE", отсутствие падений и корректную отрисовку ключа
    expect(() => {
      render(
        <ControllerConnectView
          onConnect={vi.fn()}
          onBackToMenu={vi.fn()}
          initialTab="MORSE"
        />
      );
    }).not.toThrow();

    expect(screen.getByRole("button", { name: "Ключ телеграфа" })).toBeDefined();
    expect(screen.getByText(/КОД МОРЗЕ/i)).toBeDefined();
    expect(screen.getByText("0/7")).toBeDefined();
  });

  it("рендерит системное уведомление в плавающем оверлее и закрывает по кнопке", () => {
    const clearNoticeSpy = vi.fn();
    render(
      <ControllerConnectView
        onConnect={vi.fn()}
        onBackToMenu={vi.fn()}
        noticeMessage="ТВ-ХОСТ ОТКЛЮЧИЛСЯ"
        onClearNotice={clearNoticeSpy}
      />
    );

    expect(screen.getByText("ТВ-ХОСТ ОТКЛЮЧИЛСЯ")).toBeDefined();
    const closeBtn = screen.getByRole("button", { name: "Закрыть" });
    fireEvent.click(closeBtn);
    expect(clearNoticeSpy).toHaveBeenCalled();
  });
});
