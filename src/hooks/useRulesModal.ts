import { useState, useCallback } from "react";
import type { GameModeType } from "../types/game";
import type { ModeTab } from "../components/rules/rulesData";

export type RulesModeTab = ModeTab;

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
      } else if (tab === "SECRET_SERVICE") {
        setActiveRulesTab("SECRET_SERVICE");
      } else if (tab === "BASE") {
        setActiveRulesTab("BASE");
      } else {
        setActiveRulesTab("BASE");
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
