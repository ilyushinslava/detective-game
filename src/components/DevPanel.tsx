import { useState } from "react";
import type { Role, GameModeType } from "../types/game";

export interface DevPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onForceWin: (winner: Role, mode?: GameModeType) => void;
  onTriggerInspectorChoice: () => void;
  onResetToMenu: () => void;
  onAddCash: (amount: number) => void;
  onResetCash?: () => void;
  onToggleTurn?: () => void;
  onAddKill?: () => void;
  onTriggerIntro?: () => void;
  onTriggerRestartRequest?: () => void;
  onTriggerOpponentLeft?: () => void;
  onTriggerDisguiseModal?: () => void;
  onTriggerCaughtSpyModal?: () => void;
  onTriggerGameOver?: () => void;
  onClearSession?: () => void;
}

export const DevPanel = ({
  isOpen,
  onClose,
  onForceWin,
  onTriggerInspectorChoice,
  onResetToMenu,
  onAddCash,
  onResetCash,
  onToggleTurn,
  onAddKill,
  onTriggerIntro,
  onTriggerRestartRequest,
  onTriggerOpponentLeft,
  onTriggerDisguiseModal,
  onTriggerCaughtSpyModal,
  onTriggerGameOver,
  onClearSession,
}: DevPanelProps) => {
  if (!isOpen) return null;

  const [activeSection, setActiveSection] = useState<number | null>(1);

  const toggleSection = (id: number) => {
    setActiveSection((prev) => (prev === id ? null : id));
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-zinc-950 border border-amber-500/50 rounded-3xl p-5 shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col gap-3 font-sans max-h-[88vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              ⚡ QA / Dev Control Panel
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Аккордеон 1: Исходы матчей по режимам */}
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-zinc-900/40">
          <button
            onClick={() => toggleSection(1)}
            className="w-full p-3 flex justify-between items-center text-left text-xs font-black uppercase tracking-wider text-red-400 hover:bg-white/5 transition cursor-pointer"
          >
            <span>1. Исходы матчей по режимам</span>
            <span className="text-[10px] text-zinc-500">{activeSection === 1 ? "▲" : "▼"}</span>
          </button>
          {activeSection === 1 && (
            <div className="p-3 pt-0 grid grid-cols-2 gap-2 text-[10px]">
              <button
                onClick={() => { onForceWin("KILLER", "SKHVATKA"); onClose(); }}
                className="py-2 px-2.5 bg-red-950/60 hover:bg-red-900/80 border border-red-700/50 rounded-xl text-red-200 font-bold text-left transition cursor-pointer"
              >
                💀 Схватка: Бандит
              </button>
              <button
                onClick={() => { onForceWin("DETECTIVE", "SKHVATKA"); onClose(); }}
                className="py-2 px-2.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/50 rounded-xl text-amber-200 font-bold text-left transition cursor-pointer"
              >
                🛡️ Схватка: Инспектор
              </button>
              <button
                onClick={() => { onForceWin("KILLER", "MANIAC_VS_OPERATIVE"); onClose(); }}
                className="py-2 px-2.5 bg-red-950/60 hover:bg-red-900/80 border border-red-700/50 rounded-xl text-red-200 font-bold text-left transition cursor-pointer"
              >
                🩸 Маньяк: Победа
              </button>
              <button
                onClick={() => { onForceWin("DETECTIVE", "MANIAC_VS_OPERATIVE"); onClose(); }}
                className="py-2 px-2.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/50 rounded-xl text-amber-200 font-bold text-left transition cursor-pointer"
              >
                🚨 Оперативник: Победа
              </button>
              <button
                onClick={() => { onForceWin("KILLER", "THIEF_HUNT"); onClose(); }}
                className="py-2 px-2.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/50 rounded-xl text-amber-200 font-bold text-left transition cursor-pointer"
              >
                💰 Вор: 5 краж
              </button>
              <button
                onClick={() => { onForceWin("DETECTIVE", "THIEF_HUNT"); onClose(); }}
                className="py-2 px-2.5 bg-blue-950/60 hover:bg-blue-900/80 border border-blue-700/50 rounded-xl text-blue-200 font-bold text-left transition cursor-pointer"
              >
                👮 Полиция: Арест
              </button>
              <button
                onClick={() => { onForceWin("KILLER", "SECRET_SERVICE"); onClose(); }}
                className="py-2 px-2.5 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/50 rounded-xl text-purple-200 font-bold text-left transition cursor-pointer"
              >
                🕶️ Служба: Фантом (Восток)
              </button>
              <button
                onClick={() => { onForceWin("DETECTIVE", "SECRET_SERVICE"); onClose(); }}
                className="py-2 px-2.5 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 rounded-xl text-indigo-200 font-bold text-left transition cursor-pointer"
              >
                👤 Служба: Призрак (Запад)
              </button>
            </div>
          )}
        </div>

        {/* Аккордеон 2: Управление состоянием и ходом */}
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-zinc-900/40">
          <button
            onClick={() => toggleSection(2)}
            className="w-full p-3 flex justify-between items-center text-left text-xs font-black uppercase tracking-wider text-amber-400 hover:bg-white/5 transition cursor-pointer"
          >
            <span>2. Управление состоянием и ходом</span>
            <span className="text-[10px] text-zinc-500">{activeSection === 2 ? "▲" : "▼"}</span>
          </button>
          {activeSection === 2 && (
            <div className="p-3 pt-0 flex flex-col gap-2 text-[10px]">
              {onToggleTurn && (
                <button
                  onClick={onToggleTurn}
                  className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-200 font-bold text-left transition cursor-pointer"
                >
                  🔄 Сменить чей ход (Killer ⇄ Detective)
                </button>
              )}
              {onAddKill && (
                <button
                  onClick={onAddKill}
                  className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-200 font-bold text-left transition cursor-pointer"
                >
                  🎯 +1 к убийствам / кражам
                </button>
              )}
              <button
                onClick={() => { onTriggerInspectorChoice(); onClose(); }}
                className="w-full py-2 px-3 bg-blue-950/60 hover:bg-blue-900/80 border border-blue-700/50 rounded-xl text-blue-200 font-bold text-left transition cursor-pointer"
              >
                🔍 Открыть выбор роли Инспектора (4 карты)
              </button>
            </div>
          )}
        </div>

        {/* Аккордеон 3: Модальные окна и экраны */}
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-zinc-900/40">
          <button
            onClick={() => toggleSection(3)}
            className="w-full p-3 flex justify-between items-center text-left text-xs font-black uppercase tracking-wider text-amber-400 hover:bg-white/5 transition cursor-pointer"
          >
            <span>3. Модальные окна и экраны</span>
            <span className="text-[10px] text-zinc-500">{activeSection === 3 ? "▲" : "▼"}</span>
          </button>
          {activeSection === 3 && (
            <div className="p-3 pt-0 grid grid-cols-2 gap-2 text-[10px]">
              {onTriggerIntro && (
                <button
                  onClick={() => { onTriggerIntro(); onClose(); }}
                  className="py-2 px-2.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-200 font-bold text-left transition cursor-pointer"
                >
                  👁️ Интро ролей
                </button>
              )}
              {onTriggerRestartRequest && (
                <button
                  onClick={() => { onTriggerRestartRequest(); onClose(); }}
                  className="py-2 px-2.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/50 rounded-xl text-amber-200 font-bold text-left transition cursor-pointer"
                >
                  🤝 Запрос реванша
                </button>
              )}
              {onTriggerDisguiseModal && (
                <button
                  onClick={() => { onTriggerDisguiseModal(); onClose(); }}
                  className="py-2 px-2.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-200 font-bold text-left transition cursor-pointer"
                >
                  🎭 Смена лица
                </button>
              )}
              {onTriggerCaughtSpyModal && (
                <button
                  onClick={() => { onTriggerCaughtSpyModal(); onClose(); }}
                  className="py-2 px-2.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-200 font-bold text-left transition cursor-pointer"
                >
                  🕵️ Раскрытие шпиона
                </button>
              )}
              {onTriggerOpponentLeft && (
                <button
                  onClick={() => { onTriggerOpponentLeft(); onClose(); }}
                  className="py-2 px-2.5 bg-red-950/60 hover:bg-red-900/80 border border-red-700/50 rounded-xl text-red-200 font-bold text-left transition cursor-pointer"
                >
                  🚪 Уход соперника
                </button>
              )}
              {onTriggerGameOver && (
                <button
                  onClick={() => { onTriggerGameOver(); onClose(); }}
                  className="py-2 px-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 rounded-xl text-emerald-200 font-bold text-left transition cursor-pointer"
                >
                  🏆 Окно финала (GameOver)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Аккордеон 4: Экономика и отладка */}
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-zinc-900/40">
          <button
            onClick={() => toggleSection(4)}
            className="w-full p-3 flex justify-between items-center text-left text-xs font-black uppercase tracking-wider text-emerald-400 hover:bg-white/5 transition cursor-pointer"
          >
            <span>4. Экономика и отладка</span>
            <span className="text-[10px] text-zinc-500">{activeSection === 4 ? "▲" : "▼"}</span>
          </button>
          {activeSection === 4 && (
            <div className="p-3 pt-0 flex flex-col gap-2 text-[10px]">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAddCash(1000)}
                  className="py-2 px-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 rounded-xl text-emerald-200 font-bold text-left transition cursor-pointer"
                >
                  💰 +1,000 CR
                </button>
                <button
                  onClick={() => onAddCash(10000)}
                  className="py-2 px-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 rounded-xl text-emerald-200 font-bold text-left transition cursor-pointer"
                >
                  💎 +10,000 CR
                </button>
              </div>
              {onResetCash && (
                <button
                  onClick={onResetCash}
                  className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-300 font-bold text-left transition cursor-pointer"
                >
                  🪙 Обнулить баланс CR
                </button>
              )}
              {onClearSession && (
                <button
                  onClick={onClearSession}
                  className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-zinc-300 font-bold text-left transition cursor-pointer"
                >
                  🧹 Сброс сессии + F5
                </button>
              )}
              <button
                onClick={() => { onResetToMenu(); onClose(); }}
                className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-zinc-300 font-bold text-left transition cursor-pointer"
              >
                🏠 Сброс в главное меню
              </button>
            </div>
          )}
        </div>

        <span className="text-[9px] font-mono text-zinc-600 text-center mt-1">
          Нажмите [~] для быстрого закрытия
        </span>
      </div>
    </div>
  );
};
