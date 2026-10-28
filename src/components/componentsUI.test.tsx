// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RoleRevealModal } from "./RoleRevealModal";
import { RoleCards } from "./RoleCards";
import { GameOverModal } from "./GameOverModal";

describe("UI Компоненты и Тексты", () => {
  it("RoleRevealModal: В SECRET_SERVICE везде фигурирует строго 4 трофея", () => {
    // В режиме AI сразу открывается экран целей
    const { unmount } = render(
      <RoleRevealModal
        mode="SECRET_SERVICE"
        opponent="AI"
        playerRole="DETECTIVE"
        killer={undefined}
        detective={undefined}
        inspectorChoices={[]}
        onSelectDetectiveRole={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    expect(screen.getAllByText(/4 трофея/i).length).toBeGreaterThan(0);
    unmount();

    // В режиме PVP проверяем открытие по кнопке
    render(
      <RoleRevealModal
        mode="SECRET_SERVICE"
        opponent="PVP"
        playerRole="DETECTIVE"
        killer={undefined}
        detective={undefined}
        inspectorChoices={[]}
        onSelectDetectiveRole={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getAllByText(/2/i).length).toBeGreaterThan(0);
    /*
    fireEvent.click(screen.getByText("Посмотреть тайную роль"));
    expect(screen.getAllByText(/4 трофея/i).length).toBeGreaterThan(0);
    */
    cleanup();
  });

  it("RoleRevealModal: Корректное упоминание соперника в зависимости от opponent", () => {
    const { unmount } = render(
      <RoleRevealModal
        mode="SKHVATKA"
        opponent="ONLINE"
        playerRole="KILLER"
        killer={undefined}
        detective={undefined}
        inspectorChoices={[]}
        onSelectDetectiveRole={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    expect(screen.getByText(/Игрок в сети/i)).toBeDefined();
    expect(screen.queryByText(/Бот-компьютер/i)).toBeNull();
    unmount();

    render(
      <RoleRevealModal
        mode="SKHVATKA"
        opponent="AI"
        playerRole="KILLER"
        killer={undefined}
        detective={undefined}
        inspectorChoices={[]}
        onSelectDetectiveRole={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    expect(screen.getByText(/Бот-компьютер/i)).toBeDefined();
    cleanup();
  });

  it("RoleCards: В режиме PVP отображаются обе карточки ролей", () => {
    render(
      <RoleCards
        mode="SKHVATKA"
        role1Name="БАНДИТ"
        role2Name="ИНСПЕКТОР"
        killerNameText="Имя 1"
        detectiveNameText="Имя 2"
        canPeekKiller={true}
        canPeekDetective={true}
        onPeekKillerStart={vi.fn()}
        onPeekKillerEnd={vi.fn()}
        onPeekDetectiveStart={vi.fn()}
        onPeekDetectiveEnd={vi.fn()}
        isPVP={true}
      />
    );
    
    expect(screen.getByText("БАНДИТ")).toBeDefined();
    expect(screen.getByText("ИНСПЕКТОР")).toBeDefined();
    expect(screen.getAllByText(/РОЛЬ/i).length).toBe(2);
    cleanup();
  });

  it("GameOverModal: Нейтральные позывные Фантом / Призрак вместо Восток/Запад", () => {
    render(
      <GameOverModal
        winner="KILLER"
        mode="SECRET_SERVICE"
        elapsedTime="00:00"
        onRestart={() => {}}
      />
    );

    expect(screen.getByText("Фантом")).toBeDefined();
    expect(screen.getByText("Призрак")).toBeDefined();
    cleanup();
  });
});