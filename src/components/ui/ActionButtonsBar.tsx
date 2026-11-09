import React from 'react';
import { ActionIcons } from './ActionIcons';

export interface ActionButtonItem {
  id: string;
  label: string;
  disabled?: boolean;
  isRed?: boolean;
  onClick: () => void;
}

interface ActionButtonsBarProps {
  actions: ActionButtonItem[];
  cleanupAction?: {
    disabled?: boolean;
    onClick: () => void;
  } | null;
  className?: string;
}

export const ActionButtonsBar: React.FC<ActionButtonsBarProps> = ({
  actions,
  cleanupAction,
  className = '',
}) => {
  const renderIcon = (id: string) => {
    const upperId = id.toUpperCase();

    if (upperId === 'SHIFT') return <ActionIcons.Shift />;
    if (upperId.includes('KILL') || upperId.includes('ATTACK')) return <ActionIcons.Kill />;
    if (upperId.includes('CLEANUP')) return <ActionIcons.Cleanup />;
    if (upperId.includes('EXONERATE') || upperId.includes('ALIBI')) return <ActionIcons.Exonerate />;
    if (upperId.includes('ACCUSE') || upperId.includes('CAPTURE') || upperId.includes('ARREST')) return <ActionIcons.Arrest />;
    if (upperId.includes('INTERROGATE') || upperId.includes('QUESTION') || upperId.includes('RADAR')) return <ActionIcons.Interrogate />;
    if (upperId.includes('DISGUISE') || upperId.includes('ESCAPE')) return <ActionIcons.Disguise />;
    if (upperId.includes('ROB')) return <ActionIcons.Rob />;
    if (upperId.includes('PATROL') || upperId.includes('OFFICER') || upperId.includes('SWEAR_IN')) return <ActionIcons.Patrol />;

    return <ActionIcons.Shift />;
  };

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map((act) => {
          const isRed = act.id.includes('KILL') || act.id.includes('ATTACK') || act.id === 'kill_basic' || act.id === 'capture_spy';
          const isAmber = act.id.includes('ROB') || act.id === 'rob_basic';
          const isBlue = act.id.includes('ACCUSE') || act.id.includes('PATROL') || act.id.includes('INTERROGATE') || act.id.includes('SWEAR_IN') || act.id === 'accuse_basic' || act.id === 'patrol_call' || act.id === 'interrogate_spy' || act.id === 'QUESTION' || act.id === 'DUEL_ASK_QUESTION';
          const isDisguise = act.id.includes('DISGUISE') || act.id.includes('ESCAPE') || act.id === 'disguise_skhvatka' || act.id === 'escape_maniac' || act.id === 'disguise_thief' || act.id === 'FAST_DISGUISE';

          const colorClasses = isRed
            ? "bg-gradient-to-r from-red-700 via-red-600 to-rose-600 hover:from-red-650 hover:to-rose-550 text-white font-black shadow-lg shadow-red-950/50 border border-red-400/40 active:scale-[0.97]"
            : isBlue
            ? "bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white font-black shadow-lg shadow-blue-950/50 border border-blue-400/40 active:scale-[0.97]"
            : isAmber
            ? "bg-gradient-to-r from-amber-600 to-yellow-500 text-zinc-950 font-black shadow-lg shadow-amber-950/50 border border-amber-300/50 active:scale-[0.97]"
            : isDisguise
            ? "bg-gradient-to-b from-zinc-900 via-zinc-950 to-black hover:from-zinc-800 hover:to-zinc-950 text-zinc-100 font-black tracking-wider uppercase border border-zinc-500/60 hover:border-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_12px_rgba(0,0,0,0.8)] active:scale-[0.97]"
            : "bg-zinc-800 hover:bg-zinc-700 text-white font-bold border border-white/20 active:scale-[0.97]";

          return (
            <button
              key={act.id}
              onClick={act.onClick}
              disabled={act.disabled}
              className={`w-full min-h-[44px] py-2.5 px-3 text-[11px] sm:text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-center leading-snug cursor-pointer ${colorClasses}`}
            >
              {renderIcon(act.id)}
              <span className="whitespace-normal break-words">{act.label}</span>
            </button>
          );
        })}
      </div>

      {cleanupAction && (
        <button
          onClick={cleanupAction.onClick}
          disabled={cleanupAction.disabled}
          className="w-full min-h-[44px] py-2.5 px-3 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-gradient-to-r from-red-700 via-red-600 to-rose-600 hover:from-red-650 hover:to-rose-550 text-white shadow-lg shadow-red-950/50 border border-red-400/40 active:scale-[0.97] rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {renderIcon('CLEANUP')}
          <span className="whitespace-normal break-words">Зачистка</span>
        </button>
      )}
    </div>
  );
};
