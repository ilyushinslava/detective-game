import React, { useState, useMemo, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import type { GameModeType } from '../../types/game';
import { GAME_TITLE, GAME_MODES_META } from '../../constants/gameMeta';
import { Button } from '../ui/Button';
import { soundManager } from '../../utils/audio';
import { useSpatialNavigation } from '../../hooks/useSpatialNavigation';

export interface TvLobbyViewProps {
  roomCode: string;
  morseCode?: string;
  players?: Record<string, { nickname: string; isHost?: boolean }>;
  connectedPlayers?: Record<string, { nickname: string; isHost?: boolean }>;
  onStartGame?: (mode: GameModeType, isPassAndPlay: boolean) => void;
  onExit?: () => void;
  hideExit?: boolean;
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
  hideExit = false,
}) => {
  useSpatialNavigation({ initialFocusSelector: '[data-tv-start-btn="true"]' });

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
      return localStorage.getItem('dev_tv_lan_host') || '';
    }
    return '';
  });

  const [isEditingLan, setIsEditingLan] = useState(false);
  const [lanInput, setLanInput] = useState('');

  const handleSaveLan = () => {
    const trimmed = lanInput.trim();
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
    const cleanRoomCode = encodeURIComponent(roomCode || '');
    return `${origin}${pathname}?room=${cleanRoomCode}&clientType=CONTROLLER`;
  }, [isLocalDev, lanHost, roomCode]);

  const [selectedMode, setSelectedMode] = useState<GameModeType>('MANIAC_VS_OPERATIVE');
  const [isPassAndPlay, setIsPassAndPlay] = useState<boolean>(false);

  // Мгновенный детерминированный расчет Морзе без зависания на ответе сервера
  const displayMorse = useMemo(() => {
    if (morseCode && morseCode.trim().length > 0) {
      return morseCode.trim();
    }
    return getDeterministicMorse(roomCode || '00000');
  }, [morseCode, roomCode]);

  const GAME_MODES: Array<{ id: GameModeType; label: string; badge: string; desc: string }> = [
    { id: 'MANIAC_VS_OPERATIVE', label: GAME_MODES_META.MANIAC_VS_OPERATIVE.title.ru, badge: '4 ЦЕЛИ', desc: 'Сыщик ловит маньяка до 4 убийств' },
    { id: 'THIEF_HUNT', label: GAME_MODES_META.THIEF_HUNT.title.ru, badge: '10 КРАЖ', desc: 'Охота на неуловимого грабителя' },
    { id: 'SECRET_SERVICE', label: GAME_MODES_META.SECRET_SERVICE.title.ru, badge: 'ШПИОНЫ', desc: 'Битва разведслужб за портфели' },
    { id: 'LINE_UP', label: GAME_MODES_META.LINE_UP.title.ru, badge: 'ДУЭЛЬ', desc: 'Тактическое вычисление досье врага' },
  ];

  const rawPlayers = (connectedPlayers && Object.keys(connectedPlayers).length > 0)
    ? connectedPlayers
    : players;
  const playerList = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers || {});
  const canStart = isPassAndPlay ? playerList.length >= 1 : playerList.length >= 2;

  // Кинематографичный аудио-эмбиент для лобби ТВ на Web Audio API
  useEffect(() => {
    soundManager.startTvAmbient();
    return () => {
      soundManager.stopTvAmbient();
    };
  }, []);

  const prevPlayerCountRef = useRef(playerList.length);
  useEffect(() => {
    if (playerList.length > prevPlayerCountRef.current && playerList.length >= 2) {
      soundManager.play('confirm');
    }
    prevPlayerCountRef.current = playerList.length;
  }, [playerList.length]);

  return (
    <div className="flex h-screen w-screen flex-col justify-between bg-[#07080c] text-white select-none p-6 lg:p-10 overflow-hidden font-sans relative">
      {/* Мягкая контровая подсветка нео-нуара */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-blue-950/10 to-[#050608] pointer-events-none" />

      {/* Верхняя статусная шапка */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full bg-red-600 animate-pulse shadow-[0_0_16px_rgba(239,68,68,0.9)] shrink-0" />
          <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-wider text-white">
            {GAME_TITLE.ru} <span className="text-red-500 font-bold text-xl lg:text-2xl">TV HOST</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-zinc-900/70 backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-zinc-200">
            ШТАБ ПРИЕМА ОПЕРАТИВНИКОВ
          </span>
        </div>
      </div>

      {/* Основной контент лобби: строго 2 изолированные колонки (grid-cols-2) */}
      <div className="grid grid-cols-2 gap-8 lg:gap-12 my-auto flex-1 min-h-0 items-stretch w-full max-w-7xl mx-auto relative z-10 py-4">
        
        {/* ЛЕВАЯ КОЛОНКА: Терминал доступа (QR + Морзе) */}
        <div className="flex flex-col items-center justify-between p-6 lg:p-8 rounded-3xl bg-gradient-to-b from-slate-900/50 via-zinc-950/90 to-black/90 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-center overflow-hidden">
          <div className="w-full">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 font-bold text-xs uppercase tracking-widest mb-4">
              <span>СКАНИРУЙТЕ ДЛЯ ПОДКЛЮЧЕНИЯ</span>
            </div>

            {/* Подложка QR-кода */}
            <div className="mx-auto w-fit p-4 rounded-3xl bg-white shadow-[0_0_40px_rgba(255,255,255,0.25)] border-2 border-white/40 mb-4 transition-transform hover:scale-102">
              <QRCodeSVG value={joinUrl} size={220} level="M" />
            </div>

            <div className="text-2xl font-black uppercase tracking-wide text-white mb-1">
              КОМНАТА #{roomCode || '-----'}
            </div>
            <div className="text-sm font-medium text-zinc-400 max-w-xs mx-auto mb-2">
              Наведите камеру смартфона. Подключение без установки приложения.
            </div>
            <div className="text-xs font-mono text-zinc-400 truncate max-w-sm bg-zinc-900/80 px-4 py-1 rounded-full border border-white/10 mx-auto mb-3">
              {joinUrl}
            </div>
          </div>

          {/* Блок Морзе-шифра */}
          <div className="w-full pt-4 border-t border-white/10 flex flex-col items-center">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400 mb-2">
              ШИФР МОРЗЕ
            </div>

            {/* Визуальные пилюли Морзе */}
            <div className="flex flex-nowrap items-center justify-center gap-3 py-2 w-full">
              {displayMorse.split('').map((sym, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-center transition-all shrink-0 ${
                    sym === '.'
                      ? 'w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.9)]'
                      : 'w-14 lg:w-18 h-7 lg:h-8 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.9)]'
                  }`}
                />
              ))}
            </div>

            {/* Крупные символы морзе text-5xl */}
            <div className="text-5xl lg:text-6xl font-black tracking-[0.3em] text-white my-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
              {displayMorse}
            </div>

            <div className="text-xs text-zinc-400 font-medium">
              Введите {displayMorse.length} сигналов на экране смартфона
            </div>

            {isLocalDev && (
              <div className="mt-3 text-xs text-zinc-400">
                LAN IP: <span className="text-emerald-400 font-bold">{lanHost || 'localhost'}</span>
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => {
                    const input = prompt('Укажите IP вашего ПК в Wi-Fi сети (например 192.168.1.50:5173):', lanHost);
                    if (input !== null) {
                      setLanInput(input);
                      setLanHost(input.trim());
                      localStorage.setItem('dev_tv_lan_host', input.trim());
                    }
                  }}
                  className="ml-2 text-red-400 underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
                >
                  [Сменить IP]
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Панель настроек, Оперативники и Кнопка Старта */}
        <div className="flex flex-col justify-between gap-5 h-full overflow-hidden">
          
          {/* Секция 1: Выбор режима и формата */}
          <div className="p-5 lg:p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-xl backdrop-blur-xl space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-zinc-300">
                ФОРМАТ СЕССИИ
              </span>
              <div className="flex gap-2 bg-zinc-900/90 p-1.5 rounded-2xl border border-white/10 text-xs font-black uppercase">
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => setIsPassAndPlay(false)}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer font-bold focus:outline-none focus:ring-8 focus:ring-red-600 focus:bg-red-900/50 focus:scale-105 active:scale-95 ${
                    !isPassAndPlay
                      ? 'bg-zinc-800 text-white shadow border border-white/20'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  2+ ТЕЛЕФОНА
                </button>
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => setIsPassAndPlay(true)}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer font-bold focus:outline-none focus:ring-8 focus:ring-red-600 focus:bg-red-900/50 focus:scale-105 active:scale-95 ${
                    isPassAndPlay
                      ? 'bg-red-600 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  PASS & PLAY
                </button>
              </div>
            </div>

            {/* Карточки 4 игровых режимов */}
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              {GAME_MODES.map((m) => {
                const isSelected = selectedMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    tabIndex={0}
                    onClick={() => {
                      soundManager.play('click');
                      setSelectedMode(m.id);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 focus:outline-none focus:ring-8 focus:ring-red-600 focus:bg-red-900/50 focus:scale-105 active:scale-95 ${
                      isSelected
                        ? 'bg-gradient-to-br from-red-950/80 to-zinc-900 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] ring-2 ring-red-500/80'
                        : 'bg-zinc-900/60 border-white/10 hover:border-white/30 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm lg:text-base font-black uppercase text-white tracking-wide">
                        {m.label}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/50 border border-white/10 text-red-400 uppercase">
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium line-clamp-1">
                      {m.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Секция 2: Выделенная зона «ОПЕРАТИВНИКИ» */}
          <div className="p-5 lg:p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-xl backdrop-blur-xl flex-1 flex flex-col justify-between min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-zinc-300">
                ОПЕРАТИВНИКИ В СЕТИ ({playerList.length}/6)
              </span>
              <span className="text-xs font-medium text-zinc-400">
                {isPassAndPlay ? 'Требуется минимум 1 игрок' : 'Требуется минимум 2 игрока'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-44 custom-scrollbar pr-1 flex-1">
              {playerList.length === 0 ? (
                <div className="col-span-2 p-5 rounded-2xl border border-dashed border-white/15 bg-zinc-900/30 flex flex-col items-center justify-center text-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <span className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                    Ожидание подключения первого смартфона...
                  </span>
                  <span className="text-xs text-zinc-500">
                    Отсканируйте QR-код в левой колонке
                  </span>
                </div>
              ) : (
                playerList.map((player, index) => (
                  <div
                    key={index}
                    tabIndex={0}
                    className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between focus:outline-none focus:ring-8 focus:ring-red-600 focus:bg-red-900/50 focus:scale-105 ${
                      player
                        ? 'bg-zinc-900/90 border-white/15 shadow-lg'
                        : 'bg-zinc-950/30 border-dashed border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 font-black text-sm shrink-0">
                        #{index + 1}
                      </div>
                      <div className="truncate">
                        <div className="text-base font-black text-white truncate">
                          {player ? player.nickname : 'Ожидание...'}
                        </div>
                        <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>ПОДКЛЮЧЕН</span>
                        </div>
                      </div>
                    </div>
                    {player?.isHost && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-950 border border-blue-500/50 text-blue-300 shrink-0">
                        HOST
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Секция 3: Изолированная нижняя панель действий (без наложений!) */}
          <div className="flex items-center justify-between gap-4 pt-2 shrink-0">
            {!hideExit && (
              <Button
                variant="secondary"
                tabIndex={0}
                onClick={onExit}
                className="px-8 h-16 rounded-2xl text-base font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition focus:outline-none focus:ring-8 focus:ring-red-600 focus:bg-red-900/50 focus:scale-105 active:scale-95"
              >
                В меню
              </Button>
            )}

            <Button
              variant="primary-danger"
              data-tv-start-btn="true"
              tabIndex={0}
              onClick={() => {
                soundManager.play('confirm');
                onStartGame?.(selectedMode, isPassAndPlay);
              }}
              disabled={!canStart}
              className={`flex-1 h-16 rounded-2xl font-black uppercase tracking-wider text-xl lg:text-2xl shadow-[0_0_35px_rgba(239,68,68,0.5)] transition-all cursor-pointer focus:outline-none focus:ring-8 focus:ring-red-600 focus:bg-red-900/50 focus:scale-105 active:scale-95 ${
                canStart ? 'bg-red-600 hover:bg-red-500 text-white' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <span>НАЧАТЬ МАТЧ</span>
                <span className="text-sm font-bold px-3 py-1 rounded-lg bg-black/40 border border-white/20">
                  [ENTER]
                </span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
