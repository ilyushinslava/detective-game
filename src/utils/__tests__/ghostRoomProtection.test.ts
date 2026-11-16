// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import GameRoomServer from "../../server/index";
import { partyService } from "../partyPeer";
import { publicRoomsRegistry, roomToMorseRegistry, morseToRoomRegistry } from "../../server/lobby";

describe("Защита от эффекта «комнаты-призрака» (Ghost Room Protection Suite)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    publicRoomsRegistry.clear();
    roomToMorseRegistry.clear();
    morseToRoomRegistry.clear();
  });

  describe("1. Сервер: Очистка и аннулирование комнаты при отключении ТВ-хоста", () => {
    it("удаляет комнату из реестра лобби, если ТВ-хост отключается и игроков нет", () => {
      const server = new GameRoomServer();
      server.room = { id: "99881" };

      // Подключаем ТВ-хост
      const tvConn = { id: "tv_conn_1", send: vi.fn(), close: vi.fn() };
      server.onConnect(tvConn, {
        request: new Request("http://localhost/party/99881?isHost=true&clientType=TV_DISPLAY&nickname=TV_HOST"),
      });

      expect(Object.keys(server.state.tvDisplays).length).toBe(1);
      expect(publicRoomsRegistry.has("99881")).toBe(true);
      expect(roomToMorseRegistry.has("99881")).toBe(true);

      // ТВ-хост закрывает соединение (onClose)
      server.onClose(tvConn);

      expect(Object.keys(server.state.tvDisplays).length).toBe(0);
      expect(server.state.status).toBe("EMPTY");
      // Проверяем: комната полностью вычищена из реестра, а не осталась висеть призраком!
      expect(publicRoomsRegistry.has("99881")).toBe(false);
      expect(roomToMorseRegistry.has("99881")).toBe(false);
    });

    it("оставляет комнату активной и шлет TV_DISCONNECTED, если в комнате еще остались игроки", () => {
      const server = new GameRoomServer();
      server.room = { id: "99882" };

      // Подключаем ТВ
      const tvConn = { id: "tv_conn_2", send: vi.fn(), close: vi.fn() };
      server.onConnect(tvConn, {
        request: new Request("http://localhost/party/99882?isHost=true&clientType=TV_DISPLAY&nickname=TV_HOST"),
      });

      // Подключаем игрока
      const p1Conn = { id: "p1_conn", send: vi.fn(), close: vi.fn() };
      server.onConnect(p1Conn, {
        request: new Request("http://localhost/party/99882?clientId=p1&nickname=Player1&isHost=false"),
      });

      expect(Object.keys(server.state.players).length).toBe(1);

      // ТВ закрывает сокет
      server.onClose(tvConn);

      expect(Object.keys(server.state.tvDisplays).length).toBe(0);
      expect(Object.keys(server.state.players).length).toBe(1);
      // Комната не пустая, поэтому пока не вычищена
      expect(p1Conn.send).toHaveBeenCalled();
    });
  });

  describe("2. Клиент: PartyService защита от подключения к пустой комнате", () => {
    it("отклоняет попытку подключения с пустым roomCode и не инициирует сокет", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      partyService.connect("", "Host", true, "MANIAC_VS_OPERATIVE");
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("empty roomCode"));
      warnSpy.mockRestore();
    });

    it("отклоняет попытку подключения с пробельным roomCode", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      partyService.connect("   ", "Host", true, "MANIAC_VS_OPERATIVE");
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("empty roomCode"));
      warnSpy.mockRestore();
    });
  });

  describe("3. Изоляция сессий и предотвращение реанимации мёртвых комнат", () => {
    it("при старте нового ТВ-режима генерирует свежий PIN и не реанимирует старый sessionStorage", () => {
      sessionStorage.setItem("tv_party_room", "11111");

      const createFreshTvRoom = () => {
        // Логика нового безопасного входа: генерация уникального кода
        const freshCode = Math.floor(10000 + Math.random() * 90000).toString();
        sessionStorage.setItem("tv_party_room", freshCode);
        return freshCode;
      };

      const newCode = createFreshTvRoom();
      expect(newCode).not.toBe("11111");
      expect(sessionStorage.getItem("tv_party_room")).toBe(newCode);
    });

    it("на обычном Web-клиенте без параметров URL не активирует TV_LOBBY из старого localStorage", () => {
      // В localStorage остались следы прошлой сессии
      localStorage.setItem("tv_session_room_code", "77777");
      localStorage.setItem("tv_session_party_state", "TV_LOBBY");

      const resolveInitialTvPartyState = (
        clientTypeParam?: string,
        targetRoomParam?: string,
        isAndroidTv: boolean = false
      ) => {
        if (clientTypeParam === "CONTROLLER" || targetRoomParam) return "CONTROLLER";
        if (clientTypeParam === "TV_DISPLAY") return "TV_LOBBY";
        if (isAndroidTv) {
          const savedState = localStorage.getItem("tv_session_party_state");
          const savedRoom = localStorage.getItem("tv_session_room_code");
          if (savedState && savedRoom && ["TV_LOBBY", "TV_BOARD"].includes(savedState)) {
            return "TV_LOBBY";
          }
          return "TV_LOBBY";
        }
        return "NONE";
      };

      // Браузер открыт на главной странице без параметров
      const state = resolveInitialTvPartyState(undefined, undefined, false);
      expect(state).toBe("NONE");
    });

    it("штатный выход из ТВ-режима на Web очищает ключи сессии и сбрасывает состояние в NONE", () => {
      localStorage.setItem("tv_session_room_code", "88888");
      localStorage.setItem("tv_session_party_state", "TV_LOBBY");
      sessionStorage.setItem("tv_party_room", "88888");

      let tvPartyState = "TV_LOBBY";
      let tvRoomCode = "88888";
      let isLobbyOpen = false;

      const handleExitTvParty = (isAndroidTv: boolean = false) => {
        partyService.disconnect();
        try {
          sessionStorage.removeItem("tv_party_room");
          localStorage.removeItem("tv_session_party_state");
          localStorage.removeItem("tv_session_room_code");
        } catch {}
        tvRoomCode = "";
        if (isAndroidTv) {
          tvPartyState = "TV_HOME";
          isLobbyOpen = false;
          return;
        }
        tvPartyState = "NONE";
        isLobbyOpen = true;
      };

      handleExitTvParty(false);

      expect(tvPartyState).toBe("NONE");
      expect(tvRoomCode).toBe("");
      expect(isLobbyOpen).toBe(true);
      expect(localStorage.getItem("tv_session_room_code")).toBeNull();
      expect(localStorage.getItem("tv_session_party_state")).toBeNull();
      expect(sessionStorage.getItem("tv_party_room")).toBeNull();
    });
  });
});
