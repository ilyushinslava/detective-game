import { useState } from "react";
import type { GameModeType, OpponentType, Role } from "../types/game";
import { GAME_MODES } from "./ModeSelectModal";
import { sounds } from "../utils/audio";
import {
  triggerHaptic,
  getHapticsEnabled,
  setHapticsEnabled,
} from "../utils/haptics";

interface MainMenuProps {
  onStartGame: (
    modeId: GameModeType,
    opponent: OpponentType,
    playerRole: Role,
    playerCount?: number,
    targetTrophies?: number,
    maxTurns?: number,
  ) => void;
  hasActiveGame: boolean;
  onResumeGame: () => void;
}

export const MainMenu = ({
  onStartGame,
  hasActiveGame,
  onResumeGame,
}: MainMenuProps) => {
  const [activeTab, setActiveTab] = useState<"MODES" | "RULES" | "SETTINGS">(
    "MODES",
  );
  const [selectedMode, setSelectedMode] = useState<GameModeType>("SKHVATKA");
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentType>("AI");
  const [selectedRole, setSelectedRole] = useState<Role>("DETECTIVE");
  const [playerCount, setPlayerCount] = useState<number>(3);
  const [targetTrophies, setTargetTrophies] = useState<number>(3);

  const [maxTurns, setMaxTurns] = useState<number>(16);

  const [soundActive, setSoundActive] = useState<boolean>(() =>
    sounds.getEnabled(),
  );
  const [hapticActive, setHapticActive] = useState<boolean>(() =>
    getHapticsEnabled(),
  );

  const toggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    sounds.setEnabled(next);
    if (next) sounds.playShift();
  };

  const toggleHapticSetting = () => {
    const next = !hapticActive;
    setHapticActive(next);
    setHapticsEnabled(next);
    if (next) triggerHaptic("medium");
  };

  const currentModeInfo =
    GAME_MODES.find((m) => m.id === selectedMode) ?? GAME_MODES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 p-2 sm:p-4 select-none font-sans">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Шапка */}
        <div className="pt-5 pb-3 px-5 text-center bg-gradient-to-b from-zinc-800/80 to-zinc-900 border-b border-zinc-800 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1.5">
            ★ Детективная стратегия
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-zinc-100">
            Город Грехов
          </h1>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Настольная дедуктивная стратегия
          </p>

          <div className="grid grid-cols-3 gap-1.5 mt-3.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("MODES");
              }}
              className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "MODES"
                  ? "bg-amber-500 text-zinc-950 shadow-md font-black"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Операции
            </button>
            <button
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("RULES");
              }}
              className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "RULES"
                  ? "bg-amber-500 text-zinc-950 shadow-md font-black"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Справочник
            </button>
            <button
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("SETTINGS");
              }}
              className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "SETTINGS"
                  ? "bg-amber-500 text-zinc-950 shadow-md font-black"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Настройки
            </button>
          </div>
        </div>

        {/* Тело экрана */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {activeTab === "MODES" && (
            <>
              {hasActiveGame && (
                <button
                  onClick={onResumeGame}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-amber-400 font-black text-xs uppercase tracking-wider rounded-xl border border-amber-500/40 shadow-lg cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <span>▶ Вернуться к текущей партии</span>
                </button>
              )}
              <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Формат матча:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      triggerHaptic("light");
                      setSelectedOpponent("AI");
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                      selectedOpponent === "AI"
                        ? "bg-amber-500 text-zinc-950 border-amber-400 shadow-md font-black"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    🤖 Против бота
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic("light");
                      setSelectedOpponent("PVP");
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                      selectedOpponent === "PVP"
                        ? "bg-amber-500 text-zinc-950 border-amber-400 shadow-md font-black"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    👥 Вдвоем (1 на 1)
                  </button>
                </div>
              </div>
              {/* Выбор лимита ходов для дуэлей */}
              {selectedMode !== "SECRET_SERVICE" && (
                <div className="mb-5 p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex flex-col items-start gap-2.5 text-xs">
                  <div>
                    <span className="text-zinc-300 font-bold block">
                      Лимит ходов:
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Определяет длительность партии
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 w-full">
                    {[
                      { val: 12, label: "12", sub: "Быстрая" },
                      { val: 16, label: "16", sub: "Стандарт" },
                      { val: 20, label: "20", sub: "Долгая" },
                      { val: 0, label: "∞", sub: "Без лимита" },
                    ].map((opt) => {
                      const isSelected = maxTurns === opt.val;
                      return (
                        <button
                          key={opt.val}
                          onClick={() => {
                            triggerHaptic("light");
                            setMaxTurns(opt.val);
                          }}
                          className={`py-1.5 px-1 rounded-lg border font-bold text-xs cursor-pointer transition flex flex-col items-center justify-center ${
                            isSelected
                              ? "bg-amber-950 border-amber-500 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)] font-black"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <span>{opt.label}</span>
                          <span className="text-[8px] font-mono opacity-60">
                            {opt.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Выбор роли для обычных дуэлей */}
              {selectedOpponent === "AI" &&
                selectedMode !== "SECRET_SERVICE" && (
                  <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-bold text-[11px]">
                      Ваша роль:
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          triggerHaptic("light");
                          setSelectedRole("DETECTIVE");
                        }}
                        className={`px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition ${
                          selectedRole === "DETECTIVE"
                            ? "bg-blue-950 border-blue-500 text-blue-200 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                            : "bg-zinc-900 border-zinc-800 text-zinc-500"
                        }`}
                      >
                        {currentModeInfo.detectiveRoleName}
                      </button>
                      <button
                        onClick={() => {
                          triggerHaptic("light");
                          setSelectedRole("KILLER");
                        }}
                        className={`px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition ${
                          selectedRole === "KILLER"
                            ? "bg-red-950 border-red-500 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                            : "bg-zinc-900 border-zinc-800 text-zinc-500"
                        }`}
                      >
                        {currentModeInfo.killerRoleName}
                      </button>
                    </div>
                  </div>
                )}
              {/* Выбор количества участников и трофеев для Секретной службы */}
              {selectedMode === "SECRET_SERVICE" && (
                <div className="space-y-3">
                  {selectedOpponent === "AI" && (
                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300 font-bold text-[11px] block">
                          Участники (Вы + Боты):
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          Поле:{" "}
                          {playerCount >= 7
                            ? "7×7 (49 карт)"
                            : playerCount >= 5
                              ? "6×6 (36 карт)"
                              : "5×5 (25 карт)"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full">
                        {[3, 4].map((num) => {
                          const isSelected = playerCount === num;
                          const sizeLabel = "5x5";
                          return (
                            <button
                              key={num}
                              onClick={() => {
                                triggerHaptic("light");
                                setPlayerCount(num);
                              }}
                              className={`py-1.5 px-2 rounded-lg border font-bold text-xs cursor-pointer transition flex flex-col items-center justify-center ${
                                isSelected
                                  ? "bg-emerald-950 border-emerald-500 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)] font-black"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              <span>{num} игр.</span>
                              <span className="text-[9px] font-mono opacity-60">
                                {sizeLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2 text-xs">
                    <span className="text-zinc-300 font-bold text-[11px] block">
                      Условие победы:
                    </span>
                    <div className="grid grid-cols-3 gap-2 w-full">
                      {[
                        { val: 2, label: "2 трофея", sub: "Быстрая" },
                        { val: 3, label: "3 трофея", sub: "Стандарт" },
                        { val: 4, label: "4 трофея", sub: "Затяжная" },
                      ].map((opt) => {
                        const isSelected = targetTrophies === opt.val;
                        return (
                          <button
                            key={opt.val}
                            onClick={() => {
                              triggerHaptic("light");
                              setTargetTrophies(opt.val);
                            }}
                            className={`py-1.5 px-2 rounded-lg border font-bold text-xs cursor-pointer transition flex flex-col items-center justify-center ${
                              isSelected
                                ? "bg-emerald-950 border-emerald-500 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)] font-black"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            <span>{opt.label}</span>
                            <span className="text-[9px] font-mono opacity-60">
                              {opt.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Сценарии игры:
                </span>
                {GAME_MODES.map((mode) => {
                  const isSelected = mode.id === selectedMode;
                  const isAvailable = mode.isAvailable;

                  return (
                    <div
                      key={mode.id}
                      onClick={() => {
                        if (isAvailable) {
                          triggerHaptic("light");
                          setSelectedMode(mode.id);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all ${
                        !isAvailable
                          ? "bg-zinc-950/40 border-zinc-800/40 opacity-55 cursor-not-allowed"
                          : isSelected
                            ? "bg-zinc-950 border-amber-500 shadow-md ring-1 ring-amber-500/50 cursor-pointer"
                            : "bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-black text-zinc-100">
                            {mode.title}
                          </span>
                          <span
                            className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold ${
                              isAvailable
                                ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                                : "bg-zinc-800 text-zinc-400 border-zinc-700"
                            }`}
                          >
                            {mode.id === "SECRET_SERVICE"
                              ? selectedOpponent === "PVP"
                                ? "Дуэль 1х1"
                                : "3–9 игроков"
                              : isAvailable
                                ? "Дуэль 1х1"
                                : "🔒 Скоро"}
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-400 font-mono font-bold shrink-0">
                          {mode.time}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-zinc-400 leading-snug">
                        {mode.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === "RULES" && (
            <div className="space-y-3.5 text-left text-xs text-zinc-300">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
                <span className="font-black text-amber-400 block text-xs uppercase tracking-wider">
                  1. Зона соседства и границы карты
                </span>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  • <b>КТО ТАКОЙ СОСЕД?</b> Персонаж считается соседом, если
                  находится на расстоянии не более 1 клетки по вертикали,
                  горизонтали или <b>диагонали</b> (до 8 соседних клеток).
                </p>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  • <b>ГРАНИЦЫ ПОЛЯ:</b> Действия атаки, допроса и обвинения{" "}
                  <b>не распространяются</b> за пределы поля!
                </p>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
                <span className="font-black text-amber-400 block text-xs uppercase tracking-wider">
                  2. Правила сдвига и перемещения
                </span>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  • Вы можете сдвинуть <b>любой ряд или колонку</b> поля.
                </p>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  • Вышедшая за границу карта переносится на противоположный
                  край этого же ряда/колонки.
                </p>
                <p className="text-amber-200/90 text-[11px] leading-relaxed">
                  • <b>АНТИ-ОТМЕНА:</b> Запрещено отменять последний сдвиг
                  соперника обратно тем же рядом/колонкой!
                </p>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
                <span className="font-black text-emerald-400 block text-xs uppercase tracking-wider">
                  3. Режим «Секретная служба»
                </span>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  • Масштаб поля зависит от стола: <b>3–4 игрока</b> — сетка
                  5×5; <b>5–6 игроков</b> — сетка 6×6; <b>7–9 игроков</b> —
                  сетка 7×7.
                </p>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  • Победа достигается набором целевых трофеев (3 или 4) через
                  раскрытие резидентов соперников.
                </p>
              </div>
            </div>
          )}

          {activeTab === "SETTINGS" && (
            <div className="space-y-3 text-xs text-zinc-300">
              <div
                onClick={toggleSound}
                className="p-3.5 bg-zinc-900/40 rounded-xl border border-zinc-800 hover:border-zinc-700 active:scale-[0.99] flex items-center justify-between cursor-pointer transition select-none"
              >
                <div>
                  <span className="font-bold block text-zinc-100">
                    Звуковые эффекты (Web Audio)
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Щелчки сдвига, выстрелы и аресты
                  </span>
                </div>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                    soundActive
                      ? "bg-emerald-950 text-emerald-300 border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      : "bg-zinc-900 text-zinc-500 border-zinc-800"
                  }`}
                >
                  {soundActive ? "ВКЛ" : "ВЫКЛ"}
                </button>
              </div>

              <div
                onClick={toggleHapticSetting}
                className="p-3.5 bg-zinc-900/40 rounded-xl border border-zinc-800 hover:border-zinc-700 active:scale-[0.99] flex items-center justify-between cursor-pointer transition select-none"
              >
                <div>
                  <span className="font-bold block text-zinc-100">
                    Тактильная отдача (Вибрация)
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Вибро Android, Telegram и iOS Taptic
                  </span>
                </div>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                    hapticActive
                      ? "bg-emerald-950 text-emerald-300 border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      : "bg-zinc-900 text-zinc-500 border-zinc-800"
                  }`}
                >
                  {hapticActive ? "ВКЛ" : "ВЫКЛ"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Закрепленная кнопка старта */}
        {activeTab === "MODES" && (
          <div className="p-3 sm:p-4 bg-zinc-950/95 border-t border-zinc-800 shrink-0 backdrop-blur z-20">
            <button
              onClick={() => {
                triggerHaptic("heavy");
                onStartGame(
                  selectedMode,
                  selectedOpponent,
                  selectedRole,
                  playerCount,
                  targetTrophies,
                  maxTurns,
                );
              }}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-black text-xs uppercase tracking-widest rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
            >
              <span>Начать операцию</span>
              <span className="text-base leading-none">➔</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
