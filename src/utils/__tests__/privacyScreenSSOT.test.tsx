// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { gameReducer } from "../gameReducer";
import { createInitialState, getAdjacentCharacters } from "../gameLogic";
import { BlindfoldCurtain } from "../../components/ui/BlindfoldCurtain";

describe("Privacy Screen (Шторка тайны личности) SSOT & BlindfoldCurtain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("gameReducer SSOT логика", () => {
    it("активирует isPrivacyScreenActive при END_TURN в локальном PVP режиме", () => {
      const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "KILLER");
      expect(state.isPrivacyScreenActive).toBeFalsy();

      const next = gameReducer(state, { type: "END_TURN" });
      expect(next.isPrivacyScreenActive).toBe(true);
      expect(next.isHotseatCoverOpen).toBe(true);
      expect(next.currentTurn).toBe("DETECTIVE");
    });

    it("ЖЕСТКО БЛОКИРУЕТ шторку в PVE режиме (против ИИ): isPrivacyScreenActive всегда false", () => {
      const state = createInitialState("MANIAC_VS_OPERATIVE", "AI", "KILLER");
      expect(state.isPrivacyScreenActive).toBeFalsy();

      const next = gameReducer(state, { type: "END_TURN" });
      expect(next.isPrivacyScreenActive).toBe(false);
      expect(next.isHotseatCoverOpen).toBe(false);
      expect(next.currentTurn).toBe("DETECTIVE");
    });

    it("деактивирует шторку при экшене CONFIRM_TURN_READY", () => {
      const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "KILLER");
      const turnedState = gameReducer(state, { type: "END_TURN" });
      expect(turnedState.isPrivacyScreenActive).toBe(true);

      const readyState = gameReducer(turnedState, { type: "CONFIRM_TURN_READY" });
      expect(readyState.isPrivacyScreenActive).toBe(false);
      expect(readyState.isHotseatCoverOpen).toBe(false);
    });

    it("активирует шторку при смене роли в PVP (ликвидация соседнего персонажа / KILL_CHARACTER)", () => {
      const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "KILLER");
      const adjacent = getAdjacentCharacters(state.board, state.killerSecretId!);
      expect(adjacent.length).toBeGreaterThan(0);
      const victim = adjacent[0];

      const preparedState = {
        ...state,
        victimList: [victim.id, "dummy_remaining_target"],
      };

      const next = gameReducer(preparedState, {
        type: "KILL_CHARACTER",
        payload: { targetId: victim.id },
      });

      expect(next.isPrivacyScreenActive).toBe(true);
      expect(next.killCount).toBe(1);
      expect(next.currentTurn).toBe("DETECTIVE");
    });

    it("активирует шторку при краже вора (ROB_NEIGHBOR) в режиме Оцепление (THIEF_HUNT)", () => {
      const state = createInitialState("THIEF_HUNT", "PVP", "KILLER");
      const adjacent = getAdjacentCharacters(state.board, state.killerSecretId!);
      expect(adjacent.length).toBeGreaterThan(0);
      const target = adjacent[0];

      const next = gameReducer(state, {
        type: "ROB_NEIGHBOR",
        payload: { targetId: target.id },
      });

      expect(next.isPrivacyScreenActive).toBe(true);
      expect(next.trophiesKiller).toBe(1);
      expect(next.currentTurn).toBe("DETECTIVE");
    });

    it("активирует шторку при вызове патрульного (SWEAR_IN_OFFICER) в режиме Оцепление (THIEF_HUNT)", () => {
      const baseState = createInitialState("THIEF_HUNT", "PVP", "DETECTIVE");
      const state = { ...baseState, currentTurn: "DETECTIVE" as const };
      const officerToReplace = state.uniformedOfficers![0];

      const next = gameReducer(state, {
        type: "SWEAR_IN_OFFICER",
        payload: { targetId: officerToReplace },
      });

      expect(next.isPrivacyScreenActive).toBe(true);
      expect(next.currentTurn).toBe("KILLER");
    });

    it("активирует шторку при опросе свидетелей / проверке алиби (EXONERATE) в режиме Почерк убийцы", () => {
      const baseState = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
      const state = { ...baseState, currentTurn: "DETECTIVE" as const };
      const cardToExonerate = state.detectiveHand[0];

      const next = gameReducer(state, {
        type: "EXONERATE",
        payload: { targetId: cardToExonerate },
      });

      expect(next.isPrivacyScreenActive).toBe(true);
      expect(next.currentTurn).toBe("KILLER");
    });

    it("активирует шторку при разоблачении шпиона (CAPTURE_SPY) в Директиве «Ноль»", () => {
      const state = createInitialState("SECRET_SERVICE", "PVP", "KILLER", 3);
      expect(state.activeSpyIndex).toBe(0);

      const next = gameReducer(state, {
        type: "CAPTURE_SPY",
        payload: { targetId: state.board[0][0].id },
      });

      expect(next.isPrivacyScreenActive).toBe(true);
      expect(next.activeSpyIndex).toBe(1);
    });

    it("не активирует шторку при победе одного из игроков", () => {
      const state = createInitialState("MANIAC_VS_OPERATIVE", "PVP", "DETECTIVE");
      // Задаем убийцу рядом со следователем, чтобы арест был легитимным
      const adjacent = getAdjacentCharacters(state.board, state.detectiveSecretId!);
      expect(adjacent.length).toBeGreaterThan(0);
      const killerTargetId = adjacent[0].id;

      const preparedState = {
        ...state,
        killerSecretId: killerTargetId,
      };

      const next = gameReducer(preparedState, {
        type: "ACCUSE",
        payload: { targetId: killerTargetId },
      });

      expect(next.winner).toBe("DETECTIVE");
      expect(next.isPrivacyScreenActive).toBe(false);
    });
  });

  describe("UI Компонент BlindfoldCurtain", () => {
    it("демонстрирует стиль Neo-Noir и рендерит кнопку подтверждения", () => {
      const onDismiss = vi.fn();
      render(
        <BlindfoldCurtain
          isOpen={true}
          nextRole="DETECTIVE"
          nextPlayerName="Оперативник"
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByTestId("blindfold-curtain")).toBeDefined();
      expect(screen.getByText(/ПЕРЕДАЧА ХОДА:/i)).toBeDefined();
      expect(screen.getByText("Оперативник")).toBeDefined();

      const btn = screen.getByRole("button", { name: "Я взял телефон" });
      expect(btn).toBeDefined();
      fireEvent.click(btn);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("поддерживает горячую клавишу Space / Enter для подтверждения готовности", () => {
      const onDismiss = vi.fn();
      render(
        <BlindfoldCurtain
          isOpen={true}
          nextRole="KILLER"
          nextPlayerName="Маньяк"
          onDismiss={onDismiss}
        />
      );

      fireEvent.keyDown(window, { key: "Enter", code: "Enter" });
      expect(onDismiss).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(window, { key: " ", code: "Space" });
      expect(onDismiss).toHaveBeenCalledTimes(2);
    });
  });
});
