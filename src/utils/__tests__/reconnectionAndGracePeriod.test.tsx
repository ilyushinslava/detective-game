// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup, waitFor } from "@testing-library/react";
import GameRoomServer, { DISCONNECT_GRACE_PERIOD_MS } from "../../server/index";
import { partyService } from "../partyPeer";
import { MobileControllerView } from "../../components/controller/MobileControllerView";
import { TvBoardView } from "../../components/tv/TvBoardView";
import { createInitialState } from "../gameLogic";

function createMockConn(id: string) {
  const sent: string[] = [];
  return {
    id,
    send: vi.fn((data: string) => sent.push(data)),
    close: vi.fn(),
    sent,
  };
}

describe("Reconnection & Grace Period (TASK-NET-003)", () => {
  afterEach(() => {
    cleanup();
  });
  describe("1. GameRoomServer Network Protocol", () => {
    let server: GameRoomServer;
    let mockRoom: any;
    let connections: any[];

    beforeEach(() => {
      vi.useFakeTimers();
      connections = [];
      mockRoom = {
        id: "parties/main/grace-test-room",
        getConnections: () => connections,
      };
      server = new GameRoomServer(mockRoom);
    });

    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it("транслирует PLAYER_DISCONNECTED с graceTimeoutSec=60 при обрыве связи во время PLAYING", () => {
      const hostConn = createMockConn("conn_h1");
      const guestConn = createMockConn("conn_g1");
      connections.push(hostConn, guestConn);

      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/grace-test-room?clientId=c_host&isHost=true&mode=MANIAC_VS_OPERATIVE"),
      });
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/grace-test-room?clientId=c_guest&isHost=false&mode=MANIAC_VS_OPERATIVE"),
      });

      // Переводим игру в статус PLAYING
      server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);
      expect(server.state.status).toBe("PLAYING");

      // Гость отключается (например, обрыв Wi-Fi или сворачивание)
      server.onClose(guestConn);

      expect(server.state.players["c_guest"].isDisconnected).toBe(true);

      const hostReceived = hostConn.sent.map((s) => JSON.parse(s));
      const disconnectNotice = hostReceived.find((m) => m.type === "PLAYER_DISCONNECTED");

      expect(disconnectNotice).toBeDefined();
      expect(disconnectNotice.role).toBe(server.state.players["c_guest"].role);
      expect(disconnectNotice.clientId).toBe("c_guest");
      expect(disconnectNotice.graceTimeoutSec).toBe(60);
    });

    it("бесшовно восстанавливает сессию по authToken в пределах 60 секунд (SESSION_RESTORED и PLAYER_RECONNECTED)", () => {
      const hostConn = createMockConn("conn_h1");
      const guestConn = createMockConn("conn_g1");
      connections.push(hostConn, guestConn);

      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/grace-test-room?clientId=c_host&isHost=true"),
      });
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/grace-test-room?clientId=c_guest&isHost=false"),
      });

      const guestAuthToken = server.state.players["c_guest"].authToken;
      expect(guestAuthToken).toBeDefined();

      server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);

      // Обрыв связи гостя
      server.onClose(guestConn);
      expect(server.state.players["c_guest"].isDisconnected).toBe(true);

      // Прошло 20 секунд (в пределах грейс-периода)
      act(() => {
        vi.advanceTimersByTime(20000);
      });

      // Гость возвращается с новым сокетом, но с сохраненным authToken
      const guestReconnectedConn = createMockConn("conn_g2");
      connections = [hostConn, guestReconnectedConn];

      server.onConnect(guestReconnectedConn, {
        request: new Request(`http://localhost:1999/party/grace-test-room?clientId=c_guest_new&authToken=${guestAuthToken}`),
      });

      // Проверяем снятие флага отключения
      expect(server.state.players["c_guest_new"].isDisconnected).toBe(false);

      // Проверяем отправку SESSION_RESTORED гостю
      const guestReceived = guestReconnectedConn.sent.map((s) => JSON.parse(s));
      const restoredMsg = guestReceived.find((m) => m.type === "SESSION_RESTORED");
      expect(restoredMsg).toBeDefined();
      expect(restoredMsg.status).toBe("PLAYING");
      expect(restoredMsg.gameState).toBeDefined();

      // Проверяем отправку PLAYER_RECONNECTED хосту
      const hostReceived = hostConn.sent.map((s) => JSON.parse(s));
      const reconnectedMsg = hostReceived.find((m) => m.type === "PLAYER_RECONNECTED");
      expect(reconnectedMsg).toBeDefined();
      expect(reconnectedMsg.clientId).toBe("c_guest_new");
    });

    it("фиксирует техническое поражение при истечении 60 секунд грейс-периода", () => {
      const hostConn = createMockConn("conn_h1");
      const guestConn = createMockConn("conn_g1");
      connections.push(hostConn, guestConn);

      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/grace-test-room?clientId=c_host&isHost=true"),
      });
      server.onConnect(guestConn, {
        request: new Request("http://localhost:1999/party/grace-test-room?clientId=c_guest&isHost=false"),
      });

      server.onMessage(JSON.stringify({ type: "START_MATCH" }), hostConn);

      const guestRole = server.state.players["c_guest"].role;
      const expectedWinner = guestRole === "KILLER" ? "DETECTIVE" : "KILLER";

      // Гость пропал
      server.onClose(guestConn);

      // Истекает 60 секунд
      act(() => {
        vi.advanceTimersByTime(DISCONNECT_GRACE_PERIOD_MS + 100);
      });

      expect(server.state.status).toBe("FINISHED");

      const hostReceived = hostConn.sent.map((s) => JSON.parse(s));
      const matchOverMsg = hostReceived.find((m) => m.type === "MATCH_OVER");

      expect(matchOverMsg).toBeDefined();
      expect(matchOverMsg.reason).toBe("OPPONENT_ABANDONED");
      expect(matchOverMsg.winner).toBe(expectedWinner);
    });

    it("обрабатывает CLIENT_BACKGROUNDED в onMessage", () => {
      const hostConn = createMockConn("conn_h1");
      connections.push(hostConn);
      server.onConnect(hostConn, {
        request: new Request("http://localhost:1999/party/grace-test-room?clientId=c_host&isHost=true"),
      });

      server.onMessage(
        JSON.stringify({
          type: "CLIENT_BACKGROUNDED",
          senderClientId: "c_host",
          payload: { isBackground: true },
        }),
        hostConn
      );

      expect(server.state.players["c_host"].isBackground).toBe(true);

      server.onMessage(
        JSON.stringify({
          type: "CLIENT_BACKGROUNDED",
          senderClientId: "c_host",
          payload: { isBackground: false },
        }),
        hostConn
      );

      expect(server.state.players["c_host"].isBackground).toBe(false);
    });
  });

  describe("2. UI Изоляция Z-Index и сохранение стейта маневра", () => {
    const mockState = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER", 2, 3, 16, "Оппонент");

    it("оверлей потери связи не сбрасывает активный шаг визарда маневра поля", async () => {
      const onDispatch = vi.fn();
      const onPreview = vi.fn();

      const { rerender } = render(
        <MobileControllerView
          gameState={{ ...mockState, currentTurn: "KILLER" }}
          playerRole="KILLER"
          onDispatchAction={onDispatch}
          onSelectLinePreview={onPreview}
          isLocalDisconnected={false}
        />
      );

      // Нажимаем действие "Маневр"
      const shiftBtn = screen.getByText(/Маневр/i);
      fireEvent.click(shiftBtn);

      // Проверяем, что визард открылся на Этапе 1
      expect(screen.getByText(/ЭТАП 1 • ВЫБЕРИТЕ ЛИНИЮ ДЛЯ МАНЕВРА/i)).toBeDefined();

      // Выбираем второй ряд (РЯД #2)
      const row2Btn = screen.getByText(/РЯД #2/i);
      fireEvent.click(row2Btn);

      // Проверяем переход на Этап 2 (выбор направления)
      expect(screen.getByText(/ЭТАП 2 • НАПРАВЛЕНИЕ ДЛЯ РЯДА #2/i)).toBeDefined();

      // Происходит обрыв связи: rerender с isLocalDisconnected={true}
      rerender(
        <MobileControllerView
          gameState={{ ...mockState, currentTurn: "KILLER" }}
          playerRole="KILLER"
          onDispatchAction={onDispatch}
          onSelectLinePreview={onPreview}
          isLocalDisconnected={true}
          reconnectAttempt={2}
        />
      );

      // Оверлей потери связи отображается
      const lossOverlay = screen.getByTestId("connection-loss-overlay");
      expect(lossOverlay).toBeDefined();
      expect(screen.getByText(/ПОТЕРЯ РАДИОСВЯЗИ/i)).toBeDefined();
      expect(screen.getByText(/ВОССТАНОВЛЕНИЕ СИГНАЛА \(2\/3\)\.\.\./i)).toBeDefined();

      // Связь восстановилась: rerender с isLocalDisconnected={false}
      rerender(
        <MobileControllerView
          gameState={{ ...mockState, currentTurn: "KILLER" }}
          playerRole="KILLER"
          onDispatchAction={onDispatch}
          onSelectLinePreview={onPreview}
          isLocalDisconnected={false}
        />
      );

      // Оверлей скрылся
      await waitFor(() => {
        expect(screen.queryByTestId("connection-loss-overlay")).toBeNull();
      });

      // КРИТИЧЕСКИЙ ИНВАРИАНТ: визард остался на Этапе 2 для РЯДА #2 без сброса!
      expect(screen.getByText(/ЭТАП 2 • НАПРАВЛЕНИЕ ДЛЯ РЯДА #2/i)).toBeDefined();
    });

    it("баннер ожидания соперника отображается при disconnectedOpponent", () => {
      render(
        <MobileControllerView
          gameState={{ ...mockState, currentTurn: "KILLER" }}
          playerRole="KILLER"
          onDispatchAction={vi.fn()}
          disconnectedOpponent={{ role: "DETECTIVE", graceTimeoutSec: 45 }}
        />
      );

      const banner = screen.getByTestId("opponent-reconnecting-banner");
      expect(banner).toBeDefined();
      expect(screen.getByText(/ОЖИДАНИЕ ВОЗВРАЩЕНИЯ СВЯЗНОГО/i)).toBeDefined();
      expect(screen.getByText(/ВРЕМЕННАЯ ПАУЗА СВЯЗИ • ТАЙМЕР ЗАМОРОЖЕН/i)).toBeDefined();
    });

    it("TvBoardView отображает оверлей паузы при disconnectedPlayer", () => {
      render(
        <TvBoardView
          gameState={{ ...mockState, status: "PLAYING" as any }}
          disconnectedPlayer={{ role: "KILLER", graceTimeoutSec: 50 }}
        />
      );

      const tvBanner = screen.getByTestId("tv-player-disconnected-banner");
      expect(tvBanner).toBeDefined();
      expect(screen.getByText(/ВРЕМЕННАЯ ПАУЗА СВЯЗИ • ТАЙМЕР ХОДА ЗАМОРОЖЕН/i)).toBeDefined();
      expect(screen.getByText(/ОЖИДАНИЕ ВОЗВРАЩЕНИЯ СВЯЗНОГО В СЕТЬ/i)).toBeDefined();
    });
  });
});
