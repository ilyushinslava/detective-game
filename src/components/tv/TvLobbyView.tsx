import React, { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import type { GameModeType } from '../../types/game';

interface TvLobbyViewProps {
  roomCode: string;
  players?: Record<string, { nickname: string; isHost?: boolean }>;
  connectedPlayers?: Record<string, { nickname: string; isHost?: boolean }>;
  onStartGame?: (mode: GameModeType, isPassAndPlay: boolean) => void;
  onExit?: () => void;
}

export const TvLobbyView: React.FC<TvLobbyViewProps> = ({
  roomCode,
  players = {},
  connectedPlayers,
  onStartGame,
  onExit,
}) => {
  const joinUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    return `${origin}${pathname}?clientType=CONTROLLER&room=${roomCode}`;
  }, [roomCode]);

  const [selectedMode, setSelectedMode] = useState<GameModeType>('MANIAC_VS_OPERATIVE');
  const [isPassAndPlay, setIsPassAndPlay] = useState<boolean>(false);
  const [focusArea, setFocusArea] = useState<'FORMAT' | 'MODES' | 'START' | 'EXIT'>('MODES');
  const [focusedModeIndex, setFocusedModeIndex] = useState<number>(0);

  const DIGIT_TO_MORSE: Record<string, string> = {
    '0': '-----',
    '1': '.----',
    '2': '..---',
    '3': '...--',
    '4': '....-',
    '5': '.....',
          '6': '-....',
      '7': '--...',
      '8': '---..',
      '9': '----.',
    };

    const _dummyOldMorse: Record<string, string> = {
    '7': '--...',
    '8': '---..',
    '9': '----.',
  };

  const _oldDigitToMorse: Record<string, string> = {
    '0': '-----',
    '1': '•----',
    '2': '••---',
    '3': '•••--',
    '4': '••••-',
    '5': '•••••',
    '6': '-••••',
    '7': '--•••',
    '8': '---••',
    '9': '----•',
  };

  const GAME_MODES: Array<{ id: GameModeType; label: string; badge: string }> = [
    { id: 'MANIAC_VS_OPERATIVE', label: 'Маньяк', badge: '4 ЦЕЛИ' },
    { id: 'THIEF_HUNT', label: 'Грабитель', badge: '10 КРАЖ' },
    { id: 'SECRET_SERVICE', label: 'Разведка', badge: 'ШПИОНЫ' },
    { id: 'LINE_UP', label: 'Дуэль', badge: 'ДОСЬЕ' },
  ];

      const rawPlayers = (connectedPlayers && Object.keys(connectedPlayers).length > 0)
    ? connectedPlayers
    : players;
  const playerList = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers || {});
  const canStart = isPassAndPlay ? playerList.length >= 1 : playerList.length >= 2;

  const roomMorse = useMemo(() => {
    return String(roomCode).split('').map((c) => DIGIT_TO_MORSE[c] || c).join('   ');
  }, [roomCode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.keyCode === 40) {
        e.preventDefault();
        setFocusArea((prev) => {
          if (prev === 'FORMAT') return 'MODES';
          if (prev === 'MODES') return 'START';
          return prev;
        });
      } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
        e.preventDefault();
        setFocusArea((prev) => {
          if (prev === 'START' || prev === 'EXIT') return 'MODES';
          if (prev === 'MODES') return 'FORMAT';
          return prev;
        });
      } else if (e.key === 'ArrowLeft' || e.keyCode === 37) {
        e.preventDefault();
        if (focusArea === 'FORMAT') {
          setIsPassAndPlay(false);
        } else if (focusArea === 'MODES') {
          setFocusedModeIndex((idx) => {
            const nextIdx = Math.max(0, idx - 1);
            setSelectedMode(GAME_MODES[nextIdx].id);
            return nextIdx;
          });
        } else if (focusArea === 'START') {
          setFocusArea('EXIT');
        }
      } else if (e.key === 'ArrowRight' || e.keyCode === 39) {
        e.preventDefault();
        if (focusArea === 'FORMAT') {
          setIsPassAndPlay(true);
        } else if (focusArea === 'MODES') {
          setFocusedModeIndex((idx) => {
            const nextIdx = Math.min(GAME_MODES.length - 1, idx + 1);
            setSelectedMode(GAME_MODES[nextIdx].id);
            return nextIdx;
          });
        } else if (focusArea === 'EXIT') {
          setFocusArea('START');
        }
      } else if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32) {
        e.preventDefault();
        if (focusArea === 'START') {
          if (canStart) onStartGame?.(selectedMode, isPassAndPlay);
        } else if (focusArea === 'EXIT') {
          onExit?.();
        } else if (focusArea === 'FORMAT') {
          setIsPassAndPlay((prev) => !prev);
        } else if (focusArea === 'MODES') {
          setSelectedMode(GAME_MODES[focusedModeIndex].id);
        }
      } else if (e.key === 'Escape' || e.keyCode === 27 || e.keyCode === 4) {
        e.preventDefault();
        onExit?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusArea, focusedModeIndex, selectedMode, isPassAndPlay, canStart, onStartGame, onExit]);

  return (
    <div className="flex h-screen w-screen flex-col justify-between bg-[#06070a] text-zinc-100 select-none p-6 lg:p-8 overflow-hidden font-sans">
      {/* Шапка */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full bg-red-600 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
          <h1 className="text-2xl font-black uppercase tracking-widest text-zinc-100">
            Реквием <span className="text-red-500">Party Host</span>
          </h1>
        </div>
        <div className="text-sm font-mono uppercase tracking-wider text-zinc-400">
          Подключите смартфоны к игре
        </div>
      </div>

      {/* Основной контент лобби */}
      <div className="grid grid-cols-12 gap-6 my-auto flex-1 min-h-0 items-center w-full max-w-6xl mx-auto">
        {/* Левая колонка: QR-код и прямой адрес */}
        <div className="col-span-6 flex flex-col items-center justify-center p-5 lg:p-6 rounded-3xl bg-zinc-950/80 border border-zinc-800/80 shadow-2xl text-center">
          <div className="p-3 lg:p-4 rounded-2xl bg-white shadow-inner mb-4">
            <QRCodeSVG value={joinUrl} size={170} level="M" />
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
            Наведите камеру смартфона для входа
          </div>
          <div className="text-[11px] font-mono text-zinc-600 truncate max-w-xs">
            {joinUrl}
          </div>
        </div>

        {/* Правая колонка: PIN-код и слоты игроков */}
        <div className="col-span-6 flex flex-col justify-between gap-6">
          {/* Карточка PIN-кода */}
          <div className="p-5 lg:p-6 rounded-3xl bg-zinc-950/80 border border-zinc-800/80 shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
              ИЛИ ВВЕДИТЕ 5-ЗНАЧНЫЙ PIN-КОД
            </div>
            <div className="text-5xl lg:text-6xl font-black font-mono tracking-widest text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]">
              {roomCode}
            </div>
            <div className="mt-3 p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-red-400 tracking-wider">КЛЮЧ МОРЗЕ:</span>
              <span className="font-mono text-xs font-bold text-zinc-200 tracking-widest">{roomMorse}</span>
            </div>
            <div className="text-xs text-zinc-400 mt-2">
              Откройте сайт игры на телефоне и укажите этот номер комнаты
            </div>
          </div>

          {/* Слоты подключения контроллеров */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">РЕЖИМ ИГРЫ</span>
              <div className="flex gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-[10px] font-black uppercase">
                <button
                  type="button"
                  onClick={() => setIsPassAndPlay(false)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${!isPassAndPlay ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'} ${focusArea === 'FORMAT' && !isPassAndPlay ? 'ring-2 ring-blue-400 scale-105' : ''}`}
                >
                  2+ ТЕЛЕФОНА
                </button>
                <button
                  type="button"
                  onClick={() => setIsPassAndPlay(true)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${isPassAndPlay ? 'bg-red-600 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'} ${focusArea === 'FORMAT' && isPassAndPlay ? 'ring-2 ring-red-400 scale-105' : ''}`}
                >
                  PASS & PLAY
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {GAME_MODES.map((m, idx) => {
                const isSelected = selectedMode === m.id;
                const isFocused = focusArea === 'MODES' && focusedModeIndex === idx;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMode(m.id);
                      setFocusedModeIndex(idx);
                      setFocusArea('MODES');
                    }}
                    className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      isFocused
                        ? 'ring-2 ring-blue-400 scale-105 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10'
                        : ''
                    } ${
                      isSelected
                        ? 'bg-zinc-900 border-red-500 text-zinc-100 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                        : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold uppercase">{m.badge}</span>
                    <span className="text-[9px] font-black uppercase tracking-tight">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

                      <div className="grid grid-cols-2 gap-3 max-h-40 lg:max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {playerList.length === 0 ? (
                <div className="col-span-2 p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 flex flex-col items-center justify-center text-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                    Ожидание подключения первого смартфона...
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600">
                    Отсканируйте QR-код или введите PIN
                  </span>
                </div>
              ) : (
                playerList.map((player, index) => (
              <div
                key={index}
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  player
                    ? 'bg-zinc-900/90 border-zinc-700 shadow-lg'
                    : 'bg-zinc-950/40 border-zinc-800/60 border-dashed'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Игрок {index + 1}
                  </span>
                  {player?.isHost && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-300 font-bold uppercase">
                      HOST
                    </span>
                  )}
                </div>
                <div className="text-sm font-black text-zinc-100 truncate">
                  {player ? player.nickname : 'Ожидание подключения...'}
                </div>
                <div className="text-[11px] mt-1 font-mono">
                  {player ? (
                    <span className="text-emerald-400 font-semibold">КОНТРОЛЛЕР ПОДКЛЮЧЕН</span>
                  ) : (
                    <span className="text-zinc-600">Свободно</span>
                  )}
                </div>
                              </div>
              )))}
            </div>

          {/* dead code removed */ false && (
          <div className="grid grid-cols-2 gap-4">
            {/* Слот 1 */}
            <div className={`p-5 rounded-2xl border transition-all duration-300 ${
              p1 ? 'bg-zinc-900/90 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-zinc-950/40 border-zinc-800/60 border-dashed'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-zinc-400">{p1 ? '[CTRL]' : '[WAIT]'}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Слот 1 (Охотник)</span>
              </div>
              <div className="text-base font-black text-zinc-100 truncate">
                {p1 ? p1.nickname : 'Ожидание подключения...'}
              </div>
              <div className="text-[11px] mt-1 font-mono text-zinc-500">
                {p1 ? 'КОНТРОЛЛЕР ГОТОВ' : 'Свободно'}
              </div>
            </div>

            {/* Слот 2 */}
            <div className={`p-5 rounded-2xl border transition-all duration-300 ${
              p2 ? 'bg-zinc-900/90 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-zinc-950/40 border-zinc-800/60 border-dashed'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-zinc-400">{p2 ? '[CTRL]' : '[WAIT]'}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Слот 2 (Свидетель)</span>
              </div>
              <div className="text-base font-black text-zinc-100 truncate">
                {p2 ? p2.nickname : 'Ожидание подключения...'}
              </div>
              <div className="text-[11px] mt-1 font-mono text-zinc-500">
                {p2 ? 'КОНТРОЛЛЕР ГОТОВ' : 'Свободно'}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Нижняя панель действий */}
      <div className="flex items-center justify-between border-t border-zinc-800/80 pt-5">
        <button
          onClick={onExit}
          className={`px-6 py-3 rounded-full border border-zinc-800 bg-zinc-900/80 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition cursor-pointer ${
            focusArea === 'EXIT' ? 'ring-2 ring-blue-400 scale-105 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''
          }`}
        >
          В меню
        </button>

        <button
          onClick={() => onStartGame?.(selectedMode, isPassAndPlay)}
          disabled={!canStart}
          className={`px-10 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all shadow-xl ${
            focusArea === 'START' && canStart ? 'ring-2 ring-white scale-105' : ''
          } ${
            canStart
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] cursor-pointer active:scale-95'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
          }`}
        >
          НАЧАТЬ МАТЧ
        </button>
      </div>
    </div>
  );
};

