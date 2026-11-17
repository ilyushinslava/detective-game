import React from "react";
import { motion } from "framer-motion";
import type { TutorialModule } from "./tutorialBoardSetup";

export interface TutorialMenuViewProps {
  completedModules: TutorialModule[];
  isRewardClaimed: boolean;
  onStartModule: (module: TutorialModule) => void;
  onExit: () => void;
  onFinish: () => void;
}

export const TutorialMenuView: React.FC<TutorialMenuViewProps> = ({
  completedModules,
  isRewardClaimed,
  onStartModule,
  onExit,
  onFinish,
}) => {
  const allModulesCompleted = completedModules.length >= 7;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-[#080a0f] flex justify-center overflow-hidden font-sans select-none text-zinc-100 h-full w-full"
    >
      <div className="w-full max-w-lg md:max-w-2xl mx-auto h-full flex flex-col justify-between relative overflow-hidden bg-[#080a0f] md:border-x md:border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-white/10 bg-[#080a0f]">
          <button
            onClick={onExit}
            className="text-zinc-400 hover:text-white transition cursor-pointer text-xs font-black uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/10"
          >
            ✕ В меню
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">
              Обучение
            </span>
            <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">
              Академия детективов
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-zinc-400">
              Пройдено: <b className="text-emerald-400">{completedModules.length}</b>/7
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar">
          {/* 1. BASICS */}
          <div
            onClick={() => onStartModule("BASICS")}
            className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
              completedModules.includes("BASICS")
                ? "bg-zinc-900/40 border-white/10"
                : "bg-zinc-900/60 border-white/10 hover:border-emerald-500/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                1. Основы игры
              </h3>
              {completedModules.includes("BASICS") && (
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  ✓ Сдано
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Как устроен город: маневры рядов и колонок, радиус соседства 3×3 и правило Anti-Undo.
            </p>
          </div>

          {/* 2. MANIAC_KILLER */}
          <div
            onClick={() => onStartModule("MANIAC_KILLER")}
            className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
              completedModules.includes("MANIAC_KILLER")
                ? "bg-zinc-900/40 border-white/10"
                : "bg-zinc-900/60 border-white/10 hover:border-amber-500/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                2. Почерк убийцы: Маньяк
              </h3>
              {completedModules.includes("MANIAC_KILLER") && (
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  ✓ Сдано
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Как охотиться за жертвами из списка, делать выстрел и скрываться, меняя маску.
            </p>
          </div>

          {/* 3. MANIAC_DETECTIVE */}
          <div
            onClick={() => onStartModule("MANIAC_DETECTIVE")}
            className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
              completedModules.includes("MANIAC_DETECTIVE")
                ? "bg-zinc-900/40 border-white/10"
                : "bg-zinc-900/60 border-white/10 hover:border-blue-500/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                3. Почерк убийцы: Оперативник
              </h3>
              {completedModules.includes("MANIAC_DETECTIVE") && (
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  ✓ Сдано
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Как задерживать маньяка, выкладывать алиби из руки и допрашивать подозреваемых.
            </p>
          </div>

          {/* 4. THIEF_ROBBER */}
          <div
            onClick={() => onStartModule("THIEF_ROBBER")}
            className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
              completedModules.includes("THIEF_ROBBER")
                ? "bg-zinc-900/40 border-white/10"
                : "bg-zinc-900/60 border-white/10 hover:border-amber-500/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                4. Оцепление: Вор
              </h3>
              {completedModules.includes("THIEF_ROBBER") && (
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  ✓ Сдано
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Как вскрывать сейфы, уходить от патрулей и копить 8 сокровищ для победы.
            </p>
          </div>

          {/* 5. THIEF_POLICE */}
          <div
            onClick={() => onStartModule("THIEF_POLICE")}
            className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
              completedModules.includes("THIEF_POLICE")
                ? "bg-zinc-900/40 border-white/10"
                : "bg-zinc-900/60 border-white/10 hover:border-blue-500/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                5. Оцепление: Полиция
              </h3>
              {completedModules.includes("THIEF_POLICE") && (
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  ✓ Сдано
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Как расставлять патрульных на поле, перекрывать пути отхода и задерживать вора.
            </p>
          </div>

          {/* 6. SECRET_SERVICE */}
          <div
            onClick={() => onStartModule("SECRET_SERVICE")}
            className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
              completedModules.includes("SECRET_SERVICE")
                ? "bg-zinc-900/40 border-white/10"
                : "bg-zinc-900/60 border-white/10 hover:border-purple-500/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                6. Директива «Ноль»: Контрразведка
              </h3>
              {completedModules.includes("SECRET_SERVICE") && (
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  ✓ Сдано
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Как опрашивать свидетелей, использовать радар и разоблачать вражеских агентов.
            </p>
          </div>

          {/* 7. LINE_UP */}
          <div
            onClick={() => onStartModule("LINE_UP")}
            className={`p-4 rounded-2xl border transition cursor-pointer shadow-lg active:scale-99 ${
              completedModules.includes("LINE_UP")
                ? "bg-zinc-900/40 border-white/10"
                : "bg-zinc-900/60 border-white/10 hover:border-emerald-500/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                7. Очная ставка: Допрос
              </h3>
              {completedModules.includes("LINE_UP") && (
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  ✓ Сдано
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Как задавать вопросы по приметам, отсекать невиновных и предъявлять вердикт.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {isRewardClaimed ? (
            <button
              onClick={onExit}
              className="w-full h-12 rounded-full bg-zinc-900/80 border border-emerald-500/30 text-emerald-400 font-black tracking-widest uppercase text-xs shadow-[0_0_15px_rgba(16,185,129,0.2)] transition active:scale-98 cursor-pointer"
            >
              Курс пройден (В меню)
            </button>
          ) : (
            <button
              data-testid="tutorial-main-action-btn"
              onClick={allModulesCompleted ? onFinish : onExit}
              className={`w-full h-12 rounded-full font-black tracking-widest uppercase text-xs transition active:scale-98 cursor-pointer ${
                allModulesCompleted
                  ? "bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-500"
                  : "bg-zinc-800 text-zinc-300 border border-white/10 hover:bg-zinc-700"
              }`}
            >
              {allModulesCompleted ? "Завершить курс (+250 CR)" : "В главное меню"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
