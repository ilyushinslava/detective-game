import React from "react";
import type { TutorialStepConfig } from "./tutorialTypes";

export interface TutorialGuidePanelProps {
  stepConfig: TutorialStepConfig;
}

export const TutorialGuidePanel: React.FC<TutorialGuidePanelProps> = ({
  stepConfig,
}) => {
  return (
    <div
      data-testid="tutorial-guide-panel"
      className="w-full px-3 py-1 shrink-0 z-20 flex justify-center pointer-events-none"
    >
      <div className="w-full max-w-sm sm:max-w-md bg-[#0b0e17]/95 backdrop-blur-md border border-white/15 border-t-blue-500/50 rounded-xl px-3.5 py-1.5 shadow-2xl text-center pointer-events-auto">
        <div className="text-[10px] font-sans font-bold text-blue-400 uppercase tracking-widest leading-tight mb-0.5">
          ШАГ <span className="font-mono">{stepConfig.step}/{stepConfig.totalSteps}</span> • {stepConfig.title}
        </div>
        <p className="text-xs text-zinc-200 font-sans leading-snug m-0">
          {stepConfig.instruction}
        </p>
      </div>
    </div>
  );
};
