import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import GameRoomServer from "../../server/index";
import { createInitialState } from "../gameLogic";

describe("TV Lobby Readiness & Rematch Flow (Stage 3)", () => {
  let server: any;
  let mockTvConn: any;
  let mockHostConn: any;
  let mockGuestConn: any;

  beforeEach(() => {
    mockTvConn = { id: "tv-conn-1", send: vi.fn(), close: vi.fn() };
    mockHostConn = { id: "host-conn-1", send: vi.fn(), close: vi.fn() };
    mockGuestConn = { id: "guest-conn-1", send: vi.fn(), close: vi.fn() };

    const mockRoom = {
      id: "tv-rematch-room-99",
      getConnections: () => [mockTvConn, mockHostConn, mockGuestConn],
    };

    server = new GameRoomServer(mockRoom);

    // Подключаем ТВ-экран
    server.state.tvDisplays["tv-display-1"] = {
      clientId: "tv-display-1",
      connectionId: "tv-conn-1",
    };

    // Подключаем 2 игроков: Хоста и Гостя
    server.state.players["client-host"] = {
      clientId: "client-host",
      connectionId: "host-conn-1",
      nickname: "Хост_Тест",
      isHost: true,
      role: "KILLER",
      clientType: "CONTROLLER",
      authToken: "auth_host_123",
    };

    server.state.players["client-guest"] = {
      clientId: "client-guest",
      connectionId: "guest-conn-1",
      nickname: "Гость_Тест",
      isHost: false,
      role: "DETECTIVE",
      clientType: "CONTROLLER",
      authToken: "auth_guest_456",
    };

    server.state.status = "WAITING";
    server.state.readyClients.clear();
  });

  afterEach(() => {
    server?.close?.();
  });

  it("в ТВ-комнате при готовности обоих игроков статус переходит в READY_TO_START (без автозапуска PLAYING)", () => {
    // 1. Хост нажимает «ГОТОВ»
    server.onMessage(JSON.stringify({ type: "PLAYER_READY" }), mockHostConn);
    expect(server.state.readyClients.has("client-host")).toBe(true);
    expect(server.state.status).toBe("WAITING");

    // 2. Гость нажимает «ГОТОВ»
    server.onMessage(JSON.stringify({ type: "PLAYER_READY" }), mockGuestConn);
    expect(server.state.readyClients.has("client-guest")).toBe(true);
    // Для ТВ-комнат статус переходит в READY_TO_START, ожидая подтверждения старта Хостом
    expect(server.state.status).toBe("READY_TO_START");
  });

  it("при экшене PLAYER_UNREADY статус сбрасывается из READY_TO_START обратно в WAITING", () => {
    server.state.readyClients.add("client-host");
    server.state.readyClients.add("client-guest");
    server.state.status = "READY_TO_START";

    // Гость передумал и снял готовность
    server.onMessage(JSON.stringify({ type: "PLAYER_UNREADY" }), mockGuestConn);

    expect(server.state.readyClients.has("client-guest")).toBe(false);
    expect(server.state.status).toBe("WAITING");
  });

  it("при дисконнекте игрока в статусе READY_TO_START статус автоматически сбрасывается в WAITING", () => {
    server.state.readyClients.add("client-host");
    server.state.readyClients.add("client-guest");
    server.state.status = "READY_TO_START";

    // Гость отключился
    server.onClose(mockGuestConn);

    expect(server.state.readyClients.has("client-guest")).toBe(false);
    expect(server.state.status).toBe("WAITING");
  });

  it("TV_CONFIRM_RESTART с roleAction: SWAP корректно меняет роли игроков местами и запускает партию", () => {
    server.state.status = "FINISHED";
    expect(server.state.players["client-host"].role).toBe("KILLER");
    expect(server.state.players["client-guest"].role).toBe("DETECTIVE");

    // Хост выбирает реванш со сменой ролей
    server.onMessage(
      JSON.stringify({
        type: "TV_CONFIRM_RESTART",
        payload: { roleAction: "SWAP" },
      }),
      mockHostConn
    );

    expect(server.state.status).toBe("PLAYING");
    expect(server.state.players["client-host"].role).toBe("DETECTIVE");
    expect(server.state.players["client-guest"].role).toBe("KILLER");
    expect(server.state.gameState).toBeDefined();
  });

  it("TV_EXIT_TO_LOBBY сбрасывает статус в WAITING, очищает readyClients и сохраняет соединение комнаты", () => {
    server.state.status = "FINISHED";
    server.state.readyClients.add("client-host");
    server.state.readyClients.add("client-guest");

    // Команда выхода в лобби от ТВ-пульта или Хоста
    server.onMessage(
      JSON.stringify({
        type: "TV_EXIT_TO_LOBBY",
      }),
      mockTvConn
    );

    expect(server.state.status).toBe("WAITING");
    expect(server.state.readyClients.size).toBe(0);
    expect(server.state.gameState).toBeNull();
    // Игроки и ТВ-дисплей остаются в комнате
    expect(Object.keys(server.state.players).length).toBe(2);
    expect(Object.keys(server.state.tvDisplays).length).toBe(1);
  });
});
