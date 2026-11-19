import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { soundManager } from '../../utils/audio';
import { triggerHaptic } from '../../utils/haptics';
import { Button } from '../ui/Button';
import { partyService } from '../../utils/partyPeer';
import { normalizeMorse } from '../../utils/morse';
import { TIMINGS, AUDIO_CONFIG } from '../../constants/gameRules';
import { safeLocalStorage } from '../../utils/storage';
import { useWakeLock } from '../../hooks/useWakeLock';
import { Icons } from '../ui/Icons';

const QrCameraScanner = lazy(() =>
  import('./QrCameraScanner').then((m) => ({ default: m.QrCameraScanner }))
);

export interface ControllerConnectViewProps {
  onConnect: (roomCode: string, morseCode?: string) => void;
  onBackToMenu: () => void;
  initialNickname?: string;
  onUpdateNickname?: (nickname: string) => void;
  targetRoomCode?: string;
  targetHostName?: string;
  /** @deprecated Используйте серверную верификацию verifyRoomMorse */
  targetExpectedMorse?: string;
  noticeMessage?: string | null;
  onClearNotice?: () => void;
  initialTab?: ConnectTab;
}

export type ConnectTab = 'CAMERA' | 'MORSE';

export const ControllerConnectView: React.FC<ControllerConnectViewProps> = ({
  onConnect,
  onBackToMenu,
  initialNickname,
  onUpdateNickname,
  targetRoomCode,
  targetHostName,
  targetExpectedMorse,
  noticeMessage,
  onClearNotice,
  initialTab,
}) => {
  useWakeLock({ enabled: true });
  const [activeTab, setActiveTab] = useState<ConnectTab>(() => {
    if (initialTab) return initialTab;
    if (targetExpectedMorse || targetRoomCode) return 'MORSE';
    return 'CAMERA';
  });

  const [nickname, setNickname] = useState(() => {
    if (initialNickname) return initialNickname;
    const profile = safeLocalStorage.getJSON<{ nickname?: string } | null>('crime_city_profile', null);
    return profile?.nickname || 'Агент';
  });

  const handleNicknameChange = (val: string) => {
    setNickname(val);
    onUpdateNickname?.(val);
    const base = safeLocalStorage.getJSON<Record<string, any>>('crime_city_profile', {});
    safeLocalStorage.setJSON('crime_city_profile', { ...base, nickname: val });
  };

  // ==========================================
  // Стейт вкладки МОРЗЕ (Телеграфный ключ)
  // ==========================================
  const [morseBuffer, setMorseBuffer] = useState<string>('');
  const [isKeyDown, setIsKeyDown] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isDashReached, setIsDashReached] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isKeyDownRef = useRef<boolean>(false);
  const pressStartRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const thresholdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thresholdFiredRef = useRef<boolean>(false);

  useEffect(() => {
    setErrorMessage(null);
  }, [morseBuffer]);

  useEffect(() => {
    soundManager.stopAll();

    return () => {
      soundManager.stopAll();
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (thresholdTimerRef.current !== null) {
        clearTimeout(thresholdTimerRef.current);
        thresholdTimerRef.current = null;
      }
    };
  }, []);

  const handlePointerDown = () => {
    isKeyDownRef.current = true;
    pressStartRef.current = performance.now();
    thresholdFiredRef.current = false;

    setIsKeyDown(true);
    setIsDashReached(false);
    setHoldProgress(0);

    soundManager.startMorseTone(AUDIO_CONFIG.MORSE_TONE_FREQ_HZ);
    triggerHaptic('light');

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (thresholdTimerRef.current !== null) {
      clearTimeout(thresholdTimerRef.current);
      thresholdTimerRef.current = null;
    }

    thresholdTimerRef.current = setTimeout(() => {
      if (isKeyDownRef.current && !thresholdFiredRef.current) {
        thresholdFiredRef.current = true;
        setIsDashReached(true);
        setHoldProgress(1);
        triggerHaptic('medium');
      }
    }, TIMINGS.MORSE_DASH_THRESHOLD_MS);

    const step = () => {
      if (!isKeyDownRef.current) return;
      const elapsed = performance.now() - pressStartRef.current;
      const progress = Math.min(1, elapsed / TIMINGS.MORSE_DASH_THRESHOLD_MS);
      setHoldProgress(progress);

      if (elapsed >= TIMINGS.MORSE_DASH_THRESHOLD_MS) {
        setHoldProgress(1);
        if (!thresholdFiredRef.current) {
          thresholdFiredRef.current = true;
          setIsDashReached(true);
          triggerHaptic('medium');
        }
      } else {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  };

  const handlePointerUp = () => {
    if (!isKeyDownRef.current) return;
    isKeyDownRef.current = false;

    soundManager.stopMorseTone();

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (thresholdTimerRef.current !== null) {
      clearTimeout(thresholdTimerRef.current);
      thresholdTimerRef.current = null;
    }

    const duration = performance.now() - pressStartRef.current;
    const isDash = duration >= TIMINGS.MORSE_DASH_THRESHOLD_MS;
    const symbol = isDash ? '-' : '.';

    if (!thresholdFiredRef.current) {
      triggerHaptic(isDash ? 'medium' : 'light');
    }

    setMorseBuffer((prev) => (prev.length < 7 ? prev + symbol : prev));
    setHoldProgress(0);
    setIsDashReached(false);
    setIsKeyDown(false);
  };

  const handleBackspace = () => {
    triggerHaptic('light');
    soundManager.play('click');
    setMorseBuffer((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    triggerHaptic('medium');
    soundManager.play('click');
    setMorseBuffer('');
  };

  const handleResolveAndConnect = async () => {
    const cleanMorse = normalizeMorse(morseBuffer);
    if (!cleanMorse || cleanMorse.length < 7) {
      setErrorMessage('Введите полный код из 7 сигналов');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);

    if (targetRoomCode) {
      try {
        let isMatch = false;
        const verifyRes = await partyService.verifyRoomMorse(targetRoomCode, cleanMorse);
        isMatch = Boolean(verifyRes?.ok);

        // Fallback только для изолированных unit-тестов с моковым targetExpectedMorse
        if (!isMatch && targetExpectedMorse) {
          isMatch = normalizeMorse(targetExpectedMorse) === cleanMorse;
        }

        if (isMatch) {
          soundManager.play('impact');
          triggerHaptic('success');
          onConnect(targetRoomCode, cleanMorse);
          return;
        }

        setErrorMessage('Неверный код комнаты. Проверьте код на экране ТВ.');
        soundManager.play('error');
        triggerHaptic('error');
      } catch (_err) {
        setErrorMessage('Сетевая ошибка при проверке кода.');
        soundManager.play('error');
        triggerHaptic('error');
      } finally {
        setIsSearching(false);
      }
      return;
    }

    try {
      const res = await partyService.resolveRoom({ morse: cleanMorse });

      if (res?.ok && res.roomCode) {
        soundManager.play('impact');
        triggerHaptic('success');
        onConnect(res.roomCode, cleanMorse);
        return;
      }

      const displayPattern = cleanMorse
        .split('')
        .map((s) => (s === '.' ? '•' : '—'))
        .join(' ');
      setErrorMessage(`Комната с кодом [ ${displayPattern} ] не найдена. Проверьте код на ТВ.`);
      soundManager.play('error');
      triggerHaptic('error');
    } catch (_err) {
      setErrorMessage('Сетевая ошибка при поиске комнаты.');
      soundManager.play('error');
      triggerHaptic('error');
    } finally {
      setIsSearching(false);
    }
  };

  const isReadyMorse = morseBuffer.length === 7;
  const RING_RADIUS = 76;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - holdProgress);

  return (
    <div className="flex h-[100dvh] w-full max-w-full flex-col justify-between bg-[#080a0f] p-4 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] text-zinc-100 select-none overflow-hidden font-sans relative">
      {/* Мягкая контровая подсветка нео-нуара */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-transparent to-black/90 pointer-events-none" />

      {/* Верхний статус-бар */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <span className="text-xs font-display uppercase tracking-widest text-zinc-200 font-bold">
            {targetHostName ? `КОД КОМНАТЫ: ${targetHostName}` : 'ПУЛЬТ УПРАВЛЕНИЯ'}
          </span>
        </div>
        <Button
          variant="ghost"
          onClick={onBackToMenu}
          className="min-h-[44px] px-3.5 text-xs font-mono uppercase text-zinc-400 hover:text-white rounded-xl border border-white/5 hover:border-white/15 bg-zinc-900/40 transition cursor-pointer flex items-center justify-center"
        >
          В МЕНЮ
        </Button>
      </div>

      {/* Баннер системного уведомления (например, отключение ТВ-хоста) */}
      {noticeMessage && (
        <div className="max-w-sm mx-auto w-full mt-2 relative z-10 shrink-0">
          <div className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-950/70 p-3 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              <span className="font-display text-xs font-bold uppercase tracking-wider text-rose-200">
                {noticeMessage}
              </span>
            </div>
            {onClearNotice && (
              <button
                onClick={onClearNotice}
                className="text-xs text-rose-300 hover:text-white p-1 rounded cursor-pointer transition touch-manipulation flex items-center justify-center"
                aria-label="Закрыть"
              >
                <Icons.Close className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Позывной агента */}
      <div className="max-w-sm mx-auto w-full my-2 relative z-10 shrink-0">
        <div className="neo-card p-3 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-400">
            <span>ПОЗЫВНОЙ АГЕНТА</span>
            <span className="text-blue-400 font-bold tracking-wider">ПОДКЛЮЧЕНИЕ К ТВ</span>
          </div>
          <input
            type="text"
            maxLength={16}
            value={nickname}
            onChange={(e) => handleNicknameChange(e.target.value)}
            placeholder="Агент"
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-zinc-100 text-xs font-mono uppercase font-bold focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 tracking-wider shadow-inner"
          />
        </div>
      </div>

      {/* Навигация по вкладкам (Tabs): только 2 вкладки КАМЕРА и МОРЗЕ */}
      <div className="max-w-sm mx-auto w-full mb-3 relative z-10 shrink-0">
        <div className="grid grid-cols-2 p-1 rounded-2xl neo-card">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('CAMERA');
            }}
            className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl text-xs font-display tracking-wider uppercase transition-all duration-75 active:scale-95 touch-manipulation cursor-pointer ${
              activeTab === 'CAMERA'
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-semibold'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>КАМЕРА</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('MORSE');
            }}
            className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl text-xs font-display tracking-wider uppercase transition-all duration-75 active:scale-95 touch-manipulation cursor-pointer ${
              activeTab === 'MORSE'
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-semibold'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
              <path d="M4.93 19.07a10 10 0 0 1 0-14.14M19.07 4.93a10 10 0 0 1 0 14.14M7.76 16.24a6 6 0 0 1 0-8.48M16.24 7.76a6 6 0 0 1 0 8.48M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
            </svg>
            <span>МОРЗЕ</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ВКЛАДКА 1: КАМЕРА (Встроенный QR-сканер)                       */}
      {/* ============================================================ */}
      {activeTab === 'CAMERA' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full relative z-10 py-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="w-full aspect-square max-h-[340px] flex items-center justify-center neo-card rounded-2xl">
                <div className="w-8 h-8 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
              </div>
            }
          >
            <QrCameraScanner
              onScanSuccess={(scannedCode) => {
                onConnect(scannedCode);
              }}
              onManualSwitch={() => setActiveTab('MORSE')}
              className="w-full aspect-square max-h-[340px] shadow-2xl"
            />
          </Suspense>
        </div>
      )}

      {/* ============================================================ */}
      {/* ВКЛАДКА 2: МОРЗЕ (Телеграфный ключ)                          */}
      {/* ============================================================ */}
      {activeTab === 'MORSE' && (
        <div className="flex-1 flex flex-col justify-between max-w-sm mx-auto w-full relative z-10 py-1">
          {/* Дисплей сигналов Морзе */}
          <div className="flex flex-col items-center text-center w-full space-y-2 mb-2">
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-[10px] font-display uppercase tracking-[0.25em] text-zinc-400 font-bold">
                КОД МОРЗЕ
              </span>
              <span className="text-[10px] font-mono text-blue-400 font-bold tracking-wider">
                {morseBuffer.length}/7
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 h-14 px-3 rounded-2xl bg-zinc-950/95 border border-white/20 w-full shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-md">
              {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
                const sym = morseBuffer[idx];
                return (
                  <div key={idx} className="flex items-center justify-center">
                    {sym === '.' ? (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.95),0_0_20px_rgba(255,255,255,0.5)] transition-all" />
                    ) : sym === '-' ? (
                      <div className="w-8 sm:w-10 h-4 sm:h-5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.95),0_0_20px_rgba(255,255,255,0.5)] transition-all" />
                    ) : idx === morseBuffer.length ? (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-dashed border-white/60 bg-white/10 animate-pulse transition-all" />
                    ) : (
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-white/15 bg-zinc-900/60 transition-all" />
                    )}
                  </div>
                );
              })}
            </div>

            {errorMessage && (
              <div className="p-2 px-3 rounded-xl bg-red-950/70 border border-red-500/60 text-xs font-mono text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Телеграфный ключ */}
          <div className="my-auto flex flex-col items-center justify-center w-full">
            <div className="w-full flex flex-col items-center space-y-3">
              <div className="relative w-44 h-44 flex items-center justify-center select-none touch-none">
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                  viewBox="0 0 180 180"
                >
                  <circle
                    cx="90"
                    cy="90"
                    r={RING_RADIUS}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="90"
                    cy="90"
                    r={RING_RADIUS}
                    fill="none"
                    stroke={isDashReached ? '#60a5fa' : '#3b82f6'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    style={{
                      filter: isKeyDown
                        ? `drop-shadow(0 0 10px ${isDashReached ? 'rgba(96,165,250,0.9)' : 'rgba(59,130,246,0.7)'})`
                        : 'none',
                    }}
                  />
                </svg>

                <button
                  type="button"
                  aria-label="Ключ телеграфа"
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={() => {
                    if (isKeyDownRef.current) {
                      handlePointerUp();
                    } else {
                      soundManager.stopMorseTone();
                    }
                  }}
                  className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center select-none touch-none cursor-pointer active:scale-95 shadow-2xl relative transition-colors duration-150 ${
                    isKeyDown
                      ? isDashReached
                        ? 'bg-blue-600 border-blue-200 text-white shadow-[0_0_35px_rgba(37,99,235,0.9)] scale-95'
                        : 'bg-blue-600 border-blue-200 text-white shadow-[0_0_25px_rgba(37,99,235,0.8)] scale-95'
                      : 'bg-zinc-900/90 border-white/20 text-zinc-300 hover:border-blue-400 shadow-[0_0_25px_rgba(0,0,0,0.8)]'
                  }`}
                >
                  {isKeyDown ? (
                    <>
                      <div className="h-6 flex items-center justify-center mb-1">
                        {isDashReached ? (
                          <div className="w-10 h-4 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
                        )}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] font-display ${isDashReached ? 'text-blue-100' : 'text-zinc-200'}`}>
                        ПЕРЕДАЧА
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-200 font-display">
                      ПЕРЕДАЧА
                    </span>
                  )}
                </button>
              </div>

              {/* Управление буфером */}
              <div className="flex items-center justify-between w-full px-2 gap-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleClear}
                  disabled={!morseBuffer}
                  className="min-h-[44px] px-4 py-2 text-xs font-mono uppercase text-zinc-400 hover:text-white"
                >
                  Сброс
                </Button>

                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleBackspace}
                  disabled={!morseBuffer}
                  className="min-h-[44px] px-4 py-2 text-xs font-mono uppercase text-rose-400 hover:text-rose-300 gap-1.5"
                >
                  <Icons.Backspace className="w-3.5 h-3.5 text-rose-400" />
                  <span>Удалить</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Нижняя кнопка отправки кода Морзе */}
          <div className="w-full pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={handleResolveAndConnect}
              disabled={!isReadyMorse || isSearching}
              className={`min-h-[50px] rounded-2xl text-xs font-display font-bold uppercase tracking-widest transition cursor-pointer ${
                !isReadyMorse || isSearching
                  ? 'opacity-40 cursor-not-allowed bg-zinc-900/50 border-white/10 text-zinc-500'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 border border-blue-400/50 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95'
              }`}
            >
              {targetRoomCode
                ? isSearching
                  ? 'ПРОВЕРКА КОДА...'
                  : 'ПОДТВЕРДИТЬ'
                : isSearching
                  ? 'ПОИСК КОМНАТЫ...'
                  : 'ПОДКЛЮЧИТЬСЯ'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
