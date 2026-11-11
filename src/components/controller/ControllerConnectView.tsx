import React, { useState, useRef, useEffect } from 'react';
import { soundManager } from '../../utils/audio';
import { triggerHaptic } from '../../utils/haptics';
import { Button } from '../ui/Button';
import { partyService } from '../../utils/partyPeer';
import { normalizeMorse } from '../../utils/morse';

export interface ControllerConnectViewProps {
  onConnect: (roomCode: string) => void;
  onBackToMenu: () => void;
  initialNickname?: string;
  onUpdateNickname?: (nickname: string) => void;
  targetRoomCode?: string;
  targetHostName?: string;
  targetExpectedMorse?: string;
}

export const ControllerConnectView: React.FC<ControllerConnectViewProps> = ({
  onConnect,
  onBackToMenu,
  initialNickname,
  onUpdateNickname,
  targetRoomCode,
  targetHostName,
  targetExpectedMorse,
}) => {
  const [nickname, setNickname] = useState(() => {
    if (initialNickname) return initialNickname;
    try {
      const saved = localStorage.getItem('crime_city_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.nickname) return parsed.nickname;
      }
    } catch {}
    return 'Агент';
  });

  const handleNicknameChange = (val: string) => {
    setNickname(val);
    onUpdateNickname?.(val);
    try {
      const saved = localStorage.getItem('crime_city_profile');
      const base = saved ? JSON.parse(saved) : {};
      localStorage.setItem('crime_city_profile', JSON.stringify({ ...base, nickname: val }));
    } catch {}
  };

  const [morseBuffer, setMorseBuffer] = useState<string>('');
  const [isKeyDown, setIsKeyDown] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0); // 0.0 to 1.0 (250ms threshold)
  const [isDashReached, setIsDashReached] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isKeyDownRef = useRef<boolean>(false);
  const pressStartRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const thresholdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thresholdFiredRef = useRef<boolean>(false);

  // Сброс сообщений об ошибке при смене буфера Морзе
  useEffect(() => {
    setErrorMessage(null);
  }, [morseBuffer]);

  // Строгий cleanup аудио и анимаций при монтировании и размонтировании
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

    soundManager.startMorseTone(700);
    triggerHaptic('light');

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (thresholdTimerRef.current !== null) {
      clearTimeout(thresholdTimerRef.current);
      thresholdTimerRef.current = null;
    }

    // Резервный таймер отсечки ровно на 250 мс
    thresholdTimerRef.current = setTimeout(() => {
      if (isKeyDownRef.current && !thresholdFiredRef.current) {
        thresholdFiredRef.current = true;
        setIsDashReached(true);
        setHoldProgress(1);
        triggerHaptic('medium');
      }
    }, 250);

    // Плавная 60/120fps анимация шкалы удержания: ровно 100% за 250 мс
    const step = () => {
      if (!isKeyDownRef.current) return;
      const elapsed = performance.now() - pressStartRef.current;
      const progress = Math.min(1, elapsed / 250);
      setHoldProgress(progress);

      if (elapsed >= 250) {
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
    const isDash = duration >= 250;
    const symbol = isDash ? '-' : '.';

    if (!thresholdFiredRef.current) {
      triggerHaptic(isDash ? 'medium' : 'light');
    }

    // Длина шифра: ровно 7 сигналов
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

  // Поиск и авторизация лобби на сервере
  const handleResolveAndConnect = async () => {
    const cleanMorse = normalizeMorse(morseBuffer);
    if (!cleanMorse || cleanMorse.length < 7) {
      setErrorMessage('Введите полный шифр из 7 сигналов');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);

    // Режим целевой комнаты: Морзе работает как пароль для входа в выбранную комнату
    if (targetRoomCode) {
      try {
        let isMatch = false;
        if (targetExpectedMorse) {
          isMatch = normalizeMorse(targetExpectedMorse) === cleanMorse;
        }
        if (!isMatch) {
          const verifyRes = await partyService.verifyRoomMorse(targetRoomCode, cleanMorse);
          isMatch = Boolean(verifyRes?.ok);
        }

        if (isMatch) {
          soundManager.play('impact');
          triggerHaptic('heavy');
          onConnect(targetRoomCode);
          return;
        }

        setErrorMessage('Неверный шифр доступа. Проверьте шифр у хоста.');
        soundManager.play('error');
        triggerHaptic('medium');
      } catch (_err) {
        setErrorMessage('Сетевая ошибка при проверке шифра.');
        soundManager.play('error');
      } finally {
        setIsSearching(false);
      }
      return;
    }

    try {
      const res = await partyService.resolveRoom({ morse: cleanMorse });

      // Найдена комната
      if (res?.ok && res.roomCode) {
        soundManager.play('impact');
        triggerHaptic('heavy');
        onConnect(res.roomCode);
        return;
      }

      // Комната не найдена
      const displayPattern = cleanMorse
        .split('')
        .map((s) => (s === '.' ? '•' : '—'))
        .join(' ');
      setErrorMessage(`Штаб с шифром [ ${displayPattern} ] не обнаружен. Проверьте код на ТВ.`);
      soundManager.play('error');
      triggerHaptic('medium');
    } catch (_err) {
      setErrorMessage('Сетевая ошибка при поиске комнаты.');
      soundManager.play('error');
    } finally {
      setIsSearching(false);
    }
  };

  const isReady = morseBuffer.length === 7;

  // Параметры SVG кольца-метронома вокруг кнопки
  const RING_RADIUS = 76;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - holdProgress);

  return (
    <div className="flex h-[100dvh] w-screen flex-col justify-between bg-[#080a0f] p-5 pb-8 text-zinc-100 select-none overflow-y-auto font-sans relative">
      {/* Мягкая контровая подсветка нео-нуара */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-transparent to-black/80 pointer-events-none" />

      {/* Шапка */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-300 font-bold">
            {targetHostName ? `ШИФР ДОСТУПА: ${targetHostName}` : 'ПУЛЬТ УПРАВЛЕНИЯ'}
          </span>
        </div>
        <Button
          variant="ghost"
          onClick={onBackToMenu}
          className="h-8 px-3 text-xs font-mono uppercase text-zinc-400 hover:text-white rounded-xl border border-white/5 hover:border-white/15 bg-zinc-900/40 transition cursor-pointer"
        >
          В МЕНЮ
        </Button>
      </div>

      <div className="max-w-sm mx-auto w-full my-2 space-y-3 relative z-10">
        {/* Позывной агента */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/60 via-zinc-950/80 to-slate-950/80 border border-white/10 backdrop-blur-xl shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-400">
            <span>ПОЗЫВНОЙ АГЕНТА</span>
            <span className="text-cyan-400 font-bold">ШИФРОВАННЫЙ КАНАЛ</span>
          </div>
          <input
            type="text"
            maxLength={16}
            value={nickname}
            onChange={(e) => handleNicknameChange(e.target.value)}
            placeholder="Агент"
            className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-zinc-100 text-xs font-mono uppercase font-bold focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 tracking-wider shadow-inner"
          />
        </div>
      </div>

      {/* Дисплей шифра: только лаконичный заголовок "ШИФР" и чистые неоново-белые пилюли */}
      <div className="flex flex-col items-center text-center max-w-sm mx-auto w-full space-y-2 mb-2 relative z-10">
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-400 font-bold">
            ШИФР
          </span>
          <span className="text-[10px] font-mono text-cyan-400 font-bold tracking-wider">
            {morseBuffer.length}/7
          </span>
        </div>

        {/* Дисплей введенных сигналов Морзе: 7 слотов, чистый акцентный неоново-белый цвет */}
        <div className="flex items-center justify-center gap-2 h-14 px-3 rounded-2xl bg-zinc-950/95 border border-white/20 w-full shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-md">
          {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
            const sym = morseBuffer[idx];
            return (
              <div key={idx} className="flex items-center justify-center">
                {sym === '.' ? (
                  /* Идеальный неоново-белый круг (Точка) */
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.95),0_0_20px_rgba(255,255,255,0.5)] transition-all" />
                ) : sym === '-' ? (
                  /* Аккуратная горизонтальная капсула с закругленными краями (Тире) */
                  <div className="w-8 sm:w-10 h-4 sm:h-5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.95),0_0_20px_rgba(255,255,255,0.5)] transition-all" />
                ) : idx === morseBuffer.length ? (
                  /* Активный курсор ввода */
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-dashed border-white/60 bg-white/10 animate-pulse transition-all" />
                ) : (
                  /* Пустой неактивный слот */
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-white/15 bg-zinc-900/60 transition-all" />
                )}
              </div>
            );
          })}
        </div>

        {errorMessage && (
          <div className="p-2 px-3 rounded-xl bg-red-950/70 border border-red-500/60 text-xs font-mono text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-fadeIn">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Основной блок: Абстрактная круговая шкала прогресса и минималистичная кнопка Морзе */}
      <div className="my-auto flex flex-col items-center justify-center max-w-sm mx-auto w-full relative z-10">
        <div className="w-full flex flex-col items-center space-y-4">
          {/* Контейнер кнопки со стильным круговым SVG-кольцом (stroke-dashoffset) */}
          <div className="relative w-48 h-48 flex items-center justify-center select-none touch-none">
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
              viewBox="0 0 180 180"
            >
              {/* Фоновая шкала */}
              <circle
                cx="90"
                cy="90"
                r={RING_RADIUS}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="4"
              />
              {/* Активное кольцо прогресса (плавно 100% за 250 мс) */}
              <circle
                cx="90"
                cy="90"
                r={RING_RADIUS}
                fill="none"
                stroke={isDashReached ? '#22d3ee' : '#38bdf8'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                style={{
                  filter: isKeyDown
                    ? `drop-shadow(0 0 10px ${isDashReached ? 'rgba(34,211,238,0.9)' : 'rgba(56,189,248,0.7)'})`
                    : 'none',
                }}
              />
            </svg>

            {/* Минималистичная тактическая кнопка: без рисунков инструментов и лишних текстов */}
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
              className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center select-none touch-none cursor-pointer active:scale-95 shadow-2xl relative transition-colors duration-150 ${
                isKeyDown
                  ? isDashReached
                    ? 'bg-cyan-600 border-cyan-200 text-white shadow-[0_0_35px_rgba(6,182,212,0.9)] scale-95'
                    : 'bg-blue-600 border-blue-200 text-white shadow-[0_0_25px_rgba(37,99,235,0.8)] scale-95'
                  : 'bg-zinc-900/90 border-white/20 text-zinc-300 hover:border-cyan-400 shadow-[0_0_25px_rgba(0,0,0,0.8)]'
              }`}
            >
              {isKeyDown ? (
                <>
                  {/* Чистые геометрические SVG-фигуры одинаковой визуальной плотности и толщины */}
                  <div className="h-7 flex items-center justify-center mb-1">
                    {isDashReached ? (
                      /* Тире: горизонтальная линия с закругленными краями (pill/capsule) */
                      <div className="w-12 h-5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
                    ) : (
                      /* Точка: идеальный круг */
                      <div className="w-5 h-5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
                    )}
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDashReached ? 'text-cyan-200' : 'text-zinc-200'}`}>
                    ПЕРЕДАЧА
                  </span>
                </>
              ) : (
                <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-200">
                  ПЕРЕДАЧА
                </span>
              )}
            </button>
          </div>

          {/* Минималистичные кнопки управления без мусора */}
          <div className="flex items-center justify-between w-full px-3">
            <button
              type="button"
              onClick={handleClear}
              disabled={!morseBuffer}
              className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-zinc-900/60 text-xs font-mono uppercase text-zinc-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Сброс
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              disabled={!morseBuffer}
              className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-zinc-900/60 text-xs font-mono uppercase text-red-400 hover:text-red-300 disabled:opacity-25 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Удалить (⌫)
            </button>
          </div>
        </div>
      </div>

      {/* Нижняя кнопка подключения */}
      <div className="space-y-2 max-w-sm mx-auto w-full pt-2 relative z-10">
        <Button
          variant="secondary"
          fullWidth
          onClick={handleResolveAndConnect}
          disabled={!isReady || isSearching}
          className={`h-14 rounded-2xl text-xs font-mono font-bold uppercase tracking-widest transition cursor-pointer ${
            !isReady || isSearching
              ? 'opacity-40 cursor-not-allowed bg-zinc-900/50 border-white/10 text-zinc-500'
              : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 border border-cyan-400/50 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95'
          }`}
        >
          {targetRoomCode
            ? isSearching
              ? 'ПРОВЕРКА ШИФРА...'
              : 'ПОДТВЕРДИТЬ ШИФР'
            : isSearching
              ? 'ПОИСК ШТАБА В ЭФИРЕ...'
              : 'НАЙТИ ШТАБ'}
        </Button>
      </div>
    </div>
  );
};
