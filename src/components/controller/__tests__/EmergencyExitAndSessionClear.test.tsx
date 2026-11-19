// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import App from "../../../App";
import { partyService } from "../../../utils/partyPeer";
import { ControllerConnectView } from "../ControllerConnectView";

describe("Emergency Exit & Dead Room Protection (TASK-NET-003)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    partyService.disconnect();
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("ControllerConnectView renders noticeMessage banner with close button", () => {
    const onClearSpy = vi.fn();
    render(
      <ControllerConnectView
        onConnect={vi.fn()}
        onBackToMenu={vi.fn()}
        noticeMessage="ТВ-хост отключился"
        onClearNotice={onClearSpy}
      />
    );

    expect(screen.getByText("ТВ-хост отключился")).toBeDefined();
    const closeBtn = screen.getByRole("button", { name: "Закрыть" });
    expect(closeBtn).toBeDefined();

    fireEvent.click(closeBtn);
    expect(onClearSpy).toHaveBeenCalledTimes(1);
  });

  it("clears localStorage, sessionStorage and disconnects partyService when clicking 'ПОКИНУТЬ ЛОББИ'", async () => {
    // Setup stale session
    localStorage.setItem("tv_session_party_state", "CONTROLLER");
    localStorage.setItem("tv_session_room_code", "77777");
    localStorage.setItem("tv_controller_client_id", "c_test_123");
    sessionStorage.setItem("tv_controller_client_id", "c_test_123");
    sessionStorage.setItem("tv_controller_role", "KILLER");
    sessionStorage.setItem("tv_controller_room", "77777");
    sessionStorage.setItem("crime_city_auth_77777", "token_xyz");

    const disconnectSpy = vi.spyOn(partyService, "disconnect");

    render(<App />);

    // Since room is waiting and not playing, lobby screen must be rendered
    const lobbyTitle = await screen.findByText("ВЫ В ЛОББИ");
    expect(lobbyTitle).toBeDefined();
    expect(screen.getByText(/КОМНАТА #77777/i)).toBeDefined();

    const exitBtn = screen.getByRole("button", { name: /ПОКИНУТЬ ЛОББИ/i });
    expect(exitBtn).toBeDefined();

    fireEvent.click(exitBtn);

    // Verify localStorage teardown
    expect(localStorage.getItem("tv_session_party_state")).toBeNull();
    expect(localStorage.getItem("tv_session_room_code")).toBeNull();
    expect(localStorage.getItem("tv_controller_client_id")).toBeNull();

    // Verify sessionStorage teardown
    expect(sessionStorage.getItem("tv_controller_client_id")).toBeNull();
    expect(sessionStorage.getItem("tv_controller_role")).toBeNull();
    expect(sessionStorage.getItem("tv_controller_room")).toBeNull();
    expect(sessionStorage.getItem("crime_city_auth_77777")).toBeNull();

    // Verify partyService disconnect called
    expect(disconnectSpy).toHaveBeenCalled();

    // Should return to connect screen (Camera / Morse)
    expect(await screen.findByText(/ПОДКЛЮЧЕНИЕ К ТВ|ШИФРОВАННЫЙ КАНАЛ/i)).toBeDefined();
  });

  it("automatically kicks controller back to connect screen with notice when TV host disconnects in lobby", async () => {
    // Connect to room in lobby state
    localStorage.setItem("tv_session_party_state", "CONTROLLER");
    localStorage.setItem("tv_session_room_code", "88888");

    render(<App />);

    expect(await screen.findByText("ВЫ В ЛОББИ")).toBeDefined();

    // Simulate server broadcasting TV_DISCONNECTED event
    act(() => {
      partyService.onAction?.({ type: "TV_DISCONNECTED" });
    });

    // Should automatically clear session and show notice banner on connect screen
    expect(await screen.findByText("ТВ-хост отключился")).toBeDefined();
    expect(localStorage.getItem("tv_session_party_state")).toBeNull();
    expect(localStorage.getItem("tv_session_room_code")).toBeNull();
  });

  it("automatically kicks controller back to connect screen when ROOM_STATUS indicates hasTvDisplay: false", async () => {
    localStorage.setItem("tv_session_party_state", "CONTROLLER");
    localStorage.setItem("tv_session_room_code", "99999");

    render(<App />);

    expect(await screen.findByText("ВЫ В ЛОББИ")).toBeDefined();

    // Simulate server status update where TV is missing
    act(() => {
      partyService.onRoomStatus?.({
        type: "ROOM_STATUS",
        status: "WAITING",
        roomCode: "99999",
        hasTvDisplay: false,
        players: {},
      });
    });

    expect(await screen.findByText("ТВ-хост отключился")).toBeDefined();
    expect(localStorage.getItem("tv_session_party_state")).toBeNull();
  });

  it("automatically cleans up stale session on ROOM_NOT_FOUND error", async () => {
    localStorage.setItem("tv_session_party_state", "CONTROLLER");
    localStorage.setItem("tv_session_room_code", "00000");

    render(<App />);

    expect(await screen.findByText("ВЫ В ЛОББИ")).toBeDefined();

    act(() => {
      partyService.onAction?.({
        type: "ERROR",
        message: "ROOM_NOT_FOUND",
      });
    });

    expect(await screen.findByText("ТВ-хост отключился")).toBeDefined();
    expect(localStorage.getItem("tv_session_party_state")).toBeNull();
  });
});
