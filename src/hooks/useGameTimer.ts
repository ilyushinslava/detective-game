import { useState, useEffect } from "react";

interface UseGameTimerParams {
  hasStartedEver: boolean;
  isIntroPhase: boolean;
  winner: string | null;
}

export function useGameTimer({
  hasStartedEver,
  isIntroPhase,
  winner,
}: UseGameTimerParams) {
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
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
