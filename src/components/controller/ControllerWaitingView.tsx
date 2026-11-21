import React from "react";
import type { GameState, Character } from "../../types/game";
import { CharacterCard } from "../CharacterCard";
import { ThinkingBanner } from "../ui/ThinkingBanner";
import { triggerHaptic } from "../../utils/haptics";
import { ControllerIcons } from "./controllerIcons";
import { DetectiveNotebookModal } from "./DetectiveNotebookModal";
import { Icons as UiIcons } from "../ui/Icons";

interface ControllerWaitingViewProps {
  isKiller: boolean;
  roleName: string;
  myCharacter: Character | null;
  neighbors: Character[];
  activeAIThinking: boolean;
  isPeeking: boolean;
  setIsPeeking: (val: boolean) => void;
  isNotebookOpen: boolean;
  setIsNotebookOpen: (val: boolean) => void;
  onExit?: () => void;
  gameState: GameState;
  currentMatchCharacters: Character[];
  marks: Record<string, any>;
  notes: string;
  cycleMark: (id: string) => void;
  setMark: (id: string, mark: any) => void;
  setNotesText: (text: string) => void;
  clearNotebook: () => void;
  renderConnectionLossOverlay: () => React.ReactNode;
  renderOpponentReconnectingBanner: () => React.ReactNode;
  isHost?: boolean;
  onOpenTvRemote?: () => void;
  isLocalSfxEnabled?: boolean;
  onToggleLocalSfx?: () => void;
}

