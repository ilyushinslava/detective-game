import React from "react";
import { motion } from "framer-motion";
import type { CanonicalTutorialModule } from "./tutorialTypes";
import { TUTORIAL_MODULES_LIST } from "./tutorialProgress";

export interface TutorialMenuViewProps {
  completedModules: CanonicalTutorialModule[];
  isRewardClaimed: boolean;
  onStartModule: (module: CanonicalTutorialModule) => void;
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
  const allModulesCompleted = completedModules.length >= 3;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-[#080a0f] flex justify-center overflow-hidden font-sans select-none text-zinc-100 h-full w-full"
    >
      <div className="w-full max-w-lg md:max-w-2xl mx-auto h-full flex flex-col justify-between relative overflow-hidden bg-zinc-950 md:border-x md:border-white/10 shadow-2xl">
        {/* Шапка */}
        <div className="flex items-center justify-between gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 shrink-0 border-b border-white/10 bg-zinc-950">
          <button
            onClick={onExit}
            aria-label="В главное меню"
            className="w-11 h-11 shrink-0 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 active:scale-95 flex items-center justify-center transition cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="flex-1 min-w-0 text-center flex flex-col items-center">
            <span className="text-[10px] font-sans text-blue-400 uppercase tracking-widest font-semibold truncate max-w-full">
              Обучение
            </span>
            <h2 className="text-xs sm:text-sm font-black tracking-wider text-zinc-100 uppercase truncate max-w-full">
              Академия детективов
            </h2>
          </div>

          <div className="shrink-0 flex items-center justify-end">
            <span className="text-[10px] font-sans text-zinc-400 whitespace-nowrap bg-zinc-900/80 px-2 py-1 rounded border border-white/10">
              Пройдено: <b className="text-blue-400 font-mono font-bold">{completedModules.length}</b><span className="font-mono text-zinc-500">/3</span>
            </span>
          </div>
        </div>

        {/* Список 3 модулей */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 custom-scrollbar">
          {TUTORIAL_MODULES_LIST.map((mod) => {
            const isCompleted = completedModules.includes(mod.id);

            return (
              <div
                key={mod.id}
                onClick={() => onStartModule(mod.id)}
                className={`p-4 rounded-2xl neo-card transition cursor-pointer shadow-lg active:scale-99 border ${
                  isCompleted
                    ? "border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-500/60"
                    : "border-white/10 bg-zinc-900/50 hover:border-blue-500/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    {mod.title}
                  </h3>
                  {isCompleted ? (
                    <span className="text-[11px] font-sans text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      Сдано
                    </span>
                  ) : (
                    <span className="text-[11px] font-sans text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
                      Начать
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  {mod.subtitle}
                </p>
              </div>
            );
          })}
        </div>

        {/* Нижний док действий */}
        <div className="p-4 bg-zinc-950 border-t border-white/10 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {allModulesCompleted ? (
            isRewardClaimed ? (
              <button
                onClick={onExit}
                data-testid="tutorial-main-action-btn"
                className="w-full py-3.5 px-4 rounded-xl min-h-[44px] font-black uppercase tracking-wider text-xs bg-zinc-800 text-zinc-300 border border-white/10 hover:bg-zinc-700 transition cursor-pointer touch-manipulation flex items-center justify-center"
              >
                Курс пройден (В меню)
              </button>
            ) : (
              <button
                onClick={onFinish}
                data-testid="tutorial-main-action-btn"
                className="w-full py-3.5 px-4 rounded-xl min-h-[44px] font-black uppercase tracking-wider text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] transition cursor-pointer touch-manipulation active:scale-98 flex items-center justify-center gap-2"
              >
                Завершить курс (+500 монет)
              </button>
            )
          ) : (
            <button
              onClick={onExit}
              data-testid="tutorial-main-action-btn"
              className="w-full py-3.5 px-4 rounded-xl min-h-[44px] font-black uppercase tracking-wider text-xs bg-zinc-900 text-zinc-400 border border-white/10 hover:text-white hover:bg-zinc-800 transition cursor-pointer touch-manipulation flex items-center justify-center"
            >
              В главное меню
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
