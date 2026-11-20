// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TvLobbyView } from "../TvLobbyView";

describe("TvLobbyView Component (TASK-NET-002)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders QR code containing ?room=${cleanRoomCode}&clientType=CONTROLLER", () => {
    const { container } = render(
      <TvLobbyView
        roomCode="tv-test-999"
        morseCode=".-.-.-."
        players={{ p1: { nickname: "Host Player", isHost: true } }}
        onStartGame={vi.fn()}
        onExit={vi.fn()}
      />
    );

    // Verify SVG QRCode element exists
    const qrSvg = container.querySelector("svg");
    expect(qrSvg).toBeDefined();

    // Verify QR joinUrl strictly matches ?room=tv-test-999&clientType=CONTROLLER
    expect(screen.getByText(/\?room=tv-test-999&clientType=CONTROLLER/i)).toBeDefined();

    // Verify room code and tactical Morse callsign are rendered
    expect(screen.getAllByText(/tv-test-999/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/КОД МОРЗЕ|ШИФР/i).length).toBeGreaterThanOrEqual(1);
  });

  it("displays connected players and mode options", () => {
    render(
      <TvLobbyView
        roomCode="room-tv-abc"
        morseCode="--..--."
        players={{
          p1: { nickname: "Агент 1", isHost: true },
          p2: { nickname: "Агент 2", isHost: false },
        }}
        onStartGame={vi.fn()}
        onExit={vi.fn()}
      />
    );

    expect(screen.getByText("Агент 1")).toBeDefined();
    expect(screen.getByText("Агент 2")).toBeDefined();
    expect(screen.getByText(/4 ЦЕЛИ/i)).toBeDefined();
  });

  it("enforces start button to be enabled strictly when roomStatus is READY_TO_START and both players are ready", () => {
    const { unmount } = render(
      <TvLobbyView
        roomCode="room-tv-abc"
        morseCode="--..--."
        players={{
          p1: { nickname: "Агент 1", isHost: true },
          p2: { nickname: "Агент 2", isHost: false },
        }}
        readyClients={new Set()}
        roomStatus="WAITING"
        onStartGame={vi.fn()}
      />
    );

    const startBtnDisabled = screen.getByRole("button", { name: /ОЖИДАНИЕ ГОТОВНОСТИ ИГРОКОВ/i });
    expect(startBtnDisabled).toBeDefined();
    expect(startBtnDisabled.hasAttribute("disabled")).toBe(true);

    unmount();

    render(
      <TvLobbyView
        roomCode="room-tv-abc"
        morseCode="--..--."
        players={{
          p1: { nickname: "Агент 1", isHost: true },
          p2: { nickname: "Агент 2", isHost: false },
        }}
        readyClients={new Set(["p1", "p2"])}
        roomStatus="READY_TO_START"
        onStartGame={vi.fn()}
      />
    );

    const startBtnEnabled = screen.getByRole("button", { name: /НАЧАТЬ МАТЧ/i });
    expect(startBtnEnabled).toBeDefined();
    expect(startBtnEnabled.hasAttribute("disabled")).toBe(false);
  });
});
