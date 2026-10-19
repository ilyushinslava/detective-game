export type DuelCategory = "APPEARANCE" | "CLOTHING" | "ACCESSORIES";

export interface DuelCharacterAttributes {
  gender: "MALE" | "FEMALE";
  hair: "BALD" | "SHORT" | "LONG_CURLY" | "UPDO";
  hasBeard: boolean;
  outerwear: "COAT" | "SUIT" | "VEST" | "DRESS";
  neckwear: "TIE" | "BOWTIE" | "SCARF" | "NONE";
  hasHat: boolean;
  hatType: "FEDORA" | "CAP" | "BOWLER" | "TOP_HAT" | "BERET" | "KERCHIEF" | "TURBAN" | "NONE";
  hasGlasses: boolean;
  heldItem: "CARDS" | "CIGARETTE" | "MAGNIFIER" | "NONE";
}

export interface DuelCharacter {
  id: string;
  name: string;
  attributes: DuelCharacterAttributes;
}

export interface DuelQuestion {
  id: string;
  category: DuelCategory;
  text: string;
  tags: string[];
  check: (attr: DuelCharacterAttributes) => boolean;
}

export interface DuelHistoryEntry {
  id: string;
  askerRole: "DETECTIVE" | "KILLER";
  questionId: string;
  questionText: string;
  answer: boolean;
  timestamp: number;
}