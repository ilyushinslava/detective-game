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
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const request = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      if (sentinelRef.current && !sentinelRef.current.released) {
        return true;
      }

      const sentinel = await (navigator as any).wakeLock.request('screen');
      sentinelRef.current = sentinel;
      setIsActive(true);
      onRequest?.();

      sentinel.addEventListener('release', () => {
        sentinelRef.current = null;
        setIsActive(false);
        onRelease?.();
      });

      return true;
    } catch (err: any) {
      setIsActive(false);
      onError?.(err);
      return false;
    }
  }, [isSupported, onRequest, onRelease, onError]);

  const release = useCallback(async (): Promise<void> => {
    if (sentinelRef.current && !sentinelRef.current.released) {
      try {
        await sentinelRef.current.release();
      } catch {}
    }
    sentinelRef.current = null;
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (!enabled || !isSupported) return;

    request();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        request();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
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
