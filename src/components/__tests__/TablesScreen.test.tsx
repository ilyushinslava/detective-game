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
        networkError="Комната заполнена: нет свободных мест."
        clearNetworkError={mockClear}
      />
    );

    // Проверяем баннер ошибки
    expect(screen.getByText(/Комната заполнена: нет свободных мест./i)).toBeDefined();
    
    // Проверяем кнопку закрытия ошибки
    const closeErrorBtn = screen.getByTitle("Закрыть");
    fireEvent.click(closeErrorBtn);
    expect(mockClear).toHaveBeenCalled();

    // В переполненной комнате кнопка заблокирована со стандартным текстом ЗАПОЛНЕНО
    const fullBtn = screen.getByRole("button", { name: /ЗАПОЛНЕНО/i });
    expect(fullBtn).toBeDefined();
    expect((fullBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("обрабатывает переключение фильтров", () => {
    render(<TablesScreen {...defaultProps} />);
    
    const filterBtn = screen.getAllByRole("button", { name: /Skhvatka/i })[0];
    fireEvent.click(filterBtn);
    expect(mockSetRoomFilter).toHaveBeenCalledWith("SKHVATKA");
  });

  it("поддерживает мобильный выпадающий список (Dropdown) фильтрации режимов", () => {
    render(<TablesScreen {...defaultProps} />);

    // Кнопка селектора показывает текущий режим
    const dropdownBtn = screen.getByRole("button", { name: /РЕЖИМ:/i });
    expect(dropdownBtn).toBeDefined();

    // При клике открывается меню с опциями
    fireEvent.click(dropdownBtn);
    const options = screen.getAllByRole("button", { name: /Skhvatka/i });
    // Кликаем по пункту выпадающего меню
    fireEvent.click(options[options.length - 1]);
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

    // Должна отображаться только приватная комната (без дублирующего бейджа ЗАКРЫТАЯ)
    expect(screen.getByText(/Секретный Агент/i)).toBeDefined();
    expect(screen.queryByText(/ЗАКРЫТАЯ/i)).toBeNull();
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

  it("сортирует комнаты по приоритету доступности (WAITING перед IN_GAME и FULL)", () => {
    const rooms = [
      { roomCode: "room-full", hostName: "FullHost", mode: "SKHVATKA", playersCount: 2, maxPlayers: 2, isPrivate: false, status: "FULL" },
      { roomCode: "room-ingame", hostName: "PlayingHost", mode: "SKHVATKA", playersCount: 2, maxPlayers: 2, isPrivate: false, status: "PLAYING" },
      { roomCode: "room-waiting", hostName: "WaitingHost", mode: "SKHVATKA", playersCount: 1, maxPlayers: 2, isPrivate: false, status: "WAITING" },
    ];
    const { container } = render(<TablesScreen {...defaultProps} filteredRooms={rooms} />);
    
    const hostNames = Array.from(container.querySelectorAll(".truncate"))
      .map((el) => el.textContent)
      .filter((t) => t && ["WaitingHost", "PlayingHost", "FullHost"].includes(t));

    // Ожидаем, что WaitingHost идет первым
    expect(hostNames[0]).toBe("WaitingHost");
    expect(hostNames[1]).toBe("PlayingHost");
    expect(hostNames[2]).toBe("FullHost");
  });

  it("не использует цветастые круглые индикаторы для статусов комнат", () => {
    const rooms = [
      { roomCode: "room-1", hostName: "Host1", mode: "SKHVATKA", playersCount: 1, maxPlayers: 2, isPrivate: false, status: "WAITING" }
    ];
    const { container } = render(<TablesScreen {...defaultProps} filteredRooms={rooms} />);
    
    // Никаких зеленых, янтарных или серых кружочков
    expect(container.querySelector(".bg-emerald-400")).toBeNull();
    expect(container.querySelector(".bg-amber-400.rounded-full")).toBeNull();
    expect(container.querySelector(".bg-zinc-500.rounded-full")).toBeNull();
    
    // Статус отображается строгим моноширинным текстом
    expect(screen.getByText("ОЖИДАНИЕ")).toBeDefined();
  });

  it("приводит тексты неактивных кнопок к единому стандарту и не содержит shadow-neon-blue", () => {
    const rooms = [
      { roomCode: "room-full", hostName: "FullHost", mode: "SKHVATKA", playersCount: 2, maxPlayers: 2, isPrivate: false, status: "FULL" },
      { roomCode: "room-ingame", hostName: "PlayingHost", mode: "SKHVATKA", playersCount: 2, maxPlayers: 2, isPrivate: false, status: "PLAYING" },
    ];
    const { container } = render(<TablesScreen {...defaultProps} filteredRooms={rooms} />);
    
    // Единый стандарт: ЗАПОЛНЕНО и ИДЁТ МАТЧ на кнопках
    expect(screen.getByRole("button", { name: /^ЗАПОЛНЕНО$/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /^ИДЁТ МАТЧ$/i })).toBeDefined();
    
    // Отсутствие кислотного неона
    expect(container.querySelector(".shadow-neon-blue")).toBeNull();
  });
});