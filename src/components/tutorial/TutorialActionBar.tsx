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
    <div className="h-14 md:h-16 shrink-0 w-full flex items-center justify-center px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#080a0f] border-t border-white/5 z-20">
      <div className="w-full max-w-sm flex justify-center">
        {/* 1. BASICS */}
        {currentModule === "BASICS" && step === 3 && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => onCompleteModule("BASICS")}
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
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
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
          >
            Ликвидировать цель
          </Button>
        )}
        {currentModule === "MANIAC_KILLER" && step === 4 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onEscape}
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
          >
            Сменить маску
          </Button>
        )}
        {currentModule === "MANIAC_KILLER" && step === 5 && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => onCompleteModule("MANIAC_KILLER")}
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
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
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
          >
            Задержать подозреваемого
          </Button>
        )}
        {currentModule === "MANIAC_DETECTIVE" && step === 3 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onCleanup}
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
          >
            Зачистка поля
          </Button>
        )}
        {currentModule === "MANIAC_DETECTIVE" && step === 4 && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => onCompleteModule("MANIAC_DETECTIVE")}
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
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
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
          >
            Украсть сокровище
          </Button>
        )}
        {currentModule === "THIEF_ROBBER" && step === 3 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onThiefDisguise}
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
          >
            Сменить маску
          </Button>
        )}
        {currentModule === "THIEF_ROBBER" && step === 4 && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => onCompleteModule("THIEF_ROBBER")}
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
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
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
          >
            Выставить патруль
          </Button>
        )}
        {currentModule === "THIEF_POLICE" && step === 3 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onPoliceArrest}
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
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
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
          >
            Опрос свидетелей
          </Button>
        )}
        {currentModule === "SECRET_SERVICE" && step === 4 && (
          <Button
            variant="primary-danger"
            fullWidth
            onClick={onCaptureSpy}
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
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
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
          >
            Спросить: есть ли головной убор?
          </Button>
        )}
        {currentModule === "LINE_UP" && step === 2 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onEliminateDuel}
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
          >
            Исключить невиновных ➔
          </Button>
        )}
        {currentModule === "LINE_UP" && step === 4 && (
          <Button
            variant="primary-danger"
            fullWidth
            onClick={onAccuseDuel}
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
          >
            Предъявить обвинение
          </Button>
        )}
        {currentModule === "LINE_UP" && step === 5 && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => onCompleteModule("LINE_UP")}
            className="!h-11 md:!h-12 text-xs font-bold uppercase tracking-wider"
          >
            Завершить обучение ➔
          </Button>
        )}
      </div>
    </div>
  );
};
