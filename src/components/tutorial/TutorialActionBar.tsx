import React from "react";
import { Button } from "../ui/Button";
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
    <div className="min-h-[56px] py-2 shrink-0 w-full flex items-center justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 bg-[#080a0f] border-t border-white/5 z-20">
      <div className="w-full max-w-sm flex justify-center">
        {/* 1. BASICS */}
        {currentModule === "BASICS" && step === 3 && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => onCompleteModule("BASICS")}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Завершить урок ➔
          </Button>
        )}

        {/* 2. MANIAC_KILLER */}
        {currentModule === "MANIAC_KILLER" && step === 3 && (
          <Button
            variant="primary-danger"
            fullWidth
            onClick={onKill}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Ликвидировать цель
          </Button>
        )}
        {currentModule === "MANIAC_KILLER" && step === 4 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onEscape}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Сменить маску
          </Button>
        )}
        {currentModule === "MANIAC_KILLER" && step === 5 && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => onCompleteModule("MANIAC_KILLER")}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Завершить урок ➔
          </Button>
        )}

        {/* 3. MANIAC_DETECTIVE */}
        {currentModule === "MANIAC_DETECTIVE" && step === 2 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onArrest}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Задержать подозреваемого
          </Button>
        )}
        {currentModule === "MANIAC_DETECTIVE" && step === 3 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onCleanup}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Зачистка поля
          </Button>
        )}
        {currentModule === "MANIAC_DETECTIVE" && step === 4 && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => onCompleteModule("MANIAC_DETECTIVE")}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Завершить урок ➔
          </Button>
        )}

        {/* 4. THIEF_ROBBER */}
        {currentModule === "THIEF_ROBBER" && step === 2 && (
          <Button
            variant="primary-danger"
            fullWidth
            onClick={onRob}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Украсть сокровище
          </Button>
        )}
        {currentModule === "THIEF_ROBBER" && step === 3 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onThiefDisguise}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Сменить маску
          </Button>
        )}
        {currentModule === "THIEF_ROBBER" && step === 4 && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => onCompleteModule("THIEF_ROBBER")}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Завершить урок ➔
          </Button>
        )}

        {/* 5. THIEF_POLICE */}
        {currentModule === "THIEF_POLICE" && step === 2 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onPoliceBlock}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Выставить патруль
          </Button>
        )}
        {currentModule === "THIEF_POLICE" && step === 3 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onPoliceArrest}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Задержать вора
          </Button>
        )}

        {/* 6. SECRET_SERVICE */}
        {currentModule === "SECRET_SERVICE" && step === 2 && Boolean(selectedId) && (
          <Button
            variant="primary"
            fullWidth
            onClick={onInterrogate}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Опрос свидетелей
          </Button>
        )}
        {currentModule === "SECRET_SERVICE" && step === 4 && (
          <Button
            variant="primary-danger"
            fullWidth
            onClick={onCaptureSpy}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Разоблачение шпиона
          </Button>
        )}

        {/* 7. LINE_UP */}
        {currentModule === "LINE_UP" && step === 1 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onAskQuestionDuel}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Спросить: есть ли головной убор?
          </Button>
        )}
        {currentModule === "LINE_UP" && step === 2 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onEliminateDuel}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Исключить невиновных ➔
          </Button>
        )}
        {currentModule === "LINE_UP" && step === 4 && (
          <Button
            variant="primary-danger"
            fullWidth
            onClick={onAccuseDuel}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Предъявить обвинение
          </Button>
        )}
        {currentModule === "LINE_UP" && step === 5 && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => onCompleteModule("LINE_UP")}
            className="!min-h-[44px] !h-11 md:!h-12 text-xs font-bold uppercase tracking-wider touch-manipulation"
          >
            Завершить обучение ➔
          </Button>
        )}
      </div>
    </div>
  );
};
