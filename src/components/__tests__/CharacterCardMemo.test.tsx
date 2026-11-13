// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { CharacterCard, areCharacterCardPropsEqual, type CharacterCardProps } from "../CharacterCard";
import { type Character } from "../../types/game";

describe("CharacterCard: React.memo и areCharacterCardPropsEqual (Профилирование перерисовок)", () => {
  const baseCharacter: Character = {
    id: "c1",
    name: "Джон Доу",
    isAlive: true,
    isExonerated: false,
    isRobbed: false,
  };

  const createProps = (overrides?: Partial<CharacterCardProps>): CharacterCardProps => ({
    mode: "MANIAC_VS_OPERATIVE",
    character: { ...baseCharacter },
    isSelected: false,
    neighborRole: null,
    neighborHighlightColor: null,
    isUniformedOfficer: false,
    isTargetVictim: false,
    radarRingColor: null,
    isRadarCenter: false,
    isError: false,
    isMyCharacter: false,
    isOverlapZone: false,
    isPVP: false,
    myRoleColor: "blue",
    isLastRobbed: false,
    onClick: vi.fn(),
    ...overrides,
  });

  describe("areCharacterCardPropsEqual unit checks", () => {
    it("возвращает true при эквивалентных пропсах, даже если onClick ссылочно отличается", () => {
      const props1 = createProps({ onClick: () => {} });
      const props2 = createProps({ onClick: () => {} });

      expect(areCharacterCardPropsEqual(props1, props2)).toBe(true);
    });

    it("возвращает false при смене статуса isAlive", () => {
      const props1 = createProps();
      const props2 = createProps({
        character: { ...baseCharacter, isAlive: false },
      });

      expect(areCharacterCardPropsEqual(props1, props2)).toBe(false);
    });

    it("возвращает false при смене статуса алиби isExonerated", () => {
      const props1 = createProps();
      const props2 = createProps({
        character: { ...baseCharacter, isExonerated: true },
      });

      expect(areCharacterCardPropsEqual(props1, props2)).toBe(false);
    });

    it("возвращает false при изменении выделения isSelected", () => {
      const props1 = createProps({ isSelected: false });
      const props2 = createProps({ isSelected: true });

      expect(areCharacterCardPropsEqual(props1, props2)).toBe(false);
    });

    it("возвращает false при статусе прицела isTargetVictim или офицера isUniformedOfficer", () => {
      const props1 = createProps({ isTargetVictim: false });
      const props2 = createProps({ isTargetVictim: true });
      expect(areCharacterCardPropsEqual(props1, props2)).toBe(false);

      const props3 = createProps({ isUniformedOfficer: false });
      const props4 = createProps({ isUniformedOfficer: true });
      expect(areCharacterCardPropsEqual(props3, props4)).toBe(false);
    });

    it("возвращает false при смене подсветки радара radarRingColor или isRadarCenter", () => {
      const props1 = createProps({ radarRingColor: null });
      const props2 = createProps({ radarRingColor: "red" });
      expect(areCharacterCardPropsEqual(props1, props2)).toBe(false);
    });

    it("возвращает false при разоблачении шпиона unmaskedSpyIndex", () => {
      const props1 = createProps();
      const props2 = createProps({
        character: { ...baseCharacter, unmaskedSpyIndex: 1 },
      });
      expect(areCharacterCardPropsEqual(props1, props2)).toBe(false);
    });
  });

  describe("Рендер и изоляция React.memo", () => {
    it("не перерисовывает карточку при пересоздании функций родителя без изменения состояния карточки", () => {
      let renderCount = 0;
      const MonitoredCard = React.memo((props: CharacterCardProps) => {
        renderCount++;
        return <CharacterCard {...props} />;
      }, areCharacterCardPropsEqual);

      const { rerender } = render(<MonitoredCard {...createProps()} />);
      expect(renderCount).toBe(1);

      // Повторный рендер с новой анонимной функцией onClick и тем же объектом персонажа
      rerender(<MonitoredCard {...createProps({ onClick: () => console.log("click") })} />);
      expect(renderCount).toBe(1); // Рендер предотвращен React.memo

      // Изменение локального статуса персонажа (убийство) -> должен перерисоваться
      rerender(<MonitoredCard {...createProps({ character: { ...baseCharacter, isAlive: false } })} />);
      expect(renderCount).toBe(2);
    });
  });
});
