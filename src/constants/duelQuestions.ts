import type { DuelQuestion } from "../types/duel";

export const DUEL_QUESTIONS: DuelQuestion[] = [
  // ВНЕШНОСТЬ
  { id: "q_gender_female", category: "APPEARANCE", text: "Это женщина?", tags: ["пол", "женщина", "девушка"], check: (a) => a.gender === "FEMALE" },
  { id: "q_gender_male", category: "APPEARANCE", text: "Это мужчина?", tags: ["пол", "мужчина"], check: (a) => a.gender === "MALE" },
  { id: "q_beard", category: "APPEARANCE", text: "Есть ли борода или усы?", tags: ["борода", "усы", "растительность"], check: (a) => a.hasBeard },
  { id: "q_bald", category: "APPEARANCE", text: "Персонаж лысый?", tags: ["лысый", "волосы"], check: (a) => a.hair === "BALD" },
  { id: "q_hair_long", category: "APPEARANCE", text: "У персонажа длинные или кудрявые волосы?", tags: ["кудри", "волосы", "длинные"], check: (a) => a.hair === "LONG_CURLY" },
  { id: "q_hair_updo", category: "APPEARANCE", text: "Волосы убраны вверх или в пучок?", tags: ["пучок", "прическа", "волосы"], check: (a) => a.hair === "UPDO" },

  // ОДЕЖДА
  { id: "q_coat", category: "CLOTHING", text: "Персонаж одет в пальто или плащ?", tags: ["пальто", "плащ", "верхняя одежда"], check: (a) => a.outerwear === "COAT" },
  { id: "q_suit", category: "CLOTHING", text: "Персонаж в строгом пиджаке или костюме?", tags: ["костюм", "пиджак"], check: (a) => a.outerwear === "SUIT" },
  { id: "q_vest", category: "CLOTHING", text: "На персонаже надета жилетка?", tags: ["жилетка", "жилет"], check: (a) => a.outerwear === "VEST" },
  { id: "q_tie", category: "CLOTHING", text: "Есть ли классический галстук?", tags: ["галстук"], check: (a) => a.neckwear === "TIE" },
  { id: "q_bowtie", category: "CLOTHING", text: "На персонаже галстук-бабочка?", tags: ["бабочка"], check: (a) => a.neckwear === "BOWTIE" },
  { id: "q_scarf", category: "CLOTHING", text: "Повязан ли шарф на шее?", tags: ["шарф"], check: (a) => a.neckwear === "SCARF" },

  // АКСЕССУАРЫ
  { id: "q_hat_any", category: "ACCESSORIES", text: "Есть ли головной убор?", tags: ["шляпа", "кепка", "убор"], check: (a) => a.hasHat },
  { id: "q_hat_cap", category: "ACCESSORIES", text: "На персонаже кепка или фуражка?", tags: ["кепка", "фуражка"], check: (a) => a.hatType === "CAP" },
  { id: "q_glasses", category: "ACCESSORIES", text: "Персонаж носит очки или монокль?", tags: ["очки", "монокль", "линзы"], check: (a) => a.hasGlasses },
  { id: "q_held_item", category: "ACCESSORIES", text: "Держит ли предмет в руках (карты, сигарету, лупу)?", tags: ["предмет", "карты", "лупа", "сигарета"], check: (a) => a.heldItem !== "NONE" },
];