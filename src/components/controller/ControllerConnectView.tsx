import React, { useState, useRef, useEffect } from 'react';
import { soundManager } from '../../utils/audio';
import { triggerHaptic } from '../../utils/haptics';

interface ControllerConnectViewProps {
  onConnect: (pin: string) => void;
  onBackToMenu: () => void;
}

const MORSE_TO_DIGIT: Record<string, string> = {
  '-----': '0',
  '.----': '1',
  '..---': '2',
  '...--': '3',
  '....-': '4',
  '.....': '5',
  '-....': '6',
  '--...': '7',
  '---..': '8',
  '----.': '9',
};

const _rawMorseToDigit: Record<string, string> = {
  '-----': '0',
  '•----': '1',
  '.----': '1',
  '••---': '2',
  '..---': '2',
  '•••--': '3',
  '...--': '3',
  '••••-': '4',
  '....-': '4',
  '•••••': '5',
  '.....': '5',
  '-••••': '6',
  '—••••': '6',
  '--•••': '7',
  '——•••': '7',
  '---••': '8',
  '———••': '8',
  '----•': '9',
  '————•': '9',
};

export const ControllerConnectView: React.FC<ControllerConnectViewProps> = ({
  onConnect,
  onBackToMenu,
}) => {
  const [tab, setTab] = useState<'PIN' | 'MORSE'>('PIN');
  const [pin, setPin] = useState<string>('');
  const [morseBuffer, setMorseBuffer] = useState<string>('');
  const [isKeyDown, setIsKeyDown] = useState<boolean>(false);
  const pressStartRef = useRef<number>(0);
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitBuffer = (buffer: string) => {
    const clean = buffer.trim();
    if (!clean) return;
    const digit = MORSE_TO_DIGIT[clean];
    if (digit) {
      soundManager.play('impact');
      triggerHaptic('heavy');
      setPin((prev) => (prev.length < 5 ? prev + digit : prev));
    } else {
      soundManager.play('error');
      triggerHaptic('medium');
    }
    setMorseBuffer('');
  };

  useEffect(() => {
    if (morseBuffer.length >= 5) {
      commitBuffer(morseBuffer);
      return;
    }
    if (morseBuffer.length > 0) {
      if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
      resolveTimerRef.current = setTimeout(() => {
        commitBuffer(morseBuffer);
      }, 800);
    }
    return () => {
      if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
    };
  }, [morseBuffer]);

  const handleKeyDown = () => {
    pressStartRef.current = Date.now();
    setIsKeyDown(true);
    soundManager.play('click');
    triggerHaptic('light');
    if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
  };

  const handleKeyUp = () => {
    if (!isKeyDown) return;
    setIsKeyDown(false);
    const duration = Date.now() - pressStartRef.current;
    const symbol = true ? (duration < 200 ? '.' : '-') : duration < 200 ? '•' : '—';
    setMorseBuffer((prev) => (prev.length < 5 ? prev + symbol : prev));
  };

  const handleBackspace = () => {
    triggerHaptic('light');
    soundManager.play('click');
    if (morseBuffer.length > 0) {
      setMorseBuffer((prev) => prev.slice(0, -1));
    } else if (pin.length > 0) {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const isConnectReady = pin.length >= 4;

  return (
    <div className="flex h-[100dvh] w-screen flex-col justify-between bg-[#080a0f] p-5 pb-8 text-zinc-100 select-none overflow-y-auto font-sans">
      {/* Шапка */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">ПОДКЛЮЧЕНИЕ ПУЛЬТА</span>
        </div>
        <button
          onClick={onBackToMenu}
          className="text-xs font-mono uppercase text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
        >
          В МЕНЮ
        </button>
      </div>

      {/* Переключатель вкладок */}
      <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800 my-4 max-w-sm mx-auto w-full shadow-inner">
        <button
          type="button"
          onClick={() => { setTab('PIN'); triggerHaptic('light'); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
            tab === 'PIN' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          ЦИФРОВОЙ ШИФР
        </button>
        <button
          type="button"
          onClick={() => { setTab('MORSE'); triggerHaptic('light'); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
            tab === 'MORSE' ? 'bg-red-950/80 border border-red-700/80 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.3)]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          КЛЮЧ МОРЗЕ
        </button>
      </div>

      {/* Дисплей набранного кода */}
      <div className="flex flex-col items-center text-center max-w-sm mx-auto w-full space-y-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          ШИФР КОМНАТЫ (5 ЗНАКОВ)
        </div>
        <div className="flex items-center justify-center gap-2.5">
          {[0, 1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className={`w-12 h-14 rounded-2xl border flex items-center justify-center text-2xl font-black font-mono shadow-inner transition-all ${
                pin[idx]
                  ? 'border-red-500/80 bg-zinc-900 text-zinc-100 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                  : idx === pin.length
                    ? 'border-zinc-700 bg-zinc-950 text-red-400 animate-pulse'
                    : 'border-zinc-800/80 bg-zinc-950/40 text-zinc-700'
              }`}
            >
              {pin[idx] || '•'}
            </div>
          ))}
        </div>
      </div>

      {/* Основной интерактив */}
      <div className="my-auto flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        {tab === 'PIN' ? (
          <div className="w-full space-y-4">
            <div className="grid grid-cols-3 gap-2.5 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => {
                    soundManager.play('click');
                    if (btn === 'C') {
                      triggerHaptic('medium');
                      setPin('');
                    } else if (btn === '⌫') {
                      handleBackspace();
                    } else {
                      triggerHaptic('light');
                      setPin((prev) => (prev.length < 5 ? prev + btn : prev));
                    }
                  }}
                  className={`py-4 rounded-2xl border text-lg font-black font-mono transition active:scale-95 cursor-pointer ${
                    btn === 'C'
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      : btn === '⌫'
                        ? 'bg-zinc-950 border-zinc-800 text-red-400 hover:text-red-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-100 hover:border-zinc-700 shadow-md'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center space-y-4">
            {/* Буфер ввода Морзе */}
            <div className="h-12 w-full rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center gap-1.5 px-4 shadow-inner">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mr-2">СИГНАЛ:</span>
              <span className="text-2xl font-mono font-black text-red-400 tracking-widest min-w-[80px] text-center">
                {morseBuffer || '•••••'}
              </span>
              {morseBuffer && (
                <button
                  onClick={() => setMorseBuffer('')}
                  className="text-xs text-zinc-500 hover:text-zinc-300 ml-2 font-mono"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Телеграфный ключ */}
            <button
              type="button"
              onPointerDown={handleKeyDown}
              onPointerUp={handleKeyUp}
              onPointerLeave={() => {
                if (isKeyDown) handleKeyUp();
              }}
              className={`w-40 h-40 rounded-full border-4 flex flex-col items-center justify-center transition-all select-none touch-none cursor-pointer active:scale-95 shadow-2xl ${
                isKeyDown
                  ? 'bg-red-600 border-red-400 text-white shadow-[0_0_35px_rgba(239,68,68,0.7)] scale-95'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500 shadow-[0_0_20px_rgba(0,0,0,0.8)]'
              }`}
            >
              <span className="text-3xl font-mono mb-1">{isKeyDown ? '[REC]' : '. / -'}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isKeyDown ? 'СИГНАЛ' : 'ТЕЛЕГРАФ'}
              </span>
              <span className="text-[8px] font-mono text-zinc-400 mt-1">
                &lt;200мс (•) | &gt;200мс (—)
              </span>
            </button>

            {/* Подсказка соответствия цифр Морзе */}
            <div className="grid grid-cols-5 gap-1.5 p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[9px] font-mono text-zinc-400 text-center w-full">
              <div>1: •----</div>
              <div>2: ••---</div>
              <div>3: •••--</div>
              <div>4: ••••-</div>
              <div>5: •••••</div>
              <div>6: -••••</div>
              <div>7: --•••</div>
              <div>8: ---••</div>
              <div>9: ----•</div>
              <div>0: -----</div>
            </div>
          </div>
        )}
      </div>

      {/* Нижняя кнопка подтверждения */}
      <div className="space-y-2 max-w-sm mx-auto w-full pt-2">
        <button
          onClick={() => onConnect(pin)}
          disabled={!isConnectReady}
          className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed font-black uppercase tracking-widest text-xs text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] transition cursor-pointer active:scale-[0.98]"
        >
          ВОЙТИ В ИГРУ
        </button>
      </div>
    </div>
  );
};

