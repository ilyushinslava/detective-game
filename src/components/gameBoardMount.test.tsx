// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import App from "../App";
import { GameBoard } from "./GameBoard";
import { createInitialState } from "../utils/gameLogic";
import { I18nProvider } from "../i18n/context";

vi.mock("../utils/audio", () => ({
  soundManager: {
    play: vi.fn(),
    getSfxEnabled: vi.fn(() => true),
    getAmbientEnabled: vi.fn(() => true),
    toggleSfx: vi.fn(),
    toggleAmbient: vi.fn(),
    unlockAudioContext: vi.fn(),
  },
}));

vi.mock("../utils/haptics", () => ({
  triggerHaptic: vi.fn(),
  setHapticsEnabled: vi.fn(),
}));

describe("GameBoard Mount and App Smoke Tests", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("Тест 1 (Прямой контракт рендера GameBoard): успешно рендерит доску с myRoleColor='red' и 'blue'", () => {
    const initialState = createInitialState("SKHVATKA", "AI", "DETECTIVE", 3, 3, 16);

    const { container, unmount } = render(
      <GameBoard
        mode="SKHVATKA"
        board={initialState.board}
        selectedCharacterId={null}
        killerAdjacentIds={[]}
        detectiveAdjacentIds={[]}
        showKillerHints={false}
        showDetectiveHints={false}
        lastShift={null}
        myCharacterId={initialState.killerSecretId}
        myRoleColor="red"
        onShift={vi.fn()}
        onSelectCharacter={vi.fn()}
      />
    );

    expect(container.firstElementChild).not.toBeNull();
    unmount();

    const { container: containerBlue } = render(
      <GameBoard
        mode="SKHVATKA"
        board={initialState.board}
        selectedCharacterId={null}
        killerAdjacentIds={[]}
        detectiveAdjacentIds={[]}
        showKillerHints={false}
        showDetectiveHints={false}
        lastShift={null}
        myCharacterId={initialState.detectiveSecretId}
        myRoleColor="blue"
        onShift={vi.fn()}
        onSelectCharacter={vi.fn()}
      />
    );

    expect(containerBlue.firstElementChild).not.toBeNull();
  });

  it("Тест 2 (Smoke App): App успешно монтируется в DOM без исключений", () => {
    localStorage.setItem("crime_city_splash_seen", "true");

    const { container } = render(
      <I18nProvider>
        <App />
      </I18nProvider>
    );

    expect(container.firstElementChild).not.toBeNull();
  });
});
