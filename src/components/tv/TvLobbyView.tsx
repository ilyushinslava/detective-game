import React, { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import type { GameModeType } from '../../types/game';
import { GAME_TITLE, GAME_MODES_META } from '../../constants/gameMeta';
import { Button } from '../ui/Button';

export interface TvLobbyViewProps {
  roomCode: string;
  morseCode?: string;
  players?: Record<string, { nickname: string; isHost?: boolean }>;
  connectedPlayers?: Record<string, { nickname: string; isHost?: boolean }>;
  onStartGame?: (mode: GameModeType, isPassAndPlay: boolean) => void;
  onExit?: () => void;
}

export function getDeterministicMorse(roomCode: string): string {
  if (!roomCode) return '.-.-';
  let hash = 0;
  for (let i = 0; i < roomCode.length; i++) {
    hash = (hash * 31 + roomCode.charCodeAt(i)) >>> 0;
  }
  const len = 4 + (hash % 2);
  let res = '';
  for (let i = 0; i < len; i++) {
    res += (hash & (1 << i)) ? '-' : '.';
  }
  return res;
}

export const TvLobbyView: React.FC<TvLobbyViewProps> = ({
  roomCode,
  morseCode,
  players = {},
  connectedPlayers,
  onStartGame,
  onExit,
}) => {
  const isLocalDev = useMemo(() => {
    return typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  }, []);

  const [lanHost, setLanHost] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParam = new URLSearchParams(window.location.search).get('lanHost');
      if (urlParam) {
        const clean = urlParam.trim();
        localStorage.setItem('dev_tv_lan_host', clean);
        return clean;
      }
      return (
        localStorage.getItem('dev_tv_lan_host') ||
        (import.meta.env.VITE_DEV_LAN_HOST as string) ||
        ''
      );
    }
    return '';
  });

  const [isEditingLan, setIsEditingLan] = useState(false);
  const [lanInput, setLanInput] = useState(lanHost);

  const handleSaveLan = () => {
    let trimmed = lanInput.trim();
    if (trimmed && !trimmed.includes(':') && typeof window !== 'undefined' && window.location.port) {
      trimmed = `${trimmed}:${window.location.port}`;
    }
    setLanHost(trimmed);
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem('dev_tv_lan_host', trimmed);
      } else {
        localStorage.removeItem('dev_tv_lan_host');
      }
    }
    setIsEditingLan(false);
  };

  const joinUrl = useMemo(() => {
    let origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (isLocalDev && lanHost) {
      const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
      origin = `${protocol}//${lanHost}`;
    }
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    // QR-код ведет строго на корень приложения (главное меню) без лишних URL-параметров (TASK-NET-002)
    return `${origin}${pathname}`;
  }, [isLocalDev, lanHost]);

  const [selectedMode, setSelectedMode] = useState<GameModeType>('MANIAC_VS_OPERATIVE');
  const [isPassAndPlay, setIsPassAndPlay] = useState<boolean>(false);
  const [focusArea, setFocusArea] = useState<'FORMAT' | 'MODES' | 'START' | 'EXIT'>('MODES');
  const [focusedModeIndex, setFocusedModeIndex] = useState<number>(0);

  const displayMorse = useMemo(() => {
    return morseCode || getDeterministicMorse(roomCode);
  }, [morseCode, roomCode]);

  const GAME_MODES: Array<{ id: GameModeType; label: string; badge: string }> = [
    { id: 'MANIAC_VS_OPERATIVE', label: GAME_MODES_META.MANIAC_VS_OPERATIVE.title.ru, badge: '4 ЦЕЛИ' },
    { id: 'THIEF_HUNT', label: GAME_MODES_META.THIEF_HUNT.title.ru, badge: '10 КРАЖ' },
    { id: 'SECRET_SERVICE', label: GAME_MODES_META.SECRET_SERVICE.title.ru, badge: 'ШПИОНЫ' },
    { id: 'LINE_UP', label: GAME_MODES_META.LINE_UP.title.ru, badge: 'ДОСЬЕ' },
  ];

      const rawPlayers = (connectedPlayers && Object.keys(connectedPlayers).length > 0)
    ? connectedPlayers
    : players;
  const playerList = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers || {});
  const canStart = isPassAndPlay ? playerList.length >= 1 : playerList.length >= 2;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.keyCode === 40 || e.keyCode === 20) {
        e.preventDefault();
        setFocusArea((prev) => {
          if (prev === 'FORMAT') return 'MODES';
          if (prev === 'MODES') return 'START';
          return prev;
        });
      } else if (e.key === 'ArrowUp' || e.keyCode === 38 || e.keyCode === 19) {
        e.preventDefault();
        setFocusArea((prev) => {
          if (prev === 'START' || prev === 'EXIT') return 'MODES';
          if (prev === 'MODES') return 'FORMAT';
          return prev;
        });
      } else if (e.key === 'ArrowLeft' || e.keyCode === 37 || e.keyCode === 21) {
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
      } else if (e.key === 'ArrowRight' || e.keyCode === 39 || e.keyCode === 22) {
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
      } else if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32 || e.keyCode === 23 || e.keyCode === 66) {
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
    <div className="flex h-screen w-screen flex-col justify-between bg-[#080a0f] text-zinc-100 select-none p-6 lg:p-8 overflow-hidden font-sans">
      {/* Шапка */}
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full bg-red-600 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
          <h1 className="text-2xl font-black uppercase tracking-widest text-zinc-100">
            {GAME_TITLE.ru} <span className="text-red-500">Party Host</span>
          </h1>
        </div>
        <div className="text-sm font-mono uppercase tracking-wider text-zinc-400">
          Подключите смартфоны к игре
        </div>
      </div>

      {/* Основной контент лобби */}
      <div className="grid grid-cols-12 gap-6 my-auto flex-1 min-h-0 items-center w-full max-w-6xl mx-auto">
        {/* Левая колонка: QR-код и прямой адрес */}
        <div className="col-span-6 flex flex-col items-center justify-center p-5 lg:p-6 rounded-3xl bg-zinc-950/60 border border-white/10 shadow-2xl backdrop-blur-md text-center">
          <div className="p-3 lg:p-4 rounded-2xl bg-white shadow-inner mb-4">
            <QRCodeSVG value={joinUrl} size={170} level="M" />
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-300 mb-1 font-bold">
            Наведите камеру смартфона, чтобы открыть игру
          </div>
          <div className="text-[11px] text-zinc-400 mb-1">
            Затем нажмите «Подключиться к ТВ»
          </div>
          <div className="text-[11px] font-mono text-zinc-500 truncate max-w-xs">
            {joinUrl}
          </div>
          {isLocalDev && (
            <div className={`mt-3 p-2.5 rounded-xl border text-left text-[11px] font-mono max-w-xs w-full transition-colors ${
              !lanHost ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' : 'bg-zinc-900/90 border-white/10 text-zinc-400'
            }`}>
              {isEditingLan ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-amber-300 font-bold">
                      IP ПК в сети Wi-Fi (для телефонов):
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={lanInput}
                      onChange={(e) => setLanInput(e.target.value)}
                      placeholder={typeof window !== 'undefined' ? `192.168.1.X:${window.location.port || '5173'}` : '192.168.1.50:5173'}
                      className="px-2 py-1 bg-zinc-950 border border-white/20 rounded text-xs text-white flex-1 font-mono focus:outline-none focus:border-red-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveLan}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold cursor-pointer"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingLan(false)}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <span className="text-[9px] text-zinc-500">Порт подставится автоматически</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {!lanHost && (
                    <div className="text-[10px] text-amber-400 font-sans leading-tight">
                      ⚠️ QR-код указывает на localhost. Смартфоны не подключатся без LAN IP.
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="truncate">
                      LAN IP: <span className={lanHost ? 'text-emerald-400 font-bold' : 'text-zinc-200 font-bold'}>{lanHost || 'localhost'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setLanInput(lanHost || (typeof window !== 'undefined' ? `${window.location.hostname}:${window.location.port}` : ''));
                        setIsEditingLan(true);
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 underline ml-2 shrink-0 cursor-pointer font-bold"
                    >
                      {lanHost ? 'Сменить IP' : 'Указать Wi-Fi IP'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Правая колонка: PIN-код и слоты игроков */}
        <div className="col-span-6 flex flex-col justify-between gap-6">
          {/* Карточка PIN-кода и Морзе-позывного */}
          <div className="p-5 lg:p-6 rounded-3xl bg-zinc-950/60 border border-white/10 shadow-2xl backdrop-blur-md">
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
              ЧИСЛОВОЙ ID КОМНАТЫ
            </div>
            <div className="text-5xl lg:text-6xl font-black font-mono tracking-widest text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]">
              {roomCode}
            </div>

            {/* Визуальный паттерн короткого Морзе-кода */}
            <div className="mt-4 p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-cyan-400 tracking-wider">
                  ТАКТИЧЕСКИЙ ПОЗЫВНОЙ (МОРЗЕ):
                </span>
                <span className="font-mono text-xs font-black text-cyan-300 tracking-widest">
                  {displayMorse.split('').map((s) => s === '.' ? '•' : '—').join(' ')}
                </span>
              </div>
              <div className="flex items-center gap-2.5 py-1">
                {displayMorse.split('').map((sym, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-center transition-all ${
                      sym === '.'
                        ? 'w-6 h-6 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.9)]'
                        : 'w-14 h-6 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.9)]'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="text-xs text-zinc-400 mt-3">
              Откройте игру на телефоне, нажмите «Подключиться к ТВ» и укажите числовой ID либо отстучите позывной Морзе.
            </div>
          </div>

          {/* Слоты подключения контроллеров */}
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/10 shadow-lg backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">РЕЖИМ ИГРЫ</span>
              <div className="flex gap-1.5 bg-zinc-900 p-1 rounded-xl border border-white/10 text-[10px] font-black uppercase">
                <button
                  type="button"
                  onClick={() => setIsPassAndPlay(false)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${!isPassAndPlay ? 'bg-zinc-800 text-zinc-100 shadow border border-white/10' : 'text-zinc-500 hover:text-zinc-300'} ${focusArea === 'FORMAT' && !isPassAndPlay ? 'ring-2 ring-cyan-400 scale-105' : ''}`}
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
                        ? 'ring-2 ring-cyan-400 scale-105 shadow-[0_0_15px_rgba(6,182,212,0.4)] z-10'
                        : ''
                    } ${
                      isSelected
                        ? 'bg-zinc-900 border-red-500/80 text-zinc-100 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                        : 'bg-zinc-950/40 border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                    }`}
                  >
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 border border-white/10 text-zinc-300 font-bold uppercase">{m.badge}</span>
                    <span className="text-[9px] font-black uppercase tracking-tight">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 max-h-40 lg:max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {playerList.length === 0 ? (
              <div className="col-span-2 p-6 rounded-2xl border border-white/10 bg-zinc-950/60 flex flex-col items-center justify-center text-center gap-2">
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
                      ? 'bg-zinc-900/80 border-white/10 shadow-lg'
                      : 'bg-zinc-950/30 border-dashed border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Игрок {index + 1}
                    </span>
                    {player?.isHost && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-bold uppercase">
                        HOST
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-zinc-100 truncate">
                    {player ? player.nickname : 'Ожидание подключения...'}
                  </div>
                  <div className="text-[11px] mt-1 font-mono">
                    {player ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                        <span>КОНТРОЛЛЕР ПОДКЛЮЧЕН</span>
                      </div>
                    ) : (
                      <span className="text-zinc-600">Свободно</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Нижняя панель действий */}
      <div className="flex items-center justify-between border-t border-white/10 pt-5">
        <Button
          variant="secondary"
          onClick={onExit}
          className={`px-8 h-12 rounded-full text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white ${
            focusArea === 'EXIT' ? 'ring-2 ring-cyan-400 scale-105 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : ''
          }`}
        >
          В меню
        </Button>

        <Button
          variant="primary-danger"
          onClick={() => onStartGame?.(selectedMode, isPassAndPlay)}
          disabled={!canStart}
          className={`px-12 h-14 rounded-full font-black uppercase tracking-widest text-sm shadow-[0_0_25px_rgba(239,68,68,0.5)] ${
            focusArea === 'START' && canStart ? 'ring-2 ring-white scale-105' : ''
          }`}
        >
          НАЧАТЬ МАТЧ
        </Button>
      </div>
    </div>
  );
};

