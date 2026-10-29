// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("отображает пустое состояние при отсутствии комнат и вызывает открытие создания стола", () => {
    const { container } = render(<TablesScreen {...defaultProps} />);
    
    // Находим кнопку создания стола по уникальному классу градиента
    const buttons = Array.from(container.querySelectorAll('button'));
    const createBtn = buttons.find(b => b.className.includes('from-red-600'));
    
    expect(createBtn).toBeDefined();
    fireEvent.click(createBtn!);
    expect(mockSetIsCreateRoomOpen).toHaveBeenCalledWith(true);
  });

  it("рендерит список доступных комнат и вызывает handleJoinRoom", () => {
    const rooms = [
      { roomCode: "1234", hostName: "Sheriff", mode: "SKHVATKA", playersCount: 1, maxPlayers: 2 }
    ];
    const { container } = render(<TablesScreen {...defaultProps} filteredRooms={rooms} />);
    
    // Проверяем отображение имени хоста
    expect(screen.getByText(/Sheriff/i)).toBeDefined();
    
    // Находим кнопку входа в комнату
    const buttons = Array.from(container.querySelectorAll('button'));
    const joinBtn = buttons.find(b => b.className.includes('from-red-600'));
    
    expect(joinBtn).toBeDefined();
    fireEvent.click(joinBtn!);
    expect(mockHandleJoinRoom).toHaveBeenCalledWith("1234", "SKHVATKA");
  });

  it("обрабатывает переключение фильтров", () => {
    render(<TablesScreen {...defaultProps} />);
    
    const filterBtn = screen.getAllByRole("button", { name: /Skhvatka/i })[0];
    fireEvent.click(filterBtn);
    expect(mockSetRoomFilter).toHaveBeenCalledWith("SKHVATKA");
  });

  it("управляет вводом 4-значного кода и валидацией кнопки входа", () => {
    const { container, rerender } = render(<TablesScreen {...defaultProps} joinCode="" />);
    
    const input = container.querySelector('input[type="tel"]') as HTMLInputElement;
    expect(input).toBeDefined();

    // Кнопка применения кода (имеет disabled когда код пуст)
    const buttons = Array.from(container.querySelectorAll('button'));
    const applyBtn = buttons.find(b => b.disabled);
    expect(applyBtn).toBeDefined();
    expect(applyBtn?.disabled).toBe(true);

    // Ввод текста
    fireEvent.change(input, { target: { value: "123" } });
    expect(mockSetJoinCode).toHaveBeenCalledWith("123");

    // Ререндер с валидным кодом
    rerender(<TablesScreen {...defaultProps} joinCode="1234" />);
    
    const updatedButtons = Array.from(container.querySelectorAll('button'));
    // Кнопка применения кода - предпоследняя кнопка
    const updatedApplyBtn = updatedButtons[updatedButtons.length - 2];
    expect(updatedApplyBtn.disabled).toBe(false);
    
    fireEvent.click(updatedApplyBtn);
    expect(mockHandleJoinRoom).toHaveBeenCalledWith("1234");
  });
});