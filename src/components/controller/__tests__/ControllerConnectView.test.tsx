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

describe("ControllerConnectView Component (TASK-NET-002)", () => {
  beforeEach(() => {
    morseToRoomRegistry.clear();
    morseToRoomsRegistry.clear();
    roomToMorseRegistry.clear();
    publicRoomsRegistry.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders pure Morse interface by default without obsolete PIN numpad", () => {
    render(<ControllerConnectView onConnect={vi.fn()} onBackToMenu={vi.fn()} />);

    expect(screen.getByText(/ПУЛЬТ УПРАВЛЕНИЯ/i)).toBeDefined();
    expect(screen.getByText("ШИФР")).toBeDefined();
    expect(screen.getByRole("button", { name: "Ключ телеграфа" })).toBeDefined();

    // Verify obsolete numeric numpad is completely gone
    expect(screen.queryByRole("button", { name: "1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "9" })).toBeNull();
  });

  it("records short tap as dot and hold as dash with analog Morse audio & haptics (TASK-SND-001)", () => {
    const startToneSpy = vi.spyOn(soundManager, "startMorseTone");
    const stopToneSpy = vi.spyOn(soundManager, "stopMorseTone");

    const { unmount } = render(<ControllerConnectView onConnect={vi.fn()} onBackToMenu={vi.fn()} />);
    startToneSpy.mockClear();
    stopToneSpy.mockClear();

    const telegraphBtn = screen.getByRole("button", { name: "Ключ телеграфа" });
    expect(telegraphBtn).toBeDefined();

    let simulatedTime = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => simulatedTime);

    // 1. Short tap (<250ms) -> Dot (.)
    simulatedTime = 1000;
    fireEvent.pointerDown(telegraphBtn);
    expect(startToneSpy).toHaveBeenCalledWith(700);

    simulatedTime = 1100; // 100ms
    fireEvent.pointerUp(telegraphBtn);
    expect(stopToneSpy).toHaveBeenCalledTimes(1);

    // 2. Long hold (>=250ms) -> Dash (-)
    simulatedTime = 2000;
    fireEvent.pointerDown(telegraphBtn);
    expect(startToneSpy).toHaveBeenCalledTimes(2);

    simulatedTime = 2400; // 400ms
    fireEvent.pointerUp(telegraphBtn);
    expect(stopToneSpy).toHaveBeenCalledTimes(2);

    // 3. Pointer leave terminates tone safely
    fireEvent.pointerDown(telegraphBtn);
    fireEvent.pointerLeave(telegraphBtn);
    expect(stopToneSpy).toHaveBeenCalledTimes(3);

    // 4. Unmount guarantees tone termination
    unmount();
    expect(stopToneSpy).toHaveBeenCalledTimes(4);
  });

  it("resolves Morse code and calls onConnect when valid single callsign is sent", async () => {
    // Register active room with 7-signal morse .-.-.-.
    morseToRoomRegistry.set(".-.-.-.", "room-morse-8888");
    publicRoomsRegistry.set("room-morse-8888", {
      roomCode: "room-morse-8888",
      mode: "MANIAC_VS_OPERATIVE",
      hostName: "Host TV",
      status: "WAITING",
      playersCount: 0,
      maxPlayers: 2,
    });

    const connectSpy = vi.fn();
    render(<ControllerConnectView onConnect={connectSpy} onBackToMenu={vi.fn()} />);

    const telegraphBtn = screen.getByRole("button", { name: "Ключ телеграфа" });

    let simulatedTime = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => simulatedTime);

    // Tap 7 symbols: . - . - . - .
    // 1. .
    simulatedTime = 1000;
    fireEvent.pointerDown(telegraphBtn);
    simulatedTime = 1100;
    fireEvent.pointerUp(telegraphBtn);

    // 2. -
    simulatedTime = 2000;
    fireEvent.pointerDown(telegraphBtn);
    simulatedTime = 2400;
    fireEvent.pointerUp(telegraphBtn);

    // 3. .
    simulatedTime = 3000;
    fireEvent.pointerDown(telegraphBtn);
    simulatedTime = 3100;
    fireEvent.pointerUp(telegraphBtn);

    // 4. -
    simulatedTime = 4000;
    fireEvent.pointerDown(telegraphBtn);
    simulatedTime = 4400;
    fireEvent.pointerUp(telegraphBtn);

    // 5. .
    simulatedTime = 5000;
    fireEvent.pointerDown(telegraphBtn);
    simulatedTime = 5100;
    fireEvent.pointerUp(telegraphBtn);

    // 6. -
    simulatedTime = 6000;
    fireEvent.pointerDown(telegraphBtn);
    simulatedTime = 6400;
    fireEvent.pointerUp(telegraphBtn);

    // 7. .
    simulatedTime = 7000;
    fireEvent.pointerDown(telegraphBtn);
    simulatedTime = 7100;
    fireEvent.pointerUp(telegraphBtn);

    // Click search button
    const searchBtn = screen.getByRole("button", { name: /НАЙТИ ШТАБ/i });
    await act(async () => {
      fireEvent.click(searchBtn);
    });

    expect(connectSpy).toHaveBeenCalledWith("room-morse-8888");
  });

  it("rejects invalid password when targetRoomCode receives wrong Morse code", async () => {
    const connectSpy = vi.fn();
    render(
      <ControllerConnectView
        onConnect={connectSpy}
        onBackToMenu={vi.fn()}
        targetRoomCode="tv-room-777"
        targetHostName="ТВ-Экран"
        targetExpectedMorse="-------"
      />
    );

    const telegraphBtn = screen.getByRole("button", { name: "Ключ телеграфа" });
    let simulatedTime = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => simulatedTime);

    // Enter 7 dots: .......
    for (let i = 0; i < 7; i++) {
      simulatedTime += 200;
      fireEvent.pointerDown(telegraphBtn);
      simulatedTime += 80;
      fireEvent.pointerUp(telegraphBtn);
    }

    const submitBtn = screen.getByRole("button", { name: /ПОДТВЕРДИТЬ ШИФР/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(connectSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Неверный шифр доступа/i)).toBeDefined();
  });

  it("works strictly as room password verification when targetRoomCode is passed", async () => {
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

    expect(screen.getByText(/ШИФР ДОСТУПА: Агент 007/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /ПОДТВЕРДИТЬ ШИФР/i })).toBeDefined();

    const telegraphBtn = screen.getByRole("button", { name: "Ключ телеграфа" });
    let simulatedTime = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => simulatedTime);

    // Enter 7 symbols: 6 dots and 1 dash
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

    const submitBtn = screen.getByRole("button", { name: /ПОДТВЕРДИТЬ ШИФР/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(connectSpy).toHaveBeenCalledWith("room-priv-xyz");
  });
});
