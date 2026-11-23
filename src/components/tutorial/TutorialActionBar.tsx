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
  if (isModuleFinished) {
    return (
      <div className="min-h-[56px] py-2 shrink-0 w-full flex items-center justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 bg-[#080a0f] border-t border-white/5 z-20">
        <div className="w-full max-w-sm flex justify-center">
          <Button
            variant="primary"
            onClick={onFinishModuleClick}
            className="w-full !min-h-[44px] touch-manipulation text-xs font-semibold tracking-wide uppercase shadow-[0_0_20px_rgba(37,99,235,0.4)]"
          >
            Завершить урок
          </Button>
        </div>
      </div>
    );
  }

  if (stepConfig.actionType !== "ACTION_BUTTON" || !stepConfig.buttonLabel) {
    return (
      <div className="min-h-[56px] py-2 shrink-0 w-full flex items-center justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 bg-[#080a0f] border-t border-white/5 z-20">
        <div className="w-full max-w-sm flex justify-center">
          <div className="text-[11px] font-sans text-zinc-500 uppercase tracking-widest text-center py-2">
            Выполните действие на доске города
          </div>
        </div>
      </div>
    );
  }

  const variant =
    stepConfig.buttonVariant === "danger"
      ? "danger"
      : stepConfig.buttonVariant === "secondary"
        ? "secondary"
        : "primary";

  return (
    <div className="min-h-[56px] py-2 shrink-0 w-full flex items-center justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 bg-[#080a0f] border-t border-white/5 z-20">
      <div className="w-full max-w-sm flex justify-center">
        <Button
          variant={variant}
          disabled={!isActionEnabled}
          onClick={onActionButtonClick}
          className={`w-full !min-h-[44px] touch-manipulation text-xs font-semibold tracking-wide uppercase transition-all duration-200 ${
            isActionEnabled
              ? "ring-2 ring-blue-400/80 shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95"
              : "opacity-40"
          }`}
        >
          {stepConfig.buttonLabel}
        </Button>
      </div>
    </div>
  );
};
