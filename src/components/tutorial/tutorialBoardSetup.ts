import { ALL_CHARACTERS } from "../../constants/characters";
import type { Character } from "../../types/game";
import type { TutorialModule, CanonicalTutorialModule } from "./tutorialTypes";

export { type TutorialModule, type CanonicalTutorialModule };

function swapInArray(arr: Character[], id: string, targetIdx: number) {
  const curIdx = arr.findIndex((c) => c.id === id);
  if (curIdx !== -1 && curIdx !== targetIdx) {
    const temp = arr[targetIdx];
    arr[targetIdx] = arr[curIdx];
    arr[curIdx] = temp;
  }
}

export const getInitialBoard = (module: TutorialModule): Character[][] => {
  const chars = ALL_CHARACTERS.slice(0, 25).map((c) => ({
    ...c,
    isAlive: true,
    isExonerated: false,
    isRobbed: false,
  }));

  if (module === "MANIAC") {
    // Жертва Елена Соколова (c3) в [0][2] (индекс 2)
    swapInArray(chars, "c3", 2);
    // Убийца Артём Воронов (c4) в [2][1] (индекс 11)
    swapInArray(chars, "c4", 11);
    // София Романова (c7) в [1][1] (индекс 6)
    swapInArray(chars, "c7", 6);
  } else if (module === "THIEF") {
    // Вор Артём Воронов (c4) в [2][2] (индекс 12)
    swapInArray(chars, "c4", 12);
    // Анна Мороз (c5) в [2][3] (индекс 13, сосед справа с ценностями)
    swapInArray(chars, "c5", 13);
    // София Романова (c7) в [1][2] (индекс 7)
    swapInArray(chars, "c7", 7);
  } else if (module === "SECRET_SERVICE") {
    // Наш агент Руслан Громов (c1) в [2][2] (индекс 12)
    swapInArray(chars, "c1", 12);
    // Информатор София Романова (c7) в [1][2] (индекс 7)
    swapInArray(chars, "c7", 7);
    // Вражеский шпион Марк Воронов (c2) в [0][2] (индекс 2, в радиусе 3x3 информатора)
    swapInArray(chars, "c2", 2);
  }

  const grid: Character[][] = [];
  for (let r = 0; r < 5; r++) {
    grid.push(chars.slice(r * 5, r * 5 + 5));
  }
  return grid;
};
