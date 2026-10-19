// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "../App";
import { RoleRevealModal } from "../components/RoleRevealModal";
import { mpService } from "./multiplayerPeer";
import { createInitialState } from "./gameLogic";
import { gameReducer } from "./gameReducer";
import { I18nProvider } from "../i18n/context";
import * as database from "firebase/database";

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  signInAnonymously: vi.fn(() => Promise.resolve({ user: { uid: "123" } })),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback({ uid: "123" });
    return () => {};
  }),
}));

vi.mock("firebase/database", () => ({
  getDatabase: vi.fn(),
  ref: vi.fn((_, path) => ({ path })),
  set: vi.fn(() => Promise.resolve()),
  get: vi.fn(() => Promise.resolve({ exists: () => false, val: () => null })),
  onValue: vi.fn(),
  off: vi.fn(),
  onDisconnect: vi.fn(() => ({
    set: vi.fn(() => Promise.resolve()),
    cancel: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
  })),
  remove: vi.fn(() => Promise.resolve()),
  update: vi.fn(() => Promise.resolve()),
}));

vi.mock("./audio", () => ({
  soundManager: {
    play: vi.fn(),
    getSfxEnabled: vi.fn(() => true),
    getAmbientEnabled: vi.fn(() => true),
    toggleSfx: vi.fn(),
    toggleAmbient: vi.fn(),
  },
}));

describe("Сетевой протокол и синхронизация (Multiplayer Flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Гонка PLAYER_READY: экшен готовности от удаленного игрока НЕ должен сбрасывать isIntroPhase", async () => {
    let actionCallback: ((action: any) => void) | undefined;

    vi.spyOn(mpService, "subscribeToActions").mockImplementation((cb: any) => {
      actionCallback = cb;
      return () => {};
    });

    render(
      <I18nProvider>
        <App />
      </I18nProvider>
    );

    act(() => {
      actionCallback?.({
        type: "MATCH_STARTED",
        payload: { state: createInitialState("SKHVATKA", "ONLINE", "KILLER") },
        senderId: "remote",
      });
    });

    // Проверяем, что фаза вступления отображается после старта матча.
    expect(
      screen.getAllByText(/Агент|Ориентировка|Задание/i).length
    ).toBeGreaterThan(0);

    act(() => {
      actionCallback?.({ type: "PLAYER_READY", senderId: "remote" });
    });

    // PLAYER_READY не должен сбрасывать фазу вступления.
    expect(
      screen.getAllByText(/Агент|Ориентировка|Задание/i).length
    ).toBeGreaterThan(0);
  });

  it("Синхронизация готовности: если один игрок уже готов, второй при готовности сразу завершает интро", () => {
    let opponentReadyCb: ((ready: boolean) => void) | undefined;

    mpService.roomCode = "1234";
    vi.spyOn(mpService, "subscribeToOpponentReady").mockImplementation((cb: any) => {
      opponentReadyCb = cb;
      return () => {};
    });
    vi.spyOn(mpService, "setPlayerReady").mockImplementation(() => {});
    vi.spyOn(mpService, "sendAction").mockImplementation(() => {});

    const onCompleteMock = vi.fn();

    render(
      <RoleRevealModal
        mode="SKHVATKA"
        opponent="ONLINE"
        playerRole="KILLER"
        killer={{ id: "c1", name: "Винсент", role: "KILLER" } as any}
        detective={undefined}
        inspectorChoices={[]}
        onSelectDetectiveRole={vi.fn()}
        onComplete={onCompleteMock}
      />
    );

    act(() => {
      opponentReadyCb?.(true);
    });

    const readyButtons = screen.getAllByTestId("ready-button");
    const readyButton = readyButtons[readyButtons.length - 1];
    act(() => {
      fireEvent.click(readyButton);
    });

    expect(onCompleteMock).toHaveBeenCalledTimes(1);
  });

  it("Намеренный выход leaveRoom переводит комнату в статус CLOSED", async () => {
    mpService.isHost = true;
    mpService.roomCode = "1234";
    mpService.roomRef = {} as any;

    await mpService.leaveRoom();

    expect(database.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "CLOSED",
      })
    );
  });

  it("Отсутствие затирания экшенов: MATCH_STARTED содержит в себе matchPot и matchBet, исключая отправку SET_MATCH_POT", () => {
    const state = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    state.matchPot = 500;
    state.matchBet = 250;

    const broadcastSpy = vi.spyOn(mpService, "broadcastMatchStart");
    mpService.broadcastMatchStart(state);

    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        matchPot: 500,
        matchBet: 250,
      })
    );
  });

  it("Синхронизация выбора личности: экшен SET_INSPECTOR_ROLE обновляет detectiveSecretId", () => {
    const state = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    const chosenId = state.inspectorChoices![1];

    const action: any = {
      type: "SET_INSPECTOR_ROLE",
      payload: { chosenId },
      senderId: "remote",
    };

    const nextState = gameReducer(state, action);

    expect(nextState.detectiveSecretId).toBe(chosenId);
    expect(nextState.inspectorChoices).toEqual([]);
    expect(nextState.detectiveHand).not.toContain(chosenId);
  });

  it("Идентичность поля: Гость принимает раскладку Хоста из MATCH_STARTED", () => {
    const hostState = createInitialState("SKHVATKA", "ONLINE", "KILLER");
    const guestState = createInitialState("SKHVATKA", "ONLINE", "DETECTIVE");

    const action: any = {
      type: "MATCH_STARTED",
      payload: { state: hostState },
      senderId: "remote",
    };

    const nextState = gameReducer(guestState, action);

    expect(nextState.board).toEqual(hostState.board);
    expect(nextState.killerSecretId).toBe(hostState.killerSecretId);
  });

  it("АФК-таймер готовности: по истечении 15 секунд срабатывает onCancelMatch", () => {
    vi.useFakeTimers();
    const onCancelMatchMock = vi.fn();

    render(
      <RoleRevealModal
        mode="SKHVATKA"
        opponent="ONLINE"
        playerRole="KILLER"
        killer={undefined}
        detective={undefined}
        inspectorChoices={[]}
        onSelectDetectiveRole={vi.fn()}
        onComplete={vi.fn()}
        onCancelMatch={onCancelMatchMock}
      />
    );

    const readyButtons = screen.getAllByTestId("ready-button");
    const readyButton = readyButtons[readyButtons.length - 1];

    act(() => {
      fireEvent.click(readyButton);
    });

    act(() => {
      vi.advanceTimersByTime(16000);
    });

    expect(onCancelMatchMock).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});