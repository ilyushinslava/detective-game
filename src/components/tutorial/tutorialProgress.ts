import { safeLocalStorage } from "../../utils/storage";
import type { CanonicalTutorialModule } from "./tutorialTypes";

export const TUTORIAL_MODULES_LIST: {
  id: CanonicalTutorialModule;
  title: string;
  subtitle: string;
  stepsCount: number;
}[] = [
  {
    id: "MANIAC",
    title: "1. Почерк убийцы",
    subtitle: "Сетка 5×5, сдвиги рядов, зона поражения 3×3 и арест",
    stepsCount: 7,
  },
  {
    id: "THIEF",
    title: "2. Оцепление",
    subtitle: "Кража сокровищ, конспирация и выставление полицейских патрулей",
    stepsCount: 6,
  },
  {
    id: "SECRET_SERVICE",
    title: "3. Директива «Ноль»",
    subtitle: "Сканирующий радар 3×3, опрос свидетелей и разоблачение шпиона",
    stepsCount: 4,
  },
];

export const loadAndMigrateTutorialProgress = (): CanonicalTutorialModule[] => {
  try {
    // 1. Проверяем канонический ключ
    const canonicalRaw =
      safeLocalStorage.getItem("requiem_tutorial_completed_modules") ||
      safeLocalStorage.getItem("prime_suspect_completed_tutorial_modules");

    if (canonicalRaw) {
      const parsed = JSON.parse(canonicalRaw) as string[];
      const valid = parsed.filter(
        (m): m is CanonicalTutorialModule =>
          m === "MANIAC" || m === "THIEF" || m === "SECRET_SERVICE"
      );
      if (valid.length > 0) return valid;
    }

    // 2. Миграция со старых ключей (Legacy 7 модулей)
    const legacyRaw = safeLocalStorage.getItem("crime_city_completed_modules");
    if (!legacyRaw) return [];

    const legacyList = JSON.parse(legacyRaw) as string[];
    const migrated: CanonicalTutorialModule[] = [];

    // Старые модули 1..3 маппятся в MANIAC
    if (
      legacyList.includes("MANIAC_KILLER") ||
      legacyList.includes("MANIAC_DETECTIVE") ||
      legacyList.includes("BASICS")
    ) {
      migrated.push("MANIAC");
    }

    // Старые модули 4..5 маппятся в THIEF
    if (
      legacyList.includes("THIEF_ROBBER") ||
      legacyList.includes("THIEF_POLICE")
    ) {
      migrated.push("THIEF");
    }

    // Старый модуль 6 маппится в SECRET_SERVICE
    if (legacyList.includes("SECRET_SERVICE")) {
      migrated.push("SECRET_SERVICE");
    }

    // Если была получена старая награда, засчитываем все 3
    const isOldRewardClaimed =
      safeLocalStorage.getItem("crime_city_tutorial_reward_claimed") === "true" ||
      safeLocalStorage.getItem("prime_suspect_tutorial_reward_claimed") === "true";

    const finalList: CanonicalTutorialModule[] = isOldRewardClaimed
      ? ["MANIAC", "THIEF", "SECRET_SERVICE"]
      : migrated;

    // Сохраняем в канонический ключ
    safeLocalStorage.setItem(
      "requiem_tutorial_completed_modules",
      JSON.stringify(finalList)
    );
    safeLocalStorage.setItem(
      "prime_suspect_completed_tutorial_modules",
      JSON.stringify(finalList)
    );

    return finalList;
  } catch {
    return [];
  }
};

export const saveTutorialProgress = (completed: CanonicalTutorialModule[]) => {
  try {
    safeLocalStorage.setItem(
      "requiem_tutorial_completed_modules",
      JSON.stringify(completed)
    );
    safeLocalStorage.setItem(
      "prime_suspect_completed_tutorial_modules",
      JSON.stringify(completed)
    );
  } catch {}
};

export const isTutorialRewardClaimed = (): boolean => {
  try {
    return (
      safeLocalStorage.getItem("requiem_tutorial_reward_claimed") === "true" ||
      safeLocalStorage.getItem("prime_suspect_tutorial_reward_claimed") === "true" ||
      safeLocalStorage.getItem("crime_city_tutorial_reward_claimed") === "true"
    );
  } catch {
    return false;
  }
};

export const markTutorialRewardClaimed = () => {
  try {
    safeLocalStorage.setItem("requiem_tutorial_reward_claimed", "true");
    safeLocalStorage.setItem("prime_suspect_tutorial_reward_claimed", "true");
  } catch {}
};