export const ControllerWaitingView: React.FC<ControllerWaitingViewProps> = ({
  isKiller,
  roleName,
  myCharacter,
  neighbors,
  activeAIThinking,
  isPeeking,
  setIsPeeking,
  isNotebookOpen,
  setIsNotebookOpen,
  onExit,
  gameState,
  currentMatchCharacters,
  marks,
  notes,
  cycleMark,
  setMark,
  setNotesText,
  clearNotebook,
  renderConnectionLossOverlay,
  renderOpponentReconnectingBanner,
  isHost,
  onOpenTvRemote,
  isLocalSfxEnabled,
  onToggleLocalSfx,
}) => {
  return (
    <div
      className="flex h-[100dvh] w-full max-w-full flex-col items-center justify-between bg-[#07090e] p-4 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-zinc-100 select-none font-sans overflow-y-auto overflow-x-hidden relative overscroll-none touch-manipulation touch-pan-y"
      style={{ overscrollBehavior: "none", touchAction: "manipulation" }}
    >
      {/* Деликатный фирменный Neo-Noir фон со свечением */}
      <div
        className={`absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,${
          isKiller ? "rgba(225,29,72,0.22)" : "rgba(37,99,235,0.22)"
        },transparent_70%)] pointer-events-none`}
      />
      <div
        className={`absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,${
          isKiller ? "rgba(225,29,72,0.10)" : "rgba(37,99,235,0.10)"
        },transparent_50%)] pointer-events-none`}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.03),transparent_40%)] pointer-events-none" />

      {/* Верхняя статусная строка синхронизации */}
      <div className="w-full flex justify-between items-center border-b border-white/10 pb-2.5 gap-2 relative z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              isKiller
                ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]"
                : "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"
            }`}
          />
          <span className="text-[11px] sm:text-xs font-display uppercase tracking-wider text-zinc-200 font-bold truncate">
            ПОДКЛЮЧЕНО К ТВ
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Тумблер звука */}
          {onToggleLocalSfx && (
            <button
              type="button"
              onClick={onToggleLocalSfx}
              title={isLocalSfxEnabled ? "Звук контроллера: Вкл" : "Звук контроллера: Выкл"}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md ${
                isLocalSfxEnabled
                  ? 'bg-blue-950/80 border-blue-500/60 text-blue-400 shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                  : 'bg-zinc-900/80 border-white/10 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {isLocalSfxEnabled ? <UiIcons.VolumeOn className="w-4 h-4" /> : <UiIcons.VolumeOff className="w-4 h-4" />}
            </button>
          )}

          {/* Блокнот */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setIsNotebookOpen(true);
            }}
            className="h-11 min-h-[44px] px-2.5 sm:px-3 rounded-xl bg-zinc-900/90 border border-white/15 text-xs font-sans font-bold uppercase tracking-wider text-zinc-200 hover:border-blue-400 hover:text-white transition shadow-sm active:scale-95 cursor-pointer backdrop-blur-md flex items-center gap-1.5"
          >
            <ControllerIcons.Notebook />
            <span className="hidden xs:inline sm:inline">БЛОКНОТ</span>
          </button>

          {/* ТВ Пульт Хоста */}
          {isHost && onOpenTvRemote && (
            <button
              type="button"
              data-testid="host-tv-remote-btn"
              onClick={() => {
                triggerHaptic("medium");
                onOpenTvRemote();
              }}
              title="ТВ Пульт Хоста"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-blue-950/80 border border-blue-500/60 text-blue-400 hover:text-white hover:border-blue-400 flex items-center justify-center transition shadow-sm active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <UiIcons.Tv className="w-4 h-4" />
            </button>
          )}

          {/* Выйти */}
          {onExit && !isHost && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onExit();
              }}
              className="h-11 min-h-[44px] px-2 text-xs font-sans font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition cursor-pointer flex items-center rounded-lg hover:bg-zinc-900/50"
            >
              Выход
            </button>
          )}
        </div>
      </div>

      {/* Центральный блок: Тактический радар ожидания */}
      <div className="my-auto flex flex-col items-center max-w-sm w-full px-1 py-1 sm:py-2 relative z-10">
        <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full border border-white/10 bg-zinc-950/60 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)] mb-2 sm:mb-3">
          <div className="absolute inset-1.5 sm:inset-2 rounded-full border border-white/5" />
          <div className="absolute inset-4 sm:inset-6 rounded-full border border-white/5" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-px bg-white/5" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-px bg-white/5" />
          </div>

          <div
            className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-zinc-950 border border-white/15 flex items-center justify-center z-10 shadow-2xl ${
              isKiller ? "text-rose-400" : "text-blue-400"
            }`}
          >
            <ControllerIcons.Radar />
          </div>
        </div>

        <h2 className="font-display text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-1">
          {activeAIThinking ? "ХОД ПРОТИВНИКА" : "ОЖИДАНИЕ"}
        </h2>

        {activeAIThinking ? (
          <div className="w-full my-2">
            <ThinkingBanner label="СИСТЕМА АНАЛИЗИРУЕТ" />
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-white/10 shadow-sm mb-2">
            <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${isKiller ? "bg-rose-400" : "bg-blue-400"}`} />
            <span className="font-display text-[11px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider">
              СЕЙЧАС ХОД СОПЕРНИКА
            </span>
          </div>
        )}

        <p className="text-[11px] sm:text-xs text-zinc-400 leading-snug max-w-xs mb-2 sm:mb-3 font-sans">
          {activeAIThinking
            ? "Искусственный интеллект рассчитывает оптимальные векторы маневра и цели."
            : "Сейчас ход другого игрока. Следите за происходящим на телевизоре."}
        </p>

        {/* Карточка досье игрока */}
        <div className="p-2.5 sm:p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/60 via-zinc-950/90 to-slate-950/80 border border-white/10 w-full text-left shadow-xl backdrop-blur-xl mb-2 sm:mb-3">
          <div className="text-[10px] font-display font-bold uppercase tracking-widest text-zinc-400 mb-1.5 flex items-center justify-between">
            <span>ВАША РОЛЬ • ВАШЕ ДОСЬЕ</span>
            <span className="text-zinc-400 font-display text-[9px] font-bold tracking-wider">ПРИВАТНО</span>
          </div>
          <div
            onPointerDown={() => setIsPeeking(true)}
            onPointerUp={() => setIsPeeking(false)}
            onPointerLeave={() => setIsPeeking(false)}
            onPointerCancel={() => setIsPeeking(false)}
            className="flex items-center gap-3 cursor-pointer select-none"
            title="Удерживайте для просмотра"
          >
            {isPeeking && myCharacter ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 bg-zinc-900 shrink-0 shadow-md">
                <CharacterCard
                  mode={gameState?.mode || "MANIAC_VS_OPERATIVE"}
                  character={myCharacter}
                  isSelected={false}
                  isPVP={true}
                  onClick={() => {}}
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl border border-white/10 bg-zinc-900/90 flex flex-col items-center justify-center text-zinc-400 shrink-0 shadow-inner">
                <ControllerIcons.Eye />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm ${
                    isKiller
                      ? "bg-rose-950/80 border-rose-600/60 text-rose-200 shadow-rose-950/40"
                      : roleName === "Полиция" || roleName === "ПОЛИЦИЯ"
                      ? "bg-blue-900/40 border-blue-700/50 text-blue-300"
                      : "bg-blue-950/80 border-blue-600/60 text-blue-200 shadow-blue-950/40"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isKiller ? "bg-rose-400" : "bg-blue-400"}`} />
                  {roleName}
                </span>
                {myCharacter && (
                  <span className="text-[10px] font-mono text-zinc-400">
                    #{myCharacter.id.replace("c", "").padStart(2, "0")}
                  </span>
                )}
              </div>
              <div className="text-xs sm:text-sm font-bold text-zinc-100 leading-tight break-words mt-1 font-sans">
                {isPeeking && myCharacter ? myCharacter.name : "•••••••• (Удерживайте)"}
              </div>
            </div>
          </div>
        </div>

        {/* Сводка соседей персонажа */}
        {neighbors.length > 0 && (
          <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-slate-900/40 via-zinc-950/70 to-slate-950/70 border border-white/10 w-full text-left shadow-lg backdrop-blur-md">
            <div className="text-[10px] font-display font-bold uppercase tracking-widest text-zinc-400 mb-1.5 flex items-center justify-between">
              <span>ВАШИ СОСЕДИ</span>
              <span className="text-zinc-400 font-mono">({neighbors.length})</span>
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {neighbors.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-zinc-900/90 border border-white/10 text-[10px] sm:text-[11px] font-mono text-zinc-300 shadow-xs"
                >
                  <span className="text-blue-400/80 font-bold">#{c.id.replace("c", "").padStart(2, "0")}</span>
                  <span className="font-sans font-semibold text-zinc-200">{c.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] font-sans text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-2 relative z-10 shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
        Дождитесь своего хода • Смотрите на ТВ
      </div>

      <DetectiveNotebookModal
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
        characters={currentMatchCharacters}
        marks={marks}
        notes={notes}
        onCycleMark={cycleMark}
        onSetMark={setMark}
        onSetNotesText={setNotesText}
        onUpdateNote={setNotesText}
        onClearNotebook={clearNotebook}
        onClear={clearNotebook}
      />

      {renderConnectionLossOverlay()}
      {renderOpponentReconnectingBanner()}
    </div>
  );
};
