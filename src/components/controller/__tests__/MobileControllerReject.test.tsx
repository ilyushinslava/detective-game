// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { MobileControllerView } from "../MobileControllerView";
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

function createControllerState() {
  const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
  state.currentTurn = "KILLER";
  return state;
}

function renderController(state = createControllerState()) {
  return render(
    <MobileControllerView
      gameState={state}
      playerRole="KILLER"
      onDispatchAction={vi.fn()}
    />
  );
}

/** Отправляет событие через локальную шину partyService (сеть не нужна). */
function emitAction(action: any) {
  act(() => {
    partyService.onAction?.(action);
  });
}

describe("MobileControllerView: инлайн-плашка причины отказа", () => {
  beforeEach(() => {
    partyService.clearAllListeners();
    // Включаем локальные звуки контроллера, чтобы можно было считать вызовы deny.
    localStorage.setItem("controller_sfx_enabled", "true");
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    partyService.clearAllListeners();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("а) ACTION_REJECTED TARGET_NOT_IN_RADIUS показывает полный текст причины без truncate", () => {
    renderController();

    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });

    const banner = screen.getByTestId("controller-reject-banner");
    expect(banner).toBeDefined();
    expect(screen.getByText(/ДЕЙСТВИЕ ОТКЛОНЕНО/i)).toBeDefined();

    const reason = screen.getByTestId("controller-reject-reason");
    expect(reason.textContent).toContain("Цель вне радиуса 3×3");
    expect(reason.className).not.toContain("truncate");
    expect(reason.className).not.toContain("line-clamp");
    expect(reason.className).not.toContain("overflow-hidden");
  });

  it("б) ACTION_REJECTED ACTION_NOT_APPLIED показывает соответствующий текст", () => {
    renderController();

    emitAction({ type: "ACTION_REJECTED", reason: "ACTION_NOT_APPLIED" });

    expect(screen.getByTestId("controller-reject-banner")).toBeDefined();
    expect(screen.getByTestId("controller-reject-reason").textContent).toContain(
      "Действие не было применено"
    );
  });

  it("в) авто-скрытие плашки через ~4500–5000 мс", () => {
    vi.useFakeTimers();
    renderController();

    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });
    expect(screen.queryByTestId("controller-reject-banner")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByTestId("controller-reject-banner")).toBeNull();
  });

  it("г) STATE_UPDATE не скрывает плашку", () => {
    renderController();

    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });
    expect(screen.queryByTestId("controller-reject-banner")).not.toBeNull();

    emitAction({ type: "STATE_UPDATE", state: {}, gameState: {} });
    emitAction({ type: "SYNC_STATE", state: {}, gameState: {} });

    expect(screen.queryByTestId("controller-reject-banner")).not.toBeNull();
  });

  it("д) дедупликация пары SYNC_ERROR + ACTION_REJECTED: одна плашка и один звук deny", () => {
    const playSpy = vi.spyOn(soundManager, "play").mockImplementation(() => {});
    renderController();

    emitAction({
      type: "SYNC_ERROR",
      reason: "TARGET_NOT_IN_RADIUS",
      actionType: "KILL_CHARACTER",
    });
    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });

    expect(screen.getAllByTestId("controller-reject-banner")).toHaveLength(1);
    const denyCalls = playSpy.mock.calls.filter((call) => call[0] === "deny");
    expect(denyCalls).toHaveLength(1);
  });

  it("е) SYNC_ERROR с неизвестной причиной не создаёт плашку отказа", () => {
    renderController();

    emitAction({ type: "SYNC_ERROR", reason: "SOME_UNKNOWN_DESYNC_CODE" });

    expect(screen.queryByTestId("controller-reject-banner")).toBeNull();
  });

  it("ж) unmount очищает таймер без предупреждений об обновлении состояния", () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = renderController();
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
