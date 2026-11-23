import { ALL_CHARACTERS } from "../../constants/characters";
import type { Character } from "../../types/game";

export type TutorialModule =
  | "MENU"
  | "BASICS"
  | "MANIAC_KILLER"
  | "MANIAC_DETECTIVE"
  | "THIEF_ROBBER"
  | "THIEF_POLICE"
  | "SECRET_SERVICE"
  | "LINE_UP";

export const getInitialBoard = (module: TutorialModule): Character[][] => {
  const chars = ALL_CHARACTERS.slice(0, 25).map((c) => ({
    ...c,
    isAlive: true,
    isExonerated: false,
    isRobbed: false,
  }));

  if (module === "LINE_UP") {
    // Гарантируем, что Руслан Громов (c1) находится в центре [2][2] (индекс 12)
    const c1Index = chars.findIndex((c) => c.id === "c1");
    if (c1Index !== -1 && c1Index !== 12) {
      const temp = chars[12];
      chars[12] = chars[c1Index];
      chars[c1Index] = temp;
    }
  } else if (module === "MANIAC_KILLER") {
    // Елена Соколова (c3) ставится в [0][2] (индекс 2), а Убийца (c4) в [2][1] (индекс 11).
    // До сдвига они не соседствуют. При сдвиге колонки 2 вниз Елена переходит в [1][2] и входит в зону 3×3 Убийцы!
    const elenaIndex = chars.findIndex((c) => c.id === "c3");
    if (elenaIndex !== -1 && elenaIndex !== 2) {
      const temp = chars[2];
      chars[2] = chars[elenaIndex];
      chars[elenaIndex] = temp;
    }
    const killerIndex = chars.findIndex((c) => c.id === "c4");
    if (killerIndex !== -1 && killerIndex !== 11) {
      const temp = chars[11];
      chars[11] = chars[killerIndex];
      chars[killerIndex] = temp;
    }
  } else if (module === "MANIAC_DETECTIVE") {
    // В [3][3] жертва, соседи со щитом (алиби), подозреваемый без щита в [1][1] (индекс 6)
    chars[7].isExonerated = true;
    chars[11].isExonerated = true;
    chars[18].isAlive = false;
  } else if (module === "THIEF_POLICE") {
    chars[7].isRobbed = true;
  }

  const grid: Character[][] = [];
  for (let r = 0; r < 5; r++) {
    grid.push(chars.slice(r * 5, r * 5 + 5));
  }
  return grid;
};
