import React from "react";
import { Button } from "../ui/Button";
import type { TutorialStepConfig } from "./tutorialTypes";

export interface TutorialActionBarProps {
  stepConfig: TutorialStepConfig;
  isActionEnabled: boolean;
  isModuleFinished: boolean;
  onActionButtonClick: () => void;
  onFinishModuleClick: () => void;
}

export const TutorialActionBar: React.FC<TutorialActionBarProps> = ({
  stepConfig,
  isActionEnabled,
  isModuleFinished,
  onActionButtonClick,
  onFinishModuleClick,
}) => {
  const defaultHint =
    stepConfig.hintMessage ||
    (stepConfig.actionType === "SHIFT"
      ? "Нажмите на подсвеченную стрелку"
      : "Выберите персонажа на доске");

  const variant =
    stepConfig.buttonVariant === "danger"
      ? "danger"
      : stepConfig.buttonVariant === "secondary"
        ? "secondary"
        : "primary";

  return (
    <div className="h-[64px] shrink-0 w-full flex items-center justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#080a0f] border-t border-white/5 z-20">
      <div className="w-full max-w-sm flex items-center justify-center h-full">
        {isModuleFinished ? (
          <Button
            variant="primary"
            onClick={onFinishModuleClick}
            className="w-full !min-h-[44px] touch-manipulation text-xs font-semibold tracking-wide uppercase shadow-[0_0_20px_rgba(37,99,235,0.4)]"
          >
            Завершить урок
          </Button>
        ) : stepConfig.buttonLabel && isActionEnabled ? (
          <Button
            variant={variant}
            onClick={onActionButtonClick}
            className="w-full !min-h-[44px] touch-manipulation text-xs font-semibold tracking-wide uppercase transition-all duration-200 ring-2 ring-blue-400/80 shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95"
          >
            {stepConfig.buttonLabel}
          </Button>
        ) : (
          <div className="text-[11px] font-sans text-zinc-400 tracking-wider text-center py-2 truncate max-w-full">
            {defaultHint}
          </div>
        )}
      </div>
    </div>
  );
};
