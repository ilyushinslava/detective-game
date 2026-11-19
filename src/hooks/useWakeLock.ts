import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseWakeLockOptions {
  enabled?: boolean;
  onRequest?: () => void;
  onRelease?: () => void;
  onError?: (err: Error) => void;
}

export interface UseWakeLockReturn {
  isSupported: boolean;
  isActive: boolean;
  request: () => Promise<boolean>;
  release: () => Promise<void>;
}

export function useWakeLock(options: UseWakeLockOptions = {}): UseWakeLockReturn {
  const { enabled = true, onRequest, onRelease, onError } = options;
  const [isActive, setIsActive] = useState<boolean>(false);
  const sentinelRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  // Сохраняем актуальные коллбэки в ref для стабильности функций request и release
  const callbacksRef = useRef({ onRequest, onRelease, onError });
  useEffect(() => {
    callbacksRef.current = { onRequest, onRelease, onError };
  });

  const request = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      if (sentinelRef.current && !sentinelRef.current.released) {
        return true;
      }

      const sentinel = await (navigator as any).wakeLock.request('screen');
      if (!isMountedRef.current) {
        try {
          await sentinel.release();
        } catch {}
        return false;
      }

      sentinelRef.current = sentinel;
      setIsActive(true);
      callbacksRef.current.onRequest?.();

      sentinel.addEventListener('release', () => {
        sentinelRef.current = null;
        if (isMountedRef.current) {
          setIsActive(false);
        }
        callbacksRef.current.onRelease?.();
      });

      return true;
    } catch (err: any) {
      if (isMountedRef.current) {
        setIsActive(false);
      }
      callbacksRef.current.onError?.(err);
      return false;
    }
  }, [isSupported]);

  const release = useCallback(async (): Promise<void> => {
    if (sentinelRef.current && !sentinelRef.current.released) {
      try {
        await sentinelRef.current.release();
      } catch {}
    }
    sentinelRef.current = null;
    if (isMountedRef.current) {
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (!enabled || !isSupported) return;

    request();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        request();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      release();
    };
  }, [enabled, isSupported, request, release]);

  return {
    isSupported,
    isActive,
    request,
    release,
  };
}
