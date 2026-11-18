import React from "react";
import type { UserProfile } from "../../types/profile";
import { LobbyHeader } from "./LobbyHeader";
import { ModeShowcase } from "./ModeShowcase";
import lobbyBg from "../../assets/lobby_background.webp";

interface LobbyHomeViewProps {
  title: string;
  profile: UserProfile;
  onOpenProfile: () => void;
  onOpenDevPanel?: () => void;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
  hasActiveGame?: boolean;
  onResumeGame?: () => void;
  isCreating: boolean;
  onQuickPlay: () => void;
  onSelectSolo: () => void;
  onSelectLocalDuel: () => void;
  onOpenTvParty: () => void;
  onOpenOnline: () => void;
  onlineRoomsCount: number;
  onOpenRules?: () => void;
  onOpenTutorial: () => void;
  t: any;
}

export const LobbyHomeView: React.FC<LobbyHomeViewProps> = ({
  title,
  profile,
  onOpenProfile,
  onOpenDevPanel,
  onOpenSettings,
  onOpenLogin,
  hasActiveGame = false,
  onResumeGame,
  isCreating,
  onQuickPlay,
  onSelectSolo,
  onSelectLocalDuel,
  onOpenTvParty,
  onOpenOnline,
  onlineRoomsCount,
  onOpenRules,
  onOpenTutorial,
  t,
}) => {
  return (
    <div className="relative flex-1 flex flex-col bg-background-main w-full max-w-full overflow-x-hidden overflow-y-auto custom-scrollbar">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <img
          src={lobbyBg}
          alt="Wicked City Noir"
          className="w-full h-full object-cover object-center opacity-55 scale-100 transition-opacity duration-700"
        />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-accent-primary/20 blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-96 h-96 rounded-full bg-accent-purple/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-accent-neon/15 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-background-main via-background-main/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-background-main/80 via-transparent to-background-main" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,theme(colors.background.main)_90%)] opacity-85" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col pt-[max(0.5rem,env(safe-area-inset-top))] w-full max-w-full min-h-0 overflow-x-hidden overflow-y-auto custom-scrollbar">
        <LobbyHeader
          title={title}
          profile={profile}
          onOpenProfile={onOpenProfile}
          onOpenDevPanel={onOpenDevPanel}
          onOpenSettings={onOpenSettings}
          onOpenLogin={onOpenLogin}
        />

        <ModeShowcase
          title={title}
          hasActiveGame={hasActiveGame}
          onResumeGame={onResumeGame}
          isCreating={isCreating}
          onQuickPlay={onQuickPlay}
          onSelectSolo={onSelectSolo}
          onSelectLocalDuel={onSelectLocalDuel}
          onOpenTvParty={onOpenTvParty}
          onOpenOnline={onOpenOnline}
          onlineRoomsCount={onlineRoomsCount}
          onOpenRules={onOpenRules}
          onOpenTutorial={onOpenTutorial}
          t={t}
        />
      </div>
    </div>
  );
};
