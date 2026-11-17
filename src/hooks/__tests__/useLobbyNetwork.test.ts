// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLobbyNetwork } from "../useLobbyNetwork";
import { partyService } from "../../utils/partyPeer";
import type { UserProfile } from "../../types/profile";

vi.mock("../../utils/audio", () => ({
  soundManager: {
    play: vi.fn(),
    startMorseTone: vi.fn(),
    stopMorseTone: vi.fn(),
  },
}));

vi.mock("../../utils/haptics", () => ({
  triggerHaptic: vi.fn(),
}));

const mockProfile: UserProfile = {
  id: "player_1",
  nickname: "Агент 007",
  cash: 1000,
  rank: "СПЕЦАГЕНТ",
  rankPoints: 500,
  stats: {
    maniacWins: 0,
    detectiveWins: 0,
    gamesPlayed: 0,
    losses: 0,
  },
};

describe("useLobbyNetwork Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    partyService.morseCode = null;
    partyService.roomCode = null;
    partyService.onRoomStatus = null;
    partyService.onSyncState = null;
  });

  afterEach(() => {
    partyService.disconnect();
  });

  it("первично вызывает fetchPublicRooms и заполняет список комнат", async () => {
    const mockRooms = [
      {
        roomCode: "room_101",
        mode: "MANIAC_VS_OPERATIVE",
        hostName: "Host 1",
        status: "WAITING",
        playersCount: 1,
        maxPlayers: 2,
        isPrivate: false,
      },
    ];
    vi.spyOn(partyService, "fetchPublicRooms").mockResolvedValue(mockRooms);

    const onStartGame = vi.fn();
    const { result } = renderHook(() =>
      useLobbyNetwork({ profile: mockProfile, screen: "HOME", onStartGame })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.publicRooms.length).toBe(1);
    expect(result.current.filteredRooms.length).toBe(1);
    expect(result.current.filteredRooms[0].roomCode).toBe("room_101");
  });

  it("сохраняет morseCode при получении ROOM_STATUS от сервера в режиме ожидания", async () => {
    const onStartGame = vi.fn();
    const connectSpy = vi.spyOn(partyService, "connect").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useLobbyNetwork({ profile: mockProfile, screen: "HOME", onStartGame })
    );

    // Хост создает приватную комнату
    act(() => {
      result.current.setCreateRoomIsPrivate(true);
      result.current.handleConfirmCreateRoom();
    });

    expect(result.current.isWaitingForOpponent).toBe(true);
    expect(connectSpy).toHaveBeenCalled();

    // Сервер присылает ROOM_STATUS со сгенерированным 7-значным шифром
    act(() => {
      partyService.onRoomStatus?.({
        type: "ROOM_STATUS",
        status: "WAITING",
        morseCode: "•—•—•——",
      });
    });

    expect(result.current.morseCode).toBe("•—•—•——");
  });

  it("автоматически закрывает лобби ожидания и запускает матч onStartGame при получении READY_TO_START через onRoomStatus", () => {
    const onStartGame = vi.fn();
    vi.spyOn(partyService, "connect").mockImplementation(() => {});
    partyService.isHost = true;

    const { result } = renderHook(() =>
      useLobbyNetwork({ profile: mockProfile, screen: "HOME", onStartGame })
    );

    act(() => {
      result.current.handleConfirmCreateRoom();
    });

    expect(result.current.isWaitingForOpponent).toBe(true);

    // Второй игрок подключился, сервер отправляет READY_TO_START
    act(() => {
      partyService.onRoomStatus?.({
        type: "ROOM_STATUS",
        status: "READY_TO_START",
        morseCode: "•—•—•——",
      });
    });

    expect(result.current.isWaitingForOpponent).toBe(false);
    expect(onStartGame).toHaveBeenCalledWith(
      "MANIAC_VS_OPERATIVE",
      "ONLINE",
      "KILLER",
      2,
      3,
      0,
      250
    );
  });

  it("автоматически закрывает лобби ожидания и запускает матч onStartGame при получении READY_TO_START через onSyncState", () => {
    const onStartGame = vi.fn();
    vi.spyOn(partyService, "connect").mockImplementation(() => {});
    partyService.isHost = false;

    const { result } = renderHook(() =>
      useLobbyNetwork({ profile: mockProfile, screen: "HOME", onStartGame })
    );

    act(() => {
      result.current.handleJoinRoom("room_123");
    });

    expect(result.current.isWaitingForOpponent).toBe(true);

    // Сервер шлет синхронизацию стейта со статусом READY_TO_START
    act(() => {
      partyService.onSyncState?.({ mode: "MANIAC_VS_OPERATIVE" }, "DETECTIVE", "READY_TO_START");
    });

    expect(result.current.isWaitingForOpponent).toBe(false);
    expect(onStartGame).toHaveBeenCalledWith(
      "MANIAC_VS_OPERATIVE",
      "ONLINE",
      "DETECTIVE",
      2,
      3,
      0,
      0
    );
  });

  it("handleCancelWaiting разрывает связь, очищает morseCode и сбрасывает статус ожидания", () => {
    const onStartGame = vi.fn();
    const disconnectSpy = vi.spyOn(partyService, "disconnect").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useLobbyNetwork({ profile: mockProfile, screen: "HOME", onStartGame })
    );

    act(() => {
      result.current.handleConfirmCreateRoom();
    });

    act(() => {
      partyService.onRoomStatus?.({
        type: "ROOM_STATUS",
        status: "WAITING",
        morseCode: "•—•—•——",
      });
    });

    expect(result.current.morseCode).toBe("•—•—•——");
    expect(result.current.isWaitingForOpponent).toBe(true);

    // Хост нажимает «Прервать операцию»
    act(() => {
      result.current.handleCancelWaiting();
    });

    expect(disconnectSpy).toHaveBeenCalled();
    expect(result.current.isWaitingForOpponent).toBe(false);
    expect(result.current.morseCode).toBeNull();
  });
});
