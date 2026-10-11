// src/components/ModeSelectModal.tsx
import { useState } from "react";
import type { GameModeType, OpponentType, Role } from "../types/game";

export interface GameModeInfo {
  id: GameModeType;
  title: string;
  players: string;
  time: string;
  difficulty: "Легкая" | "Средняя" | "Высокая";
  description: string;
  isAvailable: boolean;
  killerRoleName: string;
  detectiveRoleName: string;
}

export const GAME_MODES: GameModeInfo[] = [
  {
    id: "SKHVATKA",
    title: "Схватка",
    players: "2 игрока",
    time: "15 минут",
    difficulty: "Легкая",
    description:
      "Опасная городская дуэль на опережение: вычислите скрывающегося бандита до того, как инспектор окажется в его прицеле.",
    isAvailable: true,
    killerRoleName: "Бандит",
    detectiveRoleName: "Инспектор",
  },
  {
    id: "MANIAC_VS_OPERATIVE",
    title: "Маньяк против оперативника",
    players: "2 игрока",
    time: "20 минут",
    difficulty: "Средняя",
    description:
      "Серийный маньяк ведет охоту по скрытому заказу из 4 целей. Задача оперативника — перехватить след и остановить расправу.",
    isAvailable: true,
    killerRoleName: "Маньяк",
    detectiveRoleName: "Оперативник",
  },
  {
    id: "THIEF_HUNT",
    title: "Охота на грабителя",
    players: "2 игрока",
    time: "60 минут",
    difficulty: "Высокая",
    description:
      "Дерзкий домушник методично обчищает карманы горожан и меняет маски, а полиция стягивает оцепление по кварталам.",
    isAvailable: true,
    killerRoleName: "Грабитель",
    detectiveRoleName: "Полиция",
  },
  {
    id: "SECRET_SERVICE",
    title: "Секретная служба",
    players: "3–9 игроков",
    time: "30 минут",
    difficulty: "Средняя",
    description:
      "Закрытая операция разведок: опрашивайте связных, вычисляйте резидентов конкурентов и собирайте компромат.",
    isAvailable: true,
    killerRoleName: "Агент «Восток»",
    detectiveRoleName: "Агент «Запад»",
  },
  {
    id: "EUROPOL_VS_OPG",
    title: "Европол против ОПГ",
    players: "6 или 8 игроков",
    time: "45 минут",
    difficulty: "Высокая",
    description:
      "Масштабная спецоперация: бронежилеты, снайперские расчеты и минные засады в борьбе с верхушкой синдиката.",
    isAvailable: false,
    killerRoleName: "Глава ОПГ",
    detectiveRoleName: "Европол",
  },
  {
    id: "SPANISH_HEIST",
    title: "Ограбление по-испански",
    players: "5–7 игроков",
    time: "45 минут",
    difficulty: "Высокая",
    description:
      "Команда взломщиков пытается вскрыть центральные сейфы казино, пока служба охраны блокирует периметр сигнализацией.",
    isAvailable: false,
    killerRoleName: "Взломщик",
    detectiveRoleName: "Начальник СБ",
  },
];

interface ModeSelectModalProps {
  currentModeId: string;
  initialOpponent?: OpponentType;
  hasActiveGame: boolean;
  onSelectMode: (modeId: GameModeType) => void;
  onResumeGame: () => void;
  onStartNewGame: (
    modeId: GameModeType,
    opponent: OpponentType,
    playerRole: Role,
    playerCount: number,
  ) => void;
}

