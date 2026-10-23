import { useState, useRef, useEffect } from "react";

interface UseGameLogParams {
  log: string[];
  isLogOpen: boolean;
}

export function useGameLog({ log, isLogOpen }: UseGameLogParams) {
  const [unreadLogCount, setUnreadLogCount] = useState(0);
  const prevLogLenRef = useRef(log.length);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const mobileLogContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (log.length > prevLogLenRef.current) {
      if (!isLogOpen) {
        setUnreadLogCount(
          (prev) => prev + (log.length - prevLogLenRef.current),
        );
      }
    }
    prevLogLenRef.current = log.length;
  }, [log.length, isLogOpen]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
    if (mobileLogContainerRef.current) {
      mobileLogContainerRef.current.scrollTop = mobileLogContainerRef.current.scrollHeight;
    }
  }, [log, isLogOpen]);

  return {
    unreadLogCount,
    setUnreadLogCount,
    logContainerRef,
    mobileLogContainerRef,
  };
}
