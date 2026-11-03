import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface TvLobbyViewProps {
  roomCode: string;
  players?: Record<string, { nickname: string; isHost?: boolean }>;
  connectedPlayers?: Record<string, { nickname: string; isHost?: boolean }>;
  onStartGame?: () => void;
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

  const playerList = Object.values(connectedPlayers || players || {});
  const canStart = playerList.length >= 2;
  const slotsCount = Math.max(4, playerList.length);
  const slots = Array.from({ length: slotsCount }, (_, i) => playerList[i] || null); // Допускаем старт для соло/pass-and-play или для 2 игроков

  return (
    <div className="flex h-screen w-screen flex-col justify-between bg-[#06070a] text-zinc-100 select-none p-10 font-sans">
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
      <div className="grid grid-cols-12 gap-8 my-auto w-full max-w-6xl mx-auto">
        {/* Левая колонка: QR-код и прямой адрес */}
        <div className="col-span-6 flex flex-col items-center justify-center p-8 rounded-3xl bg-zinc-950/80 border border-zinc-800/80 shadow-2xl text-center">
          <div className="p-4 rounded-2xl bg-white shadow-inner mb-6">
            <QRCodeSVG value={joinUrl} size={220} level="M" />
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
          <div className="p-8 rounded-3xl bg-zinc-950/80 border border-zinc-800/80 shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
              ИЛИ ВВЕДИТЕ 5-ЗНАЧНЫЙ PIN-КОД
            </div>
            <div className="text-6xl font-black font-mono tracking-widest text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]">
              {roomCode}
            </div>
            <div className="text-xs text-zinc-400 mt-2">
              Откройте сайт игры на телефоне и укажите этот номер комнаты
            </div>
          </div>

          {/* Слоты подключения контроллеров */}
          <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {slots.map((player, index) => (
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
            ))}
          </div>

          {false && (
          <div className="grid grid-cols-2 gap-4">
            {/* Слот 1 */}
            <div className={`p-5 rounded-2xl border transition-all duration-300 ${
              p1 ? 'bg-zinc-900/90 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-zinc-950/40 border-zinc-800/60 border-dashed'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{p1 ? '🎮' : '⏳'}</span>
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
                <span className="text-lg">{p2 ? '🎮' : '⏳'}</span>
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
          className="px-6 py-3 rounded-full border border-zinc-800 bg-zinc-900/80 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition cursor-pointer"
        >
          В меню
        </button>

        <button
          onClick={onStartGame}
          disabled={!canStart}
          className={`px-10 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all shadow-xl ${
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