export const ModeSelectModal = ({
  currentModeId,
  initialOpponent = "AI",
  hasActiveGame,
  onSelectMode,
  onResumeGame,
  onStartNewGame,
}: ModeSelectModalProps) => {
  const [selectedOpponent, setSelectedOpponent] =
    useState<OpponentType>(initialOpponent);
  const [selectedPlayerRole, setSelectedPlayerRole] =
    useState<Role>("DETECTIVE");
  const [playerCount, setPlayerCount] = useState<number>(3);

  const selectedMode =
    GAME_MODES.find((m) => m.id === currentModeId) ?? GAME_MODES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4">
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-3xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur z-10 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-zinc-100 flex items-center gap-2">
              <span>Город грехов</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Дуэли
              </span>
            </h2>
            <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
              Выберите сценарий противостояния
            </p>
          </div>
          <button
            onClick={onResumeGame}
            className="text-zinc-400 hover:text-zinc-200 p-2 -mr-2 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5 min-h-0">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">
                Формат:
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedOpponent("AI")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                    selectedOpponent === "AI"
                      ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  🤖 Бот
                </button>
                <button
                  onClick={() => setSelectedOpponent("PVP")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                    selectedOpponent === "PVP"
                      ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  👥 1v1
                </button>
              </div>
            </div>

            {selectedOpponent === "AI" &&
              selectedMode.id !== "SECRET_SERVICE" && (
                <div className="flex items-center justify-between gap-2 border-t border-zinc-800/50 pt-2.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">
                    Роль:
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSelectedPlayerRole("DETECTIVE")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                        selectedPlayerRole === "DETECTIVE"
                          ? "bg-blue-950 border-blue-500 text-blue-200 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      {selectedMode.detectiveRoleName}
                    </button>
                    <button
                      onClick={() => setSelectedPlayerRole("KILLER")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                        selectedPlayerRole === "KILLER"
                          ? "bg-red-950 border-red-500 text-red-200 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      {selectedMode.killerRoleName}
                    </button>
                  </div>
                </div>
              )}

            {selectedMode.id === "SECRET_SERVICE" &&
              selectedOpponent === "AI" && (
                <div className="flex items-center justify-between gap-2 border-t border-zinc-800/50 pt-2.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">
                    Боты:
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPlayerCount(2)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                        playerCount === 2
                          ? "bg-emerald-950 border-emerald-500 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      1 Бот
                    </button>
                    <button
                      onClick={() => setPlayerCount(3)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                        playerCount === 3
                          ? "bg-emerald-950 border-emerald-500 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      2 Бота
                    </button>
                  </div>
                </div>
              )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {GAME_MODES.map((mode) => {
              const isSelected = mode.id === currentModeId;
              const isLocked = !mode.isAvailable;

              return (
                <div
                  key={mode.id}
                  className={`relative flex flex-col justify-between p-3 rounded-xl border transition-all ${
                    isLocked
                      ? "bg-zinc-950/40 border-zinc-800/40 opacity-50 cursor-not-allowed"
                      : isSelected
                        ? "ring-1 ring-amber-500 border-amber-500 bg-zinc-950 shadow-lg cursor-pointer"
                        : "bg-zinc-950 border-zinc-800 hover:border-zinc-600 active:scale-[0.99] cursor-pointer"
                  }`}
                  onClick={() => {
                    if (!isLocked) onSelectMode(mode.id);
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          isLocked
                            ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                            : "bg-emerald-950/90 text-emerald-300 border-emerald-700"
                        }`}
                      >
                        {isLocked
                          ? "🔒 Скоро"
                          : mode.id === "SECRET_SERVICE"
                            ? "Куча-мала"
                            : "Дуэль 1х1"}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono font-bold">
                        {mode.difficulty}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-zinc-100 leading-tight mb-1">
                      {mode.title}
                    </h3>

                    <p className="text-[10px] leading-snug text-zinc-400 line-clamp-2 mb-2">
                      {mode.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span>👥 {mode.players}</span>
                    <span>⏳ {mode.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sticky bottom-0 p-3 bg-zinc-900/95 border-t border-zinc-800 z-10 shrink-0 flex flex-col sm:flex-row gap-2">
          {hasActiveGame && (
            <button
              onClick={onResumeGame}
              className="flex-1 py-3 bg-zinc-800 active:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-zinc-700 transition cursor-pointer text-center"
            >
              Вернуться
            </button>
          )}
          <button
            onClick={() =>
              onStartNewGame(
                currentModeId as GameModeType,
                selectedOpponent,
                selectedPlayerRole,
                playerCount,
              )
            }
            className={`${hasActiveGame ? "flex-[2]" : "w-full"} py-3 bg-amber-600 active:bg-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg text-center`}
          >
            Начать операцию →
          </button>
        </div>
      </div>
    </div>
  );
};
