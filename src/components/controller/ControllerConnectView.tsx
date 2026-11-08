import React, { useState, useRef, useEffect } from 'react';
import { soundManager } from '../../utils/audio';
import { triggerHaptic } from '../../utils/haptics';
import { Button } from '../ui/Button';
import { partyService } from '../../utils/partyPeer';
import { resolveRoomByMorse, resolveRoomByPin, normalizeMorse } from '../../server/index';

export interface ControllerConnectViewProps {
  onConnect: (pin: string) => void;
  onBackToMenu: () => void;
  initialNickname?: string;
  onUpdateNickname?: (nickname: string) => void;
}

export const ControllerConnectView: React.FC<ControllerConnectViewProps> = ({
  onConnect,
  onBackToMenu,
  initialNickname,
  onUpdateNickname,
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

  const [tab, setTab] = useState<'PIN' | 'MORSE'>('PIN');
  const [pin, setPin] = useState<string>('');
  const [morseBuffer, setMorseBuffer] = useState<string>('');
  const [isKeyDown, setIsKeyDown] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pressStartRef = useRef<number>(0);

  // Сброс сообщений об ошибке при смене ввода
  useEffect(() => {
    setErrorMessage(null);
  }, [pin, morseBuffer, tab]);

  // Гарантированная остановка тона Морзе при размонтировании экрана
  useEffect(() => {
    return () => {
      soundManager.stopMorseTone();
    };
  }, []);

  // Детектор коротких (<250мс) и длинных (>=250мс) нажатий
  const handlePointerDown = () => {
    pressStartRef.current = performance.now();
    setIsKeyDown(true);
    soundManager.startMorseTone(700);
    triggerHaptic('light');
  };

  const handlePointerUp = () => {
    if (!isKeyDown) return;
    setIsKeyDown(false);
    soundManager.stopMorseTone();
    const duration = performance.now() - pressStartRef.current;
    // Порог: <250мс — точка (.), >=250мс — тире (-)
    const isDash = duration >= 250;
    const symbol = isDash ? '-' : '.';

    if (isDash) {
      triggerHaptic('medium');
    } else {
      triggerHaptic('light');
    }

    setMorseBuffer((prev) => (prev.length < 5 ? prev + symbol : prev));
  };

  const handleBackspace = () => {
    triggerHaptic('light');
    soundManager.play('click');
    if (tab === 'MORSE') {
      setMorseBuffer((prev) => prev.slice(0, -1));
    } else {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    triggerHaptic('medium');
    soundManager.play('click');
    if (tab === 'MORSE') {
      setMorseBuffer('');
    } else {
      setPin('');
    }
  };

  // Поиск и авторизация лобби на сервере
  const handleResolveAndConnect = async () => {
    setIsSearching(true);
    setErrorMessage(null);

    try {
      let resolvedCode: string | null = null;

      if (tab === 'MORSE') {
        const cleanMorse = normalizeMorse(morseBuffer);
        if (!cleanMorse) {
          setErrorMessage('Отстучите позывной Морзе на ключе');
          setIsSearching(false);
          return;
        }

        // 1. Запрос к API сервера через partyService
        const res = await partyService.resolveRoom({ morse: cleanMorse });
        if (res?.ok && res.roomCode) {
          resolvedCode = res.roomCode;
        } else {
          // 2. Локальный резервный резолв (для тестов/оффлайн-режима)
          resolvedCode = resolveRoomByMorse(cleanMorse);
        }

        if (!resolvedCode) {
          const displayPattern = cleanMorse.split('').map((s) => (s === '.' ? '•' : '—')).join(' ');
          setErrorMessage(`Позывной [ ${displayPattern} ] не найден. Проверьте код на ТВ.`);
          soundManager.play('error');
          triggerHaptic('medium');
          setIsSearching(false);
          return;
        }
      } else {
        const cleanPin = pin.trim();
        if (cleanPin.length < 4) {
          setErrorMessage('Введите как минимум 4-5 цифр ID комнаты');
          setIsSearching(false);
          return;
        }

        const res = await partyService.resolveRoom({ pin: cleanPin });
        if (res?.ok && res.roomCode) {
          resolvedCode = res.roomCode;
        } else {
          resolvedCode = resolveRoomByPin(cleanPin) || cleanPin;
        }
      }

      soundManager.play('impact');
      triggerHaptic('heavy');
      onConnect(resolvedCode);
    } catch (_err) {
      setErrorMessage('Сетевая ошибка при поиске комнаты.');
      soundManager.play('error');
    } finally {
      setIsSearching(false);
    }
  };

  const isReady = tab === 'PIN' ? pin.length >= 4 : morseBuffer.length >= 4;

  return (
    <div className="flex h-[100dvh] w-screen flex-col justify-between bg-[#080a0f] p-5 pb-8 text-zinc-100 select-none overflow-y-auto font-sans">
      {/* Шапка */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-300">ПОДКЛЮЧЕНИЕ ПУЛЬТА</span>
        </div>
        <Button
          variant="ghost"
          onClick={onBackToMenu}
          className="h-8 px-2.5 text-xs font-mono uppercase text-zinc-400 hover:text-white"
        >
          В МЕНЮ
        </Button>
      </div>

      <div className="max-w-sm mx-auto w-full my-2 space-y-3">
        {/* Позывной агента */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/10 backdrop-blur-md shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-400">
            <span>ПОЗЫВНОЙ АГЕНТА</span>
            <span className="text-zinc-600">ТВ-СЕТЬ</span>
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

        {/* Переключатель вкладок (PIN vs РАДИОПЕРЕХВАТ МОРЗЕ) */}
        <div className="flex bg-zinc-950/80 p-1 rounded-2xl border border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setTab('PIN');
              triggerHaptic('light');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              tab === 'PIN'
                ? 'bg-zinc-800 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ЦИФРОВОЙ КОД
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('MORSE');
              triggerHaptic('light');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              tab === 'MORSE'
                ? 'bg-zinc-800 text-red-300 border border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            РАДИОПЕРЕХВАТ (МОРЗЕ)
          </button>
        </div>
      </div>

      {/* Дисплей набранного кода */}
      <div className="flex flex-col items-center text-center max-w-sm mx-auto w-full space-y-2 mb-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
          {tab === 'PIN' ? 'ЧИСЛОВОЙ ID КОМНАТЫ (НА ЭКРАНЕ ТВ)' : 'ТАКТИЧЕСКИЙ ПОЗЫВНОЙ (4–5 СИГНАЛОВ)'}
        </div>

        {tab === 'PIN' ? (
          /* Дисплей 5-значного PIN */
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className={`w-12 h-14 rounded-2xl border flex items-center justify-center text-2xl font-black font-mono shadow-inner transition-all ${
                  pin[idx]
                    ? 'border-cyan-500/80 bg-zinc-900/90 text-zinc-100 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : idx === pin.length
                      ? 'border-cyan-400 bg-zinc-950 text-cyan-400 animate-pulse'
                      : 'border-white/10 bg-zinc-950/40 text-zinc-700'
                }`}
              >
                {pin[idx] || '•'}
              </div>
            ))}
          </div>
        ) : (
          /* Дисплей введенных сигналов Морзе */
          <div className="flex items-center justify-center gap-2 h-14 px-4 rounded-2xl bg-zinc-950/90 border border-white/10 w-full shadow-inner">
            {[0, 1, 2, 3, 4].map((idx) => {
              const sym = morseBuffer[idx];
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-center transition-all ${
                    sym === '.'
                      ? 'w-7 h-7 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.9)]'
                      : sym === '-'
                        ? 'w-12 h-6 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.9)]'
                        : idx === morseBuffer.length
                          ? 'w-6 h-6 rounded-full border-2 border-dashed border-cyan-400/60 animate-pulse'
                          : 'w-6 h-6 rounded-full border border-white/10 bg-zinc-900/40'
                  }`}
                />
              );
            })}
          </div>
        )}

        {errorMessage && (
          <div className="p-2 px-3 rounded-xl bg-red-950/60 border border-red-500/50 text-xs font-mono text-red-300 animate-fadeIn">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Основной интерактивный блок */}
      <div className="my-auto flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        {tab === 'PIN' ? (
          /* Цифровая клавиатура (Numpad) */
          <div className="w-full space-y-4">
            <div className="grid grid-cols-3 gap-2.5 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => {
                    soundManager.play('click');
                    if (btn === 'C') {
                      handleClear();
                    } else if (btn === '⌫') {
                      handleBackspace();
                    } else {
                      triggerHaptic('light');
                      setPin((prev) => (prev.length < 5 ? prev + btn : prev));
                    }
                  }}
                  className={`py-3.5 rounded-2xl border text-lg font-black font-mono transition active:scale-95 cursor-pointer ${
                    btn === 'C'
                      ? 'bg-zinc-950/60 border-white/10 text-zinc-500 hover:text-zinc-300'
                      : btn === '⌫'
                        ? 'bg-zinc-950/60 border-white/10 text-red-400 hover:text-red-300'
                        : 'bg-zinc-900/80 border-white/10 text-zinc-100 hover:border-white/25 shadow-md'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Радиоперехват (Крупная кнопка распознавания tap / hold) */
          <div className="w-full flex flex-col items-center space-y-4">
            {/* Большая тактическая кнопка Морзе */}
            <button
              type="button"
              aria-label="Ключ телеграфа"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => {
                if (isKeyDown) {
                  handlePointerUp();
                } else {
                  soundManager.stopMorseTone();
                }
              }}
              className={`w-40 h-40 rounded-full border-4 flex flex-col items-center justify-center transition-all select-none touch-none cursor-pointer active:scale-95 shadow-2xl relative ${
                isKeyDown
                  ? 'bg-cyan-500 border-cyan-300 text-zinc-950 shadow-[0_0_40px_rgba(6,182,212,0.8)] scale-95'
                  : 'bg-zinc-900/90 border-white/20 text-zinc-300 hover:border-cyan-400 shadow-[0_0_25px_rgba(0,0,0,0.8)]'
              }`}
            >
              <span className="text-3xl font-mono mb-1 font-black">
                {isKeyDown ? '[СИГНАЛ]' : '● / ▬'}
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest">
                {isKeyDown ? 'ПЕРЕДАЧА...' : 'РАДИОПЕРЕХВАТ'}
              </span>
              <span className="text-[9px] font-mono text-zinc-400 mt-1">
                ТАП: • | УДЕРЖАНИЕ: —
              </span>
            </button>

            {/* Подсказка тайминга и кнопки коррекции */}
            <div className="flex items-center justify-between w-full px-2 pt-1">
              <button
                onClick={handleClear}
                disabled={!morseBuffer}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-zinc-900/60 text-xs font-mono uppercase text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Сброс (C)
              </button>

              <span className="text-[10px] font-mono text-zinc-500 text-center">
                &lt;250мс: ТОЧКА | ≥250мс: ТИРЕ
              </span>

              <button
                onClick={handleBackspace}
                disabled={!morseBuffer}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-zinc-900/60 text-xs font-mono uppercase text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Удалить (⌫)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Нижняя кнопка подключения */}
      <div className="space-y-2 max-w-sm mx-auto w-full pt-2">
        <Button
          variant="primary-info"
          fullWidth
          onClick={handleResolveAndConnect}
          disabled={!isReady || isSearching}
          className="h-14 rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer"
        >
          {isSearching
            ? 'ПОИСК ЛОББИ В СЕТИ...'
            : tab === 'PIN'
              ? 'ПОДКЛЮЧИТЬСЯ ПО PIN'
              : 'РАДИОПЕРЕХВАТ: НАЙТИ ЛОББИ'}
        </Button>
      </div>
    </div>
  );
};
