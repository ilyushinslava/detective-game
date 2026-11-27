// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { TvBoardView } from "../TvBoardView";
import { createInitialState } from "../../../utils/gameLogic";
import { partyService } from "../../../utils/partyPeer";

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

function createTvState() {
  const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
  state.currentTurn = "KILLER";
  return state;
}

function renderTv(state = createTvState()) {
  return render(<TvBoardView gameState={state} />);
}

/** Отправляет событие через локальную шину partyService (сеть не нужна). */
function emitEvent(event: string, payload?: any) {
  act(() => {
    (partyService as any).emit(event, payload);
  });
}

function emitAction(action: any) {
  act(() => {
    partyService.onAction?.(action);
  });
}

describe("TvBoardView: граничные случаи плашки отказа", () => {
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

  it("а) отказ при открытой паузе не ломает оверлей: плашка z-40 ниже паузы z-50, после закрытия паузы видна", () => {
    vi.useFakeTimers();
    renderTv();

    emitAction({ type: "TV_PAUSE_CHANGED", isPaused: true });

    const pauseTitle = screen.getByText(/ПАУЗА МАТЧА/i);
    const pauseOverlay = pauseTitle.closest(".fixed") as HTMLElement | null;
    expect(pauseOverlay).not.toBeNull();
    expect(pauseOverlay!.className).toContain("z-50");
    expect(pauseOverlay!.getAttribute("aria-hidden")).toBe("false");

    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });

    const banner = screen.getByTestId("tv-reject-banner");
    expect(banner.className).toContain("z-40");
    // Плашка отказа не должна перекрывать оверлей паузы.
    expect(pauseOverlay!.className).toContain("z-50");
    expect(pauseOverlay!.getAttribute("aria-hidden")).toBe("false");
    expect(screen.getByText(/ДЕЙСТВИЕ ОТКЛОНЕНО/i)).toBeDefined();

    // Пауза ещё открыта, плашка не истекла.
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByTestId("tv-reject-banner")).not.toBeNull();

    // Закрываем паузу — плашка (если ещё не истекла) остаётся видимой.
    emitAction({ type: "TV_PAUSE_CHANGED", isPaused: false });
    expect(pauseOverlay!.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByTestId("tv-reject-banner")).not.toBeNull();

    // По истечении полного таймера (5500 мс) плашка скрывается.
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByTestId("tv-reject-banner")).toBeNull();
  });

  it("б) отказ при потере связи: таймер без ошибок, z-40 ниже оверлея z-[70], после переподключения состояние консистентно", () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderTv();

    // Оверлей временной потери связи (ветка дисконнекта TvPauseModal).
    emitEvent("playerDisconnected", { role: "KILLER", graceTimeoutSec: 30 });

    const disconnectOverlay = screen.getByTestId("tv-player-disconnected-banner");
    expect(disconnectOverlay.className).toContain("z-[70]");

    emitAction({ type: "ACTION_REJECTED", reason: "ACTION_NOT_APPLIED" });

    const banner = screen.getByTestId("tv-reject-banner");
    expect(banner.className).toContain("z-40");
    // Оверлей потери связи остаётся поверх плашки.
    expect(screen.getByTestId("tv-player-disconnected-banner")).toBe(disconnectOverlay);

    // Проходит грейс-период и таймер плашки — никаких ошибок React.
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    const stateWarnings = errorSpy.mock.calls.filter((call) =>
      String(call[0]).includes("unmounted component")
    );
    expect(stateWarnings).toHaveLength(0);

    // Возврат игрока в сеть: оверлей связи уходит, доска снова консистентна.
    emitEvent("playerReconnected");
    expect(screen.queryByTestId("tv-player-disconnected-banner")).toBeNull();
    expect(screen.queryByTestId("tv-reject-banner")).toBeNull();
    expect(screen.getAllByText(/МЕНЮ ПАУЗЫ/i).length).toBeGreaterThanOrEqual(1);
  });

  it("в) отказ на экране победы: ранний return, плашки нет, ошибок нет", () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const state = createTvState();
    state.winner = "DETECTIVE";

    renderTv(state);

    // Победа отрисована, плашки отказа и корневой доски нет.
    expect(screen.getByText(/ПОБЕДА:/i)).toBeDefined();
    expect(screen.queryByTestId("tv-reject-banner")).toBeNull();

    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });

    expect(screen.queryByTestId("tv-reject-banner")).toBeNull();
    expect(screen.getByText(/ПОБЕДА:/i)).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("г) смена экрана (реванш/победа) после отказа: плашка исчезает, таймер не даёт ошибок, при размонтировании очищается", () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { rerender, unmount } = renderTv();
    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });
    expect(screen.queryByTestId("tv-reject-banner")).not.toBeNull();

    // Переход на экран победы (реванш/смена экрана) — плашка больше не рендерится.
    const winState = createTvState();
    winState.winner = "KILLER";
    act(() => {
      rerender(<TvBoardView gameState={winState} />);
    });

    expect(screen.getByText(/ПОБЕДА:/i)).toBeDefined();
    expect(screen.queryByTestId("tv-reject-banner")).toBeNull();

    // Таймер отказа доживает на смонтированном компоненте без предупреждений.
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.queryByTestId("tv-reject-banner")).toBeNull();

    unmount();
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    const stateWarnings = errorSpy.mock.calls.filter((call) =>
      String(call[0]).includes("unmounted component")
    );
    expect(stateWarnings).toHaveLength(0);
  });

  it("д) два ACTION_REJECTED подряд: показывается последняя причина, таймер перезапускается", () => {
    vi.useFakeTimers();
    renderTv();

    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });
    expect(screen.getByTestId("tv-reject-reason").textContent).toContain(
      "Цель вне радиуса 3×3"
    );

    // Первый таймер почти истёк, но приходит второй отказ.
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByTestId("tv-reject-banner")).not.toBeNull();

    emitAction({ type: "ACTION_REJECTED", reason: "ACTION_NOT_APPLIED" });
    expect(screen.getByTestId("tv-reject-reason").textContent).toContain(
      "Действие не было применено"
    );
    expect(screen.getAllByTestId("tv-reject-banner")).toHaveLength(1);

    // Если бы таймер не перезапустился — плашка исчезла бы уже здесь.
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByTestId("tv-reject-banner")).not.toBeNull();

    // Полные 5500 мс от второго отказа — плашка скрывается.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByTestId("tv-reject-banner")).toBeNull();
  });

  it("е) разметка плашки: role=status, aria-live=polite, pointer-events-none, max-w-[92%], текст без обрезки", () => {
    renderTv();

    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });

    const banner = screen.getByTestId("tv-reject-banner");
    expect(banner.getAttribute("role")).toBe("status");
    expect(banner.getAttribute("aria-live")).toBe("polite");
    expect(banner.className).toContain("pointer-events-none");
    expect(banner.className).toContain("max-w-[92%]");

    const reason = screen.getByTestId("tv-reject-reason");
    expect(reason.className).not.toContain("truncate");
    expect(reason.className).not.toContain("line-clamp");
    expect(reason.className).not.toContain("overflow-hidden");
    expect(reason.className).toContain("break-words");
  });

  it("ж) 16:9: корень доски скрывает переполнение, плашка позиционирована абсолютно и не влияет на высоту", () => {
    const { container } = renderTv();

    const root = container.querySelector(".tv-root") as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root!.className).toContain("overflow-hidden");

    emitAction({ type: "ACTION_REJECTED", reason: "TARGET_NOT_IN_RADIUS" });

    const banner = screen.getByTestId("tv-reject-banner");
    // Абсолютное позиционирование у нижней кромки — не участвует в потоке раскладки.
    expect(banner.className).toContain("absolute");
    expect(banner.className).toContain("bottom-3");
    // Ограничение ширины не даёт длинному тексту выйти за кадр 16:9.
    expect(banner.className).toContain("max-w-[92%]");
    // Плашка не является прямым потомком tv-root (живёт внутри поля).
    expect(root!.contains(banner)).toBe(true);
  });
});
