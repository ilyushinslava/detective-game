// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGameLog } from "./useGameLog";

describe("useGameLog", () => {
  it("increments unreadLogCount when new logs arrive and log is closed", () => {
    const { result, rerender } = renderHook(
      ({ logData, isOpen }) =>
        useGameLog({
          log: logData,
          isLogOpen: isOpen,
        }),
      {
        initialProps: { logData: ["Message 1"], isOpen: false },
      }
    );

    expect(result.current.unreadLogCount).toBe(0);

    rerender({ logData: ["Message 1", "Message 2", "Message 3"], isOpen: false });
    expect(result.current.unreadLogCount).toBe(2);
  });

  it("does not increment unreadLogCount when log is already open", () => {
    const { result, rerender } = renderHook(
      ({ logData, isOpen }) =>
        useGameLog({
          log: logData,
          isLogOpen: isOpen,
        }),
      {
        initialProps: { logData: ["Message 1"], isOpen: true },
      }
    );

    rerender({ logData: ["Message 1", "Message 2"], isOpen: true });
    expect(result.current.unreadLogCount).toBe(0);
  });

  it("allows manual reset via setUnreadLogCount", () => {
    const { result, rerender } = renderHook(
      ({ logData, isOpen }) =>
        useGameLog({
          log: logData,
          isLogOpen: isOpen,
        }),
      {
        initialProps: { logData: ["Message 1"], isOpen: false },
      }
    );

    rerender({ logData: ["Message 1", "Message 2"], isOpen: false });
    expect(result.current.unreadLogCount).toBe(1);

    act(() => {
      result.current.setUnreadLogCount(0);
    });
    expect(result.current.unreadLogCount).toBe(0);
  });
});
