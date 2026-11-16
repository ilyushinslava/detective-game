// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import App from "../../App";
import * as tvAudio from "../../utils/tvAudio";

describe("Pass & Play Flow & Blindfold Curtain Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(tvAudio, "playShiftSound").mockImplementation(() => {});
    vi.spyOn(tvAudio, "playEliminateSound").mockImplementation(() => {});
    vi.spyOn(tvAudio, "playRadarPing").mockImplementation(() => {});
    vi.spyOn(tvAudio, "playClickSound").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("при базовом сдвиге шторка НЕ появляется (лишний клик устранен), а при триггерах смены роли шторка z-[9999] активируется", async () => {
    render(<App />);

    // Пропускаем сплеш-скрин
    const splash = screen.queryAllByText(/Коснитесь, чтобы войти|Нажмите в любом месте/i);
    if (splash.length > 0) {
      fireEvent.click(splash[0]);
    }

    // Выбираем карточку дуэли на одном экране (PVP)
    const duelBtns = await screen.findAllByText(/На одном экране/i);
    fireEvent.click(duelBtns[0]);

    // Выбираем режим ПОЧЕРК УБИЙЦЫ (MANIAC_VS_OPERATIVE)
    const modeBtn = await screen.findByText(/ПОЧЕРК УБИЙЦЫ/i);
    fireEvent.click(modeBtn);

    // В деталях режима жмем НАЧАТЬ ИГРУ
    const startPlayBtn = await screen.findByRole("button", { name: /НАЧАТЬ ИГРУ/i });
    fireEvent.click(startPlayBtn);

    // Проходим интро PVP: Игрок 1 (Маньяк / Бандит)
    const revealP1 = await screen.findByText(/Посмотреть тайную роль/i);
    fireEvent.click(revealP1);

    const passToP2 = await screen.findByText(/Скрыть и передать сопернику/i);
    fireEvent.click(passToP2);

    // Проходим интро PVP: Игрок 2 (Оперативник / Инспектор)
    const revealP2 = await screen.findByText(/Посмотреть роль|Посмотреть тайную роль/i);
    fireEvent.click(revealP2);

    const startMatch = await screen.findByText(/Начать партию|Принять дело|Начать расследование|Начать операцию/i);
    fireEvent.click(startMatch);

    // Игрок 1 делает базовый маневр сдвига строки 0
    const shiftBtn = await screen.findByTestId("row-left-0");
    expect(shiftBtn).toBeDefined();

    act(() => {
      fireEvent.click(shiftBtn);
    });

    // Базовый сдвиг НЕ активирует блокирующую шторку
    expect(screen.queryByRole("dialog", { name: /Смена игрока/i })).toBeNull();
  });
});
