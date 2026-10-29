// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CharacterCard } from "../CharacterCard";
import type { Character } from "../../types/game";

const mockCharacter: Character = {
  id: "c01",
  name: "Виктор Громов",
  gender: "M",
  occupation: "Инженер",
  isAlive: true,
  isExonerated: false,
  isRobbed: false,
};

describe("CharacterCard: Визуальные слои границы и элементов метаданных", () => {
  afterEach(() => {
    cleanup();
  });

  it("1. Если isSelected=true и neighborHighlightColor='border-red-500', в className присутствуют И border-red-500, И outline-white", () => {
    const { container } = render(
      <CharacterCard
        mode="SKHVATKA"
        character={mockCharacter}
        isSelected={true}
        neighborHighlightColor="border-2 border-red-500 bg-red-950/25 shadow-[0_0_16px_rgba(239,68,68,0.8)]"
        onClick={vi.fn()}
      />
    );

    const cardRoot = container.firstElementChild as HTMLElement;
    expect(cardRoot).toBeDefined();
    expect(cardRoot.className).toContain("border-red-500");
    expect(cardRoot.className).toContain("outline-white");
  });

  it("2. Если isSelected=true, но соседа нет (neighborHighlightColor=null), карточка содержит outline-white", () => {
    const { container } = render(
      <CharacterCard
        mode="SKHVATKA"
        character={mockCharacter}
        isSelected={true}
        neighborHighlightColor={null}
        onClick={vi.fn()}
      />
    );

    const cardRoot = container.firstElementChild as HTMLElement;
    expect(cardRoot).toBeDefined();
    expect(cardRoot.className).toContain("outline-white");
    expect(cardRoot.className).toContain("scale-[0.96]");
  });

  it("3. Номер карточки #id и бейдж 'ВЫ' не пропадают при наличии иконок статуса", () => {
    const robbedChar: Character = {
      ...mockCharacter,
      isRobbed: true,
    };

    const { getByText, getByTitle } = render(
      <CharacterCard
        mode="SKHVATKA"
        character={robbedChar}
        isSelected={false}
        isMyCharacter={true}
        isTargetVictim={true}
        isUniformedOfficer={true}
        isRadarCenter={true}
        isPVP={false}
        myRoleColor="blue"
        onClick={vi.fn()}
      />
    );

    expect(getByText("#01")).toBeDefined();
    expect(getByText("ВЫ")).toBeDefined();
    expect(getByTitle("Ограблен")).toBeDefined();
  });
});
