// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { ControllerConnectView } from "../ControllerConnectView";
import { morseToRoomRegistry, roomToMorseRegistry, publicRoomsRegistry } from "../../../server/index";
import { soundManager } from "../../../utils/audio";

describe("ControllerConnectView Component (TASK-NET-002)", () => {
  beforeEach(() => {
    morseToRoomRegistry.clear();
    roomToMorseRegistry.clear();
    publicRoomsRegistry.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders PIN mode by default with 5-digit slots and Numpad", () => {
    render(<ControllerConnectView onConnect={vi.fn()} onBackToMenu={vi.fn()} />);

    expect(screen.getByText(/ПОДКЛЮЧЕНИЕ ПУЛЬТА/i)).toBeDefined();
    expect(screen.getByText(/ЦИФРОВОЙ КОД/i)).toBeDefined();
    expect(screen.getByText(/РАДИОПЕРЕХВАТ/i)).toBeDefined();
    expect(screen.getByRole("button", { name: "1" })).toBeDefined();
    expect(screen.getByRole("button", { name: "9" })).toBeDefined();
    expect(screen.getByRole("button", { name: "C" })).toBeDefined();
  });

  it("enters numeric digits via numpad and triggers onConnect with entered PIN", async () => {
    const connectSpy = vi.fn();
    render(<ControllerConnectView onConnect={connectSpy} onBackToMenu={vi.fn()} />);

    // Tap 5 4 3 2 1
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "1" }));

    // Click connect button
    const connectBtn = screen.getByRole("button", { name: /ПОДКЛЮЧИТЬСЯ ПО PIN/i });
    expect(connectBtn).toBeDefined();
    expect(connectBtn).toHaveProperty("disabled", false);

    await act(async () => {
      fireEvent.click(connectBtn);
    });

    expect(connectSpy).toHaveBeenCalledWith("54321");
  });

  it("switches to Morse tab and records short tap as dot and hold as dash with analog Morse audio (TASK-SND-001)", () => {
    const startToneSpy = vi.spyOn(soundManager, "startMorseTone");
    const stopToneSpy = vi.spyOn(soundManager, "stopMorseTone");

    const { unmount } = render(<ControllerConnectView onConnect={vi.fn()} onBackToMenu={vi.fn()} />);

    // Switch to Morse tab
    fireEvent.click(screen.getByText(/РАДИОПЕРЕХВАТ \(МОРЗЕ\)/i));
    expect(screen.getByText(/ТАКТИЧЕСКИЙ ПОЗЫВНОЙ/i)).toBeDefined();

    const telegraphBtn = screen.getByRole("button", { name: "Ключ телеграфа" });
    expect(telegraphBtn).toBeDefined();

    let simulatedTime = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => simulatedTime);

    // 1. Simulate short tap (<250ms) -> Dot (.)
    simulatedTime = 1000;
    fireEvent.pointerDown(telegraphBtn);
    expect(startToneSpy).toHaveBeenCalledWith(700);

    simulatedTime = 1100; // 100ms
    fireEvent.pointerUp(telegraphBtn);
    expect(stopToneSpy).toHaveBeenCalled();

    // 2. Simulate long hold (>=250ms) -> Dash (-)
    simulatedTime = 2000;
    fireEvent.pointerDown(telegraphBtn);
    expect(startToneSpy).toHaveBeenCalledTimes(2);

    simulatedTime = 2400; // 400ms
    fireEvent.pointerUp(telegraphBtn);
    expect(stopToneSpy).toHaveBeenCalledTimes(2);

    // 3. Pointer leave terminates tone
    fireEvent.pointerDown(telegraphBtn);
    fireEvent.pointerLeave(telegraphBtn);
    expect(stopToneSpy).toHaveBeenCalledTimes(3);

    // 4. Unmount guarantees tone termination
    unmount();
    expect(stopToneSpy).toHaveBeenCalledTimes(4);
  });

  it("resolves Morse code and calls onConnect when valid callsign is sent", async () => {
    // Register active room with morse .-.-
    morseToRoomRegistry.set(".-.-", "room-morse-8888");
    publicRoomsRegistry.set("room-morse-8888", {
      roomCode: "room-morse-8888",
      mode: "MANIAC_VS_OPERATIVE",
      hostName: "TV",
      status: "WAITING",
      playersCount: 0,
      maxPlayers: 2,
    });

    const connectSpy = vi.fn();
    render(<ControllerConnectView onConnect={connectSpy} onBackToMenu={vi.fn()} />);

    // Switch to Morse tab
    fireEvent.click(screen.getByText(/РАДИОПЕРЕХВАТ \(МОРЗЕ\)/i));
    const telegraphBtn = screen.getByRole("button", { name: "Ключ телеграфа" });

    let simulatedTime = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => simulatedTime);

    // Tap . (short)
    simulatedTime = 1000;
    fireEvent.pointerDown(telegraphBtn);
    simulatedTime = 1100;
    fireEvent.pointerUp(telegraphBtn);

    // Tap - (long)
    simulatedTime = 2000;
    fireEvent.pointerDown(telegraphBtn);
    simulatedTime = 2400;
    fireEvent.pointerUp(telegraphBtn);

    // Tap . (short)
    simulatedTime = 3000;
    fireEvent.pointerDown(telegraphBtn);
    simulatedTime = 3100;
    fireEvent.pointerUp(telegraphBtn);

    // Tap - (long)
    simulatedTime = 4000;
    fireEvent.pointerDown(telegraphBtn);
    simulatedTime = 4400;
    fireEvent.pointerUp(telegraphBtn);

    // Click search button
    const searchBtn = screen.getByRole("button", { name: /РАДИОПЕРЕХВАТ: НАЙТИ ЛОББИ/i });
    await act(async () => {
      fireEvent.click(searchBtn);
    });

    expect(connectSpy).toHaveBeenCalledWith("room-morse-8888");
  });
});
