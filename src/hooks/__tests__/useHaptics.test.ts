// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHaptics } from "../useHaptics";
import * as hapticsUtil from "../../utils/haptics";

describe("useHaptics hook", () => {
  it("предоставляет мемоизированные методы тактильной отдачи и вызывает утилиты haptics", () => {
    const triggerSpy = vi.spyOn(hapticsUtil, "triggerHaptic").mockImplementation(() => {});

    const { result } = renderHook(() => useHaptics());

    result.current.impactLight();
    expect(triggerSpy).toHaveBeenCalledWith("light");

    result.current.impactMedium();
    expect(triggerSpy).toHaveBeenCalledWith("medium");

    result.current.impactHeavy();
    expect(triggerSpy).toHaveBeenCalledWith("heavy");

    result.current.success();
    expect(triggerSpy).toHaveBeenCalledWith("success");

    result.current.error();
    expect(triggerSpy).toHaveBeenCalledWith("error");

    result.current.turnWarning();
    expect(triggerSpy).toHaveBeenCalledWith("turn");

    result.current.trigger("light");
    expect(triggerSpy).toHaveBeenCalledWith("light");
  });
});
