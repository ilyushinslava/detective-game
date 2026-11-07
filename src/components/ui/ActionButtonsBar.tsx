import React from 'react';
import { Button } from './Button';

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
    switch (id) {
      case 'kill_basic':
      case 'capture_spy':
      case 'KILL':
      case 'CAPTURE_SPY':
      case 'ROB_NEIGHBOR':
      case 'DUEL_ACCUSE':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="22" y1="12" x2="18" y2="12" />
            <line x1="6" y1="12" x2="2" y2="12" />
            <line x1="12" y1="6" x2="12" y2="2" />
            <line x1="12" y1="22" x2="12" y2="18" />
          </svg>
        );

      case 'accuse_basic':
      case 'patrol_call':
      case 'ACCUSE':
      case 'SWEAR_IN_OFFICER':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 shrink-0">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );

      case 'interrogate_spy':
      case 'INTERROGATE':
      case 'RADAR':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 shrink-0">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        );

      case 'disguise_skhvatka':
      case 'escape_maniac':
      case 'disguise_thief':
      case 'DISGUISE':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 shrink-0">
            <path d="M2 18h20M4 18c0-2 2-3 4-4l2-6h4l2 6c2 1 4 2 4 4M9 13h6" />
          </svg>
        );

      case 'SHIFT':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 shrink-0">
            <polyline points="17 11 21 7 17 3" />
            <line x1="21" y1="7" x2="9" y2="7" />
            <polyline points="7 21 3 17 7 13" />
            <line x1="3" y1="17" x2="15" y2="17" />
          </svg>
        );

      case 'DUEL_ASK_QUESTION':
      case 'QUESTION':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 shrink-0">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );

      case 'pause':
      case 'PAUSE':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 shrink-0">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        );

      case 'CLEANUP':
      case 'cleanup':
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 10h.01M15 10h.01M10 15h4" />
          </svg>
        );
    }
  };

  return (
    <div className={`grid grid-cols-2 gap-2 w-full ${className}`}>
      {actions.map((act) => {
        const isRed = act.isRed ?? (act.id.includes('KILL') || act.id.includes('ACCUSE') || act.id.includes('ROB'));
        return (
          <Button
            key={act.id}
            variant={isRed ? "primary-danger" : "secondary"}
            onClick={act.onClick}
            disabled={act.disabled}
            className="h-11 px-3 text-[11px] font-black uppercase tracking-wider gap-2 truncate"
          >
            {renderIcon(act.id)}
            <span className="truncate">{act.label}</span>
          </Button>
        );
      })}

      {cleanupAction && (
        <Button
          variant="primary-danger"
          fullWidth
          onClick={cleanupAction.onClick}
          disabled={cleanupAction.disabled}
          className="col-span-2 h-11 text-[11px] font-black uppercase tracking-wider gap-2 shadow-[0_0_15px_rgba(220,38,38,0.35)]"
        >
          {renderIcon('CLEANUP')}
          <span>Зачистить поле</span>
        </Button>
      )}
    </div>
  );
};
