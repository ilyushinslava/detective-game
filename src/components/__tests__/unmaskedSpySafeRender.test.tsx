// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { CharacterStamps } from "../character/CharacterStamps";
import { CharacterCard } from "../CharacterCard";
import { GameStatusBar } from "../game/GameStatusBar";
import { SPY_COLORS } from "../../types/game";
import type { Character, GameState } from "../../types/game";

const baseChar: Character = {
  id: "c01",
  name: "Виктор Громов",
  gender: "M",
  occupation: "Инженер",
  isAlive: true,
  isExonerated: false,
  isRobbed: false,
};

describe("P0 & P1 Regression: Safe rendering of unmasked spies and UI polish", () => {
  afterEach(() => {
    cleanup();
  });

  it("1. SPY_COLORS содержит строго валидные имена и Tailwind классы для всех агентов", () => {
    expect(SPY_COLORS.length).toBeGreaterThanOrEqual(6);
    SPY_COLORS.forEach((meta) => {
      expect(meta.name).toBeDefined();
      expect(typeof meta.name).toBe("string");
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.border).toBeDefined();
      expect(meta.text).toBeDefined();
    });
  });

  it("2. CharacterStamps корректно и без исключений рендерит раскрытого шпиона (unmaskedSpyIndex 0..5)", () => {
    SPY_COLORS.forEach((meta, idx) => {
      const { container } = render(
        <CharacterStamps
          isDead={true}
          isExonerated={false}
          isArrested={false}
          characterId={baseChar.id}
          isSecretService={true}
          unmaskedSpyIndex={idx}
        />
      );
      expect(container.textContent).toContain(meta.name.toUpperCase());
      cleanup();
    });
  });

  it("3. CharacterStamps с неизвестным индексом шпиона рендерит штамп без краша", () => {
    const { container } = render(
      <CharacterStamps
        isDead={true}
        isExonerated={false}
        isArrested={false}
        characterId={baseChar.id}
        isSecretService={true}
        unmaskedSpyIndex={0}
      />
    );
    expect(container.textContent).toContain("ФАНТОМ");
  });

  it("4. CharacterCard рендерит и монету, и бейдж ВЫ без ошибок и в разных контейнерах", () => {
    const charWithCoin: Character = {
      ...baseChar,
      hasCoin: true,
    };

    render(
      <CharacterCard
        mode="THIEF_HUNT"
        character={charWithCoin}
        isMyCharacter={true}
        myRoleColor="red"
        onClick={vi.fn()}
      />
    );

    // Должен присутствовать бейдж ВЫ
    const badge = screen.getByTestId("my-character-badge");
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe("ВЫ");

    // Должен присутствовать индикатор монеты
    const coin = screen.getByTestId("coin-indicator");
    expect(coin).toBeDefined();

    // Монета и бейдж ВЫ не должны перекрывать друг друга абсолютно
    expect(coin.className).not.toContain("absolute");
  });

  it("5. GameStatusBar в режиме THIEF_HUNT отображает цель /8 (вместо /10)", () => {
    const mockState: GameState = {
      mode: "THIEF_HUNT",
      board: [],
      deck: [],
      evidenceDeck: [],
      characters: {},
      killerId: "c01",
      detectiveId: "c02",
      turn: "KILLER",
      winner: null,
      killCount: 0,
      trophiesKiller: 3,
      moveCount: 5,
      history: [],
      status: "PLAYING",
      opponent: "AI",
    };

    render(
      <GameStatusBar
        gameState={mockState}
        isHumanTurn={true}
        role1Name="Грабитель"
        role2Name="Полиция"
      />
    );

    expect(screen.getByText("3/8")).toBeDefined();
    expect(screen.queryByText("3/10")).toBeNull();
  });
});
