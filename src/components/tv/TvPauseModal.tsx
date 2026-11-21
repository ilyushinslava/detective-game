import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../ui/Button';
import { roomCodeToMorse } from './TvLobbyView';

export interface TvPauseModalProps {
  isOpen: boolean;
  focusedControl?: 'NONE' | 'CONTINUE' | 'RESTART' | 'EXIT';
  onClose?: () => void;
  onResume?: () => void;
  onRestart?: () => void;
  onExit?: () => void;
  hideExit?: boolean;
  activeDisconnected?: any;
  tvGraceLeft?: number;
  roomCode?: string;
  morseCode?: string;
  disconnectedPlayer?: {
    playerId?: string;
    role?: string;
    name?: string;
  } | null;
  gracePeriodSeconds?: number;
}

export const TvPauseModal: React.FC<TvPauseModalProps> = ({
  isOpen,
  focusedControl = 'NONE',
  onClose,
  onResume,
  onRestart,
  onExit,
  hideExit = false,
  activeDisconnected: propActiveDisconnected,
  tvGraceLeft: propTvGraceLeft,
  roomCode,
  morseCode,
  disconnectedPlayer: propDisconnectedPlayer,
  gracePeriodSeconds = 60,
}) => {
  const effectiveDisconnected = propActiveDisconnected || propDisconnectedPlayer;
  const isDisconnected = Boolean(effectiveDisconnected);

  const initialSeconds = typeof propTvGraceLeft === 'number'
    ? propTvGraceLeft
    : (gracePeriodSeconds ?? 60);

  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (typeof propTvGraceLeft === 'number') {
      setTimeLeft(propTvGraceLeft);
    }
  }, [propTvGraceLeft]);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(initialSeconds);
      return;
    }

    if (!isDisconnected) return;

    // Если propTvGraceLeft не передаётся динамически извне, ведём локальный обратный отсчёт
    if (typeof propTvGraceLeft !== 'number') {
      setTimeLeft(initialSeconds);
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen, isDisconnected, initialSeconds, propTvGraceLeft]);

  const handleResume = () => {
    if (onResume) onResume();
    else if (onClose) onClose();
  };

  const isTimeExpired = isDisconnected && timeLeft === 0;

  // Формируем чистый URL для контроллера аналогично TvLobbyView
  const getControllerJoinUrl = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const cleanRoomCode = encodeURIComponent(roomCode || '');
    return `${origin}${pathname}?room=${cleanRoomCode}&clientType=CONTROLLER`;
  };

  const qrUrl = getControllerJoinUrl();
  const effectiveMorse = morseCode || (roomCode ? roomCodeToMorse(roomCode) : '');

  // 1. Аварийный режим отключения игрока (2 колонки: статус + QR/Морзе)
  if (isDisconnected) {
    const rawName =
      effectiveDisconnected?.nickname ||
      effectiveDisconnected?.name;
    const playerName =
      rawName && !rawName.startsWith('client_') && rawName !== effectiveDisconnected?.clientId
        ? rawName
        : 'Игрок';

    const playerRole =
      effectiveDisconnected?.role === 'criminal' || effectiveDisconnected?.role === 'KILLER'
        ? 'Преступник'
        : 'Детектив';

    return (
      <div
        data-testid="tv-player-disconnected-banner"
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-6 select-none font-sans"
      >
        <div className={`neo-card w-full max-w-4xl border-t-2 ${isTimeExpired ? 'border-t-rose-600' : 'border-t-amber-500'} bg-zinc-950/95 p-8 shadow-2xl relative overflow-hidden transition-all duration-300`}>
          <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
            <div className="flex flex-col gap-1">
              <div className="inline-flex items-center gap-2 text-xs font-display uppercase tracking-wider text-blue-300 font-bold">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isTimeExpired
                      ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                      : 'bg-amber-400 animate-ping'
                  }`}
                />
                <span>ВРЕМЕННАЯ ПАУЗА СВЯЗИ • ТАЙМЕР ХОДА ЗАМОРОЖЕН</span>
              </div>
              <h2 className="text-2xl font-bold tracking-wider text-zinc-100 uppercase font-display">
                {isTimeExpired ? 'Время ожидания истекло' : 'ОЖИДАНИЕ ВОЗВРАЩЕНИЯ ИГРОКА В СЕТЬ'}
              </h2>
            </div>
            {roomCode && (
              <span className="font-mono text-sm tracking-widest text-zinc-300 bg-zinc-900 border border-white/10 px-3 py-1 rounded-xl self-start font-bold">
                #{roomCode}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
            {/* Левая колонка: статус, таймер, пояснения и действия */}
            <div className="flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10">
                  <div className="text-xs uppercase tracking-wider text-zinc-400 font-display font-semibold mb-1">
                    Отключился игрок:
                  </div>
                  <div className="text-lg font-bold text-zinc-100 flex items-center gap-2 font-display">
                    <span className="text-rose-400">{playerName}</span>
                    <span className="text-xs font-sans uppercase px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-white/10 font-bold">
                      {playerRole}
                    </span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 flex flex-col items-center justify-center text-center">
                  <div className="text-xs font-display uppercase text-zinc-400 tracking-widest mb-1 font-semibold">
                    {isTimeExpired ? 'Время ожидания истекло' : 'Окно переподключения'}
                  </div>
                  <div
                    className={`text-5xl font-mono font-bold tracking-widest my-2 ${
                      isTimeExpired ? 'text-rose-500' : 'text-amber-400'
                    }`}
                  >
                    00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        isTimeExpired ? 'bg-rose-600' : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, (timeLeft / (gracePeriodSeconds || 60)) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-zinc-400 mt-3 max-w-xs leading-relaxed font-sans">
                    Сессия и состояние доски зафиксированы. Ход матча заморожен на время ожидания.
                  </p>
                </div>
              </div>

              {/* Кнопки при отключении */}
              <div className="space-y-2.5 pt-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleResume}
                  className="font-sans font-bold tracking-wider uppercase text-sm"
                >
                  ПРОДОЛЖИТЬ ИГРУ
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  {onRestart && (
                    <Button
                      variant="secondary"
                      onClick={onRestart}
                      data-testid="tv-restart-btn"
                      className="font-sans font-bold text-xs tracking-wider uppercase"
                    >
                      ПЕРЕЗАПУСК
                    </Button>
                  )}
                  {!hideExit && onExit && (
                    <Button
                      variant="danger"
                      onClick={onExit}
                      data-testid="tv-exit-btn"
                      className="font-sans font-bold text-xs tracking-wider uppercase"
                    >
                      ВЫЙТИ В МЕНЮ
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Правая колонка: QR-код для повторного входа и Морзе */}
            <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/40 rounded-2xl border border-white/10 space-y-4">
              <div className="text-center">
                <div className="text-xs font-display uppercase tracking-widest text-zinc-200 font-bold mb-1">
                  Быстрое переподключение
                </div>
                <div className="text-[11px] text-zinc-400 font-sans">
                  Наведите камеру смартфона на QR-код
                </div>
              </div>

              {/* QR-код на белой подложке */}
              <div className="p-3.5 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                <QRCodeSVG
                  value={qrUrl}
                  size={160}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Код Морзе со светящимися пилюлями точек и тире */}
              {effectiveMorse && (
                <div className="w-full text-center space-y-2 pt-2 border-t border-white/10">
                  <div className="text-[11px] font-display font-bold uppercase tracking-[0.2em] text-zinc-300">
                    Резервный ввод (код Морзе)
                  </div>
                  <div className="flex flex-nowrap items-center justify-center gap-2.5 py-1.5 w-full">
                    {effectiveMorse.replace(/\s+/g, '').split('').map((sym, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-center transition-all shrink-0 border border-white/40 ${
                          sym === '.'
                            ? 'w-5 h-5 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.95)]'
                            : 'w-11 h-5 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.95)]'
                        }`}
                      />
                    ))}
                  </div>
                  {effectiveMorse.split(' ').map((chunk, idx) => (
                    <span key={idx} className="sr-only">
                      {chunk}
                    </span>
                  ))}
                  <div className="text-[10px] font-sans text-zinc-400">
                    Клик = Точка (•), Удержание = Тире (—)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Стандартное меню паузы ТВ (по Escape / кнопке пульта)
  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-6 select-none transition-all duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="neo-card w-full max-w-md p-6 sm:p-8 rounded-3xl border-t-2 border-t-blue-500/60 shadow-[0_30px_90px_rgba(0,0,0,0.95)] space-y-6 text-center">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-blue-400 text-xl font-mono">❚❚</span>
            <span className="text-xl sm:text-2xl font-display font-black uppercase text-white tracking-wider">
              ПАУЗА МАТЧА
            </span>
          </div>
          {roomCode && (
            <span className="font-mono text-xs tracking-widest text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded">
              #{roomCode}
            </span>
          )}
        </div>

        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed text-left font-sans">
          Матч временно приостановлен на телевизоре. Выберите действие:
        </p>

        <div className="space-y-3.5">
          <Button
            variant="primary"
            fullWidth
            data-tv-focus-primary="true"
            tabIndex={0}
            onClick={handleResume}
            className={`font-sans font-bold text-sm tracking-wider uppercase ${
              focusedControl === 'CONTINUE'
                ? 'border-2 border-white ring-2 ring-white scale-105 shadow-[0_0_35px_rgba(59,130,246,0.65)]'
                : ''
            }`}
          >
            <span>ПРОДОЛЖИТЬ</span>
          </Button>

          {onRestart && (
            <Button
              variant="secondary"
              fullWidth
              tabIndex={0}
              onClick={onRestart}
              data-testid="tv-restart-btn"
              className={`font-sans font-bold text-sm tracking-wider uppercase ${
                focusedControl === 'RESTART'
                  ? 'border-2 border-white ring-2 ring-white bg-white/20 text-white scale-105 shadow-[0_0_30px_rgba(255,255,255,0.45)]'
                  : ''
              }`}
            >
              <span>ПЕРЕЗАПУСТИТЬ МАТЧ</span>
            </Button>
          )}

          {!hideExit && onExit && (
            <Button
              variant="danger"
              fullWidth
              tabIndex={0}
              onClick={onExit}
              data-testid="tv-exit-btn"
              className={`font-sans font-bold text-sm tracking-wider uppercase ${
                focusedControl === 'EXIT'
                  ? 'border-2 border-white ring-2 ring-red-500 scale-105 shadow-[0_0_35px_rgba(244,63,94,0.7)]'
                  : ''
              }`}
            >
              <span>ВЫЙТИ В ГЛАВНОЕ МЕНЮ</span>
            </Button>
          )}
        </div>

        <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 text-xs sm:text-sm font-sans text-zinc-400 text-left">
          Нажмите [ESC] на пульте или клавишу Назад для закрытия меню паузы.
        </div>
      </div>
    </div>
  );
};

export default TvPauseModal;
