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

/**
 * Детерминированный конвертер кода комнаты в 7-символьный шифр Морзе.
 * Стандарт приватного подключения Prime Suspect.
 */
export function roomCodeToMorse(code: string): string {
  if (!code) return '.-.-.-.';
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  }
  let res = '';
  for (let i = 0; i < 7; i++) {
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

  // Мгновенная визуализация кода комнаты в виде Морзе (точки и тире)
  const displayMorse = useMemo(() => {
    if (morseCode && morseCode.trim().length >= 4) {
      return morseCode.trim();
    }
    return roomCodeToMorse(roomCode || '00000');
  }, [morseCode, roomCode]);

  const GAME_MODES: Array<{ id: GameModeType; label: string; badge: string; desc: string }> = [
    { id: 'MANIAC_VS_OPERATIVE', label: GAME_MODES_META.MANIAC_VS_OPERATIVE.title.ru, badge: '4 ЦЕЛИ', desc: 'Сыщик ловит маньяка до 4 жертв' },
    { id: 'THIEF_HUNT', label: GAME_MODES_META.THIEF_HUNT.title.ru, badge: '10 КРАЖ', desc: 'Охота на неуловимого грабителя' },
    { id: 'SECRET_SERVICE', label: GAME_MODES_META.SECRET_SERVICE.title.ru, badge: 'ШПИОНЫ', desc: 'Борьба спецслужб за портфели' },
    { id: 'LINE_UP', label: GAME_MODES_META.LINE_UP.title.ru, badge: 'ДУЭЛЬ', desc: 'Тактическое раскрытие досье' },
  ];

  const rawPlayers = (connectedPlayers && Object.keys(connectedPlayers).length > 0)
    ? connectedPlayers
    : players;
  const playerList = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers || {});
  const canStart = isPassAndPlay ? playerList.length >= 1 : playerList.length >= 2;

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
    <div className="flex h-screen w-screen flex-col justify-between bg-[#07080c] text-white select-none p-5 lg:p-8 overflow-hidden font-sans relative">
      {/* Мягкая контровая подсветка нео-нуара */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-blue-950/10 to-[#050608] pointer-events-none" />

      {/* Верхняя статусная шапка */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="h-3.5 w-3.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_14px_rgba(239,68,68,0.9)] shrink-0" />
          <h1 className="text-xl lg:text-2xl font-display font-black uppercase tracking-wider text-white">
            {GAME_TITLE.ru} <span className="text-red-500 font-bold text-lg lg:text-xl">TV HOST</span>
          </h1>
        </div>
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-zinc-900/80 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-xs font-display font-bold uppercase tracking-wider text-zinc-200">
            ШТАБ ПРИЕМА ОПЕРАТИВНИКОВ
          </span>
        </div>
      </div>

      {/* Основной контент: строго 2 изолированные колонки с защитой от обрезки */}
      <div className="grid grid-cols-2 gap-6 lg:gap-8 my-auto flex-1 min-h-0 items-stretch w-full max-w-7xl mx-auto relative z-10 py-3">
        
        {/* ЛЕВАЯ КОЛОНКА: Терминал доступа (QR + Крупный Морзе вместо цифр) */}
        <div className="flex flex-col items-center justify-between p-5 lg:p-6 rounded-3xl bg-gradient-to-b from-slate-900/60 via-zinc-950/90 to-black/95 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-center">
          <div className="w-full flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-950/70 border border-blue-500/40 text-blue-300 font-display font-bold text-xs uppercase tracking-widest mb-3">
              <span>СКАНИРУЙТЕ ДЛЯ ПОДКЛЮЧЕНИЯ</span>
            </div>

            {/* Подложка QR-кода */}
            <div className="p-3.5 rounded-2xl bg-white shadow-[0_0_35px_rgba(255,255,255,0.25)] border-2 border-white/40 mb-3 transition-transform hover:scale-102">
              <QRCodeSVG value={joinUrl} size={190} level="M" />
            </div>

            <div className="text-sm font-sans font-medium text-zinc-300 max-w-xs mx-auto mb-1">
              Наведите камеру смартфона для быстрого входа
            </div>
            <div className="text-[11px] font-mono text-zinc-500 truncate max-w-xs bg-zinc-900/80 px-3 py-0.5 rounded-full border border-white/10 mb-2">
              {joinUrl}
            </div>
          </div>

          {/* Блок Морзе: код комнаты визуализируется ТОЧКАМИ И ТИРЕ, а не цифрами */}
          <div className="w-full pt-3 border-t border-white/10 flex flex-col items-center">
            <div className="text-xs font-display font-bold uppercase tracking-[0.25em] text-red-400 mb-2">
              ШИФР МОРЗЕ
            </div>

            {/* Визуальные пилюли точек и тире под QR */}
            <div className="flex flex-nowrap items-center justify-center gap-2.5 py-2 w-full">
              {displayMorse.split('').map((sym, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-center transition-all shrink-0 ${
                    sym === '.'
                      ? 'w-7 h-7 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.9)]'
                      : 'w-14 lg:w-16 h-7 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.9)]'
                  }`}
                />
              ))}
            </div>

            {/* Крупные символы морзе text-5xl lg:text-6xl */}
            <div className="text-5xl lg:text-6xl font-display font-black tracking-[0.35em] text-white my-1 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              {displayMorse}
            </div>

            <div className="text-xs font-sans text-zinc-400 font-medium">
              Или введите 7 сигналов Морзе на экране смартфона
            </div>

            {isLocalDev && (
              <div className="mt-2 text-[11px] text-zinc-400 font-mono">
                LAN IP: <span className="text-emerald-400 font-bold">{lanHost || 'localhost'}</span>
              </div>
            )}
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Панель настроек, Оперативники и Кнопка Старта */}
        <div className="flex flex-col justify-between gap-4 h-full">
          
          {/* Секция 1: Выбор режима и формата */}
          <div className="p-4 lg:p-5 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-xl backdrop-blur-xl space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display font-bold uppercase tracking-wider text-zinc-300">
                ФОРМАТ СЕССИИ
              </span>
              <div className="flex gap-1.5 bg-zinc-900/90 p-1 rounded-2xl border border-white/10 text-xs font-display font-black uppercase">
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => setIsPassAndPlay(false)}
                  className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-display font-bold focus:outline-none focus:ring-[6px] focus:ring-red-600 focus:bg-red-950/40 focus:scale-[1.03] ${
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
                  className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-display font-bold focus:outline-none focus:ring-[6px] focus:ring-red-600 focus:bg-red-950/40 focus:scale-[1.03] ${
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
            <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
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
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 focus:outline-none focus:ring-[6px] focus:ring-red-600 focus:bg-red-950/40 focus:scale-[1.03] ${
                      isSelected
                        ? 'bg-gradient-to-br from-red-950/80 to-zinc-900 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.4)] ring-2 ring-red-500/80'
                        : 'bg-zinc-900/60 border-white/10 hover:border-white/25 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-display font-black uppercase text-white tracking-wide">
                        {m.label}
                      </span>
                      <span className="text-[10px] font-display font-bold px-2 py-0.5 rounded-full bg-black/60 border border-white/15 text-red-400 uppercase">
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-xs font-sans text-zinc-400 font-medium line-clamp-1">
                      {m.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Секция 2: Выделенная зона «ОПЕРАТИВНИКИ» */}
          <div className="p-4 lg:p-5 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-xl backdrop-blur-xl flex-1 flex flex-col justify-between min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-xs font-display font-bold uppercase tracking-wider text-zinc-300">
                ОПЕРАТИВНИКИ В СЕТИ ({playerList.length}/6)
              </span>
              <span className="text-xs font-sans font-medium text-zinc-400">
                {isPassAndPlay ? 'Минимум 1 игрок' : 'Минимум 2 игрока'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 overflow-y-auto max-h-36 custom-scrollbar pr-1 flex-1">
              {playerList.length === 0 ? (
                <div className="col-span-2 p-4 rounded-2xl border border-dashed border-white/15 bg-zinc-900/30 flex flex-col items-center justify-center text-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <span className="text-xs lg:text-sm font-display font-bold uppercase tracking-wider text-zinc-300">
                    Ожидание подключения первого смартфона...
                  </span>
                  <span className="text-[11px] font-sans text-zinc-500">
                    Отсканируйте QR-код в левой колонке
                  </span>
                </div>
              ) : (
                playerList.map((player, index) => (
                  <div
                    key={index}
                    tabIndex={0}
                    className={`p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between focus:outline-none focus:ring-[6px] focus:ring-red-600 focus:bg-red-950/40 focus:scale-[1.03] ${
                      player
                        ? 'bg-zinc-900/90 border-white/15 shadow-md'
                        : 'bg-zinc-950/30 border-dashed border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-8 h-8 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 font-display font-black text-xs shrink-0">
                        #{index + 1}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-display font-black text-white truncate">
                          {player ? player.nickname : 'Ожидание...'}
                        </div>
                        <div className="text-[11px] font-sans text-emerald-400 font-semibold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>В СЕТИ</span>
                        </div>
                      </div>
                    </div>
                    {player?.isHost && (
                      <span className="text-[10px] font-display font-bold px-2 py-0.5 rounded-md bg-blue-950 border border-blue-500/50 text-blue-300 shrink-0">
                        HOST
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Секция 3: Изолированная нижняя панель действий (без наложений) */}
          <div className="flex items-center justify-between gap-3 pt-1 shrink-0">
            {!hideExit && (
              <Button
                variant="secondary"
                tabIndex={0}
                onClick={onExit}
                className="px-6 h-14 rounded-2xl text-sm font-display font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition focus:outline-none focus:ring-[6px] focus:ring-red-600 focus:bg-red-950/40 focus:scale-[1.03]"
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
              className={`flex-1 h-14 lg:h-15 rounded-2xl font-display font-black uppercase tracking-wider text-lg lg:text-xl shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all cursor-pointer focus:outline-none focus:ring-[6px] focus:ring-red-600 focus:bg-red-950/40 focus:scale-[1.03] ${
                canStart ? 'bg-red-600 hover:bg-red-500 text-white' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <span>НАЧАТЬ МАТЧ</span>
                <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-lg bg-black/40 border border-white/20">
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
