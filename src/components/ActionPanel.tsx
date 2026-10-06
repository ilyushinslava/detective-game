export interface ActionItem {
  id: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
  className: string;
}

interface ActionPanelProps {
  actions: ActionItem[];
  currentRoleName: string;
  isAIThinking: boolean;
}

export const ActionPanel = ({
  actions,
  currentRoleName,
  isAIThinking,
}: ActionPanelProps) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl">
      <div className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px] mb-1.5 flex items-center justify-between">
        <span>Действия ({currentRoleName})</span>
        {isAIThinking && (
          <span className="text-amber-400 text-[9px] animate-pulse">
            Бот думает...
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`${action.className} col-span-1 last:odd:col-span-2 lg:col-span-1 lg:last:odd:col-span-1`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};
