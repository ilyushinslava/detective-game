// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { HostTvRemoteModal } from "../HostTvRemoteModal";

describe("HostTvRemoteModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <HostTvRemoteModal
        isOpen={false}
        onClose={vi.fn()}
        onDispatchAction={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders remote controls when isOpen is true", () => {
    const onClose = vi.fn();
    const onDispatch = vi.fn();

    render(
      <HostTvRemoteModal
        isOpen={true}
        onClose={onClose}
        onDispatchAction={onDispatch}
        isTvPaused={false}
        isTvMuted={false}
      />
    );

    expect(screen.getByText(/ТВ Пульт Хоста/i)).toBeDefined();
    expect(screen.getByText(/ПАУЗА НА ТВ/i)).toBeDefined();
    expect(screen.getByText(/ВЫКЛЮЧИТЬ ЗВУК ТВ/i)).toBeDefined();

    // Переключение паузы
    const pauseBtn = screen.getByText(/ПАУЗА НА ТВ/i);
    fireEvent.click(pauseBtn);
    expect(onDispatch).toHaveBeenCalledWith({ type: "TV_TOGGLE_PAUSE" });

    // Переключение звука ТВ
    const muteBtn = screen.getByText(/ВЫКЛЮЧИТЬ ЗВУК ТВ/i);
    fireEvent.click(muteBtn);
    expect(onDispatch).toHaveBeenCalledWith({ type: "TV_TOGGLE_MUTE" });
  });

  it("handles restart confirmation dialog correctly", () => {
    const onDispatch = vi.fn();
    const onClose = vi.fn();

    render(
      <HostTvRemoteModal
        isOpen={true}
        onClose={onClose}
        onDispatchAction={onDispatch}
      />
    );

    const restartBtn = screen.getByText(/ПЕРЕЗАПУСК/i);
    fireEvent.click(restartBtn);

    expect(screen.getByText(/Перезапустить матч на телевизоре/i)).toBeDefined();

    const confirmBtn = screen.getByText(/ДА, СБРОС/i);
    fireEvent.click(confirmBtn);

    expect(onDispatch).toHaveBeenCalledWith({ type: "TV_CONFIRM_RESTART" });
    expect(onClose).toHaveBeenCalled();
  });

  it("handles exit to lobby confirmation dialog correctly", () => {
    const onDispatch = vi.fn();
    const onClose = vi.fn();

    render(
      <HostTvRemoteModal
        isOpen={true}
        onClose={onClose}
        onDispatchAction={onDispatch}
      />
    );

    const lobbyBtn = screen.getByRole("button", { name: /В ЛОББИ/i });
    fireEvent.click(lobbyBtn);

    expect(screen.getByText(/Прервать текущий матч и вернуть телевизор в комнату ожидания/i)).toBeDefined();

    const confirmLobbyBtn = screen.getByRole("button", { name: /В ЛОББИ/i });
    fireEvent.click(confirmLobbyBtn);

    expect(onDispatch).toHaveBeenCalledWith({ type: "TV_EXIT_TO_LOBBY" });
    expect(onClose).toHaveBeenCalled();
  });
});
