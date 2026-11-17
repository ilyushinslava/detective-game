import { useState, useRef, useEffect } from "react";
import { triggerHaptic } from "../utils/haptics";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { useBannerViewer } from "../contexts/BannerViewerContext";
import {
  type ModeTab,
  MODES_DATA,
  RuleModeDetail,
} from "./rules";

export interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal = ({ isOpen, onClose }: RulesModalProps) => {
  const [activeTab, setActiveTab] = useState<ModeTab>("BASE");
  const tabListRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const { openBanner } = useBannerViewer();
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setActiveTab("BASE");
      setImgErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const activeBtn = tabListRef.current?.querySelector<HTMLButtonElement>(
      `[data-tab-id="${activeTab}"]`
    );
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab, isOpen]);

  const tabs: Array<{ id: ModeTab; label: string }> = [
    { id: "BASE", label: "Базовые" },
    { id: "MANIAC", label: "Маньяк" },
    { id: "THIEF", label: "Грабитель" },
    { id: "SECRET_SERVICE", label: "Спецслужба" },
    { id: "LINE_UP", label: "Очная ставка" },
  ];

  const currentMode = MODES_DATA[activeTab];
  const isCrimeOriented = activeTab === "MANIAC";

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const diffX = touchStartXRef.current - e.changedTouches[0].clientX;
    const diffY = touchStartYRef.current - e.changedTouches[0].clientY;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      if (diffX > 0 && currentIndex < tabs.length - 1) {
        triggerHaptic("light");
        setActiveTab(tabs[currentIndex + 1].id);
      } else if (diffX < 0 && currentIndex > 0) {
        triggerHaptic("light");
        setActiveTab(tabs[currentIndex - 1].id);
      }
    }
  };

  const bannerSrc = !imgErrors[activeTab] && currentMode.bannerImage
    ? currentMode.bannerImage
    : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      zIndexClass="z-[70]"
      className="p-5 sm:p-6 max-h-[90vh] text-left"
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex flex-col h-full overflow-hidden"
      >
        <div className="flex justify-between items-center mb-3 shrink-0 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isCrimeOriented
                  ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                  : "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
              } animate-pulse`}
            />
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-100">
              Справочник правил
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-white/10">
              {tabs.findIndex((t) => t.id === activeTab) + 1}/{tabs.length}
            </span>
            <Button
              variant="ghost"
              onClick={onClose}
              className="!h-8 !w-8 !p-0 text-zinc-400 hover:text-white"
              title="Закрыть"
            >
              ✕
            </Button>
          </div>
        </div>

        <div className="relative mb-2 shrink-0">
          <div
            ref={tabListRef}
            className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scrollbar-none pb-1 pr-6 touch-pan-x overscroll-x-contain"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const tabIsCrime = tab.id === "MANIAC";
              const activeClasses =
                tab.id === "BASE"
                  ? "bg-zinc-800 text-zinc-100 border-zinc-500 shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                  : tabIsCrime
                  ? "bg-red-950/80 text-red-300 border-red-600 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                  : "bg-blue-950/80 text-blue-200 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]";

              return (
                <button
                  key={tab.id}
                  data-tab-id={tab.id}
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveTab(tab.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? activeClasses
                      : "bg-zinc-900/80 text-zinc-400 border-white/10 hover:border-white/20 hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none z-10" />
        </div>

        <div className="flex items-center justify-center gap-1 mb-3 shrink-0">
          {tabs.map((tab) => {
            const isCurrent = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic("light");
                  setActiveTab(tab.id);
                }}
                className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                  isCurrent
                    ? "w-5 sm:w-6 bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]"
                    : "w-1.5 sm:w-2 bg-zinc-700/60 hover:bg-zinc-600"
                }`}
                title={tab.label}
              />
            );
          })}
        </div>

        <RuleModeDetail
          currentMode={currentMode}
          bannerSrc={bannerSrc}
          onOpenBanner={openBanner}
          onBannerError={() => {
            console.warn(`[RulesModal] Failed to load banner for ${activeTab}:`, bannerSrc);
            setImgErrors((prev) => ({ ...prev, [activeTab]: true }));
          }}
        />

        <div className="pt-3 border-t border-white/10 shrink-0">
          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
            className="uppercase tracking-widest text-xs"
          >
            Закрыть справочник
          </Button>
        </div>
      </div>
    </Modal>
  );
};
