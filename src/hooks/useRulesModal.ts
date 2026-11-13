import { useState, useCallback } from "react";
import type { GameModeType } from "../types/game";

export type RulesModeTab = "BASE" | "MANIAC" | "THIEF" | "SECRET_SERVICE" | "LINE_UP";

export interface UseRulesModalReturn {
  isRulesOpen: boolean;
  activeRulesTab: RulesModeTab;
  openRules: (tab?: RulesModeTab | GameModeType) => void;
  closeRules: () => void;
  setActiveRulesTab: (tab: RulesModeTab) => void;
}

export function useRulesModal(initialTab: RulesModeTab = "BASE"): UseRulesModalReturn {
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [activeRulesTab, setActiveRulesTab] = useState<RulesModeTab>(initialTab);

  const openRules = useCallback((tab?: RulesModeTab | GameModeType) => {
    if (tab) {
      if (tab === "MANIAC_VS_OPERATIVE") {
        setActiveRulesTab("MANIAC");
      } else if (tab === "THIEF_HUNT") {
        setActiveRulesTab("THIEF");
      } else {
        setActiveRulesTab(tab as RulesModeTab);
      }
    }
    setIsRulesOpen(true);
  }, []);

  const closeRules = useCallback(() => {
    setIsRulesOpen(false);
  }, []);

  return {
    isRulesOpen,
    activeRulesTab,
    openRules,
    closeRules,
    setActiveRulesTab,
  };
}
