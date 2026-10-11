import { triggerHaptic } from "../utils/haptics";

interface BottomNavigationProps {
  activeTab: "LOBBY" | "TABLES" | "TOP" | "SHOP";
  onTabChange: (tab: "LOBBY" | "TABLES" | "TOP" | "SHOP") => void;
}

export const BottomNavigation = ({
  activeTab,
  onTabChange,
}: BottomNavigationProps) => {
  const tabs = [
    { id: "LOBBY", icon: "🏠", label: "Лобби", disabled: false },
    { id: "TABLES", icon: "📋", label: "Столы", disabled: false },
    { id: "TOP", icon: "🏆", label: "Топ", disabled: true },
    { id: "SHOP", icon: "🛒", label: "Магазин", disabled: true },
  ] as const;

  return (
    <div className="w-full shrink-0 border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom,0.75rem)] z-30">
      <div className="flex items-center justify-around w-full px-2 pt-2 pb-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => {
                if (!isActive && !tab.disabled) {
                  triggerHaptic("light");
                  onTabChange(tab.id);
                }
              }}
              className={`relative flex flex-col items-center justify-center w-16 gap-1 transition-colors ${
                tab.disabled
                  ? "opacity-40 cursor-not-allowed text-zinc-600"
                  : isActive
                    ? "text-amber-400"
                    : "text-zinc-500 hover:text-zinc-300 cursor-pointer"
              }`}
            >
              {tab.disabled && (
                <span className="absolute -top-1 right-1 text-[7px] font-black uppercase tracking-tighter bg-zinc-800 text-zinc-400 px-1 rounded border border-zinc-700">
                  Скоро
                </span>
              )}
              <span
                className={`text-xl transition-transform ${
                  isActive && !tab.disabled
                    ? "scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    : "scale-100"
                }`}
              >
                {tab.icon}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
