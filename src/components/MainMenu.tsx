import { useState, useEffect } from "react";
import type { GameModeType, OpponentType, Role } from "../types/game";
import { GAME_MODES } from "./ModeSelectModal";
import { sounds } from "../utils/audio";
import {
  triggerHaptic,
  getHapticsEnabled,
  setHapticsEnabled,
} from "../utils/haptics";
import { mpService } from "../utils/multiplayerPeer";

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
  onOpenRules: () => void;
}

const MODE_LABELS: Record<string, string> = {
  SKHVATKA: "Схватка",
  MANIAC_VS_OPERATIVE: "Маньяк против оперативника",
  THIEF_HUNT: "Охота на грабителя",
  SECRET_SERVICE: "Секретная служба",
};

export const MainMenu = ({
  onStartGame,
  hasActiveGame,
  onResumeGame,
  onOpenRules,
}: MainMenuProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentType>("AI");
  const [selectedMode, setSelectedMode] = useState<GameModeType>("SKHVATKA");
  const [selectedRole, setSelectedRole] = useState<Role>("DETECTIVE");
  const [playerCount, setPlayerCount] = useState<number>(3);

  const [soundActive, setSoundActive] = useState<boolean>(() =>
    sounds.getEnabled(),
  );
  const [hapticActive, setHapticActive] = useState<boolean>(() =>
    getHapticsEnabled(),
  );

  const [networkStatus, setNetworkStatus] = useState<
    "IDLE" | "CONNECTING" | "WAITING" | "CONNECTED" | "ERROR"
  >("IDLE");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    const handleConnected = () => setNetworkStatus("CONNECTED");
    const handleDisconnected = () => setNetworkStatus("ERROR");

    mpService.onPlayerConnected = handleConnected;
    mpService.onPlayerDisconnected = handleDisconnected;

    return () => {
      mpService.onPlayerConnected = null;
      mpService.onPlayerDisconnected = null;
    };
  }, []);

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

  const handleCreateRoom = () => {
    triggerHaptic("light");
    setNetworkStatus("CONNECTING");
    mpService.createRoom(
      () => setNetworkStatus("WAITING"),
      () => setNetworkStatus("CONNECTED"),
      () => setNetworkStatus("ERROR"),
    );
  };

  const handleJoinRoom = () => {
    if (joinCode.length !== 4) return;
    triggerHaptic("light");
    setNetworkStatus("CONNECTING");
    mpService.joinRoom(
      joinCode,
      () => setNetworkStatus("CONNECTED"),
      () => setNetworkStatus("ERROR"),
    );
  };

  const handleStart = () => {
    triggerHaptic("heavy");
    onStartGame(
      selectedMode,
      selectedOpponent,
      selectedRole,
      selectedOpponent === "ONLINE" ? 2 : playerCount,
      selectedMode === "SECRET_SERVICE" ? (playerCount === 3 ? 4 : 3) : 3,
      0,
    );
  };

  const currentModeInfo =
    GAME_MODES.find((m) => m.id === selectedMode) ?? GAME_MODES[0];
  const canStart =
    selectedOpponent !== "ONLINE" ||
    (networkStatus === "CONNECTED" && mpService.isHost);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 p-4 select-none font-sans">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {step === 1 ? (
          <div className="p-6 pt-8 overflow-y-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-3">
                ★ Детективная стратегия
              </div>
              <h1 className="text-3xl font-black uppercase tracking-wider text-zinc-100">
                Город Грехов
              </h1>
            </div>

            {hasActiveGame && (
              <button
                onClick={onResumeGame}
                className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl p-4 font-black uppercase tracking-wider mb-6 flex items-center justify-center gap-2 hover:bg-amber-500/20 transition cursor-pointer"
              >
                ▶ Продолжить партию
              </button>
            )}

            <div className="space-y-3 mb-8">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-2 mb-1">
                Выберите формат
              </div>

              <button
                onClick={() => {
                  triggerHaptic("light");
                  setSelectedOpponent("AI");
                  setStep(2);
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 hover:border-amber-500/50 transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🤖
                </div>
                <div className="text-left">
                  <div className="font-black text-zinc-100 uppercase tracking-wider">
                    Против бота
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Одиночная игра с ИИ
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  triggerHaptic("light");
                  setSelectedOpponent("PVP");
                  setStep(2);
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 hover:border-amber-500/50 transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  👥
                </div>
                <div className="text-left">
                  <div className="font-black text-zinc-100 uppercase tracking-wider">
                    На одном экране
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Hotseat дуэль для двоих
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  triggerHaptic("light");
                  setSelectedOpponent("ONLINE");
                  setNetworkStatus("IDLE");
                  setStep(2);
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 hover:border-emerald-500/50 transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🌐
                </div>
                <div className="text-left">
                  <div className="font-black text-zinc-100 uppercase tracking-wider">
                    Сетевая игра
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Онлайн-комнаты по коду
                  </div>
                </div>
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-2 mb-1">
                Настройки и справка
              </div>
              <div className="flex gap-2">
                <button
                  onClick={toggleSound}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    soundActive
                      ? "bg-emerald-950/50 text-emerald-400 border-emerald-900/50"
                      : "bg-zinc-950 text-zinc-500 border-zinc-800"
                  }`}
                >
                  Звук: {soundActive ? "ВКЛ" : "ВЫКЛ"}
                </button>
                <button
                  onClick={toggleHapticSetting}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    hapticActive
                      ? "bg-emerald-950/50 text-emerald-400 border-emerald-900/50"
                      : "bg-zinc-950 text-zinc-500 border-zinc-800"
                  }`}
                >
                  Вибро: {hapticActive ? "ВКЛ" : "ВЫКЛ"}
                </button>
              </div>
              <button
                onClick={() => {
                  triggerHaptic("light");
                  onOpenRules();
                }}
                className="w-full py-3 bg-zinc-950 hover:bg-zinc-800/80 text-zinc-300 border border-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📖</span>
                <span>Справочник правил</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 pt-8 flex flex-col h-full overflow-y-auto">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <button
                onClick={() => {
                  triggerHaptic("light");
                  if (selectedOpponent === "ONLINE") mpService.disconnect();
                  setNetworkStatus("IDLE");
                  setStep(1);
                }}
                className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition cursor-pointer"
              >
                ←
              </button>
              <h2 className="text-lg font-black uppercase tracking-wider text-zinc-100">
                Настройка партии
              </h2>
            </div>

            <div className="flex-1 space-y-6">
              {selectedOpponent === "ONLINE" && (
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  {networkStatus === "IDLE" || networkStatus === "ERROR" ? (
                    <div className="space-y-3">
                      <button
                        onClick={handleCreateRoom}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                      >
                        Создать комнату
                      </button>

                      <div className="flex items-center gap-3 my-4">
                        <div className="h-px bg-zinc-800 flex-1"></div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                          или войти по коду
                        </span>
                        <div className="h-px bg-zinc-800 flex-1"></div>
                      </div>

                      <div className="flex gap-2 items-stretch">
                        <input
                          value={joinCode}
                          onChange={(e) =>
                            setJoinCode(e.target.value.replace(/\D/g, ""))
                          }
                          maxLength={4}
                          placeholder="Код"
                          className="w-24 min-w-0 bg-zinc-900 border border-zinc-700 rounded-xl text-center font-mono text-lg text-zinc-100 outline-none focus:border-amber-500 transition"
                        />
                        <button
                          onClick={handleJoinRoom}
                          disabled={joinCode.length !== 4}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 text-zinc-100 disabled:text-zinc-600 font-bold rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                        >
                          Войти
                        </button>
                      </div>
                      {networkStatus === "ERROR" && (
                        <div className="text-[10px] text-red-400 text-center mt-2">
                          Ошибка соединения. Попробуйте еще раз.
                        </div>
                      )}
                    </div>
                  ) : networkStatus === "WAITING" ? (
                    <div className="text-center py-2">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">
                        Код комнаты
                      </div>
                      <div className="text-4xl font-black text-amber-400 tracking-widest font-mono mb-2">
                        {mpService.roomCode}
                      </div>
                      <div className="text-xs text-zinc-400 animate-pulse">
                        Ожидание соперника...
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg">
                        ✓
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-emerald-400">
                          Соперник подключен
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {mpService.isHost
                            ? "Вы можете начать игру"
                            : "Ожидание запуска хостом..."}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedOpponent === "ONLINE" &&
              !mpService.isHost &&
              networkStatus === "CONNECTED" ? (
                <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800 text-center">
                  <div className="text-3xl mb-3">⚙️</div>
                  <div className="text-sm font-bold text-zinc-200 mb-1">
                    Хост настраивает параметры операции...
                  </div>
                  <div className="text-xs text-zinc-500 animate-pulse">
                    Ожидайте старта
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">
                      Сценарий
                    </div>
                    <div className="flex flex-col gap-2 bg-zinc-950 p-2 rounded-2xl border border-zinc-800">
                      {[
                        "SKHVATKA",
                        "MANIAC_VS_OPERATIVE",
                        "THIEF_HUNT",
                        "SECRET_SERVICE",
                      ].map((modeId) => (
                        <button
                          key={modeId}
                          onClick={() => {
                            triggerHaptic("light");
                            setSelectedMode(modeId as GameModeType);
                          }}
                          className={`py-3 px-3 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                            selectedMode === modeId
                              ? "bg-amber-500 text-zinc-950 shadow-sm"
                              : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {MODE_LABELS[modeId]}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2.5 px-1 leading-relaxed">
                      {currentModeInfo.description}
                    </p>
                  </div>

                  {selectedMode !== "SECRET_SERVICE" &&
                    selectedOpponent !== "PVP" && (
                      <div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">
                          Ваша роль
                        </div>
                        <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
                          <button
                            onClick={() => {
                              triggerHaptic("light");
                              setSelectedRole("DETECTIVE");
                            }}
                            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                              selectedRole === "DETECTIVE"
                                ? "bg-blue-950 text-blue-300 border border-blue-800/50 shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            {currentModeInfo.detectiveRoleName}
                          </button>
                          <button
                            onClick={() => {
                              triggerHaptic("light");
                              setSelectedRole("KILLER");
                            }}
                            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                              selectedRole === "KILLER"
                                ? "bg-red-950 text-red-300 border border-red-800/50 shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            {currentModeInfo.killerRoleName}
                          </button>
                        </div>
                        {selectedOpponent === "ONLINE" && (
                          <div className="text-[9px] text-zinc-500 mt-1.5 ml-1">
                            * Соперник автоматически получит противоположную
                            роль
                          </div>
                        )}
                      </div>
                    )}

                  {selectedMode === "SECRET_SERVICE" &&
                    selectedOpponent === "AI" && (
                      <div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">
                          Игроки (Вы + Боты)
                        </div>
                        <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
                          {[3, 4, 5].map((num) => (
                            <button
                              key={num}
                              onClick={() => {
                                triggerHaptic("light");
                                setPlayerCount(num);
                              }}
                              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                                playerCount === num
                                  ? "bg-zinc-700 text-zinc-100 shadow-sm"
                                  : "text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>

            <div className="mt-6 shrink-0">
              <button
                disabled={!canStart}
                onClick={handleStart}
                className="w-full py-4 bg-amber-500 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-600 font-black uppercase tracking-widest rounded-2xl transition shadow-lg cursor-pointer disabled:cursor-not-allowed"
              >
                {selectedOpponent === "ONLINE" && !mpService.isHost
                  ? "Ожидание хоста..."
                  : "▶ Начать партию"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
