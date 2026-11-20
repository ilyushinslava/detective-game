import React, { useState, useMemo, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import type { GameModeType } from '../../types/game';
import { GAME_TITLE, GAME_MODES_META } from '../../constants/gameMeta';
import { Button } from '../ui/Button';
import { soundManager } from '../../utils/audio';
import { useSpatialNavigation } from '../../hooks/useSpatialNavigation';
import { safeLocalStorage } from '../../utils/storage';
import { useWakeLock } from '../../hooks/useWakeLock';

export interface TvLobbyViewProps {
  roomCode: string;
  morseCode?: string;
  players?: Record<string, { nickname: string; isHost?: boolean }>;
  connectedPlayers?: Record<string, { nickname: string; isHost?: boolean }>;
  readyClients?: Set<string>;
  selectedMode?: GameModeType;
  roleDistribution?: "RANDOM" | "HOST_KILLER" | "HOST_DETECTIVE";
  roomStatus?: string;
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

const MODE_THEMES: Record<
  GameModeType,
  {
    normal: string;
    selected: string;
    badge: string;
    focus: string;
  }
> = {
  MANIAC_VS_OPERATIVE: {
    normal:
      'bg-gradient-to-br from-red-950/30 via-zinc-950/60 to-black/70 border-red-500/25 border-t-2 border-t-red-500/70 hover:border-red-500/50 text-white/80',
    selected:
      'bg-gradient-to-br from-red-950/70 via-red-900/35 to-black/80 border-red-400/80 border-t-2 border-t-red-400 shadow-[0_0_30px_rgba(225,29,72,0.35)] text-white ring-1 ring-red-400/40',
    badge: 'bg-red-950/80 border border-red-500/50 text-red-200',
    focus:
      'focus:scale-105 focus:border-red-300 focus:bg-gradient-to-br focus:from-red-900/60 focus:to-red-950/90 focus:shadow-[0_0_40px_rgba(225,29,72,0.65),inset_0_0_20px_rgba(255,255,255,0.2)]',
  },
  THIEF_HUNT: {
    normal:
      'bg-gradient-to-br from-amber-950/30 via-zinc-950/60 to-black/70 border-amber-500/25 border-t-2 border-t-amber-500/70 hover:border-amber-500/50 text-white/80',
    selected:
      'bg-gradient-to-br from-amber-950/70 via-amber-900/35 to-black/80 border-amber-400/80 border-t-2 border-t-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.35)] text-white ring-1 ring-amber-400/40',
    badge: 'bg-amber-950/80 border border-amber-500/50 text-amber-200',
    focus:
      'focus:scale-105 focus:border-amber-300 focus:bg-gradient-to-br focus:from-amber-900/60 focus:to-amber-950/90 focus:shadow-[0_0_40px_rgba(245,158,11,0.65),inset_0_0_20px_rgba(255,255,255,0.2)]',
  },
  SECRET_SERVICE: {
    normal:
      'bg-gradient-to-br from-blue-950/30 via-zinc-950/60 to-black/70 border-blue-500/25 border-t-2 border-t-blue-500/70 hover:border-blue-500/50 text-white/80',
    selected:
      'bg-gradient-to-br from-blue-950/70 via-blue-900/35 to-black/80 border-blue-400/80 border-t-2 border-t-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.35)] text-white ring-1 ring-blue-400/40',
    badge: 'bg-blue-950/80 border border-blue-500/50 text-blue-200',
    focus:
      'focus:scale-105 focus:border-blue-300 focus:bg-gradient-to-br focus:from-blue-900/60 focus:to-blue-950/90 focus:shadow-[0_0_40px_rgba(37,99,235,0.65),inset_0_0_20px_rgba(255,255,255,0.2)]',
  },
};

export const TvLobbyView: React.FC<TvLobbyViewProps> = ({
  roomCode,
  morseCode,
  players = {},
  connectedPlayers,
  readyClients,
  selectedMode: propSelectedMode,
  roleDistribution: _roleDistribution,
  roomStatus,
  onStartGame,
  onExit,
  hideExit = false,
}) => {
  useSpatialNavigation({ initialFocusSelector: '[data-tv-start-btn="true"]' });
  useWakeLock({ enabled: true });

  const isLocalDev = useMemo(() => {
    return typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  }, []);

  const [lanHost] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParam = new URLSearchParams(window.location.search).get('lanHost');
      if (urlParam) {
        const clean = urlParam.trim();
        safeLocalStorage.setItem('dev_tv_lan_host', clean);
        return clean;
      }
      return safeLocalStorage.getItem('dev_tv_lan_host') || '';
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

  const activeMode = propSelectedMode || selectedMode;

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
  ];

  const rawPlayers = (connectedPlayers && Object.keys(connectedPlayers).length > 0)
    ? connectedPlayers
    : players;
  const playerEntries = Object.entries(rawPlayers || {});
  const isReadyToStart = roomStatus === "READY_TO_START" || (playerEntries.length >= 2 && playerEntries.every(([id]) => readyClients?.has(id)));
  const canStart = isPassAndPlay ? playerEntries.length >= 1 : isReadyToStart;

  useEffect(() => {
    soundManager.startTvAmbient();
    return () => {
      soundManager.stopTvAmbient();
    };
  }, []);

  const prevPlayerCountRef = useRef(playerEntries.length);
  useEffect(() => {
    if (playerEntries.length > prevPlayerCountRef.current && playerEntries.length >= 2) {
      soundManager.play('confirm');
    }
    prevPlayerCountRef.current = playerEntries.length;
  }, [playerEntries.length]);

  return (
    <div className="flex h-screen w-screen flex-col justify-between bg-background-main text-white select-none p-4 sm:p-5 lg:p-6 overflow-hidden font-sans relative box-border">
      {/* Глубокий кинематографичный градиент: от темно-бордового к глубокому угольному */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,#2d0814_0%,#120c16_45%,theme(colors.background.main)_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(225,29,72,0.1),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent_50%)] pointer-events-none" />

      {/* Верхний лаконичный статус-бар */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-danger shadow-[0_0_10px_rgba(225,29,72,0.8)] animate-pulse shrink-0" />
          <h1 className="text-xl lg:text-2xl font-display font-black uppercase tracking-wider text-white">
            {GAME_TITLE.ru}
          </h1>
        </div>
        {!hideExit && onExit ? (
          <Button
            variant="secondary"
            tabIndex={0}
            onClick={onExit}
            className="px-4 py-1.5 h-9 rounded-xl text-xs font-display font-bold uppercase tracking-[0.2em] bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-white/80 hover:text-white transition-all duration-300 focus:outline-none focus:scale-105 focus:border-white focus:bg-white/20 focus:shadow-[0_0_20px_rgba(255,255,255,0.3)] cursor-pointer"
          >
            В МЕНЮ
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-[0.25em] text-white/70 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <span>ЛОББИ ПАРТИИ</span>
          </div>
        )}
      </div>

      {/* Скрытый контейнер с ссылкой для accessibility и тестов (на экране сырой текст полностью скрыт) */}
      <div className="sr-only" aria-hidden="true">
        {joinUrl}
      </div>

      {/* Основной контент: строго 2 изолированные колонки с эффектом плотного матового стекла */}
      <div className="grid grid-cols-2 gap-6 lg:gap-8 my-auto flex-1 min-h-0 items-stretch w-full max-w-7xl mx-auto relative z-10 py-2">
        
        {/* ЛЕВАЯ КОЛОНКА: Терминал доступа (Чистый QR + Морзе, сбалансированная верстка без пустот) */}
        <div className="neo-card flex flex-col items-center justify-center gap-5 lg:gap-8 p-5 lg:p-6 rounded-3xl border-t-2 border-t-rose-500/60 shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-center h-full min-h-0">
          <div className="w-full flex flex-col items-center">
            <div className="text-rose-200/80 tracking-[0.35em] font-display font-bold text-xs uppercase mb-3">
              ПОДКЛЮЧЕНИЕ СО СМАРТФОНА
            </div>

            {/* Чистый увеличенный QR-код на премиальной белой подложке со свечением */}
            <div className="p-3.5 lg:p-4 rounded-2xl bg-white shadow-[0_0_35px_rgba(255,255,255,0.25)] mb-3 transition-transform duration-300 hover:scale-102">
              <QRCodeSVG value={joinUrl} size={270} level="M" />
            </div>

            <div className="text-sm font-sans text-white/75 max-w-sm mx-auto leading-normal">
              Наведите камеру смартфона для быстрого входа
            </div>
          </div>

          {/* Блок Морзе: крупные контрастные символы для уверенного считывания с 3 метров */}
          <div className="w-full pt-4 border-t border-white/10 flex flex-col items-center shrink-0">
            <div className="text-sm font-display font-black uppercase tracking-[0.3em] text-rose-300 mb-2">
              КОД МОРЗЕ
            </div>

            {/* Крупные визуальные пилюли точек и тире со свечением */}
            <div className="flex flex-nowrap items-center justify-center gap-3.5 py-2 w-full">
              {displayMorse.split('').map((sym, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-center transition-all shrink-0 border border-white/40 ${
                    sym === '.'
                      ? 'w-7 h-7 rounded-full bg-white shadow-[0_0_18px_rgba(244,63,94,0.95)]'
                      : 'w-16 h-7 rounded-full bg-white shadow-[0_0_18px_rgba(244,63,94,0.95)]'
                  }`}
                />
              ))}
            </div>

            <div className="text-xs font-sans text-white/70 mt-2 font-medium">
              Сигналы на пульте: <span className="text-rose-300 font-sans font-bold">Клик = Точка (•)</span>, <span className="text-rose-300 font-sans font-bold">Удержание = Тире (—)</span>
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Панель настроек, Игроки и Кнопка Старта */}
        <div className="flex flex-col justify-between gap-3 lg:gap-4 h-full min-h-0">
          
          {/* Секция 1: Выбор режима и формата с цветовым кодированием */}
          <div className="neo-card p-4 lg:p-5 rounded-3xl border-t-2 border-t-rose-500/60 shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display font-bold uppercase tracking-wider text-white/70">
                РЕЖИМ СЕССИИ
              </span>
              <div className="flex gap-2 bg-black/40 p-1 rounded-2xl border border-white/10 text-xs font-display font-bold uppercase shadow-inner">
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => setIsPassAndPlay(false)}
                  className={`px-3.5 py-1 rounded-xl transition-all duration-300 cursor-pointer ${
                    !isPassAndPlay
                      ? 'bg-rose-950/70 text-rose-100 border border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.35)]'
                      : 'text-white/40 hover:text-white/70'
                  } focus:outline-none focus:scale-105 focus:border-rose-400 focus:shadow-[0_0_25px_rgba(244,63,94,0.5),inset_0_0_12px_rgba(255,255,255,0.2)]`}
                >
                  2+ ТЕЛЕФОНА
                </button>
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => setIsPassAndPlay(true)}
                  className={`px-3.5 py-1 rounded-xl transition-all duration-300 cursor-pointer ${
                    isPassAndPlay
                      ? 'bg-rose-950/70 text-rose-100 border border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.35)]'
                      : 'text-white/40 hover:text-white/70'
                  } focus:outline-none focus:scale-105 focus:border-rose-400 focus:shadow-[0_0_25px_rgba(244,63,94,0.5),inset_0_0_12px_rgba(255,255,255,0.2)]`}
                >
                  PASS & PLAY
                </button>
              </div>
            </div>

            {/* Карточки 3 игровых режимов с сочным цветовым кодированием и объемным фокусом */}
            <div className="grid grid-cols-3 gap-2 lg:gap-2.5">
              {GAME_MODES.map((m) => {
                const isSelected = activeMode === m.id;
                const theme = MODE_THEMES[m.id];
                return (
                  <button
                    key={m.id}
                    type="button"
                    tabIndex={0}
                    onClick={() => {
                      soundManager.play('click');
                      setSelectedMode(m.id);
                    }}
                    className={`p-2.5 lg:p-3 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex flex-col justify-between gap-1.5 backdrop-blur-md ${
                      isSelected ? theme.selected : theme.normal
                    } ${theme.focus} focus:outline-none`}
                  >
                    <div className="flex items-start justify-between w-full gap-1.5">
                      <span className="text-xs lg:text-sm font-display font-black uppercase text-white tracking-wide leading-tight drop-shadow-sm">
                        {m.label}
                      </span>
                      <span className={`text-[9px] lg:text-[10px] font-display font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0 ${theme.badge}`}>
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[11px] font-sans font-normal text-white/70 line-clamp-1">
                      {m.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Секция 2: Зона «ИГРОКИ» — компактная сетка без скроллбара */}
          <div className="neo-card p-4 lg:p-5 rounded-3xl border-t-2 border-t-blue-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex-1 flex flex-col justify-between min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-xs sm:text-sm font-display font-bold uppercase tracking-widest text-zinc-300">
                ИГРОКИ В СЕТИ ({playerEntries.length}/2)
              </span>
              <span className="text-xs font-sans text-white/50 font-medium">
                {isPassAndPlay ? 'Минимум 1 контроллер' : 'Минимум 2 контроллера'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 content-start">
              {playerEntries.length === 0 ? (
                <div className="col-span-2 p-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center text-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  <span className="text-sm font-display font-bold uppercase tracking-wider text-white/70">
                    Ожидание подключения игроков...
                  </span>
                </div>
              ) : (
                playerEntries.map(([id, player], index) => {
                  const isReady = readyClients ? readyClients.has(id) : false;
                  return (
                    <div
                      key={id || index}
                      tabIndex={-1}
                      className={`py-2 px-3 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                        player
                          ? 'bg-gradient-to-r from-blue-950/40 via-slate-900/50 to-black/50 border-blue-500/30 shadow-[0_4px_15px_rgba(0,0,0,0.4)]'
                          : 'bg-white/[0.02] border-dashed border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-8 h-8 rounded-xl bg-blue-950/70 border border-blue-500/40 flex items-center justify-center text-blue-300 font-display font-black text-xs shrink-0 shadow-[0_0_10px_rgba(37,99,235,0.3)]">
                          #{index + 1}
                        </div>
                        <div className="truncate">
                          <div className="text-sm lg:text-base font-display font-black text-white truncate">
                            {player ? player.nickname : 'Ожидание...'}
                          </div>
                          {isReady ? (
                            <div className="text-xs font-sans text-blue-400 flex items-center gap-1.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                              <span>ГОТОВ</span>
                            </div>
                          ) : (
                            <div className="text-xs font-sans text-zinc-400 flex items-center gap-1.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
                              <span>НЕ ГОТОВ</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {player?.isHost && (
                        <span className="text-[10px] font-display font-bold px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-500/50 text-blue-300 shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                          HOST
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Секция 3: Изолированная нижняя панель действий (мощная доминирующая кнопка старта) */}
          <div className="flex items-center gap-3 pt-1 shrink-0 w-full">
            <Button
              variant={canStart ? "primary-danger" : "secondary"}
              data-tv-start-btn="true"
              tabIndex={0}
              onClick={() => {
                if (!canStart) return;
                soundManager.play('confirm');
                onStartGame?.(activeMode, isPassAndPlay);
              }}
              disabled={!canStart}
              className={`w-full h-13 lg:h-14 rounded-2xl font-display font-black uppercase tracking-wider text-base lg:text-lg transition-all duration-300 cursor-pointer ${
                canStart
                  ? 'bg-gradient-to-r from-red-700 via-rose-700 to-red-800 hover:from-red-600 hover:via-rose-600 hover:to-red-700 border border-rose-400/40 text-white shadow-[0_10px_35px_rgba(225,29,72,0.45),inset_0_1px_2px_rgba(255,255,255,0.4)]'
                  : 'bg-white/[0.03] border border-white/10 text-white/30 cursor-not-allowed'
              } focus:outline-none focus:scale-105 focus:border-white focus:shadow-[0_0_55px_rgba(244,63,94,0.7),inset_0_0_20px_rgba(255,255,255,0.35)] active:scale-95`}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                  {canStart ? 'НАЧАТЬ МАТЧ' : 'ОЖИДАНИЕ ГОТОВНОСТИ ИГРОКОВ'}
                </span>
                {canStart && (
                  <span className="text-xs font-sans font-semibold px-2.5 py-0.5 rounded-lg bg-black/40 border border-white/20 text-white/90 shadow-inner">
                    [ENTER]
                  </span>
                )}
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
