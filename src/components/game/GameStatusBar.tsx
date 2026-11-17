import React from "react";
import type { Character, GameState } from "../../types/game";
import { SPY_COLORS } from "../../types/game";
import { getGameModeTitle } from "../../constants/gameMeta";

export interface GameStatusBarProps {
  gameState: GameState;
  allChars: Character[];
}

export const GameStatusBar: React.FC<GameStatusBarProps> = ({
  gameState,
  allChars,
}) => {
  return (
    <>
      {gameState.mode === "SECRET_SERVICE" ? (
        <div className="w-full px-3 md:px-6 py-1.5 md:py-2 bg-zinc-950/90 border-b border-zinc-900 flex flex-col gap-1 text-[10px] md:text-xs text-zinc-400 shrink-0">
          <div className="flex items-center justify-between w-full">
            <span className="text-zinc-400 font-medium">Компромат агентов:</span>
            <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
              <span className="font-bold text-zinc-300">
                {getGameModeTitle(gameState.mode, "ru")}
              </span>
              <span className="text-zinc-600">•</span>
              <span>
                {gameState.opponent === "ONLINE"
                  ? "онлайн"
                  : gameState.opponent === "AI"
                  ? "против бота"
                  : "вдвоем"}
              </span>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 pt-1 border-t border-white/[0.04]">
            {gameState.spies?.map((spy, idx) => {
              const color = SPY_COLORS[idx % SPY_COLORS.length];
              return (
                <div
                  key={spy.id}
                  className="flex items-center gap-1.5 bg-zinc-900/80 border border-white/10 px-2 py-0.5 rounded-md font-mono text-[11px] shrink-0 shadow-sm"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${color.bg} border ${color.border} shrink-0`}
                  />
                  <span className="text-zinc-300 font-medium">{spy.name}:</span>
                  <b className={`${color.text} font-black`}>
                    {spy.trophies}/{gameState.spyTargetTrophies}
                  </b>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="w-full px-3 md:px-6 py-1.5 md:py-2 bg-zinc-950/90 border-b border-zinc-900 flex items-center justify-between text-[10px] md:text-xs text-zinc-400 shrink-0">
          {gameState.mode === "LINE_UP" ? (
            <div className="flex items-center gap-3">
              <span className="text-red-400 font-bold">Штрафы:</span>
              <span>
                Следствие:{" "}
                <b className="text-zinc-200">
                  {gameState.duelPenalties?.DETECTIVE ?? 0}
                </b>
              </span>
              <span>
                Подозреваемый:{" "}
                <b className="text-zinc-200">
                  {gameState.duelPenalties?.KILLER ?? 0}
                </b>
              </span>
              <span className="ml-2">
                | Вопросов: {(gameState.duelHistory || []).length}
              </span>
            </div>
          ) : gameState.mode === "THIEF_HUNT" ? (
            <div className="flex items-center gap-1.5">
              <span>Добыча:</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-3.5 h-3.5 text-amber-400 fill-amber-500/20 shrink-0"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" />
              </svg>
              <b className="text-amber-400 font-bold">
                {gameState.trophiesKiller ?? 0}/10
              </b>
              <span className="ml-1">| Улики: {gameState.evidenceDeck.length}</span>
            </div>
          ) : (
            <div className="flex items-center flex-wrap gap-x-1">
              <span>Жертвы:</span>
              <b className="text-red-400">
                {gameState.killCount}/{gameState.mode === "MANIAC_VS_OPERATIVE" ? 4 : 14}
              </b>
              <span className="ml-1">| Улики: {gameState.evidenceDeck.length}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
            <span className="hidden md:inline">Режим:</span>
            <span className="font-bold text-zinc-300">
              {getGameModeTitle(gameState.mode, "ru")}
            </span>
            <span className="text-zinc-600">•</span>
            <span>
              {gameState.opponent === "ONLINE"
                ? "онлайн"
                : gameState.opponent === "AI"
                ? "против бота"
                : "вдвоем"}
            </span>
          </div>
        </div>
      )}

      {/* Окно оперативных показаний / опрос */}
      <div className="w-full px-3 h-8 md:h-12 shrink-0 flex items-center justify-center">
        {gameState.lastInterrogation && !gameState.winner ? (
          <div
            className={`w-full h-full px-2.5 rounded-lg border flex items-center justify-between text-[10px] md:text-sm shadow-sm ${
              gameState.lastInterrogation.isNear
                ? "bg-red-950/80 border-red-700 text-red-200"
                : "bg-zinc-900/90 border-zinc-800 text-zinc-300"
            }`}
          >
            <span className="font-semibold truncate mr-2">
              {gameState.lastInterrogation.interrogator === "DETECTIVE"
                ? `Алиби (${gameState.lastInterrogation.targetName}): враг рядом?`
                : `Жертва (${gameState.lastInterrogation.targetName}): законник рядом?`}
            </span>
            <span
              className={`shrink-0 px-2 py-0.5 rounded text-[10px] md:text-xs font-black uppercase border ${
                gameState.lastInterrogation.isNear
                  ? "bg-red-900 text-red-100 border-red-500 animate-pulse"
                  : "bg-blue-950 text-blue-300 border-blue-700"
              }`}
            >
              {gameState.lastInterrogation.isNear ? "Враг рядом" : "Вне зоны"}
            </span>
          </div>
        ) : gameState.lastSpyInterrogation && !gameState.winner ? (
          <div className="w-full h-full px-2.5 rounded-lg border border-zinc-800 bg-zinc-900/90 flex items-center justify-between text-[10px] md:text-sm shadow-sm">
            <span className="font-bold text-zinc-300 truncate mr-2">
              Допрос:{" "}
              <b className="text-zinc-100">
                {gameState.lastSpyInterrogation.targetName}
              </b>
            </span>
            <div className="flex gap-1.5 shrink-0">
              {gameState.spies?.map((spy) => {
                const hasContact =
                  gameState.lastSpyInterrogation?.raisedHandsPlayerNames.includes(
                    spy.name
                  );
                return (
                  <span
                    key={spy.id}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase border ${
                      hasContact
                        ? "bg-red-950 text-red-400 border-red-700 animate-pulse"
                        : "bg-zinc-950 text-zinc-500 border-zinc-800"
                    }`}
                  >
                    {spy.name.replace("Агент «", "").replace("»", "")}:{" "}
                    {hasContact ? "РЯДОМ" : "НЕТ"}
                  </span>
                );
              })}
            </div>
          </div>
        ) : gameState.mode === "MANIAC_VS_OPERATIVE" &&
          gameState.victimList.length > 0 &&
          !gameState.winner ? (
          <div className="w-full h-full px-2.5 rounded-lg border border-red-900/60 bg-red-950/40 flex items-center justify-between text-[10px] md:text-sm shadow-sm">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-red-400 font-bold uppercase tracking-wider shrink-0 text-[10px] md:text-xs">
                Цель:
              </span>
              <span className="text-zinc-100 font-black truncate">
                {allChars.find((c) => c.id === gameState.victimList[0])?.name ??
                  gameState.victimList[0]}
              </span>
              <span className="text-[10px] md:text-xs font-semibold tracking-normal text-red-400/90 shrink-0">
                (#{gameState.victimList[0].replace("c", "").padStart(2, "0")})
              </span>
            </div>
            <div className="shrink-0 font-medium tracking-normal text-[10px] md:text-xs text-zinc-400 ml-2 flex items-center gap-1">
              <span>В очереди:</span>{" "}
              <b className="font-bold tabular-nums text-red-400">
                {gameState.victimList.length}
              </b>
            </div>
          </div>
        ) : (
          <div className="w-full h-full px-2.5 rounded-lg border border-dashed border-zinc-900 flex items-center justify-center text-[10px] md:text-sm text-zinc-600 font-medium">
            Оперативные показания: ожидание допроса
          </div>
        )}
      </div>
    </>
  );
};
