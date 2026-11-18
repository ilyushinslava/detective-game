import React from "react";
import { Button } from "../ui/Button";
import { getGameModeTitle } from "../../constants/gameMeta";
import { DEFAULT_BET } from "../../constants/gameRules";

interface RoomItemCardProps {
  room: any;
  gameModes: any[];
  onSelectPrivateRoom: (room: any) => void;
  onJoinRoom: (roomCode: string, mode: any) => void;
  isJoining?: boolean;
}

export const RoomItemCard: React.FC<RoomItemCardProps> = ({
  room,
  gameModes,
  onSelectPrivateRoom,
  onJoinRoom,
  isJoining = false,
}) => {
  const modeMeta = gameModes.find((m: any) => m.id === room.mode);
  const modeTitle = modeMeta?.title || getGameModeTitle(room.mode, "ru") || room.mode;
  const isPrivateRoom = Boolean(room.isPrivate);
  const isFull = (room.playersCount || 0) >= (room.maxPlayers || 2);
  const isInGame = room.status === "PLAYING" || room.status === "IN_GAME";

  return (
    <div className="bg-gradient-to-br from-background-surface/90 to-background-main/80 hover:from-background-surface hover:to-background-surface/80 border border-border-subtle hover:border-accent-primary/50 border-t border-t-border-strong rounded-2xl p-4 flex flex-col gap-3.5 backdrop-blur-2xl shadow-lg hover:shadow-neon-blue hover:scale-[1.01] transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-background-panel border border-white/10 flex items-center justify-center text-[10px] text-zinc-300 font-mono font-bold shrink-0">
              {room.hostName ? room.hostName.charAt(0).toUpperCase() : "И"}
            </div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest truncate">
              {room.hostName || "Игрок"}
            </span>
            {isPrivateRoom && (
              <span className="text-[10px] font-mono font-bold text-zinc-300 bg-zinc-900/80 border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1.5 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-zinc-400">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                ЗАКРЫТАЯ
              </span>
            )}
          </div>
          <span className="text-xs sm:text-sm font-black text-zinc-100 uppercase tracking-wider truncate group-hover:text-white transition-colors">
            {modeTitle}
          </span>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
            {isInGame ? (
              <>
                <span className="w-2 h-2 bg-amber-400 rounded-full" />
                В ИГРЕ
              </>
            ) : isFull ? (
              <>
                <span className="w-2 h-2 bg-zinc-500 rounded-full" />
                ЗАПОЛНЕНО
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                ОЖИДАНИЕ
              </>
            )}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono tracking-wider">
            Игроки: {room.playersCount}/{room.maxPlayers}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 bg-black/50 px-3 py-1 rounded-full border border-white/10 text-amber-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-amber-400 shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" />
          </svg>
          <span className="text-xs font-mono font-bold text-amber-400">{room.bet || DEFAULT_BET}</span>
        </div>

        {isPrivateRoom ? (
          <Button
            variant="secondary"
            disabled={isFull || isInGame}
            onClick={() => onSelectPrivateRoom(room)}
            className={`px-5 h-10 text-xs font-mono font-bold uppercase tracking-wider rounded-xl border border-white/15 ${
              isFull || isInGame
                ? "text-zinc-600 border-white/5 bg-zinc-950/40 cursor-not-allowed"
                : "text-zinc-200 hover:border-white/30 hover:text-white bg-zinc-900/90 shadow-md cursor-pointer"
            }`}
          >
            {isFull ? "ЗАПОЛНЕНО" : "Ввести шифр ➔"}
          </Button>
        ) : isJoining ? (
          <Button
            variant="primary-info"
            disabled
            className="px-5 h-10 text-xs font-mono font-bold uppercase tracking-wider rounded-xl bg-blue-700/80 text-white border border-blue-400/30 flex items-center gap-2 cursor-wait shadow-neon-blue"
          >
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
            ВХОД...
          </Button>
        ) : isFull || isInGame ? (
          <Button
            variant="secondary"
            disabled
            className="px-5 h-10 text-xs font-mono font-bold uppercase tracking-wider rounded-xl border border-white/5 text-zinc-600 bg-zinc-950/40 cursor-not-allowed"
          >
            {isInGame ? "ИДЁТ МАТЧ" : "СТОЛ ПОЛОН"}
          </Button>
        ) : (
          <Button
            variant="primary-info"
            onClick={() => onJoinRoom(room.roomCode, room.mode)}
            className="px-5 h-10 text-xs font-mono font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-neon-blue border border-blue-400/30 cursor-pointer transition active:scale-95 duration-75"
          >
            Войти ➔
          </Button>
        )}
      </div>
    </div>
  );
};
