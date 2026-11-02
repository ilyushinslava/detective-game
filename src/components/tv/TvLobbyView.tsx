import React, { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";

interface TvLobbyViewProps {
  roomCode: string;
  players: Record<string, { nickname: string; isHost: boolean }>;
  onStartGame?: () => void;
  onExit?: () => void;
}

export const TvLobbyView: React.FC<TvLobbyViewProps> = ({
  roomCode,
  players,
  onStartGame,
  onExit,
}) => {
  const joinUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    return `${origin}${pathname}?room=${roomCode}&clientType=CONTROLLER`;
  }, [roomCode]);

  const playerList = Object.values(players);
  const player1 = playerList[0] || null;
  const player2 = playerList[1] || null;
  const isReadyToStart = playerList.length >= 2;

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-between bg-[#080a0f] p-12 text-zinc-100 select-none">
      {/* Верхний бар */}
      <div className="flex w-full items-center justify-between border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-4 w-4 rounded-full bg-red-600 animate-pulse" />
          <h1 className="text-3xl font-black tracking-widest uppercase text-zinc-100">
            Реквием <span className="text-red-500">Party Host</span>
          </h1>
        </div>
        <div className="text-xl font-mono text-zinc-400">
          Подключите телефоны для игры
        </div>
      </div>

      {/* Центральный блок: QR-код и код комнаты */}
      <div className="grid w-full max-w-6xl grid-cols-2 gap-12 items-center">
        {/* Левая колонка: QR и URL */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/80 p-10 shadow-2xl backdrop-blur-md">
          <div className="rounded-xl bg-white p-4 shadow-inner">
            <QRCodeSVG value={joinUrl} size={280} level="M" />
          </div>
          <p className="mt-6 text-xl text-zinc-400 font-medium text-center">
            Наведите камеру смартфона для быстрого входа
          </p>
        </div>

        {/* Правая колонка: Код комнаты и слоты игроков */}
        <div className="flex flex-col gap-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 shadow-xl">
            <div className="text-sm uppercase tracking-widest text-zinc-500 font-bold">
              Код комнаты
            </div>
            <div className="mt-2 text-7xl font-mono font-black tracking-wider text-red-500">
              {roomCode || "----"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Слот 1 */}
            <div
              className={`flex flex-col items-center justify-center rounded-xl border p-6 text-center transition-all ${
                player1
                  ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400"
                  : "border-dashed border-zinc-800 bg-zinc-900/40 text-zinc-600"
              }`}
            >
              <div className="text-4xl mb-2">{player1 ? "🎮" : "⏳"}</div>
              <div className="text-lg font-bold">
                {player1 ? player1.nickname : "Ожидание игрока 1..."}
              </div>
              <div className="text-xs uppercase tracking-wider text-zinc-500 mt-1">
                {player1 ? "Контроллер подключен" : "Свободный слот"}
              </div>
            </div>

            {/* Слот 2 */}
            <div
              className={`flex flex-col items-center justify-center rounded-xl border p-6 text-center transition-all ${
                player2
                  ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400"
                  : "border-dashed border-zinc-800 bg-zinc-900/40 text-zinc-600"
              }`}
            >
              <div className="text-4xl mb-2">{player2 ? "🎮" : "⏳"}</div>
              <div className="text-lg font-bold">
                {player2 ? player2.nickname : "Ожидание игрока 2..."}
              </div>
              <div className="text-xs uppercase tracking-wider text-zinc-500 mt-1">
                {player2 ? "Контроллер подключен" : "Свободный слот"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Нижний бар управления */}
      <div className="flex w-full items-center justify-between border-t border-zinc-800 pt-6">
        <button
          onClick={onExit}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-8 py-4 text-xl font-bold text-zinc-300 transition-all hover:bg-zinc-800 active:scale-95 focus:outline-none focus:ring-4 focus:ring-zinc-600"
        >
          В меню
        </button>

        {isReadyToStart && (
          <button
            onClick={onStartGame}
            className="rounded-xl bg-red-600 px-12 py-4 text-2xl font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/50 transition-all hover:bg-red-500 active:scale-95 animate-bounce focus:outline-none focus:ring-4 focus:ring-red-400"
          >
            Начать матч
          </button>
        )}
      </div>
    </div>
  );
};
