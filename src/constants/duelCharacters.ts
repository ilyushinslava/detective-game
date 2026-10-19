import type { DuelCharacter } from "../types/duel";

export const DUEL_CHARACTERS: DuelCharacter[] = [
  // 12 Женщин
  { id: "c3", name: "Елена Соколова", attributes: { gender: "FEMALE", hair: "LONG_CURLY", hasBeard: false, outerwear: "DRESS", neckwear: "NONE", hasHat: false, hatType: "NONE", hasGlasses: false, heldItem: "NONE" } },
  { id: "c5", name: "Анна Мороз", attributes: { gender: "FEMALE", hair: "UPDO", hasBeard: false, outerwear: "DRESS", neckwear: "NONE", hasHat: false, hatType: "NONE", hasGlasses: false, heldItem: "NONE" } },
  { id: "c7", name: "София Романова", attributes: { gender: "FEMALE", hair: "SHORT", hasBeard: false, outerwear: "COAT", neckwear: "SCARF", hasHat: true, hatType: "FEDORA", hasGlasses: false, heldItem: "NONE" } },
  { id: "c9", name: "Алиса Смирнова", attributes: { gender: "FEMALE", hair: "SHORT", hasBeard: false, outerwear: "COAT", neckwear: "NONE", hasHat: true, hatType: "BERET", hasGlasses: false, heldItem: "NONE" } },
  { id: "c11", name: "Виктория Ким", attributes: { gender: "FEMALE", hair: "SHORT", hasBeard: false, outerwear: "COAT", neckwear: "NONE", hasHat: true, hatType: "FEDORA", hasGlasses: false, heldItem: "NONE" } },
  { id: "c13", name: "Мария Климова", attributes: { gender: "FEMALE", hair: "LONG_CURLY", hasBeard: false, outerwear: "SUIT", neckwear: "BOWTIE", hasHat: false, hatType: "NONE", hasGlasses: true, heldItem: "NONE" } },
  { id: "c15", name: "Алина Ильина", attributes: { gender: "FEMALE", hair: "UPDO", hasBeard: false, outerwear: "DRESS", neckwear: "NONE", hasHat: false, hatType: "NONE", hasGlasses: false, heldItem: "MAGNIFIER" } },
  { id: "c17", name: "Дарья Ефремова", attributes: { gender: "FEMALE", hair: "SHORT", hasBeard: false, outerwear: "SUIT", neckwear: "TIE", hasHat: true, hatType: "CAP", hasGlasses: false, heldItem: "NONE" } },
  { id: "c19", name: "Ольга Зайцева", attributes: { gender: "FEMALE", hair: "UPDO", hasBeard: false, outerwear: "SUIT", neckwear: "NONE", hasHat: false, hatType: "NONE", hasGlasses: true, heldItem: "NONE" } },
  { id: "c21", name: "Наталья Петрова", attributes: { gender: "FEMALE", hair: "LONG_CURLY", hasBeard: false, outerwear: "DRESS", neckwear: "NONE", hasHat: true, hatType: "FEDORA", hasGlasses: false, heldItem: "NONE" } },
  { id: "c30", name: "Вера Север", attributes: { gender: "FEMALE", hair: "UPDO", hasBeard: false, outerwear: "DRESS", neckwear: "SCARF", hasHat: true, hatType: "TURBAN", hasGlasses: false, heldItem: "NONE" } },
  { id: "c46", name: "София Найт", attributes: { gender: "FEMALE", hair: "UPDO", hasBeard: false, outerwear: "COAT", neckwear: "NONE", hasHat: true, hatType: "KERCHIEF", hasGlasses: false, heldItem: "NONE" } },

  // 13 Мужчин
  { id: "c1", name: "Руслан Громов", attributes: { gender: "MALE", hair: "SHORT", hasBeard: false, outerwear: "COAT", neckwear: "TIE", hasHat: true, hatType: "FEDORA", hasGlasses: false, heldItem: "CIGARETTE" } },
  { id: "c2", name: "Марк Воронов", attributes: { gender: "MALE", hair: "SHORT", hasBeard: false, outerwear: "VEST", neckwear: "TIE", hasHat: false, hatType: "NONE", hasGlasses: false, heldItem: "CARDS" } },
  { id: "c6", name: "Дмитрий Волков", attributes: { gender: "MALE", hair: "SHORT", hasBeard: false, outerwear: "COAT", neckwear: "SCARF", hasHat: true, hatType: "CAP", hasGlasses: false, heldItem: "NONE" } },
  { id: "c8", name: "Максим Лебедев", attributes: { gender: "MALE", hair: "SHORT", hasBeard: false, outerwear: "COAT", neckwear: "TIE", hasHat: true, hatType: "FEDORA", hasGlasses: true, heldItem: "NONE" } },
  { id: "c10", name: "Роман Орлов", attributes: { gender: "MALE", hair: "BALD", hasBeard: false, outerwear: "SUIT", neckwear: "BOWTIE", hasHat: false, hatType: "NONE", hasGlasses: true, heldItem: "NONE" } },
  { id: "c18", name: "Павел Макаров", attributes: { gender: "MALE", hair: "SHORT", hasBeard: false, outerwear: "VEST", neckwear: "BOWTIE", hasHat: false, hatType: "NONE", hasGlasses: false, heldItem: "NONE" } },
  { id: "c22", name: "Андрей Семенов", attributes: { gender: "MALE", hair: "SHORT", hasBeard: false, outerwear: "SUIT", neckwear: "TIE", hasHat: true, hatType: "BOWLER", hasGlasses: false, heldItem: "NONE" } },
  { id: "c26", name: "Марат Омаров", attributes: { gender: "MALE", hair: "SHORT", hasBeard: false, outerwear: "SUIT", neckwear: "BOWTIE", hasHat: false, hatType: "NONE", hasGlasses: true, heldItem: "NONE" } },
  { id: "c29", name: "Леонид Буров", attributes: { gender: "MALE", hair: "SHORT", hasBeard: false, outerwear: "COAT", neckwear: "TIE", hasHat: true, hatType: "CAP", hasGlasses: false, heldItem: "NONE" } },
  { id: "c34", name: "Лев Брандт", attributes: { gender: "MALE", hair: "SHORT", hasBeard: true, outerwear: "COAT", neckwear: "NONE", hasHat: false, hatType: "NONE", hasGlasses: false, heldItem: "NONE" } },
  { id: "c40", name: "Тимофей Брагин", attributes: { gender: "MALE", hair: "SHORT", hasBeard: false, outerwear: "COAT", neckwear: "NONE", hasHat: true, hatType: "FEDORA", hasGlasses: false, heldItem: "NONE" } },
  { id: "c45", name: "Виктор Градов", attributes: { gender: "MALE", hair: "LONG_CURLY", hasBeard: false, outerwear: "COAT", neckwear: "SCARF", hasHat: true, hatType: "TOP_HAT", hasGlasses: false, heldItem: "NONE" } },
  { id: "c50", name: "Георгий Кущин", attributes: { gender: "MALE", hair: "BALD", hasBeard: true, outerwear: "SUIT", neckwear: "NONE", hasHat: false, hatType: "NONE", hasGlasses: true, heldItem: "NONE" } },
];