import type { Character } from "../../types/game";

export type CanonicalTutorialModule = "MANIAC" | "THIEF" | "SECRET_SERVICE";
export type TutorialModule = "MENU" | CanonicalTutorialModule;

export type TutorialActionType =
  | "SHIFT"
  | "CARD_ACTION"
  | "ACTION_BUTTON"
  | "SELECT_CARD";

export interface TutorialShiftTarget {
  type: "ROW" | "COL";
  index: number;
  direction: "FORWARD" | "BACKWARD";
  arrowId: string; // "col-down-2", "row-left-2", etc.
}

export type TutorialButtonActionKey =
  | "KILL"
  | "DISGUISE"
  | "ARREST"
  | "CLEANUP"
  | "ROB"
  | "PATROL"
  | "PATROL_CALL"
  | "EXONERATE"
  | "INTERROGATE"
  | "EXPOSE_SPY"
  | "FINISH";

export interface TutorialStepConfig {
  step: number;
  totalSteps: number;
  title: string;
  instruction: string;
  targetPosition?: "top" | "bottom";

  // Валидация и целевое действие
  actionType: TutorialActionType;
  targetShift?: TutorialShiftTarget;
  allowedCardIds?: string[];
  buttonActionKey?: TutorialButtonActionKey;
  buttonLabel?: string;
  buttonVariant?: "primary" | "danger" | "secondary";
  hintMessage?: string;

  // Подсветка поля
  highlightedArrowId?: string | null;
  targetCardId?: string | null;
  myCharacterId?: string | null;
  highlightNeighborCenterId?: string | null;
  neighborRole?: "red" | "blue";
  alibiCardIds?: string[];
  radarTargetId?: string | null;
}
