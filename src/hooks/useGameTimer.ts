import { useState, useEffect } from "react";

export interface UseGameTimerParams {
  hasStartedEver: boolean;
  isIntroPhase: boolean;
  winner: string | null;
}

/**
 * Изолированный сервис игрового таймера (P0 Performance).
 * Позволяет подписываться на секундный тик только тем компонентам,
 * которые отображают время, устраняя каскадный ре-рендер верхнего уровня App.tsx и доски 5x5.
 */
class GameTimerService {
  private secondsElapsed = 0;
  private interval: any = null;
  private listeners = new Set<(sec: number) => void>();
  private isRunning = false;

  getElapsedSeconds(): number {
    return this.secondsElapsed;
  }

  setSeconds(sec: number): void {
    this.secondsElapsed = sec;
    this.notify();
  }

  reset(): void {
    this.stop();
    this.secondsElapsed = 0;
    this.notify();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => {
      this.secondsElapsed += 1;
      this.notify();
    }, 1000);
  }

  stop(): void {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  subscribe(listener: (sec: number) => void): () => void {
    this.listeners.add(listener);
    listener(this.secondsElapsed);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(this.secondsElapsed);
      } catch (e) {
        console.error("[GameTimerService] Error in listener:", e);
      }
    }
  }
}

export const gameTimerService = new GameTimerService();

/**
 * Хук для изолированного отображения секундного таймера без ре-рендера родителя.
 */
export function useGameTimerDisplay(): number {
  const [seconds, setSeconds] = useState(gameTimerService.getElapsedSeconds());

  useEffect(() => {
    return gameTimerService.subscribe(setSeconds);
  }, []);

  return seconds;
}

/**
 * Контроллер таймера для App.tsx. Управляет стартом/остановкой gameTimerService,
 * НЕ вызывая setState в App и НЕ вызывая каскадный ре-рендер.
 */
export function useGameTimerController({
  hasStartedEver,
  isIntroPhase,
  winner,
}: UseGameTimerParams) {
  useEffect(() => {
    const isGameRunning = hasStartedEver && !isIntroPhase && !winner;

    if (isGameRunning) {
      gameTimerService.start();
    } else {
      gameTimerService.stop();
    }

    return () => {
      if (winner) {
        gameTimerService.stop();
      }
    };
  }, [hasStartedEver, isIntroPhase, winner]);

  return {
    getElapsedSeconds: () => gameTimerService.getElapsedSeconds(),
    resetTimer: () => gameTimerService.reset(),
    setSecondsElapsed: (sec: number) => gameTimerService.setSeconds(sec),
  };
}

/**
 * Базовый хук useGameTimer (для совместимости с тестами Vitest).
 */
export function useGameTimer({
  hasStartedEver,
  isIntroPhase,
  winner,
}: UseGameTimerParams) {
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    let interval: any = null;
    const isGameRunning = hasStartedEver && !isIntroPhase && !winner;

    if (isGameRunning) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [hasStartedEver, isIntroPhase, winner]);

  return {
    secondsElapsed,
    setSecondsElapsed,
  };
}
