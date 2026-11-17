// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TablesScreen } from "../TablesScreen";

describe("TablesScreen", () => {
  const mockSetRoomFilter = vi.fn();
  const mockSetJoinCode = vi.fn();
  const mockHandleJoinRoom = vi.fn();
  const mockSetIsCreateRoomOpen = vi.fn();

  const defaultProps = {
    roomFilter: "ALL",
    setRoomFilter: mockSetRoomFilter,
    filteredRooms: [],
    joinCode: "",
    setJoinCode: mockSetJoinCode,
    handleJoinRoom: mockHandleJoinRoom,
    setIsCreateRoomOpen: mockSetIsCreateRoomOpen,
    ROOM_FILTERS: [
      { id: "ALL", label: "All" },
      { id: "SKHVATKA", label: "Skhvatka" }
    ],
    GAME_MODES: [
      { id: "SKHVATKA", title: "Skhvatka Mode" }
    ],
    soundManager: { play: vi.fn() }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("отображает пустое состояние при отсутствии комнат и вызывает открытие создания стола", () => {
    const { container } = render(<TablesScreen {...defaultProps} />);
    
    // Находим кнопку создания стола по уникальному классу градиента
    const buttons = Array.from(container.querySelectorAll('button'));
    const createBtn = buttons.find(b => b.className.includes('from-red-600'));
    
    expect(createBtn).toBeDefined();
    fireEvent.click(createBtn!);
    expect(mockSetIsCreateRoomOpen).toHaveBeenCalledWith(true);
  });

  it("рендерит список доступных открытых комнат и вызывает свободный вход handleJoinRoom в 1 клик", () => {
    const rooms = [
      { roomCode: "room-open-1", hostName: "Sheriff", mode: "SKHVATKA", playersCount: 1, maxPlayers: 2, isPrivate: false }
    ];
    const { container } = render(<TablesScreen {...defaultProps} filteredRooms={rooms} />);
    
    // Проверяем отображение имени хоста
    expect(screen.getByText(/Sheriff/i)).toBeDefined();
    
    // Находим кнопку свободного входа в комнату
    const buttons = Array.from(container.querySelectorAll('button'));
    const joinBtn = buttons.find(b => b.className.includes('from-red-600') && b.textContent?.includes('Войти'));
    
    expect(joinBtn).toBeDefined();
    fireEvent.click(joinBtn!);
    expect(mockHandleJoinRoom).toHaveBeenCalledWith("room-open-1", "SKHVATKA");
  });

  it("обрабатывает переключение фильтров", () => {
    render(<TablesScreen {...defaultProps} />);
    
    const filterBtn = screen.getAllByRole("button", { name: /Skhvatka/i })[0];
    fireEvent.click(filterBtn);
    expect(mockSetRoomFilter).toHaveBeenCalledWith("SKHVATKA");
  });

  it("разделяет лобби на Открытые и Приватные игры, и открывает телеграфный ключ для ввода пароля к выбранной приватной комнате", async () => {
    const rooms = [
      { roomCode: "room-open-1", hostName: "Открытый Хост", mode: "SKHVATKA", playersCount: 1, maxPlayers: 2, isPrivate: false },
      { roomCode: "room-priv-2", hostName: "Секретный Агент", mode: "SKHVATKA", playersCount: 1, maxPlayers: 2, isPrivate: true, morseCode: ".-.-.-." }
    ];
    render(<TablesScreen {...defaultProps} filteredRooms={rooms} />);
    
    // По умолчанию открыта вкладка "Открытые игры"
    expect(screen.getByText(/Открытый Хост/i)).toBeDefined();
    expect(screen.queryByText(/Секретный Агент/i)).toBeNull();

    // Переключаемся на вкладку "Приватные игры"
    const privateTabBtn = screen.getByRole("button", { name: /Приватные игры/i });
    fireEvent.click(privateTabBtn);

    // Должна отображаться только приватная комната
    expect(screen.getByText(/Секретный Агент/i)).toBeDefined();
    expect(screen.getByText(/ЗАКРЫТЫЙ КАНАЛ/i)).toBeDefined();
    expect(screen.queryByText(/Открытый Хост/i)).toBeNull();

    // Кликаем по кнопке ввода шифра к выбранной приватной комнате
    const enterMorseBtn = screen.getByRole("button", { name: /Ввести шифр ➔/i });
    fireEvent.click(enterMorseBtn);

    // Открывается телеграфный ключ с привязкой к хосту (асинхронно через Suspense)
    expect(await screen.findByRole("button", { name: "Ключ телеграфа" })).toBeDefined();
    expect(await screen.findByText(/ШИФР ДОСТУПА: Секретный Агент/i)).toBeDefined();
    expect(await screen.findByText(/ПОДТВЕРДИТЬ ШИФР/i)).toBeDefined();
  });

  it("кнопка 'Ввести шифр вручную' в нижней панели открывает телеграфный ключ без привязки к конкретной комнате", async () => {
    render(<TablesScreen {...defaultProps} filteredRooms={[]} />);
    
    const manualMorseBtn = screen.getByRole("button", { name: /Ввести шифр вручную/i });
    expect(manualMorseBtn).toBeDefined();
    fireEvent.click(manualMorseBtn);

    // Открывается свободный ввод Морзе (ПУЛЬТ УПРАВЛЕНИЯ)
    expect(await screen.findByRole("button", { name: "Ключ телеграфа" })).toBeDefined();
    expect(await screen.findByText(/ПУЛЬТ УПРАВЛЕНИЯ/i)).toBeDefined();
    expect(await screen.findByText(/НАЙТИ ШТАБ/i)).toBeDefined();
  });
});