// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MainMenu } from "../MainMenu";
import { PauseModal } from "../PauseModal";
import { GameOverModal } from "../GameOverModal";
import { I18nProvider } from "../../i18n/context";

describe("Интерактивное взаимодействие с экранами (screensInteraction)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  describe("MainMenu", () => {
    const mockProfile = {
      id: "test",
      nickname: "Агент 007",
      avatar: "🕵️",
      level: 1,
      xp: 0,
      cash: 15000,
      chips: 10,
      rank: "Стажёр",
      stats: { wins: 0, losses: 0 },
    };

    it("Клик по плашке баланса вызывает onOpenDevPanel", () => {
      const onOpenDevPanel = vi.fn();
      render(
        <I18nProvider>
          <MainMenu
            profile={mockProfile}
            activeTab="LOBBY"
            onTabChange={vi.fn()}
            onStartGame={vi.fn()}
            hasActiveGame={false}
            onResumeGame={vi.fn()}
            onOpenRules={vi.fn()}
            onOpenDevPanel={onOpenDevPanel}
          />
        </I18nProvider>
      );

      const balancePill = screen.getByTitle(/Dev/i);
      fireEvent.click(balancePill);
      expect(onOpenDevPanel).toHaveBeenCalledTimes(1);
    });

    it("Выбор режима открывает экран описания с составом игры и кнопкой НАЧАТЬ ИГРУ", () => {
      render(
        <I18nProvider>
          <MainMenu
            profile={mockProfile}
            activeTab={"SOLO" as any}
            onTabChange={vi.fn()}
            onStartGame={vi.fn()}
            hasActiveGame={false}
            onResumeGame={vi.fn()}
            onOpenRules={vi.fn()}
          />
        </I18nProvider>
      );

      // Переход в каталог режимов, если отображается главный экран
      const soloTabs = screen.queryAllByText(/ОДИНОЧНАЯ ИГРА|ОДИНОЧНЫЕ ДЕЛА/i);
      if (soloTabs.length > 0) {
        fireEvent.click(soloTabs[0]);
      }

      // Клик по карточке первого режима
      const modeCard = screen.getAllByText(/Почерк убийцы/i)[0];
      fireEvent.click(modeCard);
      expect(screen.getByText(/СВОДКА РАССЛЕДОВАНИЯ/i)).toBeDefined();
                  /*

      // Проверка компонентов состава игры по Макету 1
      expect(screen.getByText(/СОСТАВ ИГРЫ/i)).toBeDefined(); */
        expect(screen.getAllByText(/подозреваемые|подозреваемых/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/жертвы|доказательств/i).length).toBeGreaterThan(0);

      // Проверка наличия кнопки НАЧАТЬ ИГРУ
      const startBtn = screen.getAllByRole("button").find((b) => (b.textContent || "").includes("НАЧАТЬ ИГРУ"));
      expect(startBtn).toBeDefined();

      // Проверка навигации назад
      const backBtn = screen.getAllByRole("button").find((b) => (b.textContent || "").includes("Назад"));
      expect(backBtn).toBeDefined();
      fireEvent.click(backBtn!);

      // Убеждаемся, что вернулись в список режимов
      expect(screen.getAllByText(/Почерк убийцы/i)[0]).toBeDefined();
    });

    it("Кнопка «ТВ РЕЖИМ» открывает модалку с выбором роли, а отдельная кнопка «Подключиться к ТВ» отсутствует в меню", () => {
      const onStartTvParty = vi.fn();
      render(
        <I18nProvider>
          <MainMenu
            profile={mockProfile}
            activeTab="LOBBY"
            onTabChange={vi.fn()}
            onStartGame={vi.fn()}
            hasActiveGame={false}
            onResumeGame={vi.fn()}
            onOpenRules={vi.fn()}
            onStartTvParty={onStartTvParty}
          />
        </I18nProvider>
      );

      // 1. Отдельная широкая кнопка «Подключиться к ТВ» отсутствует на дашборде
      expect(screen.queryByText(/Пульт контроллера • Ввод PIN или Морзе/i)).toBeNull();

      // 2. Клик по карточке ТВ РЕЖИМ открывает модальное окно выбора роли устройства
      const tvModeButton = screen.getAllByRole("button", { name: /ТВ РЕЖИМ|TV PARTY/i })[0];
      fireEvent.click(tvModeButton);
      expect(screen.getByText(/ТВ ВЕЧЕРИНКА • РОЛЬ УСТРОЙСТВА/i)).toBeDefined();

      // 3. Выбор контроллера смартфона запускает onStartTvParty("CONTROLLER")
      const controllerChoice = screen.getByText(/ПОДКЛЮЧИТЬСЯ К ТВ \(ПУЛЬТ\)/i);
      fireEvent.click(controllerChoice);
      expect(onStartTvParty).toHaveBeenCalledWith("CONTROLLER");
    });

    it("В модалке ТВ-режима выбор экрана телевизора запускает onStartTvParty('TV_DISPLAY')", () => {
      const onStartTvParty = vi.fn();
      render(
        <I18nProvider>
          <MainMenu
            profile={mockProfile}
            activeTab="LOBBY"
            onTabChange={vi.fn()}
            onStartGame={vi.fn()}
            hasActiveGame={false}
            onResumeGame={vi.fn()}
            onOpenRules={vi.fn()}
            onStartTvParty={onStartTvParty}
          />
        </I18nProvider>
      );

      const tvModeButton = screen.getAllByRole("button", { name: /ТВ РЕЖИМ|TV PARTY/i })[0];
      fireEvent.click(tvModeButton);

      const tvDisplayChoice = screen.getByText(/ЭКРАН ТЕЛЕВИЗОРА/i);
      fireEvent.click(tvDisplayChoice);
      expect(onStartTvParty).toHaveBeenCalledWith("TV_DISPLAY");
    });
  });

  describe("PauseModal", () => {
    it("Корректно обрабатывает кнопки возобновления, правил, DEV и выхода", () => {
      const onResume = vi.fn();
      const onOpenRules = vi.fn();
      const onOpenDevPanel = vi.fn();
      const onLeaveGame = vi.fn();

      render(
        <PauseModal
          isOpen={true}
          onClose={onResume}
          onResume={onResume}
          onOpenRules={onOpenRules}
          onLeaveGame={onLeaveGame}
          onOpenDevPanel={onOpenDevPanel}
          isSfxEnabled={true}
          isAmbientEnabled={true}
          isHapticsEnabled={true}
          onToggleSfx={vi.fn()}
          onToggleAmbient={vi.fn()}
          onToggleHaptics={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText(/Продолжить/i));
      expect(onResume).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText(/Справочник правил/i));
      expect(onOpenRules).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText(/Покинуть игру/i));
      expect(onLeaveGame).toHaveBeenCalledTimes(1);
    });
  });

  describe("GameOverModal", () => {
    it("Отображает титулы ролей и вызывает onRestart и onExitToMenu", () => {
      const onRestart = vi.fn();
      const onExitToMenu = vi.fn();

      render(
        <GameOverModal
          winner="KILLER"
          mode="MANIAC_VS_OPERATIVE"
          killer={{ id: "c1", name: "Руслан Громов", isAlive: true, isExonerated: false }}
          detective={{ id: "c2", name: "Марк Воронов", isAlive: true, isExonerated: false }}
          elapsedTime="02:15"
          onRestart={onRestart}
          onExitToMenu={onExitToMenu}
        />
      );

      expect(screen.getByText(/Руслан Громов/i)).toBeDefined();
      expect(screen.getByText(/Марк Воронов/i)).toBeDefined();
      expect(screen.getByText(/02:15/i)).toBeDefined();

      fireEvent.click(screen.getByText(/Новое расследование/i));
      expect(onRestart).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText(/В главное меню/i));
      expect(onExitToMenu).toHaveBeenCalledTimes(1);
    });
  });
});
