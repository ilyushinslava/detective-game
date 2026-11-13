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

  const [lanHost] = useState<string>(() => {
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
    { id: 'MANIAC_VS_OPERATIVE', label: GAME_MODES_META.MANIAC_VS_OPERATIVE.title.ru, badge: '4 ЦЕЛИ', desc: 'Сыщик ловит маньяка на улицах города' },
    { id: 'THIEF_HUNT', label: GAME_MODES_META.THIEF_HUNT.title.ru, badge: '10 КРАЖ', desc: 'Охота за скрывающимся вором' },
    { id: 'SECRET_SERVICE', label: GAME_MODES_META.SECRET_SERVICE.title.ru, badge: 'ШПИОНЫ', desc: 'Тактическая дуэль агентов за кейсы' },
    { id: 'LINE_UP', label: GAME_MODES_META.LINE_UP.title.ru, badge: 'ОПОЗНАНИЕ', desc: 'Интеллектуальная дуэль по досье' },
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
    <div className="flex h-screen w-screen flex-col justify-between bg-[#07080c] text-white select-none p-6 lg:p-10 overflow-hidden font-sans relative">
      {/* Кинематографичный фон: глубокая контрастная глубина без цветного шума */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/15 via-[#07080c] to-[#040507] pointer-events-none" />

      {/* Верхний лаконичный статус-бар */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.8)] shrink-0" />
          <h1 className="text-xl lg:text-2xl font-display font-black uppercase tracking-wider text-white">
            {GAME_TITLE.ru}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-[0.25em] text-white/50">
          <span>ЛОББИ ПАРТИИ</span>
        </div>
      </div>

      {/* Скрытый контейнер с ссылкой для accessibility и тестов (на экране сырой текст полностью скрыт) */}
      <div className="sr-only" aria-hidden="true">
        {joinUrl}
      </div>

      {/* Основной контент: строго 2 изолированные колонки в стиле AAA-консолей */}
      <div className="grid grid-cols-2 gap-8 lg:gap-12 my-auto flex-1 min-h-0 items-stretch w-full max-w-7xl mx-auto relative z-10 py-4">
        
        {/* ЛЕВАЯ КОЛОНКА: Терминал доступа (Чистый QR + Морзе, без технического мусора) */}
        <div className="flex flex-col items-center justify-between p-6 lg:p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl text-center">
          <div className="w-full flex flex-col items-center">
            <div className="text-white/40 tracking-[0.35em] font-light text-xs uppercase mb-4">
              ПОДКЛЮЧЕНИЕ СО СМАРТФОНА
            </div>

            {/* Чистый QR-код на премиальной белой подложке */}
            <div className="p-4 rounded-3xl bg-white shadow-[0_0_35px_rgba(255,255,255,0.2)] mb-4 transition-transform duration-300 hover:scale-102">
              <QRCodeSVG value={joinUrl} size={190} level="M" />
            </div>

            <div className="text-sm font-sans font-light text-white/50 max-w-xs mx-auto">
              Наведите камеру смартфона для быстрого входа
            </div>
          </div>

          {/* Блок Морзе: только чистые сигналы, без цифр и без сырых IP */}
          <div className="w-full pt-4 border-t border-white/10 flex flex-col items-center">
            <div className="text-xs font-display font-bold uppercase tracking-[0.3em] text-white/50 mb-2">
              ШИФР МОРЗЕ
            </div>

            {/* Визуальные пилюли точек и тире */}
            <div className="flex flex-nowrap items-center justify-center gap-3 py-2 w-full">
              {displayMorse.split('').map((sym, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-center transition-all shrink-0 ${
                    sym === '.'
                      ? 'w-7 h-7 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]'
                      : 'w-16 h-7 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]'
                  }`}
                />
              ))}
            </div>

            {/* Крупные символы морзе text-5xl lg:text-6xl */}
            <div className="text-5xl lg:text-6xl font-display font-black tracking-[0.35em] text-white my-1 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
              {displayMorse}
            </div>

            <div className="text-xs font-sans font-light text-white/40">
              Или введите 7 сигналов Морзе на контроллере
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Панель настроек, Оперативники и Кнопка Старта */}
        <div className="flex flex-col justify-between gap-5 h-full">
          
          {/* Секция 1: Выбор режима и формата */}
          <div className="p-5 lg:p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display font-bold uppercase tracking-wider text-white/60">
                РЕЖИМ СЕССИИ
              </span>
              <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs font-display font-bold uppercase">
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => setIsPassAndPlay(false)}
                  className={`px-4 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                    !isPassAndPlay
                      ? 'bg-white/20 text-white shadow border border-white/20'
                      : 'text-white/40 hover:text-white/70'
                  } focus:outline-none focus:ring-4 focus:ring-white focus:bg-white/20 focus:scale-[1.03] shadow-[0_0_20px_rgba(255,255,255,0.3)]`}
                >
                  2+ ТЕЛЕФОНА
                </button>
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => setIsPassAndPlay(true)}
                  className={`px-4 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                    isPassAndPlay
                      ? 'bg-white/20 text-white shadow border border-white/20'
                      : 'text-white/40 hover:text-white/70'
                  } focus:outline-none focus:ring-4 focus:ring-white focus:bg-white/20 focus:scale-[1.03] shadow-[0_0_20px_rgba(255,255,255,0.3)]`}
                >
                  PASS & PLAY
                </button>
              </div>
            </div>

            {/* Карточки 4 игровых режимов: дорогой минимализм без толстых цветных рамок */}
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
                    className={`p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white/50'
                        : 'bg-black/40 border-white/10 hover:border-white/20 text-white/70'
                    } focus:outline-none focus:ring-4 focus:ring-white focus:bg-white/20 focus:scale-[1.03] shadow-[0_0_25px_rgba(255,255,255,0.3)]`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-base font-display font-black uppercase text-white tracking-wide">
                        {m.label}
                      </span>
                      <span className="text-[10px] font-display font-bold px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/80 uppercase">
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-xs font-sans font-light text-white/50 line-clamp-1">
                      {m.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Секция 2: Зона «ОПЕРАТИВНИКИ» */}
          <div className="p-5 lg:p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl flex-1 flex flex-col justify-between min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <span className="text-xs font-display font-bold uppercase tracking-wider text-white/60">
                ОПЕРАТИВНИКИ В СЕТИ ({playerList.length}/6)
              </span>
              <span className="text-xs font-sans font-light text-white/40">
                {isPassAndPlay ? 'Минимум 1 контроллер' : 'Минимум 2 контроллера'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-40 custom-scrollbar pr-1 flex-1">
              {playerList.length === 0 ? (
                <div className="col-span-2 p-5 rounded-2xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-white/40 animate-pulse" />
                  <span className="text-xs font-display font-bold uppercase tracking-wider text-white/60">
                    Ожидание подключения оперативников...
                  </span>
                </div>
              ) : (
                playerList.map((player, index) => (
                  <div
                    key={index}
                    tabIndex={0}
                    className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                      player
                        ? 'bg-white/10 border-white/20 shadow-md'
                        : 'bg-white/5 border-dashed border-white/10'
                    } focus:outline-none focus:ring-4 focus:ring-white focus:bg-white/20 focus:scale-[1.03] shadow-[0_0_20px_rgba(255,255,255,0.3)]`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-display font-black text-xs shrink-0">
                        #{index + 1}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-display font-black text-white truncate">
                          {player ? player.nickname : 'Ожидание...'}
                        </div>
                        <div className="text-[11px] font-sans font-light text-emerald-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>ГОТОВ</span>
                        </div>
                      </div>
                    </div>
                    {player?.isHost && (
                      <span className="text-[10px] font-display font-bold px-2 py-0.5 rounded-md bg-white/20 border border-white/30 text-white shrink-0">
                        HOST
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Секция 3: Изолированная нижняя панель действий */}
          <div className="flex items-center justify-between gap-4 pt-1 shrink-0">
            {!hideExit && (
              <Button
                variant="secondary"
                tabIndex={0}
                onClick={onExit}
                className="px-6 h-15 rounded-2xl text-sm font-display font-bold uppercase tracking-wider text-white/70 hover:text-white transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white focus:bg-white/20 focus:scale-[1.03] shadow-[0_0_20px_rgba(255,255,255,0.3)]"
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
              className={`flex-1 h-15 rounded-2xl font-display font-black uppercase tracking-wider text-xl transition-all duration-300 cursor-pointer ${
                canStart
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]'
                  : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
              } focus:outline-none focus:ring-4 focus:ring-white focus:scale-[1.03] shadow-[0_0_30px_rgba(255,255,255,0.4)]`}
            >
              <div className="flex items-center justify-center gap-3">
                <span>НАЧАТЬ МАТЧ</span>
                <span className="text-xs font-sans font-medium px-2.5 py-0.5 rounded-lg bg-black/40 border border-white/20 text-white/80">
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
