export type ShiftDirection = "up" | "down" | "left" | "right";

export interface ShiftIndicatorState {
  type: "col" | "row";
  index: number;
  direction: ShiftDirection;
}

export function getShiftIndicator(
  type: "ROW" | "COL",
  index: number,
  direction: "FORWARD" | "BACKWARD"
): ShiftIndicatorState {
  if (type === "COL") {
    return {
      type: "col",
      index,
      direction: direction === "BACKWARD" ? "up" : "down",
    };
  }
  return {
    type: "row",
    index,
    direction: direction === "FORWARD" ? "right" : "left",
  };
}
