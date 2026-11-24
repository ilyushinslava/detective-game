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
  initialTab?: ModeTab;
}

export const RulesModal = ({ isOpen, onClose, initialTab }: RulesModalProps) => {
  const [activeTab, setActiveTab] = useState<ModeTab>(initialTab || "BASE");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const tabListRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const { openBanner } = useBannerViewer();
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || "BASE");
      setIsDropdownOpen(false);
      setImgErrors({});
    }
  }, [isOpen, initialTab]);

  // Закрытие дропдауна при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

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
    { id: "MANIAC", label: "Почерк убийцы" },
    { id: "THIEF", label: "Оцепление" },
    { id: "SECRET_SERVICE", label: "Директива «Ноль»" },
  ];

  const currentMode = MODES_DATA[activeTab];
  const activeTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];

  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const resolveBannerPath = (path?: string) => {
    if (!path) return undefined;
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
  };

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

  const rawBannerSrc = currentMode.bannerImage;
  const resolvedBannerSrc = resolveBannerPath(rawBannerSrc);
  const bannerSrc = !imgErrors[activeTab] && resolvedBannerSrc
    ? resolvedBannerSrc
    : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      zIndexClass="z-[70]"
      className="p-4 sm:p-6 max-h-[90vh] text-left"
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex flex-col h-full overflow-hidden"
      >
        {/* Шапка модального окна */}
        <div className="flex justify-between items-center mb-3 shrink-0 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-100">
              Справочник правил
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="!min-h-[44px] !min-w-[44px] !p-0 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer touch-manipulation"
              title="Закрыть"
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Выбор режима: Мобильный дропдаун (md:hidden) */}
        <div className="relative mb-3 shrink-0 md:hidden" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setIsDropdownOpen(!isDropdownOpen);
            }}
            className="w-full h-11 min-h-[44px] flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/10 border-t-white/20 text-xs font-black uppercase tracking-wider text-zinc-200 transition-all active:scale-[0.99] cursor-pointer touch-manipulation"
          >
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-mono text-[10px]">РАЗДЕЛ:</span>
              <span className="text-zinc-100">{activeTabObj.label}</span>
            </div>
            <svg
              className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-30 p-1.5 rounded-xl bg-zinc-950/95 border border-white/10 shadow-2xl backdrop-blur-xl animate-dropdownSlideDown flex flex-col gap-1">
              {tabs.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setActiveTab(tab.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-bold uppercase tracking-wider transition-all text-left cursor-pointer touch-manipulation ${
                      isSelected
                        ? "bg-slate-800/80 text-white border border-white/15"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isSelected && (
                      <span className="text-xs font-mono font-bold text-slate-300">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Выбор режима: Десктопная панель кнопок (hidden md:flex) */}
        <div className="hidden md:flex items-stretch gap-1.5 mb-3 shrink-0" ref={tabListRef}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tab-id={tab.id}
                onClick={() => {
                  triggerHaptic("light");
                  setActiveTab(tab.id);
                }}
                className={`flex-1 min-h-[44px] px-2.5 py-1.5 rounded-xl border text-[11px] lg:text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center text-center leading-tight ${
                  isActive
                    ? "bg-gradient-to-b from-slate-800 to-slate-900 text-white border-white/25 border-t-white/40 shadow-sm"
                    : "bg-zinc-900/60 text-zinc-400 border-white/5 hover:border-white/15 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Индикаторы страниц (точки) */}
        <div className="flex items-center justify-center gap-1.5 mb-3 shrink-0">
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
                    ? "w-6 bg-slate-200 shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                    : "w-2 bg-zinc-800 hover:bg-zinc-700"
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
            className="uppercase tracking-widest text-xs h-11 min-h-[44px]"
          >
            Закрыть справочник
          </Button>
        </div>
      </div>
    </Modal>
  );
};
