// @vitest-environment node
// SEC-NET-06: регрессионные тесты защиты от гонки сессий при реконнекте по authToken.
// Инвариант: один authToken = ровно один активный сокет; stale-close замещённого
// сокета не меняет состояние новой сессии; границы grace/dual-disconnect защищены.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameRoomServer, {
  DISCONNECT_GRACE_PERIOD_MS,
  publicRoomsRegistry,
  roomToMorseRegistry,
  morseToRoomRegistry,
  morseToRoomsRegistry,
} from "../index";

function createMockConn(id: string) {
  const sent: any[] = [];
  return {
    id,
    sent,
    send: vi.fn((msg: string) => {
      try {
        sent.push(JSON.parse(msg));
      } catch (_) {
        sent.push(msg);
      }
    }),
    close: vi.fn(),
  };
}

function createMockRoom(id: string, connections: any[]) {
  return {
    id,
    getConnections: () => connections,
    connections,
  };
}

function findMsg(conn: any, type: string) {
  return conn.sent.find((m: any) => m && m.type === type);
}

function findAllMsgs(conn: any, type: string) {
  return conn.sent.filter((m: any) => m && m.type === type);
}

describe("SEC-NET-06: Session reconnect race protection", () => {
  let server: GameRoomServer;
  let connections: any[];
  let roomId: string;

  const connect = (
    conn: any,
    params: Record<string, string>
  ) => {
    const query = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    server.onConnect(conn, {
      request: new Request(`http://localhost:1999/party/${roomId}?${query}`),
    });
  };

  beforeEach(() => {
    publicRoomsRegistry.clear();
    roomToMorseRegistry.clear();
    morseToRoomRegistry.clear();
    morseToRoomsRegistry.clear();
    vi.useFakeTimers();
    connections = [];
    roomId = `reconnect-race-${Math.random().toString(36).slice(2, 9)}`;
    server = new GameRoomServer(createMockRoom(`parties/main/${roomId}`, connections));
  });

  afterEach(() => {
    server.close();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const createTwoPlayers = () => {
    const hostConn = createMockConn("conn_host");
    connections.push(hostConn);
    connect(hostConn, { clientId: "c_host", isHost: "true" });

    const guestConn = createMockConn("conn_guest");
    connections.push(guestConn);
    connect(guestConn, { clientId: "c_guest", isHost: "false" });

    return {
      hostConn,
      guestConn,
      hostToken: server.state.players["c_host"].authToken as string,
      guestToken: server.state.players["c_guest"].authToken as string,
    };
  };

  it("(а) повторный onConnect с тем же clientId замещает живой сокет: одна запись, close старого, SESSION_RESTORED новому", () => {
    const { hostConn, hostToken } = createTwoPlayers();

    const hostConn2 = createMockConn("conn_host_2");
    connections.push(hostConn2);
    connect(hostConn2, { clientId: "c_host", isHost: "true", authToken: hostToken });

    // Ровно одна запись игрока по этому clientId.
    expect(Object.keys(server.state.players).filter((id) => id === "c_host")).toHaveLength(1);
    expect(server.state.players["c_host"]).toBeDefined();
    expect(server.state.players["c_host"].connectionId).toBe("conn_host_2");

    // Старый сокет замещён и закрыт, ему отправлено SESSION_SUPERSEDED.
    expect(hostConn.close).toHaveBeenCalled();
    expect(findMsg(hostConn, "SESSION_SUPERSEDED")?.reason).toBe("NEW_SESSION");

    // Новый сокет получил восстановление сессии.
    expect(findMsg(hostConn2, "SESSION_RESTORED")).toBeDefined();
    expect(findMsg(hostConn2, "SESSION_RESTORED")?.clientId).toBe("c_host");
  });

  it("(б) onClose старого сокета после реконнекта с новым clientId не меняет состояние и не шлёт PRESENCE_CHANGED{connected:false}", () => {
    const { hostConn, guestConn, guestToken } = createTwoPlayers();

    const guestReconnect = createMockConn("conn_guest_new");
    connections.push(guestReconnect);
    connect(guestReconnect, { clientId: "c_guest_new", authToken: guestToken });

    expect(server.state.players["c_guest_new"]).toBeDefined();
    expect(server.state.players["c_guest_new"].isDisconnected).toBe(false);
    expect(server.state.players["c_guest"]).toBeUndefined();

    // Очищаем накопленные сообщения, чтобы отличать эффект stale-close.
    hostConn.sent.length = 0;

    // Закрытие устаревшего сокета.
    server.onClose(guestConn);

    // Игрок под новым clientId жив и не помечен отключённым.
    expect(server.state.players["c_guest_new"]).toBeDefined();
    expect(server.state.players["c_guest_new"].isDisconnected).toBe(false);

    // Никаких уведомлений об отключении.
    const disconnectPresence = findAllMsgs(hostConn, "PRESENCE_CHANGED").filter(
      (m: any) => m.connected === false
    );
    expect(disconnectPresence).toHaveLength(0);

    // Таймер грейса не создан.
    expect((server as any).disconnectTimers.size).toBe(0);
  });

  it("(в) валидный токен игрока A с clientId игрока B отклоняется как SESSION_CONFLICT без изменения состояния", () => {
    const { hostToken, guestToken } = createTwoPlayers();
    const hostRole = server.state.players["c_host"].role;
    const guestRole = server.state.players["c_guest"].role;

    const attackerConn = createMockConn("conn_conflict");
    connections.push(attackerConn);
    connect(attackerConn, { clientId: "c_guest", authToken: hostToken });

    expect(attackerConn.close).toHaveBeenCalled();
    expect(findMsg(attackerConn, "ERROR")?.message).toBe("SESSION_CONFLICT");
    expect(findMsg(attackerConn, "SESSION_RESTORED")).toBeUndefined();

    // Состояние игроков не изменилось.
    expect(Object.keys(server.state.players).sort()).toEqual(["c_guest", "c_host"]);
    expect(server.state.players["c_host"].role).toBe(hostRole);
    expect(server.state.players["c_guest"].role).toBe(guestRole);
    expect(server.state.players["c_host"].authToken).toBe(hostToken);
    expect(server.state.players["c_guest"].authToken).toBe(guestToken);
  });

  it("(г) попытка занять хост-слот при живом хосте не создаёт второго хоста и не ломает слот", () => {
    // В комнате только живой хост.
    const hostConn = createMockConn("conn_host");
    connections.push(hostConn);
    connect(hostConn, { clientId: "c_host", isHost: "true" });

    const hostTokenBefore = server.state.hostToken;
    const hostAuthToken = server.state.players["c_host"].authToken;

    // Атакующий передаёт isHost=true, но без валидного hostToken.
    const attackerConn = createMockConn("conn_evil_host");
    connections.push(attackerConn);
    connect(attackerConn, { clientId: "c_evil", isHost: "true" });

    const hosts = Object.values(server.state.players).filter((p) => p.isHost);
    expect(hosts).toHaveLength(1);
    expect(hosts[0].clientId).toBe("c_host");

    // isHost из query не даёт прав: атакующий стал обычным гостем.
    expect(server.state.players["c_evil"]).toBeDefined();
    expect(server.state.players["c_evil"].isHost).toBe(false);

    // Хост-токен не перевыпущен и не перехвачен.
    expect(server.state.hostToken).toBe(hostTokenBefore);
    expect(server.state.players["c_host"].authToken).toBe(hostAuthToken);
  });

  it("(д) граница dual-disconnect: реконнект одного игрока на 59.9с не аннулирует матч", () => {
    const { hostConn, guestConn, guestToken } = createTwoPlayers();
    server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);
    expect(server.state.status).toBe("PLAYING");

    // Оба игрока отключились -> запускается dual-disconnect таймер.
    server.onClose(hostConn);
    server.onClose(guestConn);
    expect((server as any).dualDisconnectTimer).not.toBeNull();

    vi.advanceTimersByTime(DISCONNECT_GRACE_PERIOD_MS - 100); // 59.9с

    // Один игрок возвращается с валидным токеном.
    const guestReconnect = createMockConn("conn_guest_back");
    connections.push(guestReconnect);
    connect(guestReconnect, { clientId: "c_guest", authToken: guestToken });

    vi.advanceTimersByTime(200); // перешагиваем прежнюю границу 60с

    expect(server.state.status).toBe("PLAYING");
    expect(server.state.players["c_guest"].isDisconnected).toBe(false);

    const annulled = findAllMsgs(hostConn, "MATCH_ANNULLED");
    expect(annulled).toHaveLength(0);
  });

  it("(е) граница индивидуального грейса: реконнект на 59.9с сохраняет игрока", () => {
    const { hostConn, guestConn, guestToken } = createTwoPlayers();
    server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);
    expect(server.state.status).toBe("PLAYING");

    // Отключается только гость -> индивидуальный таймер грейса.
    server.onClose(guestConn);
    expect(server.state.players["c_guest"].isDisconnected).toBe(true);
    expect((server as any).disconnectTimers.size).toBe(1);

    vi.advanceTimersByTime(DISCONNECT_GRACE_PERIOD_MS - 100); // 59.9с

    const guestReconnect = createMockConn("conn_guest_new");
    connections.push(guestReconnect);
    connect(guestReconnect, { clientId: "c_guest_new", authToken: guestToken });

    vi.advanceTimersByTime(200); // перешагиваем прежнюю границу 60с

    expect(server.state.players["c_guest_new"]).toBeDefined();
    expect(server.state.players["c_guest_new"].isDisconnected).toBe(false);
    expect(server.state.status).toBe("PLAYING");
    expect(findMsg(hostConn, "MATCH_OVER")).toBeUndefined();
  });

  it("(ж) осиротевший старый сокет не может подделать CLIENT_BACKGROUNDED для соперника", () => {
    const { guestConn, guestToken } = createTwoPlayers();

    // Легитимный реконнект гостя на новый сокет (тот же clientId).
    const guestReconnect = createMockConn("conn_guest_new");
    connections.push(guestReconnect);
    connect(guestReconnect, { clientId: "c_guest", authToken: guestToken });
    expect(server.state.players["c_guest"].connectionId).toBe("conn_guest_new");

    // Осиротевший сокет пытается выставить фон сопернику через чужой senderClientId.
    server.onMessage(
      JSON.stringify({
        type: "CLIENT_BACKGROUNDED",
        senderClientId: "c_host",
        payload: { isBackground: true },
      }),
      guestConn
    );

    // Флаг соперника не изменился.
    expect(server.state.players["c_host"].isBackground).not.toBe(true);

    // Контроль: легитимный сокет гостя может менять свой собственный флаг.
    server.onMessage(
      JSON.stringify({
        type: "CLIENT_BACKGROUNDED",
        senderClientId: "c_host", // значение игнорируется сервером
        payload: { isBackground: true },
      }),
      guestReconnect
    );
    expect(server.state.players["c_guest"].isBackground).toBe(true);
  });
});
