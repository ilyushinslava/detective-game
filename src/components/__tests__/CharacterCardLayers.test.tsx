// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CharacterCard, areCharacterCardPropsEqual } from "../CharacterCard";
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

  it("1. Если isSelected=true и neighborHighlightColor='border-red-500', в className присутствуют И border-red-500, И ring-white", () => {
    const { container } = render(
      <CharacterCard
        mode="SKHVATKA"
        character={mockCharacter}
        isSelected={true}
        neighborHighlightColor="border-red-500"
        onClick={vi.fn()}
      />
    );

    const cardRoot = container.firstElementChild as HTMLElement;
    expect(cardRoot).toBeDefined();
    expect(cardRoot.className).toContain("border-red-500");
    expect(cardRoot.className).toContain("ring-white");
    expect(cardRoot.className).not.toContain("border-white");
  });

  it("2. Если isSelected=true, но соседа нет (neighborHighlightColor=null), карточка содержит border-white", () => {
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
    expect(cardRoot.className).toContain("border-white");
    expect(cardRoot.className).toContain("ring-white");
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

  it("4. При isError=true карточка окрашивается в нео-нуарный красный бордер и ring-rose-500", () => {
    const { container } = render(
      <CharacterCard
        mode="SKHVATKA"
        character={mockCharacter}
        isSelected={false}
        isError={true}
        onClick={vi.fn()}
      />
    );

    const cardRoot = container.firstElementChild as HTMLElement;
    expect(cardRoot.className).toContain("border-rose-500");
    expect(cardRoot.className).toContain("ring-rose-500/70");
  });

  it("5. areCharacterCardPropsEqual возвращает false при изменении флага isError", () => {
    const baseProps = {
      mode: "SKHVATKA" as const,
      character: mockCharacter,
      isSelected: false,
      onClick: vi.fn(),
      isError: false,
    };

    expect(areCharacterCardPropsEqual(baseProps, { ...baseProps, isError: true })).toBe(false);
    expect(areCharacterCardPropsEqual(baseProps, { ...baseProps, isError: false })).toBe(true);
  });
});