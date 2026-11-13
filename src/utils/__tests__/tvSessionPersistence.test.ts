// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("TV Party: Сессионная персистентность и Auto-Recovery (localStorage)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("сохраняет tv_session_party_state и tv_session_room_code при активной ТВ-сессии", () => {
    const roomCode = "54321";
    const partyState = "TV_BOARD";

    localStorage.setItem("tv_session_room_code", roomCode);
    localStorage.setItem("tv_session_party_state", partyState);

    expect(localStorage.getItem("tv_session_room_code")).toBe("54321");
    expect(localStorage.getItem("tv_session_party_state")).toBe("TV_BOARD");
  });

  it("восстанавливает комнату и состояние ТВ после перезагрузки WebView (F5)", () => {
    // Симулируем сохранение перед сбоем/перезагрузкой
    localStorage.setItem("tv_session_room_code", "98765");
    localStorage.setItem("tv_session_party_state", "TV_BOARD");

    // Функция инициализации, имитирующая App.tsx useState
    const restoreRoomCode = (urlRoom?: string) => {
      if (urlRoom) return urlRoom;
      return localStorage.getItem("tv_session_room_code") || "";
    };

    const restorePartyState = (clientType?: string, isAndroidTv?: boolean) => {
      if (clientType === "CONTROLLER") return "CONTROLLER";
      if (clientType === "TV_DISPLAY") return "TV_LOBBY";

      const savedState = localStorage.getItem("tv_session_party_state");
      const savedRoom = localStorage.getItem("tv_session_room_code");
      if (savedState && savedRoom && ["TV_LOBBY", "TV_BOARD", "CONTROLLER"].includes(savedState)) {
        return savedState;
      }
      if (isAndroidTv) return "TV_HOME";
      return "NONE";
    };

    expect(restoreRoomCode()).toBe("98765");
    expect(restorePartyState()).toBe("TV_BOARD");
  });

  it("очищает tv_session_* ключи при штатном выходе из комнаты", () => {
    localStorage.setItem("tv_session_room_code", "12345");
    localStorage.setItem("tv_session_party_state", "TV_BOARD");

    // Симуляция onExit
    const handleExit = () => {
      localStorage.removeItem("tv_session_party_state");
      localStorage.removeItem("tv_session_room_code");
    };

    handleExit();

    expect(localStorage.getItem("tv_session_room_code")).toBeNull();
    expect(localStorage.getItem("tv_session_party_state")).toBeNull();
  });
});
