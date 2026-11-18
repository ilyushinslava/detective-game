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
    
    // Находим кнопку создания стола
    const buttons = Array.from(container.querySelectorAll('button'));
    const createBtn = buttons.find(b => b.textContent?.includes('Создать') || b.className.includes('from-blue-600'));
    
    expect(createBtn).toBeDefined();
    fireEvent.click(createBtn!);
    expect(mockSetIsCreateRoomOpen).toHaveBeenCalledWith(true);
  });

  it("рендерит список доступных открытых комнат и вызывает свободный вход handleJoinRoom в 1 клик", () => {
    const rooms = [
      { roomCode: "room-open-1", hostName: "Sheriff", mode: "SKHVATKA", playersCount: 1, maxPlayers: 2, isPrivate: false }
    ];
    render(<TablesScreen {...defaultProps} filteredRooms={rooms} />);
    
    // Проверяем отображение имени хоста
    expect(screen.getByText(/Sheriff/i)).toBeDefined();
    
    // Находим кнопку свободного входа в комнату
    const joinBtn = screen.getByRole("button", { name: /Войти/i });
    expect(joinBtn).toBeDefined();
    fireEvent.click(joinBtn);
    expect(mockHandleJoinRoom).toHaveBeenCalledWith("room-open-1", "SKHVATKA");
  });

  it("отображает баннер сетевой ошибки и блокирует вход в переполненные комнаты", () => {
    const mockClear = vi.fn();
    const rooms = [
      { roomCode: "room-full-1", hostName: "BusyHost", mode: "SKHVATKA", playersCount: 2, maxPlayers: 2, isPrivate: false }
    ];
    render(
      <TablesScreen
        {...defaultProps}
        filteredRooms={rooms}
        networkError="Штаб полон: все слоты агентов уже заняты."
        clearNetworkError={mockClear}
      />
    );

    // Проверяем баннер ошибки
    expect(screen.getByText(/Штаб полон: все слоты агентов уже заняты./i)).toBeDefined();
    
    // Проверяем кнопку закрытия ошибки
    const closeErrorBtn = screen.getByTitle("Закрыть");
    fireEvent.click(closeErrorBtn);
    expect(mockClear).toHaveBeenCalled();

    // В переполненной комнате кнопка заблокирована
    const fullBtn = screen.getByRole("button", { name: /СТОЛ ПОЛОН/i });
    expect(fullBtn).toBeDefined();
    expect((fullBtn as HTMLButtonElement).disabled).toBe(true);
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

  it("в нижней панели действий отображает только кнопку '+ Создать партию' без лишнего ручного ввода", () => {
    render(<TablesScreen {...defaultProps} filteredRooms={[]} />);
    
    // Кнопка ручного ввода шифра удалена
    expect(screen.queryByText(/Ввести шифр вручную/i)).toBeNull();

    // Доступна только главная кнопка создания партии
    const createBtn = screen.getByRole("button", { name: /\+ Создать партию/i });
    expect(createBtn).toBeDefined();
    fireEvent.click(createBtn);
    expect(mockSetIsCreateRoomOpen).toHaveBeenCalledWith(true);
  });
});