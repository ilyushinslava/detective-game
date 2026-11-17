import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TutorialModule } from "./tutorialBoardSetup";

export interface TutorialActionBarProps {
  currentModule: TutorialModule;
  step: number;
  selectedId: string | null;
  onKill: () => void;
  onEscape: () => void;
  onArrest: () => void;
  onCleanup: () => void;
  onRob: () => void;
  onThiefDisguise: () => void;
  onPoliceBlock: () => void;
  onPoliceArrest: () => void;
  onInterrogate: () => void;
  onCaptureSpy: () => void;
  onAskQuestionDuel: () => void;
  onEliminateDuel: () => void;
  onAccuseDuel: () => void;
  onCompleteModule: (module: TutorialModule) => void;
}

export const TutorialActionBar: React.FC<TutorialActionBarProps> = ({
  currentModule,
  step,
  selectedId,
  onKill,
  onEscape,
  onArrest,
  onCleanup,
  onRob,
  onThiefDisguise,
  onPoliceBlock,
  onPoliceArrest,
  onInterrogate,
  onCaptureSpy,
  onAskQuestionDuel,
  onEliminateDuel,
  onAccuseDuel,
  onCompleteModule,
}) => {
  return (
    <div className="h-14 md:h-16 shrink-0 w-full flex items-center justify-center px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#080a0f] border-t border-white/5 z-20">
      <AnimatePresence mode="wait">
        {/* 1. BASICS */}
        {currentModule === "BASICS" && step === 3 && (
          <motion.button
            onClick={() => onCompleteModule("BASICS")}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
          >
            Завершить урок ➔
          </motion.button>
        )}

        {/* 2. MANIAC_KILLER */}
        {currentModule === "MANIAC_KILLER" && step === 3 && (
          <motion.button
            onClick={onKill}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
          >
            Ликвидировать цель
          </motion.button>
        )}
        {currentModule === "MANIAC_KILLER" && step === 4 && (
          <motion.button
            onClick={onEscape}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
          >
            Сменить маску
          </motion.button>
        )}
        {currentModule === "MANIAC_KILLER" && step === 5 && (
          <motion.button
            onClick={() => onCompleteModule("MANIAC_KILLER")}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
          >
            Завершить урок ➔
          </motion.button>
        )}

        {/* 3. MANIAC_DETECTIVE */}
        {currentModule === "MANIAC_DETECTIVE" && step === 2 && (
          <motion.button
            onClick={onArrest}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
          >
            Задержать подозреваемого
          </motion.button>
        )}
        {currentModule === "MANIAC_DETECTIVE" && step === 3 && (
          <motion.button
            onClick={onCleanup}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
          >
            Зачистка поля
          </motion.button>
        )}
        {currentModule === "MANIAC_DETECTIVE" && step === 4 && (
          <motion.button
            onClick={() => onCompleteModule("MANIAC_DETECTIVE")}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
          >
            Завершить урок ➔
          </motion.button>
        )}

        {/* 4. THIEF_ROBBER */}
        {currentModule === "THIEF_ROBBER" && step === 2 && (
          <motion.button
            onClick={onRob}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
          >
            Украсть сокровище
          </motion.button>
        )}
        {currentModule === "THIEF_ROBBER" && step === 3 && (
          <motion.button
            onClick={onThiefDisguise}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
          >
            Сменить маску
          </motion.button>
        )}
        {currentModule === "THIEF_ROBBER" && step === 4 && (
          <motion.button
            onClick={() => onCompleteModule("THIEF_ROBBER")}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
          >
            Завершить урок ➔
          </motion.button>
        )}

        {/* 5. THIEF_POLICE */}
        {currentModule === "THIEF_POLICE" && step === 2 && (
          <motion.button
            onClick={onPoliceBlock}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
          >
            Выставить патруль
          </motion.button>
        )}
        {currentModule === "THIEF_POLICE" && step === 3 && (
          <motion.button
            onClick={onPoliceArrest}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
          >
            Задержать вора
          </motion.button>
        )}

        {/* 6. SECRET_SERVICE */}
        {currentModule === "SECRET_SERVICE" && step === 2 && Boolean(selectedId) && (
          <motion.button
            onClick={onInterrogate}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
          >
            Опрос свидетелей
          </motion.button>
        )}
        {currentModule === "SECRET_SERVICE" && step === 4 && (
          <motion.button
            onClick={onCaptureSpy}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
          >
            Разоблачение шпиона
          </motion.button>
        )}

        {/* 7. LINE_UP */}
        {currentModule === "LINE_UP" && step === 1 && (
          <motion.button
            onClick={onAskQuestionDuel}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
          >
            Спросить: есть ли головной убор?
          </motion.button>
        )}
        {currentModule === "LINE_UP" && step === 2 && (
          <motion.button
            onClick={onEliminateDuel}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
          >
            Исключить невиновных ➔
          </motion.button>
        )}
        {currentModule === "LINE_UP" && step === 4 && (
          <motion.button
            onClick={onAccuseDuel}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
          >
            Предъявить обвинение
          </motion.button>
        )}
        {currentModule === "LINE_UP" && step === 5 && (
          <motion.button
            onClick={() => onCompleteModule("LINE_UP")}
            className="pointer-events-auto w-full max-w-sm h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
          >
            Завершить обучение ➔
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
