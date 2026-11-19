// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GameSheets } from "../GameSheets";
import { DetectiveHand } from "../DetectiveHand";
import { ThiefHand } from "../ThiefHand";
import { BlindfoldCurtain } from "../ui/BlindfoldCurtain";
import { GameActionButtons } from "../game/GameActionDock";
import { createInitialState } from "../../utils/gameLogic";

describe("Интеграционные тесты: Режимы игры, Досье и Боттом-шиты Neo-Noir", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const dummyChars = [
    { id: "c1", name: "Виктор Блэк", isAlive: true, isExonerated: false },
    { id: "c2", name: "Елена Вэнс", isAlive: true, isExonerated: false },
    { id: "c3", name: "Маркус Грей", isAlive: true, isExonerated: false },
    { id: "c4", name: "Анна Соколова", isAlive: true, isExonerated: false },
    { id: "c5", name: "Дмитрий Морозов", isAlive: true, isExonerated: false },
  ];

  describe("1. Досье Закона (MANIAC_VS_OPERATIVE)", () => {
    it("отображает карточки алиби на ходе Закона и НЕ показывает 'ЗАКРЫТО (ЧУЖОЙ ХОД)'", () => {
      const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
      state.detectiveHand = ["c1", "c2", "c3"];
      state.currentTurn = "DETECTIVE";

      const handleExonerate = vi.fn();
      const setIsHandSheetOpen = vi.fn();

      render(
        <GameSheets
          gameState={state}
          allChars={dummyChars}
          isHumanTurn={true}
          isDetectiveTurn={true}
          isKillerTurn={false}
          isHandSheetOpen={true}
          setIsHandSheetOpen={setIsHandSheetOpen}
          isLogOpen={false}
          setIsLogOpen={vi.fn()}
          handleExonerateFromHand={handleExonerate}
        />
      );

      // Заголовок шторки
      expect(screen.getAllByText(/Досье доказательств/i).length).toBeGreaterThan(0);

      // Статус закрытия должен отсутствовать
      expect(screen.queryByTestId("dossier-closed-badge")).toBeNull();
      expect(screen.queryByText(/Закрыто \(чужой ход\)/i)).toBeNull();

      // Все 3 карты подозреваемых должны отображаться с именами
      expect(screen.getByText("Виктор Блэк")).toBeDefined();
      expect(screen.getByText("Елена Вэнс")).toBeDefined();
      expect(screen.getByText("Маркус Грей")).toBeDefined();

      // Клик по первой карте вызывает handleExonerateFromHand и закрывает шторку
      const cardBtn = screen.getByTestId("dossier-card-c1");
      fireEvent.click(cardBtn);

      expect(handleExonerate).toHaveBeenCalledWith("c1");
      expect(setIsHandSheetOpen).toHaveBeenCalledWith(false);
    });

    it("показывает статус 'ЗАКРЫТО (ЧУЖОЙ ХОД)' и скрывает карты на ходе Маньяка", () => {
      const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
      state.detectiveHand = ["c1", "c2"];
      state.currentTurn = "KILLER";

      render(
        <DetectiveHand
          handIds={["c1", "c2"]}
          allCharacters={dummyChars}
          isDetectiveTurn={false}
          onExonerateFromHand={vi.fn()}
        />
      );

      expect(screen.getByTestId("dossier-closed-badge")).toBeDefined();
      expect(screen.getByText(/Закрыто \(чужой ход\)/i)).toBeDefined();
      expect(screen.queryByTestId("dossier-card-c1")).toBeNull();
    });
  });

  describe("2. Маски вора (THIEF_HUNT)", () => {
    it("отображает маски вора на ходе Грабителя, позволяет сменить маску", () => {
      const state = createInitialState("THIEF_HUNT", "PVP", "KILLER");
      state.killerHand = ["c2", "c3"];
      state.currentTurn = "KILLER";

      const handleFastDisguise = vi.fn();
      const setIsHandSheetOpen = vi.fn();

      render(
        <GameSheets
          gameState={state}
          allChars={dummyChars}
          isHumanTurn={true}
          isDetectiveTurn={false}
          isKillerTurn={true}
          isHandSheetOpen={true}
          setIsHandSheetOpen={setIsHandSheetOpen}
          isLogOpen={false}
          setIsLogOpen={vi.fn()}
          handleFastDisguise={handleFastDisguise}
        />
      );

      expect(screen.getAllByText(/Маски вора/i).length).toBeGreaterThan(0);
      expect(screen.queryByTestId("thief-closed-badge")).toBeNull();

      expect(screen.getByTestId("thief-mask-card-c2")).toBeDefined();
      expect(screen.getByTestId("thief-mask-card-c3")).toBeDefined();

      fireEvent.click(screen.getByTestId("thief-mask-card-c2"));
      expect(handleFastDisguise).toHaveBeenCalledWith("c2");
      expect(setIsHandSheetOpen).toHaveBeenCalledWith(false);
    });

    it("показывает 'ЗАКРЫТО (ЧУЖОЙ ХОД)' для масок вора на ходе Полиции", () => {
      render(
        <ThiefHand
          handIds={["c2", "c3"]}
          isThiefTurn={false}
          onFastDisguise={vi.fn()}
        />
      );

      expect(screen.getByTestId("thief-closed-badge")).toBeDefined();
      expect(screen.queryByTestId("thief-mask-card-c2")).toBeNull();
    });
  });

  describe("3. Шторка тайны личности Pass & Play (BlindfoldCurtain)", () => {
    it("активируется при isOpen или isActive и снимается по тапу", () => {
      const onDismiss = vi.fn();

      const { rerender } = render(
        <BlindfoldCurtain
          isOpen={true}
          nextPlayerName="ОПЕРАТИВНИК"
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByText("ОПЕРАТИВНИК")).toBeDefined();
      expect(screen.getByText(/Передайте устройство/i)).toBeDefined();

      const confirmBtn = screen.getByText(/Принять ход/i);
      fireEvent.click(confirmBtn);
      expect(onDismiss).toHaveBeenCalled();

      // Также поддерживается проп isActive
      rerender(
        <BlindfoldCurtain
          isActive={true}
          nextPlayerName="МАНЬЯК"
          onDismiss={onDismiss}
        />
      );
      expect(screen.getByText("МАНЬЯК")).toBeDefined();
    });
  });

  describe("4. Доступность действий в 3 режимах в GameActionDock", () => {
    it("MANIAC_VS_OPERATIVE: отображает кнопку 'Досье' для Закона", () => {
      const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
      state.detectiveHand = ["c1", "c2", "c3"];
      const setIsHandSheetOpen = vi.fn();

      render(
        <GameActionButtons
          gameState={state}
          targetActions={[
            { id: "accuse_basic", label: "Задержание", onClick: vi.fn(), className: "" }
          ]}
          isCleanupAvailable={false}
          isDetectiveView={true}
          selectedCharacter={null}
          setIsHandSheetOpen={setIsHandSheetOpen}
        />
      );

      const dossierBtn = screen.getByRole("button", { name: /Досье \(3\)/i });
      expect(dossierBtn).toBeDefined();

      fireEvent.click(dossierBtn);
      expect(setIsHandSheetOpen).toHaveBeenCalledWith(true);
    });

    it("THIEF_HUNT: отображает действия вора (Кража, Конспирация) без Досье", () => {
      const state = createInitialState("THIEF_HUNT", "PVP", "KILLER");
      render(
        <GameActionButtons
          gameState={state}
          targetActions={[
            { id: "rob_basic", label: "Кража", onClick: vi.fn(), className: "" },
            { id: "disguise_thief", label: "Конспирация", onClick: vi.fn(), className: "" },
          ]}
          isCleanupAvailable={false}
          isDetectiveView={false}
          selectedCharacter={null}
          setIsHandSheetOpen={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /Кража/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Конспирация/i })).toBeDefined();
      expect(screen.queryByRole("button", { name: /Досье/i })).toBeNull();
    });

    it("SECRET_SERVICE: отображает действия шпиона (Разоблачение, Опрос) и Зачистку", () => {
      const state = createInitialState("SECRET_SERVICE", "PVP", "DETECTIVE");
      render(
        <GameActionButtons
          gameState={state}
          targetActions={[
            { id: "capture_spy", label: "Разоблачение", onClick: vi.fn(), className: "" },
            { id: "interrogate_spy", label: "Опрос свидетелей", onClick: vi.fn(), className: "" },
          ]}
          cleanupAction={{ onClick: vi.fn() }}
          isCleanupAvailable={true}
          isDetectiveView={true}
          selectedCharacter={null}
          setIsHandSheetOpen={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /Разоблачение/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Опрос свидетелей/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Зачистка/i })).toBeDefined();
    });
  });
});
