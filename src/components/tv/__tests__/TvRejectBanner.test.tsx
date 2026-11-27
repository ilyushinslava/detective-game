// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { TvBoardView } from "../TvBoardView";
import { createInitialState } from "../../../utils/gameLogic";
import { partyService } from "../../../utils/partyPeer";
import { soundManager } from "../../../utils/audio";

// Лёгкий мок framer-motion: AnimatePresence не держит элемент до конца
// exit-анимации, поэтому авто-скрытие плашки проверяется детерминированно.
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const motionOnlyProps = new Set([
    "initial",
    "animate",
    "exit",
    "transition",
    "variants",
    "whileHover",
    "whileTap",
    "whileFocus",
    "whileDrag",
    "whileInView",
    "drag",
    "dragConstraints",
    "dragElastic",
    "layout",
    "layoutId",
    "onAnimationComplete",
    "onAnimationStart",
    "viewport",
  ]);
  const cache = new Map<string, any>();
  const createMotionComponent = (tag: string) =>
    React.forwardRef((props: any, ref: any) => {
      const clean: any = {};
      for (const key of Object.keys(props)) {
        if (!motionOnlyProps.has(key)) clean[key] = props[key];
      }
      return React.createElement(tag, { ...clean, ref }, props.children);
    });
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) cache.set(tag, createMotionComponent(tag));
        return cache.get(tag);
      },
    }
  );
  const AnimatePresence = ({ children }: any) =>
    React.createElement(React.Fragment, null, children);
  return { motion, AnimatePresence };
});

function renderTv() {
  const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
  state.currentTurn = "KILLER";
  return render(<TvBoardView gameState={state} />);
}

/** Отправляет событие через локальную шину partyService (сеть не нужна). */
function emitAction(action: any) {
  act(() => {
    partyService.onAction?.(action);
  });
}

describe("TvBoardView: плашка причины отказа (10-foot UI)", () => {
  beforeEach(() => {
    partyService.clearAllListeners();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    partyService.clearAllListeners();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("1) ACTION_REJECTED TARGET_NOT_IN_RADIUS показывает полный текст причины без truncate", () => {
    renderTv();

    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });

    const banner = screen.getByTestId("tv-reject-banner");
    expect(banner).toBeDefined();
    expect(screen.getByText(/ДЕЙСТВИЕ ОТКЛОНЕНО/i)).toBeDefined();

    const reason = screen.getByTestId("tv-reject-reason");
    expect(reason.textContent).toContain("Цель вне радиуса 3×3");
    expect(reason.className).not.toContain("truncate");
    expect(reason.className).not.toContain("line-clamp");
    expect(reason.className).not.toContain("overflow-hidden");
  });

  it("2) ACTION_REJECTED ACTION_NOT_APPLIED показывает соответствующий текст", () => {
    renderTv();

    emitAction({ type: "ACTION_REJECTED", reason: "ACTION_NOT_APPLIED" });

    expect(screen.getByTestId("tv-reject-banner")).toBeDefined();
    expect(screen.getByTestId("tv-reject-reason").textContent).toContain(
      "Действие не было применено"
    );
  });

  it("3) авто-скрытие через 5500 мс", () => {
    vi.useFakeTimers();
    renderTv();

    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });
    expect(screen.queryByTestId("tv-reject-banner")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.queryByTestId("tv-reject-banner")).toBeNull();
  });

  it("4) STATE_UPDATE после отказа не скрывает плашку", () => {
    renderTv();

    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });
    expect(screen.queryByTestId("tv-reject-banner")).not.toBeNull();

    emitAction({ type: "STATE_UPDATE", state: {}, gameState: {} });
    emitAction({ type: "SYNC_STATE", state: {}, gameState: {} });

    expect(screen.queryByTestId("tv-reject-banner")).not.toBeNull();
  });

  it("5) дедупликация пары SYNC_ERROR + ACTION_REJECTED: одна плашка и один звук deny", () => {
    const playSpy = vi.spyOn(soundManager, "play").mockImplementation(() => {});
    renderTv();

    emitAction({
      type: "SYNC_ERROR",
      reason: "TARGET_NOT_IN_RADIUS",
      actionType: "KILL_CHARACTER",
    });
    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });

    expect(screen.getAllByTestId("tv-reject-banner")).toHaveLength(1);
    const denyCalls = playSpy.mock.calls.filter((call) => call[0] === "deny");
    expect(denyCalls).toHaveLength(1);
  });

  it("6) SYNC_ERROR с неизвестной причиной не создаёт плашку отказа", () => {
    renderTv();

    emitAction({ type: "SYNC_ERROR", reason: "SOME_UNKNOWN_DESYNC_CODE" });

    expect(screen.queryByTestId("tv-reject-banner")).toBeNull();
  });

  it("7) unmount очищает таймер без предупреждений об обновлении состояния", () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = renderTv();
    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });

    unmount();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    const stateWarnings = errorSpy.mock.calls.filter((call) =>
      String(call[0]).includes("unmounted component")
    );
    expect(stateWarnings).toHaveLength(0);
  });
});
