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
    // Маньяк Артур Блэк (c4) в [2][1] (индекс 11)
    swapInArray(chars, "c4", 11);
    // София Романова (c7) в [1][1] (индекс 6)
    swapInArray(chars, "c7", 6);
    // Мария Климова (c13) в [3][2] (индекс 17) - не задета первоначальным сдвигом колонки 2
    swapInArray(chars, "c13", 17);
    // Руслан Громов (c1) в [2][2] (индекс 12)
    swapInArray(chars, "c1", 12);
  } else if (module === "THIEF") {
    // Грабитель Артур Блэк (c4) в [2][2] (индекс 12)
    swapInArray(chars, "c4", 12);
    // Анна Мороз (c5) в [2][3] (индекс 13, сосед справа с ценностями)
    swapInArray(chars, "c5", 13);
    // София Романова (c7) в [1][2] (индекс 7)
    swapInArray(chars, "c7", 7);
    // Шеф Руслан Громов (c1) в [4][0] (индекс 20)
    swapInArray(chars, "c1", 20);
  } else if (module === "SECRET_SERVICE") {
    // Наш агент «Зенит» Руслан Громов (c1) в [2][2] (индекс 12)
    swapInArray(chars, "c1", 12);
    // Вражеский резидент Марк Воронов (c2) в [1][2] (индекс 7)
    swapInArray(chars, "c2", 7);
    // Связной София Романова (c7) в [0][2] (индекс 2)
    swapInArray(chars, "c7", 2);
  }

  const grid: Character[][] = [];
  for (let r = 0; r < 5; r++) {
    grid.push(chars.slice(r * 5, r * 5 + 5));
  }
  return grid;
};
